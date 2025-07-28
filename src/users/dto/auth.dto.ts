import { ApiProperty, PickType } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  IsNotEmpty,
  IsEnum,
} from 'class-validator';
import { RoleEnum } from 'src/common/enums';
import { HelperService } from 'src/common/services/helper.service';

export class LoginDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @HelperService.Normalize()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @HelperService.Normalize()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @HelperService.Normalize()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  newPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  @HelperService.Normalize()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @HelperService.Trim()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @HelperService.Trim()
  lastName: string;

  // @ApiProperty()
  // @IsString()
  // @IsNotEmpty()
  // password: string;

  // @ApiProperty()
  // @IsString()
  // @IsNotEmpty()
  // confirmPassword: string;

  @ApiProperty()
  @ApiProperty({ enum: [RoleEnum.ADMIN, RoleEnum.CUSTOMER] })
  @IsNotEmpty()
  @IsEnum([RoleEnum.ADMIN, RoleEnum.CUSTOMER])
  role: RoleEnum.ADMIN | RoleEnum.CUSTOMER;
}

export class VerifyEmailDto extends PickType(ResetPasswordDto, [
  'email',
  'otp',
]) {}
