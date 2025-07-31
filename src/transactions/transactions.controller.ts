import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'node:crypto';
import { SearchRequestDto } from 'src/common/dtos';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly config: ConfigService,
  ) {}

  @Post('flw-webhook')
  async handleWebhook(
    @Headers('verif-hash') signature: string,
    @Body() body: any,
  ) {
    const secretHash = this.config.get<string>('FLW_WEBHOOK_SECRET');

    if (!signature || signature !== secretHash) {
      throw new UnauthorizedException('Invalid signature');
    }

    await this.transactionsService.webhookHandler(body);

    return;
  }

  private isValidFlutterwaveWebhook(
    rawBody: string,
    signature: string,
    secretHash: string,
  ) {
    const hash = createHmac('sha256', secretHash)
      .update(rawBody)
      .digest('base64');

    return hash === signature;
  }

  @Post('search')
  searchTransactions(@Body() req: SearchRequestDto) {
    return this.transactionsService.searchTransactions(req);
  }

  @Post('/transfers/search')
  searchTransfers(@Body() req: SearchRequestDto) {
    return this.transactionsService.searchTransfers(req);
  }

  @Post('/virtual-accounts/search')
  searchVirtualAccounts(@Body() req: SearchRequestDto) {
    return this.transactionsService.searchVirtualAccounts(req);
  }
}
