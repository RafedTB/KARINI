import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsInt, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class QuizAnswerDto {
    @ApiProperty({ example: 12 })
    @IsInt()
    @Min(1)
    questionId!: number;

    @ApiProperty({ example: 1, description: "Zero-based option index" })
    @IsInt()
    @Min(0)
    selectedOption!: number;
}

export class SubmitQuizAnswersDto {
    @ApiProperty({ type: [QuizAnswerDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => QuizAnswerDto)
    answers!: QuizAnswerDto[];
}
