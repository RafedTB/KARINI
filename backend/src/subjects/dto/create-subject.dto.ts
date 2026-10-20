import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateSubjectDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(150)
    name!: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    code!: string;

    @IsString()
    @IsOptional()
    @MaxLength(150)
    slug?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    filiere!: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    category?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    @MaxLength(50)
    icon?: string;

    @IsString()
    @IsOptional()
    @MaxLength(30)
    color?: string;

    @IsString()
    @IsOptional()
    topics?: string;
}
