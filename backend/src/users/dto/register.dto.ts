import { IsString, IsNotEmpty, Length, IsEmail, MaxLength, IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class RegisterDto {
    @IsEmail()
    @MaxLength(50)
    @IsNotEmpty()
    email: string = '';

    @IsString()
    @IsNotEmpty()
    @Length(6, 50)
    password: string = '';

    @IsString()
    @IsOptional()
    @MaxLength(50)
    username: string = '';

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    studentClass: string = '';

    @IsString()
    @IsNotEmpty()
    @MaxLength(30)
    phoneNumber: string = '';

    @IsString()
    @IsNotEmpty()
    @MaxLength(20)
    gender: string = '';

    @Type(() => Number)
    @IsNumber()
    @Min(5)
    @Max(100)
    age!: number;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    cin?: string;

    @IsEmail()
    @IsOptional()
    @MaxLength(50)
    parentEmail?: string;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    parentPhone?: string;
}
