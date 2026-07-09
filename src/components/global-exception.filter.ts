import {
  ArgumentsHost,
  Catch,
  Logger,
  HttpException,
  InternalServerErrorException
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { GqlContextType } from '@nestjs/graphql';

@Catch()
export class GlobalExceptionFilter extends BaseExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  public catch(exception: unknown, host: ArgumentsHost) {
    const gql = host.getType<GqlContextType>() === 'graphql';

    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    } else {
      this.logger.error('Unhandled non-error exception thrown');
    }

    if (exception instanceof HttpException) {
      if (exception.getStatus() < 500) {
        if (gql) {
          throw exception;
        }

        return super.catch(exception, host);
      }

      exception = new InternalServerErrorException(
        'An internal error has occurred, and the API was unable to service your request.'
      );
    }

    const unprocessableException =
      exception instanceof InternalServerErrorException
        ? exception
        : new InternalServerErrorException(
            'An internal error has occurred, and the API was unable to service your request.'
          );

    if (gql) {
      throw unprocessableException;
    }

    const applicationRef =
      this.applicationRef ||
      (this.httpAdapterHost && this.httpAdapterHost.httpAdapter);

    return applicationRef.reply(
      host.getArgByIndex(1),
      {
        statusCode: unprocessableException.getStatus(),
        message:
          'An internal error has occurred, and the API was unable to service your request.'
      },
      unprocessableException.getStatus()
    );
  }
}
