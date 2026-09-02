import { describe, expect, it } from 'vitest';
import {
  MERCEKLER, aramadan, baglantiOzeti, bagliMi, baslikMetni, dipNot, dosyaCumlesi,
  kanitImi, kimlikSozu, metrikleriHesapla, sirala, suz, tazelik, tazelikTarihi,
  type KanitSatiri,
} from '@/app/(kabuk)/(operasyonel)/kanitlar/mantik';

/* C21 · Kanıt kütüphanesi — saf mantık.

   Anı testler kendisi verir (`simdi`); ekranın `an()`ına bağımlı kalınmaz.
   Tek istisna `tazelik` içindeki `kanitTazelik` çağrısıdır: eşikleri o
   verir ve gün farkını kaydırılmış bir tarihle alır, dolayısıyla gerçek
   saat yalnız "aynı gün" varsayımıyla işe karışır. */

const GUN = 86_400_000;
const SIMDI = Date.UTC(2026, 8, 1, 12, 0, 0); // 1 Eylül 2026 öğle

const gunOnce = (n: number): string => new Date(SIMDI - n * GUN).toISOString();

function kanit(ek: Partial<KanitSatiri> = {}): KanitSatiri {
  return {
    id: 'k1', ad: 'Yedekleme politikası v3', tip: 'politika', dosyaYolu: null,
    baslangic: gunOnce(10), toplanma: null, bitis: null,
    yukleyen: 'Ayşe Kaya', sahip: null, kaynakSistem: null, otomatik: false,
    gizlilik: 'kurumsal', surum: 1,
    maddeler: [], bulgular: [], tesisler: [], varlikSayisi: 0,
    ...ek,
  };
}

const madde = {
  maddeDurumuId: 'md1', maddeKod: 'A.5.1', maddeBaslik: 'Politikalar',
  surecId: 's1', surecKod: 'BGYS', regKod: 'ISO27001',
  tesisId: 't1', tesisKod: 'DGS', tesisAd: 'Doğal gaz santrali',
};

describe('tazelik', () => {
  it('90 günden genç kanıt tazedir · ok', () => {
    const t = tazelik(kanit({ baslangic: gunOnce(30) }), SIMDI);
    expect(t.kova).toBe('taze');
    expect(t.durum).toBe('ok');
    expect(t.gun).toBe(30);
    expect(t.kaynak).toBe('baslangic');
  });

  it('90–180 gün arası yenilenmeli · md', () => {
    const t = tazelik(kanit({ baslangic: gunOnce(120) }), SIMDI);
    expect(t.kova).toBe('yenilenmeli');
    expect(t.durum).toBe('md');
  });

  it('180 günden yaşlı kanıt süresi dolmuş · bd', () => {
    const t = tazelik(kanit({ baslangic: gunOnce(200) }), SIMDI);
    expect(t.kova).toBe('dolmus');
    expect(t.durum).toBe('bd');
  });

  it('toplanma tarihi varsa tazelik ondan ölçülür, başlangıçtan değil', () => {
    const k = kanit({ baslangic: gunOnce(300), toplanma: gunOnce(5) });
    expect(tazelikTarihi(k)).toEqual({ iso: gunOnce(5), kaynak: 'toplanma' });
    const t = tazelik(k, SIMDI);
    expect(t.kova).toBe('taze');
    expect(t.gun).toBe(5);
    expect(t.kaynak).toBe('toplanma');
  });

  it('geçerlilik bitişi geçtiyse takvimde taze olsa da süresi dolmuştur', () => {
    const t = tazelik(kanit({ baslangic: gunOnce(3), bitis: gunOnce(2) }), SIMDI);
    expect(t.kova).toBe('dolmus');
    expect(t.durum).toBe('bd');
    expect(t.kaynak).toBe('bitis');
    expect(t.gun).toBe(2);
  });

  it('geçerlilik bitişi ilerideyse tazeliği değiştirmez', () => {
    const t = tazelik(kanit({ baslangic: gunOnce(3), bitis: new Date(SIMDI + 30 * GUN).toISOString() }), SIMDI);
    expect(t.kova).toBe('taze');
  });
});

describe('bağlantı', () => {
  it('hiç bağı olmayan kanıt bağlantısızdır ve bilinmeyen elması taşır (unknown ≠ zero)', () => {
    const k = kanit();
    expect(bagliMi(k)).toBe(false);
    expect(kanitImi(k, SIMDI)).toBe('unk');
    expect(kimlikSozu(k, SIMDI)).toBe('Bağlantısız');
    expect(baglantiOzeti(k)).toBe('bağlantısız');
  });

  it('madde · bulgu · santral · varlık bağlarından biri yeterlidir', () => {
    expect(bagliMi(kanit({ maddeler: [madde] }))).toBe(true);
    expect(bagliMi(kanit({ bulgular: [{ id: 'b1', baslik: 'X', durum: 'acik', tesisKod: 'DGS' }] }))).toBe(true);
    expect(bagliMi(kanit({ tesisler: [{ id: 't1', kod: 'DGS', ad: 'Santral' }] }))).toBe(true);
    expect(bagliMi(kanit({ varlikSayisi: 2 }))).toBe(true);
  });

  it('bağlı kanıtın işaretçisi tazeliğini konuşur', () => {
    expect(kanitImi(kanit({ maddeler: [madde], baslangic: gunOnce(10) }), SIMDI)).toBe('ok');
    expect(kanitImi(kanit({ maddeler: [madde], baslangic: gunOnce(100) }), SIMDI)).toBe('md');
    expect(kanitImi(kanit({ maddeler: [madde], baslangic: gunOnce(400) }), SIMDI)).toBe('bd');
  });

  it('özet sayıları türüyle yazar; sıfır olan tür yazılmaz', () => {
    const k = kanit({
      maddeler: [madde, { ...madde, maddeDurumuId: 'md2' }],
      bulgular: [{ id: 'b1', baslik: 'X', durum: 'acik', tesisKod: 'DGS' }],
    });
    expect(baglantiOzeti(k)).toBe('1 bulgu · 2 madde');
  });
});

describe('dosya cümlesi dürüsttür', () => {
  it('yol yoksa "kayıtlı değil" der ve yüklemenin olmadığını söyler', () => {
    expect(dosyaCumlesi(kanit())).toMatch(/kayıtlı değil/);
    expect(dosyaCumlesi(kanit())).toMatch(/yükleme bu sürümde yok/);
  });
  it('yol varsa dosyayı "var" ilan etmez, açılamayacağını söyler', () => {
    const c = dosyaCumlesi(kanit({ dosyaYolu: '/kanit/yedek.pdf' }));
    expect(c).toContain('/kanit/yedek.pdf');
    expect(c).toMatch(/açılamaz/);
  });
});

describe('mercek · arama · sıralama', () => {
  const liste: KanitSatiri[] = [
    kanit({ id: 'taze', ad: 'Erişim listesi', tip: 'kayit', baslangic: gunOnce(5), maddeler: [madde] }),
    kanit({ id: 'yeni', ad: 'Firewall konfigürasyonu', tip: 'konfigurasyon', baslangic: gunOnce(120), maddeler: [madde] }),
    kanit({ id: 'eski', ad: 'Pentest raporu', tip: 'rapor', baslangic: gunOnce(400), yukleyen: 'Mehmet Öz',
      bulgular: [{ id: 'b1', baslik: 'Açık port bulgusu', durum: 'acik', tesisKod: 'RES' }] }),
    kanit({ id: 'bagsiz', ad: 'Eski politika', tip: 'politika', baslangic: gunOnce(20), yukleyen: null }),
  ];

  it('mercekler kova ve bağ durumuna göre süzer', () => {
    const idler = (m: Parameters<typeof suz>[1]['mercek']) =>
      suz(liste, { mercek: m, tip: null, arama: '' }, SIMDI).map((k) => k.id);
    expect(idler('hepsi')).toEqual(['taze', 'yeni', 'eski', 'bagsiz']);
    expect(idler('taze')).toEqual(['taze', 'bagsiz']);
    expect(idler('yenilenmeli')).toEqual(['yeni']);
    expect(idler('dolmus')).toEqual(['eski']);
    expect(idler('bagsiz')).toEqual(['bagsiz']);
    expect(idler('bagli')).toEqual(['taze', 'yeni', 'eski']);
  });

  it('görünür mercek kimlikleri süzgeçle uyumludur', () => {
    for (const m of MERCEKLER) {
      expect(() => suz(liste, { mercek: m.id, tip: null, arama: '' }, SIMDI)).not.toThrow();
    }
  });

  it('tip süzgeci tam eşleşir', () => {
    expect(suz(liste, { mercek: 'hepsi', tip: 'rapor', arama: '' }, SIMDI).map((k) => k.id)).toEqual(['eski']);
  });

  it('arama ad · madde kodu · bulgu başlığı · santral kodu · yükleyen üzerinde, Türkçe duyarsız', () => {
    expect(aramadan(liste[0], 'ERİŞİM')).toBe(true);
    expect(aramadan(liste[0], 'a.5.1')).toBe(true);
    expect(aramadan(liste[2], 'açık port')).toBe(true);
    expect(aramadan(liste[2], 'res')).toBe(true);
    expect(aramadan(liste[2], 'mehmet')).toBe(true);
    expect(aramadan(liste[3], 'mehmet')).toBe(false);
    expect(aramadan(liste[1], '   ')).toBe(true);
  });

  it('tarih sıralaması artan = en eski önce; azalan tersi', () => {
    expect(sirala(liste, 'tarih', 'artan').map((k) => k.id)).toEqual(['eski', 'yeni', 'bagsiz', 'taze']);
    expect(sirala(liste, 'tarih', 'azalan').map((k) => k.id)).toEqual(['taze', 'bagsiz', 'yeni', 'eski']);
  });

  it('bağ sıralaması bağlantısızı öne alır; yükleyeni olmayan sona düşer', () => {
    expect(sirala(liste, 'bagli', 'artan')[0].id).toBe('bagsiz');
    expect(sirala(liste, 'yukleyen', 'artan').at(-1)?.id).toBe('bagsiz');
  });

  it('sıralama girdi dizisini değiştirmez', () => {
    const kopya = [...liste];
    sirala(liste, 'konu', 'azalan');
    expect(liste).toEqual(kopya);
  });
});

describe('metrik · başlık · dip not', () => {
  it('metrikler her kanıtı bir tazelik kovasına, bağsızları ayrıca sayar', () => {
    const m = metrikleriHesapla([
      kanit({ id: 'a', baslangic: gunOnce(1), maddeler: [madde] }),
      kanit({ id: 'b', baslangic: gunOnce(100) }),
      kanit({ id: 'c', baslangic: gunOnce(500), bitis: gunOnce(1) }),
    ], SIMDI);
    expect(m).toEqual({ toplam: 3, taze: 1, yenilenmeli: 1, dolmus: 1, bagsiz: 2 });
  });

  it('başlık en kötü olguyu önce söyler', () => {
    expect(baslikMetni({ toplam: 5, taze: 2, yenilenmeli: 1, dolmus: 2, bagsiz: 0 }, false))
      .toEqual({ vurgu: '2 kanıt', ad: 'süresi doldu', durum: 'bd' });
    expect(baslikMetni({ toplam: 5, taze: 4, yenilenmeli: 1, dolmus: 0, bagsiz: 0 }, false).durum).toBe('md');
    expect(baslikMetni({ toplam: 5, taze: 5, yenilenmeli: 0, dolmus: 0, bagsiz: 1 }, false).durum).toBe('unk');
    expect(baslikMetni({ toplam: 5, taze: 5, yenilenmeli: 0, dolmus: 0, bagsiz: 0 }, false))
      .toEqual({ vurgu: '5 kanıt', ad: 'taze' });
  });

  it('boş kütük ile boş kapsam farklı cümledir', () => {
    const bos = { toplam: 0, taze: 0, yenilenmeli: 0, dolmus: 0, bagsiz: 0 };
    expect(baslikMetni(bos, false).ad).toBe('Kanıt kaydı yok');
    expect(baslikMetni(bos, true).ad).toBe('Kapsamınızda kanıt yok');
  });

  it('dip not kesmeyi ve kapsam dışı kanıtları sessiz bırakmaz', () => {
    const n = dipNot({ gorunur: 8, toplam: 450, yuklenen: 400, kapsamDisi: 3 });
    expect(n).toContain('8 satır görünüyor');
    expect(n).toContain('kütükte 450 kanıt var, 400 tanesi yüklendi');
    expect(n).toContain('3 kanıt santral kapsamınız dışında');
    expect(dipNot({ gorunur: 2, toplam: 2, yuklenen: 2, kapsamDisi: 0 }))
      .toBe('2 satır görünüyor · kolon başlığından sıralama');
  });
});
