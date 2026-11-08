import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

const REQUIRE_DATABASE = process.env['REQUIRE_DATABASE'] === '1';

const DATABASE_URL = process.env['DATABASE_URL'];

if (REQUIRE_DATABASE && (DATABASE_URL === undefined || DATABASE_URL.length === 0)) {
  throw new Error(
    'REQUIRE_DATABASE=1 tetapi DATABASE_URL kosong. Uji integrasi tidak boleh dilewati saat verifikasi.',
  );
}

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    globals: true,
    restoreMocks: true,
  },
  plugins: [
    swc.vite({
      jsc: {
        target: 'es2023',
        parser: { syntax: 'typescript', decorators: true },
        transform: { legacyDecorator: true, decoratorMetadata: true },
      },
    }),
  ],
});
