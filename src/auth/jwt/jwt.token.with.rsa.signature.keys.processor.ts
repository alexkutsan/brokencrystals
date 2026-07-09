import { Logger } from '@nestjs/common';
import { encode } from 'jwt-simple';
import { verify } from 'jsonwebtoken';
import { JwtTokenProcessor as JwtTokenProcessor } from './jwt.token.processor';

export class JwtTokenWithRSASignatureKeysProcessor extends JwtTokenProcessor {
  private static readonly EXPECTED_ALG = 'RS256';

  constructor(
    private publicKey: string,
    private privateKey: string
  ) {
    super(new Logger(JwtTokenWithRSASignatureKeysProcessor.name));
  }

  async validateToken(token: string): Promise<unknown> {
    this.log.debug('Call validateToken');

    const [header] = this.parse(token);
    if (header.alg !== JwtTokenWithRSASignatureKeysProcessor.EXPECTED_ALG) {
      throw new Error('Invalid JWT algorithm');
    }

    return verify(token, this.publicKey, {
      algorithms: [JwtTokenWithRSASignatureKeysProcessor.EXPECTED_ALG],
      allowInvalidAsymmetricKeyTypes: false
    });
  }

  async createToken(payload: unknown): Promise<string> {
    this.log.debug('Call createToken');

    const token = encode(payload, this.privateKey, 'RS256');
    return token;
  }
}
