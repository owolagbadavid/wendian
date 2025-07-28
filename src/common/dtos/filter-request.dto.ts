import { Operator } from '../enums/operator.enum';
import { FieldType } from '../enums/field-type.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class FilterRequestDto {
  @ApiProperty()
  @IsString()
  key: string;

  @ApiProperty({ required: true, enum: Operator })
  @IsEnum(Operator)
  operator: Operator;

  @ApiProperty({ required: true, enum: FieldType })
  @IsEnum(FieldType)
  fieldType: FieldType;

  @IsOptional()
  @ApiProperty({ required: false })
  value?: any;

  @IsOptional()
  @ApiProperty({ required: false })
  valueTo?: any;

  @IsOptional()
  @ApiProperty({ required: false })
  values?: any[];
}
