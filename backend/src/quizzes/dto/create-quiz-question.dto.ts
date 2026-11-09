import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class CreateQuizQuestionDto {
    @ApiProperty({ example: "Quelle est la dérivée de x² ?" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    prompt!: string;

    @ApiProperty({ example: ["x", "2x", "x²", "2"] })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(4)
    @IsString({ each: true })
    options!: string[];

    @ApiProperty({ example: 1, description: "Zero-based option index" })
    @IsInt()
    @Min(0)
    correctOption!: number;

    @ApiProperty({ example: 1 })
    @IsInt()
    @Min(1)
    points!: number;
}
