import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { UserContextDto } from 'src/common/types';

@Injectable()
export class TokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private get jwtConfig() {
    const secret = this.configService.get<string>('JWT_SECRET');
    const issuer = this.configService.get<string>('JWT_ISSUER');
    const audience = this.configService.get<string>('JWT_AUDIENCE');
    const expiryInSeconds =
      this.configService.get<string>('JWT_EXPIRY_SECONDS');

    if (!secret || !issuer || !audience || !expiryInSeconds) {
      throw new Error('JWT configuration missing in environment');
    }

    return {
      secret,
      issuer,
      audience,
      expiryInSeconds: parseInt(expiryInSeconds, 10),
    };
  }

  /**
   * Signs a JWT token for a user.
   */
  signJwt(email: string, roles: string[], userId: number): string {
    const payload: UserContextDto = {
      emailAddress: email,
      roles,
      sub: userId.toString(),
      jti: randomUUID(),
    };

    return this.jwtService.sign(payload, {
      secret: this.jwtConfig.secret,
      issuer: this.jwtConfig.issuer,
      audience: this.jwtConfig.audience,
      expiresIn: this.jwtConfig.expiryInSeconds,
      algorithm: 'HS256',
    });
  }

  /**
   * Verifies and decodes a JWT token.
   */
  verifyJwt(token: string): UserContextDto {
    try {
      return this.jwtService.verify<UserContextDto>(token, {
        secret: this.jwtConfig.secret,
        algorithms: ['HS256'],
        audience: this.jwtConfig.audience,
        issuer: this.jwtConfig.issuer,
        ignoreExpiration: false,
      });
    } catch {
      throw new Error('Invalid JWT token');
    }
  }
}
