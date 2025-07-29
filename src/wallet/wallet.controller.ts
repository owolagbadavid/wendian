import { Body, Controller, Patch, Post, UseGuards } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserContext } from 'src/common/decorators';
import { FundWalletDto, VerifyPaymentDto } from './dtos/wallet.dto';
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
      body.amount,
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
}
