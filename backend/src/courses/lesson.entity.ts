import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { Course } from "./course.entity.js";
import { LessonType } from "../utils/enum.js";

@Entity({ name: 'lessons' })
export class Lesson {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 150 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'enum', enum: LessonType, default: LessonType.VIDEO })
    type!: LessonType;

    @Column({ type: 'text', nullable: true })
    textContent?: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    youtubeUrl?: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    pdfFile?: string | null;

    @Column({ type: 'integer', default: 1 })
    orderIndex!: number;

    @Column({ type: 'integer', nullable: true })
    durationMinutes?: number | null;

    @Column({ type: 'integer' })
    courseId!: number;

    @ManyToOne('Course', (course: any) => course.lessons, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'courseId' })
    course!: Course;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
