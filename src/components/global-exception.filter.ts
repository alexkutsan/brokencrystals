import {
  ArgumentsHost,
  Catch,
  Logger,
  HttpException,
  InternalServerErrorException
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { AbstractHttpAdapter } from '@nestjs/core';

@Catch()
export class GlobalExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly applicationRef: AbstractHttpAdapter) {}

  public catch(exception: unknown, host: ArgumentsHost) {
    const gql = host.getType<GqlContextType>() === 'graphql';

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unhandled non-error exception thrown');
    }

    const applicationRef = this.applicationRef;

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      if (gql) {
        throw exception;
      }

      const response = exception.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : Array.isArray((response as { message?: unknown })?.message)
            ? (response as { message: unknown[] }).message
            : (response as { message?: unknown })?.message || exception.message;

      return applicationRef.reply(
        host.getArgByIndex(1),
        {
          statusCode: exception.getStatus(),
          message
        },
        exception.getStatus()
      );
    }

    const sanitizedException = new InternalServerErrorException(
      'An internal error has occurred, and the API was unable to service your request.'
    );

    if (gql) {
      throw sanitizedException;
    }

    return applicationRef.reply(
      host.getArgByIndex(1),
      {
        statusCode: sanitizedException.getStatus(),
        message:
          'An internal error has occurred, and the API was unable to service your request.'
      },
      sanitizedException.getStatus()
    );
  }
}
