import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module.js";
import { Course } from "./course.entity.js";
import { CoursesController } from "./courses.controller.js";
import { CoursesService } from "./courses.service.js";
import { User } from "../users/user.entity.js";

@Module({
    imports: [TypeOrmModule.forFeature([Course, User]), UsersModule],
    controllers: [CoursesController],
    providers: [CoursesService],
})
export class CoursesModule {}