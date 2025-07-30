import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserContext } from 'src/common/decorators';
import {
  FundWalletDto,
  VerifyPaymentDto,
  WalletTransferDto,
  WalletWithdrawalDto,
} from './dtos/wallet.dto';
import { AuthGuard } from 'src/auth/guards';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('fund')
  async fundWallet(
    @UserContext('sub') userId: string,
    @Body() body: FundWalletDto,
  ) {
    return await this.walletService.fundWallet(
      parseInt(userId, 10),
      parseFloat(body.amount),
    );
  }

  @Patch('fund')
  async verifyPayment(
    @UserContext('sub') userId: string,
    @Body() body: VerifyPaymentDto,
  ) {
    return await this.walletService.verifyPayment(
      parseInt(userId, 10),
      body.reference,
    );
  }

  @Post('transfer')
  async transferFunds(
    @UserContext('sub') userId: string,
    @Body() body: WalletTransferDto,
  ) {
    return await this.walletService.handleWalletTransfer(
      parseInt(userId, 10),
      body.toUsername,
      parseFloat(body.amount),
      body.description,
    );
  }

  @Post('withdraw')
  async withdrawFunds(
    @UserContext('sub') userId: string,
    @Body() body: WalletWithdrawalDto,
  ) {
    return await this.walletService.walletWithdrawal(
      parseInt(userId, 10),
      parseFloat(body.amount),
      body.bankCode,
      body.accountNumber,
    );
  }
}
