import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CourseSection } from "../utils/enum.js";

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

    @Column({ type: 'varchar', length: 500, nullable: true })
    youtubeUrl?: string | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    pdfFile?: string | null;

    @Column({ type: 'integer' })
    createdById!: number;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}