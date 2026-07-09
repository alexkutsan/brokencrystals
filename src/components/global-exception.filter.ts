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
  private static readonly GENERIC_CLIENT_ERROR_MESSAGE = 'Request could not be processed.';
  private static readonly GENERIC_SERVER_ERROR_MESSAGE =
    'An internal error has occurred, and the API was unable to service your request.';

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

      const message = this.sanitizeHttpExceptionMessage(exception);

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
      GlobalExceptionFilter.GENERIC_SERVER_ERROR_MESSAGE
    );

    if (gql) {
      throw sanitizedException;
    }

    return applicationRef.reply(
      host.getArgByIndex(1),
      {
        statusCode: sanitizedException.getStatus(),
        message: GlobalExceptionFilter.GENERIC_SERVER_ERROR_MESSAGE
      },
      sanitizedException.getStatus()
    );
  }

  private sanitizeHttpExceptionMessage(exception: HttpException): string | string[] {
    const response = exception.getResponse();
    const rawMessage =
      typeof response === 'string'
        ? response
        : Array.isArray((response as { message?: unknown })?.message)
          ? (response as { message: unknown[] }).message
          : (response as { message?: unknown })?.message || exception.message;

    if (Array.isArray(rawMessage)) {
      return rawMessage.map((message) => this.sanitizeText(message));
    }

    return this.sanitizeText(rawMessage);
  }

  private sanitizeText(value: unknown): string {
    if (typeof value !== 'string') {
      return GlobalExceptionFilter.GENERIC_CLIENT_ERROR_MESSAGE;
    }

    if (this.containsSensitivePathDisclosure(value)) {
      return GlobalExceptionFilter.GENERIC_CLIENT_ERROR_MESSAGE;
    }

    return value;
  }

  private containsSensitivePathDisclosure(value: string): boolean {
    return (
      /(?:[A-Za-z]:\\|\/)(?:[^\s]+[\\/])+[^\s]*/.test(value) ||
      value.includes('__dirname')
    );
  }
}
