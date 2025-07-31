import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { SearchRequestDto } from 'src/common/dtos';
import { HelperService } from 'src/common/services/helper.service';
import { KarmaService } from 'src/common/services/karma.service';
import { User } from 'src/db/entities';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletService } from 'src/wallet/wallet.service';

@Injectable()
export class UsersService {
  constructor(
    private userRepository: UserRepository,
    private walletService: WalletService,
    private karmaService: KarmaService,
    private readonly config: ConfigService,
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

  async createWallet(userId: number, bvn: string, phoneNumber: string) {
    try {
      if (this.config.get('NODE_ENV') === 'production') {
        // only check karma in production
        try {
          const karmaResponse = await this.checkKarma(bvn);

          if (karmaResponse) {
            throw new BadRequestException(
              'You are not eligible to create a wallet',
            );
          }
        } catch (error) {
          if (error instanceof NotFoundException) {
            // User not found, proceed with registration
          } else if (error instanceof HttpException) {
            throw error;
          } else {
            throw new InternalServerErrorException('Karma check failed');
          }
        }
      }

      const existingWallet = await this.walletService.findByUserId(userId);
      if (existingWallet) {
        throw new ConflictException('Wallet already exists for this user');
      }
      return await this.walletService.handleWalletCreation(
        userId,
        bvn,
        phoneNumber,
      );
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

  async checkKarma(email: string): Promise<{
    karmaIdentity: string;
    amountInContention: string;
    reason: string;
  }> {
    return await this.karmaService.checkKarma(email);
  }
}
