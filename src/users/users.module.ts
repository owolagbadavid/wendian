import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from './services/auth.service';
import { AuthModule } from 'src/auth/auth.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';
import { WalletModule } from 'src/wallet/wallet.module';

@Module({
  controllers: [AuthController, UsersController],
  providers: [AuthService, UsersService],
  imports: [
    WalletModule,
    AuthModule,
    BullModule.registerQueue({
      prefix: 'bull:{mail}',
      name: 'mail',
    }),
  ],
})
export class UsersModule {}
