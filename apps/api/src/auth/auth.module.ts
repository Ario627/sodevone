import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthController } from './auth.controller.js';
import { AuthGuard, RolesGuard } from './auth.guard.js';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { LoginThrottle } from './login-throttle.js';

@Module({
  imports: [AuditModule],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, LoginThrottle, AuthGuard, RolesGuard],
  exports: [AuthService, AuthRepository, AuthGuard, RolesGuard],
})
export class AuthModule {}