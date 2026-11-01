import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AuditController } from './audit.controller.js';
import { AuditModule } from './audit.module.js';
import { AuditService } from './audit.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditAdminModule {}