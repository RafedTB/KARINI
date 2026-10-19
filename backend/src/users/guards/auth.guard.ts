import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import { CURRENT_USER_KEY } from "../../utils/constants.js";


@Injectable()
export class AuthGuard implements CanActivate {

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    canActivate(context: ExecutionContext) {
        const request: Request = context.switchToHttp().getRequest();
        const [type, token] = request.headers.authorization?.split(" ") ?? [];
        if (token && type === "Bearer") {
            try {
                const payload = this.jwtService.verify(token, {
                    secret: this.configService.get<string>('JWT_SECRET')
                });
                (request as any)[CURRENT_USER_KEY] = payload;
            } catch {
                throw new UnauthorizedException('Invalid token');
            }
        } else {
            throw new UnauthorizedException('Missing or invalid authorization header');
        }

        return true;
    }
}
