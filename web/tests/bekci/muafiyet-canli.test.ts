import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { metinParcalari, yorumsuz } from '../../arac/cekirdek-sozcuk-taramasi.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   MUAFİYET KAYITLARI CANLI MI (URN-ALN-004)

   `beklenen-fark.json` ve `cekirdek-sozcuk-muafiyet.json` ELLE tutulan
   listelerdir. Bu depoda elle tutulan listeler sessizce bayatladı:
   `rotalar.json` bir ekranı kaçırdı, izin listesi altı dosyayı gereksiz
   taşıdı. İkisi de "sağlıklı" görünürken gürültü ölçüyordu.

   Muafiyet bayatlarsa daha kötüsü olur: kapının KÖR NOKTASINA dönüşür —
   artık var olmayan bir sebeple gerçek bir kusuru geçirir.

   Bu yüzden her muafiyet kaynağını taşır ve burada canlılığı ölçülür:
   dize hâlâ o dosyada geçiyor mu, dosya hâlâ var mı.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = path.join(__dirname, '..', '..');
const oku = (p: string) => JSON.parse(readFileSync(path.join(KOK, p), 'utf8'));

describe('Muafiyet kayıtları canlı [URN-ALN-004]', () => {
  const veriMuafiyetleri: Record<string, { sebep: string; kaynak: string; kayit?: string }> =
    oku('arac/beklenen-fark.json').muafiyetler ?? {};

  it('her VERİ muafiyeti kaynağını taşır ve gerekçesi vardır [URN-ALN-004]', () => {
    for (const [dize, kayit] of Object.entries(veriMuafiyetleri)) {
      expect(kayit.kaynak, `${dize}: kaynak yazılmamış`).toBeTruthy();
      expect(kayit.sebep.length, `${dize}: gerekçe çok kısa`).toBeGreaterThan(30);
    }
  });

  it('muaf dize kaynağında HÂLÂ geçiyor — ölü muafiyet yok [URN-ALN-004]', () => {
    for (const [dize, kayit] of Object.entries(veriMuafiyetleri)) {
      const yol = path.join(KOK, kayit.kaynak);
      expect(existsSync(yol), `${dize}: kaynak dosya yok → ${kayit.kaynak}`).toBe(true);
      expect(readFileSync(yol, 'utf8'), `${dize}: kaynakta artık geçmiyor — kaydı düşürün`)
        .toContain(dize);
    }
  });

  /* İki biçim: dize = bütün dosya muaf · `{sebep,dizeler}` = yalnız o
     satırlar. İkisinin de gerekçesi ve canlılığı aynı ölçüde aranır. */
  type Kayit = string | { sebep: string; dizeler: string[] };
  const dosyalar: Record<string, Kayit> = oku('arac/cekirdek-sozcuk-muafiyet.json').dosyalar;

  it('her DOSYA muafiyeti var olan dosyayı gösterir ve gerekçelidir [URN-ALN-004]', () => {
    for (const [dosya, kayit] of Object.entries(dosyalar)) {
      expect(existsSync(path.join(KOK, dosya)), `muafiyet ölü: ${dosya}`).toBe(true);
      const sebep = typeof kayit === 'string' ? kayit : kayit.sebep;
      expect(sebep.length, `${dosya}: gerekçe çok kısa`).toBeGreaterThan(30);
    }
  });

  /* CANLILIK, TARAYICININ GÖRDÜĞÜ METİNDE ölçülür — ham kaynakta değil.
     Tarayıcı yorumları söküyor ve `${…}` içini boşlukla değiştiriyor;
     muafiyet dizeleri de o hâliyle yazılıyor ("… tanımsız ( )"). Ham
     kaynakta arasaydık kayıt canlıyken ÖLÜ görünürdü — ölçüm ile
     iddianın ayrıştığı klasik hâl. */
  it('DİZE muafiyeti kaynağında HÂLÂ geçiyor ve boş değil [URN-ALN-004]', () => {
    for (const [dosya, kayit] of Object.entries(dosyalar)) {
      if (typeof kayit === 'string') continue;
      expect(kayit.dizeler.length, `${dosya}: boş dize listesi bütün dosyayı muaf eder`)
        .toBeGreaterThan(0);
      const parcalar = new Set(
        metinParcalari(yorumsuz(readFileSync(path.join(KOK, dosya), 'utf8')))
          .map((x: string) => x.trim()),
      );
      for (const dize of kayit.dizeler) {
        expect([...parcalar], `${dosya}: "${dize}" artık taranan metinde yok — kaydı düşürün`)
          .toContain(dize);
      }
    }
  });
});
