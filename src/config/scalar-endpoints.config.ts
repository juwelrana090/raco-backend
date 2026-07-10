import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';

export function setupScalarEndpoints(app: INestApplication, document: any) {
  // GET /api-json — raw OpenAPI spec
  app.use('/api-json', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(document);
  });

  // GET /postman — Postman collection download
  app.use('/postman', (req: Request, res: Response) => {
    const collection = generatePostmanCollection(document);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="raco-backend-collection.json"',
    );
    res.send(collection);
  });

  // GET /api-info — health check
  app.use('/api-info', (req: Request, res: Response) => {
    res.json({
      title: 'Raco E-commerce API',
      version: '1.0.0',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      documentation: {
        interactive: '/api-docs',
        openapi: '/api-json',
        postman: '/postman',
      },
      endpoints: Object.keys(document.paths || {}).length,
      services: [
        { name: 'PostgreSQL', status: 'active', note: 'Prisma ORM' },
        { name: 'Redis', status: 'active', note: 'Category tree DFS cache' },
        { name: 'AWS S3', status: 'active', note: 'Product image storage' },
        { name: 'Stripe', status: 'active', note: 'Test mode' },
        { name: 'bKash', status: 'active', note: 'Sandbox mode' },
      ],
    });
  });
}

function generatePostmanCollection(document: any) {
  return {
    info: {
      name: 'Raco E-commerce API',
      description: 'Complete API collection for Raco e-commerce backend',
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      version: '1.0.0',
    },
    auth: {
      type: 'bearer',
      bearer: [{ key: 'token', value: '{{jwt_token}}', type: 'string' }],
    },
    variable: [
      {
        key: 'base_url',
        value: 'http://localhost:4000/api/v1',
        type: 'string',
        description: 'Base URL for raco-backend',
      },
      {
        key: 'jwt_token',
        value: '',
        type: 'string',
        description: 'JWT token from POST /api/v1/auth/login',
      },
    ],
    item: generatePostmanItems(document),
    event: [
      {
        listen: 'test',
        script: {
          type: 'text/javascript',
          exec: [
            'pm.test("Status is 2xx", () => {',
            '  pm.expect(pm.response.code).to.be.oneOf([200,201,202,204]);',
            '});',
            'pm.test("Response time < 3000ms", () => {',
            '  pm.expect(pm.response.responseTime).to.be.below(3000);',
            '});',
          ],
        },
      },
    ],
  };
}

function generatePostmanItems(document: any) {
  const folders = new Map<string, any>();

  Object.entries(document.paths || {}).forEach(([path, methods]) => {
    Object.entries(methods as any).forEach(
      ([method, operation]: [string, any]) => {
        if (
          ![
            'get',
            'post',
            'put',
            'delete',
            'patch',
            'head',
            'options',
          ].includes(method)
        )
          return;

        const tag = operation.tags?.[0] || 'General';
        if (!folders.has(tag)) {
          folders.set(tag, { name: tag, item: [] });
        }

        const folder = folders.get(tag);
        const prefix = '/api/v1';
        const cleanPath = path.startsWith(prefix)
          ? path.substring(prefix.length)
          : path;

        const headers: any[] = [
          { key: 'Content-Type', value: 'application/json' },
        ];
        if (operation.security) {
          headers.push({ key: 'Authorization', value: 'Bearer {{jwt_token}}' });
        }

        folder.item.push({
          name: operation.summary || `${method.toUpperCase()} ${path}`,
          request: {
            method: method.toUpperCase(),
            header: headers,
            url: {
              raw: `{{base_url}}${cleanPath}`,
              host: ['{{base_url}}'],
              path: cleanPath.split('/').filter(Boolean),
              query: (operation.parameters || [])
                .filter((p: any) => p.in === 'query')
                .map((p: any) => ({
                  key: p.name,
                  value: p.example?.toString() || '',
                  description: p.description || '',
                  disabled: !p.required,
                })),
            },
            body: operation.requestBody
              ? {
                  mode: 'raw',
                  raw: JSON.stringify(
                    operation.requestBody.content?.['application/json']
                      ?.example ?? {},
                    null,
                    2,
                  ),
                  options: { raw: { language: 'json' } },
                }
              : undefined,
            description: operation.description || operation.summary || '',
          },
        });
      },
    );
  });

  return Array.from(folders.values());
}
