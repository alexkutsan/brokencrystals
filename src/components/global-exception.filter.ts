import {
  ArgumentsHost,
  Catch,
  Logger,
  HttpException,
  InternalServerErrorException,
  NotFoundException
} from '@nestjs/common';
import { GqlContextType } from '@nestjs/graphql';
import { AbstractHttpAdapter } from '@nestjs/core';

@Catch()
export class GlobalExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private static readonly GENERIC_CLIENT_ERROR_MESSAGE = 'Request could not be processed.';
  private static readonly GENERIC_SERVER_ERROR_MESSAGE =
    'An internal error has occurred, and the API was unable to service your request.';
  private static readonly PATH_DISCLOSURE_PATTERN =
    /(?:[A-Za-z]:\\|\/)(?:[^\s]+[\\/])+[^\s]*/g;

  constructor(private readonly applicationRef: AbstractHttpAdapter) {}

  public catch(exception: unknown, host: ArgumentsHost) {
    const gql = host.getType<GqlContextType>() === 'graphql';

    if (exception instanceof Error) {
      const sanitizedError = this.sanitizeErrorForLogging(exception);
      this.logger.error(sanitizedError.message, sanitizedError.stack);
    } else {
      this.logger.error('Unhandled non-error exception thrown');
    }

    const applicationRef = this.applicationRef;

    if (exception instanceof HttpException && exception.getStatus() < 500) {
      const statusCode = exception.getStatus();
      const sanitizedBody = this.buildHttpExceptionResponse(exception, statusCode);

      if (gql) {
        throw new HttpException(sanitizedBody, statusCode);
      }

      return applicationRef.reply(host.getArgByIndex(1), sanitizedBody, statusCode);
    }

    const sanitizedException = new InternalServerErrorException({
      statusCode: 500,
      message: GlobalExceptionFilter.GENERIC_SERVER_ERROR_MESSAGE,
      error: 'Internal Server Error'
    });

    if (gql) {
      throw sanitizedException;
    }

    return applicationRef.reply(
      host.getArgByIndex(1),
      sanitizedException.getResponse(),
      sanitizedException.getStatus()
    );
  }

  private buildHttpExceptionResponse(
    exception: HttpException,
    statusCode: number
  ): { statusCode: number; message: string | string[]; error: string } {
    return {
      statusCode,
      message: this.sanitizeHttpExceptionMessage(exception, statusCode),
      error: this.sanitizeErrorLabel(exception, statusCode)
    };
  }

  private sanitizeHttpExceptionMessage(
    exception: HttpException,
    statusCode: number
  ): string | string[] {
    if (statusCode === 404) {
      return 'Not Found';
    }

    if (statusCode === 401) {
      return 'Unauthorized';
    }

    if (statusCode === 403) {
      return 'Forbidden';
    }

    if (statusCode === 400) {
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

    return GlobalExceptionFilter.GENERIC_CLIENT_ERROR_MESSAGE;
  }

  private sanitizeErrorLabel(exception: HttpException, statusCode: number): string {
    if (statusCode === 404 || exception instanceof NotFoundException) {
      return 'Not Found';
    }

    if (statusCode === 401) {
      return 'Unauthorized';
    }

    if (statusCode === 403) {
      return 'Forbidden';
    }

    if (statusCode === 400) {
      const response = exception.getResponse();
      const errorLabel =
        typeof response === 'object' && response !== null
          ? (response as { error?: unknown }).error
          : exception.name;

      if (typeof errorLabel !== 'string' || this.containsSensitiveValue(errorLabel)) {
        return 'Bad Request';
      }

      return errorLabel;
    }

    return 'Error';
  }

  private sanitizeText(value: unknown): string {
    if (typeof value !== 'string' || this.containsSensitiveValue(value)) {
      return GlobalExceptionFilter.GENERIC_CLIENT_ERROR_MESSAGE;
    }

    return value;
  }

  private containsSensitiveValue(value: string): boolean {
    return this.containsSensitivePathDisclosure(value) || this.containsStackTraceDisclosure(value);
  }

  private containsSensitivePathDisclosure(value: string): boolean {
    return (
      /(?:[A-Za-z]:\\|\/)(?:[^\s]+[\\/])+[^\s]*/.test(value) ||
      /file:\/\//i.test(value) ||
      value.includes('__dirname') ||
      value.includes('__filename')
    );
  }

  private containsStackTraceDisclosure(value: string): boolean {
    return /\bat\s+.+\s+\((?:[A-Za-z]:\\|\/).+?:\d+:\d+\)/.test(value);
  }

  private sanitizeErrorForLogging(error: Error): { message: string; stack?: string } {
    return {
      message: this.redactSensitivePaths(error.message) || error.name,
      stack: this.redactSensitivePaths(error.stack)
    };
  }

  private redactSensitivePaths(value?: string): string | undefined {
    if (!value) {
      return value;
    }

    return value.replace(GlobalExceptionFilter.PATH_DISCLOSURE_PATTERN, '[redacted-path]');
  }
}
