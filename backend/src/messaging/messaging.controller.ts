import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";
import { CreateConversationDto } from "./dto/create-conversation.dto.js";
import { SendMessageDto } from "./dto/send-message.dto.js";
import { MessagingService } from "./messaging.service.js";

@ApiTags('Parent Messaging')
@ApiBearerAuth()
@Controller('api/parent/conversations')
@UseGuards(AuthRolesGuard)
@Roles(UserType.PARENT)
export class MessagingController {
    constructor(private readonly messagingService: MessagingService) {}

    @Get()
    @ApiOperation({ summary: 'List conversations for the authenticated parent' })
    public list(@currentUser() payload: JWTPayloadType) {
        return this.messagingService.listConversations(payload.id);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get the unread message count for the authenticated parent' })
    public unreadCount(@currentUser() payload: JWTPayloadType) {
        return this.messagingService.getUnreadCount(payload.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a conversation with an assigned teacher' })
    public create(@currentUser() payload: JWTPayloadType, @Body() dto: CreateConversationDto) {
        return this.messagingService.createConversation(payload.id, dto);
    }

    @Get(':id/messages')
    @ApiOperation({ summary: 'List messages in a parent conversation' })
    public messages(@currentUser() payload: JWTPayloadType, @Param('id', ParseIntPipe) id: number) {
        return this.messagingService.listMessages(payload.id, id);
    }

    @Post(':id/messages')
    @ApiOperation({ summary: 'Send a message in a parent conversation' })
    public send(
        @currentUser() payload: JWTPayloadType,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SendMessageDto,
    ) {
        return this.messagingService.sendMessage(payload.id, id, dto);
    }

    @Post(':id/read')
    @ApiOperation({ summary: 'Mark teacher messages as read' })
    public markRead(@currentUser() payload: JWTPayloadType, @Param('id', ParseIntPipe) id: number) {
        return this.messagingService.markAsRead(payload.id, id);
    }
}
