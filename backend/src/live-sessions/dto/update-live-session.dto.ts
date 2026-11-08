import { PartialType } from "@nestjs/swagger";
import { CreateLiveSessionDto } from "./create-live-session.dto.js";

export class UpdateLiveSessionDto extends PartialType(CreateLiveSessionDto) {}

