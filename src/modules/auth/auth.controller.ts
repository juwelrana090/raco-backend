import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import {
  AuthResponseDto,
  LoginResponseDto,
  RefreshResponseDto,
  LogoutResponseDto,
  ValidateResponseDto,
} from './dto/auth-response.dto';
import { JwtGuard } from './guards/jwt.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Create a new user account with email, password, and optional name. Returns JWT tokens and user profile.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Email already exists',
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Login user
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description:
      'Authenticate with email and password. Returns JWT access token (15min) and refresh token (7 days).',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Login successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid credentials',
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchange a valid refresh token for a new access token. The old refresh token is invalidated.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token refreshed successfully',
    type: RefreshResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired refresh token',
  })
  async refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user',
    description:
      'Invalidate the current refresh token. Optionally pass refreshToken in body for targeted invalidation.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async logout(@Request() req) {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      return this.authService.logout(refreshToken);
    }

    return {
      success: true,
      message: 'Logout successful',
      data: null,
    };
  }

  /**
   * Logout from all devices
   */
  @Post('logout-all')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout from all devices',
    description:
      'Invalidate all refresh tokens for the current user. All sessions will be terminated.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logged out from all devices',
    type: LogoutResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  async logoutAll(@Request() req) {
    return this.authService.logoutAll(req.user.id);
  }

  /**
   * Validate token (check if current session is valid)
   */
  @Get('validate')
  @UseGuards(JwtGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Validate current access token',
    description:
      'Check if the current JWT access token is valid. Returns the authenticated user profile.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Token is valid',
    type: ValidateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid or expired token',
  })
  async validate(@Request() req) {
    return {
      success: true,
      message: 'Token is valid',
      data: {
        user: req.user,
      },
    };
  }
}
