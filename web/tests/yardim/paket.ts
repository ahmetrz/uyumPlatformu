/* Test yardımcısı: geçici dizinde sentetik paket kurar; özetleri kendisi
   hesaplar (yazarın `--ozet-yaz` yaptığı iş). Bir dosyanın özetini bilerek
   bozmak için `ozetBoz` verilir. */
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { sha256 } from '@/lib/paket/bicim';

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
  secenekler: { ozetBoz?: string; ozetsiz?: string[] } = {},
): string {
  const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-paket-'));
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

export function cerceve(kod: string, lisans: { tur: string; metinDahil: boolean }, ek: Record<string, unknown> = {}) {
  return { kod, ad: `${kod} çerçevesi`, surumEtiketi: 'test-1', yayimTarihi: null, yururlukTarih: null, kaynakUrl: null,
    lisans, maddeDosyasi: `${kod}.csv`, zorunlulukTipi: 'REGULATION', ...ek };
}

export const SOZLUK_SATIRI = (anahtar: string, tekil: string) => ({
  anahtar, dil: 'tr', tekil, cogul: `${tekil}ler`, iyelik: `${tekil}in`, belirtme: `${tekil}i`, bulunma: `${tekil}de`, yonelme: `${tekil}e`,
});
