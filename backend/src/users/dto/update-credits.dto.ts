import { IsInt, Min } from "class-validator";

export class UpdateCreditsDto {
    @IsInt()
    @Min(1)
    credits!: number;
}