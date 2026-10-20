import { IsBoolean, IsEmail, IsEnum, IsNumber, IsOptional, IsString } from "class-validator";
import { MembershipType, UserType } from "../../utils/enum.js";

export class AdminUpdateUserDto {
    @IsString()
    @IsOptional()
    username?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsEnum(UserType)
    @IsOptional()
    userType?: UserType;

    @IsEnum(MembershipType)
    @IsOptional()
    membership?: MembershipType;

    @IsNumber()
    @IsOptional()
    credits?: number;

    @IsBoolean()
    @IsOptional()
    isAccountVerified?: boolean;

    @IsString()
    @IsOptional()
    firstname?: string;

    @IsString()
    @IsOptional()
    lastname?: string;
}
