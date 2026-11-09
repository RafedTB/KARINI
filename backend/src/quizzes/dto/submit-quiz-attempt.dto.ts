import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, Min } from "class-validator";

export class SubmitQuizAttemptDto {
    @ApiProperty({ example: 8 })
    @IsNumber()
    @Min(0)
    score!: number;

    @ApiProperty({ example: 10 })
    @IsNumber()
    @Min(0.01)
    maxScore!: number;
}
