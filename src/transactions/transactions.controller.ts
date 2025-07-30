import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ConfigService } from '@nestjs/config';

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly config: ConfigService,
  ) {}

  @Post('flw-webhook')
  handleWebhook(@Headers('verif-hash') signature: string, @Body() body: any) {
    const secretHash = this.config.get<string>('FLW_SECRET_HASH');

    if (!signature || signature !== secretHash) {
      throw new UnauthorizedException('Invalid signature');
    }

    console.log('Received Flutterwave webhook:', body);

    // TODO: Handle the payload, but quickly — or push to queue
    return;
  }
}
