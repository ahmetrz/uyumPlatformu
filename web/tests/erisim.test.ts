import { describe, it, expect } from 'vitest';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

const kisi = (yetkiler: AktifKullanici['yetkiler']): AktifKullanici => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@t', unvan: null, yetkiler,
});
const yetki = (p: Partial<AktifKullanici['yetkiler'][number]>) => ({
  rol: 'katkici', surecId: null, tesisId: null, tuzelKisiId: null,
  regulasyonId: null, modul: null, ...p,
});

describe('RBAC + kapsam (cross-plant sızıntı koruması)', () => {
  it('tesise kısıtlı katkıcı BAŞKA tesisin kaydına yazamaz', () => {
    const k = kisi([yetki({ tesisId: 'MERKEZ' })]);
    expect(izinVar(k, 'uyum', 'yazma', { tesisId: 'ADANA' })).toBe(false);
    expect(izinVar(k, 'uyum', 'yazma', { tesisId: 'MERKEZ' })).toBe(true);
  });

  it('tesise kısıtlı rol kapsamsız (global) yazma yapamaz', () => {
    const k = kisi([yetki({ tesisId: 'MERKEZ' })]);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
  });

  it('sürece kısıtlı yetki başka sürece yazamaz', () => {
    const k = kisi([yetki({ surecId: 'CBDDO-2026' })]);
    expect(izinVar(k, 'uyum', 'yazma', { surecId: 'EPDK-2026', tesisId: 'X' })).toBe(false);
    expect(izinVar(k, 'uyum', 'yazma', { surecId: 'CBDDO-2026', tesisId: 'X' })).toBe(true);
  });

  it('okuyucu hiçbir modüle yazamaz, okuyabilir', () => {
    const k = kisi([yetki({ rol: 'okuyucu' })]);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
    expect(izinVar(k, 'risk', 'okuma')).toBe(true);
  });

  it('dış denetçi yalnız denetim ve uyum okur', () => {
    const k = kisi([yetki({ rol: 'dis_denetci' })]);
    expect(izinVar(k, 'denetim', 'okuma')).toBe(true);
    expect(izinVar(k, 'envanter', 'okuma')).toBe(false);
    expect(izinVar(k, 'denetim', 'yazma')).toBe(false);
  });

  it('katkıcı onay veremez (bulgu kapatma koruması)', () => {
    const k = kisi([yetki({})]);
    expect(izinVar(k, 'uyum', 'onay')).toBe(false);
  });

  it('modül kısıtı diğer modülleri kapatır', () => {
    const k = kisi([yetki({ rol: 'yonetici', modul: 'risk' })]);
    expect(izinVar(k, 'risk', 'yazma')).toBe(true);
    expect(izinVar(k, 'uyum', 'yazma')).toBe(false);
  });

  it('izinliTesisIdleri: kısıtlı kullanıcı yalnız kendi tesislerini görür', () => {
    const k = kisi([yetki({ tesisId: 'A' }), yetki({ tesisId: 'B' })]);
    expect(izinliTesisIdleri(k, 'uyum')).toEqual(['A', 'B']);
    expect(izinliTesisIdleri(kisi([yetki({})]), 'uyum')).toBeNull(); // null = tümü
    expect(izinliTesisIdleri(kisi([]), 'uyum')).toEqual([]); // hiçbiri
  });
});
