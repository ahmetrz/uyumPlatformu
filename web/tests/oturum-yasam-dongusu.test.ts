import { beforeEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Oturum yaşam döngüsü.

   Kapatılan kusur: `Oturum.sonKullanim` sütunu şemada vardı, varsayılanı
   vardı ve HİÇ YAZILMIYORDU. Yani atıl zaman aşımı diye bir kontrol
   YOKTU ama şemaya bakan biri VAR sanırdı. Açık bırakılmış bir tarayıcı
   on iki saat boyunca tam yetkiyle canlıydı.

   İkinci kusur: hesap pasifleştirmek açık oturum satırlarını
   bırakıyordu ve denetim izine hiçbir şey yazmıyordu. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-oturum-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { oturumGecerli, tumOturumlariKapat, dolmusOturumlariTemizle, parolaOzetle } =
  await import('@/lib/auth');

const SIMDI = new Date('2026-09-01T12:00:00Z');
const saatOnce = (s: number) => new Date(SIMDI.getTime() - s * 3_600_000);

describe('Oturum geçerliliği — iki eşik birlikte', () => {
  it('taze oturum geçerlidir', () => {
    expect(oturumGecerli({ bitis: saatOnce(-6), sonKullanim: saatOnce(0.1) }, SIMDI).gecerli)
      .toBe(true);
  });

  it('MUTLAK süre dolmuşsa, az önce kullanılmış olsa bile düşer [OTR-OTR-001]', () => {
    /* Kayan bir mutlak süre, çalınmış bir çerezi sonsuza dek geçerli
       kılardı: saldırgan her saat bir istek atarak oturumu diri tutardı. */
    const s = oturumGecerli({ bitis: saatOnce(1), sonKullanim: saatOnce(0.01) }, SIMDI);
    expect(s.gecerli).toBe(false);
    if (!s.gecerli) expect(s.sebep).toBe('mutlak_sure_doldu');
  });

  it('ATIL kalmışsa, mutlak süresi dolmamış olsa bile düşer', () => {
    const s = oturumGecerli({ bitis: saatOnce(-6), sonKullanim: saatOnce(3) }, SIMDI);
    expect(s.gecerli).toBe(false);
    if (!s.gecerli) expect(s.sebep).toBe('atil_kaldi');
  });

  it('atıl eşiğinin hemen altı geçerli, hemen üstü değil', () => {
    expect(oturumGecerli({ bitis: saatOnce(-6), sonKullanim: saatOnce(1.9) }, SIMDI).gecerli)
      .toBe(true);
    expect(oturumGecerli({ bitis: saatOnce(-6), sonKullanim: saatOnce(2.1) }, SIMDI).gecerli)
      .toBe(false);
  });
});

describe('Toplu oturum sonlandırma', () => {
  let kullaniciId = '';

  beforeEach(async () => {
    const k = await db.kullanici.create({
      data: {
        adSoyad: 'Oturum Testi', eposta: `oturum-${Date.now()}@ornek.test`,
        parolaHash: parolaOzetle('gecici-parola-1234'), aktif: true,
      },
    });
    kullaniciId = k.id;
    for (let i = 0; i < 3; i += 1) {
      await db.oturum.create({
        data: {
          kullaniciId, tokenHash: `test-hash-${k.id}-${i}`,
          bitis: new Date(SIMDI.getTime() + 6 * 3_600_000),
        },
      });
    }
  });

  it('kullanıcının TÜM oturumlarını keser ve sayısını söyler', async () => {
    expect(await tumOturumlariKapat(kullaniciId)).toBe(3);
    expect(await db.oturum.count({ where: { kullaniciId } })).toBe(0);
  });

  it('başka kullanıcının oturumuna DOKUNMAZ [OTR-HSP-002]', async () => {
    const oncekiToplam = await db.oturum.count();
    await tumOturumlariKapat(kullaniciId);
    expect(await db.oturum.count()).toBe(oncekiToplam - 3);
  });

  it('süresi dolmuş oturumlar temizlenir, canlı olan durur', async () => {
    await db.oturum.create({
      data: {
        kullaniciId, tokenHash: `test-hash-${kullaniciId}-dolmus`,
        bitis: saatOnce(1),
      },
    });
    const silinen = await dolmusOturumlariTemizle(SIMDI);
    expect(silinen).toBeGreaterThanOrEqual(1);
    expect(await db.oturum.count({ where: { kullaniciId } })).toBe(3);
  });
});
