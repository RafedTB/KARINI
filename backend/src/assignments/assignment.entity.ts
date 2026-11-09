import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Course } from "../courses/course.entity.js";
import type { User } from "../users/user.entity.js";
import type { AssignmentSubmission } from "./assignment-submission.entity.js";

@Entity({ name: "assignments" })
export class Assignment {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 180 })
    title!: string;

    @Column({ type: "text", nullable: true })
    description?: string | null;

    @Column({ type: "timestamp" })
    dueDate!: Date;

    @Column({ type: "integer", default: 100 })
    maxScore!: number;

    @Column({ type: "varchar", length: 255, nullable: true })
    instructionsFileName?: string | null;

    @Column({ type: "varchar", length: 255, nullable: true })
    instructionsOriginalFileName?: string | null;

    @Column({ type: "varchar", length: 100, nullable: true })
    subject?: string | null;

    @Column({ type: "integer", nullable: true })
    courseId?: number | null;

    @ManyToOne("Course", { nullable: true, onDelete: "SET NULL" })
    @JoinColumn({ name: "courseId" })
    course!: Course;

    @Column({ type: "integer" })
    createdById!: number;

    @ManyToOne("User", { onDelete: "CASCADE" })
    @JoinColumn({ name: "createdById" })
    createdBy!: User;

    @OneToMany("AssignmentSubmission", (submission: any) => submission.assignment)
    submissions!: AssignmentSubmission[];

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt!: Date;
}
