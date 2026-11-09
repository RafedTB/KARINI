import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User } from '../users/user.entity.js';
import { UserType } from '../utils/enum.js';
import { Conversation } from './conversation.entity.js';
import { Message } from './message.entity.js';
import { CreateConversationDto } from './dto/create-conversation.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { MessagingService } from './messaging.service.js';

type MockRepository = {
    findOne: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    createQueryBuilder: ReturnType<typeof vi.fn>;
};

const repository = (): MockRepository => ({
    findOne: vi.fn(),
    find: vi.fn(),
    save: vi.fn(),
    create: vi.fn((value: object) => value),
    count: vi.fn(),
    createQueryBuilder: vi.fn(),
});

describe('MessagingService', () => {
    let conversations: MockRepository;
    let messages: MockRepository;
    let users: MockRepository;
    let service: MessagingService;

    beforeEach(() => {
        conversations = repository();
        messages = repository();
        users = repository();
        service = new MessagingService(
            conversations as unknown as Repository<Conversation>,
            messages as unknown as Repository<Message>,
            users as unknown as Repository<User>,
        );
    });

    it('rejects creating a conversation for an unlinked child', async () => {
        users.findOne.mockResolvedValue(undefined);
        const dto: CreateConversationDto = { studentId: 99, teacherId: 7, subject: 'Mathématiques' };

        await expect(service.createConversation(1, dto)).rejects.toBeInstanceOf(ForbiddenException);
        expect(users.findOne).toHaveBeenCalledWith({
            where: { id: 99, parentId: 1, userType: UserType.STUDENT },
        });
    });

    it('rejects creating a conversation for a non-Platinum child', async () => {
        users.findOne.mockResolvedValue({
            id: 99,
            parentId: 1,
            userType: UserType.STUDENT,
            membership: 'gold',
        });
        const dto: CreateConversationDto = { studentId: 99, teacherId: 7, subject: 'Mathématiques' };

        await expect(service.createConversation(1, dto)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not expose a conversation belonging to another parent', async () => {
        conversations.findOne.mockResolvedValue(undefined);

        await expect(service.listMessages(1, 42)).rejects.toBeInstanceOf(NotFoundException);
        expect(messages.find).not.toHaveBeenCalled();
    });

    it('sends a trimmed message only in the parent-owned conversation', async () => {
        const conversation = { id: 42, parentId: 1, updatedAt: new Date() } as Conversation;
        const message = { id: 3, conversationId: 42, senderId: 1, body: 'Bonjour', isRead: true } as Message;
        conversations.findOne.mockResolvedValue(conversation);
        users.findOne.mockResolvedValue({ membership: 'platinum' });
        messages.save.mockResolvedValue(message);
        conversations.save.mockResolvedValue(conversation);

        const dto: SendMessageDto = { body: '  Bonjour  ' };
        await expect(service.sendMessage(1, 42, dto)).resolves.toEqual(message);
        expect(messages.create).toHaveBeenCalledWith({
            conversationId: 42,
            senderId: 1,
            body: 'Bonjour',
            isRead: true,
        });
        expect(conversations.save).toHaveBeenCalledWith(conversation);
    });

    it('does not expose a conversation assigned to another teacher', async () => {
        conversations.findOne.mockResolvedValue(undefined);

        await expect(service.listTeacherMessages(7, 42)).rejects.toBeInstanceOf(NotFoundException);
        expect(messages.find).not.toHaveBeenCalled();
    });

    it('sends a trimmed reply only in the teacher-owned conversation', async () => {
        const conversation = { id: 42, teacherId: 7, updatedAt: new Date() } as Conversation;
        const message = { id: 4, conversationId: 42, senderId: 7, body: 'Merci', isRead: true } as Message;
        conversations.findOne.mockResolvedValue(conversation);
        messages.save.mockResolvedValue(message);
        conversations.save.mockResolvedValue(conversation);

        const dto: SendMessageDto = { body: '  Merci  ' };
        await expect(service.sendTeacherMessage(7, 42, dto)).resolves.toEqual(message);
        expect(conversations.findOne).toHaveBeenCalledWith({
            where: { id: 42, teacherId: 7 },
        });
        expect(messages.create).toHaveBeenCalledWith({
            conversationId: 42,
            senderId: 7,
            body: 'Merci',
            isRead: true,
        });
    });
});
