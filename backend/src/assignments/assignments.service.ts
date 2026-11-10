import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "../courses/course.entity.js";
import { User } from "../users/user.entity.js";
import { MembershipType, UserType } from "../utils/enum.js";
import { Assignment } from "./assignment.entity.js";
import { AssignmentSubmission } from "./assignment-submission.entity.js";
import { CreateAssignmentDto } from "./dto/create-assignment.dto.js";
import { GradeAssignmentDto } from "./dto/grade-assignment.dto.js";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto.js";

@Injectable()
export class AssignmentsService {
    constructor(
        @InjectRepository(Assignment) private readonly assignmentRepository: Repository<Assignment>,
        @InjectRepository(AssignmentSubmission) private readonly submissionRepository: Repository<AssignmentSubmission>,
        @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    private async getAssignment(id: number) {
        const assignment = await this.assignmentRepository.findOne({
            where: { id },
            relations: { course: true },
        });
        if (!assignment) throw new NotFoundException("Devoir introuvable");
        return assignment;
    }

    private async ensureCanManage(assignment: Assignment, userId: number, userType: string) {
        if (userType === UserType.INSTRUCTOR && assignment.createdById !== userId) {
            throw new ForbiddenException("Vous pouvez uniquement gérer vos devoirs");
        }
    }

    private async getEligibleStudent(studentId: number) {
        const student = await this.userRepository.findOne({ where: { id: studentId } });
        if (!student || student.userType !== UserType.STUDENT) {
            throw new ForbiddenException("Cette fonctionnalité est réservée aux élèves Platinum");
        }
        if (
            student.membership !== MembershipType.PLATINUM ||
            (student.membershipExpiresAt && new Date(student.membershipExpiresAt).getTime() <= Date.now())
        ) {
            throw new ForbiddenException("Cette fonctionnalité est réservée aux élèves Platinum");
        }
        return student;
    }

    private ensureStudentCanAccess(assignment: Assignment, student: User) {
        if (!student.studentClass || !assignment.targetClass || student.studentClass.trim().toLowerCase() !== assignment.targetClass.trim().toLowerCase()) {
            throw new ForbiddenException("Ce devoir n'est pas destiné à votre classe");
        }
    }

    public async list(userId: number, userType: string) {
        const student = userType === UserType.STUDENT ? await this.getEligibleStudent(userId) : null;
        const where = userType === UserType.INSTRUCTOR ? { createdById: userId } : undefined;
        const assignments = await this.assignmentRepository.find({
            where,
            relations: { course: true, createdBy: true },
            order: { dueDate: "ASC" },
        });

        if (userType !== UserType.STUDENT) return assignments;

        return assignments
            .filter((assignment) => assignment.targetClass?.trim().toLowerCase() === student!.studentClass!.trim().toLowerCase())
            .map((assignment) => {
                const { createdById: _createdById, createdBy, ...safeAssignment } = assignment;
                return {
                    ...safeAssignment,
                    teacher: createdBy ? {
                        id: createdBy.id,
                        username: createdBy.username,
                        firstname: createdBy.firstname,
                        lastname: createdBy.lastname,
                    } : null,
                };
            });
    }

    public async create(userId: number, userType: string, dto: CreateAssignmentDto, file?: { filename: string; originalname: string }) {
        const subject = dto.subject.trim().toLowerCase();
        const targetClass = dto.targetClass.trim();
        const teacher = userType === UserType.INSTRUCTOR
            ? await this.userRepository.findOne({ where: { id: userId } })
            : null;
        const subjectCourse = await this.courseRepository.findOne({
            where: userType === UserType.INSTRUCTOR
                ? { subject, createdById: userId }
                : { subject },
            select: { id: true },
        });
        if (!subjectCourse) {
            throw new ForbiddenException("Vous pouvez uniquement créer un devoir pour une matière de vos cours");
        }
        const assignedClasses = teacher?.teachingClasses ?? [];
        const classIsAllowed = assignedClasses.length === 0
            || assignedClasses.some((value) => value.trim().toLowerCase() === targetClass.toLowerCase())
            || (subjectCourse.filiere && subjectCourse.filiere.trim().toLowerCase() === targetClass.toLowerCase());
        if (userType === UserType.INSTRUCTOR && !classIsAllowed) {
            throw new ForbiddenException("Vous pouvez uniquement créer un devoir pour une classe qui vous est attribuée");
        }

        return this.assignmentRepository.save(this.assignmentRepository.create({
            title: dto.title.trim(),
            description: dto.description?.trim() || null,
            dueDate: new Date(dto.dueDate),
            maxScore: dto.maxScore,
            subject,
            targetClass,
            courseId: subjectCourse.id,
            createdById: userId,
            instructionsFileName: file?.filename ?? null,
            instructionsOriginalFileName: file?.originalname ?? null,
        }));
    }

    public async getInstructionsFile(id: number, userId?: number, userType?: string) {
        const assignment = await this.getAssignment(id);
        if (userType === UserType.STUDENT) {
            const student = await this.getEligibleStudent(userId!);
            this.ensureStudentCanAccess(assignment, student);
        }
        if (!assignment.instructionsFileName) throw new NotFoundException("Aucun PDF de consignes pour ce devoir");
        return assignment.instructionsFileName;
    }

    public async update(userId: number, userType: string, id: number, dto: UpdateAssignmentDto) {
        const assignment = await this.getAssignment(id);
        await this.ensureCanManage(assignment, userId, userType);
        if (dto.subject !== undefined) {
            const subject = dto.subject.trim().toLowerCase();
            const subjectCourse = await this.courseRepository.findOne({
                where: userType === UserType.INSTRUCTOR
                    ? { subject, createdById: userId }
                    : { subject },
                select: { id: true },
            });
            if (!subjectCourse) throw new BadRequestException("Matière invalide");
            assignment.subject = subject;
            assignment.courseId = subjectCourse.id;
        }
        if (dto.targetClass !== undefined) {
            const targetClass = dto.targetClass.trim();
            const teacher = userType === UserType.INSTRUCTOR
                ? await this.userRepository.findOne({ where: { id: userId } })
                : null;
            if (userType === UserType.INSTRUCTOR && (!teacher?.teachingClasses?.some(
                (value) => value.trim().toLowerCase() === targetClass.toLowerCase(),
            ))) {
                throw new BadRequestException("Classe invalide");
            }
            assignment.targetClass = targetClass;
        }
        Object.assign(assignment, {
            ...(dto.title === undefined ? {} : { title: dto.title.trim() }),
            ...(dto.description === undefined ? {} : { description: dto.description.trim() || null }),
            ...(dto.dueDate === undefined ? {} : { dueDate: new Date(dto.dueDate) }),
            ...(dto.maxScore === undefined ? {} : { maxScore: dto.maxScore }),
        });
        return this.assignmentRepository.save(assignment);
    }

    public async remove(userId: number, userType: string, id: number) {
        const assignment = await this.getAssignment(id);
        await this.ensureCanManage(assignment, userId, userType);
        await this.assignmentRepository.remove(assignment);
        return { message: "Devoir supprimé" };
    }

    public async submit(
        studentId: number,
        assignmentId: number,
        answerText: string | undefined,
        file?: { filename: string; originalname: string },
    ) {
        const assignment = await this.getAssignment(assignmentId);
        const student = await this.getEligibleStudent(studentId);
        this.ensureStudentCanAccess(assignment, student);
        const trimmedAnswer = answerText?.trim() || null;
        if (!trimmedAnswer && !file) throw new BadRequestException("Ajoutez une réponse ou un fichier");

        const existing = await this.submissionRepository.findOne({ where: { assignmentId, studentId } });
        const submission = existing ?? this.submissionRepository.create({ assignmentId, studentId });
        Object.assign(submission, {
            answerText: trimmedAnswer,
            fileName: file?.filename ?? submission.fileName ?? null,
            originalFileName: file?.originalname ?? submission.originalFileName ?? null,
            submittedAt: new Date(),
            score: null,
            feedback: null,
            gradedAt: null,
            gradedById: null,
        });
        return this.submissionRepository.save(submission);
    }

    public async listMySubmissions(studentId: number) {
        const student = await this.getEligibleStudent(studentId);
        return this.submissionRepository.find({
            where: { studentId, assignment: { targetClass: student.studentClass!.trim() } },
            relations: { assignment: true },
            order: { submittedAt: "DESC" },
        });
    }

    public async listSubmissions(userId: number, userType: string, assignmentId: number) {
        const assignment = await this.getAssignment(assignmentId);
        await this.ensureCanManage(assignment, userId, userType);
        return this.submissionRepository.find({
            where: { assignmentId },
            relations: { student: true },
            order: { submittedAt: "DESC" },
        });
    }

    public async getSubmissionFile(userId: number, userType: string, submissionId: number) {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: { assignment: true },
        });
        if (!submission?.fileName) throw new NotFoundException("Aucun fichier pour ce rendu");
        if (userType === UserType.STUDENT && submission.studentId !== userId) {
            throw new ForbiddenException("Vous ne pouvez pas consulter ce rendu");
        }
        await this.ensureCanManage(submission.assignment, userId, userType);
        return submission.fileName;
    }

    public async grade(userId: number, userType: string, submissionId: number, dto: GradeAssignmentDto) {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: { assignment: true },
        });
        if (!submission) throw new NotFoundException("Rendu introuvable");
        await this.ensureCanManage(submission.assignment, userId, userType);
        if (dto.score > submission.assignment.maxScore) {
            throw new BadRequestException(`La note ne peut pas dépasser ${submission.assignment.maxScore}`);
        }
        Object.assign(submission, {
            score: dto.score,
            feedback: dto.feedback?.trim() || null,
            gradedAt: new Date(),
            gradedById: userId,
        });
        return this.submissionRepository.save(submission);
    }
}
