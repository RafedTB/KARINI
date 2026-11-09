import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class GradeAssignmentDto {
    @IsInt()
    @Min(0)
    @Max(1000)
    score!: number;

    @IsOptional()
    @IsString()
    feedback?: string;
}
