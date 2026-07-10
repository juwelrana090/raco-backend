import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { Tokens, TokenPair } from './entities/tokens.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Get Tokens entity instance
   */
  private getTokens(): Tokens {
    return new Tokens(this.jwtService, this.prisma, this.config);
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto) {
    const user = await this.usersService.register(registerDto);

    // Get fresh user instance with password for token generation
    const userEntity = await this.usersService.findByEmail(registerDto.email);
    if (!userEntity) {
      throw new BadRequestException('Failed to create user');
    }

    const tokens = await this.getTokens().generateTokenPair(userEntity);

    return {
      success: true,
      message: 'User registered successfully',
      data: {
        ...tokens,
        user,
      },
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user by email
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.getTokens().generateTokenPair(user);

    // Log successful login (security audit)
    this.logger.log(`User logged in: ${user.email}`);

    return {
      success: true,
      message: 'Login successful',
      data: {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      },
    };
  }

  /**
   * Refresh access token
   */
  async refresh(refreshDto: RefreshDto) {
    const { refreshToken } = refreshDto;
    const tokens = this.getTokens();

    // Verify refresh token
    const user = await tokens.verifyRefreshToken(refreshToken);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new token pair
    const newTokens = await tokens.generateTokenPair(user);

    // Remove old refresh token
    await tokens.removeRefreshToken(refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: newTokens,
    };
  }

  /**
   * Logout user (invalidate refresh token)
   */
  async logout(refreshToken: string) {
    const tokens = this.getTokens();
    await tokens.removeRefreshToken(refreshToken);

    return {
      success: true,
      message: 'Logout successful',
      data: null,
    };
  }

  /**
   * Logout from all devices
   */
  async logoutAll(userId: string) {
    const tokens = this.getTokens();
    await tokens.removeAllUserRefreshTokens(userId);

    return {
      success: true,
      message: 'Logged out from all devices',
      data: null,
    };
  }

  /**
   * Validate user for JWT strategy
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    return user;
  }

  /**
   * Extract token from bearer header
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ') ?? [];
    if (type !== 'Bearer') {
      return null;
    }

    return token;
  }
}
