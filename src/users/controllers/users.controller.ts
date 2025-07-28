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

  @ResponseMessage('Wallet created successfully')
  @Post('wallets')
  createWallet(@UserContext('sub') userId: string) {
    return this.usersService.createWallet(parseInt(userId, 10));
  }

  @ResponseMessage('Wallet details fetched successfully')
  @Get('wallets')
  getUserWallet(@UserContext('sub') userId: string) {
    return this.usersService.getUserWallet(parseInt(userId, 10));
  }
}
