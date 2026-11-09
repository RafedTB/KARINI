import { ApiProperty } from "@nestjs/swagger";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { CreateQuizQuestionDto } from "./create-quiz-question.dto.js";

export class CreateQuizQuestionsDto {
    @ApiProperty({ type: [CreateQuizQuestionDto] })
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => CreateQuizQuestionDto)
    questions!: CreateQuizQuestionDto[];
}
