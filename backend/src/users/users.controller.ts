import { Body, Controller, Get, HttpCode, Post, HttpStatus, UseGuards, Put, Delete, Param, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException, Res } from "@nestjs/common";
import { usersService } from "./users.service.js";
import { RegisterDto } from "./dto/register.dto.js";
import { LoginDto } from "./dto/login.dto.js";
import { AuthGuard } from "./guards/auth.guard.js";
import { AuthRolesGuard } from "./guards/auth-roles.guard.js";
import { currentUser } from "./decorators/current-user.decorator.js";
import type { JWTPayloadType } from "../utils/types.js";
import { Roles } from "./decorators/user-role.decorator.js";
import { UserType } from "../utils/enum.js";
import { UpdateUserDto } from "./dto/update-user.dto.js";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Express, Response } from "express";
import { ForgotPasswordDto } from "./dto/forgot-password.dto.js";
import { ResetPasswordDto } from "./dto/reset-password.dto.js";
import { ApiConsumes, ApiBearerAuth, ApiBody, ApiTags, ApiOperation } from "@nestjs/swagger";
import { ImageUploadDto } from "./dto/image-upload.dto.js";
import { UpdateMembershipDto } from "./dto/update-membership.dto.js";
import { UpdateCreditsDto } from "./dto/update-credits.dto.js";


@ApiTags('Users')
@Controller('api/users')
export class UsersController {
    constructor(private readonly usersService: usersService) {}

    // POST /api/users/auth/register
    @Post('auth/register')
    @ApiOperation({ summary: 'Register a new user account' })
    public register(@Body() registerDto: RegisterDto) {
        return this.usersService.register(registerDto);
    }

    // POST /api/users/auth/login
    @Post('auth/login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login with email and password' })
    public login(@Body() loginDto: LoginDto) {
        return this.usersService.login(loginDto);
    }

    // GET /api/users/current-user
    @Get('current-user')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get the currently authenticated user' })
    public getCurrentUser(@currentUser() payload: JWTPayloadType) {
        return this.usersService.getCurrentUser(payload.id);
    }

    // GET /api/users
    @Get()
    @Roles(UserType.SUPERADMIN)
    @UseGuards(AuthRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all users (Superadmin only)' })
    public getAllUsers() {
        return this.usersService.getAllUsers();
    }

    // PUT /api/users
    @Put()
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR, UserType.FINANCE, UserType.PARENT)
    @UseGuards(AuthRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update the current user profile' })
    public updateUser(@currentUser() payload: JWTPayloadType, @Body() updateUserDto: UpdateUserDto) {
        return this.usersService.updateUser(payload.id, updateUserDto);
    }

    // PUT /api/users/:id/membership
    @Put(':id/membership')
    @Roles(UserType.SUPERADMIN)
    @UseGuards(AuthRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Assign a membership to a student (Superadmin only)' })
    public updateMembership(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateMembershipDto) {
        return this.usersService.updateMembership(id, body.membership);
    }

    // PUT /api/users/:id/credits
    @Put(':id/credits')
    @Roles(UserType.SUPERADMIN, UserType.FINANCE)
    @UseGuards(AuthRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add credits to a student account (Finance or Superadmin)' })
    public addCredits(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCreditsDto) {
        return this.usersService.addCredits(id, body.credits);
    }

    // DELETE /api/users/:id
    @Delete(':id')
    @Roles(UserType.SUPERADMIN, UserType.STUDENT, UserType.INSTRUCTOR, UserType.MODERATOR, UserType.FINANCE, UserType.PARENT)
    @UseGuards(AuthRolesGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a user by ID (Superadmin or own account)' })
    public deleteUser(@Param('id', ParseIntPipe) id: number, @currentUser() payload: JWTPayloadType) {
        return this.usersService.deleteUser(id, payload);
    }

    // POST /api/users/upload-profile-image
    @Post('upload-profile-image')
    @UseGuards(AuthGuard)
    @UseInterceptors(FileInterceptor('user-image'))
    @ApiBearerAuth()
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: 'Upload a profile image for the current user' })
    @ApiBody({
        type: ImageUploadDto,
        description: 'Upload user profile image',
    })
    public uploadProfileImage(@UploadedFile() file: Express.Multer.File, @currentUser() payload: JWTPayloadType) {
        if (!file) throw new BadRequestException('No image uploaded or invalid file type.');
        return this.usersService.setProfileImage(payload.id, file.filename);
    }

    // DELETE /api/users/images/remove-profile-image
    @Delete('/images/remove-profile-image')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove the current user profile image' })
    public removeProfileImage(@currentUser() payload: JWTPayloadType) {
        return this.usersService.removeProfileImage(payload.id);
    }

    // GET /api/users/images/:image
    @Get('/images/:image')
    @UseGuards(AuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Serve a user profile image by filename' })
    public showProfileImage(@Param('image') image: string, @Res() res: Response) {
        return res.sendFile(image, { root: './uploads/profile-images' });
    }

    // GET /api/users/verify/:id/:verificationToken
    @Get('verify/:id/:verificationToken')
    @ApiOperation({ summary: 'Verify user account via email link' })
    public async verifyAccount(
        @Param('id', ParseIntPipe) id: number,
        @Param('verificationToken') verificationToken: string
    ) {
        return this.usersService.verifyAccount(id, verificationToken);
    }

    // POST /api/users/forgot-password
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send a password reset email to the user' })
    public forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.usersService.sendResetPassword(body.email);
    }

    // GET /api/users/reset-password/:Id/:resetPasswordToken
    @Get('reset-password/:Id/:resetPasswordToken')
    @ApiOperation({ summary: 'Validate a password reset link' })
    public getResetPassword(
        @Param('Id', ParseIntPipe) id: number,
        @Param('resetPasswordToken') resetPasswordToken: string
    ) {
        return this.usersService.getResetPasswordLink(id, resetPasswordToken);
    }

    // POST /api/users/reset-password
    @Post('reset-password')
    @ApiOperation({ summary: 'Reset the user password using the reset token' })
    public resetPassword(@Body() body: ResetPasswordDto) {
        return this.usersService.resetPassword(body);
    }
}