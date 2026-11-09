import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: 'filieres' })
export class Filiere {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 150, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    cycle?: string | null;

    @Column({ type: 'text', nullable: true })
    description?: string | null;

    @CreateDateColumn({ type: 'timestamp' })
    createdAt!: Date;

    @UpdateDateColumn({ type: 'timestamp' })
    updatedAt!: Date;
}

