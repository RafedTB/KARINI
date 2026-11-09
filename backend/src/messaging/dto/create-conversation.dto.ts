import { ApiProperty } from "@nestjs/swagger";
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class CreateConversationDto {
    @ApiProperty({ example: 42 })
    @IsInt()
    @Min(1)
    studentId!: number;

    @ApiProperty({ example: 7 })
    @IsInt()
    @Min(1)
    teacherId!: number;

    @ApiProperty({ example: 'Mathématiques' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    subject!: string;
}
