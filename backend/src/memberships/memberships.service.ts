import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { MembershipPlan } from "./membership-plan.entity.js";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";

const DEFAULT_MEMBERSHIP_PLANS = [
    { membership: MembershipType.DEFAULT, priceCredits: 0, duration: 'monthly' },
    { membership: MembershipType.SILVER, priceCredits: 100, duration: 'monthly' },
    { membership: MembershipType.GOLD, priceCredits: 250, duration: 'monthly' },
    { membership: MembershipType.PLATINUM, priceCredits: 500, duration: 'yearly' },
];

const TIER_ORDER = [
    MembershipType.DEFAULT,
    MembershipType.SILVER,
    MembershipType.GOLD,
    MembershipType.PLATINUM,
];

/**
 * Computes the annual expiration date for Platinum subscriptions.
 * The subscription ends on June 15th (end of the academic year).
 * If purchased on or before June 15th of the current year, it ends on June 15th of the current year.
 * If purchased after June 15th, it ends on June 15th of the following year.
 */
export function getPlatinumExpirationDate(fromDate = new Date()): Date {
    const currentYear = fromDate.getFullYear();
    // Month 5 = June in JavaScript Date (0 = Jan, 1 = Feb, ..., 5 = Jun)
    // 23:59:59.999 covers the complete day of June 15th
    const june15CurrentYear = new Date(currentYear, 5, 15, 23, 59, 59, 999);
    if (fromDate.getTime() <= june15CurrentYear.getTime()) {
        return june15CurrentYear;
    }
    return new Date(currentYear + 1, 5, 15, 23, 59, 59, 999);
}

@Injectable()
export class MembershipsService implements OnModuleInit {
    constructor(
        @InjectRepository(MembershipPlan) private readonly planRepository: Repository<MembershipPlan>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
    ) {}

    public async onModuleInit() {
        await this.seedDefaultPlans();
    }

    public async seedDefaultPlans() {
        try {
            for (const item of DEFAULT_MEMBERSHIP_PLANS) {
                const existing = await this.planRepository.findOne({ where: { membership: item.membership } });
                if (!existing) {
                    await this.planRepository.save(this.planRepository.create(item));
                } else if (existing.duration !== item.duration) {
                    existing.duration = item.duration;
                    await this.planRepository.save(existing);
                }
            }
        } catch (err) {
            // Synchronize might not have finished running yet
            console.warn("Could not auto-seed membership plans:", err);
        }
    }

    public async getPrices() {
        let plans = await this.planRepository.find();
        if (!plans || plans.length === 0) {
            await this.seedDefaultPlans();
            plans = await this.planRepository.find();
        }
        return plans.sort((a, b) => TIER_ORDER.indexOf(a.membership) - TIER_ORDER.indexOf(b.membership));
    }

    public async updatePrice(membership: MembershipType, priceCredits: number) {
        let plan = await this.planRepository.findOne({ where: { membership } });
        const defaultPlan = DEFAULT_MEMBERSHIP_PLANS.find((p) => p.membership === membership);
        const duration = defaultPlan ? defaultPlan.duration : (membership === MembershipType.PLATINUM ? 'yearly' : 'monthly');

        if (!plan) plan = this.planRepository.create({ membership, priceCredits, duration });
        else {
            plan.priceCredits = priceCredits;
            plan.duration = duration;
        }
        return this.planRepository.save(plan);
    }

    public async purchase(userId: number, membership: MembershipType) {
        let plan = await this.planRepository.findOne({ where: { membership } });
        if (!plan) {
            await this.seedDefaultPlans();
            plan = await this.planRepository.findOne({ where: { membership } });
        }
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
                throw new BadRequestException(`Insufficient credits. Required: ${plan.priceCredits}, available: ${user.credits}`);
            }

            let expiresAt: Date | null = null;
            if (membership === MembershipType.PLATINUM) {
                // Platinum is an annual subscription that ends strictly on June 15th
                expiresAt = getPlatinumExpirationDate();
            } else if (membership === MembershipType.DEFAULT) {
                expiresAt = null;
            } else {
                // Standard, Silver, Gold are monthly subscriptions
                expiresAt = new Date();
                expiresAt.setMonth(expiresAt.getMonth() + 1);
            }

            user.credits -= plan.priceCredits;
            user.membership = membership;
            user.membershipExpiresAt = expiresAt;
            await manager.save(user);
            return {
                membership: user.membership,
                credits: user.credits,
                paidCredits: plan.priceCredits,
                duration: plan.duration,
                membershipExpiresAt: user.membershipExpiresAt,
            };
        });
    }
}