import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Lesson } from "../courses/lesson.entity.js";
import { User } from "../users/user.entity.js";
import { UserType } from "../utils/enum.js";
import { SaveLessonProgressDto } from "./dto/save-lesson-progress.dto.js";
import { LessonProgress } from "./lesson-progress.entity.js";

@Injectable()
export class ProgressService {
    constructor(
        @InjectRepository(LessonProgress) private readonly progressRepository: Repository<LessonProgress>,
        @InjectRepository(Lesson) private readonly lessonRepository: Repository<Lesson>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    public async getLessonProgress(studentId: number, lessonId: number) {
        return this.progressRepository.findOne({ where: { studentId, lessonId } });
    }

    public async getCourseProgress(studentId: number, courseId: number) {
        const lessons = await this.lessonRepository.find({ where: { courseId }, select: { id: true } });
        if (lessons.length === 0) return [];
        const lessonIds = lessons.map((l) => l.id);
        return this.progressRepository.find({ where: { studentId, lessonId: In(lessonIds) } });
    }

    public async saveLessonProgress(studentId: number, lessonId: number, dto: SaveLessonProgressDto) {
        const student = await this.userRepository.findOne({ where: { id: studentId, userType: UserType.STUDENT } });
        if (!student) throw new ForbiddenException("Seuls les élèves peuvent enregistrer leur progression");

        const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
        if (!lesson) throw new NotFoundException("Leçon introuvable");

        const existing = await this.progressRepository.findOne({ where: { studentId, lessonId } });
        const progress = existing ?? this.progressRepository.create({ studentId, lessonId });

        // Update watched seconds monotonically
        if (dto.watchedSeconds !== undefined) {
            progress.watchedSeconds = Math.max(progress.watchedSeconds || 0, dto.watchedSeconds);
        }

        // Update resume position where user left off
        if (dto.lastPositionSeconds !== undefined) {
            progress.lastPositionSeconds = dto.lastPositionSeconds;
        }

        // Anti-cheat verification:
        // A student cannot mark a lesson as completed by simply seeking to the end of the video!
        // They must have genuinely accumulated at least 80% of the video duration in watchedSeconds.
        if (dto.completed !== undefined) {
            if (dto.completed) {
                const totalSeconds = (lesson.durationMinutes && lesson.durationMinutes > 0)
                    ? lesson.durationMinutes * 60
                    : null;

                if (totalSeconds && totalSeconds > 30) {
                    const requiredSeconds = Math.floor(totalSeconds * 0.8);
                    // Check against either current dto or cumulative watchedSeconds in database
                    const actualWatched = Math.max(progress.watchedSeconds || 0, dto.watchedSeconds || 0);
                    if (actualWatched >= requiredSeconds) {
                        progress.completed = true;
                    } else {
                        // Denied: student skipped to end without watching
                        progress.completed = false;
                    }
                } else {
                    progress.completed = true;
                }
            } else {
                progress.completed = false;
            }
        }

        return this.progressRepository.save(progress);
    }
}
