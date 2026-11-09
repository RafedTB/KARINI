import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { SubjectsService } from "./subjects.service.js";
import { CreateSubjectDto } from "./dto/create-subject.dto.js";
import { UpdateSubjectDto } from "./dto/update-subject.dto.js";
import { CreateFiliereDto } from "./dto/create-filiere.dto.js";
import { UpdateFiliereDto } from "./dto/update-filiere.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import type { JWTPayloadType } from "../utils/types.js";

import { usersService } from "../users/users.service.js";

@ApiTags('Subjects')
@ApiBearerAuth()
@Controller('api/subjects')
@UseGuards(AuthRolesGuard)
export class SubjectsController {
    constructor(
        private readonly subjectsService: SubjectsService,
        private readonly usersService: usersService,
    ) {}

    @Get('filieres/detailed')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get detailed filières list with subject and course counts' })
    public getFilieresDetailed() {
        return this.subjectsService.getAllFilieresDetailed();
    }

    @Post('filieres')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Add a new filière to the database (Superadmin & Moderator)' })
    public createFiliere(@Body() dto: CreateFiliereDto) {
        return this.subjectsService.createFiliere(dto);
    }

    @Patch('filieres/:id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Update a filière in the database (Superadmin & Moderator)' })
    public updateFiliere(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFiliereDto) {
        return this.subjectsService.updateFiliere(id, dto);
    }

    @Delete('filieres/:id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Delete a filière from the database (Superadmin & Moderator)' })
    public removeFiliere(@Param('id', ParseIntPipe) id: number) {
        return this.subjectsService.removeFiliere(id);
    }

    @Get()
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR)
    @ApiQuery({ name: 'filiere', required: false, type: String })
    @ApiOperation({ summary: 'Get all subjects, optionally filtered by filière' })
    public async findAll(
        @Query('filiere') filiere?: string,
        @currentUser() payload?: JWTPayloadType,
    ) {
        if (payload?.userType === UserType.STUDENT) {
            const user = await this.usersService.getCurrentUser(payload.id);
            if (user?.studentClass) {
                const sClass = user.studentClass.trim();
                const isBacInfo = /bac.*info/i.test(sClass) || sClass.toLowerCase() === 'bac informatique';
                const targetFiliere = isBacInfo ? 'Bac Informatique' : sClass;
                return this.subjectsService.findAll(targetFiliere);
            }
        }
        return this.subjectsService.findAll(filiere);
    }

    @Get('meta/filieres')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get all distinct filières list' })
    public async getFilieres(@currentUser() payload?: JWTPayloadType) {
        if (payload?.userType === UserType.STUDENT) {
            const user = await this.usersService.getCurrentUser(payload.id);
            if (user?.studentClass) {
                const sClass = user.studentClass.trim();
                const isBacInfo = /bac.*info/i.test(sClass) || sClass.toLowerCase() === 'bac informatique';
                const targetFiliere = isBacInfo ? 'Bac Informatique' : sClass;
                return [targetFiliere];
            }
        }
        return this.subjectsService.getFilieres();
    }

    @Get(':id')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get subject by ID' })
    public findOne(@Param('id', ParseIntPipe) id: number) {
        return this.subjectsService.findOne(id);
    }

    @Get('by-slug/:slug')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.FINANCE, UserType.MODERATOR)
    @ApiOperation({ summary: 'Get subject by slug' })
    public findBySlug(@Param('slug') slug: string) {
        return this.subjectsService.findBySlug(slug);
    }

    @Post()
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Create a new subject for a filière (Superadmin & Moderator)' })
    public create(@Body() dto: CreateSubjectDto, @currentUser() payload: JWTPayloadType) {
        return this.subjectsService.create(dto, payload.id);
    }

    @Patch(':id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Update a subject (Superadmin & Moderator)' })
    public update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubjectDto) {
        return this.subjectsService.update(id, dto);
    }

    @Delete(':id')
    @Roles(UserType.SUPERADMIN, UserType.MODERATOR)
    @ApiOperation({ summary: 'Delete a subject (Superadmin & Moderator)' })
    public remove(@Param('id', ParseIntPipe) id: number) {
        return this.subjectsService.remove(id);
    }
}
