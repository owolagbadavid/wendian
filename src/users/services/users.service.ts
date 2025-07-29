import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { SearchRequestDto } from 'src/common/dtos';
import { HelperService } from 'src/common/services/helper.service';
import { User } from 'src/db/entities';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    private walletService: WalletService,
  ) {}

  async searchUsers(req: SearchRequestDto) {
    try {
      const result = await this.userRepository.findPaged(req);
      result.items = plainToInstance(User, result.items);
      return result;
    } catch (error) {
      console.error(error);
      HelperService.errorHandler(error, 'Failed to search users');
    }
  }

  async getMe(userId: number) {
    console.log('Fetching user with ID:', userId);
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async createWallet(userId: number) {
    try {
      const existingWallet = await this.walletService.findByUserId(userId);
      if (existingWallet) {
        throw new ConflictException('Wallet already exists for this user');
      }
      return await this.walletService.createWallet(userId);
    } catch (error) {
      HelperService.errorHandler(error, 'Failed to create wallet');
    }
  }

  async getUserWallet(userId: number) {
    try {
      const wallet = await this.walletService.findByUserId(userId);
      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }
      return wallet;
    } catch (error) {
      HelperService.errorHandler(error, 'Failed to retrieve wallet');
    }
  }

  async usernameExists(username: string, userId?: number): Promise<boolean> {
    const user = await this.userRepository.findOne({ username });
    return !!user && user.id !== userId;
  }

  async updateUsername(userId: number, newUsername: string): Promise<void> {
    const userExists = await this.usernameExists(newUsername, userId);
    if (userExists) {
      throw new ConflictException('Username already taken');
    }
    await this.userRepository.update(userId, { username: newUsername });
  }

  async getByUsername(username: string) {
    const user = await this.userRepository.findOne({ username });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
