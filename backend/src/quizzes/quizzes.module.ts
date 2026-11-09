import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity.js";
import { Quiz } from "./quiz.entity.js";
import { QuizAttempt } from "./quiz-attempt.entity.js";
import { QuizManagementController, QuizzesController } from "./quizzes.controller.js";
import { QuizzesService } from "./quizzes.service.js";
import { UsersModule } from "../users/users.module.js";
import { Course } from "../courses/course.entity.js";
import { Lesson } from "../courses/lesson.entity.js";
import { QuizQuestion } from "./quiz-question.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([Quiz, QuizAttempt, QuizQuestion, User, Course, Lesson]), UsersModule],
    controllers: [QuizzesController, QuizManagementController],
    providers: [QuizzesService],
})
export class QuizzesModule {}
