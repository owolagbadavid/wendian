import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { Response } from 'express';
import { ApiResponseDto } from '../dtos';
import { RESPONSE_MESSAGE_KEY } from '../decorators';
import { HelperService } from '../services/helper.service';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponseDto<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponseDto<T>> {
    const ctx = context.switchToHttp();
    const res: Response = ctx.getResponse();

    const handler = context.getHandler();
    const message = this.reflector.get<string>(RESPONSE_MESSAGE_KEY, handler);

    const statusCode = res.statusCode || HttpStatus.OK;

    return next.handle().pipe(
      map((data) => {
        // // If statusCode wasn't explicitly set (e.g., via @HttpCode), set it
        // if (
        //   !res.statusCode ||
        //   (res.statusCode as HttpStatus) === HttpStatus.OK
        // ) {
        //   res.status(statusCode);
        // }

        return new ApiResponseDto<T>(
          true,
          HelperService.keysToCamel(data) as T,
          message ?? 'Request successful',
          statusCode,
        );
      }),
    );
  }
}
