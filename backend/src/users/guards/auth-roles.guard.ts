import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { CURRENT_USER_KEY } from "../../utils/constants.js";
import { Reflector } from "@nestjs/core";
import { UserType } from "../../utils/enum.js";
import { usersService } from "../users.service.js";


@Injectable()
export class AuthRolesGuard implements CanActivate {

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly reflector: Reflector,
        private readonly userService: usersService
    ) {}

    async canActivate(context: ExecutionContext) {
        const roles: UserType[] = this.reflector.getAllAndOverride('roles', [context.getHandler(), context.getClass()]);
        if (!roles || roles.length === 0) return true;

        const request: Request = context.switchToHttp().getRequest();
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        if (token && type === "Bearer") {
            try {
                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get<string>('JWT_SECRET')
                });
                const user = await this.userService.getCurrentUser(payload.id);
                if (!user) return false;

                if (roles.includes(user.userType)) {
                    (request as any)[CURRENT_USER_KEY] = payload;
                    return true;
                }
            } catch {
                throw new UnauthorizedException('Invalid token');
            }
        } else {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        return false;
    }
}
