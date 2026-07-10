import { User as PrismaUser, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

export class User implements PrismaUser {
  id: string;
  email: string;
  password: string;
  name: string | null;
  role: Role;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PrismaUser) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.name = data.name;
    this.role = data.role;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string, saltRounds: number = 12): Promise<string> {
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a plain text password with hashed password
   */
  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.password);
  }

  /**
   * Check if user has admin role
   */
  isAdmin(): boolean {
    return this.role === Role.ADMIN;
  }

  /**
   * Convert to JSON (excluding password)
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create a User instance from Prisma data
   */
  static fromPrisma(data: PrismaUser): User {
    return new User(data);
  }

  /**
   * Check if user can access resource (ownership or admin)
   */
  canAccessResource(resourceUserId: string): boolean {
    return this.id === resourceUserId || this.isAdmin();
  }
}
