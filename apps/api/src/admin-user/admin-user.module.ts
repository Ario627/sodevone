import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AdminUserController } from './admin-user.controller.js';
import { AdminUserRepository } from './admin-user.repository.js';
import { AdminUserService } from './admin-user.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [AdminUserController],
  providers: [AdminUserRepository, AdminUserService],
})
export class AdminUserModule {}