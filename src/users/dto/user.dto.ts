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
