import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Course } from "../courses/course.entity.js";
import { User } from "../users/user.entity.js";
import { UsersModule } from "../users/users.module.js";
import { Assignment } from "./assignment.entity.js";
import { AssignmentSubmission } from "./assignment-submission.entity.js";
import { AssignmentsController } from "./assignments.controller.js";
import { AssignmentsService } from "./assignments.service.js";

@Module({
    imports: [TypeOrmModule.forFeature([Assignment, AssignmentSubmission, Course, User]), UsersModule],
    controllers: [AssignmentsController],
    providers: [AssignmentsService],
})
export class AssignmentsModule {}
