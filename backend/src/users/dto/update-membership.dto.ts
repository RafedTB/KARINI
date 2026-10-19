import { IsEnum } from "class-validator";
import { MembershipType } from "../../utils/enum.js";

export class UpdateMembershipDto {
    @IsEnum(MembershipType)
    membership!: MembershipType;
}