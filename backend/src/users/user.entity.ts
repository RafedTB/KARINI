import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CURRENT_TIMESTAMP } from "../utils/constants.js";
import { Exclude } from "class-transformer";
import { MembershipType, UserType } from "../utils/enum.js";

@Entity({ name: 'users' })
export class User {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    username!: string;

    @Column({ type: 'varchar', length: 25, nullable: true })
    firstname!: string;

    @Column({ type: 'varchar', length: 25, nullable: true })
    lastname!: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    email!: string;

    @Column()
    @Exclude()
    password!: string;

    @Column({ type: 'enum', enum: UserType, default: UserType.STUDENT })
    userType!: UserType;

    @Column({ type: 'enum', enum: MembershipType, default: MembershipType.DEFAULT })
    membership!: MembershipType;

    @Column({ type: 'integer', default: 0 })
    credits!: number;

    @Column({ type: 'boolean', default: false })
    isAccountVerified!: boolean;

    @Column({ type: 'varchar', nullable: true })
    verificationToken?: string | null;

    @Column({ type: 'varchar', nullable: true })
    resetPasswordToken?: string | null;

    @Column({ type: 'varchar', nullable: true })
    profileImage?: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    phoneNumber?: string | null;

    @Column({ type: 'varchar', length: 20, nullable: true })
    gender?: string | null;

    @Column({ type: 'varchar', length: 100, nullable: true })
    studentClass?: string | null;

    @Column({ type: 'integer', nullable: true })
    age?: number | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    cin?: string | null;

    @Column({ type: 'varchar', length: 50, nullable: true })
    parentEmail?: string | null;

    @Column({ type: 'varchar', length: 30, nullable: true })
    parentPhone?: string | null;

    @Column({ type: 'integer', nullable: true })
    parentId?: number | null;

    @CreateDateColumn({ type: 'timestamp', default: () => CURRENT_TIMESTAMP })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp', default: () => CURRENT_TIMESTAMP, onUpdate: CURRENT_TIMESTAMP })
    updatedAt!: Date;
}