import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { UsersService } from '../services/users.service';
import { ResponseMessage, UserContext } from 'src/common/decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards';

@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @ResponseMessage('Successss')
  @Post('search')
  searchUsers(@Body() req: SearchRequestDto) {
    return this.usersService.searchUsers(req);
  }

  @ResponseMessage('User details fetched successfully')
  @Get('me')
  getMe(@UserContext('sub') userId: string) {
    return this.usersService.getMe(parseInt(userId, 10));
  }
}
