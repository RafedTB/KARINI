import { PartialType } from "@nestjs/swagger";
import { CreateFiliereDto } from "./create-filiere.dto.js";

export class UpdateFiliereDto extends PartialType(CreateFiliereDto) {}

