import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "live_attendance" })
@Index(["studentId", "sessionId"], { unique: true })
export class LiveAttendance {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "integer" })
    studentId!: number;

    @Column({ type: "integer" })
    sessionId!: number;

    @CreateDateColumn({ type: "timestamp" })
    joinedAt!: Date;
}
