import { describe, expect, it } from 'vitest';
import { izinVar, KAPSAM_SONRA } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';

/* ═══════════════════════════════════════════════════════════════════════
   İKİ AŞAMALI KAPI — `KAPSAM_SONRA`

   Sorun: bulgu/aksiyon eylemleri kaydın santralini okumadan önce
   `yetkiZorunlu('uyum','yazma')` (kapsamsız) çağırıyordu; `kapsamUyar`
   kuralı gereği TESİSE KISITLI her rol daha kapsam kontrolüne gelmeden
   reddediliyordu — ekran (kapsamlı `izinVar`) "yazabilirsin" derken
   sunucu "yetkin yok" diyordu. `KAPSAM_SONRA` ön kapıyı "bu modülde bu
   işlem için bir rolü var mı" sorusuna indirir; gerçek kapsam kaydı
   okuduktan sonra sorulur. Bu test o iki sorunun farkını sabitler.
   ═══════════════════════════════════════════════════════════════════════ */

const kisi = (yetkiler: AktifKullanici['yetkiler']): AktifKullanici => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@test', unvan: null, yetkiler,
});
const yetki = (rol: string, tesisId: string | null): AktifKullanici['yetkiler'][number] =>
  ({ rol, tesisId, surecId: null, tuzelKisiId: null, regulasyonId: null, modul: null }) as
  AktifKullanici['yetkiler'][number];

describe('KAPSAM_SONRA — tesise kısıtlı rol ön kapıdan geçer, gerçek kapsamda denetlenir', () => {
  const kisitli = kisi([yetki('tesis_yoneticisi', 'T-1')]);
  const okuyucu = kisi([yetki('okuyucu', 'T-1')]);
  const global = kisi([yetki('yonetici', null)]);

  it('kapsamsız çağrı tesise kısıtlı rolü peşinen reddeder (eski kusur)', () => {
    expect(izinVar(kisitli, 'uyum', 'yazma')).toBe(false);
  });
  it('KAPSAM_SONRA ön kapısı rolü olan herkesi geçirir, rolü olmayanı geçirmez', () => {
    expect(izinVar(kisitli, 'uyum', 'yazma', KAPSAM_SONRA)).toBe(true);
    expect(izinVar(global, 'uyum', 'yazma', KAPSAM_SONRA)).toBe(true);
    expect(izinVar(okuyucu, 'uyum', 'yazma', KAPSAM_SONRA)).toBe(false);
  });
  it('gerçek kapsam kaydın santraline göre karar verir', () => {
    expect(izinVar(kisitli, 'uyum', 'yazma', { tesisId: 'T-1', surecId: null })).toBe(true);
    expect(izinVar(kisitli, 'uyum', 'yazma', { tesisId: 'T-2', surecId: null })).toBe(false);
    expect(izinVar(global, 'uyum', 'yazma', { tesisId: 'T-2', surecId: null })).toBe(true);
  });
  it('KAPSAM_SONRA tek başına yetki VERMEZ: modül/işlem eşleşmesi aranır', () => {
    expect(izinVar(kisitli, 'yonetim', 'yazma', KAPSAM_SONRA)).toBe(false);
    expect(izinVar(kisitli, 'uyum', 'onay', KAPSAM_SONRA)).toBe(false);
  });
});
