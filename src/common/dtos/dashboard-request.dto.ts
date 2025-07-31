import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

export class DashboardRequestDto {
  @ApiProperty({ required: false, default: new Date(0) })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  fromDate: Date = new Date(0);

  @ApiProperty({ required: false, default: new Date() })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  toDate: Date = new Date();
}
