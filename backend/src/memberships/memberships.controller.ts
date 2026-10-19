import { Body, Controller, Get, Param, ParseEnumPipe, Post, Put, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { MembershipsService } from "./memberships.service.js";
import { UpdatePriceDto } from "./dto/update-price.dto.js";
import { PurchaseMembershipDto } from "./dto/purchase-membership.dto.js";
import { AuthRolesGuard } from "../users/guards/auth-roles.guard.js";
import { Roles } from "../users/decorators/user-role.decorator.js";
import { currentUser } from "../users/decorators/current-user.decorator.js";
import { MembershipType, UserType } from "../utils/enum.js";
import type { JWTPayloadType } from "../utils/types.js";

@ApiTags('Memberships')
@ApiBearerAuth()
@Controller('api/memberships')
@UseGuards(AuthRolesGuard)
export class MembershipsController {
    constructor(private readonly membershipsService: MembershipsService) {}

    @Get('prices')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.FINANCE)
    public getPrices() { return this.membershipsService.getPrices(); }

    @Put(':membership/price')
    @Roles(UserType.SUPERADMIN, UserType.FINANCE)
    public updatePrice(
        @Param('membership', new ParseEnumPipe(MembershipType)) membership: MembershipType,
        @Body() body: UpdatePriceDto,
    ) {
        return this.membershipsService.updatePrice(membership, body.priceCredits);
    }

    @Post('purchase')
    @Roles(UserType.STUDENT)
    public purchase(@Body() body: PurchaseMembershipDto, @currentUser() payload: JWTPayloadType) {
        return this.membershipsService.purchase(payload.id, body.membership);
    }
}