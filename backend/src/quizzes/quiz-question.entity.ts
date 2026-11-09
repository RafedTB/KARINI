import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "quiz_questions" })
export class QuizQuestion {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: "integer" })
    quizId!: number;

    @Column({ type: "text" })
    prompt!: string;

    @Column({ type: "simple-json" })
    options!: string[];

    @Column({ type: "integer" })
    correctOption!: number;

    @Column({ type: "integer", default: 1 })
    points!: number;

    @CreateDateColumn({ type: "timestamp" })
    createdAt!: Date;
}
