import {
    ConnectedSocket,
    MessageBody,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagingService } from './messaging.service.js';
import { UserType } from '../utils/enum.js';
import type { JWTPayloadType } from '../utils/types.js';
import { Conversation } from './conversation.entity.js';
import { Message } from './message.entity.js';

@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server!: Server;

    private readonly logger = new Logger(MessagingGateway.name);

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly messagingService: MessagingService,
    ) {}

    async handleConnection(client: Socket) {
        try {
            const token =
                client.handshake.auth?.token ||
                (typeof client.handshake.headers?.authorization === 'string'
                    ? client.handshake.headers.authorization.replace(/^Bearer\s+/i, '')
                    : null) ||
                (typeof client.handshake.query?.token === 'string'
                    ? client.handshake.query.token
                    : null);

            if (!token) {
                client.disconnect();
                return;
            }

            const secret = this.configService.get<string>('JWT_SECRET');
            const payload = this.jwtService.verify<JWTPayloadType>(token, { secret });
            if (!payload?.id) {
                client.disconnect();
                return;
            }

            client.data.user = payload;
            await client.join(`user_${payload.id}`);
            this.logger.log(`Client connected: user_${payload.id} (${client.id})`);
        } catch (err: any) {
            this.logger.warn(`Unauthorized WebSocket connection attempt: ${err.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        const user = client.data?.user;
        if (user) {
            this.logger.log(`Client disconnected: user_${user.id} (${client.id})`);
        }
    }

    @SubscribeMessage('joinConversation')
    async handleJoinConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number },
    ) {
        const user: JWTPayloadType | undefined = client.data.user;
        if (!user) return { error: 'Unauthorized' };

        const conversationId = Number(data?.conversationId);
        if (!conversationId) return { error: 'Invalid conversationId' };

        try {
            await this.messagingService.getConversationForUser(user.id, user.userType, conversationId);
            await client.join(`conversation_${conversationId}`);
            return { event: 'joined', conversationId };
        } catch (err: any) {
            return { error: err.message || 'Access denied' };
        }
    }

    @SubscribeMessage('leaveConversation')
    async handleLeaveConversation(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number },
    ) {
        const conversationId = Number(data?.conversationId);
        if (conversationId) {
            await client.leave(`conversation_${conversationId}`);
        }
        return { event: 'left', conversationId };
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number; body: string },
    ) {
        const user: JWTPayloadType | undefined = client.data.user;
        if (!user) return { error: 'Unauthorized' };

        const conversationId = Number(data?.conversationId);
        const body = data?.body?.trim();
        if (!conversationId || !body) return { error: 'Invalid message data' };

        try {
            let message: Message;
            let conversation: Conversation;
            if (user.userType === UserType.PARENT) {
                message = await this.messagingService.sendMessage(user.id, conversationId, { body });
                conversation = await this.messagingService.getConversationForParent(user.id, conversationId);
            } else if (user.userType === UserType.INSTRUCTOR) {
                message = await this.messagingService.sendTeacherMessage(user.id, conversationId, { body });
                conversation = await this.messagingService.getConversationForTeacher(user.id, conversationId);
            } else {
                return { error: 'User not authorized to send messages' };
            }

            this.notifyNewMessage(conversation, message);
            return { event: 'messageSent', message };
        } catch (err: any) {
            return { error: err.message || 'Failed to send message' };
        }
    }

    @SubscribeMessage('markAsRead')
    async handleMarkAsRead(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number },
    ) {
        const user: JWTPayloadType | undefined = client.data.user;
        if (!user) return { error: 'Unauthorized' };

        const conversationId = Number(data?.conversationId);
        if (!conversationId) return { error: 'Invalid conversationId' };

        try {
            if (user.userType === UserType.PARENT) {
                await this.messagingService.markAsRead(user.id, conversationId);
                const conversation = await this.messagingService.getConversationForParent(user.id, conversationId);
                this.notifyMessagesRead(conversationId, user.id, conversation.teacherId);
            } else if (user.userType === UserType.INSTRUCTOR) {
                await this.messagingService.markTeacherMessagesAsRead(user.id, conversationId);
                const conversation = await this.messagingService.getConversationForTeacher(user.id, conversationId);
                this.notifyMessagesRead(conversationId, user.id, conversation.parentId);
            }
            return { event: 'markedAsRead', conversationId };
        } catch (err: any) {
            return { error: err.message || 'Failed to mark as read' };
        }
    }

    @SubscribeMessage('typing')
    async handleTyping(
        @ConnectedSocket() client: Socket,
        @MessageBody() data: { conversationId: number; isTyping: boolean },
    ) {
        const user: JWTPayloadType | undefined = client.data.user;
        if (!user) return;

        const conversationId = Number(data?.conversationId);
        if (!conversationId) return;

        client.to(`conversation_${conversationId}`).emit('typing', {
            conversationId,
            userId: user.id,
            isTyping: !!data.isTyping,
        });
    }

    public notifyNewMessage(conversation: Conversation, message: Message) {
        if (!this.server) return;

        this.server.to(`conversation_${conversation.id}`).emit('newMessage', message);

        const recipientId = message.senderId === conversation.parentId
            ? conversation.teacherId
            : conversation.parentId;

        this.server.to(`user_${recipientId}`).emit('conversationUpdated', {
            conversationId: conversation.id,
            lastMessage: message.body,
            lastMessageAt: message.createdAt,
            senderId: message.senderId,
        });
    }

    public notifyMessagesRead(conversationId: number, readByUserId: number, recipientUserId: number) {
        if (!this.server) return;

        this.server.to(`conversation_${conversationId}`).emit('messagesRead', {
            conversationId,
            readBy: readByUserId,
        });

        this.server.to(`user_${recipientUserId}`).emit('messagesRead', {
            conversationId,
            readBy: readByUserId,
        });

        this.server.to(`user_${readByUserId}`).emit('unreadCountUpdated', {
            conversationId,
        });
    }
}
