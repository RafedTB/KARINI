import { BadRequestException, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "./user.entity.js";
import { UsersController } from "./users.controller.js";
import { usersService } from "./users.service.js";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { AuthProvider } from "./auth.provider.js";
import { MulterModule } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { AuthGuard } from "./guards/auth.guard.js";
import { AuthRolesGuard } from "./guards/auth-roles.guard.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => {
                return {
                    global: true,
                    secret: config.get('JWT_SECRET'),
                    signOptions: {
                        expiresIn: config.get('JWT_EXPIRES_IN')
                    }
                };
            }
        }),
        MulterModule.register({
            storage: diskStorage({
                destination: './uploads/profile-images',
                filename: (req, file, cb) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const originalName = file.originalname.replace(/\s+/g, '-');
                    const filename = `${uniqueSuffix}-${originalName}`;
                    cb(null, filename);
                }
            }),
            fileFilter: (req, file, cb) => {
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new BadRequestException('Only image files are allowed!'), false);
                }
            },
            limits: {
                fileSize: 2 * 1024 * 1024, // 2MB limit
            },
        })
    ],
    controllers: [UsersController],
    providers: [usersService, AuthProvider, AuthGuard, AuthRolesGuard],
    exports: [usersService, AuthGuard, AuthRolesGuard, JwtModule]
})
export class UsersModule {}