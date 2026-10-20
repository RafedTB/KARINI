import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'subjects' })
export class Subject {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 150 })
    name!: string;

    @Column({ type: 'varchar', length: 50 })
    code!: string;

    @Column({ type: 'varchar', length: 150 })
    slug!: string;

    @Column({ type: 'varchar', length: 100 })
    filiere!: string;

    @Column({ type: 'varchar', length: 100, default: 'Sciences' })
    category!: string;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @Column({ type: 'varchar', length: 50, default: 'math' })
    icon!: string;

    @Column({ type: 'varchar', length: 30, default: '#4f46e5' })
    color!: string;

    @Column({ type: 'text', nullable: true })
    topics?: string | null;

    @Column({ type: 'integer', nullable: true })
    createdById?: number | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}
