import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RegisterDto,
} from '../dto/auth.dto';
import { ApiTags } from '@nestjs/swagger';

import { AuthService } from '../services/auth.service';
import { ResponseMessage } from 'src/common/decorators';

@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return await this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset link sent to your email')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return await this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Password reset successfully')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(resetPasswordDto);
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('User registered successfully')
  async register(@Body() registerDto: RegisterDto) {
    return await this.authService.registerUser(registerDto);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('OTP resent successfully')
  async resendOtp(@Body() resendOtpDto: ForgotPasswordDto) {
    return await this.authService.resendOtp(resendOtpDto.email);
  }
}
