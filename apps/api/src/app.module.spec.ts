import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';
import { ContributorAdminController } from './contributor/contributor-admin.controller.js';
import { ContributorPublicController } from './contributor/contributor.public.controller.js';
import { DatabaseService } from './db/database.service.js';
import { MemberAdminController } from './member/member-admin.controller.js';
import { MemberPublicController } from './member/member.public.controller.js';
import { SocialAdminController } from './social/social-admin.controller.js';
import { SocialPublicController } from './social/social.public.controller.js';

const DATABASE_PALSU = {
  db: {},
  sql: {},
  ping: async () => true,
  onModuleInit: () => undefined,
  onModuleDestroy: () => undefined,
};

const CONTROLLER = [
  MemberPublicController,
  MemberAdminController,
  ContributorPublicController,
  ContributorAdminController,
  SocialPublicController,
  SocialAdminController,
];

let moduleRef: TestingModule | undefined;

async function rakit(): Promise<TestingModule> {
  moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(DatabaseService)
    .useValue(DATABASE_PALSU)
    .compile();

  return moduleRef;
}

afterEach(async () => {
  await moduleRef?.close();
  moduleRef = undefined;
});

describe('AppModule', () => {
  it('menyelesaikan seluruh grafik dependensi tanpa galat', async () => {
    await expect(rakit()).resolves.toBeDefined();
  });

  it('menyediakan setiap controller baru tanpa impor manual', async () => {
    const modul = await rakit();

    for (const controller of CONTROLLER) {
      expect(modul.get(controller, { strict: false })).toBeDefined();
    }
  });
});
