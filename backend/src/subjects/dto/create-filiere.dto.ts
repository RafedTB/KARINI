import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

export class CreateFiliereDto {
    @ApiProperty({ example: 'Bac Informatique', description: 'Nom complet de la filière ou classe' })
    @IsNotEmpty()
    @IsString()
    @MaxLength(150)
    name!: string;

    @ApiProperty({ example: 'Baccalauréat', required: false, description: 'Cycle scolaire (ex: Baccalauréat, 2ème Année, Collège)' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    cycle?: string;

    @ApiProperty({ example: 'Filière orientée algorithmique, bases de données et technologies du web.', required: false })
    @IsOptional()
    @IsString()
    description?: string;
}

