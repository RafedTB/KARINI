import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'conversations' })
@Index(['parentId', 'teacherId', 'studentId'], { unique: true })
export class Conversation {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'integer' })
    parentId!: number;

    @Column({ type: 'integer' })
    teacherId!: number;

    @Column({ type: 'integer' })
    studentId!: number;

    @Column({ type: 'varchar', length: 100 })
    subject!: string;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
