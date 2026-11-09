import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "quizzes" })
export class Quiz {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "varchar", length: 150 })
    title!: string;

    @Column({ type: "integer", nullable: true })
    courseId?: number | null;

    @Column({ type: "integer", nullable: true })
    lessonId?: number | null;

    @Column({ type: "integer", default: 30 })
    durationMinutes!: number;

    @Column({ type: "integer", default: 1 })
    maxAttempts!: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;
}
