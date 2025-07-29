import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { UsersService } from '../services/users.service';
import { ResponseMessage, UserContext } from 'src/common/decorators';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from 'src/auth/guards';
import { UsernameDto } from '../dto/user.dto';
import { plainToInstance } from 'class-transformer';
import { User } from 'src/db/entities';

@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
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

  @Get('username-exists')
  async usernameExists(
    @Query('username') username: string,
    @UserContext('sub') userId?: string,
  ): Promise<boolean> {
    return this.usersService.usernameExists(
      username,
      userId ? parseInt(userId, 10) : undefined,
    );
  }

  @Patch('username')
  async updateUsername(
    @UserContext('sub') userId: string,
    @Body() usernameDto: UsernameDto,
  ) {
    return this.usersService.updateUsername(
      parseInt(userId, 10),
      usernameDto.username,
    );
  }

  @Get('byUsername/:username')
  async getByUsername(@Param('username') username: string) {
    return plainToInstance(
      User,
      await this.usersService.getByUsername(username),
    );
  }
}
