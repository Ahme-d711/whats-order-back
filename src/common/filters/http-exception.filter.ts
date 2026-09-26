import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string[];
  };
  path: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (!(exception instanceof HttpException)) {
      this.logger.error(
        'Unhandled request error',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      success: false,
      error: this.toPublicError(exception, status),
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }

  private toPublicError(
    exception: unknown,
    status: HttpStatus,
  ): ErrorBody['error'] {
    if (!(exception instanceof HttpException)) {
      return {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      };
    }

    const response = exception.getResponse();
    const fallback = exception.message || 'Request failed';
    if (typeof response === 'string') {
      return { code: HttpStatus[status], message: response };
    }

    const rawMessage =
      typeof response === 'object' && response !== null && 'message' in response
        ? response.message
        : undefined;
    const details = Array.isArray(rawMessage)
      ? rawMessage.filter((item): item is string => typeof item === 'string')
      : undefined;

    return {
      code: HttpStatus[status],
      message:
        details && details.length > 0
          ? 'Please correct the submitted fields'
          : typeof rawMessage === 'string'
            ? rawMessage
            : fallback,
      ...(details && details.length > 0 ? { details } : {}),
    };
  }
}
