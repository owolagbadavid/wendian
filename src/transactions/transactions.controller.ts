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

    console.log('Received Flutterwave webhook:', body);

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
}
