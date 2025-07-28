import { ApiProperty } from '@nestjs/swagger';

export class PagedResult<T> {
  @ApiProperty()
  items: T[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  size: number;

  @ApiProperty()
  totalPages: number;
}
