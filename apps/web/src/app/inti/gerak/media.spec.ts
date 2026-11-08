import { describe, expect, it } from 'vitest';
import { bolehBergerak, gerakDikurangi, penunjukHalus } from './media';

describe('media gerak', () => {
  it('mengembalikan boolean walau matchMedia tidak tersedia', () => {
    expect(typeof gerakDikurangi()).toBe('boolean');
    expect(typeof penunjukHalus()).toBe('boolean');
    expect(typeof bolehBergerak()).toBe('boolean');
  });

  it('tidak mengizinkan gerak saat penunjuk bukan perangkat halus', () => {
    expect(bolehBergerak()).toBe(penunjukHalus() && !gerakDikurangi());
  });
});
