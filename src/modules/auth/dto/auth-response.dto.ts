import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto';

export class TokensDto {
  @ApiProperty({
    description: 'Short-lived JWT access token (expires in 15 minutes)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIiwiZW1haWwiOiJ1c2VyQGV4YW1wbGUuY29tIiwicm9sZSI6IlVTRVIifQ.signature',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Long-lived JWT refresh token (expires in 7 days)',
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1dWlkIn0.signature',
  })
  refreshToken: string;
}

export class AuthDataDto extends TokensDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class AuthResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'User registered successfully' })
  message: string;

  @ApiProperty({ type: AuthDataDto })
  data: AuthDataDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Login successful' })
  message: string;

  @ApiProperty({ type: AuthDataDto })
  data: AuthDataDto;
}

export class RefreshDataDto {
  @ApiProperty({
    description: 'New access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'New refresh token (old one is invalidated)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Token refreshed successfully' })
  message: string;

  @ApiProperty({ type: RefreshDataDto })
  data: RefreshDataDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Logout successful' })
  message: string;

  @ApiProperty({ example: null, nullable: true })
  data: null;
}

export class ValidateDataDto {
  @ApiProperty({ type: UserResponseDto })
  user: UserResponseDto;
}

export class ValidateResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Token is valid' })
  message: string;

  @ApiProperty({ type: ValidateDataDto })
  data: ValidateDataDto;
}
