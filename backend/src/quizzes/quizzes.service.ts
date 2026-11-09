import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";
import { Course } from "../courses/course.entity.js";
import { Lesson } from "../courses/lesson.entity.js";
import { Quiz } from "./quiz.entity.js";
import { QuizAttempt } from "./quiz-attempt.entity.js";
import { CreateQuizDto } from "./dto/create-quiz.dto.js";
import { SubmitQuizAttemptDto } from "./dto/submit-quiz-attempt.dto.js";
import { QuizQuestion } from "./quiz-question.entity.js";
import { CreateQuizQuestionDto } from "./dto/create-quiz-question.dto.js";
import { CreateQuizQuestionsDto } from "./dto/create-quiz-questions.dto.js";
import { SubmitQuizAnswersDto } from "./dto/submit-quiz-answers.dto.js";
import { UpdateQuizDto } from "./dto/update-quiz.dto.js";
import { UpdateQuizQuestionDto } from "./dto/update-quiz-question.dto.js";

@Injectable()
export class QuizzesService {
    constructor(
        @InjectRepository(Quiz) private readonly quizRepository: Repository<Quiz>,
        @InjectRepository(QuizAttempt) private readonly attemptRepository: Repository<QuizAttempt>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
        @InjectRepository(Lesson) private readonly lessonRepository: Repository<Lesson>,
        @InjectRepository(QuizQuestion) private readonly questionRepository: Repository<QuizQuestion>,
    ) {}

    public async createQuiz(userId: number, userType: string, dto: CreateQuizDto) {
        if (dto.courseId === undefined && dto.lessonId === undefined) {
            throw new ForbiddenException("Un quiz doit être lié à un cours ou une leçon");
        }

        const course = dto.courseId === undefined
            ? undefined
            : await this.courseRepository.findOne({ where: { id: dto.courseId } });
        if (dto.courseId !== undefined && !course) {
            throw new NotFoundException("Cours introuvable");
        }

        const lesson = dto.lessonId === undefined
            ? undefined
            : await this.lessonRepository.findOne({ where: { id: dto.lessonId } });
        if (dto.lessonId !== undefined && !lesson) {
            throw new NotFoundException("Leçon introuvable");
        }

        if (course && lesson && lesson.courseId !== course.id) {
            throw new ForbiddenException("La leçon n’appartient pas à ce cours");
        }

        const targetCourseId = course?.id ?? lesson?.courseId;
        if (userType === UserType.INSTRUCTOR && targetCourseId !== undefined) {
            const ownedCourse = await this.courseRepository.findOne({
                where: { id: targetCourseId, createdById: userId },
                select: { id: true },
            });
            if (!ownedCourse) {
                throw new ForbiddenException("Vous pouvez uniquement ajouter un quiz à votre cours");
            }
        }

        return this.quizRepository.save(this.quizRepository.create({
            title: dto.title.trim(),
            courseId: targetCourseId,
            lessonId: lesson?.id,
            durationMinutes: dto.durationMinutes ?? 30,
            maxAttempts: dto.maxAttempts ?? 1,
        }));
    }

    private async getManagedQuiz(userId: number, userType: string, quizId: number) {
        const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
        if (!quiz) throw new NotFoundException("Quiz introuvable");
        if (userType === UserType.INSTRUCTOR) {
            const courseId = quiz.courseId;
            if (!courseId || !(await this.courseRepository.findOne({ where: { id: courseId, createdById: userId }, select: { id: true } }))) {
                throw new ForbiddenException("Vous pouvez uniquement gérer vos quiz");
            }
        }
        return quiz;
    }

    public async listManaged(userId: number, userType: string, courseId: number) {
        if (userType === UserType.INSTRUCTOR && !(await this.courseRepository.findOne({ where: { id: courseId, createdById: userId }, select: { id: true } }))) {
            throw new ForbiddenException("Vous pouvez uniquement gérer vos cours");
        }
        const quizzes = await this.quizRepository.find({ where: { courseId }, order: { createdAt: "DESC" } });
        return Promise.all(quizzes.map(async (quiz) => ({
            ...quiz,
            questions: await this.questionRepository.find({ where: { quizId: quiz.id }, order: { createdAt: "ASC" } }),
        })));
    }

    public async listResults(userId: number, userType: string, quizId: number) {
        await this.getManagedQuiz(userId, userType, quizId);
        const attempts = await this.attemptRepository.find({
            where: { quizId },
            order: { takenAt: "DESC" },
        });
        const students = attempts.length === 0
            ? []
            : await this.userRepository.find({
                where: { id: In(attempts.map((attempt) => attempt.studentId)) },
                select: { id: true, username: true, firstname: true, lastname: true },
            });
        const studentsById = new Map(students.map((student) => [student.id, student]));

        const grouped = new Map<number, {
            studentId: number;
            studentName: string;
            attempts: Array<{
                id: number;
                score: number;
                maxScore: number;
                percentage: number;
                takenAt: Date;
            }>;
        }>();
        for (const attempt of attempts) {
            const student = studentsById.get(attempt.studentId);
            const studentName = [student?.firstname, student?.lastname].filter(Boolean).join(" ") || student?.username || "Élève";
            const group = grouped.get(attempt.studentId) ?? { studentId: attempt.studentId, studentName, attempts: [] };
            group.attempts.push({
                id: attempt.id,
                score: attempt.score,
                maxScore: attempt.maxScore,
                percentage: attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0,
                takenAt: attempt.takenAt,
            });
            grouped.set(attempt.studentId, group);
        }
        return Array.from(grouped.values()).map((group) => ({
            ...group,
            attemptCount: group.attempts.length,
            bestPercentage: Math.max(...group.attempts.map((attempt) => attempt.percentage)),
        }));
    }

    public async updateQuiz(userId: number, userType: string, quizId: number, dto: UpdateQuizDto) {
        const quiz = await this.getManagedQuiz(userId, userType, quizId);
        Object.assign(quiz, {
            ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
            ...(dto.durationMinutes === undefined ? {} : { durationMinutes: dto.durationMinutes }),
            ...(dto.maxAttempts === undefined ? {} : { maxAttempts: dto.maxAttempts }),
        });
        return this.quizRepository.save(quiz);
    }

    public async deleteQuiz(userId: number, userType: string, quizId: number) {
        const quiz = await this.getManagedQuiz(userId, userType, quizId);
        await this.questionRepository.delete({ quizId });
        await this.quizRepository.remove(quiz);
        return { message: "Quiz supprimé" };
    }

    public async createQuestion(userId: number, userType: string, quizId: number, dto: CreateQuizQuestionDto) {
        const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
        if (!quiz) throw new NotFoundException("Quiz introuvable");
        if (userType === UserType.INSTRUCTOR) {
            const courseId = quiz.courseId;
            if (!courseId || !(await this.courseRepository.findOne({
                where: { id: courseId, createdById: userId },
                select: { id: true },
            }))) {
                throw new ForbiddenException("Vous pouvez uniquement modifier votre quiz");
            }

        }
        if (dto.correctOption >= dto.options.length) {
            throw new ForbiddenException("La réponse correcte doit correspondre à une option");
        }
        return this.questionRepository.save(this.questionRepository.create({
            quizId,
            prompt: dto.prompt.trim(),
            options: dto.options.map((option) => option.trim()),
            correctOption: dto.correctOption,
            points: dto.points,
        }));
    }

    public async createQuestions(userId: number, userType: string, quizId: number, dto: CreateQuizQuestionsDto) {
        return Promise.all(dto.questions.map((question) => this.createQuestion(userId, userType, quizId, question)));
    }

    public async updateQuestion(userId: number, userType: string, questionId: number, dto: UpdateQuizQuestionDto) {
        const question = await this.questionRepository.findOne({ where: { id: questionId } });
        if (!question) throw new NotFoundException("Question introuvable");
        await this.getManagedQuiz(userId, userType, question.quizId);
        if (dto.correctOption !== undefined && dto.options === undefined && dto.correctOption >= question.options.length) {
            throw new ForbiddenException("La réponse correcte doit correspondre à une option");
        }
        if (dto.correctOption !== undefined && dto.options !== undefined && dto.correctOption >= dto.options.length) {
            throw new ForbiddenException("La réponse correcte doit correspondre à une option");
        }
        Object.assign(question, {
            ...(dto.prompt === undefined ? {} : { prompt: dto.prompt.trim() }),
            ...(dto.options === undefined ? {} : { options: dto.options.map((option) => option.trim()) }),
            ...(dto.correctOption === undefined ? {} : { correctOption: dto.correctOption }),
            ...(dto.points === undefined ? {} : { points: dto.points }),
        });
        return this.questionRepository.save(question);
    }

    public async deleteQuestion(userId: number, userType: string, questionId: number) {
        const question = await this.questionRepository.findOne({ where: { id: questionId } });
        if (!question) throw new NotFoundException("Question introuvable");
        await this.getManagedQuiz(userId, userType, question.quizId);
        await this.questionRepository.remove(question);
        return { message: "Question supprimée" };
    }

    public async listForStudent(studentId: number, courseId: number) {
        const student = await this.userRepository.findOne({ where: { id: studentId, userType: UserType.STUDENT } });
        if (!student) throw new ForbiddenException("Seuls les élèves peuvent accéder aux quiz");
        if (student.membership !== MembershipType.GOLD && student.membership !== MembershipType.PLATINUM) {
            throw new ForbiddenException("Les quiz sont réservés aux élèves Gold et Platinum");
        }

        const quizzes = await this.quizRepository.find({ where: { courseId }, order: { createdAt: "ASC" } });
        return Promise.all(quizzes.map(async (quiz) => ({
            id: quiz.id,
            title: quiz.title,
            courseId: quiz.courseId,
            lessonId: quiz.lessonId,
            durationMinutes: quiz.durationMinutes,
            maxAttempts: quiz.maxAttempts,
            createdAt: quiz.createdAt,
            questions: await this.questionRepository.find({
                where: { quizId: quiz.id },
                select: { id: true, quizId: true, prompt: true, options: true, points: true, createdAt: true },
                order: { createdAt: "ASC" },
            }),
        })));
    }

    public async submitAttempt(studentId: number, quizId: number, dto: SubmitQuizAttemptDto) {
        const student = await this.userRepository.findOne({ where: { id: studentId, userType: UserType.STUDENT } });
        if (!student) throw new ForbiddenException("Seuls les élèves peuvent soumettre un quiz");
        if (student.membership !== MembershipType.GOLD && student.membership !== MembershipType.PLATINUM) {
            throw new ForbiddenException("Les quiz sont réservés aux élèves Gold et Platinum");
        }
        const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
        if (!quiz) throw new NotFoundException("Quiz introuvable");
        const attemptCount = await this.attemptRepository.count({ where: { quizId, studentId } });
        if (attemptCount >= quiz.maxAttempts) {
            throw new ForbiddenException(`Nombre maximum de tentatives atteint (${quiz.maxAttempts})`);
        }
        if (dto.score > dto.maxScore) throw new ForbiddenException("Le score ne peut pas dépasser le score maximal");

        return this.attemptRepository.save(this.attemptRepository.create({
            quizId,
            studentId,
            score: dto.score,
            maxScore: dto.maxScore,
        }));
    }

    public async submitAnswers(studentId: number, quizId: number, dto: SubmitQuizAnswersDto) {
        const student = await this.userRepository.findOne({ where: { id: studentId, userType: UserType.STUDENT } });
        if (!student) throw new ForbiddenException("Seuls les élèves peuvent soumettre un quiz");
        if (student.membership !== MembershipType.GOLD && student.membership !== MembershipType.PLATINUM) {
            throw new ForbiddenException("Les quiz sont réservés aux élèves Gold et Platinum");
        }
        const quiz = await this.quizRepository.findOne({ where: { id: quizId } });
        if (!quiz) throw new NotFoundException("Quiz introuvable");
        const attemptCount = await this.attemptRepository.count({ where: { quizId, studentId } });
        if (attemptCount >= quiz.maxAttempts) {
            throw new ForbiddenException(`Nombre maximum de tentatives atteint (${quiz.maxAttempts})`);
        }
        const questions = await this.questionRepository.find({ where: { quizId } });
        const answers = new Map(dto.answers.map((answer) => [answer.questionId, answer.selectedOption]));
        const maxScore = questions.reduce((total, question) => total + question.points, 0);
        const score = questions.reduce(
            (total, question) => total + (answers.get(question.id) === question.correctOption ? question.points : 0),
            0,
        );
        await this.attemptRepository.save(this.attemptRepository.create({ quizId, studentId, score, maxScore }));
        return {
            score,
            maxScore,
            percentage: Math.round((score / maxScore) * 100),
            answers: questions.map((question) => ({
                questionId: question.id,
                selectedOption: answers.get(question.id) ?? null,
                correctOption: question.correctOption,
                correct: answers.get(question.id) === question.correctOption,
            })),
        };
    }
}
