import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  Response<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown): Response<T> => {
        // If the response already has the success format, return as-is
        if (data !== null && typeof data === 'object' && 'success' in data) {
          return data as Response<T>;
        }

        // Wrap successful responses in consistent format
        const obj = data as { message?: string; data?: T } | null | undefined;
        return {
          success: true,
          message: obj?.message ?? 'Request successful',
          data: obj?.data !== undefined ? obj.data : (data as T),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
