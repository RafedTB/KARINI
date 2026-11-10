import { IsString, IsNotEmpty, Length, IsOptional, MaxLength, IsNumber, Min, Max, IsEmail } from "class-validator";
import { Type } from "class-transformer";
export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @Length(8, 100)
    password?: string;

    @IsString()
    @IsOptional()
    @IsNotEmpty()
    currentPassword?: string;

    @IsString()
    @IsOptional()
    @Length(3, 50)
    username?: string;

    @IsString()
    @IsOptional()
    @MaxLength(25)
    firstname?: string;

    @IsString()
    @IsOptional()
    @MaxLength(25)
    lastname?: string;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    phoneNumber?: string;

    @IsString()
    @IsOptional()
    @MaxLength(20)
    gender?: string;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    @Min(13)
    @Max(120)
    age?: number;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    cin?: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    studentClass?: string;

    @IsEmail()
    @IsOptional()
    @MaxLength(50)
    parentEmail?: string;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    parentPhone?: string;
}
