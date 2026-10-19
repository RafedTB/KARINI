import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import { MembershipType } from "../utils/enum.js";

@Entity({ name: 'membership_plans' })
@Unique(['membership'])
export class MembershipPlan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'enum', enum: MembershipType })
    membership!: MembershipType;

    @Column({ type: 'integer', default: 0 })
    priceCredits!: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}