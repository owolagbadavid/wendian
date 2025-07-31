import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { UserRepository } from '../../db/repositories/user.repository';
import { WalletService } from '../../wallet/wallet.service';
import { KarmaService } from '../../common/services/karma.service';
import { ConfigService } from '@nestjs/config';
import { HelperService } from '../../common/services/helper.service';
import { SearchRequestDto } from '../../common/dtos';
import { User } from '../../db/entities';
import { plainToInstance } from 'class-transformer';
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: jest.Mocked<UserRepository>;
  let walletService: jest.Mocked<WalletService>;
  let karmaService: jest.Mocked<KarmaService>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let configService: jest.Mocked<ConfigService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    findPaged: jest.fn(),
    update: jest.fn(),
  };

  const mockWalletService = {
    findByUserId: jest.fn(),
    handleWalletCreation: jest.fn(),
  };

  const mockKarmaService = {
    checkKarma: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: KarmaService,
          useValue: mockKarmaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        // No need to provide HelperService as it's a static class
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(UserRepository);
    walletService = module.get(WalletService);
    karmaService = module.get(KarmaService);
    configService = module.get(ConfigService);

    // Mock static HelperService.errorHandler
    jest.spyOn(HelperService, 'errorHandler').mockImplementation((error) => {
      throw error;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should return paged users successfully', async () => {
      const searchDto: SearchRequestDto = { size: 2 };
      const mockResult = { items: [{ id: 1, username: 'testuser' }], total: 1 };
      mockUserRepository.findPaged.mockResolvedValue(mockResult);

      const result = await service.searchUsers(searchDto);
      expect(result).toEqual({
        ...mockResult,
        items: plainToInstance(User, mockResult.items),
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findPaged).toHaveBeenCalledWith(searchDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findPaged).toHaveBeenCalledTimes(1);
    });

    it('should handle search errors', async () => {
      const searchDto: SearchRequestDto = { size: -1 };
      const error = new Error('Invalid query');
      mockUserRepository.findPaged.mockRejectedValue(error);
      jest.spyOn(HelperService, 'errorHandler').mockImplementation(() => {
        throw error;
      });

      await expect(service.searchUsers(searchDto)).rejects.toThrow(
        'Invalid query',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findPaged).toHaveBeenCalledWith(searchDto);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.errorHandler).toHaveBeenCalledWith(
        error,
        'Failed to search users',
      );
    });
  });

  describe('getMe', () => {
    it('should return user details successfully', async () => {
      const userId = 1;
      const mockUser = { id: 1, username: 'testuser' };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getMe(userId);
      expect(result).toEqual(mockUser);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ id: userId });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 1;
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getMe(userId)).rejects.toThrow(NotFoundException);
      await expect(service.getMe(userId)).rejects.toThrow('User not found');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ id: userId });
    });
  });

  describe('createWallet', () => {
    describe('in production environment', () => {
      beforeEach(() => {
        mockConfigService.get.mockReturnValue('production');
      });

      it('should create wallet successfully when karma check passes', async () => {
        const userId = 1;
        const bvn = '12345678901';
        const phoneNumber = '1234567890';
        const mockWallet = { id: 1, userId };
        mockKarmaService.checkKarma.mockRejectedValue(
          new NotFoundException('Karma not found'),
        );
        mockWalletService.findByUserId.mockResolvedValue(null);
        mockWalletService.handleWalletCreation.mockResolvedValue(mockWallet);

        const result = await service.createWallet(userId, bvn, phoneNumber);
        expect(result).toEqual(mockWallet);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(karmaService.checkKarma).toHaveBeenCalledWith(bvn);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(walletService.findByUserId).toHaveBeenCalledWith(userId);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(walletService.handleWalletCreation).toHaveBeenCalledWith(
          userId,
          bvn,
          phoneNumber,
        );
      });

      it('should throw BadRequestException if karma check fails', async () => {
        const userId = 1;
        const bvn = '12345678901';
        const phoneNumber = '1234567890';
        const karmaResponse = {
          karmaIdentity: '123',
          amountInContention: '1000',
          reason: 'Fraud',
        };
        mockKarmaService.checkKarma.mockResolvedValue(karmaResponse);

        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow(BadRequestException);
        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow('You are not eligible to create a wallet');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(karmaService.checkKarma).toHaveBeenCalledWith(bvn);
      });

      it('should throw InternalServerErrorException on karma check error', async () => {
        const userId = 1;
        const bvn = '12345678901';
        const phoneNumber = '1234567890';
        mockKarmaService.checkKarma.mockRejectedValue(
          new Error('Karma service error'),
        );

        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow(InternalServerErrorException);
        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow('Karma check failed');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(karmaService.checkKarma).toHaveBeenCalledWith(bvn);
      });

      it('should throw ConflictException if wallet already exists', async () => {
        const userId = 1;
        const bvn = '12345678901';
        const phoneNumber = '1234567890';
        const mockWallet = { id: 1, userId };
        mockKarmaService.checkKarma.mockRejectedValue(
          new NotFoundException('Karma not found'),
        );
        mockWalletService.findByUserId.mockResolvedValue(mockWallet);

        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow(ConflictException);
        await expect(
          service.createWallet(userId, bvn, phoneNumber),
        ).rejects.toThrow('Wallet already exists for this user');
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(walletService.findByUserId).toHaveBeenCalledWith(userId);
      });
    });

    describe('in non-production environment', () => {
      beforeEach(() => {
        mockConfigService.get.mockReturnValue('development');
      });

      it('should create wallet without karma check', async () => {
        const userId = 1;
        const bvn = '12345678901';
        const phoneNumber = '1234567890';
        const mockWallet = { id: 1, userId };
        mockWalletService.findByUserId.mockResolvedValue(null);
        mockWalletService.handleWalletCreation.mockResolvedValue(mockWallet);

        const result = await service.createWallet(userId, bvn, phoneNumber);
        expect(result).toEqual(mockWallet);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(karmaService.checkKarma).not.toHaveBeenCalled();
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(walletService.findByUserId).toHaveBeenCalledWith(userId);
        // eslint-disable-next-line @typescript-eslint/unbound-method
        expect(walletService.handleWalletCreation).toHaveBeenCalledWith(
          userId,
          bvn,
          phoneNumber,
        );
      });
    });

    it('should handle wallet creation errors', async () => {
      const userId = 1;
      const bvn = '12345678901';
      const phoneNumber = '1234567890';
      const error = new Error('Wallet creation failed');
      mockConfigService.get.mockReturnValue('development');
      mockWalletService.findByUserId.mockResolvedValue(null);
      mockWalletService.handleWalletCreation.mockRejectedValue(error);
      jest.spyOn(HelperService, 'errorHandler').mockImplementation(() => {
        throw error;
      });

      await expect(
        service.createWallet(userId, bvn, phoneNumber),
      ).rejects.toThrow('Wallet creation failed');
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.errorHandler).toHaveBeenCalledWith(
        error,
        'Failed to create wallet',
      );
    });
  });

  describe('getUserWallet', () => {
    it('should return wallet details successfully', async () => {
      const userId = 1;
      const mockWallet = { id: 1, userId };
      mockWalletService.findByUserId.mockResolvedValue(mockWallet);

      const result = await service.getUserWallet(userId);
      expect(result).toEqual(mockWallet);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.findByUserId).toHaveBeenCalledWith(userId);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.findByUserId).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if wallet not found', async () => {
      const userId = 1;
      mockWalletService.findByUserId.mockResolvedValue(null);

      await expect(service.getUserWallet(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserWallet(userId)).rejects.toThrow(
        'Wallet not found',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(walletService.findByUserId).toHaveBeenCalledWith(userId);
    });

    it('should handle wallet retrieval errors', async () => {
      const userId = 1;
      const error = new Error('Wallet retrieval failed');
      mockWalletService.findByUserId.mockRejectedValue(error);
      jest.spyOn(HelperService, 'errorHandler').mockImplementation(() => {
        throw error;
      });

      await expect(service.getUserWallet(userId)).rejects.toThrow(
        'Wallet retrieval failed',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(HelperService.errorHandler).toHaveBeenCalledWith(
        error,
        'Failed to retrieve wallet',
      );
    });
  });

  describe('usernameExists', () => {
    it('should return true if username exists for another user', async () => {
      const username = 'testuser';
      const userId = 1;
      const mockUser = { id: 2, username };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.usernameExists(username, userId);
      expect(result).toBe(true);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ username });
    });

    it('should return false if username is used by the same user', async () => {
      const username = 'testuser';
      const userId = 1;
      const mockUser = { id: 1, username };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.usernameExists(username, userId);
      expect(result).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ username });
    });

    it('should return false if username does not exist', async () => {
      const username = 'nonexistent';
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.usernameExists(username);
      expect(result).toBe(false);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ username });
    });
  });

  describe('updateUsername', () => {
    it('should update username successfully', async () => {
      const userId = 1;
      const newUsername = 'newusername';
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.update.mockResolvedValue(undefined);

      await service.updateUsername(userId, newUsername);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({
        username: newUsername,
      });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.update).toHaveBeenCalledWith(userId, {
        username: newUsername,
      });
    });

    it('should throw ConflictException if username is taken', async () => {
      const userId = 1;
      const newUsername = 'taken';
      const mockUser = { id: 2, username: newUsername };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.updateUsername(userId, newUsername)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.updateUsername(userId, newUsername)).rejects.toThrow(
        'Username already taken',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({
        username: newUsername,
      });
    });
  });

  describe('getByUsername', () => {
    it('should return user by username successfully', async () => {
      const username = 'testuser';
      const mockUser = { id: 1, username };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getByUsername(username);
      expect(result).toEqual(mockUser);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ username });
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if user not found', async () => {
      const username = 'nonexistent';
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.getByUsername(username)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getByUsername(username)).rejects.toThrow(
        'User not found',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(userRepository.findOne).toHaveBeenCalledWith({ username });
    });
  });

  describe('checkKarma', () => {
    it('should return karma details successfully', async () => {
      const email = 'test@example.com';
      const mockKarma = {
        karmaIdentity: '123',
        amountInContention: '1000',
        reason: 'Fraud',
      };
      mockKarmaService.checkKarma.mockResolvedValue(mockKarma);

      const result = await service.checkKarma(email);
      expect(result).toEqual(mockKarma);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(karmaService.checkKarma).toHaveBeenCalledWith(email);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(karmaService.checkKarma).toHaveBeenCalledTimes(1);
    });

    it('should handle karma check errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Karma service error');
      mockKarmaService.checkKarma.mockRejectedValue(error);

      await expect(service.checkKarma(email)).rejects.toThrow(
        'Karma service error',
      );
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(karmaService.checkKarma).toHaveBeenCalledWith(email);
    });
  });
});
