/* eslint-disable @typescript-eslint/no-unused-vars */

import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { TokenProvider } from 'src/auth/token.provider';
import { RegisterDto, ResetPasswordDto, VerifyEmailDto } from '../dto/auth.dto';
import { UserRepository } from 'src/db/repositories/user.repository';
import { PasswordHasher } from 'src/common/services/password-hasher.service';
import { CACHE_KEYS } from 'src/common/constants';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { HelperService } from 'src/common/services/helper.service';
import { NotificationEnum } from 'src/mail/notification.enum';
import { RoleEnum, StatusEnum } from 'src/common/enums';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private tokenProvider: TokenProvider,
    private userRepository: UserRepository,
    private config: ConfigService,
    @Inject(CACHE_MANAGER) private cache: Cache,
    @InjectQueue('mail') private mailQueue: Queue,
  ) {}

  async login(loginDto: { email: string; password: string }) {
    try {
      const user = await this.userRepository.findByEmail(loginDto.email);
      console.log('User found:', user);

      if (!user) {
        throw new UnauthorizedException('Invalid credentials');
      }

      if (!user.is_email_verified) {
        throw new UnauthorizedException('Email not verified');
      }

      if (
        !PasswordHasher.verifyPassword(loginDto.password, user.password_hash)
      ) {
        throw new UnauthorizedException('Invalid credentials');
      }

      const accessToken = this.tokenProvider.signJwt(
        loginDto.email,
        [user.role],
        user.id,
      );

      return {
        accessToken,
      };
    } catch (error) {
      console.error('Error finding user:', error);
      throw error;
    }

    // const user = await this.userRepository.findOne({
    //   where: { email: loginDto.email },
    //   relations: {
    //     status: true,
    //     userRoles: {
    //       role: true,
    //     },
    //     twoFactorSetting: true,
    //   },
    // });
    // if (!user) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }
    // if (!user.isEmailVerified) {
    //   throw new UnauthorizedException('Email not verified');
    // }
    // // todo: check status
    // if (!PasswordHasher.verifyPassword(loginDto.password, user.passwordHash)) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }
    // const roles = user.userRoles.map((ur) => ur.role.code);
    // const accessToken = this.tokenProvider.signJwt(
    //   loginDto.email,
    //   roles,
    //   user.id,
    // );
    // return {
    //   accessToken,
    // };
  }

  async forgotPassword(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate reset OTP
    let resetOtp: string;
    if (this.config.get('NODE_ENV') !== 'production') {
      resetOtp = '123456';
    } else resetOtp = HelperService.generateRandomCode(6);

    const resetOtpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(user.email);

    await this.cache.set(cacheKey, resetOtp, resetOtpExpiry);

    await this.mailQueue.add(NotificationEnum.ResetPasswordEmail, {
      emailAddress: user.email,
      name: user.email, // Assuming name is same as email for simplicity
      resetOtp,
    });

    return;
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return;
    }

    // Generate verification OTP
    let verificationOtp: string;
    if (this.config.get('NODE_ENV') !== 'production') {
      verificationOtp = '123456';
    } else verificationOtp = HelperService.generateRandomCode(6);

    const verificationOtpExpiry = Date.now() + 15 * 60 * 1000; // 15 minutes

    const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(user.email);

    await this.cache.set(cacheKey, verificationOtp, verificationOtpExpiry);

    await this.mailQueue.add(NotificationEnum.VerificationEmail, {
      emailAddress: user.email,
      name: user.email, // Assuming name is same as email for simplicity
      verificationOtp,
    });

    return;
  }

  async resetPassword({
    email,
    otp,
    newPassword,
    confirmPassword,
  }: ResetPasswordDto) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (newPassword.length < 8) {
      throw new BadRequestException(
        'Password must be at least 8 characters long',
      );
    }

    const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(email);

    const storedOtp = await this.cache.get<string>(cacheKey);
    if (!storedOtp || storedOtp !== otp) {
      throw new BadRequestException('Invalid or expired OTP');
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.password_hash = PasswordHasher.hashPassword(newPassword);

    if (!user.is_email_verified) {
      user.is_email_verified = true;
      user.email_verified_at = new Date();
      user.status = StatusEnum.ACTIVE;
    }

    await this.userRepository.update(user.id, user);

    await this.cache.del(cacheKey);

    return;
  }

  async registerUser({ email, firstName, lastName }: RegisterDto) {
    try {
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new BadRequestException('Email is already registered');
      }

      await this.userRepository.insert({
        email,
        password_hash: PasswordHasher.hashPassword('defaultPassword'),
        status: StatusEnum.PENDING,
        role: RoleEnum.CUSTOMER,
        is_email_verified: true,
        email_verified_at: null,
      });

      // Send verification email
      await this.resendOtp(email);
    } catch (error) {
      console.error('Error during user registration:', error);
      throw error;
    }

    return;
  }
}
