import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength, Min } from "class-validator";
import { LessonType } from "../../utils/enum.js";

export class CreateLessonDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(LessonType)
    @IsOptional()
    type: LessonType = LessonType.VIDEO;

    @IsString()
    @IsOptional()
    textContent?: string;

    @IsUrl({ protocols: ['http', 'https'] })
    @IsOptional()
    youtubeUrl?: string;

    @IsString()
    @IsOptional()
    pdfFile?: string;

    @IsInt()
    @Min(1)
    @IsOptional()
    orderIndex?: number;

    @IsInt()
    @Min(1)
    @IsOptional()
    durationMinutes?: number;
}
