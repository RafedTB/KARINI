import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Subject } from "./subject.entity.js";
import { Filiere } from "./filiere.entity.js";
import { Course } from "../courses/course.entity.js";
import { SubjectsService } from "./subjects.service.js";
import { SubjectsController } from "./subjects.controller.js";
import { UsersModule } from "../users/users.module.js";

@Module({
    imports: [TypeOrmModule.forFeature([Subject, Filiere, Course]), UsersModule],
    controllers: [SubjectsController],
    providers: [SubjectsService],
    exports: [SubjectsService],
})
export class SubjectsModule {}
