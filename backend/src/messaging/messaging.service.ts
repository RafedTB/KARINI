import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";
import { Conversation } from "./conversation.entity.js";
import { Message } from "./message.entity.js";
import { CreateConversationDto } from "./dto/create-conversation.dto.js";
import { SendMessageDto } from "./dto/send-message.dto.js";

@Injectable()
export class MessagingService {
    constructor(
        @InjectRepository(Conversation)
        private readonly conversationRepository: Repository<Conversation>,
        @InjectRepository(Message)
        private readonly messageRepository: Repository<Message>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    private async getConversationForParent(parentId: number, conversationId: number) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, parentId },
        });
        if (!conversation) throw new NotFoundException('Conversation introuvable');
        await this.getLinkedChild(parentId, conversation.studentId);
        return conversation;
    }

    private async getConversationForTeacher(teacherId: number, conversationId: number) {
        const conversation = await this.conversationRepository.findOne({
            where: { id: conversationId, teacherId },
        });
        if (!conversation) throw new NotFoundException('Conversation introuvable');
        return conversation;
    }

    private async getLinkedChild(parentId: number, studentId: number) {
        const child = await this.userRepository.findOne({
            where: { id: studentId, parentId, userType: UserType.STUDENT },
        });
        if (!child) throw new ForbiddenException('Cet enfant n’est pas lié à votre compte');
        if (child.membership !== MembershipType.PLATINUM) {
            throw new ForbiddenException('La messagerie parent est réservée aux élèves Platinum');
        }
        return child;
    }

    private async validateTeacherAssignment(teacherId: number, student: User, subject: string) {
        const teacher = await this.userRepository.findOne({ where: { id: teacherId, userType: UserType.INSTRUCTOR } });
        if (!teacher) throw new NotFoundException('Enseignant introuvable');

        const normalizedSubject = subject.trim().toLowerCase();
        const subjects = (teacher.teachingSubjects ?? []).map((value) => value.trim().toLowerCase());
        const classes = (teacher.teachingClasses ?? []).map((value) => value.trim().toLowerCase());
        const subjectAllowed = subjects.length === 0 || subjects.some((value) => value === normalizedSubject || normalizedSubject.includes(value) || value.includes(normalizedSubject));
        const studentClass = student.studentClass?.trim().toLowerCase();
        const classAllowed = classes.length === 0 || !studentClass || classes.some((value) => value === studentClass);

        if (!subjectAllowed || !classAllowed) {
            throw new ForbiddenException('Cet enseignant n’est pas assigné à la matière ou à la filière de cet enfant');
        }
        return teacher;
    }

    public async listConversations(parentId: number) {
        const conversations = await this.conversationRepository.find({
            where: { parentId },
            order: { updatedAt: 'DESC' },
        });

        const eligibleConversations = [];
        for (const conversation of conversations) {
            const child = await this.userRepository.findOne({
                where: {
                    id: conversation.studentId,
                    parentId,
                    userType: UserType.STUDENT,
                    membership: MembershipType.PLATINUM,
                },
                select: { id: true },
            });
            if (child) eligibleConversations.push(conversation);
        }

        return Promise.all(eligibleConversations.map(async (conversation) => {
            const teacher = await this.userRepository.findOne({ where: { id: conversation.teacherId } });
            const lastMessage = await this.messageRepository.findOne({
                where: { conversationId: conversation.id },
                order: { createdAt: 'DESC' },
            });
            const unreadCount = await this.messageRepository.count({
                where: { conversationId: conversation.id, isRead: false },
            });

            return {
                id: conversation.id,
                studentId: conversation.studentId,
                teacherId: conversation.teacherId,
                teacherName: teacher ? [teacher.firstname, teacher.lastname].filter(Boolean).join(' ') || teacher.username : 'Enseignant',
                subject: conversation.subject,
                lastMessage: lastMessage?.body ?? null,
                lastMessageAt: lastMessage?.createdAt ?? null,
                unreadCount,
            };
        }));
    }

    public async getUnreadCount(parentId: number) {
        const conversations = await this.conversationRepository.find({
            where: { parentId },
            select: { id: true, studentId: true },
        });

        if (conversations.length === 0) return { unreadCount: 0 };

        const eligibleConversationIds = [];
        for (const conversation of conversations) {
            const child = await this.userRepository.findOne({
                where: {
                    id: conversation.studentId,
                    parentId,
                    userType: UserType.STUDENT,
                    membership: MembershipType.PLATINUM,
                },
                select: { id: true },
            });
            if (child) eligibleConversationIds.push(conversation.id);
        }
        if (eligibleConversationIds.length === 0) return { unreadCount: 0 };

        const unreadCount = await this.messageRepository
            .createQueryBuilder('message')
            .where('message.conversationId IN (:...conversationIds)', {
                conversationIds: eligibleConversationIds,
            })
            .andWhere('message.senderId != :parentId', { parentId })
            .andWhere('message.isRead = :isRead', { isRead: false })
            .getCount();

        return { unreadCount };
    }

    public async createConversation(parentId: number, dto: CreateConversationDto) {
        const child = await this.getLinkedChild(parentId, dto.studentId);
        await this.validateTeacherAssignment(dto.teacherId, child, dto.subject);

        const existing = await this.conversationRepository.findOne({
            where: { parentId, studentId: dto.studentId, teacherId: dto.teacherId },
        });
        if (existing) return existing;

        return this.conversationRepository.save(this.conversationRepository.create({
            parentId,
            studentId: dto.studentId,
            teacherId: dto.teacherId,
            subject: dto.subject.trim(),
        }));
    }

    public async listMessages(parentId: number, conversationId: number) {
        await this.getConversationForParent(parentId, conversationId);
        return this.messageRepository.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
        });
    }

    public async sendMessage(parentId: number, conversationId: number, dto: SendMessageDto) {
        const conversation = await this.getConversationForParent(parentId, conversationId);
        const message = await this.messageRepository.save(this.messageRepository.create({
            conversationId,
            senderId: parentId,
            body: dto.body.trim(),
            isRead: true,
        }));
        conversation.updatedAt = new Date();
        await this.conversationRepository.save(conversation);
        return message;
    }

    public async markAsRead(parentId: number, conversationId: number) {
        await this.getConversationForParent(parentId, conversationId);
        await this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({ isRead: true, readAt: new Date() })
            .where('"conversationId" = :conversationId', { conversationId })
            .andWhere('"senderId" != :parentId', { parentId })
            .execute();
        return { message: 'Messages marqués comme lus' };
    }

    public async listTeacherConversations(teacherId: number) {
        const conversations = await this.conversationRepository.find({
            where: { teacherId },
            order: { updatedAt: 'DESC' },
        });

        return Promise.all(conversations.map(async (conversation) => {
            const parent = await this.userRepository.findOne({ where: { id: conversation.parentId } });
            const child = await this.userRepository.findOne({ where: { id: conversation.studentId } });
            const lastMessage = await this.messageRepository.findOne({
                where: { conversationId: conversation.id },
                order: { createdAt: 'DESC' },
            });
            const unreadCount = await this.messageRepository.count({
                where: { conversationId: conversation.id, isRead: false },
            });

            return {
                id: conversation.id,
                studentId: conversation.studentId,
                teacherId: conversation.teacherId,
                parentName: parent ? [parent.firstname, parent.lastname].filter(Boolean).join(' ') || parent.username : 'Parent',
                studentName: child ? [child.firstname, child.lastname].filter(Boolean).join(' ') || child.username : 'Élève',
                subject: conversation.subject,
                lastMessage: lastMessage?.body ?? null,
                lastMessageAt: lastMessage?.createdAt ?? null,
                unreadCount,
            };
        }));
    }

    public async getTeacherUnreadCount(teacherId: number) {
        const unreadCount = await this.messageRepository
            .createQueryBuilder('message')
            .innerJoin(Conversation, 'conversation', 'conversation.id = message.conversationId')
            .where('conversation.teacherId = :teacherId', { teacherId })
            .andWhere('message.senderId != :teacherId', { teacherId })
            .andWhere('message.isRead = :isRead', { isRead: false })
            .getCount();

        return { unreadCount };
    }

    public async listTeacherMessages(teacherId: number, conversationId: number) {
        await this.getConversationForTeacher(teacherId, conversationId);
        return this.messageRepository.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
        });
    }

    public async sendTeacherMessage(teacherId: number, conversationId: number, dto: SendMessageDto) {
        const conversation = await this.getConversationForTeacher(teacherId, conversationId);
        const message = await this.messageRepository.save(this.messageRepository.create({
            conversationId,
            senderId: teacherId,
            body: dto.body.trim(),
            isRead: true,
        }));
        conversation.updatedAt = new Date();
        await this.conversationRepository.save(conversation);
        return message;
    }

    public async markTeacherMessagesAsRead(teacherId: number, conversationId: number) {
        await this.getConversationForTeacher(teacherId, conversationId);
        await this.messageRepository
            .createQueryBuilder()
            .update(Message)
            .set({ isRead: true, readAt: new Date() })
            .where('"conversationId" = :conversationId', { conversationId })
            .andWhere('"senderId" != :teacherId', { teacherId })
            .execute();
        return { message: 'Messages marqués comme lus' };
    }
}
