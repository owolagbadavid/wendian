import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { KnexModule } from './db/knex.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule, CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpModule } from '@nestjs/axios';
import { WalletModule } from './wallet/wallet.module';
import { FlutterwaveService } from './common/services/flutterwave.service';
import { TransactionsModule } from './transactions/transactions.module';
import { KarmaService } from './common/services/karma.service';
import { PaymentService } from './common/services/payment.service';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

const cacheConfig: CacheModuleAsyncOptions = {
  isGlobal: true,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const redisHost = configService.get<string>('REDIS_HOST');
    const redisPort = configService.get<number>('REDIS_PORT');
    const redisUsername = configService.get<string>('REDIS_USER');
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
    HttpModule.register({
      global: true,
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const redisHost = configService.get<string>('REDIS_HOST');
        const redisPort = configService.get<number>('REDIS_PORT');
        const redisUsername = configService.get<string>('REDIS_USER');
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisTLS = configService.get<string>('REDIS_TLS') === 'true';

        const protocol = redisTLS ? 'rediss' : 'redis';
        let redisUrl = '';
        if (redisUsername && redisPassword) {
          // If username and password are provided, use them in the URL
          redisUrl = `${protocol}://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}`;
        } else {
          // If not, just use host and port
          redisUrl = `${protocol}://${redisHost}:${redisPort}`;
        }
        return {
          connection: {
            host: redisHost,
            port: redisPort,
            username: redisUsername,
            password: redisPassword,
            redisOptions: {
              ...(redisTLS
                ? {
                    tls: {
                      minVersion: 'TLSv1.3',
                      rejectUnauthorized: true,
                    },
                  }
                : {}),
            },
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
    TransactionsModule,
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 10,
        },
      ],
    }),
  ],
  controllers: [AppController],
  providers: [
    KarmaService,
    {
      provide: PaymentService,
      useClass: FlutterwaveService,
    },
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },

    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
