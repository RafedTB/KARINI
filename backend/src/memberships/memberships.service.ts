import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { MembershipPlan } from "./membership-plan.entity.js";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";

@Injectable()
export class MembershipsService {
    constructor(
        @InjectRepository(MembershipPlan) private readonly planRepository: Repository<MembershipPlan>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
    ) {}

    public getPrices() {
        return this.planRepository.find({ order: { membership: 'ASC' } });
    }

    public async updatePrice(membership: MembershipType, priceCredits: number) {
        let plan = await this.planRepository.findOne({ where: { membership } });
        if (!plan) plan = this.planRepository.create({ membership, priceCredits });
        else plan.priceCredits = priceCredits;
        return this.planRepository.save(plan);
    }

    public async purchase(userId: number, membership: MembershipType) {
        const plan = await this.planRepository.findOne({ where: { membership } });
        if (!plan) throw new NotFoundException('This membership does not have a price yet');

        return this.dataSource.transaction(async (manager) => {
            const user = await manager.findOne(User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) throw new NotFoundException('User not found');
            if (user.userType !== UserType.STUDENT) {
                throw new BadRequestException('Only students can purchase memberships');
            }
            if (user.membership === membership) {
                throw new BadRequestException('You already have this membership');
            }
            if (user.credits < plan.priceCredits) {
                throw new BadRequestException(`Insufficient credits. Required: ${plan.priceCredits}`);
            }

            user.credits -= plan.priceCredits;
            user.membership = membership;
            await manager.save(user);
            return { membership: user.membership, credits: user.credits, paidCredits: plan.priceCredits };
        });
    }
}