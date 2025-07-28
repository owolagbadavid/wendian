import { Injectable, NotFoundException } from '@nestjs/common';
import { SearchRequestDto } from 'src/common/dtos';
import { UserRepository } from 'src/db/repositories/user.repository';

@Injectable()
export class UsersService {
  constructor(private userRepository: UserRepository) {}

  async searchUsers(req: SearchRequestDto) {
    try {
      return await this.userRepository.findPaged(req);
    } catch (error) {
      console.error(error);
    }
  }

  async getMe(userId: number) {
    console.log('Fetching user with ID:', userId);
    const user = await this.userRepository.findOne({ id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
