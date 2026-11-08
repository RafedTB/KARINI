import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { LiveSessionsService } from "./live-sessions.service.js";
import { CreateLiveSessionDto } from "./dto/create-live-session.dto.js";
import { UpdateLiveSessionDto } from "./dto/update-live-session.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";

@ApiTags('Live Sessions')
@ApiBearerAuth()
@Controller('api/live-sessions')
@UseGuards(AuthRolesGuard)
export class LiveSessionsController {
    constructor(private readonly liveSessionsService: LiveSessionsService) {}

    @Get()
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR, UserType.INSTRUCTOR, UserType.STUDENT)
    @ApiOperation({ summary: 'Get all live sessions accessible to the current user (Platinum only for students)' })
    public findAll(@currentUser() payload: JWTPayloadType) {
        return this.liveSessionsService.findAll(payload);
    }

    @Post('cleanup')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR, UserType.STUDENT, UserType.INSTRUCTOR)
    @ApiOperation({ summary: 'Purge any dummy test sessions from the database' })
    public cleanup() {
        return this.liveSessionsService.cleanupDummy();
    }

    @Get('teachers')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR, UserType.INSTRUCTOR)
    @ApiOperation({ summary: 'Get list of available instructors for live sessions (Superadmin and Moderator)' })
    public getTeachers() {
        return this.liveSessionsService.getTeachers();
    }

    @Get(':id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR, UserType.INSTRUCTOR, UserType.STUDENT)
    @ApiOperation({ summary: 'Get live session details by ID' })
    public findOne(@Param('id', ParseIntPipe) id: number) {
        return this.liveSessionsService.findOne(id);
    }

    @Post()
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Schedule a new live session (Superadmin and Moderator only)' })
    public create(@Body() dto: CreateLiveSessionDto, @currentUser() payload: JWTPayloadType) {
        return this.liveSessionsService.create(dto, payload.id);
    }

    @Patch(':id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Update a live session (Superadmin and Moderator only)' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLiveSessionDto) {
        return this.liveSessionsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Delete a live session (Superadmin and Moderator only)' })
    public remove(@Param('id', ParseIntPipe) id: number) {
        return this.liveSessionsService.remove(id);
    }
}

