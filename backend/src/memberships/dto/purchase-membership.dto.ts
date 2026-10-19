import { IsEnum } from "class-validator";
import { MembershipType } from "../../utils/enum.js";

export class PurchaseMembershipDto {
    @IsEnum(MembershipType)
    membership!: MembershipType;
}