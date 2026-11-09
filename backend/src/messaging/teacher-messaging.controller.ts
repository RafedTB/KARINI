import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";
import { SendMessageDto } from "./dto/send-message.dto.js";
import { MessagingService } from "./messaging.service.js";

@ApiTags('Teacher Messaging')
@ApiBearerAuth()
@Controller('api/teacher/conversations')
@UseGuards(AuthRolesGuard)
@Roles(UserType.INSTRUCTOR)
export class TeacherMessagingController {
    constructor(private readonly messagingService: MessagingService) {}

    @Get()
    @ApiOperation({ summary: 'List conversations assigned to the authenticated teacher' })
    public list(@currentUser() payload: JWTPayloadType) {
        return this.messagingService.listTeacherConversations(payload.id);
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread parent message count for the authenticated teacher' })
    public unreadCount(@currentUser() payload: JWTPayloadType) {
        return this.messagingService.getTeacherUnreadCount(payload.id);
    }

    @Get(':id/messages')
    @ApiOperation({ summary: 'List messages in a teacher conversation' })
    public messages(@currentUser() payload: JWTPayloadType, @Param('id', ParseIntPipe) id: number) {
        return this.messagingService.listTeacherMessages(payload.id, id);
    }

    @Post(':id/messages')
    @ApiOperation({ summary: 'Reply to a parent conversation' })
    public send(
        @currentUser() payload: JWTPayloadType,
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: SendMessageDto,
    ) {
        return this.messagingService.sendTeacherMessage(payload.id, id, dto);
    }

    @Post(':id/read')
    @ApiOperation({ summary: 'Mark parent messages as read' })
    public markRead(@currentUser() payload: JWTPayloadType, @Param('id', ParseIntPipe) id: number) {
        return this.messagingService.markTeacherMessagesAsRead(payload.id, id);
    }
}
