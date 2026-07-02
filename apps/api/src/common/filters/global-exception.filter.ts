import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        code = this.getCodeFromStatus(status);
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string) ?? exception.message;
        code = (resp['error'] as string) ?? this.getCodeFromStatus(status);
        if (Array.isArray(resp['message'])) {
          details = resp['message'];
          message = 'Validation failed';
          code = 'VALIDATION_ERROR';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;

      // Log unexpected errors
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${exception.message}`,
        process.env['NODE_ENV'] !== 'production' ? exception.stack : undefined,
      );
    }

    // Never expose stack traces in production
    const errorBody: Record<string, unknown> = {
      success: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    };

    response.status(status).json(errorBody);
  }

  private getCodeFromStatus(status: number): string {
    const codes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codes[status] ?? 'UNKNOWN_ERROR';
  }
}
