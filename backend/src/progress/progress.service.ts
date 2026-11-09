import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

    public async saveLessonProgress(studentId: number, lessonId: number, dto: SaveLessonProgressDto) {
        const student = await this.userRepository.findOne({ where: { id: studentId, userType: UserType.STUDENT } });
        if (!student) throw new ForbiddenException("Seuls les élèves peuvent enregistrer leur progression");

        const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
        if (!lesson) throw new NotFoundException("Leçon introuvable");

        const existing = await this.progressRepository.findOne({ where: { studentId, lessonId } });
        const progress = existing ?? this.progressRepository.create({ studentId, lessonId });
        if (dto.completed !== undefined) progress.completed = dto.completed;
        if (dto.watchedSeconds !== undefined) {
            progress.watchedSeconds = Math.max(progress.watchedSeconds, dto.watchedSeconds);
        }
        if (dto.lastPositionSeconds !== undefined) progress.lastPositionSeconds = dto.lastPositionSeconds;
        return this.progressRepository.save(progress);
    }
}
