import { describe, expect, it } from 'vitest';
import { ENERJI_SOZLUGU, SU_SOZLUGU, type SozlukSatiri } from '@/prisma/sozlukler';
import {
  CEKIRDEK_TERIMLER, sozlukKur, t, tBas,
  type Bicim, type Sozluk, type TerimAnahtari,
} from '@/lib/dil/terimler';

/* ═══════════════════════════════════════════════════════════════════════
   P1 · Aşama E — İKİNCİ SÖZLÜK TASARIM SINAVI (URN-ALN-004)

   Enerji sözlüğünün sözcüğü ("santral") tek gövdeli ve ekleri kolay alır.
   Altı hâlin yetmesi bu kolaylıktan geliyor olabilirdi — yani tasarım
   doğru göründüğü hâlde YALNIZ ilk sektörde doğru olabilirdi. Su sözlüğü
   BİLEŞİK gövde kullanır ("arıtma tesisi"): üçüncü tekil iyelik eki
   gövdenin içindedir ve ekler değişir.

   Bu dosya ekran cümlelerinin KURULUŞ BİÇİMLERİNİ iki sözlükle birden
   kurar. Kırmızıya döndüğü gün, bir sözlük altı hâlle ifade edilemeyen
   bir cümle şekli eklenmiş demektir — ve o gün 236 dosyaya değil, bu
   listeye bakılır.
   ═══════════════════════════════════════════════════════════════════════ */

const BICIMLER: Bicim[] = ['tekil', 'cogul', 'iyelik', 'belirtme', 'bulunma', 'yonelme'];
const kur = (satirlar: SozlukSatiri[]): Sozluk => sozlukKur(satirlar);
const ENERJI = kur(ENERJI_SOZLUGU);
const SU = kur(SU_SOZLUGU);

describe('İkinci sözlük · şema bütünlüğü', () => {
  it.each([['enerji', ENERJI_SOZLUGU], ['su', SU_SOZLUGU]] as const)(
    '%s sözlüğünün her satırı ALTI hâli de doldurur', (_ad, satirlar) => {
      /* Eksik hâl çekirdeğe düşer ve ekran boş kalmaz — ama bir SEKTÖR
         PAKETİ için düşüş kabul değil: kiracı kendi sözcüğünü görmeli. */
      for (const s of satirlar) {
        for (const b of BICIMLER) {
          expect(s[b], `${s.anahtar}.${b}`).toBeTruthy();
        }
      }
    });

  it('su sözlüğü eksik anahtarda ÇEKİRDEĞE düşer', () => {
    // `varlik` ve `sistem` bilerek tanımsız: düşüşün çalıştığı görülsün.
    expect(t(SU, 'varlik', 'cogul')).toBe(CEKIRDEK_TERIMLER.varlik.cogul);
    expect(t(SU, 'sistem')).toBe('sistem');
  });

  it('bileşik gövdede iyelik ile belirtme AYRIŞIR', () => {
    /* Asıl tuzak: "santrali" hem belirtme hem 3. tekil iyelik gibi
       okunur; basit gövdede aynı yazıldıkları için ekran cümlesinde
       yanlış biçimi kullanmak enerji sözlüğünde FARK ETMEZ. Bileşik
       gövdede ayrışır ve hata görünür olur. Cümlelerimiz bu yüzden
       iyelik gereken yerde `belirtme` KULLANMAZ. */
    expect(t(ENERJI, 'tesis', 'belirtme')).toBe('santrali');
    expect(t(SU, 'tesis', 'belirtme')).toBe('arıtma tesisini');
    expect(t(SU, 'tesis', 'iyelik')).toBe('arıtma tesisinin');
    expect(t(SU, 'tesis', 'belirtme')).not.toBe(t(SU, 'tesis', 'iyelik'));
  });
});

/* Ekranlarda gerçekten kullanılan cümle KURULUŞLARI. Her satır bir
   yüzeyden alınmıştır; ikinci sütun enerji, üçüncü su karşılığıdır. */
const KURULUSLAR: {
  ad: string;
  kur: (s: Sozluk | null) => string;
  enerji: string; su: string; cekirdek: string;
}[] = [
  { ad: 'kabuk · kapsam şeridi',
    kur: (s) => `16 ${t(s, 'tesis')}`,
    enerji: '16 santral', su: '16 arıtma tesisi', cekirdek: '16 tesis' },
  { ad: 'ayarlar · kapsamsız yetki',
    kur: (s) => `tüm süreçler ve tüm ${t(s, 'tesis', 'cogul')}.`,
    enerji: 'tüm süreçler ve tüm santraller.',
    su: 'tüm süreçler ve tüm arıtma tesisleri.',
    cekirdek: 'tüm süreçler ve tüm tesisler.' },
  { ad: 'regülasyon · sürüm aktifleştirme',
    kur: (s) => `kapsamındaki her ${t(s, 'tesis')} için yeni değerlendirme açılır.`,
    enerji: 'kapsamındaki her santral için yeni değerlendirme açılır.',
    su: 'kapsamındaki her arıtma tesisi için yeni değerlendirme açılır.',
    cekirdek: 'kapsamındaki her tesis için yeni değerlendirme açılır.' },
  { ad: 'taşınabilir medya · havuz seçeneği',
    kur: (s) => `havuz (${t(s, 'tesis', 'yonelme')} bağlı değil)`,
    enerji: 'havuz (santrale bağlı değil)',
    su: 'havuz (arıtma tesisine bağlı değil)',
    cekirdek: 'havuz (tesise bağlı değil)' },
  { ad: 'reddedilenler · kapsam açıklaması',
    kur: (s) => `yazma kapsamı dışındaki bir ${t(s, 'tesis', 'yonelme')} aitti.`,
    enerji: 'yazma kapsamı dışındaki bir santrale aitti.',
    su: 'yazma kapsamı dışındaki bir arıtma tesisine aitti.',
    cekirdek: 'yazma kapsamı dışındaki bir tesise aitti.' },
  { ad: 'bildirimler · kapsam dip notu',
    kur: (s) => `3 bildirimin kaydı ${t(s, 'tesis')} kapsamınız dışında`,
    enerji: '3 bildirimin kaydı santral kapsamınız dışında',
    su: '3 bildirimin kaydı arıtma tesisi kapsamınız dışında',
    cekirdek: '3 bildirimin kaydı tesis kapsamınız dışında' },
  { ad: 'saklama · alan etiketi',
    kur: (s) => `${tBas(s, 'tesis')} · boş = bütün ${t(s, 'tesis', 'cogul')}`,
    enerji: 'Santral · boş = bütün santraller',
    su: 'Arıtma tesisi · boş = bütün arıtma tesisleri',
    cekirdek: 'Tesis · boş = bütün tesisler' },
  { ad: 'tesis 360 · birim şeridi başlığı',
    kur: (s) => tBas(s, 'birim', 'cogul'),
    enerji: 'Üretim üniteleri', su: 'Arıtma hatları', cekirdek: 'Birimler' },
  { ad: 'tesis 360 · sekme başlığı',
    kur: (s) => t(s, 'tesis360'),
    enerji: 'Santral 360', su: 'Arıtma Tesisi 360', cekirdek: 'Tesis 360' },
];

describe('İkinci sözlük · cümle kuruluşları', () => {
  it.each(KURULUSLAR)('$ad — üç sözlükte de kurulur [URN-ALN-004]', ({ kur: k, enerji, su, cekirdek }) => {
    expect(k(ENERJI)).toBe(enerji);
    expect(k(SU)).toBe(su);
    expect(k(null)).toBe(cekirdek);
  });

  it('hiçbir kuruluş boşluk ya da `undefined` hatası üretmez', () => {
    /* ── BURADA OLMAYAN KONTROL VE NEDENİ ────────────────────────────
       Önce "yinelenen ek" diye bir kalıp yazdım (`/(in|si|ni|de|ne)\1/`):
       dize birleştirmeye kaçan bir düzenlemeyi yakalasın diye. Kalıbın
       kendisi YANLIŞ POZİTİF üretti — "tesisi" sözcüğü zaten "sisi"
       taşıyor ve geçerli bir Türkçe sözcük.

       Ek yinelemesi metin kalıbıyla ayırt edilemez: "santralinin" de
       "arıtma tesisine" de geçerlidir ve ikisi de sözlükten gelir.
       Yanlış pozitif üreten bir iddia, ölçtüğünü sandığı şeyi ölçmez;
       kaldırıldı. Birleştirmeye karşı asıl koruma, `t()`nin BİÇİM
       ALANI okuması ve `Bicim` birlik tipinin derleme zamanında
       zorlanmasıdır. */
    for (const { ad, kur: k } of KURULUSLAR) {
      for (const s of [ENERJI, SU, null]) {
        const c = k(s);
        expect(c, `${ad}: çift boşluk`).not.toMatch(/ {2}/);
        expect(c, `${ad}: undefined sızdı`).not.toMatch(/undefined/);
        expect(c.trim(), `${ad}: baş/son boşluk`).toBe(c);
      }
    }
  });

  it('Türkçe büyütme iki sözlükte de doğru (I/İ · ı/i)', () => {
    /* Kabuk şeridi CSS ile büyütür; `tBas` yalnız ilk harfi büyütür ama
       ikisinin de Türkçe yerel ayarı kullanması gerekir. "arıtma" →
       "ARITMA" (ı→I), "tesisi" → "TESİSİ" (i→İ). */
    expect(t(SU, 'tesis').toLocaleUpperCase('tr-TR')).toBe('ARITMA TESİSİ');
    expect(t(ENERJI, 'tesis').toLocaleUpperCase('tr-TR')).toBe('SANTRAL');
    expect(tBas(SU, 'tesis')).toBe('Arıtma tesisi');
  });

  it('sözlük anahtarları çekirdekte TANIMLI', () => {
    /* `sozlukKur` tanımadığı anahtarı atar; bir sektör paketi çekirdekte
       olmayan anahtar yazarsa sessizce yutulur. Burası o sessizliği
       görünür kılar. */
    const cekirdekAnahtarlari = new Set(Object.keys(CEKIRDEK_TERIMLER));
    for (const [ad, satirlar] of [['enerji', ENERJI_SOZLUGU], ['su', SU_SOZLUGU]] as const) {
      const yabanci = satirlar.map((s) => s.anahtar)
        .filter((a) => !cekirdekAnahtarlari.has(a as TerimAnahtari));
      expect(yabanci, `${ad} sözlüğünde çekirdekte olmayan anahtar`).toEqual([]);
    }
  });
});
