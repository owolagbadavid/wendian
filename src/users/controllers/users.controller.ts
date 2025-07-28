import { Body, Controller, Post } from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { UsersService } from '../services/users.service';
import { ResponseMessage } from 'src/common/decorators';

@Controller('users')
export class UsersController {
  constructor(private usersSerive: UsersService) {}

  @ResponseMessage('Successss')
  @Post('search')
  searchUsers(@Body() req: SearchRequestDto) {
    return this.usersSerive.searchUsers(req);
  }
}
