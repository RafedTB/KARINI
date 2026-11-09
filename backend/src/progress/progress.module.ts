import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Lesson } from "../courses/lesson.entity.js";
import { User } from "../users/user.entity.js";
import { LessonProgress } from "./lesson-progress.entity.js";
import { CourseProgressController, ProgressController } from "./progress.controller.js";
import { ProgressService } from "./progress.service.js";
import { UsersModule } from "../users/users.module.js";

@Module({
    imports: [TypeOrmModule.forFeature([LessonProgress, Lesson, User]), UsersModule],
    controllers: [ProgressController, CourseProgressController],
    providers: [ProgressService],
})
export class ProgressModule {}
