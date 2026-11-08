import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'live_sessions' })
export class LiveSession {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 250 })
    title!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'varchar', length: 100 })
    classFiliere!: string;

    @Column({ type: 'varchar', length: 150 })
    subjectName!: string;

    @Column({ type: 'integer', nullable: true })
    subjectId?: number | null;

    @Column({ type: 'integer' })
    teacherId!: number;

    @Column({ type: 'varchar', length: 150 })
    teacherName!: string;

    @Column({ type: 'timestamp' })
    startTime!: Date;

    @Column({ type: 'timestamp' })
    endTime!: Date;

    @Column({ type: 'varchar', length: 500 })
    meetingUrl!: string;

    @Column({ type: 'varchar', length: 50, default: 'All' })
    targetGroup!: string; // 'All' | 'DabaDaba' | 'Standard' | 'Excellent' | 'Top'

    @Column({ type: 'varchar', length: 30, default: 'scheduled' })
    status!: string; // 'scheduled' | 'live' | 'completed' | 'cancelled'

    @Column({ type: 'integer', nullable: true })
    createdById?: number | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

