import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Course } from "./course.entity.js";
import { CreateCourseDto } from "./dto/create-course.dto.js";
import { UpdateCourseDto } from "./dto/update-course.dto.js";
import { CourseSection, MembershipType, UserType } from "../utils/enum.js";
import { User } from "../users/user.entity.js";
import { JWTPayloadType } from "../utils/types.js";

@Injectable()
export class CoursesService {
    constructor(
        @InjectRepository(Course) private readonly courseRepository: Repository<Course>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
    ) {}

    public async create(dto: CreateCourseDto, userId: number) {
        this.validateContent(dto.section, dto.youtubeUrl, undefined);
        return this.courseRepository.save(this.courseRepository.create({ ...dto, createdById: userId }));
    }

    public async createMagazine(title: string, description: string | undefined, pdfFile: string, userId: number) {
        return this.courseRepository.save(this.courseRepository.create({ title, description, section: CourseSection.MAGAZINE, pdfFile, createdById: userId }));
    }

    public async findAll(payload: JWTPayloadType) {
        const user = await this.userRepository.findOne({ where: { id: payload.id } });
        const courses = await this.courseRepository.find({ order: { createdAt: 'DESC' } });
        if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
            return courses.filter((course) => course.section !== CourseSection.OLDLIVE);
        }
        return courses;
    }

    public async findOne(id: number, payload: JWTPayloadType) {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) throw new NotFoundException('Course content not found');
        if (course.section === CourseSection.OLDLIVE) {
            const user = await this.userRepository.findOne({ where: { id: payload.id } });
            if (user?.userType === UserType.STUDENT && ![MembershipType.GOLD, MembershipType.PLATINUM].includes(user.membership)) {
                throw new ForbiddenException('Gold membership or higher is required for old live content');
            }
        }
        return course;
    }

    public async update(id: number, dto: UpdateCourseDto, userId: number) {
        const course = await this.getOwnedCourse(id, userId);
        this.validateContent(dto.section ?? course.section, dto.youtubeUrl ?? course.youtubeUrl, course.pdfFile);
        Object.assign(course, dto);
        return this.courseRepository.save(course);
    }

    public async remove(id: number, userId: number) {
        const course = await this.getOwnedCourse(id, userId);
        await this.courseRepository.remove(course);
        return { message: 'Course content deleted successfully' };
    }

    private async getOwnedCourse(id: number, userId: number) {
        const course = await this.courseRepository.findOne({ where: { id } });
        if (!course) throw new NotFoundException('Course content not found');
        if (course.createdById !== userId) throw new ForbiddenException('You can only manage your own course content');
        return course;
    }

    private validateContent(section: CourseSection, youtubeUrl?: string | null, pdfFile?: string | null) {
        if (section === CourseSection.MAGAZINE && !pdfFile) throw new BadRequestException('A PDF file is required for magazine content');
        if (section !== CourseSection.MAGAZINE && !youtubeUrl) throw new BadRequestException('A YouTube URL is required for this section');
        if (section !== CourseSection.MAGAZINE && youtubeUrl) {
            const hostname = new URL(youtubeUrl).hostname.replace(/^www\./, '');
            if (!['youtube.com', 'youtu.be', 'm.youtube.com'].includes(hostname)) {
                throw new BadRequestException('The video URL must be hosted on YouTube');
            }
        }
    }
}