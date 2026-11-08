import { ForbiddenException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LiveSession } from "./live-session.entity.js";
import { User } from "../users/user.entity.js";
import { CreateLiveSessionDto } from "./dto/create-live-session.dto.js";
import { UpdateLiveSessionDto } from "./dto/update-live-session.dto.js";
import { MembershipType, UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";

@Injectable()
export class LiveSessionsService implements OnModuleInit {
    constructor(
        @InjectRepository(LiveSession)
        private readonly liveSessionRepository: Repository<LiveSession>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) {}

    public async onModuleInit() {
        await this.cleanupDummy();
    }

    public async cleanupDummy() {
        try {
            await this.liveSessionRepository
                .createQueryBuilder()
                .delete()
                .from(LiveSession)
                .where("meetingUrl LIKE :url OR title LIKE :algo OR title LIKE :math OR title LIKE :bdd", {
                    url: '%karini-live-%',
                    algo: '%Résolution Épreuves Algorithmique%',
                    math: '%Nombres Complexes & Probabilités%',
                    bdd: '%Bases de Données Avancées%',
                })
                .execute();
        } catch (err) {
            console.warn("Could not clean up dummy sessions:", err);
        }
    }

    public async findAll(payload: JWTPayloadType) {
        // Automatically purge any dummy sessions from the database
        await this.cleanupDummy();

        const user = await this.userRepository.findOne({ where: { id: payload.id } });
        if (!user) throw new NotFoundException('Utilisateur introuvable');

        // Student access rule: ONLY PLATINUM can view live sessions
        if (user.userType === UserType.STUDENT) {
            if (user.membership !== MembershipType.PLATINUM) {
                throw new ForbiddenException(
                    "L'accès aux sessions Live est exclusivement réservé aux membres de la formule Platinum."
                );
            }

            // Student class filter: only sessions attached to student's class / matiere
            const allSessions = await this.liveSessionRepository.find({
                order: { startTime: 'ASC' },
            });

            const studentClassNorm = (user.studentClass || '').trim().toLowerCase();
            const isBacInfo = /bac.*info/i.test(studentClassNorm) || studentClassNorm === 'bac informatique';
            const studentGroupNorm = (user.studentGroup || 'standard').trim().toLowerCase();

            return allSessions.filter((session) => {
                // 1. Group filter: session must be for student's group or for all groups
                const targetGroupNorm = (session.targetGroup || 'all').trim().toLowerCase();
                const matchesGroup =
                    targetGroupNorm === 'all' ||
                    targetGroupNorm === 'tous' ||
                    targetGroupNorm === studentGroupNorm;
                if (!matchesGroup) return false;

                // 2. Class filter
                if (!user.studentClass) {
                    return true;
                }

                const sessionClassNorm = (session.classFiliere || '').trim().toLowerCase();
                if (sessionClassNorm === 'tous' || sessionClassNorm === 'all') return true;
                if (isBacInfo && (/bac.*info/i.test(sessionClassNorm) || sessionClassNorm === 'bac informatique')) {
                    return true;
                }
                return sessionClassNorm.includes(studentClassNorm) || studentClassNorm.includes(sessionClassNorm);
            });
        }

        // Instructor access rule: view sessions they teach or all
        if (user.userType === UserType.INSTRUCTOR) {
            return this.liveSessionRepository.find({
                where: [{ teacherId: user.id }],
                order: { startTime: 'ASC' },
            });
        }

        // Superadmin & Moderator: see all sessions
        return this.liveSessionRepository.find({
            order: { startTime: 'ASC' },
        });
    }

    public async findOne(id: number) {
        const session = await this.liveSessionRepository.findOne({ where: { id } });
        if (!session) throw new NotFoundException('Session Live introuvable');
        return session;
    }

    public async create(dto: CreateLiveSessionDto, createdById: number) {
        let teacherName = dto.teacherName;
        if (!teacherName && dto.teacherId) {
            const teacher = await this.userRepository.findOne({ where: { id: dto.teacherId } });
            if (teacher) {
                teacherName = [teacher.firstname, teacher.lastname].filter(Boolean).join(' ') || teacher.username;
            }
        }

        const session = this.liveSessionRepository.create({
            ...dto,
            targetGroup: dto.targetGroup || 'All',
            teacherName: teacherName || 'Enseignant Karini',
            startTime: new Date(dto.startTime),
            endTime: new Date(dto.endTime),
            createdById,
            status: dto.status || 'scheduled',
        });

        return this.liveSessionRepository.save(session);
    }

    public async update(id: number, dto: UpdateLiveSessionDto) {
        const session = await this.findOne(id);

        if (dto.teacherId && dto.teacherId !== session.teacherId && !dto.teacherName) {
            const teacher = await this.userRepository.findOne({ where: { id: dto.teacherId } });
            if (teacher) {
                session.teacherName = [teacher.firstname, teacher.lastname].filter(Boolean).join(' ') || teacher.username;
            }
        }

        if (dto.startTime) session.startTime = new Date(dto.startTime);
        if (dto.endTime) session.endTime = new Date(dto.endTime);
        if (dto.title !== undefined) session.title = dto.title;
        if (dto.description !== undefined) session.description = dto.description;
        if (dto.classFiliere !== undefined) session.classFiliere = dto.classFiliere;
        if (dto.subjectName !== undefined) session.subjectName = dto.subjectName;
        if (dto.subjectId !== undefined) session.subjectId = dto.subjectId;
        if (dto.teacherId !== undefined) session.teacherId = dto.teacherId;
        if (dto.teacherName !== undefined) session.teacherName = dto.teacherName;
        if (dto.meetingUrl !== undefined) session.meetingUrl = dto.meetingUrl;
        if (dto.targetGroup !== undefined) session.targetGroup = dto.targetGroup;
        if (dto.status !== undefined) session.status = dto.status;

        return this.liveSessionRepository.save(session);
    }

    public async remove(id: number) {
        const session = await this.findOne(id);
        await this.liveSessionRepository.remove(session);
        return { message: 'Session Live supprimée avec succès' };
    }

    public async getTeachers() {
        return this.userRepository.find({
            where: [{ userType: UserType.INSTRUCTOR }, { userType: UserType.SUPERADMIN }],
            select: {
                id: true,
                username: true,
                firstname: true,
                lastname: true,
                email: true,
                teachingSubjects: true,
                teachingClasses: true,
            },
            order: { lastname: 'ASC', firstname: 'ASC' },
        });
    }
}
