import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, query } = req;
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length') ?? '0';
      const duration = Date.now() - start;

      const logMessage = `${method} ${originalUrl} ${statusCode} - ${contentLength}b - ${duration}ms`;

      if (statusCode >= 500) {
        this.logger.error(logMessage, JSON.stringify({ body, query }));
      } else if (statusCode >= 400) {
        this.logger.warn(logMessage, JSON.stringify({ body, query }));
      } else {
        this.logger.log(logMessage);
      }
    });

    next();
  }
}
