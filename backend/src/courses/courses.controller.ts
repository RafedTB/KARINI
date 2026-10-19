import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import type { Express, Response } from "express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { CoursesService } from "./courses.service.js";
import { CreateCourseDto } from "./dto/create-course.dto.js";
import { MagazineUploadDto } from "./dto/magazine-upload.dto.js";
import { UpdateCourseDto } from "./dto/update-course.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";

@ApiTags('Courses')
@ApiBearerAuth()
@Controller('api/courses')
@UseGuards(AuthRolesGuard)
export class CoursesController {
    constructor(private readonly coursesService: CoursesService) {}

    @Get()
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR)
    public findAll(@currentUser() payload: JWTPayloadType) { return this.coursesService.findAll(payload); }

    @Get(':id')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR)
    public findOne(@Param('id', ParseIntPipe) id: number, @currentUser() payload: JWTPayloadType) { return this.coursesService.findOne(id, payload); }

    @Post()
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR)
    public create(@Body() dto: CreateCourseDto, @currentUser() payload: JWTPayloadType) { return this.coursesService.create(dto, payload.id); }

    @Post('magazine')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR)
    @UseInterceptors(FileInterceptor('pdf', {
        storage: diskStorage({ destination: './uploads/magazines', filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`) }),
        fileFilter: (req, file, cb) => cb(file.mimetype === 'application/pdf' ? null : new BadRequestException('Only PDF files are allowed'), file.mimetype === 'application/pdf'),
        limits: { fileSize: 20 * 1024 * 1024 },
    }))
    @ApiConsumes('multipart/form-data')
    public createMagazine(@UploadedFile() file: Express.Multer.File, @Body() dto: MagazineUploadDto, @currentUser() payload: JWTPayloadType) {
        if (!file) throw new BadRequestException('A PDF file is required');
        return this.coursesService.createMagazine(dto.title, dto.description, file.filename, payload.id);
    }

    @Patch(':id')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR)
    public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCourseDto, @currentUser() payload: JWTPayloadType) { return this.coursesService.update(id, dto, payload.id); }

    @Delete(':id')
    @Roles(UserType.SUPERADMIN, UserType.INSTRUCTOR)
    public remove(@Param('id', ParseIntPipe) id: number, @currentUser() payload: JWTPayloadType) { return this.coursesService.remove(id, payload.id); }

    @Get('magazines/:file')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR)
    public showMagazine(@Param('file') file: string, @Res() res: Response) { return res.sendFile(file, { root: './uploads/magazines' }); }
}