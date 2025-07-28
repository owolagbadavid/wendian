import { IsEnum, IsString } from 'class-validator';
import { SortDirection } from '../enums/sort-direction.enum';
import { ApiProperty } from '@nestjs/swagger';

export class SortRequestDto {
  @IsString()
  @ApiProperty()
  key: string;

  @IsEnum(SortDirection)
  @ApiProperty({ enum: SortDirection })
  direction: SortDirection = SortDirection.DESC;
}
