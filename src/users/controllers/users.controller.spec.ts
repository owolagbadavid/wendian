import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from '../services/users.service';
import { SearchRequestDto } from '../../common/dtos';
import { UsernameDto } from '../dto/user.dto';
import { CreateWalletDto } from '../../wallet/dtos/wallet.dto';
import { User } from '../../db/entities';
import { plainToInstance } from 'class-transformer';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '../../auth/guards';

describe('UsersController', () => {
  let controller: UsersController;
  // let usersService: jest.Mocked<UsersService>;

  const mockUsersService = {
    searchUsers: jest.fn(),
    getMe: jest.fn(),
    createWallet: jest.fn(),
    getUserWallet: jest.fn(),
    usernameExists: jest.fn(),
    updateUsername: jest.fn(),
    getByUsername: jest.fn(),
    checkKarma: jest.fn(),
  };

  const mockTokenProvider = {
    validateToken: jest.fn().mockReturnValue(true),
  };

  const mockAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: 'TokenProvider',
          useValue: mockTokenProvider,
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue([]),
          },
        },
        {
          provide: AuthGuard,
          useValue: mockAuthGuard,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<UsersController>(UsersController);
    // usersService = module.get(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('searchUsers', () => {
    it('should return search results successfully', async () => {
      const searchDto: SearchRequestDto = { size: 1 };
      const mockResult = [{ id: 1, username: 'testuser' }];
      mockUsersService.searchUsers.mockResolvedValue(mockResult);

      const result = await controller.searchUsers(searchDto);
      expect(result).toEqual(mockResult);
      expect(mockUsersService.searchUsers).toHaveBeenCalledWith(searchDto);
    });

    it('should handle invalid search parameters', async () => {
      const searchDto: SearchRequestDto = { size: -2 };
      mockUsersService.searchUsers.mockRejectedValue(
        new Error('Invalid query'),
      );

      await expect(controller.searchUsers(searchDto)).rejects.toThrow(
        'Invalid query',
      );
      expect(mockUsersService.searchUsers).toHaveBeenCalledWith(searchDto);
    });
  });

  describe('getMe', () => {
    it('should return user details successfully', async () => {
      const userId = '1';
      const mockUser = { id: 1, username: 'testuser' };
      mockUsersService.getMe.mockResolvedValue(mockUser);

      const result = await controller.getMe(userId);
      expect(result).toEqual(mockUser);
      expect(mockUsersService.getMe).toHaveBeenCalledWith(1);
    });

    it('should handle invalid user ID', async () => {
      const userId = 'invalid';
      mockUsersService.getMe.mockRejectedValue(new Error('Invalid user ID'));

      await expect(controller.getMe(userId)).rejects.toThrow('Invalid user ID');
      expect(mockUsersService.getMe).toHaveBeenCalledWith(NaN);
    });
  });

  describe('createWallet', () => {
    it('should create wallet successfully', async () => {
      const userId = '1';
      const createWalletDto: CreateWalletDto = {
        bvn: '12345678901',
        phoneNumber: '1234567890',
      };
      const mockWallet = { id: 1, userId: 1 };
      mockUsersService.createWallet.mockResolvedValue(mockWallet);

      const result = await controller.createWallet(userId, createWalletDto);
      expect(result).toEqual(mockWallet);
      expect(mockUsersService.createWallet).toHaveBeenCalledWith(
        1,
        createWalletDto.bvn,
        createWalletDto.phoneNumber,
      );
    });

    it('should handle invalid BVN', async () => {
      const userId = '1';
      const createWalletDto: CreateWalletDto = {
        bvn: 'invalid',
        phoneNumber: '1234567890',
      };
      mockUsersService.createWallet.mockRejectedValue(new Error('Invalid BVN'));

      await expect(
        controller.createWallet(userId, createWalletDto),
      ).rejects.toThrow('Invalid BVN');
    });
  });

  describe('getUserWallet', () => {
    it('should return wallet details successfully', async () => {
      const userId = '1';
      const mockWallet = { id: 1, userId: 1 };
      mockUsersService.getUserWallet.mockResolvedValue(mockWallet);

      const result = await controller.getUserWallet(userId);
      expect(result).toEqual(mockWallet);
      expect(mockUsersService.getUserWallet).toHaveBeenCalledWith(1);
    });

    it('should handle user with no wallet', async () => {
      const userId = '1';
      mockUsersService.getUserWallet.mockRejectedValue(
        new Error('Wallet not found'),
      );

      await expect(controller.getUserWallet(userId)).rejects.toThrow(
        'Wallet not found',
      );
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      const username = 'testuser';
      mockUsersService.usernameExists.mockResolvedValue(true);

      const result = await controller.usernameExists(username);
      expect(result).toBe(true);
      expect(mockUsersService.usernameExists).toHaveBeenCalledWith(
        username,
        undefined,
      );
    });

    it('should return false for non-existing username', async () => {
      const username = 'nonexistent';
      mockUsersService.usernameExists.mockResolvedValue(false);

      const result = await controller.usernameExists(username);
      expect(result).toBe(false);
      expect(mockUsersService.usernameExists).toHaveBeenCalledWith(
        username,
        undefined,
      );
    });
  });

  describe('updateUsername', () => {
    it('should update username successfully', async () => {
      const userId = '1';
      const usernameDto: UsernameDto = { username: 'newusername' };
      const mockUser = { id: 1, username: 'newusername' };
      mockUsersService.updateUsername.mockResolvedValue(mockUser);

      const result = await controller.updateUsername(userId, usernameDto);
      expect(result).toEqual(mockUser);
      expect(mockUsersService.updateUsername).toHaveBeenCalledWith(
        1,
        usernameDto.username,
      );
    });

    it('should handle invalid username', async () => {
      const userId = '1';
      const usernameDto: UsernameDto = { username: '' };
      mockUsersService.updateUsername.mockRejectedValue(
        new Error('Invalid username'),
      );

      await expect(
        controller.updateUsername(userId, usernameDto),
      ).rejects.toThrow('Invalid username');
    });
  });

  describe('getByUsername', () => {
    it('should return user by username successfully', async () => {
      const username = 'testuser';
      const mockUser = { id: 1, username: 'testuser' };
      mockUsersService.getByUsername.mockResolvedValue(mockUser);

      const result = await controller.getByUsername(username);
      expect(result).toEqual(plainToInstance(User, mockUser));
      expect(mockUsersService.getByUsername).toHaveBeenCalledWith(username);
    });

    it('should handle non-existing username', async () => {
      const username = 'nonexistent';
      mockUsersService.getByUsername.mockRejectedValue(
        new Error('User not found'),
      );

      await expect(controller.getByUsername(username)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('checkKarma', () => {
    it('should return karma details successfully', async () => {
      const email = 'test@example.com';
      const mockKarma = { score: 100 };
      mockUsersService.checkKarma.mockResolvedValue(mockKarma);

      const result = await controller.checkKarma(email);
      expect(result).toEqual(mockKarma);
      expect(mockUsersService.checkKarma).toHaveBeenCalledWith(email);
    });

    it('should handle invalid email', async () => {
      const email = 'invalid';
      mockUsersService.checkKarma.mockRejectedValue(new Error('Invalid email'));

      await expect(controller.checkKarma(email)).rejects.toThrow(
        'Invalid email',
      );
    });
  });
});
