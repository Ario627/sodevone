import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ContributorAdminController } from './contributor-admin.controller.js';
import { ContributorPublicController } from './contributor.public.controller.js';
import { ContributorRepository } from './contributor.repository.js';
import { ContributorService } from './contributor.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [ContributorPublicController, ContributorAdminController],
  providers: [ContributorRepository, ContributorService],
})
export class ContributorModule {}