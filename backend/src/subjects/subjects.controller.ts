import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { SubjectsService } from "./subjects.service.js";
import { CreateSubjectDto } from "./dto/create-subject.dto.js";
import { UpdateSubjectDto } from "./dto/update-subject.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import type { JWTPayloadType } from "../utils/types.js";

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('api/subjects')
@UseGuards(AuthRolesGuard)
export class SubjectsController {
    constructor(private readonly subjectsService: SubjectsService) {}

    @Get()
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR, UserType.PARENT)
    @ApiQuery({ name: 'filiere', required: false, type: String })
    @ApiOperation({ summary: 'Get all subjects, optionally filtered by filière' })
    public findAll(@Query('filiere') filiere?: string) {
        return this.subjectsService.findAll(filiere);
    }

    @Get('meta/filieres')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR, UserType.PARENT)
    @ApiOperation({ summary: 'Get all distinct filières list' })
    public getFilieres() {
        return this.subjectsService.getFilieres();
    }

    @Get(':id')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR, UserType.PARENT)
    @ApiOperation({ summary: 'Get subject by ID' })
    public findOne(@Param('id', ParseIntPipe) id: number) {
        return this.subjectsService.findOne(id);
    }

    @Get('by-slug/:slug')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR, UserType.PARENT)
    @ApiOperation({ summary: 'Get subject by slug' })
    public findBySlug(@Param('slug') slug: string) {
        return this.subjectsService.findBySlug(slug);
    }

    @Post()
    @Roles(UserType.SUPERADMIN)
    @ApiOperation({ summary: 'Create a new subject for a filière (Superadmin only)' })
    public create(@Body() dto: CreateSubjectDto, @currentUser() payload: JWTPayloadType) {
        return this.subjectsService.create(dto, payload.id);
    }

    @Patch(':id')
    @Roles(UserType.SUPERADMIN)
    @ApiOperation({ summary: 'Update a subject (Superadmin only)' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubjectDto) {
        return this.subjectsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserType.SUPERADMIN)
    @ApiOperation({ summary: 'Delete a subject (Superadmin only)' })
    public remove(@Param('id', ParseIntPipe) id: number) {
        return this.subjectsService.remove(id);
    }
}
