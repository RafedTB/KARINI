import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateAssignmentDto {
    @IsString()
    @IsNotEmpty()
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsDateString()
    dueDate!: string;

    @IsInt()
    @Min(1)
    @Max(1000)
    @Type(() => Number)
    maxScore!: number;

    @IsString()
    @IsNotEmpty()
    subject!: string;

    @IsString()
    @IsNotEmpty()
    targetClass!: string;
}
