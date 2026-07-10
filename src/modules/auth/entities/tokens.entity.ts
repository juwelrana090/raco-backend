import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { User } from '../../users/entities/user.entity';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class Tokens {
  constructor(
    private jwtService: NestJwtService,
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Generate access token (short-lived)
   */
  async generateAccessToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m');

    return this.jwtService.signAsync(payload, {
      expiresIn: expiresIn as any, // Type assertion for JWT library compatibility
    });
  }

  /**
   * Generate refresh token (long-lived)
   */
  async generateRefreshToken(user: User): Promise<string> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in environment variables',
      );
    }

    const token = await this.jwtService.signAsync(payload, {
      secret,
      expiresIn: expiresIn as any, // Type assertion for JWT library compatibility
    });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    // Store refresh token in database
    await this.prisma.refreshToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Generate token pair (access + refresh)
   */
  async generateTokenPair(user: User): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken(user),
      this.generateRefreshToken(user),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  /**
   * Verify refresh token and return user
   */
  async verifyRefreshToken(token: string): Promise<User | null> {
    const secret = this.config.get<string>('JWT_REFRESH_SECRET');

    if (!secret) {
      throw new Error(
        'JWT_REFRESH_SECRET is not defined in environment variables',
      );
    }

    try {
      // Verify JWT
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret,
      });

      // Check if token exists in database
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { token },
        include: { user: true },
      });

      if (!refreshToken) {
        return null;
      }

      // Check if token is expired
      if (refreshToken.expiresAt < new Date()) {
        // Remove expired token
        await this.prisma.refreshToken.delete({
          where: { token },
        });
        return null;
      }

      return User.fromPrisma(refreshToken.user);
    } catch (error) {
      return null;
    }
  }

  /**
   * Remove refresh token (logout)
   */
  async removeRefreshToken(token: string): Promise<void> {
    try {
      await this.prisma.refreshToken.delete({
        where: { token },
      });
    } catch (error) {
      // Token might not exist, ignore error
    }
  }

  /**
   * Remove all refresh tokens for a user (logout from all devices)
   */
  async removeAllUserRefreshTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Clean up expired refresh tokens (maintenance task)
   */
  async cleanupExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
