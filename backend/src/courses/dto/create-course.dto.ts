import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { CourseSection } from "../../utils/enum.js";

export class CreateCourseDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsEnum(CourseSection)
    section!: CourseSection;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsString()
    @IsOptional()
    filiere?: string;

    @IsString()
    @IsOptional()
    textContent?: string;

    @IsUrl({ protocols: ['http', 'https'] })
    @IsOptional()
    youtubeUrl?: string;

    @IsString()
    @IsOptional()
    pdfFile?: string;
}