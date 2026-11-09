import { Test, TestingModule } from '@nestjs/testing';
import { MessagingGateway } from './messaging.gateway.js';
import { MessagingService } from './messaging.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserType } from '../utils/enum.js';
import type { Socket } from 'socket.io';

describe('MessagingGateway', () => {
    let gateway: MessagingGateway;
    let messagingService: Partial<MessagingService>;
    let jwtService: Partial<JwtService>;
    let configService: Partial<ConfigService>;

    beforeEach(async () => {
        messagingService = {
            getConversationForUser: vi.fn(),
            getConversationForParent: vi.fn().mockResolvedValue({ id: 10, parentId: 5, teacherId: 2 }),
            getConversationForTeacher: vi.fn().mockResolvedValue({ id: 10, parentId: 5, teacherId: 2 }),
            sendMessage: vi.fn(),
            sendTeacherMessage: vi.fn(),
            markAsRead: vi.fn(),
            markTeacherMessagesAsRead: vi.fn(),
        };
        jwtService = {
            verify: vi.fn(),
        };
        configService = {
            get: vi.fn().mockReturnValue('test-secret'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MessagingGateway,
                { provide: MessagingService, useValue: messagingService },
                { provide: JwtService, useValue: jwtService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        gateway = module.get<MessagingGateway>(MessagingGateway);
        gateway.server = {
            to: vi.fn().mockReturnValue({ emit: vi.fn() }),
        } as any;
    });

    it('disconnects unauthenticated socket connection', async () => {
        const client = {
            handshake: { auth: {}, headers: {}, query: {} },
            disconnect: vi.fn(),
        } as unknown as Socket;

        await gateway.handleConnection(client);
        expect(client.disconnect).toHaveBeenCalled();
    });

    it('authenticates valid token and joins user room', async () => {
        const client = {
            handshake: { auth: { token: 'valid-jwt' }, headers: {}, query: {} },
            data: {},
            join: vi.fn(),
            disconnect: vi.fn(),
        } as unknown as Socket;

        (jwtService.verify as any).mockReturnValue({ id: 5, userType: UserType.PARENT });

        await gateway.handleConnection(client);
        expect(client.data.user).toEqual({ id: 5, userType: UserType.PARENT });
        expect(client.join).toHaveBeenCalledWith('user_5');
        expect(client.disconnect).not.toHaveBeenCalled();
    });

    it('allows joining authorized conversation room', async () => {
        const client = {
            data: { user: { id: 5, userType: UserType.PARENT } },
            join: vi.fn(),
        } as unknown as Socket;

        (messagingService.getConversationForUser as any).mockResolvedValue({ id: 10 });

        const result = await gateway.handleJoinConversation(client, { conversationId: 10 });
        expect(result).toEqual({ event: 'joined', conversationId: 10 });
        expect(client.join).toHaveBeenCalledWith('conversation_10');
    });

    it('handles sendMessage from parent and delegates to service', async () => {
        const client = {
            data: { user: { id: 5, userType: UserType.PARENT } },
        } as unknown as Socket;

        const mockMessage = { id: 1, conversationId: 10, senderId: 5, body: 'Hello' };
        (messagingService.sendMessage as any).mockResolvedValue(mockMessage);

        const result = await gateway.handleSendMessage(client, { conversationId: 10, body: 'Hello' });
        expect(messagingService.sendMessage).toHaveBeenCalledWith(5, 10, { body: 'Hello' });
        expect(result).toEqual({ event: 'messageSent', message: mockMessage });
    });
});

