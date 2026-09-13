import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TERIMLER } from './terimler';
import { katlamaliSayi, eslesmeSayisi } from '../../arac/turkce-arama.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   TERİM KALIPLARININ SİSTEMATİK DOĞRULAMASI (URN-ALN-007)

   Bugüne kadar kalıp hataları TEPKİSEL düzeltildi: bir kusur patlıyor,
   ona bir vaka yazılıyordu. Üç hata çıktı ve ikisi yanlış-pozitif, biri
   yanlış-negatif yönündeydi — yani liste bir bütün olarak hiç
   doğrulanmamıştı ve her terimin hangi yönde bozuk olduğu BİLİNMİYORDU.

   Bu dosya o bilgisizliği kapatır: her terim İKİ YÖNDE birden sınanır ve
   TERIMLER'deki her kaydın fikstürde karşılığı olması ŞARTTIR. Yeni bir
   terim doğrulanmadan listeye giremez.

   Fikstürün `eslesmemeli` tarafı tahminle değil, DEPODAKİ GERÇEK METİNDEN
   türetildi (`arac/terim-adaylari.mjs`): kalıbın gövdesini içeren ama tam
   eşleşmeyen bütün sözcükler tarandı. "toplantı" böyle bulunmuştu — bir
   kusur patladığı için değil.
   ═══════════════════════════════════════════════════════════════════════ */

type Kayit = {
  eslesmeli: string[];
  eslesmemeli: string[];
  bilincli_kor?: Record<string, string>;
  not?: string;
};

const FIKSTUR: Record<string, Kayit> = JSON.parse(
  readFileSync(path.join(__dirname, 'terim-fikstur.json'), 'utf8'),
).terimler;

/** Bir metnin verilen terim kaydına göre eşleşme sayısı. */
function say(ad: string, metin: string): number {
  const kayit = TERIMLER.find((t) => t.ad === ad);
  if (!kayit) throw new Error(`terim yok: ${ad}`);
  let n = 0;
  for (const { re, hedef } of kayit.kaliplar) {
    n += hedef === 'ham' ? eslesmeSayisi(re, metin) : katlamaliSayi(re, metin);
  }
  return n;
}

describe('Terim kalıpları · sistematik doğrulama [URN-ALN-007]', () => {
  it('TERIMLER içindeki HER terimin fikstürde karşılığı var [URN-ALN-007]', () => {
    /* Bu vaka, doğrulanmamış bir terimin sessizce listeye girmesini
       engeller: yeni terim ekleyen kişi iki yönü de yazmak zorunda. */
    const eksik = TERIMLER.map((t) => t.ad).filter((ad) => !(ad in FIKSTUR));
    expect(eksik, 'fikstürde karşılığı olmayan terim').toEqual([]);
  });

  it('fikstürde TERIMLER dışında kayıt yok [URN-ALN-007]', () => {
    /* Ters yön: terim kaldırılırsa fikstür satırı da düşsün, yoksa
       ölmüş bir kalıbı doğrulamaya devam ederiz. */
    const adlar = new Set(TERIMLER.map((t) => t.ad));
    const fazla = Object.keys(FIKSTUR).filter((ad) => !adlar.has(ad));
    expect(fazla, 'TERIMLER\'de olmayan fikstür kaydı').toEqual([]);
  });

  for (const [ad, kayit] of Object.entries(FIKSTUR)) {
    describe(ad, () => {
      it(`${ad}: EŞLEŞMELİ olanların hepsi yakalanır [URN-ALN-007]`, () => {
        for (const s of kayit.eslesmeli) {
          expect(say(ad, s), `"${s}" yakalanmadı — yanlış NEGATİF`).toBeGreaterThan(0);
        }
      });

      it(`${ad}: EŞLEŞMEMELİ olanların hiçbiri yakalanmaz [URN-ALN-007]`, () => {
        for (const s of kayit.eslesmemeli) {
          expect(say(ad, s), `"${s}" yakalandı — yanlış POZİTİF`).toBe(0);
        }
      });

      if (kayit.bilincli_kor) {
        it(`${ad}: bilinçli körlükler HÂLÂ kör [URN-ALN-007]`, () => {
          /* Bunlar kusur değil KARAR. Vaka, kararın sessizce değişmesini
             engeller: kalıp genişletilirse burası kırmızı yanar ve
             gerekçenin yeniden tartılması gerekir. */
          for (const [s, gerekce] of Object.entries(kayit.bilincli_kor!)) {
            expect(say(ad, s), `"${s}" artık yakalanıyor — gerekçe: ${gerekce}`).toBe(0);
          }
        });
      }
    });
  }
});
