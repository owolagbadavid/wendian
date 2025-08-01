import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class VerifyAccountDto {
  @ApiProperty({ example: '0690000040' })
  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @ApiProperty({ example: '044' })
  @IsString()
  @IsNotEmpty()
  bankCode: string;
}
