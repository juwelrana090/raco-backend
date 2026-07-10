import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ConfigService } from '@nestjs/config';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  /**
   * Register a new user
   */
  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, name } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const hashedPassword = await User.hashPassword(password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
      },
    });

    return this.toResponseDto(User.fromPrisma(user));
  }

  /**
   * Find user by email (for authentication)
   */
  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? User.fromPrisma(user) : null;
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return User.fromPrisma(user);
  }

  /**
   * Get current user profile
   */
  async getProfile(userId: string): Promise<UserResponseDto> {
    const user = await this.findById(userId);
    return this.toResponseDto(user);
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const { email, password, name } = updateUserDto;

    // Check if email is being updated and already exists
    if (email && email !== userId) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash new password if provided
    let hashedPassword;
    if (password) {
      const saltRounds = this.config.get<number>('BCRYPT_SALT_ROUNDS', 12);
      hashedPassword = await User.hashPassword(password, saltRounds);
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(email && { email }),
        ...(password && { password: hashedPassword }),
        ...(name !== undefined && { name }),
      },
    });

    return this.toResponseDto(User.fromPrisma(user));
  }

  /**
   * Get user's orders (placeholder - will be implemented in orders module)
   */
  async getUserOrders(userId: string) {
    const user = await this.findById(userId);

    const orders = await this.prisma.order.findMany({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
    };
  }

  /**
   * Get user's payments (placeholder - will be implemented in payments module)
   */
  async getUserPayments(userId: string) {
    const user = await this.findById(userId);

    const payments = await this.prisma.payment.findMany({
      where: {
        order: {
          userId: user.id,
        },
      },
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      success: true,
      message: 'Payments retrieved successfully',
      data: payments,
    };
  }

  /**
   * Convert User entity to response DTO (excluding password)
   */
  private toResponseDto(user: User): UserResponseDto {
    const userJson = user.toJSON();
    return {
      id: userJson.id,
      email: userJson.email,
      name: userJson.name ?? undefined,
      role: userJson.role,
      createdAt: userJson.createdAt,
      updatedAt: userJson.updatedAt,
    };
  }
}
