import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'messages' })
@Index(['conversationId', 'createdAt'])
export class Message {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'integer' })
    conversationId!: number;

    @Column({ type: 'integer' })
    senderId!: number;

    @Column({ type: 'text' })
    body!: string;

    @Column({ type: 'boolean', default: false })
    isRead!: boolean;

    @Column({ type: 'timestamp', nullable: true })
    readAt?: Date | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;
}
