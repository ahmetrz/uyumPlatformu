import { mkdtempSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { FiksturSeti } from '@/lib/entegrasyon/sertifika';

/* ═══════════════════════════════════════════════════════════════════════
   SERTİFİKASYON FİKSTÜRLERİ — ortak yardımcılar

   ── Bu klasördeki HİÇBİR dosya üretimde yüklenmez ────────────────────
   Fikstürler `tests/` altındadır; `app/` ve `lib/` grafiğinden hiçbir
   import buraya girmez, dolayısıyla `next build` çıktısına giremezler.
   (Alternatif — `lib/entegrasyon/fixture/` + next.config.ts dışlaması —
   bilinçli olarak seçilmedi: derleme yapılandırmasına bağlı bir sınır,
   yanlışlıkla kaldırılabilen bir sınırdır.)

   ── Fikstürlerin uymadığı şey ────────────────────────────────────────
   Burada GERÇEK uç nokta, gerçek konsol adresi, gerçek kullanıcı adı,
   gerçek token ya da şirket verisi YOKTUR. Yalnız VERİNİN ŞEKLİ vardır:
   hangi alanlar hangi tipte gelir. Bir fikstürün varlığı o connector'ın
   "bağlanabildiği" anlamına GELMEZ — sekiz adaptörün yedisi hâlâ bağlı
   değildir ve sertifikasyon raporu bunu `uygulanamaz` olarak yazar.

   ── Santral kodları ve varlık etiketleri ─────────────────────────────
   Seed'deki (prisma/dev.db) GERÇEK kayıtlarla uyumludur — eşleşme
   yollarının gerçekten sınanabilmesi için. Kod uydurulmaz; uydurulan tek
   şey, platformda kasten TANIMSIZ olan `TANIMSIZ_TESIS_KODU`dur ve o da
   "eksik referans" durumunu sınamak içindir. */

/** Seed'de gerçekten bulunan santral kodları. */
export const TESIS_KODLARI = {
  kizildere3: 'KIZILDERE-3',
  kizildere2: 'KIZILDERE-2',
  alasehirJes: 'ALASEHIR-JES',
  gokcedag: 'GOKCEDAG-RES',
} as const;

/** Seed'de gerçekten bulunan varlık etiketleri (eşleşme yolu sınanabilsin). */
export const VARLIK_ETIKETLERI = {
  kizildere3Scada: 'KIZILDERE3-SCADA-01',
  kizildere3Ews: 'KIZILDERE3-EWS-01',
  kizildere3Otfw: 'KIZILDERE3-OTFW-01',
  kizildere2Hmi: 'KIZILDERE-2-HMI-01',
  alasehirScada: 'ALASEHIR-JES-SCADA-01',
} as const;

/** Platformda KASTEN tanımsız — "eksik referans" durumu için. */
export const TANIMSIZ_TESIS_KODU = 'TANIMSIZ-SANTRAL-SERTIFIKA';

/* ═══ Sır referansları ════════════════════════════════════════════════
   Değerler değil, ADRESLER. `gecerli` referansın karşılığını sertifikasyon
   TESTİ kendi ortam değişkeninde kurar; burada hiçbir sır değeri yoktur. */

export const SIR_REFERANSLARI = {
  /** testin kurduğu sentetik ortam değişkeni */
  gecerliReferans: 'env:UYUM_SERTIFIKA_SANDBOX_SIR',
  /** biçimi geçerli, karşılığı yok → 'yok' beklenir */
  eksikReferans: 'env:UYUM_SERTIFIKA_TANIMSIZ_SIR',
  /** biçimi bozuk → reddedilmeli */
  bozukReferans: 'bu bir referans degil',
} as const;

/** Sağlayıcısı bağlı OLMAYAN referans: yanıtı 'yok' değil 'bilinmiyor'dur. */
export const BAGLI_OLMAYAN_SAGLAYICI_REFERANSI = 'vault:ot/sertifika#parola';

/* ═══ Geçici dosya yardımcıları ═══════════════════════════════════════ */

let gecici: string | null = null;

/** Fikstür dosyaları için tek geçici dizin (test bittiğinde OS temizler). */
export function geciciDizin(): string {
  gecici ??= mkdtempSync(path.join(tmpdir(), 'uyum-fikstur-'));
  return gecici;
}

/**
 * Yaşı belli bir kaynak dosyası yazar.
 *
 * Bayat kaynak sınamasının başka yolu yok: adaptör tazeliği dosyanın
 * değişiklik zamanından okuyor, dolayısıyla fikstürün gerçekten ESKİ
 * olması gerekiyor. Zamanı geri almak, "3 gün önce" diye bir alan
 * uydurmaktan dürüsttür.
 */
export function eskiDosyaYaz(ad: string, icerik: string, yasDk: number): string {
  const yol = path.join(geciciDizin(), ad);
  writeFileSync(yol, icerik, 'utf8');
  const zaman = new Date(Date.now() - yasDk * 60_000);
  utimesSync(yol, zaman, zaman);
  return yol;
}

/** Var OLMAYAN dosya yolu — adaptörün kendi kalıcı hatasını üretir. */
export function olmayanDosyaYolu(ad: string): string {
  return path.join(geciciDizin(), 'yok-boyle-bir-dizin', ad);
}

/** Satır nesnelerinden CSV metni — gerçek dışa aktarımların biçimi. */
export function csvYap(satirlar: Record<string, string>[]): string {
  const basliklar = [...new Set(satirlar.flatMap((s) => Object.keys(s)))];
  const kacir = (d: string) => (/[",\n]/.test(d) ? `"${d.replace(/"/g, '""')}"` : d);
  return [
    basliklar.join(','),
    ...satirlar.map((s) => basliklar.map((b) => kacir(s[b] ?? '')).join(',')),
  ].join('\n');
}

/** JSON içerik — `icerik` yapılandırmasıyla doğrudan adaptöre verilir. */
export function jsonYap(satirlar: unknown[]): string {
  return JSON.stringify(satirlar);
}

/* ═══ Bağlanmamış adaptör fikstürü ════════════════════════════════════ */

/**
 * Bağlı OLMAYAN bir connector tipi için fikstür kabuğu.
 *
 * `disBaglantiGerekmez: false` bilinçlidir: harness bu fikstürle
 * adaptörün ağa çıkabilecek hiçbir metodunu çağırmaz ve çekirdek koşusu
 * istemez. Fikstürün varlığı adaptörü "bağlanabilir" YAPMAZ — yalnız
 * gerçek sistem bağlandığında ayrıştırıcının neyi karşılayacağını
 * yazılı hâle getirir. Kontrollerin çoğu bu tiplerde `uygulanamaz` çıkar
 * ve beklenen sonuç budur.
 */
export function baglanmamisFikstur(o: {
  tip: string;
  kaynakSistem: string;
  yapilandirma: Record<string, unknown>;
  gecersizYapilandirma?: Record<string, unknown>;
  gecerli: FiksturSeti['gecerli'];
  bozuk: FiksturSeti['bozuk'];
  kismi: FiksturSeti['kismi'];
  yinelenen: FiksturSeti['yinelenen'];
  bilinmeyenAlan: FiksturSeti['bilinmeyenAlan'];
  eksikReferans: FiksturSeti['eksikReferans'];
}): FiksturSeti {
  return {
    ...o,
    disBaglantiGerekmez: false,
    sir: { ...SIR_REFERANSLARI },
    // kosum/bayat yok: çekirdek koşusu gerçek sisteme bağlanmayı gerektirir.
  };
}
