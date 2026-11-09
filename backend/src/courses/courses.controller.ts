import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import type { Express, Response } from "express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { join, basename } from "node:path";
import { existsSync, mkdirSync } from "node:fs";
import { CoursesService } from "./courses.service.js";
import { CreateCourseDto } from "./dto/create-course.dto.js";
import { MagazineUploadDto } from "./dto/magazine-upload.dto.js";
import { UpdateCourseDto } from "./dto/update-course.dto.js";
import { CreateLessonDto } from "./dto/create-lesson.dto.js";
import { UpdateLessonDto } from "./dto/update-lesson.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { CourseSection, UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";

function getUploadsDir(): string {
    const candidates = [
        join(process.cwd(), 'uploads', 'magazines'),
        join(process.cwd(), 'backend', 'uploads', 'magazines'),
        join(process.cwd(), 'backend', 'backend', 'uploads', 'magazines'),
    ];
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    const target = existsSync(join(process.cwd(), 'backend'))
        ? join(process.cwd(), 'backend', 'uploads', 'magazines')
        : join(process.cwd(), 'uploads', 'magazines');
    mkdirSync(target, { recursive: true });
    return target;
}

function getVideosUploadsDir(): string {
    const candidates = [
        join(process.cwd(), 'uploads', 'videos'),
        join(process.cwd(), 'backend', 'uploads', 'videos'),
        join(process.cwd(), 'backend', 'backend', 'uploads', 'videos'),
    ];
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    const target = existsSync(join(process.cwd(), 'backend'))
        ? join(process.cwd(), 'backend', 'uploads', 'videos')
        : join(process.cwd(), 'uploads', 'videos');
    mkdirSync(target, { recursive: true });
    return target;
}

function findFileInDirs(filename: string, subfolder: string): string | null {
    const base = basename(filename);
    const candidates = [
        join(process.cwd(), 'uploads', subfolder, base),
        join(process.cwd(), 'backend', 'uploads', subfolder, base),
        join(process.cwd(), 'backend', 'backend', 'uploads', subfolder, base),
    ];
    for (const p of candidates) {
        if (existsSync(p)) return p;
    }
    return null;
}

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('api/courses')
@UseGuards(AuthRolesGuard)
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) {}

    @Get()
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiQuery({ name: 'subject', required: false, type: String })
    @ApiQuery({ name: 'section', required: false, enum: CourseSection })
    @ApiQuery({ name: 'filiere', required: false, type: String })
    @ApiQuery({ name: 'teacherId', required: false, type: Number })
    @ApiOperation({ summary: 'List courses with optional filtering' })
    public findAll(
        @currentUser() payload: JWTPayloadType,
        @Query('subject') subject?: string,
        @Query('section') section?: CourseSection,
        @Query('filiere') filiere?: string,
        @Query('teacherId') teacherId?: number,
    ) {
        return this.coursesService.findAll(payload, subject, section, filiere, teacherId);
    }

    @Get(':id')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get course details with lessons' })
    public findOne(@Param('id', ParseIntPipe) id: number, @currentUser() payload: JWTPayloadType) {
        return this.coursesService.findOne(id, payload);
    }

    @Post()
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Create a new course (Teacher, Admin or Moderator)' })
    public create(@Body() dto: CreateCourseDto, @currentUser() payload: JWTPayloadType) {
        return this.coursesService.create(dto, payload.id);
    }

    @Post('upload-file')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: (req, file, cb) => cb(null, getUploadsDir()),
            filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
        }),
        fileFilter: (req, file, cb) => cb(file.mimetype === 'application/pdf' ? null : new BadRequestException('Only PDF files are allowed'), file.mimetype === 'application/pdf'),
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a PDF document for course or lesson' })
    public uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('A PDF file is required');
        return {
            filename: file.filename,
            originalName: file.originalname,
            url: `/api/courses/materials/${file.filename}`,
        };
    }

    @Post('upload-video')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @UseInterceptors(FileInterceptor('video', {
        storage: diskStorage({
            destination: (req, file, cb) => cb(null, getVideosUploadsDir()),
            filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
        }),
        fileFilter: (req, file, cb) => {
            const isVideo = file.mimetype.startsWith('video/') ||
                ['.mp4', '.webm', '.mov', '.mkv', '.avi'].some(ext => file.originalname.toLowerCase().endsWith(ext));
            cb(isVideo ? null : new BadRequestException('Seuls les fichiers vidéo (MP4, WebM, MOV, MKV) sont acceptés'), isVideo);
        },
        limits: { fileSize: 300 * 1024 * 1024 },
    }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a video file for a course or lesson from PC' })
    public uploadVideo(@UploadedFile() file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Un fichier vidéo est requis');
        return {
            filename: file.filename,
            originalName: file.originalname,
            url: `/api/courses/videos/${file.filename}`,
        };
    }

    @Post('magazine')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @UseInterceptors(FileInterceptor('pdf', {
        storage: diskStorage({
            destination: (req, file, cb) => cb(null, getUploadsDir()),
            filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`)
        }),
        fileFilter: (req, file, cb) => cb(file.mimetype === 'application/pdf' ? null : new BadRequestException('Only PDF files are allowed'), file.mimetype === 'application/pdf'),
        limits: { fileSize: 20 * 1024 * 1024 },
    }))
    @ApiConsumes('multipart/form-data')
    public createMagazine(@UploadedFile() file: Express.Multer.File, @Body() dto: MagazineUploadDto, @currentUser() payload: JWTPayloadType) {
        if (!file) throw new BadRequestException('A PDF file is required');
        return this.coursesService.createMagazine(dto.title, dto.description, file.filename, payload.id, dto.subject, dto.filiere);
    }

    @Patch(':id')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Update a course' })
    public update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: UpdateCourseDto,
        @currentUser() payload: JWTPayloadType
    ) {
        return this.coursesService.update(id, dto, payload.id, payload.userType);
    }

    @Delete(':id')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Delete a course' })
    public remove(@Param('id', ParseIntPipe) id: number, @currentUser() payload: JWTPayloadType) {
        return this.coursesService.remove(id, payload.id, payload.userType);
    }

    // ==========================================
    // LESSONS ENDPOINTS
    // ==========================================

    @Post(':courseId/lessons')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Add a lesson (Text, Video, PDF) to a course' })
    public createLesson(
        @Param('courseId', ParseIntPipe) courseId: number,
        @Body() dto: CreateLessonDto,
        @currentUser() payload: JWTPayloadType
    ) {
        return this.coursesService.createLesson(courseId, dto, payload.id, payload.userType);
    }

    @Patch('lessons/:lessonId')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Update a lesson' })
    public updateLesson(
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @Body() dto: UpdateLessonDto,
        @currentUser() payload: JWTPayloadType
    ) {
        return this.coursesService.updateLesson(lessonId, dto, payload.id, payload.userType);
    }

    @Delete('lessons/:lessonId')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Delete a lesson' })
    public deleteLesson(
        @Param('lessonId', ParseIntPipe) lessonId: number,
        @currentUser() payload: JWTPayloadType
    ) {
        return this.coursesService.deleteLesson(lessonId, payload.id, payload.userType);
    }

    @Get(':courseId/lessons')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get all lessons for a course' })
    public getCourseLessons(
        @Param('courseId', ParseIntPipe) courseId: number,
        @currentUser() payload: JWTPayloadType
    ) {
        return this.coursesService.getCourseLessons(courseId, payload);
    }

    @Get('materials/:file')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Download or view a PDF lesson/material file' })
    public async showMaterial(
        @Param('file') file: string,
        @currentUser() payload: JWTPayloadType,
        @Res() res: Response
    ) {
        await this.coursesService.assertMediaAccess(payload.id);
        const resolved = findFileInDirs(file, 'magazines') || join(getUploadsDir(), basename(file));
        return res.sendFile(resolved);
    }

    @Get('magazines/:file')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    public async showMagazine(
        @Param('file') file: string,
        @currentUser() payload: JWTPayloadType,
        @Res() res: Response
    ) {
        await this.coursesService.assertMediaAccess(payload.id);
        const resolved = findFileInDirs(file, 'magazines') || join(getUploadsDir(), basename(file));
        return res.sendFile(resolved);
    }

    @Get('videos/:file')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR)
    @ApiOperation({ summary: 'Stream an uploaded video file inline with anti-download protection' })
    public async showVideo(
        @Param('file') file: string,
        @currentUser() payload: JWTPayloadType,
        @Res() res: Response
    ) {
        await this.coursesService.assertMediaAccess(payload.id);
        const resolved = findFileInDirs(file, 'videos') || join(getVideosUploadsDir(), basename(file));
        res.setHeader('Content-Disposition', 'inline');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        return res.sendFile(resolved, { acceptRanges: true });
    }
}