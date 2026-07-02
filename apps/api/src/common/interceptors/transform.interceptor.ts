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
  data: T;
  message?: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If data is already shaped (has success key), pass through
        if (
          data !== null &&
          typeof data === 'object' &&
          'success' in (data as object)
        ) {
          return data as Response<T>;
        }

        return {
          success: true,
          data: data as T,
        };
      }),
    );
  }
}
