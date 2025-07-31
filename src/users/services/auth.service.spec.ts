import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { TokenProvider } from '../../auth/token.provider';
import { UserRepository } from '../../db/repositories/user.repository';
import { UsersService } from './users.service';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { Queue } from 'bullmq';
import { HelperService } from '../../common/services/helper.service';
import { PasswordHasher } from '../../common/services/password-hasher.service';
import { RegisterDto, ResetPasswordDto } from '../dto/auth.dto';
import { RoleEnum, StatusEnum } from '../../common/enums';
import {
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { CACHE_KEYS } from '../../common/constants';
import { NotificationEnum } from 'src/mail/notification.enum';

describe('AuthService', () => {
  let service: AuthService;
  let tokenProvider: jest.Mocked<TokenProvider>;
  let userRepository: jest.Mocked<UserRepository>;
  let usersService: jest.Mocked<UsersService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: jest.Mocked<ConfigService>;
  let cache: jest.Mocked<Cache>;
  let mailQueue: jest.Mocked<Queue>;

  const mockTokenProvider = {
    signJwt: jest.fn(),
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    findByEmail: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  };

  const mockUsersService = {
    checkKarma: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockMailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: TokenProvider,
          useValue: mockTokenProvider,
        },
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: CACHE_MANAGER,
          useValue: mockCache,
        },
        {
          provide: 'BullQueue_mail',
          useValue: mockMailQueue,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    tokenProvider = module.get(TokenProvider);
    userRepository = module.get(UserRepository);
    usersService = module.get(UsersService);
    configService = module.get(ConfigService);
    cache = module.get(CACHE_MANAGER);
    mailQueue = module.get('BullQueue_mail');

    // Mock static HelperService methods
    jest
      .spyOn(HelperService, 'generateRandomCode')
      .mockImplementation(() => '654321');
    jest.spyOn(HelperService, 'errorHandler').mockImplementation((error) => {
      throw error;
    });

    // Mock static PasswordHasher methods
    jest
      .spyOn(PasswordHasher, 'hashPassword')
      .mockImplementation((password) => `${password}_hashed`);
    jest
      .spyOn(PasswordHasher, 'verifyPassword')
      .mockImplementation(
        (password, hash) => password === hash.replace('_hashed', ''),
      );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return access token for valid credentials', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password_hash: 'password123_hashed',
        is_email_verified: true,
        role: RoleEnum.CUSTOMER,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockTokenProvider.signJwt.mockReturnValue('jwt-token');

      const result = await service.login(loginDto);
      expect(result).toEqual({ accessToken: 'jwt-token' });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: loginDto.email,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(tokenProvider.signJwt).toHaveBeenCalledWith(
        loginDto.email,
        [mockUser.role],
        mockUser.id,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(PasswordHasher.verifyPassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password_hash,
      );
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: loginDto.email,
      });
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const loginDto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password_hash: 'password123_hashed',
        is_email_verified: false,
        role: RoleEnum.CUSTOMER,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Email not verified',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({
        email: loginDto.email,
      });
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = { email: 'test@example.com', password: 'wrongpassword' };
      const mockUser = {
        id: 1,
        email: loginDto.email,
        password_hash: 'password123_hashed',
        is_email_verified: true,
        role: RoleEnum.CUSTOMER,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(PasswordHasher, 'verifyPassword').mockReturnValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(loginDto)).rejects.toThrow(
        'Invalid credentials',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(PasswordHasher.verifyPassword).toHaveBeenCalledWith(
        loginDto.password,
        mockUser.password_hash,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should send reset OTP for existing user in non-production', async () => {
      const email = 'test@example.com';
      const mockUser = { id: 1, email };
      mockConfigService.get.mockReturnValue('development');
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(email);

      await service.forgotPassword(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.generateRandomCode).not.toHaveBeenCalled();

      expect(cache.set).toHaveBeenCalledWith(
        cacheKey,
        '123456',
        expect.any(Number),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).toHaveBeenCalledWith(
        NotificationEnum.ResetPasswordEmail,
        {
          emailAddress: email,
          name: email,
          resetOtp: '123456',
        },
      );
    });

    it('should send reset OTP for existing user in production', async () => {
      const email = 'test@example.com';
      const mockUser = { id: 1, email };
      mockConfigService.get.mockReturnValue('production');
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(email);

      await service.forgotPassword(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.generateRandomCode).toHaveBeenCalledWith(6);

      expect(cache.set).toHaveBeenCalledWith(
        cacheKey,
        '654321',
        expect.any(Number),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).toHaveBeenCalledWith(
        NotificationEnum.ResetPasswordEmail,
        {
          emailAddress: email,
          name: email,
          resetOtp: '654321',
        },
      );
    });

    it('should return silently for non-existent user', async () => {
      const email = 'nonexistent@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await service.forgotPassword(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);

      expect(cache.set).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('resendOtp', () => {
    it('should resend OTP for existing user in non-production', async () => {
      const email = 'test@example.com';
      const mockUser = { id: 1, email };
      mockConfigService.get.mockReturnValue('development');
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(email);

      await service.resendOtp(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.generateRandomCode).not.toHaveBeenCalled();

      expect(cache.set).toHaveBeenCalledWith(
        cacheKey,
        '123456',
        expect.any(Number),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).toHaveBeenCalledWith(
        NotificationEnum.VerificationEmail,
        {
          emailAddress: email,
          name: email,
          verificationOtp: '123456',
        },
      );
    });

    it('should resend OTP for existing user in production', async () => {
      const email = 'test@example.com';
      const mockUser = { id: 1, email };
      mockConfigService.get.mockReturnValue('production');
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(email);

      await service.resendOtp(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.generateRandomCode).toHaveBeenCalledWith(6);

      expect(cache.set).toHaveBeenCalledWith(
        cacheKey,
        '654321',
        expect.any(Number),
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).toHaveBeenCalledWith(
        NotificationEnum.VerificationEmail,
        {
          emailAddress: email,
          name: email,
          verificationOtp: '654321',
        },
      );
    });

    it('should return silently for non-existent user', async () => {
      const email = 'nonexistent@example.com';
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await service.resendOtp(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(email);

      expect(cache.set).not.toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mailQueue.add).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };
      const mockUser = {
        id: 1,
        email: resetPasswordDto.email,
        is_email_verified: false,
        status: StatusEnum.PENDING,
      };
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(resetPasswordDto.email);
      mockUserRepository.findByEmail.mockResolvedValue(mockUser);
      mockCache.get.mockResolvedValue(resetPasswordDto.otp);

      await service.resetPassword(resetPasswordDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        resetPasswordDto.email,
      );

      expect(cache.get).toHaveBeenCalledWith(cacheKey);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(PasswordHasher.hashPassword).toHaveBeenCalledWith(
        resetPasswordDto.newPassword,
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.update).toHaveBeenCalledWith(mockUser.id, {
        ...mockUser,
        password_hash: 'newpassword123_hashed',
        is_email_verified: true,
        email_verified_at: expect.any(Date) as Date,
        status: StatusEnum.ACTIVE,
      });

      expect(cache.del).toHaveBeenCalledWith(cacheKey);
    });

    it('should throw BadRequestException for mismatched passwords', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newpassword123',
        confirmPassword: 'differentpassword',
      };

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Passwords do not match',
      );
    });

    it('should throw BadRequestException for short password', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'short',
        confirmPassword: 'short',
      };

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Password must be at least 8 characters long',
      );
    });

    it('should throw BadRequestException for invalid OTP', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(resetPasswordDto.email);
      mockCache.get.mockResolvedValue('different-otp');

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'Invalid or expired OTP',
      );

      expect(cache.get).toHaveBeenCalledWith(cacheKey);
    });

    it('should throw BadRequestException for non-existent user', async () => {
      const resetPasswordDto: ResetPasswordDto = {
        email: 'test@example.com',
        otp: '123456',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123',
      };
      const cacheKey = CACHE_KEYS.RESET_PASSWORD_OTP(resetPasswordDto.email);
      mockCache.get.mockResolvedValue(resetPasswordDto.otp);
      mockUserRepository.findByEmail.mockResolvedValue(null);

      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.resetPassword(resetPasswordDto)).rejects.toThrow(
        'User not found',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        resetPasswordDto.email,
      );
    });
  });

  describe('registerUser', () => {
    describe('in production environment', () => {
      beforeEach(() => {
        mockConfigService.get.mockReturnValue('production');
      });

      it('should register user successfully when karma check passes', async () => {
        const registerDto: RegisterDto = {
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };
        mockUsersService.checkKarma.mockRejectedValue(
          new NotFoundException('Karma not found'),
        );
        mockUserRepository.findByEmail.mockResolvedValue(null);
        jest.spyOn(service, 'resendOtp').mockResolvedValue(undefined);

        await service.registerUser(registerDto);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(usersService.checkKarma).toHaveBeenCalledWith(registerDto.email);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
          registerDto.email,
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(userRepository.insert).toHaveBeenCalledWith({
          email: registerDto.email,
          password_hash: 'defaultPassword_hashed',
          status: StatusEnum.PENDING,
          role: RoleEnum.CUSTOMER,
          is_email_verified: false,
          email_verified_at: null,
          first_name: registerDto.firstName,
          last_name: registerDto.lastName,
        });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.resendOtp).toHaveBeenCalledWith(registerDto.email);
      });

      it('should throw BadRequestException if karma check fails', async () => {
        const registerDto: RegisterDto = {
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };
        const karmaResponse = {
          karmaIdentity: '123',
          amountInContention: '1000',
          reason: 'Fraud',
        };
        mockUsersService.checkKarma.mockResolvedValue(karmaResponse);

        await expect(service.registerUser(registerDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.registerUser(registerDto)).rejects.toThrow(
          'You are not eligible to register',
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(usersService.checkKarma).toHaveBeenCalledWith(registerDto.email);
      });

      it('should throw InternalServerErrorException on karma check error', async () => {
        const registerDto: RegisterDto = {
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };
        mockUsersService.checkKarma.mockRejectedValue(
          new Error('Karma service error'),
        );

        await expect(service.registerUser(registerDto)).rejects.toThrow(
          InternalServerErrorException,
        );
        await expect(service.registerUser(registerDto)).rejects.toThrow(
          'Karma check failed',
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(usersService.checkKarma).toHaveBeenCalledWith(registerDto.email);
      });

      it('should throw BadRequestException for existing user', async () => {
        const registerDto: RegisterDto = {
          email: 'existing@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };
        const mockUser = { id: 1, email: registerDto.email };
        mockUsersService.checkKarma.mockRejectedValue(
          new NotFoundException('Karma not found'),
        );
        mockUserRepository.findByEmail.mockResolvedValue(mockUser);

        await expect(service.registerUser(registerDto)).rejects.toThrow(
          BadRequestException,
        );
        await expect(service.registerUser(registerDto)).rejects.toThrow(
          'Email is already registered',
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
          registerDto.email,
        );
      });
    });

    describe('in non-production environment', () => {
      beforeEach(() => {
        mockConfigService.get.mockReturnValue('development');
      });

      it('should register user without karma check', async () => {
        const registerDto: RegisterDto = {
          email: 'newuser@example.com',
          firstName: 'John',
          lastName: 'Doe',
        };
        mockUserRepository.findByEmail.mockResolvedValue(null);
        jest.spyOn(service, 'resendOtp').mockResolvedValue(undefined);

        await service.registerUser(registerDto);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(usersService.checkKarma).not.toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(userRepository.findByEmail).toHaveBeenCalledWith(
          registerDto.email,
        );
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(userRepository.insert).toHaveBeenCalledWith({
          email: registerDto.email,
          password_hash: 'defaultPassword_hashed',
          status: StatusEnum.PENDING,
          role: RoleEnum.CUSTOMER,
          is_email_verified: false,
          email_verified_at: null,
          first_name: registerDto.firstName,
          last_name: registerDto.lastName,
        });
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(service.resendOtp).toHaveBeenCalledWith(registerDto.email);
      });
    });
  });
});
