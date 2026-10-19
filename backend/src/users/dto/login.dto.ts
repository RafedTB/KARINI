import { IsString, IsNotEmpty, Length, IsEmail, MaxLength } from "class-validator";
export class LoginDto {

    @IsEmail()
    @MaxLength(50)
    @IsNotEmpty()
    email: string = '';

    @IsString()
    @IsNotEmpty()
    @Length(6, 50)
    password: string = '';

}
