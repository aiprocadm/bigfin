// © 2026 Bigfin
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/** Что кэшу нужно от хранилища — чтобы в проверках подставить память. */
export interface ReportCacheStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  incr(key: string): Promise<number>;
  del(key: string): Promise<void>;
}

/**
 * Хранилище кэша — Redis (тот же, что у очередей).
 *
 * ГЛАВНОЕ ПРАВИЛО: кэш не имеет права сломать отчёт. Redis лёг, не ответил за
 * секунду, вернул ошибку — отчёт считается как без кэша. Поэтому все ошибки
 * здесь глушатся в «промах», а не пробрасываются.
 */
@Injectable()
export class RedisReportCacheStore implements ReportCacheStore, OnModuleDestroy {
  private readonly logger = new Logger('ReportCache');
  private client: Redis | null = null;

  constructor(private readonly config: ConfigService) {}

  private redis(): Redis | null {
    if (process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) return null;
    if (!this.client) {
      this.client = new Redis({
        host: this.config.get<string>('redis.host') || 'localhost',
        port: Number(this.config.get<number>('redis.port') || 6379),
        password: this.config.get<string>('redis.password') || undefined,
        db: this.config.get<number>('redis.db') || 0,
        lazyConnect: false,
        // Без очереди на время разрыва: ждать Redis дольше, чем считать отчёт,
        // бессмысленно.
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        commandTimeout: 1000,
      });
      this.client.on('error', (error) => this.logger.warn(`Redis недоступен: ${error.message}`));
    }
    return this.client;
  }

  private async safe<T>(fallback: T, run: (redis: Redis) => Promise<T>): Promise<T> {
    const redis = this.redis();
    if (!redis) return fallback;
    try {
      return await run(redis);
    } catch {
      return fallback;
    }
  }

  get(key: string) {
    return this.safe<string | null>(null, (r) => r.get(key));
  }

  async set(key: string, value: string, ttlSeconds: number) {
    await this.safe(undefined, async (r) => {
      await r.set(key, value, 'EX', ttlSeconds);
    });
  }

  incr(key: string) {
    return this.safe<number>(0, (r) => r.incr(key));
  }

  async del(key: string) {
    await this.safe(undefined, async (r) => {
      await r.del(key);
    });
  }

  async onModuleDestroy() {
    await this.client?.quit().catch(() => undefined);
  }
}
