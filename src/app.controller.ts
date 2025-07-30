import { Body, Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { VerifyAccountDto } from './common/dtos/verify-account.dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('banks')
  getBanks() {
    return this.appService.getBanks();
  }

  @Post('account-verification')
  async verifyAccount(@Body() verifyAccountDto: VerifyAccountDto) {
    return await this.appService.verifyAccount(
      verifyAccountDto.accountNumber,
      verifyAccountDto.bankCode,
    );
  }
}
