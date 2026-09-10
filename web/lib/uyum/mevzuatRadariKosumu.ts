/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI · KOŞUM — TEK NÜSHA, İKİ ÇAĞIRAN

   Döngü burada; motor (`lib/motorlar/mevzuatRadari.ts`) ve tohum ikisi
   de bunu çağırır — `bildirimDonemiAcma.ts` ile aynı gerekçe: motor
   `server-only` taşır, tohum düz Node'da koşar.

   ── AĞ ENJEKTE EDİLİR, GÖMÜLMEZ ──────────────────────────────────────
   `getir` dışarıdan verilir. Üretimde ince bir `fetch` sarmalayıcısı,
   testte SAHTE bir kaynak. Gömülü bir `fetch`, "engelli kaynağa istek
   gönderilmiyor" iddiasını ancak ağa çıkan bir testle ölçülebilir
   yapardı ve ağa çıkan test bu depoda KIRMIZIDIR.

   ── MOTOR ÖNERİR, İNSAN KARAR VERİR ──────────────────────────────────
   Bu döngünün yazabildiği ŞEYLER: `MevzuatTaramasi` (koşum kaydı),
   `MevzuatDegisiklikAdayi` (öneri), `MevzuatKaynagi.durum` ·
   `.durumNotu` · `.sonTarama` (kaynağın kendi hâli).

   Yazamadıkları: adayın `durum`u insan kararıdır; `Regulasyon`,
   `CerceveSurumu` ve `MevzuatKaynagi.etkin` bu dosyadan HİÇ
   değişmez — bir uyum ürününde mevzuatın değiştiğine karar vermek bir
   tarayıcının işi değildir.

   ── MOTORUN YAZDIĞI DA İZ BIRAKIR ─────────────────────────────────────
   Ölçüldü (bağımsız inceleme, PR #50 tur 1): bu döngü kaynağın durumunu
   değiştiriyor ve aday açıyordu ama HİÇBİR `iz()` yazmıyordu — bir
   kaynağın `hazir → engelli` geçişi denetim izinde hiç görünmüyordu.
   Aynı depoda `bildirimDonemiAcma.ts` motor kaynaklı her geçişi
   `$transaction` içinde izliyordu; bu dosya "aynı gerekçe" diye ona
   atıf yapıp yapmıyordu. Bugün:

     · Kaynağın DURUMU değiştiğinde iz düşer (aktör YOK — kararı insan
       vermedi ve iz bunu saklamaz, adıyla söyler).
     · Açılan HER aday iz bırakır: aday insanın önüne konan bir öneridir.
     · Durum DEĞİŞMEDİYSE iz düşmez; koşumun kendi kaydı zaten
       `MevzuatTaramasi` satırıdır ve o tablo yalnız eklenir. Her günlük
       taramaya bir iz satırı yazmak, kaynak başına yılda 365 satırla
       denetim izini okunmaz yapardı — iz DEĞİŞİKLİĞİN kaydıdır.

   ── BİR KAYNAK, BİR İŞLEM ─────────────────────────────────────────────
   Adaylar, tarama kaydı ve kaynağın yeni hâli TEK `$transaction` içinde
   yazılır. Ayrı yazılsalardı bir çökme, adayları yazılmış ama taraması
   ve `sonTarama`sı kaydedilmemiş bir kaynak bırakırdı: ertesi koşu
   kotayı dolmamış sayıp aynı kaynağa yeniden istek gönderirdi. AĞ
   çağrıları işlemin DIŞINDADIR — bir işlemi ağ beklerken açık tutmak,
   veritabanını uzak bir sunucunun hızına bağlamaktır.
   ═══════════════════════════════════════════════════════════════════════ */

import type { db as Db } from '../db';
import { iz } from '../eylemler2/ortak';
import { ayristir } from '../mevzuat/ayristir';
import {
  DURUM_SOZU, type Getirme, type Giris, getirmeKarari, kotaVar, robotsIzni,
  yeniGirisler,
} from '../mevzuat/radar';

export type RadarKosusu = {
  /** Kotası dolmadığı ve engelli olmadığı için GERÇEKTEN taranan kaynak. */
  taranan: number;
  /** Bugün zaten taranmış olduğu için atlanan. */
  kotaBekleyen: number;
  /** robots.txt ya da anti-bot yüzünden istek GÖNDERİLMEYEN. */
  engelli: number;
  /** Bakıldı ama sonuç KARŞILAŞTIRILAMADI (farkVar null). */
  bilinmeyen: number;
  /** Bu koşuda açılan aday sayısı. */
  acilanAday: number;
};

export type RadarGirdisi = {
  getir: (url: string) => Promise<Getirme>;
  simdiMs?: number;
};

/** Kaynağın kökünden robots.txt adresi. */
export function robotsAdresi(kanal: string): string | null {
  try { return new URL('/robots.txt', kanal).toString(); } catch { return null; }
}

export async function mevzuatRadariniKos(
  istemci: typeof Db, o: RadarGirdisi,
): Promise<RadarKosusu> {
  const simdiMs = o.simdiMs ?? Date.now();
  const sonuc: RadarKosusu = {
    taranan: 0, kotaBekleyen: 0, engelli: 0, bilinmeyen: 0, acilanAday: 0,
  };

  /* ETKİN OLMAYAN KAYNAĞA HİÇ BAKILMAZ. `etkin` varsayılan olarak
     false'tur: ürün kurulur kurulmaz dışarı çıkmaz. */
  const kaynaklar = await istemci.mevzuatKaynagi.findMany({
    where: { etkin: true },
    select: {
      id: true, kod: true, yayinKanali: true, tur: true, durum: true,
      sonTarama: true,
    },
    orderBy: { kod: 'asc' },
  });

  for (const kaynak of kaynaklar) {
    if (kaynak.durum === 'engelli') { sonuc.engelli += 1; continue; }
    if (!kotaVar(kaynak.sonTarama, simdiMs)) { sonuc.kotaBekleyen += 1; continue; }

    /* ── 1) ROBOTS.TXT ÖNCE ────────────────────────────────────────────
       Kaynağın kendi sayfasına istek göndermeden ÖNCE sorulur. Sıra
       tersine dönerse ürün, izin vermeyen bir kaynağa en az bir kez
       istek göndermiş olur ve kural kâğıt üstünde kalır. */
    const rAdres = robotsAdresi(kaynak.yayinKanali);
    if (rAdres === null) {
      await taramaYaz(istemci, kaynak, {
        farkVar: null, sebep: 'yayın kanalı geçerli bir adres değil',
        httpKodu: null, durum: 'hata', durumNotu: 'adres çözülemedi',
      }, simdiMs);
      sonuc.bilinmeyen += 1;
      continue;
    }
    const robots = await o.getir(rAdres);
    if (!robots.ok) {
      /* 404 "izin var" demektir (RFC 9309). Diğer her okunamama hâlinde
         BEKLERİZ: anlayamadığımız bir kuralı yok saymak yerine. */
      const yok = robots.httpKodu === 404 || robots.httpKodu === 410;
      if (!yok) {
        await taramaYaz(istemci, kaynak, {
          farkVar: null,
          sebep: `robots.txt okunamadı (HTTP ${robots.httpKodu ?? '—'}) — beklendi`,
          httpKodu: robots.httpKodu, durum: 'hata',
          durumNotu: 'robots.txt okunamadığı için istek gönderilmedi',
        }, simdiMs);
        sonuc.bilinmeyen += 1;
        continue;
      }
    } else {
      const yol = new URL(kaynak.yayinKanali).pathname;
      const izin = robotsIzni(robots.govde, yol);
      if (!izin.izin) {
        await taramaYaz(istemci, kaynak, {
          farkVar: null, sebep: izin.sebep, httpKodu: null,
          durum: 'engelli',
          durumNotu: 'robots.txt otomatik erişime kapatıyor. ELLE izlenir;'
            + ' ürün bu engeli aşmaz.',
        }, simdiMs);
        sonuc.engelli += 1;
        continue;
      }
    }

    /* ── 2) KAYNAĞIN KENDİSİ ───────────────────────────────────────── */
    const yanit = await o.getir(kaynak.yayinKanali);
    sonuc.taranan += 1;
    const kotu = getirmeKarari(yanit);
    if (kotu) {
      await taramaYaz(istemci, kaynak, kotu, simdiMs);
      sonuc.bilinmeyen += 1;
      if (kotu.durum === 'engelli') sonuc.engelli += 1;
      continue;
    }
    if (!yanit.ok) continue; /* tip daraltma — `kotu` null ise ok true */

    /* ── 3) AYRIŞTIR ───────────────────────────────────────────────── */
    const a = ayristir(kaynak.tur, yanit.govde, kaynak.yayinKanali);
    if (!a.tanindi) {
      /* BİÇİM TANINMADIYSA "fark yok" DEĞİL "bilinmiyor". */
      await taramaYaz(istemci, kaynak, {
        farkVar: null, sebep: `biçim okunamadı: ${a.sebep}`,
        httpKodu: yanit.httpKodu, durum: 'hata',
        durumNotu: a.sebep,
      }, simdiMs);
      sonuc.bilinmeyen += 1;
      continue;
    }

    /* ── 4) YENİ ADAYLAR ───────────────────────────────────────────── */
    const bilinen = await istemci.mevzuatDegisiklikAdayi.findMany({
      where: { kaynakId: kaynak.id }, select: { url: true },
    });
    const yeniler = yeniGirisler(a.girisler, bilinen.map((b) => b.url));
    sonuc.acilanAday += yeniler.length;

    /* Adaylar da tarama da AYNI işlemde yazılır — yarısı yazılmış bir
       koşum, kotayı dolmamış gösterip aynı kaynağa ikinci kez istek
       gönderirdi. */
    await taramaYaz(istemci, kaynak, {
      farkVar: yeniler.length > 0, sebep: null, httpKodu: yanit.httpKodu,
      durum: 'hazir', durumNotu: null,
    }, simdiMs, yeniler);
  }

  return sonuc;
}

/** Tarama sonucu — kaynağın yeni hâli. */
type TaramaSonucu = {
  farkVar: boolean | null; sebep: string | null; httpKodu: number | null;
  durum: string; durumNotu: string | null;
};

/** İz kaydına yazılacak kaynak — ÖNCEKİ durumu da taşır. */
type IzlenenKaynak = { id: string; kod: string; durum: string };

/**
 * Bir kaynağın koşum sonucunu TEK İŞLEMDE yazar: adaylar → tarama →
 * kaynağın yeni hâli → iz kayıtları.
 *
 * Ağ çağrıları buraya GELMEDEN yapılmıştır; işlem yalnız yazma sürer.
 */
async function taramaYaz(
  istemci: typeof Db, kaynak: IzlenenKaynak, s: TaramaSonucu,
  simdiMs: number, adaylar: readonly Giris[] = [],
): Promise<void> {
  const durumDegisti = kaynak.durum !== s.durum;
  await istemci.$transaction(async (tx) => {
    for (const g of adaylar) {
      const aday = await tx.mevzuatDegisiklikAdayi.create({
        data: {
          kaynakId: kaynak.id, url: g.url, baslik: g.baslik,
          yayinTarihi: g.yayinTarihi, ozet: g.ozet,
        },
      });
      /* Aday bir ÖNERİDİR ve önerinin de kaydı olur: insan bir gün
         "bu satır önüme nereden geldi" diye sorduğunda cevap burada. */
      await iz({
        aktorId: null, varlikTipi: 'MevzuatDegisiklikAdayi', varlikId: aday.id,
        eylem: 'olusturma', alan: 'durum', once: null,
        sonra: 'Yeni — inceleme bekliyor',
        gerekce: `motor · ${kaynak.kod} · ${g.url}`,
      }, tx);
    }

    await tx.mevzuatTaramasi.create({
      data: {
        kaynakId: kaynak.id, zaman: new Date(simdiMs), farkVar: s.farkVar,
        sebep: s.sebep, httpKodu: s.httpKodu, adaySayisi: adaylar.length,
      },
    });

    /* Kaynağın kendi hâli güncellenir — `etkin` ASLA. */
    await tx.mevzuatKaynagi.update({
      where: { id: kaynak.id },
      data: { durum: s.durum, durumNotu: s.durumNotu, sonTarama: new Date(simdiMs) },
    });

    if (durumDegisti) {
      await iz({
        aktorId: null, varlikTipi: 'MevzuatKaynagi', varlikId: kaynak.id,
        eylem: 'guncelleme', alan: 'durum',
        once: DURUM_SOZU[kaynak.durum] ?? kaynak.durum,
        sonra: DURUM_SOZU[s.durum] ?? s.durum,
        gerekce: `motor · ${kaynak.kod} · ${s.durumNotu ?? s.sebep ?? 'tarama sonucu'}`,
      }, tx);
    }
  });
}
