import { Injectable } from '@nestjs/common';
import { FlutterwaveService } from './common/services/flutterwave.service';
import { DEFAULT_COUNTRY } from './common/constants';

@Injectable()
export class AppService {
  constructor(private readonly paymentService: FlutterwaveService) {}
  getHello(): string {
    return 'Hello World!';
  }

  getBanks() {
    return this.paymentService.getBanks(DEFAULT_COUNTRY);
  }

  async verifyAccount(accountNumber: string, bankCode: string) {
    return await this.paymentService.verifyAccount({
      accountNumber,
      bankCode,
    });
  }
}
