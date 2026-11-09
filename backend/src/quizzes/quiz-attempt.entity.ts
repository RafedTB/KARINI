import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "quiz_attempts" })
@Index(["studentId", "takenAt"])
export class QuizAttempt {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "integer" })
    quizId!: number;

    @Column({ type: "integer" })
    studentId!: number;

    @Column({ type: "float" })
    score!: number;

    @Column({ type: "float" })
    maxScore!: number;

    @CreateDateColumn({ type: "timestamp" })
    takenAt!: Date;
}
