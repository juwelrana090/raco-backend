import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redis!: Redis;
  private readonly defaultTTL: number;

  constructor(private configService: ConfigService) {
    this.defaultTTL = parseInt(
      this.configService.get('REDIS_CATEGORY_TREE_TTL') || '3600',
      10,
    );
  }

  onModuleInit() {
    const host = this.configService.get<string>('REDIS_HOST') ?? 'localhost';
    const port = parseInt(
      this.configService.get<string>('REDIS_PORT') ?? '6379',
      10,
    );
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const db = parseInt(this.configService.get<string>('REDIS_DB') ?? '0', 10);

    this.redis = new Redis({
      host,
      port,
      password: password || undefined,
      db,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    this.redis.on('connect', () => {
      console.log('✅ Connected to Redis');
    });
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  // Cache operations
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serializedValue = JSON.stringify(value);
    const expireTime = ttl || this.defaultTTL;

    await this.redis.setex(key, expireTime, serializedValue);
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.redis.get(key);
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
  }

  async delPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.redis.exists(key);
    return result === 1;
  }

  // Category tree caching
  async cacheCategoryTree(
    categoryId: string,
    descendantIds: string[],
  ): Promise<void> {
    const key = `category:tree:${categoryId}`;
    await this.set(key, descendantIds);
  }

  async getCategoryTree(categoryId: string): Promise<string[] | null> {
    const key = `category:tree:${categoryId}`;
    return this.get<string[]>(key);
  }

  async invalidateCategoryCache(categoryId: string): Promise<void> {
    // Invalidate the specific category cache
    await this.del(`category:tree:${categoryId}`);

    // Invalidate parent cache if this category has a parent
    // This will be handled by the category service
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  // Clear all cache (use with caution)
  async flushDb(): Promise<void> {
    await this.redis.flushdb();
  }
}
