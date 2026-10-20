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
        if (filiere && filiere !== 'all') {
            whereClause.filiere = filiere;
        }
        if (teacherId) {
            whereClause.createdById = teacherId;
        }

        const courses = await this.courseRepository.find({
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
            relations: { lessons: true },
            order: { createdAt: 'DESC' }
        });

        if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
            return courses.filter((course) => course.section !== CourseSection.OLDLIVE);
        }
        return courses;
    }

    public async findOne(id: number, payload: JWTPayloadType) {
        const course = await this.courseRepository.findOne({
            where: { id },
            relations: { lessons: true }
        });
        if (!course) throw new NotFoundException('Course content not found');

        if (course.lessons && course.lessons.length > 0) {
            course.lessons.sort((a, b) => a.orderIndex - b.orderIndex);
        }

        if (course.section === CourseSection.OLDLIVE) {
            const user = await this.userRepository.findOne({ where: { id: payload.id } });
            if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
                throw new ForbiddenException('Gold membership or higher is required for old live content');
            }
        }
        return course;
    }

    public async update(id: number, dto: UpdateCourseDto, userId: number, userType?: UserType | string) {
        const course = await this.getAccessibleCourse(id, userId, userType);
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