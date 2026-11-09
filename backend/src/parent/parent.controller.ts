import { Controller, Get, NotFoundException, Param, ParseIntPipe, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";
import { ParentService } from "./parent.service.js";

@ApiTags('Parent')
@ApiBearerAuth()
@Controller('api/parent')
@UseGuards(AuthRolesGuard)
export class ParentController {
    constructor(private readonly parentService: ParentService) {}

    @Get('children')
    @Roles(UserType.PARENT)
    @ApiOperation({ summary: 'List children linked to the authenticated parent' })
    public findChildren(@currentUser() payload: JWTPayloadType) {
        return this.parentService.findChildren(payload.id);
    }

    @Get('children/:id/weekly-summary')
    @Roles(UserType.PARENT)
    @ApiOperation({ summary: 'Get the weekly summary for a linked child' })
    public async getWeeklySummary(
        @Param('id', ParseIntPipe) childId: number,
        @currentUser() payload: JWTPayloadType,
    ) {
        const children = await this.parentService.findChildren(payload.id);
        if (!children.some((child) => child.id === childId)) {
            throw new NotFoundException('Enfant introuvable');
        }
        return this.parentService.getWeeklySummary(childId);
    }

    @Get("children/:id/teachers")
    @Roles(UserType.PARENT)
    @ApiOperation({ summary: "List teachers assigned to a linked child" })
    public findTeachers(
        @Param("id", ParseIntPipe) childId: number,
        @currentUser() payload: JWTPayloadType,
    ) {
        return this.parentService.findTeachers(payload.id, childId);
    }
}
