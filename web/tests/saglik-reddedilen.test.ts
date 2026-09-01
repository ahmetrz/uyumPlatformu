import { beforeAll, describe, expect, it, vi } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
// Yalnız TİP: derlemede silinir, TEST_DB kuralını bozmaz.
import type { RedSatiri } from '@/app/(kabuk)/(operasyonel)/saglik/reddedilenler/mantik';

/* Dead-letter (reddedilen kayıt) inceleme kuyruğu.

   Korunan cümleler:
   1. `esleme` (eşleme profilinin alan çevirisi) ile `eslesme` (CMDB
      eşleştirmesi) AYRI aşamalardır ve ekranda ayrı okunur; karıştırılmaları
      kullanıcıyı yanlış yerde düzeltme aramaya gönderir.
   2. 'Yok sayıldı' YEŞİL DEĞİLDİR: bilinçli bir karardır ama kaynaktaki
      sorunun çözüldüğü anlamına gelmez.
   3. Notsuz kapatma YOKTUR — notsuz kapatılan bir kayıt, kapatılmamış bir
      kayıttan daha yanıltıcıdır. */
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-red-'));
const testDb = path.join(dizin, 't.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const oturum = vi.hoisted(() => ({ token: null as string | null }));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (ad: string) =>
      ad === 'oturum' && oturum.token ? { name: ad, value: oturum.token } : undefined,
    set: () => {},
    delete: () => {},
  }),
}));

const { db } = await import('@/lib/db');
const { redKaydiIncele } = await import('@/lib/eylemler2/reddedilenKayit');
const R = await import('@/app/(kabuk)/(operasyonel)/saglik/reddedilenler/mantik');

let kayitId = '';
let kullaniciId = '';

const satir = (ozel: Partial<RedSatiri> = {}): RedSatiri => ({
  id: 'r1', kaynakSistem: 'ornek.local', kaynakKayitId: 'k-1',
  asama: 'dogrulama', sebep: 'eşleme anahtarı yok', durum: 'acik',
  connectorAdi: 'Tezgâh', inceleyen: null, incelemeNotu: null,
  incelemeZamani: null, olusturuldu: '2026-08-31T10:00:00.000Z',
  hamJson: '{}', ...ozel,
});

beforeAll(async () => {
  const kisi = await db.kullanici.create({ data: {
    eposta: 'red.kuyrugu@ornek.local', adSoyad: 'Red Kuyruğu', aktif: true } });
  kullaniciId = kisi.id;
  await db.yetki.create({ data: { kullaniciId: kisi.id, rol: 'yonetici' } });

  const token = randomBytes(32).toString('base64url');
  await db.oturum.create({ data: {
    kullaniciId: kisi.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    bitis: new Date(Date.now() + 3_600_000) } });
  oturum.token = token;

  const r = await db.reddedilenKayit.create({ data: {
    kaynakSistem: 'entra.ornek.local', kaynakKayitId: 'AD:0001',
    asama: 'eslesme', sebep: 'CMDB\'de eşleşecek varlık yok',
    hamJson: '{"hostname":"ot-fw-01"}', durum: 'acik' } });
  kayitId = r.id;
});

describe('Aşama sözlüğü: esleme ≠ eslesme', () => {
  it('iki aşama ayrı yazılır ve ayrı açıklanır', () => {
    expect(R.asamaYazisi('esleme')).not.toBe(R.asamaYazisi('eslesme'));
    expect(R.asamaYazisi('esleme')).toMatch(/alan çevirisi/);
    expect(R.asamaYazisi('eslesme')).toMatch(/CMDB/);
    // Düzeltmenin NEREDE yapılacağı da ayrıdır.
    expect(R.ASAMA_ACIKLAMA.esleme).toMatch(/profil kural/);
    expect(R.ASAMA_ACIKLAMA.eslesme).toMatch(/envanter/);
  });

  it('sözlükte olmayan aşama uydurulmaz, kendi adıyla yazılır', () => {
    expect(R.asamaYazisi('bilinmeyen_asama')).toBe('bilinmeyen_asama');
    expect(R.ASAMA_ACIKLAMA.bilinmeyen_asama).toBeUndefined();
  });
});

describe('"Yok sayıldı" çözülmüş demek değildir', () => {
  it('yok sayılan kayıt YEŞİL işaretlenmez', () => {
    expect(R.redImi(satir({ durum: 'yok_sayildi' }))).toBe('unk');
    expect(R.redImi(satir({ durum: 'yok_sayildi' }))).not.toBe('ok');
    expect(R.redImi(satir({ durum: 'duzeltildi' }))).toBe('ok');
    expect(R.redImi(satir({ durum: 'incelendi' }))).toBe('md');
    expect(R.redImi(satir({ durum: 'acik' }))).toBe('bd');
  });

  it('kuyruğa YALNIZ düzeltilmiş kayıt iner', () => {
    expect(R.redToplanabilir(satir({ durum: 'duzeltildi' }))).toBe(true);
    for (const d of ['acik', 'incelendi', 'yok_sayildi']) {
      expect(R.redToplanabilir(satir({ durum: d }))).toBe(false);
    }
  });

  it('metrikler açık/incelendi/yok sayıldı/düzeltildi kovalarını ayırır', () => {
    const m = R.redMetrikleri([
      satir({ id: 'a', durum: 'acik', asama: 'esleme' }),
      satir({ id: 'b', durum: 'acik', asama: 'esleme' }),
      satir({ id: 'c', durum: 'acik', asama: 'kapsam' }),
      satir({ id: 'd', durum: 'yok_sayildi' }),
      satir({ id: 'e', durum: 'duzeltildi' }),
    ]);
    expect(m).toMatchObject({ acik: 3, incelendi: 0, yokSayildi: 1, duzeltildi: 1 });
    expect(m.baskinAsama).toEqual({ asama: 'esleme', adet: 2 });
    // Kayıt yoksa baskın aşama SIFIR değil, null'dur.
    expect(R.redMetrikleri([]).baskinAsama).toBeNull();
  });
});

describe('Notsuz kapatma yok', () => {
  it('karar düğmesi notsuz açılmaz; "acik"e geri alma not istemez', () => {
    expect(R.redKararPasif(['r1'], 'yok_sayildi', '', true, false)).toBe(true);
    expect(R.redKararPasif(['r1'], 'yok_sayildi', 'kaynak hatası', true, false)).toBe(false);
    expect(R.redKararPasif(['r1'], 'acik', '', true, false)).toBe(false);
    expect(R.redKararPasif([], 'acik', '', true, false)).toBe(true);
    expect(R.redKararPasif(['r1'], 'acik', '', false, false)).toBe(true);
  });

  it('sunucu da notsuz kapatmayı reddeder ve kaydı DEĞİŞTİRMEZ', async () => {
    const y = await redKaydiIncele({ idler: [kayitId], durum: 'yok_sayildi' });
    expect(y.ok).toBe(false);
    if (!y.ok) expect(y.hata).toMatch(/notu zorunlu/i);
    const r = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: kayitId } });
    expect(r.durum).toBe('acik');
    expect(r.inceleyenId).toBeNull();
  });

  it('notlu karar yazılır, kayıt SİLİNMEZ ve kendi iz satırını bırakır', async () => {
    const y = await redKaydiIncele({
      idler: [kayitId], durum: 'yok_sayildi',
      not: 'Kaynak sistemde test kaydı; envantere girmemeli.',
    });
    expect(y.ok).toBe(true);

    const r = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: kayitId } });
    expect(r.durum).toBe('yok_sayildi');
    expect(r.inceleyenId).toBe(kullaniciId);
    expect(r.incelemeNotu).toMatch(/test kaydı/);
    // Ham kayıt korunur: kusurun kanıtı silinmez.
    expect(r.hamJson).toBe('{"hostname":"ot-fw-01"}');

    const iz = await db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'ReddedilenKayit', varlikId: kayitId },
      orderBy: { zaman: 'desc' },
    });
    expect(iz).not.toBeNull();
    expect(iz!.oncekiDeger).toBe('acik');
    expect(iz!.yeniDeger).toBe('yok_sayildi');
    // Gerekçe hangi aşamada düştüğünü de taşır.
    expect(iz!.gerekce).toContain('eslesme');
  });

  it('bulunamayan kayıt sessizce atlanmaz — hiçbiri değiştirilmez', async () => {
    const y = await redKaydiIncele({
      idler: [kayitId, 'yok-boyle-bir-kayit'], durum: 'incelendi', not: 'x' });
    expect(y.ok).toBe(false);
    if (!y.ok) expect(y.hata).toMatch(/hiçbiri değiştirilmedi/);
    const r = await db.reddedilenKayit.findUniqueOrThrow({ where: { id: kayitId } });
    expect(r.durum).toBe('yok_sayildi');
  });
});
