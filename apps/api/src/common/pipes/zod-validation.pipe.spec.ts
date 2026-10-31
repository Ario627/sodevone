import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from './zod-validation.pipe.js';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    title: z.string().min(3),
    page: z.coerce.number().int().min(1).default(1),
  });

  it('mengembalikan data yang sudah diparse saat valid', () => {
    const pipe = new ZodValidationPipe(schema);

    expect(pipe.transform({ title: 'Rapat kelas' })).toEqual({
      title: 'Rapat kelas',
      page: 1,
    });
  });

  it('melempar BadRequestException dengan daftar field saat tidak valid', () => {
    const pipe = new ZodValidationPipe(schema);

    try {
      pipe.transform({ title: 'ab' });
      expect.unreachable('harus melempar');
    } catch (error) {
      const response = (error as { getResponse: () => unknown }).getResponse();
      expect(response).toMatchObject({
        code: 'VALIDATION_FAILED',
        fields: [{ path: 'title' }],
      });
    }
  });
});
