import { PartialType } from "@nestjs/swagger";
import { CreateQuizQuestionDto } from "./create-quiz-question.dto.js";

export class UpdateQuizQuestionDto extends PartialType(CreateQuizQuestionDto) {}
