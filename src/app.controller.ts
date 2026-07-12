import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Basic health check. Returns service status and timestamp.',
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  getHello(): object {
    return {
      status: 'ok',
      message: 'Raco E-commerce API is running',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Detailed health check',
    description:
      'Returns detailed service information including version, uptime, and environment.',
  })
  @ApiResponse({ status: 200, description: 'Service health details' })
  getHealth(): object {
    return {
      status: 'ok',
      service: 'raco-backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
