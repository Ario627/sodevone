import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AdminUserController } from '../../admin-user/admin-user.controller.js';
import { AnnouncementAdminController } from '../../announcement/announcement-admin.controller.js';
import { AnnouncementPublicController } from '../../announcement/announcement.public.controller.js';
import { AuditController } from '../../audit/audit.controller.js';
import { AuthController } from '../../auth/auth.controller.js';
import { EventAdminController } from '../../event/event-admin.controller.js';
import { EventPublicController } from '../../event/event.public.controller.js';
import { AlbumAdminController } from '../../gallery/album-admin.controller.js';
import { AlbumPublicController } from '../../gallery/album.public.controller.js';
import { HealthController } from '../../health/health.controller.js';
import { HomeController } from '../../home/home.controller.js';
import { MediaController } from '../../media/media.controller.js';

const CONTROLLERS = [
  AdminUserController,
  AnnouncementAdminController,
  AnnouncementPublicController,
  AuditController,
  AuthController,
  EventAdminController,
  EventPublicController,
  AlbumAdminController,
  AlbumPublicController,
  HealthController,
  HomeController,
  MediaController,
] as const;

const PARAM_SEGMENT = /^:[^/]+$/;

const SEGMENT_SEPARATOR = '/';

type Route = { controller: string; method: string; path: string; segments: string[] };

type Handler = { name: string };

function joinPath(prefix: string, path: string): string[] {
  return `${prefix}/${path}`
    .split(SEGMENT_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
}

function routesOf(controller: unknown): Route[] {
  const prototype = (controller as { prototype: object }).prototype;
  const prefix = String(Reflect.getMetadata(PATH_METADATA, controller as object) ?? '');

  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .flatMap((name) => {
      const handler = (prototype as Record<string, Handler>)[name];

      if (typeof handler !== 'function') {
        return [];
      }

      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;

      if (path === undefined || method === undefined) {
        return [];
      }

      return [
        {
          controller: (controller as { name: string }).name,
          method: RequestMethod[method],
          path: joinPath(prefix, path).join(SEGMENT_SEPARATOR),
          segments: joinPath(prefix, path),
        },
      ];
    });
}

const ROUTES = CONTROLLERS.flatMap((controller) => routesOf(controller));

function describeRoute(route: Route): string {
  return `${route.method} /${route.path} (${route.controller})`;
}

describe('tabel rute', () => {
  it('mengumpulkan rute dari seluruh controller terdaftar', () => {
    expect(ROUTES.length).toBeGreaterThanOrEqual(30);
  });

  it('tidak memiliki dua rute dengan metode dan path yang sama', () => {
    const seen = new Map<string, string>();

    for (const route of ROUTES) {
      const key = `${route.method} ${route.path}`;
      const previous = seen.get(key);

      expect(previous, `${describeRoute(route)} bentrok dengan ${previous}`).toBeUndefined();
      seen.set(key, describeRoute(route));
    }
  });

  it('tidak membiarkan rute statis tertutup oleh parameter di posisi yang sama', () => {
    for (const route of ROUTES) {
      const shadowing = ROUTES.filter(
        (other) =>
          other.method === route.method &&
          other.segments.length === route.segments.length &&
          other.segments.every((segment, index) => {
            const target = route.segments[index] ?? '';
            const parameter = PARAM_SEGMENT.test(other.segments[index] ?? '');

            if (parameter) {
              return target.length > 0;
            }

            return segment === target;
          }),
      ).filter((other) => !other.segments.every((segment, index) => segment === route.segments[index]));

      expect(
        shadowing.map(describeRoute),
        `${describeRoute(route)} tertutup oleh rute parameter`,
      ).toEqual([]);
    }
  });
});
