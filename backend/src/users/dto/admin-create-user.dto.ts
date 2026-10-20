import { IsEmail, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength } from "class-validator";
import { MembershipType, UserType } from "../../utils/enum.js";

export class AdminCreateUserDto {
    @IsString()
    @IsNotEmpty()
    username!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsEnum(UserType)
    userType!: UserType;

    @IsEnum(MembershipType)
    @IsOptional()
    membership?: MembershipType;

    @IsNumber()
    @IsOptional()
    credits?: number;

    @IsString()
    @IsOptional()
    firstname?: string;

    @IsString()
    @IsOptional()
    lastname?: string;
}
