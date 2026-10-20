import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import { RegisterDto } from "./dto/register.dto.js";
import { Repository } from "typeorm";
import { User } from "./user.entity.js";
import { InjectRepository } from "@nestjs/typeorm";
import { LoginDto } from "./dto/login.dto.js";
import { JWTPayloadType } from "../utils/types.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { MembershipType, UserType } from "../utils/enum.js";
import { AuthProvider } from "./auth.provider.js";
import { join } from "node:path";
import { existsSync, unlinkSync } from "node:fs";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";

@Injectable()
export class usersService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly authProvider: AuthProvider
    ) {}

    /**
     * Creates a new user in the database after validating the email and hashing the password.
     * @param registerDto data for creating a new user
     * @returns success message
     */
    public async register(registerDto: RegisterDto) {
        return this.authProvider.register(registerDto);
    }

    /**
     * Login a user by email and password.
     * @param loginDto data for logging in
     * @returns JWT access token
     */
    public async login(loginDto: LoginDto) {
        return this.authProvider.login(loginDto);
    }

    /**
     * Get current (logged in) user by id.
     * @param id id of the user to be retrieved
     * @returns the user from the database
     */
    public async getCurrentUser(id: number): Promise<User> {
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        return user;
    }

    /**
     * Get all users from the database.
     * @returns collection of users
     */
    public getAllUsers(): Promise<User[]> {
        return this.userRepository.find();
    }

    /**
     * Update user by id.
     * @param id id of the logged in user to be updated
     * @param updateUserDto data for updating the user
     * @returns the updated user
     */
    public async updateUser(id: number, updateUserDto: UpdateUserDto) {
        const { password, username } = updateUserDto;
        const user = await this.userRepository.findOne({ where: { id } });
        if (!user) throw new NotFoundException('User not found');
        user.username = username ?? user.username;
        if (password) {
            user.password = await this.authProvider.HashPassword(password);
        }
        return this.userRepository.save(user);
    }

    public async updateMembership(userId: number, membership: MembershipType) {
        const user = await this.getCurrentUser(userId);
        if (user.userType !== UserType.STUDENT) {
            throw new BadRequestException('Memberships can only be assigned to students');
        }
        user.membership = membership;
        return this.userRepository.save(user);
    }

    public async addCredits(userId: number, credits: number) {
        const user = await this.getCurrentUser(userId);
        if (user.userType !== UserType.STUDENT) {
            throw new BadRequestException('Credits can only be assigned to students');
        }
        user.credits += credits;
        return this.userRepository.save(user);
    }

    /**
     * Delete a user by id.
     * @param userid id of the user to be deleted
     * @param payload JWT payload of the logged in user
     * @returns success message
     */
    public async deleteUser(userid: number, payload: JWTPayloadType) {
        const user = await this.getCurrentUser(userid);
        if (user.id === payload?.id || payload.userType === UserType.SUPERADMIN) {
            await this.userRepository.remove(user);
            return { message: 'User deleted successfully' };
        }
        throw new ForbiddenException('You are not authorized to delete this user');
    }

    /**
     * Assign a profile image to the user.
     * @param userId userId of the user to be updated
     * @param imagePath path of the image
     * @returns the updated user
     */
    public async setProfileImage(userId: number, imagePath: string) {
        const user = await this.getCurrentUser(userId);
        if (user.profileImage === null || user.profileImage === undefined) {
            user.profileImage = imagePath;
        } else {
            await this.removeProfileImage(userId);
            user.profileImage = imagePath;
        }
        return this.userRepository.save(user);
    }

    /**
     * Remove the profile image of the user.
     * @param userId userId of the user
     * @returns the updated user
     */
    public async removeProfileImage(userId: number) {
        const user = await this.getCurrentUser(userId);
        if (user.profileImage === null || user.profileImage === undefined)
            throw new BadRequestException('No profile image to remove');
        const imagePath = join(process.cwd(), `./uploads/profile-images/${user.profileImage}`);
        if (existsSync(imagePath)) unlinkSync(imagePath);
        user.profileImage = null;
        return this.userRepository.save(user);
    }

    /**
     * Verify user account using verification token.
     */
    public async verifyAccount(userId: number, verificationToken: string) {
        const user = await this.getCurrentUser(userId);
        if (user.verificationToken === null || user.verificationToken === undefined)
            throw new NotFoundException('There is no verification token for this user');
        if (user.verificationToken !== verificationToken)
            throw new BadRequestException('Invalid verification token');
        user.isAccountVerified = true;
        user.verificationToken = null;
        await this.userRepository.save(user);
        return { message: 'Account verified successfully' };
    }

    /**
     * Send a reset password email to the user.
     * @param email email of the user
     */
    public sendResetPassword(email: string) {
        return this.authProvider.sendResetPasswordEmail(email);
    }

    /**
     * Validate the reset password link.
     * @param userId user ID
     * @param resetPasswordToken reset password token
     */
    public getResetPasswordLink(userId: number, resetPasswordToken: string) {
        return this.authProvider.getResetPasswordLink(userId, resetPasswordToken);
    }

    /**
     * Reset the password of a user.
     * @param dto reset password DTO
     */
    public resetPassword(dto: ResetPasswordDto) {
        return this.authProvider.resetPassword(dto);
    }

    /**
     * Admin creates a new user with specific role (finance, instructor, student, moderator, parent)
     */
    public async adminCreateUser(dto: import("./dto/admin-create-user.dto.js").AdminCreateUserDto) {
        const existing = await this.userRepository.findOne({ where: { email: dto.email } });
        if (existing) throw new BadRequestException('User with this email already exists');
        const hashedPassword = await this.authProvider.HashPassword(dto.password);
        const newUser = this.userRepository.create({
            username: dto.username,
            email: dto.email,
            password: hashedPassword,
            userType: dto.userType,
            membership: dto.membership ?? MembershipType.DEFAULT,
            credits: dto.credits ?? 0,
            firstname: dto.firstname ?? '',
            lastname: dto.lastname ?? '',
            isAccountVerified: true,
        });
        return this.userRepository.save(newUser);
    }

    /**
     * Admin updates a user's role, membership, credits, etc.
     */
    public async adminUpdateUser(id: number, dto: import("./dto/admin-update-user.dto.js").AdminUpdateUserDto) {
        const user = await this.getCurrentUser(id);
        if (dto.username !== undefined) user.username = dto.username;
        if (dto.email !== undefined) {
            const existing = await this.userRepository.findOne({ where: { email: dto.email } });
            if (existing && existing.id !== id) {
                throw new BadRequestException('Email already in use by another account');
            }
            user.email = dto.email;
        }
        if (dto.userType !== undefined) user.userType = dto.userType;
        if (dto.membership !== undefined) user.membership = dto.membership;
        if (dto.credits !== undefined) user.credits = dto.credits;
        if (dto.isAccountVerified !== undefined) user.isAccountVerified = dto.isAccountVerified;
        if (dto.firstname !== undefined) user.firstname = dto.firstname;
        if (dto.lastname !== undefined) user.lastname = dto.lastname;
        if (dto.password) {
            user.password = await this.authProvider.HashPassword(dto.password);
        }
        return this.userRepository.save(user);
    }
}