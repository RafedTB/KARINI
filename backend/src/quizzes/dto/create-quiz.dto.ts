import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CreateQuizDto {
    @ApiProperty({ example: "Évaluation - Fonctions" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @ApiPropertyOptional({ example: 12 })
    @IsOptional()
    @IsInt()
    @Min(1)
    courseId?: number;

    @ApiPropertyOptional({ example: 34 })
    @IsOptional()
    @IsInt()
    @Min(1)
    lessonId?: number;

    @ApiPropertyOptional({ example: 30, description: "Time allowed in minutes" })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(180)
    durationMinutes?: number;

    @ApiPropertyOptional({ example: 3, description: "Maximum attempts allowed per student" })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(20)
    maxAttempts?: number;
}
