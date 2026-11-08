import { describe, expect, it } from 'vitest';
import { hostOf, isPlatformUrl } from './social-url.js';

describe('hostOf', () => {
  it('mengembalikan host huruf kecil', () => {
    expect(hostOf('https://WWW.Instagram.com/p/abc')).toBe('www.instagram.com');
  });

  it('mengembalikan null untuk teks yang bukan URL', () => {
    expect(hostOf('bukan url')).toBeNull();
  });
});

describe('isPlatformUrl', () => {
  it('menerima tautan instagram yang sah', () => {
    expect(isPlatformUrl('instagram', 'https://www.instagram.com/p/CxYz/')).toBe(true);
    expect(isPlatformUrl('instagram', 'https://instagram.com/p/CxYz/')).toBe(true);
    expect(isPlatformUrl('instagram', 'https://instagr.am/p/CxYz/')).toBe(true);
  });

  it('menerima tautan tiktok termasuk domain pendek', () => {
    expect(isPlatformUrl('tiktok', 'https://www.tiktok.com/@kelas/video/1')).toBe(true);
    expect(isPlatformUrl('tiktok', 'https://vm.tiktok.com/ZMabc/')).toBe(true);
    expect(isPlatformUrl('tiktok', 'https://vt.tiktok.com/ZMabc/')).toBe(true);
  });

  it('menolak tautan yang mencampur platform', () => {
    expect(isPlatformUrl('tiktok', 'https://www.instagram.com/p/CxYz/')).toBe(false);
    expect(isPlatformUrl('instagram', 'https://www.tiktok.com/@kelas/video/1')).toBe(false);
  });

  it('menolak domain mirip yang bukan host resmi', () => {
    expect(isPlatformUrl('instagram', 'https://instagram.com.evil.test/p/Cx')).toBe(false);
    expect(isPlatformUrl('instagram', 'https://evilinstagram.com/p/Cx')).toBe(false);
  });

  it('menolak trik userinfo yang menyamarkan host asli', () => {
    expect(isPlatformUrl('instagram', 'https://instagram.com@evil.test/p/Cx')).toBe(false);
  });

  it('menolak skema selain https', () => {
    expect(isPlatformUrl('instagram', 'http://www.instagram.com/p/Cx')).toBe(false);
    expect(isPlatformUrl('instagram', 'javascript:alert(1)')).toBe(false);
    expect(isPlatformUrl('instagram', '//www.instagram.com/p/Cx')).toBe(false);
  });

  it('menolak port dan subdomain tak dikenal', () => {
    expect(isPlatformUrl('instagram', 'https://www.instagram.com:8443/p/Cx')).toBe(false);
    expect(isPlatformUrl('instagram', 'https://m.instagram.com/p/Cx')).toBe(false);
  });
});
