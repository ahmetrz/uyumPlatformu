/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU · DIŞA AKTARIM (CSV + XLSX) — SAF

   Aynı form iki biçimde çıkar ve İKİSİ DE AYNI satırlardan üretilir.
   İki ayrı üretici yazmak, birinde düzeltilen bir kuralı öbüründe
   bayatlatır — ölçüldü: kanıt paketinin sır süzgeci tek nüsha olduğu
   için iki hattı da aynı anda kapatabildi.

   ── KÜNYE UYDURULMAZ ──────────────────────────────────────────────────
   Formun başındaki künye (kim, hangi çerçeve, hangi kapsam, ne zaman)
   ÇAĞIRANDAN gelir. Burada "Kurum: —" gibi bir varsayılan yazmak, boş
   hücrenin künyeye taşınmış hâli olurdu; künye alanı da ölçülmemişse
   "Değerlendirilmedi" der.

   ── İKİ KAPI SERİLEŞTİRMEDEN ÖNCE KOŞAR ───────────────────────────────
   `bosHucreKapisi` ve SIR SÜZGECİ. Sonra çağırmak, denetçiye giden
   dosyayı üretip ardından "aslında kusurluydu" demek olurdu.

   Sır süzgeci kanıt paketiyle AYNI süzgeçtir (`paketiDenetle`) ve bu
   bilinçli: form serbest metin taşır — kapsam gerekçesi, sorumlu adı,
   `not` alanı. Bir operatör oraya bir bağlantı dizesi ya da bir
   `Authorization` başlığı yapıştırırsa, o metin denetçiye giden dosyada
   çıkar. İkinci bir süzgeç yazmak, birinde düzeltilen kuralı öbüründe
   bayatlatırdı; ölçüldü ve kanıt paketinde tek nüsha olması iki hattı
   birden kapatmayı sağladı. */

import { csvMetni, type Hucre } from '@/lib/disaAktarim/csv';
import { paketiDenetle } from '@/lib/disaAktarim/paket';
import { xlsxKitabi, type XlsxSayfasi } from '@/lib/disaAktarim/xlsx';
import {
  DEGERLENDIRILMEDI, bosHucreKapisi, formOlcumu,
  type FormHucresi, type FormOlcumu,
} from './formDoldurma';

export type Sutun = { anahtar: string; etiket: string };

export type FormBolumu = {
  ad: string;
  sutunlar: readonly Sutun[];
  satirlar: readonly { hucreler: FormHucresi[] }[];
};

export type Kunye = {
  baslik: string;
  /** Sıra korunur; değeri `null` olan alan "Değerlendirilmedi" der. */
  alanlar: readonly { etiket: string; deger: string | null }[];
};

/** Künye satırları — iki biçimde de aynı. */
export function kunyeSatirlari(k: Kunye): Hucre[][] {
  return [
    [k.baslik],
    ...k.alanlar.map((a) => [a.etiket, a.deger === null || a.deger.trim() === ''
      ? DEGERLENDIRILMEDI : a.deger] as Hucre[]),
    [],
  ];
}

function bolumSatirlari(b: FormBolumu): Hucre[][] {
  return [
    b.sutunlar.map((s) => s.etiket),
    ...b.satirlar.map((s) => s.hucreler.map((h) => h.deger as Hucre)),
  ];
}

/** İKİ KAPI: boş hücre ve sır süzgeci. Sırayla, serileştirmeden ÖNCE. */
function kapilar(bolumler: readonly FormBolumu[]): void {
  bosHucreKapisi(formlarinOlcumu(bolumler));
  /* Süzgeç JSON üstünde çalışır; form satırlarının gövdesi ona verilir.
     Sızıntı varsa FIRLATIR — maskeleyip geçmek, bir dahaki sütun
     eklendiğinde sessiz sızıntı demektir. */
  paketiDenetle(JSON.stringify(bolumler.map((b) => ({
    ad: b.ad,
    satirlar: b.satirlar.map((s) => s.hucreler.map((h) => h.deger)),
  }))));
}

/** Bütün bölümlerin toplam ölçümü — kapı ve rapor için. */
export function formlarinOlcumu(bolumler: readonly FormBolumu[]): FormOlcumu {
  return formOlcumu(bolumler.flatMap((b) => b.satirlar.map(
    (s) => ({ maddeKod: '', hucreler: s.hucreler, isaretler: [] }),
  )));
}

/**
 * CSV: TEK dosya, bölümler alt alta ve aralarında bölüm başlığı.
 *
 * CSV'nin sayfası yoktur; bölümü bir başlık satırıyla ayırmak, denetçinin
 * dosyayı Excel'de açıp süzmesini bozmadan yapılabilecek en dürüst şey.
 */
export function formCsv(kunye: Kunye, bolumler: readonly FormBolumu[]): string {
  kapilar(bolumler);
  const satirlar: Hucre[][] = [...kunyeSatirlari(kunye)];
  for (const b of bolumler) {
    satirlar.push([b.ad]);
    satirlar.push(...bolumSatirlari(b));
    satirlar.push([]);
  }
  return csvMetni(satirlar);
}

/**
 * XLSX: her bölüm KENDİ SAYFASINDA, künye ilk sayfada.
 *
 * Bölümleri tek sayfaya yığmak, 3 800 maddelik bir çerçevede formu
 * okunamaz yapardı; denetçinin çalışma kitabı istemesinin sebebi de bu.
 */
export function formXlsx(kunye: Kunye, bolumler: readonly FormBolumu[]): Buffer {
  kapilar(bolumler);
  const sayfalar: XlsxSayfasi[] = [
    { ad: 'Künye', satirlar: kunyeSatirlari(kunye) },
    ...bolumler.map((b) => ({ ad: b.ad, satirlar: bolumSatirlari(b) })),
  ];
  return xlsxKitabi(sayfalar);
}
