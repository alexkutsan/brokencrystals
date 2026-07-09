import { ApiProperty } from '@nestjs/swagger';

export class AppConfig {
  @ApiProperty({
    description: 'Indicates whether application configuration has been loaded'
  })
  configured: boolean;
}
