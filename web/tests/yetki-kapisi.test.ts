import { describe, expect, it, vi } from 'vitest';
import type { AktifKullanici } from '@/lib/auth';

/* ═══════════════════════════════════════════════════════════════════════
   YETKİ KAPISININ KENDİSİ

   ── Bu dosya neden var ────────────────────────────────────────────────
   Sabotaj koşusu (`node arac/sabotaj.mjs`) bir boşluk buldu:
   `yetkiZorunlu` içindeki izin kontrolü SİLİNDİĞİNDE test paketi
   KIRILMIYORDU. Sebebi şuydu — envanter eylemleri iki aşamalı kapı
   kullanır ve ikinci aşama (`kapsamZorunlu`) hâlâ ayaktaydı; sabotajı
   o yakalıyordu. Ama ikinci aşaması OLMAYAN eylemlerde ilk kapı tek
   savunmadır ve orada hiçbir ölçü yoktu.

   Kapının kendisi burada ölçülür: oturum, demo kilidi ve izin kontrolü.
   Kapsam kapısı ayrıca `tests/kapsam-kapisi.test.ts` içindedir.
   ═══════════════════════════════════════════════════════════════════════ */

const oturum: { k: AktifKullanici | null } = { k: null };

vi.mock('@/lib/auth', async (asil) => {
  const gercek = await asil<typeof import('@/lib/auth')>();
  return { ...gercek, aktifKullanici: async () => oturum.k };
});

const { yetkiZorunlu, kapsamZorunlu, izinVar } = await import('@/lib/erisim');

const kisi = (
  yetkiler: AktifKullanici['yetkiler'], id = 'k1',
): AktifKullanici => ({
  id, adSoyad: 'Test', eposta: 't@t', unvan: null, yetkiler,
});
const yetki = (p: Partial<AktifKullanici['yetkiler'][number]>) => ({
  rol: 'katkici', surecId: null, tesisId: null, tuzelKisiId: null,
  regulasyonId: null, modul: null, ...p,
});

async function firlatir(f: () => Promise<unknown>): Promise<string> {
  try { await f(); return ''; } catch (e) { return (e as Error).message; }
}

describe('yetkiZorunlu · oturum', () => {
  it('oturumsuz çağrı REDDEDİLİR [SIS-KPS-004]', async () => {
    oturum.k = null;
    expect(await firlatir(() => yetkiZorunlu('envanter', 'yazma')))
      .toMatch(/Oturum gerekli/);
  });
});

describe('yetkiZorunlu · izin', () => {
  it('modülde YAZMA izni olmayan rol reddedilir [SIS-KPS-005]', async () => {
    /* Sabotaj koşusunun bulduğu boşluk tam olarak burasıydı: bu satır
       olmadan okuyucu rolü her yazma eyleminden geçerdi. */
    oturum.k = kisi([yetki({ rol: 'okuyucu' })]);
    expect(await firlatir(() => yetkiZorunlu('envanter', 'yazma')))
      .toMatch(/yetkiniz yok \(envanter\/yazma\)/);
  });

  it('izni olan rol GEÇER ve kullanıcıyı döndürür', async () => {
    oturum.k = kisi([yetki({ rol: 'bt_yoneticisi' })]);
    const k = await yetkiZorunlu('envanter', 'yazma');
    expect(k.id).toBe('k1');
  });

  it('BAŞKA modülün yetkisi bu modülü açmaz [SIS-KPS-006]', async () => {
    oturum.k = kisi([yetki({ rol: 'bt_yoneticisi', modul: 'uyum' })]);
    expect(await firlatir(() => yetkiZorunlu('envanter', 'yazma')))
      .toMatch(/yetkiniz yok/);
  });

  it('okuma izni YAZMA izni yerine geçmez', async () => {
    oturum.k = kisi([yetki({ rol: 'okuyucu' })]);
    /* Okuma açıktır — kapı dar değil, doğru sorulmuştur. */
    await expect(yetkiZorunlu('envanter', 'okuma')).resolves.toBeTruthy();
    expect(await firlatir(() => yetkiZorunlu('envanter', 'yazma'))).not.toBe('');
  });

  it('tesise kısıtlı rol KENDİ tesisi için geçer, başkası için geçmez', async () => {
    oturum.k = kisi([yetki({ rol: 'bt_yoneticisi', tesisId: 'A' })]);
    await expect(yetkiZorunlu('envanter', 'yazma', { tesisId: 'A' }))
      .resolves.toBeTruthy();
    expect(await firlatir(() => yetkiZorunlu('envanter', 'yazma', { tesisId: 'B' })))
      .toMatch(/yetkiniz yok/);
  });
});

describe('kapsamZorunlu · ikinci aşama', () => {
  it('kapsam dışı kayıtta verilen MESAJI fırlatır [SIS-KPS-007]', () => {
    const k = kisi([yetki({ rol: 'bt_yoneticisi', tesisId: 'A' })]);
    expect(() => kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: 'B' }, 'Kapsam dışı'))
      .toThrow('Kapsam dışı');
    expect(() => kapsamZorunlu(k, 'envanter', 'yazma', { tesisId: 'A' }, 'Kapsam dışı'))
      .not.toThrow();
  });

  it('santralsiz kayıt kapsamsız yetki ister', () => {
    const kisitli = kisi([yetki({ rol: 'bt_yoneticisi', tesisId: 'A' })]);
    /* Santrali olmayan bir kayıt için soru boş kapsamla sorulur; tesise
       kısıtlı bir rol bunu karşılamaz. */
    expect(izinVar(kisitli, 'envanter', 'yazma', {})).toBe(false);
    const kapsamsiz = kisi([yetki({ rol: 'yonetici' })]);
    expect(izinVar(kapsamsiz, 'envanter', 'yazma', {})).toBe(true);
  });
});
