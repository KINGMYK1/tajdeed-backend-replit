import { Injectable, Logger, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const { method, originalUrl, body, query } = request;
    const startAt = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startAt;
        this.logger.log(`${method} ${originalUrl} ${response.statusCode} - ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startAt;
        this.logger.error(
          `${method} ${originalUrl} ${response.statusCode} - ${duration}ms`,
          JSON.stringify({ body, query, error: error.message ?? error.toString() }),
        );
        throw error;
      }),
    );
  }
}
