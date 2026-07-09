import { EntityManager } from '@mikro-orm/core';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { decode, encode } from 'jwt-simple';
import { JwtHeader } from './jwt.header';
import { JwtTokenProcessor as JwtTokenProcessor } from './jwt.token.processor';

export class JwtTokenWithSqlKIDProcessor extends JwtTokenProcessor {
  private static readonly KID: number = 0;

  constructor(
    private readonly em: EntityManager,
    private key: string
  ) {
    super(new Logger(JwtTokenWithSqlKIDProcessor.name));
  }

  async validateToken(token: string): Promise<unknown> {
    this.log.debug('Call validateToken');

    try {
      const [header] = this.parse(token);

      if (
        !header ||
        (typeof header.kid !== 'string' && typeof header.kid !== 'number')
      ) {
        throw new UnauthorizedException({ error: 'Unauthorized' });
      }

      const normalizedKid = String(header.kid).trim();
      if (normalizedKid !== `${JwtTokenWithSqlKIDProcessor.KID}`) {
        throw new UnauthorizedException({ error: 'Unauthorized' });
      }

      const query =
        'select key from (select ? as key, ? as id) as keys where keys.id = ?';
      this.log.debug(`Executing key fetching query: ${query}`);
      const keyRow: { key: string } | null = await this.em
        .getConnection()
        .execute(
          query,
          [this.key, JwtTokenWithSqlKIDProcessor.KID, Number(normalizedKid)],
          'get'
        );

      if (!keyRow?.key) {
        throw new UnauthorizedException({ error: 'Unauthorized' });
      }

      return decode(token, keyRow.key, false, 'HS256');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.log.warn('Rejected invalid SQL-KID JWT token');
      throw new UnauthorizedException({ error: 'Unauthorized' });
    }
  }

  async createToken(payload: unknown): Promise<string> {
    this.log.debug('Call createToken');
    const header: JwtHeader = {
      alg: 'HS256',
      kid: `${JwtTokenWithSqlKIDProcessor.KID}`,
      typ: 'JWT'
    };
    const token = encode(payload, this.key, 'HS256', {
      header
    });
    return token;
  }
}
