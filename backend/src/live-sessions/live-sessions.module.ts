import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { LiveSession } from "./live-session.entity.js";
import { User } from "../users/user.entity.js";
import { UsersModule } from "../users/users.module.js";
import { LiveSessionsController } from "./live-sessions.controller.js";
import { LiveSessionsService } from "./live-sessions.service.js";

@Module({
    imports: [TypeOrmModule.forFeature([LiveSession, User]), UsersModule],
    controllers: [LiveSessionsController],
    providers: [LiveSessionsService],
    exports: [LiveSessionsService],
})
export class LiveSessionsModule {}

