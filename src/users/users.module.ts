import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { BullModule } from '@nestjs/bullmq';
import { AuthService } from './services/auth.service';
import { UserRepository } from 'src/db/repositories/user.repository';
import { Knex } from 'knex';
import { knexProvider } from 'src/db/knex.module';
import { AuthModule } from 'src/auth/auth.module';
import { UsersController } from './controllers/users.controller';
import { UsersService } from './services/users.service';

@Module({
  controllers: [AuthController, UsersController],
  providers: [
    AuthService,
    {
      provide: UserRepository,
      useFactory: (knex: Knex) => new UserRepository(knex),
      inject: [knexProvider.provide],
    },
    UsersService,
  ],
  imports: [
    AuthModule,
    BullModule.registerQueue({
      prefix: 'bull:{mail}',
      name: 'mail',
    }),
  ],
})
export class UsersModule {}
