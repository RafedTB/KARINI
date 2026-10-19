import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { CURRENT_USER_KEY } from "../../utils/constants.js";
import { JWTPayloadType } from "../../utils/types.js";

export const currentUser = createParamDecorator(
    (data, context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        const payload: JWTPayloadType = (request as any)[CURRENT_USER_KEY];
        return payload;
    }
);
