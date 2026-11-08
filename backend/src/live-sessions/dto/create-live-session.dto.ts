import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateLiveSessionDto {
    @ApiProperty({ example: 'Séance Live: Révision Arbres & Récursivité' })
    @IsString()
    @IsNotEmpty()
    title!: string;

    @ApiProperty({ required: false, example: 'Session interactive avec exercices et résolution de sujets de Bac' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({ example: 'Bac Informatique' })
    @IsString()
    @IsNotEmpty()
    classFiliere!: string;

    @ApiProperty({ example: 'Algorithmique & Programmation' })
    @IsString()
    @IsNotEmpty()
    subjectName!: string;

    @ApiProperty({ required: false, example: 1 })
    @IsNumber()
    @IsOptional()
    subjectId?: number;

    @ApiProperty({ example: 2 })
    @IsNumber()
    @IsNotEmpty()
    teacherId!: number;

    @ApiProperty({ required: false, example: 'Mohamed Ben Ali' })
    @IsString()
    @IsOptional()
    teacherName?: string;

    @ApiProperty({ example: '2026-11-15T18:00:00.000Z' })
    @IsNotEmpty()
    startTime!: string | Date;

    @ApiProperty({ example: '2026-11-15T19:30:00.000Z' })
    @IsNotEmpty()
    endTime!: string | Date;

    @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij' })
    @IsString()
    @IsNotEmpty()
    meetingUrl!: string;

    @ApiProperty({ required: false, example: 'All', default: 'All' })
    @IsString()
    @IsOptional()
    targetGroup?: string;

    @ApiProperty({ required: false, example: 'scheduled' })
    @IsString()
    @IsOptional()
    status?: string;
}

