import { HttpException, Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { AppConfig } from './app.config.api';
import { UserDto } from './users/api/UserDto';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  private readonly allowedCommands = new Set(['ls', 'pwd', 'whoami']);

  constructor(
    private readonly configService: ConfigService,
    private readonly userService: UsersService
  ) {}

  async launchCommand(command: string): Promise<string> {
    const trimmedCommand = typeof command === 'string' ? command.trim() : '';
    const [exec, ...args] = trimmedCommand.split(/\s+/);

    if (!exec || !this.allowedCommands.has(exec) || args.length > 0) {
      throw new BadRequestException('Unsupported command');
    }

    this.logger.debug(`رفض command execution request for ${exec}`);
    return `Command ${exec} is not available in this deployment`;
  }

  getConfig(): AppConfig {
    return {
      configured: true
    };
  }

  async getUserInfo(email: string): Promise<UserDto> {
    try {
      this.logger.debug(`Find a user by email: ${email}`);
      return new UserDto(await this.userService.findByEmail(email));
    } catch (err) {
      throw new HttpException(err.message, err.status);
    }
  }
}
