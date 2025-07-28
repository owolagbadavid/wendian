// filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponseDto } from '../dtos';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resBody = exception.getResponse();
      message =
        typeof resBody === 'string'
          ? resBody
          : (resBody as { message?: string })?.message ||
            (resBody as { error?: string })?.error ||
            message;
    }

    const responseBody = new ApiResponseDto<null>(
      false,
      undefined,
      message,
      status,
    );

    res.status(status).json(responseBody);
  }
}
