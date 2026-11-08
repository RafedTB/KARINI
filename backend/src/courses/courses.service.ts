import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "./course.entity.js";
import { Lesson } from "./lesson.entity.js";
import { CreateCourseDto } from "./dto/create-course.dto.js";
import { UpdateCourseDto } from "./dto/update-course.dto.js";
import { CreateLessonDto } from "./dto/create-lesson.dto.js";
import { UpdateLessonDto } from "./dto/update-lesson.dto.js";
import { CourseSection, CourseSubject, MembershipType, UserType } from "../utils/enum.js";
import { User } from "../users/user.entity.js";
import { JWTPayloadType } from "../utils/types.js";

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
        @InjectRepository(Lesson) private readonly lessonRepository: Repository<Lesson>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    public async create(dto: CreateCourseDto, userId: number) {
        const creator = await this.userRepository.findOne({ where: { id: userId } });
        if (creator?.userType === UserType.INSTRUCTOR) {
            this.validateInstructorTeaching(creator, dto.subject, dto.filiere);
        }

        this.validateContent(dto.section, dto.youtubeUrl, dto.pdfFile);
        return this.courseRepository.save(this.courseRepository.create({
            ...dto,
            subject: (dto.subject?.toLowerCase() || CourseSubject.MATH),
            filiere: dto.filiere || null,
            textContent: dto.textContent || null,
            pdfFile: dto.pdfFile || null,
            youtubeUrl: dto.youtubeUrl || null,
            createdById: userId,
        }));
    }

    public async createMagazine(title: string, description: string | undefined, pdfFile: string, userId: number, subject?: string) {
        const creator = await this.userRepository.findOne({ where: { id: userId } });
        if (creator?.userType === UserType.INSTRUCTOR) {
            this.validateInstructorTeaching(creator, subject, undefined);
        }

        return this.courseRepository.save(this.courseRepository.create({
            title,
            description,
            section: CourseSection.MAGAZINE,
            pdfFile,
            subject: (subject?.toLowerCase() || CourseSubject.MATH),
            createdById: userId,
        }));
    }

    public async findAll(payload: JWTPayloadType, subject?: string, section?: CourseSection, filiere?: string, teacherId?: number) {
        const user = await this.userRepository.findOne({ where: { id: payload.id } });
        const whereClause: Record<string, unknown> = {};
        if (subject) {
            whereClause.subject = subject.toLowerCase();
        }
        if (section) {
            whereClause.section = section;
        }
        if (teacherId) {
            whereClause.createdById = teacherId;
        }

        let courses = await this.courseRepository.find({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            relations: { lessons: true, instructor: true },
            order: { createdAt: 'DESC' }
        });

        // Filter courses for student based on their class
        if (user?.userType === UserType.STUDENT && user.studentClass) {
            const sClass = user.studentClass.trim();
            const isBacInfo = /bac.*info/i.test(sClass) || sClass.toLowerCase() === 'bac informatique';
            const studentFiliere = isBacInfo ? 'Bac Informatique' : sClass;

            const requestedFiliere = (filiere && filiere !== 'all') ? filiere : studentFiliere;
            courses = courses.filter((course) => {
                if (!course.filiere || course.filiere === 'all') return true;
                const cFil = course.filiere.trim();
                const cIsBacInfo = /bac.*info/i.test(cFil) || cFil.toLowerCase() === 'bac informatique';
                const targetCFil = cIsBacInfo ? 'Bac Informatique' : cFil;
                return targetCFil.toLowerCase() === requestedFiliere.toLowerCase();
            });
        } else if (filiere && filiere !== 'all') {
            courses = courses.filter((course) => course.filiere === filiere || course.filiere === 'all' || !course.filiere);
        }

        if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
            courses = courses.filter((course) => course.section !== CourseSection.OLDLIVE);
        }

        return courses.map((course) => {
            if (course.instructor) {
                const { password, verificationToken, resetPasswordToken, ...safeInstructor } = course.instructor as any;
                course.instructor = safeInstructor;
            }
            return course;
        });
    }

    public async findOne(id: number, payload: JWTPayloadType) {
        const course = await this.courseRepository.findOne({
            where: { id },
            relations: { lessons: true, instructor: true }
        });
        if (!course) throw new NotFoundException('Course content not found');

        if (course.instructor) {
            const { password, verificationToken, resetPasswordToken, ...safeInstructor } = course.instructor as any;
            course.instructor = safeInstructor;
        }

        if (course.lessons && course.lessons.length > 0) {
            course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
        }

        const user = await this.userRepository.findOne({ where: { id: payload.id } });

        // Access control: student class restriction
        if (user?.userType === UserType.STUDENT && user.studentClass && course.filiere && course.filiere !== 'all') {
            const sClass = user.studentClass.trim();
            const isBacInfo = /bac.*info/i.test(sClass) || sClass.toLowerCase() === 'bac informatique';
            const studentFiliere = isBacInfo ? 'Bac Informatique' : sClass;
            const cFil = course.filiere.trim();
            const cIsBacInfo = /bac.*info/i.test(cFil) || cFil.toLowerCase() === 'bac informatique';
            const courseFiliere = cIsBacInfo ? 'Bac Informatique' : cFil;

            if (studentFiliere.toLowerCase() !== courseFiliere.toLowerCase()) {
                throw new ForbiddenException(`Ce cours est réservé aux élèves de la classe "${course.filiere}".`);
            }
        }

        if (course.section === CourseSection.OLDLIVE) {
            if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
                throw new ForbiddenException('Gold membership or higher is required for old live content');
            }
        }
        return course;
    }

    public async update(id: number, dto: UpdateCourseDto, userId: number, userType?: UserType | string) {
        const course = await this.getAccessibleCourse(id, userId, userType);
        if (userType === UserType.INSTRUCTOR) {
            const instructor = await this.userRepository.findOne({ where: { id: userId } });
            if (instructor) {
                this.validateInstructorTeaching(
                    instructor,
                    dto.subject ?? course.subject,
                    dto.filiere ?? course.filiere
                );
            }
        }
        this.validateContent(dto.section ?? course.section, dto.youtubeUrl ?? course.youtubeUrl, dto.pdfFile ?? course.pdfFile);
        Object.assign(course, dto);
        return this.courseRepository.save(course);
    }

    public async remove(id: number, userId: number, userType?: UserType | string) {
        const course = await this.getAccessibleCourse(id, userId, userType);
        await this.courseRepository.remove(course);
        return { message: 'Course content deleted successfully' };
    }

    // ==========================================
    // LESSONS MANAGEMENT (For Teachers & Admins)
    // ==========================================

    public async createLesson(courseId: number, dto: CreateLessonDto, userId: number, userType?: UserType | string) {
        const course = await this.getAccessibleCourse(courseId, userId, userType);
        this.validateContent(course.section, dto.youtubeUrl, dto.pdfFile);

        const highestOrderLesson = await this.lessonRepository.findOne({
            where: { courseId },
            order: { orderIndex: 'DESC' }
        });
        const defaultOrder = highestOrderLesson ? highestOrderLesson.orderIndex + 1 : 1;

        const lesson = this.lessonRepository.create({
            ...dto,
            courseId,
            orderIndex: dto.orderIndex ?? defaultOrder,
        });

        return this.lessonRepository.save(lesson);
    }

    public async updateLesson(lessonId: number, dto: UpdateLessonDto, userId: number, userType?: UserType | string) {
        const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
        if (!lesson) throw new NotFoundException('Lesson not found');
        await this.getAccessibleCourse(lesson.courseId, userId, userType);

        if (dto.youtubeUrl) {
            this.validateContent(CourseSection.COURSE, dto.youtubeUrl, undefined);
        }

        Object.assign(lesson, dto);
        return this.lessonRepository.save(lesson);
    }

    public async deleteLesson(lessonId: number, userId: number, userType?: UserType | string) {
        const lesson = await this.lessonRepository.findOne({ where: { id: lessonId } });
        if (!lesson) throw new NotFoundException('Lesson not found');
        await this.getAccessibleCourse(lesson.courseId, userId, userType);

        await this.lessonRepository.remove(lesson);
        return { message: 'Lesson deleted successfully' };
    }

    public async getCourseLessons(courseId: number) {
        return this.lessonRepository.find({
            where: { courseId },
            order: { orderIndex: 'ASC' }
        });
    }

    private async getAccessibleCourse(id: number, userId: number, userType?: UserType | string) {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) throw new NotFoundException('Course content not found');
        if (userType === UserType.SUPERADMIN) return course;
        if (course.createdById !== userId) throw new ForbiddenException('You can only manage your own course content');
        return course;
    }

    private validateInstructorTeaching(instructor: User, subject?: string | null, filiere?: string | null) {
        if (instructor.teachingSubjects && instructor.teachingSubjects.length > 0 && subject) {
            const cleanSub = subject.toLowerCase().trim();
            const allowed = instructor.teachingSubjects.some(
                (s) => s.toLowerCase().trim() === cleanSub
            );
            if (!allowed) {
                throw new ForbiddenException(
                    `En tant qu'instructeur, vous n'êtes pas autorisé à enseigner la matière "${subject}". Vos matières assignées sont : ${instructor.teachingSubjects.join(', ')}`
                );
            }
        }

        if (instructor.teachingClasses && instructor.teachingClasses.length > 0 && filiere && filiere !== 'all') {
            const cleanFil = filiere.toLowerCase().trim();
            const allowed = instructor.teachingClasses.some(
                (c) => c.toLowerCase().trim() === cleanFil
            );
            if (!allowed) {
                throw new ForbiddenException(
                    `En tant qu'instructeur, vous n'êtes pas autorisé à enseigner pour la classe "${filiere}". Vos classes assignées sont : ${instructor.teachingClasses.join(', ')}`
                );
            }
        }
    }

    private validateContent(section: CourseSection, youtubeUrl?: string | null, pdfFile?: string | null) {
        if (youtubeUrl) {
            try {
                const hostname = new URL(youtubeUrl).hostname.replace(/^www\./, '');
                if (!['youtube.com', 'youtu.be', 'm.youtube.com'].includes(hostname)) {
                    throw new BadRequestException('The video URL must be hosted on YouTube');
                }
            } catch (e) {
                throw new BadRequestException('Invalid video URL format');
            }
        }
    }
}