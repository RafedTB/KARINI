import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CourseSection } from "../../utils/enum.js";

export class MagazineUploadDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    title!: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    subject?: string;

    @IsEnum(CourseSection)
    section: CourseSection = CourseSection.MAGAZINE;
}