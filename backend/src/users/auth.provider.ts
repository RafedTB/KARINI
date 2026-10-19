import { BadRequestException, Injectable } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto.js";
import { Repository } from "typeorm";
import { User } from "./user.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import * as bcrypt from 'bcryptjs';
import { LoginDto } from "./dto/login.dto.js";
import { JwtService } from "@nestjs/jwt";
import { JWTPayloadType } from "../utils/types.js";
import { randomBytes } from 'node:crypto';
import { ConfigService } from "@nestjs/config";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

@Injectable()
export class AuthProvider {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService
    ) {}

    /**
     * Creates a new user in the database after validating the email and hashing the password.
     * @param registerDto data for creating a new user
     * @returns success message
     */
    public async register(registerDto: RegisterDto) {
        const { email, password, username } = registerDto;
        const UserFromDb = await this.userRepository.findOne({ where: { email } });
        if (UserFromDb) throw new BadRequestException('User with this email already exists');
        const hashedPassword = await this.HashPassword(password);
        let newUser = this.userRepository.create({
            email,
            password: hashedPassword,
            username,
            verificationToken: randomBytes(32).toString('hex'),
        });
        newUser = await this.userRepository.save(newUser);

        // TODO: integrate mail service when MailModule is available
        // const link = this.generateLink(newUser.id, newUser.verificationToken!);
        // await this.mailService.sendVerificationMail(email, link);

        return { message: "Registration successful. Please verify your email address." };
    }

    /**
     * Login a user by email and password.
     * @param loginDto data for logging in
     * @returns JWT access token
     */
    public async login(loginDto: LoginDto) {
        const { email, password } = loginDto;
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new BadRequestException('Invalid email or password');
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) throw new BadRequestException('Invalid email or password');
        if (!user.isAccountVerified) {
            let verificationToken = user.verificationToken;
            if (!verificationToken) {
                user.verificationToken = randomBytes(32).toString('hex');
                await this.userRepository.save(user);
                verificationToken = user.verificationToken;
            }
            // TODO: integrate mail service when MailModule is available
            // const link = this.generateLink(user.id, verificationToken);
            // await this.mailService.sendVerificationMail(email, link);
            return { message: "Account not verified. Please check your email for a verification link." };
        }
        const accessToken = await this.GenerateJWT({ id: user.id, userType: user.userType });
        return { accessToken };
    }

    /**
     * Sends a reset password email to the user.
     */
    public async sendResetPasswordEmail(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user) throw new BadRequestException('User with this email does not exist');
        user.resetPasswordToken = randomBytes(32).toString('hex');
        await this.userRepository.save(user);
        // TODO: integrate mail service when MailModule is available
        // await this.mailService.sendResetPassword(user.email, resetPasswordLink);
        return { message: "Reset password email sent to your email address." };
    }

    /**
     * Validates a reset password link.
     */
    public async getResetPasswordLink(userId: number, resetPasswordToken: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new BadRequestException('Invalid user ID');
        if (user.resetPasswordToken === null || user.resetPasswordToken !== resetPasswordToken)
            throw new BadRequestException('Invalid reset password token');
        return { message: "Valid reset password link." };
    }

    /**
     * Resets the password for a user.
     */
    public async resetPassword(dto: ResetPasswordDto) {
        const { newPassword, userId, resetPasswordToken } = dto;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new BadRequestException('Invalid user ID');
        if (user.resetPasswordToken === null || user.resetPasswordToken !== resetPasswordToken)
            throw new BadRequestException('Invalid reset password token');
        user.password = await this.HashPassword(newPassword);
        user.resetPasswordToken = null;
        await this.userRepository.save(user);
        return { message: "Password reset successful." };
    }

    /**
     * Hashes a password using bcrypt.
     */
    public async HashPassword(password: string): Promise<string> {
        const salt = await bcrypt.genSalt(10);
        return bcrypt.hash(password, salt);
    }

    /**
     * Generates a JWT token.
     */
    private GenerateJWT(payload: JWTPayloadType): Promise<string> {
        return this.jwtService.signAsync(payload);
    }

    /**
     * Generates a verification link for a user.
     */
    private generateLink(id: number, verificationToken: string): string {
        return `${this.config.get<string>('DOMAIN')}/api/users/verify/${id}/${verificationToken}`;
    }
}
