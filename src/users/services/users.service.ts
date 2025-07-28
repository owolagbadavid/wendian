import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { HelperService } from 'src/common/services/helper.service';
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
      return await this.userRepository.findPaged(req);
    } catch (error) {
      console.error(error);
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
}
