import { describe, expect, it } from 'vitest';
import { MemberRosterSchema } from '@kelas/contracts';
import { seedRows } from './seed-members.js';

describe('seedRows', () => {
  it('menghasilkan tiga puluh enam siswa dan satu wali kelas', () => {
    const rows = seedRows();

    expect(rows).toHaveLength(37);
    expect(rows.filter((row) => row.role === 'student')).toHaveLength(36);
    expect(rows.filter((row) => row.role === 'homeroom')).toHaveLength(1);
  });

  it('menaruh wali kelas di urutan terakhir', () => {
    const rows = seedRows();
    const terakhir = rows[rows.length - 1];

    expect(terakhir?.role).toBe('homeroom');
    expect(terakhir?.sortOrder).toBe(36);
  });

  it('memberi urutan berurutan mulai nol tanpa celah', () => {
    const urutan = seedRows().map((row) => row.sortOrder);

    expect(urutan).toEqual(Array.from({ length: 37 }, (_, index) => index));
  });

  it('lolos validasi roster yang dipakai endpoint admin', () => {
    const rows = seedRows().map(({ role, fullName, nickname, hobby, note, isPublished }) => ({
      role,
      fullName,
      nickname,
      hobby,
      note,
      isPublished,
    }));

    expect(MemberRosterSchema.safeParse({ items: rows }).success).toBe(true);
  });

  it('memakai nama panggilan yang singkat dan tidak berulang', () => {
    const panggilan = seedRows().map((row) => row.nickname);

    expect(new Set(panggilan).size).toBe(panggilan.length);
    expect(panggilan.every((nilai) => nilai.length <= 32)).toBe(true);
  });

  it('membatasi panjang setiap isian sesuai batas basis data', () => {
    for (const row of seedRows()) {
      expect(row.fullName.length).toBeLessThanOrEqual(80);
      expect(row.nickname.length).toBeLessThanOrEqual(32);
      expect(row.hobby.length).toBeLessThanOrEqual(48);
      expect(row.note.length).toBeLessThanOrEqual(200);
    }
  });
});
