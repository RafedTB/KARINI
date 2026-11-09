import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import type { JWTPayloadType } from "../utils/types.js";
import { UserType } from "../utils/enum.js";
import { SubmitQuizAttemptDto } from "./dto/submit-quiz-attempt.dto.js";
import { CreateQuizDto } from "./dto/create-quiz.dto.js";
import { CreateQuizQuestionDto } from "./dto/create-quiz-question.dto.js";
import { CreateQuizQuestionsDto } from "./dto/create-quiz-questions.dto.js";
import { SubmitQuizAnswersDto } from "./dto/submit-quiz-answers.dto.js";
import { UpdateQuizDto } from "./dto/update-quiz.dto.js";
import { UpdateQuizQuestionDto } from "./dto/update-quiz-question.dto.js";
import { QuizzesService } from "./quizzes.service.js";

@ApiTags("Quizzes")
@ApiBearerAuth()
@Controller("api/student/quizzes")
@UseGuards(AuthRolesGuard)
@Roles(UserType.STUDENT)
export class QuizzesController {
    constructor(private readonly quizzesService: QuizzesService) {}

    @Get("courses/:courseId")
    @ApiOperation({ summary: "List quizzes for a course available to the authenticated student" })
    public list(
        @currentUser() payload: JWTPayloadType,
        @Param("courseId", ParseIntPipe) courseId: number,
    ) {
        return this.quizzesService.listForStudent(payload.id, courseId);
    }

    @Post(":quizId/attempts")
    @ApiOperation({ summary: "Submit a quiz attempt for the authenticated student" })
    public submit(
        @currentUser() payload: JWTPayloadType,
        @Param("quizId", ParseIntPipe) quizId: number,
        @Body() dto: SubmitQuizAttemptDto,
    ) {
        return this.quizzesService.submitAttempt(payload.id, quizId, dto);
    }

    @Post(":quizId/submit")
    @ApiOperation({ summary: "Submit quiz answers for the authenticated student" })
    public submitAnswers(
        @currentUser() payload: JWTPayloadType,
        @Param("quizId", ParseIntPipe) quizId: number,
        @Body() dto: SubmitQuizAnswersDto,
    ) {
        return this.quizzesService.submitAnswers(payload.id, quizId, dto);
    }
}

@ApiTags("Quizzes")
@ApiBearerAuth()
@Controller("api/quizzes")
@UseGuards(AuthRolesGuard)
@Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR)
export class QuizManagementController {
    constructor(private readonly quizzesService: QuizzesService) {}

    @Post()
    @ApiOperation({ summary: "Create a quiz linked to a course or lesson" })
    public create(@currentUser() payload: JWTPayloadType, @Body() dto: CreateQuizDto) {
        return this.quizzesService.createQuiz(payload.id, payload.userType, dto);
    }

    @Get("courses/:courseId")
    @ApiOperation({ summary: "List quizzes managed by the authenticated teacher" })
    public listManaged(@currentUser() payload: JWTPayloadType, @Param("courseId", ParseIntPipe) courseId: number) {
        return this.quizzesService.listManaged(payload.id, payload.userType, courseId);
    }

    @Get(":quizId/results")
    @ApiOperation({ summary: "List student quiz attempts and grades" })
    public listResults(@currentUser() payload: JWTPayloadType, @Param("quizId", ParseIntPipe) quizId: number) {
        return this.quizzesService.listResults(payload.id, payload.userType, quizId);
    }

    @Patch(":quizId")
    @ApiOperation({ summary: "Update a quiz title or timer" })
    public update(@currentUser() payload: JWTPayloadType, @Param("quizId", ParseIntPipe) quizId: number, @Body() dto: UpdateQuizDto) {
        return this.quizzesService.updateQuiz(payload.id, payload.userType, quizId, dto);
    }

    @Delete(":quizId")
    @ApiOperation({ summary: "Delete a quiz" })
    public remove(@currentUser() payload: JWTPayloadType, @Param("quizId", ParseIntPipe) quizId: number) {
        return this.quizzesService.deleteQuiz(payload.id, payload.userType, quizId);
    }

    @Post(":quizId/questions")
    @ApiOperation({ summary: "Add a multiple-choice question to a quiz" })
    public addQuestion(
        @currentUser() payload: JWTPayloadType,
        @Param("quizId", ParseIntPipe) quizId: number,
        @Body() dto: CreateQuizQuestionDto,
    ) {
        return this.quizzesService.createQuestion(payload.id, payload.userType, quizId, dto);
    }

    @Post(":quizId/questions/bulk")
    @ApiOperation({ summary: "Add multiple quiz questions at once" })
    public addQuestions(
        @currentUser() payload: JWTPayloadType,
        @Param("quizId", ParseIntPipe) quizId: number,
        @Body() dto: CreateQuizQuestionsDto,
    ) {
        return this.quizzesService.createQuestions(payload.id, payload.userType, quizId, dto);
    }

    @Patch("questions/:questionId")
    @ApiOperation({ summary: "Update a quiz question and its answers" })
    public updateQuestion(
        @currentUser() payload: JWTPayloadType,
        @Param("questionId", ParseIntPipe) questionId: number,
        @Body() dto: UpdateQuizQuestionDto,
    ) {
        return this.quizzesService.updateQuestion(payload.id, payload.userType, questionId, dto);
    }

    @Delete("questions/:questionId")
    @ApiOperation({ summary: "Delete a quiz question" })
    public deleteQuestion(@currentUser() payload: JWTPayloadType, @Param("questionId", ParseIntPipe) questionId: number) {
        return this.quizzesService.deleteQuestion(payload.id, payload.userType, questionId);
    }
}
