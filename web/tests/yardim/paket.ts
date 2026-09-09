/* Test yardımcısı: geçici dizinde sentetik paket kurar; özetleri kendisi
   hesaplar (yazarın `--ozet-yaz` yaptığı iş). Bir dosyanın özetini bilerek
   bozmak için `ozetBoz` verilir. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { csvAyristir, sha256, type MaddeSatiri } from '@/lib/paket/bicim';

export type PaketDosyalari = Record<string, string | object>;

const MANIFEST_VARSAYILAN = {
  kod: 'TEST-PAKET', ad: 'Test paketi', tur: 'sektor', ulke: 'TR',
  sektor: { kod: 'TEST-SEKTOR', ad: 'Test Sektörü' }, dil: 'tr', surum: '0.1.0',
  yayinci: 'test', lisans: { tur: 'kamuya_acik', metinDahil: true },
  bagimliliklar: [] as string[], imza: null,
};

/** Dizin yazar; `manifest` içindeki alanlar varsayılanı ezer. `icerikOzetleri`
    verilmediyse dosyalardan hesaplanır. */
export function paketYaz(
  dosyalar: PaketDosyalari,
  manifest: Record<string, unknown> = {},
  secenekler: { ozetBoz?: string; ozetsiz?: string[]; dizinAdi?: string } = {},
): string {
  /* Dizin adı = paket kodu (doğrulayıcı kuralı); `dizinAdi` yalnız o kuralı
     ölçen test için farklı verilir. */
  const kod = typeof manifest.kod === 'string' ? manifest.kod : MANIFEST_VARSAYILAN.kod;
  const dizin = path.join(mkdtempSync(path.join(tmpdir(), 'uyum-paket-')), secenekler.dizinAdi ?? kod);
  mkdirSync(dizin, { recursive: true });
  const ozetler: Record<string, string> = {};
  for (const [ad, icerik] of Object.entries(dosyalar)) {
    const metin = typeof icerik === 'string' ? icerik : JSON.stringify(icerik, null, 2) + '\n';
    const yol = path.join(dizin, ad);
    mkdirSync(path.dirname(yol), { recursive: true });
    writeFileSync(yol, metin);
    if (!secenekler.ozetsiz?.includes(ad)) ozetler[ad] = ad === secenekler.ozetBoz ? '0'.repeat(64) : sha256(metin);
  }
  const m = { ...MANIFEST_VARSAYILAN, ...manifest, icerikOzetleri: (manifest.icerikOzetleri as Record<string, string> | undefined) ?? ozetler };
  writeFileSync(path.join(dizin, 'manifest.json'), JSON.stringify(m, null, 2) + '\n');
  return dizin;
}

export const CSV_BASLIK = 'kod;ust_kod;baslik;metin;sira;seviye;zorunluluk_tipi';

/** Test fikstürü: içerik KURGUSALDIR ve kaynağı yoktur — `temsili: true` bunu
    beyan eder (metin taşıyan kamuya açık çerçeve ya kaynağını ya temsilîliğini
    söylemek zorundadır; KAYNAK kuralı, PR #43 tur 2). Gerçek kaynak sınayan
    testler `ek` ile `temsili: false` + `kaynakUrl` verir. */
export function cerceve(kod: string, lisans: { tur: string; metinDahil: boolean }, ek: Record<string, unknown> = {}) {
  return { kod, ad: `${kod} çerçevesi`, surumEtiketi: 'test-1', yayimTarihi: null, yururlukTarih: null, kaynakUrl: null,
    temsili: true, lisans, maddeDosyasi: `${kod}.csv`, zorunlulukTipi: 'REGULATION', ...ek };
}

export const SOZLUK_SATIRI = (anahtar: string, tekil: string) => ({
  anahtar, dil: 'tr', tekil, cogul: `${tekil}ler`, iyelik: `${tekil}in`, belirtme: `${tekil}i`, bulunma: `${tekil}de`, yonelme: `${tekil}e`,
});

/* ── fikstür alan eşleme beyanı ───────────────────────────────────────
   Temsilî OLMAYAN çerçeve, madde dosyasındaki dolu her sütun için beyan
   vermek zorundadır (URN-PKT-022). Gerçek paket bu beyanı ELLE yazar —
   her alanın kendi anlamı vardır. Fikstürün konusu başkadır (köken,
   OSCAL gidiş-dönüşü…) ve ölçülen kural beyanın VARLIĞIDIR: bu üreteç
   yalnız o varlığı sağlar, gerçek paketlerde kullanılmaz. */
const SUTUN_ALANI: Record<string, keyof MaddeSatiri> = {
  kod: 'kod', ust_kod: 'ustKod', baslik: 'baslik', metin: 'metin', sira: 'sira', seviye: 'seviye',
  zorunluluk_tipi: 'zorunlulukTipi', kanit_beklentisi: 'kanitBeklentisi', dis_kontrol_id: 'disKontrolId',
  kanit_tipi: 'kanitTipi', kaynak_url: 'kaynakUrl', kaynak_yeri: 'kaynakYeri', erisim_tarihi: 'erisimTarihi',
  yururluk_tarihi: 'yururlukTarihi', gereksinim_tipi: 'gereksinimTipi',
};

/** Dolu sütunlar: CSV metninden ya da ayrıştırılmış madde satırlarından. */
export function doluSutunlar(kaynak: string | MaddeSatiri[]): string[] {
  if (typeof kaynak === 'string') {
    const { basliklar, satirlar } = csvAyristir(kaynak);
    return basliklar.filter((_, i) => satirlar.some((r) => (r[i] ?? '').trim() !== ''));
  }
  return Object.keys(SUTUN_ALANI).filter((s) => kaynak.some((m) => {
    const d = m[SUTUN_ALANI[s]];
    return d !== null && d !== undefined && String(d).trim() !== '';
  }));
}

/** `{ <KOD>: [{kaynakAlan, urunAlani, gerekce}] }` — dolu her sütun için bir satır. */
export function fiksturEslemesi(kod: string, kaynak: string | MaddeSatiri[]) {
  return {
    [kod]: doluSutunlar(kaynak).map((sutun) => ({
      kaynakAlan: `kaynak belgenin ${sutun} karşılığı`,
      urunAlani: sutun,
      gerekce: `Fikstür beyanı: ürünün "${sutun}" alanının anlamı gerçek paketlerde alanın kendi tanımıyla yazılır; burada ölçülen beyanın varlığıdır.`,
    })),
  };
}
