import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsInt, IsOptional, Min } from "class-validator";

export class SaveLessonProgressDto {
    @ApiProperty({ example: true, required: false })
    @IsBoolean()
    @IsOptional()
    completed?: boolean;

    @ApiProperty({ example: 420, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    watchedSeconds?: number;

    @ApiProperty({ example: 120, required: false })
    @IsInt()
    @Min(0)
    @IsOptional()
    lastPositionSeconds?: number;
}
