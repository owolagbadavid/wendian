import { ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsNumberString, IsString, Length } from 'class-validator';

import { IsValidDecimal } from 'src/common/validators/validate-decimal';

export class FundWalletDto {
  @ApiProperty({ type: String, example: '349.34' })
  @IsNotEmpty()
  @IsNumberString()
  @IsValidDecimal()
  amount: string;
}

export class VerifyPaymentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  reference: string;
}

export class WalletWithdrawalDto {
  @ApiProperty({ type: String, example: '349.34' })
  @IsNotEmpty()
  @IsNumberString()
  @IsValidDecimal()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}

export class WalletTransferDto {
  @ApiProperty({ type: String, example: '349.34' })
  @IsNotEmpty()
  @IsNumberString()
  @IsValidDecimal()
  amount: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  toUsername: string;

  @ApiProperty({ required: false })
  @IsString()
  description?: string;
}

export class CreateWalletDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Length(11, 11)
  bvn: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
