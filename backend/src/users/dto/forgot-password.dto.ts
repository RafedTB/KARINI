import { IsNotEmpty, IsEmail, MaxLength } from "class-validator";
export class ForgotPasswordDto {

    @IsEmail()
    @MaxLength(50)
    @IsNotEmpty()
    email: string = '';
}
