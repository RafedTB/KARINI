import { BadRequestException, Injectable, Logger } from "@nestjs/common";
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
import { UserType } from "../utils/enum.js";
import { MailService } from "./mail.service.js";

@Injectable()
export class AuthProvider {
    private readonly logger = new Logger(AuthProvider.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly jwtService: JwtService,
        private readonly config: ConfigService,
        private readonly mailService: MailService
    ) {}

    /**
     * Creates a new user in the database after validating the email and hashing the password.
     * If the student is under 18, generates/links a parent account.
     * @param registerDto data for creating a new user
     * @returns success message
     */
    public async register(registerDto: RegisterDto) {
        const {
            email,
            password,
            username,
            firstname,
            lastname,
            studentClass,
            phoneNumber,
            gender,
            age,
            cin,
            parentEmail,
            parentPhone,
        } = registerDto;

        const cleanEmail = email.trim().toLowerCase();
        const UserFromDb = await this.userRepository.findOne({ where: { email: cleanEmail } });
        if (UserFromDb) throw new BadRequestException('User with this email already exists');

        let parentId: number | null = null;
        let parentAccountCreated = false;

        // If student is minor (< 18), validate parent info and auto-generate/link parent account
        if (age !== undefined && age !== null && age < 18) {
            if (!parentEmail || !parentEmail.trim()) {
                throw new BadRequestException('Parent email is required for students under 18 years old');
            }
            const cleanParentEmail = parentEmail.trim().toLowerCase();
            if (cleanParentEmail === cleanEmail) {
                throw new BadRequestException('Parent email cannot be the same as student email');
            }

            let parentUser = await this.userRepository.findOne({ where: { email: cleanParentEmail } });
            if (!parentUser) {
                // Generate a parent account
                const tempPassword = randomBytes(4).toString('hex') + 'P@1';
                const hashedParentPassword = await this.HashPassword(tempPassword);
                const generatedParentUsername = `parent_${cleanParentEmail.split('@')[0]}`.slice(0, 50);

                parentUser = this.userRepository.create({
                    email: cleanParentEmail,
                    username: generatedParentUsername,
                    password: hashedParentPassword,
                    userType: UserType.PARENT,
                    phoneNumber: parentPhone?.trim() || undefined,
                    isAccountVerified: false,
                    verificationToken: randomBytes(32).toString('hex'),
                });
                parentUser = await this.userRepository.save(parentUser);
                parentAccountCreated = true;

                await this.trySendEmail(
                    () => this.mailService.sendParentAccountEmail(
                        cleanParentEmail,
                        cleanEmail,
                        tempPassword,
                        `${(this.config.get<string>("FRONTEND_URL") || "http://localhost:3001").replace(/\/+$/, "")}/login`,
                    ),
                    "parent account credentials",
                );
            }
            parentId = parentUser.id;
        }

        // If student is 18 or older, validate CIN (Carte d'Identité Nationale)
        if (age !== undefined && age !== null && age >= 18) {
            if (!cin || !cin.trim()) {
                throw new BadRequestException('ID number (CIN) is required for students aged 18 and older');
            }
        }

        const hashedPassword = await this.HashPassword(password);
        const computedUsername =
            username?.trim() ||
            [firstname?.trim(), lastname?.trim()].filter(Boolean).join(' ') ||
            cleanEmail.split('@')[0];

        let newUser = this.userRepository.create({
            email: cleanEmail,
            password: hashedPassword,
            username: computedUsername,
            firstname: firstname?.trim() || undefined,
            lastname: lastname?.trim() || undefined,
            phoneNumber: phoneNumber?.trim() || undefined,
            gender: gender?.trim() || undefined,
            studentClass: studentClass?.trim() || undefined,
            age: age !== undefined ? age : undefined,
            cin: age >= 18 ? cin?.trim() : undefined,
            parentEmail: age < 18 ? parentEmail?.trim().toLowerCase() : undefined,
            parentPhone: age < 18 ? parentPhone?.trim() : undefined,
            parentId: age < 18 && parentId ? parentId : undefined,
            userType: UserType.STUDENT,
            verificationToken: randomBytes(32).toString('hex'),
        });
        newUser = await this.userRepository.save(newUser);

        const verificationEmailSent = await this.trySendEmail(
            () => this.mailService.sendVerificationEmail(
                cleanEmail,
                this.generateLink(newUser.id, newUser.verificationToken!),
            ),
            "verification",
        );

        if (parentAccountCreated) {
            return {
                message: verificationEmailSent
                    ? `Registration successful! Your student account has been created. A parent account has also been generated for ${parentEmail}. Please check your email to verify your account.`
                    : `Registration successful, but the verification email could not be sent. Please configure SMTP or contact support to resend it.`,
                emailSent: verificationEmailSent,
            };
        }

        return {
            message: verificationEmailSent
                ? "Registration successful. Please verify your email address."
                : "Registration successful, but the verification email could not be sent. Please configure SMTP or request a new verification email.",
            emailSent: verificationEmailSent,
        };
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
            const emailSent = await this.trySendEmail(
                () => this.mailService.sendVerificationEmail(
                    email,
                    this.generateLink(user.id, verificationToken),
                ),
                "verification",
            );
            return {
                message: emailSent
                    ? "Account not verified. Please check your email for a verification link."
                    : "Account not verified, and the verification email could not be sent. Please configure SMTP or contact support.",
                emailSent,
            };
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
        const frontendUrl = (this.config.get<string>("FRONTEND_URL") || "http://localhost:3001").replace(/\/+$/, "");
        const resetLink = `${frontendUrl}/reset-password?userId=${user.id}&token=${user.resetPasswordToken}`;
        const emailSent = await this.trySendEmail(
            () => this.mailService.sendPasswordResetEmail(user.email, resetLink),
            "password reset",
        );
        return {
            message: emailSent
                ? "Reset password email sent to your email address."
                : "The reset link was created, but the email could not be sent. Please configure SMTP or contact support.",
            emailSent,
        };
    }

    private async trySendEmail(send: () => Promise<unknown>, emailType: string): Promise<boolean> {
        try {
            await send();
            return true;
        } catch (error) {
            this.logger.error(
                `Unable to send ${emailType} email. The account operation will still complete.`,
                error instanceof Error ? error.stack : String(error),
            );
            return false;
        }
    }

    /**
     * Validates a reset password link.
     */
    public async getResetPasswordLink(userId: number, resetPasswordToken: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new BadRequestException('Invalid user ID');
        if (!user.resetPasswordToken || user.resetPasswordToken !== resetPasswordToken)
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
        if (!user.resetPasswordToken || user.resetPasswordToken !== resetPasswordToken)
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
