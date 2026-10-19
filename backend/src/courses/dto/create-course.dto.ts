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

    @IsUrl({ protocols: ['http', 'https'] })
    @IsOptional()
    youtubeUrl?: string;
}