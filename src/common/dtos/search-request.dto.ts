import { ApiPropertyOptional } from '@nestjs/swagger';
import { FilterRequestDto } from './filter-request.dto';
import { SortRequestDto } from './sort-request.dto';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested, IsInt } from 'class-validator';

export class SearchRequestDto {
  @ApiPropertyOptional({ type: [FilterRequestDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FilterRequestDto)
  filters?: FilterRequestDto[];

  @ApiPropertyOptional({ type: [SortRequestDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SortRequestDto)
  sorts?: SortRequestDto[];

  @ApiPropertyOptional({ type: Number, default: 1 })
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional({ type: Number, default: 10 })
  @IsOptional()
  @IsInt()
  size?: number = 10;
}
