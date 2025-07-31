/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import {
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  RegisterDto,
} from '../dto/auth.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    login: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    registerUser: jest.fn(),
    resendOtp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return login response successfully', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const mockResponse = {
        token: 'jwt-token',
        user: { id: 1, email: 'test@example.com' },
      };
      mockAuthService.login.mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);
      expect(result).toEqual(mockResponse);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(authService.login).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid login credentials', async () => {
      const loginDto: LoginDto = {
        email: 'invalid@example.com',
        password: 'wrong',
      };
      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset link successfully', async () => {
      const forgotPasswordDto: ForgotPasswordDto = {
        email: 'test@example.com',
      };
      const mockResponse = { message: 'Reset link sent' };
      mockAuthService.forgotPassword.mockResolvedValue(mockResponse);

      const result = await controller.forgotPassword(forgotPasswordDto);
      expect(result).toEqual(mockResponse);
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
      expect(mockAuthService.forgotPassword).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid email', async () => {
      const forgotPasswordDto: ForgotPasswordDto = { email: 'invalid' };
      mockAuthService.forgotPassword.mockRejectedValue(
        new Error('Invalid email'),
      );

      await expect(
        controller.forgotPassword(forgotPasswordDto),
      ).rejects.toThrow('Invalid email');
      expect(mockAuthService.forgotPassword).toHaveBeenCalledWith(
        forgotPasswordDto.email,
      );
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        otp: 'reset-token',
        email: 'test@example.com',
        confirmPassword: 'newpassword123',
        newPassword: 'newpassword123',
      };
      const mockResponse = { message: 'Password reset successful' };
      mockAuthService.resetPassword.mockResolvedValue(mockResponse);

      const result = await controller.resetPassword(resetPasswordDto);
      expect(result).toEqual(mockResponse);
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
      expect(authService.resetPassword).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid reset token', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        otp: 'invalid-token',
        confirmPassword: 'newpassword123',
        email: 'test@example.com',
        newPassword: 'newpassword123',
      };
      mockAuthService.resetPassword.mockRejectedValue(
        new Error('Invalid or expired token'),
      );

      await expect(controller.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired token',
      );
      expect(authService.resetPassword).toHaveBeenCalledWith(resetPasswordDto);
    });
  });

  describe('register', () => {
    it('should register user successfully', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
      };
      const mockResponse = {
        id: 1,
        email: 'newuser@example.com',
        username: 'newuser',
      };
      mockAuthService.registerUser.mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);
      expect(result).toEqual(mockResponse);
      expect(authService.registerUser).toHaveBeenCalledWith(registerDto);
      expect(authService.registerUser).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate email or username', async () => {
      const registerDto: RegisterDto = {
        email: 'existing@example.com',
        firstName: 'Existing',
        lastName: 'User',
      };
      mockAuthService.registerUser.mockRejectedValue(
        new Error('Email or username already exists'),
      );

      await expect(controller.register(registerDto)).rejects.toThrow(
        'Email or username already exists',
      );
      expect(authService.registerUser).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP successfully', async () => {
      const resendOtpDto: ForgotPasswordDto = { email: 'test@example.com' };
      const mockResponse = { message: 'OTP resent successfully' };
      mockAuthService.resendOtp.mockResolvedValue(mockResponse);

      const result = await controller.resendOtp(resendOtpDto);
      expect(result).toEqual(mockResponse);
      expect(authService.resendOtp).toHaveBeenCalledWith(resendOtpDto.email);
      expect(authService.resendOtp).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid email for OTP resend', async () => {
      const resendOtpDto: ForgotPasswordDto = { email: 'invalid' };
      mockAuthService.resendOtp.mockRejectedValue(new Error('Invalid email'));

      await expect(controller.resendOtp(resendOtpDto)).rejects.toThrow(
        'Invalid email',
      );
      expect(authService.resendOtp).toHaveBeenCalledWith(resendOtpDto.email);
    });
  });
});
