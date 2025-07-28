/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_CURRENCY } from 'src/common/constants';
import { FlutterwaveService } from 'src/common/services/flutterwave.service';
import { HelperService } from 'src/common/services/helper.service';
import { UserRepository } from 'src/db/repositories/user.repository';
import { WalletRepository } from 'src/db/repositories/wallet.repository';
import { UnitOfWork } from 'src/db/uow/uow';

@Injectable()
export class WalletService {
  constructor(
    private readonly walletRepository: WalletRepository,
    private readonly paymentService: FlutterwaveService,
    private readonly userRepo: UserRepository,
    private readonly uow: UnitOfWork,
  ) {}

  async createWallet(userId: number) {
    return await this.walletRepository.insert({
      user_id: userId,
      balance: 0,
      is_active: true,
      currency: DEFAULT_CURRENCY,
    });
  }

  async findByUserId(userId: number) {
    return await this.walletRepository.findOne({ user_id: userId });
  }

  async fundWallet(userId: number, amount: number) {
    const wallet = await this.findByUserId(userId);
    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const user = await this.userRepo.findById(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const reference = HelperService.generateReference();
    try {
      const response = await this.paymentService.initiatePayment(
        {
          amount,
          fullName: user.email,
          email: user.email,
          callbackUrl: 'https://localhost:3000/wallet/callback',
        },
        reference,
      );

      return response;
    } catch (error) {
      console.error('Payment initiation failed:', error);
    }
  }
}
