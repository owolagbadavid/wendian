import { Injectable } from '@nestjs/common';

import { DEFAULT_COUNTRY } from './common/constants';
import { PaymentService } from './common/services/payment.service';
import { BankRepository } from './db/repositories/bank.repository';

@Injectable()
export class AppService {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly bankRepo: BankRepository,
  ) {}
  getHello(): string {
    return 'Hello World!';
  }

  async getBanks() {
    const savedBanks = await this.bankRepo.findAll();
    if (savedBanks.length > 0) {
      return savedBanks.map((bank) => ({
        code: bank.bank_code,
        name: bank.bank_name,
      }));
    }

    const banks = await this.paymentService.getBanks(DEFAULT_COUNTRY);

    if (!banks || banks.length === 0) {
      throw new Error('No banks found');
    }

    await this.bankRepo.insertMany(
      banks.map((bank) => ({
        bank_code: bank.code,
        bank_name: bank.name,
      })),
    );

    return banks;
  }

  async verifyAccount(accountNumber: string, bankCode: string) {
    return await this.paymentService.verifyAccount({
      accountNumber,
      bankCode,
    });
  }
}
