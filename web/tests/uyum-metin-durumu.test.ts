import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   Metin YOKLUĞU gerekçe diye basılmaz [URN-PKT-019]

   `Madde.metin` şemada boş olamaz; yokluk iki SABİTLE taşınır — telifli
   çerçevede "lisans nedeniyle girilmedi", metni aktarılmamış kamuya açık
   çerçevede "metin girilmedi". Uyum defterinin hücre gerekçesi son çare
   olarak madde metninin ilk cümlesini basıyordu ve sabiti tanımadığı için
   kullanıcıya "lisans nedeniyle girilmedi"yi bir DEĞERLENDİRME GEREKÇESİ
   gibi gösteriyordu (bağımsız inceleme bulgusu, PR #43).

   Ölçüm: aktif bir çerçeveye metni olmayan bir madde ve o maddeye
   değerlendirme notu OLMAYAN bir durum kaydı eklenir; hücrenin gerekçesi
   sabit değil, "değerlendirme kaydı yok" cümlesi olmalıdır.
   ═══════════════════════════════════════════════════════════════════════ */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-metin-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { METIN_GELMEDI, TELIFLI_METIN, maddeMetniDurumu } = await import('@/lib/paket/bicim');
const { cerceveleriYukle } = await import('@/app/(kabuk)/(operasyonel)/uyum/veri');

let regKod = '';
const KODLAR = { girilmedi: 'TEST-METIN-YOK', telifli: 'TEST-METIN-TELIF', gercek: 'TEST-METIN-VAR' };

beforeAll(async () => {
  /* Yürüyen bir sürecin kapsamındaki çerçeveye üç madde eklenir: metni
     girilmemiş, telifli ve gerçek metinli. Üçüne de NOTSUZ durum kaydı. */
  const kapsam = await db.surecKapsami.findFirstOrThrow({ include: { surec: { include: { regulasyon: true } } } });
  const surec = kapsam.surec;
  regKod = surec.regulasyon.kod;
  const surum = await db.frameworkSurumu.findFirst({ where: { regulasyonId: surec.regulasyonId, durum: 'aktif' } });
  const metinler = { girilmedi: METIN_GELMEDI, telifli: TELIFLI_METIN, gercek: 'Kuruluş erişim politikasını yılda bir gözden geçirir. İkinci cümle.' };
  for (const [ad, kod] of Object.entries(KODLAR)) {
    const madde = await db.madde.create({
      data: { regulasyonId: surec.regulasyonId, surumId: surum?.id ?? null, kod, baslik: `Ölçüm maddesi ${ad}`, metin: metinler[ad as keyof typeof metinler], sira: 900 },
    });
    await db.maddeDurumu.create({
      data: { surecId: surec.id, maddeId: madde.id, kapsamOgesiId: kapsam.kapsamOgesiId, durum: 'kismi', guven: 'oz_degerlendirme', kanitBayat: false },
    });
  }
});

describe('metin yokluğu sabitleri gerekçe olarak basılmaz [URN-PKT-019]', () => {
  it('maddeMetniDurumu üç hâli ayırır: var · girilmedi · lisans', () => {
    expect(maddeMetniDurumu('Gerçek metin')).toBe('var');
    expect(maddeMetniDurumu(METIN_GELMEDI)).toBe('girilmedi');
    expect(maddeMetniDurumu('metin paketle gelmedi')).toBe('girilmedi'); // eski sabit, kurulu veride kalmış olabilir
    expect(maddeMetniDurumu(TELIFLI_METIN)).toBe('lisans');
    expect(maddeMetniDurumu('')).toBe('girilmedi');
    expect(maddeMetniDurumu(null)).toBe('girilmedi');
  });

  it('notsuz hücrede sabit gerekçe olmaz; gerçek metin ilk cümlesiyle gerekçe olur [URN-PKT-019]', async () => {
    const cerceve = (await cerceveleriYukle(null)).find((c) => c.kod === regKod);
    expect(cerceve, `${regKod} çerçevesi yüklenmedi`).toBeTruthy();
    const hucreler = cerceve!.satirlar.flatMap((s) => s.kontroller);
    const bul = (kod: string) => hucreler.filter((k) => k.kod.endsWith(kod));
    for (const kod of [KODLAR.girilmedi, KODLAR.telifli]) {
      const bulunan = bul(kod);
      expect(bulunan.length, `${kod} hücresi yok — ölçüm boşa gitti`).toBeGreaterThan(0);
      for (const k of bulunan) {
        expect(k.gerekce, `${kod}: metin yokluğu sabiti gerekçe diye basıldı`).toBe('Bu kontrol için değerlendirme kaydı yok.');
      }
    }
    const gercek = bul(KODLAR.gercek);
    expect(gercek.length).toBeGreaterThan(0);
    expect(gercek[0].gerekce).toBe('Kuruluş erişim politikasını yılda bir gözden geçirir.');
  });
});
