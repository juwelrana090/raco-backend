import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  ValidationPipe,
  ValidationError,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { Request, Response, NextFunction } from 'express';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { createScalarDocument } from './config/scalar.config';
import { setupScalarEndpoints } from './config/scalar-endpoints.config';
import { scalarThemeConfig } from './config/scalar-theme.config';

interface RawBodyRequest extends Request {
  rawBody?: Buffer;
}

function rawBodyMiddleware(
  req: RawBodyRequest,
  res: Response,
  next: NextFunction,
): void {
  if (req.path.includes('/webhook') || req.path.includes('/callback')) {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      req.rawBody = Buffer.concat(chunks);
      next();
    });
  } else {
    next();
  }
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const logger = new Logger('Bootstrap');

  // Raw body parser for webhooks (MUST be before other middleware)
  app.use(rawBodyMiddleware);

  // Global API prefix
  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
  });

  // Compression
  app.use(compression());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          constraints: Object.values(error.constraints ?? {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: formattedErrors,
        });
      },
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor
  app.useGlobalInterceptors(new TransformInterceptor());

  // Build OpenAPI document
  const document = SwaggerModule.createDocument(app, createScalarDocument());

  // Register /api-json, /postman, /api-info endpoints
  setupScalarEndpoints(app, document);

  // Mount Scalar interactive UI at /api-docs
  app.use(
    '/api-docs',
    apiReference({
      spec: { content: document },
      ...scalarThemeConfig,
    }),
  );

  const port = process.env.PORT ?? 4000;

  app.enableShutdownHooks();
  await app.listen(port);

  logger.log(`🚀 Running on http://localhost:${port}/api/v1`);
  logger.log(`📚 API Docs:  http://localhost:${port}/api-docs`);
  logger.log(`📋 Postman:  http://localhost:${port}/postman`);
  logger.log(`📄 OpenAPI:  http://localhost:${port}/api-json`);
  logger.log(`💚 Health:   http://localhost:${port}/api-info`);
}

bootstrap().catch((error: Error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
