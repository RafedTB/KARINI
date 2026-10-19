import { IsString, IsNotEmpty, Length, IsNumber, Min, MinLength } from "class-validator";
export class ResetPasswordDto {

    @IsString()
    @IsNotEmpty()
    @Length(6, 50)
    newPassword: string = '';

    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    userId: number = 0;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    resetPasswordToken: string = '';

}
