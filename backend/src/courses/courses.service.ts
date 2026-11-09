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
            videoFile: dto.videoFile || null,
            youtubeUrl: dto.youtubeUrl || null,
            createdById: userId,
        }));
    }

    public async createMagazine(title: string, description: string | undefined, pdfFile: string, userId: number, subject?: string, filiere?: string) {
        const creator = await this.userRepository.findOne({ where: { id: userId } });
        if (creator?.userType === UserType.INSTRUCTOR) {
            this.validateInstructorTeaching(creator, subject, filiere);
        }

        return this.courseRepository.save(this.courseRepository.create({
            title,
            description,
            section: CourseSection.MAGAZINE,
            pdfFile,
            subject: (subject?.toLowerCase() || CourseSubject.MATH),
            filiere: filiere || null,
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

        const cleanMembership = (user?.membership || '').toString().toLowerCase().trim();
        const isPaidStudent = ['silver', 'gold', 'platinum'].includes(cleanMembership);
        const isGold = cleanMembership === 'gold';
        const isPlatinum = cleanMembership === 'platinum';

        // Filter courses for student based on their class
        // Platinum & Gold students have full access to courses of all filières!
        if (user?.userType === UserType.STUDENT && user.studentClass && !isPlatinum && !isGold) {
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
            const reqFil = filiere.toLowerCase().trim();
            courses = courses.filter((course) => {
                if (!course.filiere || course.filiere === 'all') return true;
                return course.filiere.toLowerCase().trim() === reqFil;
            });
        }

        // Section access rule:
        // CourseSection.OLDLIVE ("archive live") is STRICTLY EXCLUSIVE to Gold members!
        // Silver, Free, and even Platinum CANNOT see CourseSection.OLDLIVE!
        if (user?.userType === UserType.STUDENT && !isGold) {
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
        const cleanMembership = (user?.membership || '').toString().toLowerCase().trim();
        const isPaidStudent = ['silver', 'gold', 'platinum'].includes(cleanMembership);
        const isGold = cleanMembership === 'gold';
        const isPlatinum = cleanMembership === 'platinum';
        const isFreeStudent = user?.userType === UserType.STUDENT && !isPaidStudent;

        // Access control: student class restriction
        // Platinum and Gold members have full unrestricted access to all courses across all filières!
        if (user?.userType === UserType.STUDENT && !isGold && !isPlatinum && user.studentClass && course.filiere && course.filiere !== 'all') {
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

        // Section access rule:
        // CourseSection.OLDLIVE ("archive live") is STRICTLY EXCLUSIVE to Gold members!
        // Silver, Free, and even Platinum CANNOT see CourseSection.OLDLIVE!
        if (course.section === CourseSection.OLDLIVE) {
            if (user?.userType === UserType.STUDENT && !isGold) {
                throw new ForbiddenException("L'accès aux archives des directs (Live Archive) est réservé exclusivement aux membres de la formule Gold.");
            }
        }

        // Only redact for Free students. Platinum, Gold, and Silver students receive full access!
        if (isFreeStudent) {
            course.youtubeUrl = null;
            course.videoFile = null;
            if (course.lessons && course.lessons.length > 0) {
                for (const l of course.lessons) {
                    l.youtubeUrl = null;
                    l.videoFile = null;
                }
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

    public async getCourseLessons(courseId: number, payload?: JWTPayloadType) {
        const lessons = await this.lessonRepository.find({
            where: { courseId },
            order: { orderIndex: 'ASC' }
        });
        if (payload?.id) {
            const user = await this.userRepository.findOne({ where: { id: payload.id } });
            const cleanMembership = (user?.membership || '').toString().toLowerCase().trim();
            const isFreeStudent = user?.userType === UserType.STUDENT && !['silver', 'gold', 'platinum'].includes(cleanMembership);
            if (isFreeStudent) {
                for (const l of lessons) {
                    l.youtubeUrl = null;
                    l.videoFile = null;
                }
            }
        }
        return lessons;
    }

    /**
     * Checks whether a student has sufficient membership (Silver, Gold, Platinum)
     * to open or download PDF magazines and lesson materials.
     */
    public async assertMediaAccess(userId: number) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Utilisateur introuvable');
        if (user.userType !== UserType.STUDENT) return;

        const cleanMembership = (user.membership || '').toString().toLowerCase().trim();
        const isPaidStudent = ['silver', 'gold', 'platinum'].includes(cleanMembership);

        if (!isPaidStudent) {
            throw new ForbiddenException(
                'Votre formule actuelle (Gratuit) ne vous permet pas d\'ouvrir ou de télécharger les supports PDF et vidéos. Veuillez souscrire à une formule Silver, Gold ou Platinum.'
            );
        }
    }

    private async getAccessibleCourse(id: number, userId: number, userType?: UserType | string) {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) throw new NotFoundException('Course content not found');
        if (userType === UserType.SUPERADMIN || userType === UserType.MODERATOR) return course;
        if (course.createdById !== userId) throw new ForbiddenException('You can only manage your own course content');
        return course;
    }

    private validateInstructorTeaching(instructor: User, subject?: string | null, filiere?: string | null) {
        if (instructor.teachingSubjects && instructor.teachingSubjects.length > 0 && subject) {
            const cleanSub = subject.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const allowed = instructor.teachingSubjects.some((s) => {
                const cleanS = s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                return (
                    cleanSub === cleanS ||
                    cleanSub.startsWith(cleanS + '-') ||
                    cleanSub.startsWith(cleanS) ||
                    cleanSub.includes(cleanS) ||
                    cleanS.includes(cleanSub)
                );
            });
            if (!allowed) {
                throw new ForbiddenException(
                    `En tant qu'instructeur, vous n'êtes pas autorisé à enseigner la matière "${subject}". Vos matières assignées sont : ${instructor.teachingSubjects.join(', ')}`
                );
            }
        }

        if (instructor.teachingClasses && instructor.teachingClasses.length > 0 && filiere && filiere !== 'all') {
            const cleanFil = filiere.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
            const allowed = instructor.teachingClasses.some((c) => {
                const cleanC = c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
                return (
                    cleanFil === cleanC ||
                    cleanFil.includes(cleanC) ||
                    cleanC.includes(cleanFil)
                );
            });
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
                const url = new URL(youtubeUrl);
                if (section !== CourseSection.OLDLIVE) {
                    const hostname = url.hostname.replace(/^www\./, '');
                    if (!['youtube.com', 'youtu.be', 'm.youtube.com', 'vimeo.com'].includes(hostname)) {
                        throw new BadRequestException('The video URL must be hosted on YouTube');
                    }
                }
            } catch (e) {
                if (e instanceof BadRequestException) throw e;
                throw new BadRequestException('Invalid video or stream URL format');
            }
        }
    }
}