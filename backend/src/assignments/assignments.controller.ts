import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import type { Express, Response } from "express";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";
import { AssignmentsService } from "./assignments.service.js";
import { CreateAssignmentDto } from "./dto/create-assignment.dto.js";
import { GradeAssignmentDto } from "./dto/grade-assignment.dto.js";
import { UpdateAssignmentDto } from "./dto/update-assignment.dto.js";

function getAssignmentsUploadsDir() {
    const directory = join(process.cwd(), "uploads", "assignments");
    if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
    return directory;
}

function assignmentPdfStorage() {
    return diskStorage({
        destination: (req, file, cb) => cb(null, getAssignmentsUploadsDir()),
        filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "-")}`),
    });
}

function pdfOnly(req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) {
    cb(file.mimetype === "application/pdf" ? null : new BadRequestException("Seuls les fichiers PDF sont acceptés"), file.mimetype === "application/pdf");
}

@ApiTags("Assignments")
@ApiBearerAuth()
@Controller("api/assignments")
@UseGuards(AuthRolesGuard)
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) {}

    @Get()
    @Roles(UserType.STUDENT, UserType.INSTRUCTOR, UserType.SUPERADMIN)
    list(@currentUser() payload: JWTPayloadType) {
        return this.assignmentsService.list(payload.id, payload.userType);
    }

    @Get("my-submissions")
    @Roles(UserType.STUDENT)
    listMySubmissions(@currentUser() payload: JWTPayloadType) {
        return this.assignmentsService.listMySubmissions(payload.id);
    }

    @Post()
    @Roles(UserType.INSTRUCTOR, UserType.SUPERADMIN)
    @UseInterceptors(FileInterceptor("instructionsFile", {
        storage: assignmentPdfStorage(),
        fileFilter: pdfOnly,
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @ApiConsumes("multipart/form-data")
    create(@currentUser() payload: JWTPayloadType, @Body() dto: CreateAssignmentDto, @UploadedFile() file?: Express.Multer.File) {
        if (!file) throw new BadRequestException("Un PDF de consignes est requis");
        return this.assignmentsService.create(payload.id, payload.userType, dto, file);
    }

    @Get(":id/instructions-file")
    @Roles(UserType.STUDENT, UserType.INSTRUCTOR, UserType.SUPERADMIN)
    async instructionsFile(@Param("id", ParseIntPipe) id: number, @Res() response: Response) {
        return response.sendFile(await this.assignmentsService.getInstructionsFile(id), { root: getAssignmentsUploadsDir() });
    }

    @Post(":id/submissions")
    @Roles(UserType.STUDENT)
    @UseInterceptors(FileInterceptor("file", {
        storage: assignmentPdfStorage(),
        fileFilter: pdfOnly,
        limits: { fileSize: 25 * 1024 * 1024 },
    }))
    @ApiConsumes("multipart/form-data")
    submit(
        @currentUser() payload: JWTPayloadType,
        @Param("id", ParseIntPipe) assignmentId: number,
        @Body("answerText") answerText: string | undefined,
        @UploadedFile() file?: Express.Multer.File,
    ) {
        return this.assignmentsService.submit(payload.id, assignmentId, answerText, file);
    }

    @Get(":id/submissions")
    @Roles(UserType.INSTRUCTOR, UserType.SUPERADMIN)
    listSubmissions(
        @currentUser() payload: JWTPayloadType,
        @Param("id", ParseIntPipe) assignmentId: number,
    ) {
        return this.assignmentsService.listSubmissions(payload.id, payload.userType, assignmentId);
    }

    @Get("submissions/:submissionId/file")
    @Roles(UserType.STUDENT, UserType.INSTRUCTOR, UserType.SUPERADMIN)
    async submissionFile(
        @currentUser() payload: JWTPayloadType,
        @Param("submissionId", ParseIntPipe) submissionId: number,
        @Res() response: Response,
    ) {
        return response.sendFile(
            await this.assignmentsService.getSubmissionFile(payload.id, payload.userType, submissionId),
            { root: getAssignmentsUploadsDir() },
        );
    }

    @Patch("submissions/:submissionId/grade")
    @Roles(UserType.INSTRUCTOR, UserType.SUPERADMIN)
    grade(
        @currentUser() payload: JWTPayloadType,
        @Param("submissionId", ParseIntPipe) submissionId: number,
        @Body() dto: GradeAssignmentDto,
    ) {
        return this.assignmentsService.grade(payload.id, payload.userType, submissionId, dto);
    }

    @Patch(":id")
    @Roles(UserType.INSTRUCTOR, UserType.SUPERADMIN)
    update(
        @currentUser() payload: JWTPayloadType,
        @Param("id", ParseIntPipe) id: number,
        @Body() dto: UpdateAssignmentDto,
    ) {
        return this.assignmentsService.update(payload.id, payload.userType, id, dto);
    }

    @Delete(":id")
    @Roles(UserType.INSTRUCTOR, UserType.SUPERADMIN)
    remove(@currentUser() payload: JWTPayloadType, @Param("id", ParseIntPipe) id: number) {
        return this.assignmentsService.remove(payload.id, payload.userType, id);
    }
}
