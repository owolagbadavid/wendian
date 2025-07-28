import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { KnexModule } from './db/knex.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from './wallet/wallet.module';

const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisHost = configService.get<string>('REDIS_HOST');
    const redisPort = configService.get<number>('REDIS_PORT');
    const redisUsername = configService.get<string>('REDIS_USERNAME');
    const redisPassword = configService.get<string>('REDIS_PASSWORD');
    const redisTLS = configService.get<string>('REDIS_TLS') === 'true';

    const protocol = redisTLS ? 'rediss' : 'redis';
    const redisUrl = `${protocol}://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`;

    const store = new KeyvRedis(redisUrl);

    return {
      store,
    };
  },
};

@Module({
  imports: [
    UsersModule,
    KnexModule,
    CacheModule.registerAsync(cacheConfig),
    HttpModule,
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST'),
            tls:
              configService.get<string>('REDIS_TLS') === 'true'
                ? {
                    rejectUnauthorized: true,
                  }
                : undefined,
            port: configService.get<number>('REDIS_PORT'),
          },
        };
      },
      inject: [ConfigService],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    WalletModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
