import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, ValidationError, BadRequestException } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { IS_PUBLIC_KEY } from './common/decorators/public.decorator';

/**
 * Raw body parser for webhook endpoints
 * 
 * CRITICAL: Webhook signature verification requires raw request body
 * Stripe and bKash webhooks need the unparsed body for signature verification
 */
async function rawBodyMiddleware(req: any, res: any, next: any) {
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
  const app = await NestFactory.create(AppModule);

  // Raw body parser for webhooks (MUST be before other middleware)
  (app as any).use(rawBodyMiddleware);

  // Global API prefix
  const apiPrefix = process.env.API_PREFIX || 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // CORS configuration
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
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
      whitelist: true, // Strip properties that don't have decorators
      forbidNonWhitelisted: true, // Throw error if non-whitelisted values are provided
      transform: true, // Automatically transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors = errors.map((error) => ({
          field: error.property,
          constraints: Object.values(error.constraints || {}),
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

  // Swagger documentation
  if (process.env.SWAGGER_ENABLED !== 'false') {
    const config = new DocumentBuilder()
      .setTitle(
        process.env.SWAGGER_TITLE || 'Raco E-commerce API',
      )
      .setDescription(
        process.env.SWAGGER_DESCRIPTION ||
          'E-commerce Ordering & Payment System',
      )
      .setVersion(
        process.env.SWAGGER_VERSION || '1.0.0',
      )
      .addBearerAuth()
      .addTag('Auth', 'Authentication and authorization endpoints')
      .addTag('Users', 'User management endpoints')
      .addTag('Products', 'Product catalog endpoints')
      .addTag('Categories', 'Category hierarchy endpoints')
      .addTag('Orders', 'Order management endpoints')
      .addTag('Payments', 'Payment processing endpoints')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    const swaggerPath = process.env.SWAGGER_PATH || 'api/docs';
    SwaggerModule.setup(swaggerPath, app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
      },
      customSiteTitle: 'Raco API Docs',
    });
  }

  // Get port from environment or use default
  const port = process.env.PORT || 4000;

  // Enable graceful shutdown
  app.enableShutdownHooks();

  await app.listen(port);

  console.log(`
    ╔═════════════════════════════════════════════════════╗
    ║           🚀 Raco E-commerce API Started            ║
    ╠═════════════════════════════════════════════════════╣
    ║  Environment: ${process.env.NODE_ENV || 'development'}                      ║
    ║  Port: ${port}                                        ║
    ║  API Prefix: /${apiPrefix}                          ║
    ║  Swagger: http://localhost:${port}/${process.env.SWAGGER_PATH || 'api/docs'}    ║
    ╚═════════════════════════════════════════════════════╝
  `);
}

bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
