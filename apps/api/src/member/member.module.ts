import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { ClassMemberRepository } from './class-member.repository.js';
import { MemberAdminController } from './member-admin.controller.js';
import { MemberPublicController } from './member.public.controller.js';
import { MemberService } from './member.service.js';

@Module({
  imports: [AuditModule, AuthModule],
  controllers: [MemberPublicController, MemberAdminController],
  providers: [ClassMemberRepository, MemberService],
})
export class MemberModule {}