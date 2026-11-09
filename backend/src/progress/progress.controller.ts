import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import type { JWTPayloadType } from "../utils/types.js";
import { UserType } from "../utils/enum.js";
import { SaveLessonProgressDto } from "./dto/save-lesson-progress.dto.js";
import { ProgressService } from "./progress.service.js";

@ApiTags("Lesson Progress")
@ApiBearerAuth()
@Controller("api/student/lessons")
@UseGuards(AuthRolesGuard)
@Roles(UserType.STUDENT)
export class ProgressController {
    constructor(private readonly progressService: ProgressService) {}

    @Get(":lessonId/progress")
    @ApiOperation({ summary: "Get progress of a lesson for the authenticated student" })
    public getLessonProgress(
        @currentUser() payload: JWTPayloadType,
        @Param("lessonId", ParseIntPipe) lessonId: number,
    ) {
        return this.progressService.getLessonProgress(payload.id, lessonId);
    }

    @Put(":lessonId/progress")
    @ApiOperation({ summary: "Save the authenticated student's lesson progress" })
    public save(
        @currentUser() payload: JWTPayloadType,
        @Param("lessonId", ParseIntPipe) lessonId: number,
        @Body() dto: SaveLessonProgressDto,
    ) {
        return this.progressService.saveLessonProgress(payload.id, lessonId, dto);
    }
}

@ApiTags("Course Progress")
@ApiBearerAuth()
@Controller("api/student/courses")
@UseGuards(AuthRolesGuard)
@Roles(UserType.STUDENT)
export class CourseProgressController {
    constructor(private readonly progressService: ProgressService) {}

    @Get(":courseId/progress")
    @ApiOperation({ summary: "Get progress of all lessons in course for the authenticated student" })
    public getCourseProgress(
        @currentUser() payload: JWTPayloadType,
        @Param("courseId", ParseIntPipe) courseId: number,
    ) {
        return this.progressService.getCourseProgress(payload.id, courseId);
    }
}
