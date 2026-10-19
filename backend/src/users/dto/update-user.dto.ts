import { IsString, IsNotEmpty, Length, IsOptional } from "class-validator";
export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    @Length(6, 50)
    password?: string;

    @IsString()
    @IsOptional()
    @Length(3, 50)
    username?: string;

}
