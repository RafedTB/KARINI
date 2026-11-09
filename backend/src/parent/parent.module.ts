import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity.js";
import { UsersModule } from "../users/users.module.js";
import { ParentController } from "./parent.controller.js";
import { ParentService } from "./parent.service.js";
import { Conversation } from "../messaging/conversation.entity.js";
import { Message } from "../messaging/message.entity.js";
import { MessagingController } from "../messaging/messaging.controller.js";
import { MessagingService } from "../messaging/messaging.service.js";
import { MessagingGateway } from "../messaging/messaging.gateway.js";
import { TeacherMessagingController } from "../messaging/teacher-messaging.controller.js";
import { LessonProgress } from "../progress/lesson-progress.entity.js";
import { Lesson } from "../courses/lesson.entity.js";
import { QuizAttempt } from "../quizzes/quiz-attempt.entity.js";
import { LiveAttendance } from "../live-sessions/live-attendance.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([User, Conversation, Message, LessonProgress, Lesson, QuizAttempt, LiveAttendance]), UsersModule],
    controllers: [ParentController, MessagingController, TeacherMessagingController],
    providers: [ParentService, MessagingService, MessagingGateway],
    exports: [MessagingService, MessagingGateway],
})
export class ParentModule {}
