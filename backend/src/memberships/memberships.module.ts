import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersModule } from "../users/users.module.js";
import { User } from "../users/user.entity.js";
import { MembershipPlan } from "./membership-plan.entity.js";
import { MembershipsController } from "./memberships.controller.js";
import { MembershipsService } from "./memberships.service.js";

@Module({
    imports: [TypeOrmModule.forFeature([MembershipPlan, User]), UsersModule],
    controllers: [MembershipsController],
    providers: [MembershipsService],
})
export class MembershipsModule {}