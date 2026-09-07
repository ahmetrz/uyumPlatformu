import { describe, expect, it } from 'vitest';
import {
  gorunenMetin, metinParcalari, tanimlayiciMi, yorumsuz,
} from '../../arac/cekirdek-sozcuk-taramasi.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   ÇEKİRDEK SÖZCÜK TARAYICISININ KENDİ DOĞRULAMASI (URN-ALN-007)

   Bu tarayıcı elle ayarlanmış düzenli ifadelerle çalışıyor ve İKİ KEZ
   yanlış sinyal verdi:

     1. `${t(sozluk, 'tesis')}` çağrılarını "çakılı sözcük" saydı —
        çevrilmiş her yeri yeniden borç diye gösteriyordu.
     2. JSX metnini `>…<` ile yakalamaya çalıştı; TypeScript'te o kalıp
        ok işlevini (`=>`), jeneriği (`<T>`) ve karşılaştırmayı da
        yakalıyor. 554 "bulgu"nun çoğu koddu.

   Doğrulanmamış bir ölçüm aracı, bir sonraki kör alettir — terim
   kalıplarında öğrenilen ders (`terim-dogrulama.test.ts`) burada da
   geçerli. İki gürültü kaynağı AÇIK NEGATİF vaka olarak yazılıdır.
   ═══════════════════════════════════════════════════════════════════════ */

describe('Çekirdek sözcük tarayıcısı · kendi vakaları [URN-ALN-007]', () => {
  it('YORUMLAR sökülür — render edilmeyen metin aranmaz [URN-ALN-007]', () => {
    expect(yorumsuz('/* burada tesis geçiyor */ const a = 1;')).not.toContain('tesis');
    expect(yorumsuz('// tesis yorumu\nconst b = 2;')).not.toContain('tesis');
    expect(yorumsuz("const c = 'tesis';")).toContain('tesis');
    // URL'deki `//` yorum değildir.
    expect(yorumsuz("const u = 'https://x/y';")).toContain('https://x/y');
  });

  it('GÜRÜLTÜ 1: sözlük ÇAĞRISI bulgu sayılmaz [URN-ALN-007]', () => {
    /* Bu satır DOĞRU çalışıyor: sözcük sözlükten geliyor. Bulgu sayılırsa
       çevrilmiş her yer yeniden borç görünür. */
    const p = metinParcalari("const x = `${t(sozluk, 'tesis')}siz kayıt gizlenmez`;");
    expect(p.join(' ')).not.toContain('tesis');
  });

  it('GÜRÜLTÜ 2: anahtar argümanı ekran metni değildir [URN-ALN-007]', () => {
    const p = metinParcalari("const y = tBas(sozluk, 'portfoy');");
    expect(p).not.toContain('portfoy');
  });

  it('GÜRÜLTÜ 3: kod jetonu ekran metni değildir [URN-ALN-007]', () => {
    /* Ekran metni PROZADIR: boşluk taşır ya da büyük harfle başlar.
       Alan adı küçük harfli tek jetondur ve ekranda görünmez. */
    expect(gorunenMetin('tesisler')).toBe(false);
    expect(gorunenMetin('tesis')).toBe(false);
    expect(gorunenMetin('tesisKodu')).toBe(false);
    expect(gorunenMetin('a')).toBe(false);
  });

  it('POZİTİF: gerçek ekran metni yakalanır [URN-ALN-007]', () => {
    expect(gorunenMetin('kurumsal · tüm portföy')).toBe(true);
    expect(gorunenMetin('Tesis')).toBe(true);
    expect(gorunenMetin('Bu tesis kapsamında yetkiniz yok')).toBe(true);
    const p = metinParcalari("const z = 'kurumsal · tüm portföy';");
    expect(p).toContain('kurumsal · tüm portföy');
  });

  it('POZİTİF: çakılı sözcük, sözlük çağrısıyla AYNI satırdaysa da görünür [URN-ALN-007]', () => {
    /* Kısmi çeviri en sinsi hâl: bir yer sözlükten, öbürü çakılı. */
    const p = metinParcalari("const q = `${t(sozluk, 'tesis')} · tüm portföy`;");
    expect(p.join(' ')).toContain('tüm portföy');
  });

  it('GÜRÜLTÜ 5: `varlikTipi` DEĞERİ denetim izi model adıdır [URN-ALN-007]', () => {
    /* R0-9 · `AktiviteKaydi.varlikTipi`ye YAZILIR; çakılı olmak zorunda. */
    expect(metinParcalari("await iz({ varlikTipi: 'Tesis', varlikId: id });"))
      .not.toContain('Tesis');
    expect(metinParcalari("if (k.varlikTipi === 'Tesis') return 1;")).not.toContain('Tesis');
  });

  it('GÜRÜLTÜ 5 KONUMLUDUR: aynı dosyadaki ekran etiketi yakalanır [URN-ALN-007]', () => {
    /* Kümeye atmak, `lib/eylemler2/yonetim.ts`teki `baslik: 'Tesis'`
       ekran etiketini de sessizce yutardı. */
    const p = metinParcalari(
      "await iz({ varlikTipi: 'Tesis' });\nconst s = [{ baslik: 'Tesis', deger: 3 }];");
    expect(p).toContain('Tesis');
    expect(p.filter((x: string) => x === 'Tesis')).toHaveLength(1);
  });

  /* ── GÜRÜLTÜ 4 · TANIMLAYICI KOMŞULUĞU ──────────────────────────────
     Kural İKİ yönde de yanlış olabilir ve ikisi de ölçüldü:
     yanlış POZİTİF (dosya adı "tesis" sayılır) ve yanlış NEGATİF
     ("tesis/süreç" kod sayılır). Vakalar iki yönü de tutuyor. */
  const yerBul = (metin: string, sozcuk: string) =>
    tanimlayiciMi(metin, metin.indexOf(sozcuk), sozcuk.length);

  it('GÜRÜLTÜ 4: dosya adı ve nitelikli ad tanımlayıcıdır [URN-ALN-007]', () => {
    expect(yerBul('kaynak sahabjes-yardimci-tesis.csv okundu', 'tesis')).toBe(true);
    expect(yerBul('alan Connector.kapsamTesisleriJson içinde', 'Tesisleri')).toBe(true);
    expect(yerBul('yol /tesisler/ altında', 'tesisler')).toBe(true);
    expect(yerBul('app/tesis/veri.ts dosyası', 'tesis')).toBe(true);
  });

  it('GÜRÜLTÜ 4: eğik çizgi SEÇENEK bağıysa ekran metnidir [URN-ALN-007]', () => {
    /* Bu iki mesaj kuralın ilk hâlinde sınıf taramasının kör noktasıydı
       (`lib/eylemler2/uyumSahiplik.ts`): "tesis/süreç" bir yol değil,
       "tesis ya da süreç" demek. */
    expect(yerBul('Bu tesis/süreç kapsamında doğrulama yetkiniz yok', 'tesis')).toBe(false);
    expect(yerBul('Bu tesis kapsamında yetkiniz yok', 'tesis')).toBe(false);
  });
});
