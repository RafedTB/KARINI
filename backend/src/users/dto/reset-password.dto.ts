import { IsString, IsNotEmpty, Length, IsNumber, Min, MinLength } from "class-validator";
import { Type } from "class-transformer";

export class ResetPasswordDto {

    @IsString()
    @IsNotEmpty()
    @Length(6, 50)
    newPassword: string = '';

    @Type(() => Number)
    @IsNotEmpty()
    @IsNumber()
    @Min(1)
    userId: number = 0;

    @IsString()
    @IsNotEmpty()
    @MinLength(10)
    resetPasswordToken: string = '';

}
