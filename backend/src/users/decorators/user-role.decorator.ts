import { SetMetadata } from "@nestjs/common";
import { UserType } from "../../utils/enum.js";

// roles method decorator
export const Roles = (...roles: UserType[]) => SetMetadata('roles', roles);
