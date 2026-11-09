import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "lesson_progress" })
@Index(["studentId", "lessonId"], { unique: true })
@Index(["studentId", "updatedAt"])
export class LessonProgress {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "integer" })
    studentId!: number;

    @Column({ type: "integer" })
    lessonId!: number;

    @Column({ type: "boolean", default: false })
    completed!: boolean;

    @Column({ type: "integer", default: 0 })
    watchedSeconds!: number;

    @Column({ type: "integer", default: 0 })
    lastPositionSeconds!: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;

    @UpdateDateColumn({ type: "timestamp" })
    updatedAt!: Date;
}
