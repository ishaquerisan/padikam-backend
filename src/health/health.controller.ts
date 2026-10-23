import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { Sequelize } from 'sequelize-typescript';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private sequelize: Sequelize) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Application and database connectivity health check' })
  async check() {
    let dbStatus = 'healthy';
    try {
      await this.sequelize.authenticate();
    } catch (error) {
      dbStatus = `unhealthy: ${(error as any).message}`;
    }

    return {
      status: 'ok',
      service: 'Padikam API',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
