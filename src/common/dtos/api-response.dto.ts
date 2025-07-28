import { HttpStatus } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T> {
  constructor(
    isSuccessful: boolean,
    data?: T,
    message: string = '',
    code: HttpStatus = HttpStatus.OK,
  ) {
    this.isSuccessful = isSuccessful;
    this.data = data;
    this.message = message;
    this.code = code;
  }

  @ApiProperty()
  public isSuccessful: boolean;

  @ApiProperty()
  public data?: T;

  @ApiProperty()
  public message: string;

  @ApiProperty({
    enum: HttpStatus,
  })
  public code: HttpStatus = HttpStatus.OK;
}
