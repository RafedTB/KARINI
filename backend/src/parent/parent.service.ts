import { ForbiddenException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";
import { LessonProgress } from "../progress/lesson-progress.entity.js";
import { QuizAttempt } from "../quizzes/quiz-attempt.entity.js";
import { LiveAttendance } from "../live-sessions/live-attendance.entity.js";

@Injectable()
export class ParentService {
    constructor(
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
        @InjectRepository(LessonProgress)
        private readonly progressRepository: Repository<LessonProgress>,
        @InjectRepository(QuizAttempt)
        private readonly attemptRepository: Repository<QuizAttempt>,
        @InjectRepository(LiveAttendance)
        private readonly attendanceRepository: Repository<LiveAttendance>,
    ) {}

    public findChildren(parentId: number) {
        return this.userRepository.find({
            where: { parentId },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                username: true,
                studentClass: true,
                membership: true,
                studentGroup: true,
            },
            order: { lastname: 'ASC', firstname: 'ASC' },
        });
    }

    public async getWeeklySummary(childId: number) {
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - ((startOfWeek.getDay() + 6) % 7));
        const startOfPreviousWeek = new Date(startOfWeek);
        startOfPreviousWeek.setDate(startOfPreviousWeek.getDate() - 7);

        const [current, previous] = await Promise.all([
            this.getProgressSummary(childId, startOfWeek),
            this.getProgressSummary(childId, startOfPreviousWeek, startOfWeek),
        ]);
        return {
            ...current,
            previousWeek: previous,
        };
    }

    private async getProgressSummary(childId: number, from: Date, to?: Date) {
        const progress = await this.progressRepository.find({
            where: { studentId: childId },
        });
        const inRange = progress.filter((item) => item.updatedAt >= from && (!to || item.updatedAt < to));
        const [attempts, attendance] = await Promise.all([
            this.attemptRepository.find({ where: { studentId: childId } }),
            this.attendanceRepository.find({ where: { studentId: childId } }),
        ]);
        const inRangeAttempts = attempts.filter((attempt) => attempt.takenAt >= from && (!to || attempt.takenAt < to));
        const averageQuizScore = inRangeAttempts.length === 0
            ? 0
            : Math.round(inRangeAttempts.reduce((total, attempt) => total + (attempt.score / attempt.maxScore) * 100, 0) / inRangeAttempts.length);
        const liveSessionsAttended = attendance.filter((item) => item.joinedAt >= from && (!to || item.joinedAt < to)).length;
        return {
            lessonsCompleted: inRange.filter((item) => item.completed).length,
            minutesWatched: Math.round(inRange.reduce((total, item) => total + item.watchedSeconds, 0) / 60),
            averageQuizScore,
            liveSessionsAttended,
        };
    }

    public async findTeachers(parentId: number, childId: number) {
        const child = await this.userRepository.findOne({
            where: { id: childId, parentId, userType: UserType.STUDENT },
        });
        if (!child) throw new ForbiddenException("Cet enfant n’est pas lié à votre compte");
        if (child.membership !== MembershipType.PLATINUM) {
            throw new ForbiddenException("La messagerie parent est réservée aux élèves Platinum");
        }

        const teachers = await this.userRepository.find({
            where: { userType: UserType.INSTRUCTOR },
            select: {
                id: true,
                firstname: true,
                lastname: true,
                username: true,
                teachingSubjects: true,
                teachingClasses: true,
            },
            order: { lastname: "ASC", firstname: "ASC" },
        });

        return teachers
            .filter((teacher) => {
                const classes = teacher.teachingClasses ?? [];
                return classes.length === 0 || !child.studentClass || classes.some((value) => value.trim().toLowerCase() === child.studentClass?.trim().toLowerCase());
            })
            .flatMap((teacher) => {
                const name = [teacher.firstname, teacher.lastname].filter(Boolean).join(" ") || teacher.username || "Enseignant";
                const subjects = teacher.teachingSubjects?.length ? teacher.teachingSubjects : ["Suivi pédagogique"];
                return subjects.map((subject) => ({ id: teacher.id, name, subject }));
            });
    }
}
