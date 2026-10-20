import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CourseSection } from "../utils/enum.js";
import type { Lesson } from "./lesson.entity.js";

@Entity({ name: 'courses' })
export class Course {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 150 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'enum', enum: CourseSection })
    section!: CourseSection;

    @Column({ type: 'varchar', length: 50, default: 'math' })
    subject!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    filiere?: string | null;

    @Column({ type: 'text', nullable: true })
    textContent?: string | null;

    @Column({ type: 'varchar', length: 500, nullable: true })
    youtubeUrl?: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    pdfFile?: string | null;

    @Column({ type: 'integer' })
    createdById!: number;

    @OneToMany('Lesson', (lesson: any) => lesson.course, { cascade: true })
    lessons!: Lesson[];

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}