import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { HelperService } from 'src/common/services/helper.service';

export class UsernameDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @HelperService.Normalize()
  username: string;
}

export class SeedAdminDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @HelperService.Normalize()
  email: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  lastName: string;
}
