import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { User } from "../users/user.entity.js";
import type { Assignment } from "./assignment.entity.js";

@Entity({ name: "assignment_submissions" })
export class AssignmentSubmission {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "integer" })
    assignmentId!: number;

    @ManyToOne("Assignment", (assignment: any) => assignment.submissions, { onDelete: "CASCADE" })
    @JoinColumn({ name: "assignmentId" })
    assignment!: Assignment;

    @Column({ type: "integer" })
    studentId!: number;

    @ManyToOne("User", { onDelete: "CASCADE" })
    @JoinColumn({ name: "studentId" })
    student!: User;

    @Column({ type: "text", nullable: true })
    answerText?: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    fileName?: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    originalFileName?: string | null;

    @Column({ type: "timestamp" })
    submittedAt!: Date;

    @Column({ type: "integer", nullable: true })
    score?: number | null;

    @Column({ type: "text", nullable: true })
    feedback?: string | null;

    @Column({ type: "timestamp", nullable: true })
    gradedAt?: Date | null;

    @Column({ type: "integer", nullable: true })
    gradedById?: number | null;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt!: Date;
}
