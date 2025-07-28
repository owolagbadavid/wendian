import { Global, Module } from '@nestjs/common';

import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { TokenProvider } from './token.provider';

@Global()
@Module({
  imports: [
    JwtModule.register({
      global: true,
    }),
  ],
  controllers: [],
  providers: [AuthService, TokenProvider],
  exports: [TokenProvider],
})
export class AuthModule {}
