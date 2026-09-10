import { describe, expect, it } from 'vitest';
import {
  baslikCumlesi, kapsamCumlesi, kaynakHali, kaynakSatirlari, radarOzeti,
  type KaynakKaydi,
} from '../app/(kabuk)/(operasyonel)/mevzuat-radari/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   R1 · MEVZUAT RADARI · EKRAN MANTIĞI [MEV-RAD-002]

   ── NEDEN AYRI DOSYA ──────────────────────────────────────────────────
   Bu ekranın mantık katmanı hiçbir testten geçmiyordu ve kusuru bağımsız
   inceleme yakaladı (#50 tur 1): ENGELLİ bir kaynak hem "engelli" hem
   "karşılaştırılamadı" sayılıyordu. Tarayıcı kanıtı iki ETİKETİN sayfada
   olduğunu ölçüyordu; SAYILARIN ayrık kümelerden geldiğini hiç
   ölçmüyordu. İki iddia birbirine benziyor, biri öbürünün yerine geçmiyor.

   Depodaki her ekranın bir `*-mantik*.test.ts` dosyası var; bunun yoktu.
   ═══════════════════════════════════════════════════════════════════════ */

const temel: KaynakKaydi = {
  id: 'k0', kod: 'KURGU-0', ad: 'Kurgusal kaynak', merci: 'Kurgusal merci',
  yayinKanali: 'https://kurgusal.ornek/duyuru', paketKodu: null,
  etkin: true, durum: 'hazir', durumNotu: null,
  sonTarama: new Date('2026-09-10T06:00:00Z'), sonTaramaFarkVar: false,
  sonTaramaSebep: null, bekleyenAday: 0,
};

const k = (o: Partial<KaynakKaydi>): KaynakKaydi => ({ ...temel, ...o });

describe('BİR KAYNAK, BİR HÂL — sayaçlar ayrık [MEV-RAD-002]', () => {
  it('ENGELLİ kaynak "karşılaştırılamadı" sayılMAZ [MEV-RAD-002]', () => {
    /* Kusurun tam hâli: engelli kaynağın son taraması HER ZAMAN
       `farkVar: null` yazar (`taramaYaz` ikisini birden yazar), bu
       yüzden bağımsız süzgeçler onu iki kez sayıyordu. */
    const satirlar = kaynakSatirlari([
      k({ id: 'k1', kod: 'ENGELLI', durum: 'engelli', sonTaramaFarkVar: null }),
    ]);
    const o = radarOzeti(satirlar, 0);
    expect(o.engelliKaynak).toBe(1);
    expect(o.karsilastirilamayan, 'engelli kaynak İKİNCİ kez sayıldı').toBe(0);
    expect(o.hicTaranmayan).toBe(0);
  });

  it('HÂL SAYIMI kaynak sayısını AŞMAZ — dört hâlin toplamı [MEV-RAD-002]', () => {
    /* Toplamı ölçmek, gelecekteki her yeni sayaç için de kapıdır:
       çift sayan bir sayaç toplamı şişirir ve vaka kırmızı yanar. */
    const satirlar = kaynakSatirlari([
      k({ id: 'a', durum: 'engelli', sonTaramaFarkVar: null }),
      k({ id: 'b', durum: 'hata', sonTaramaFarkVar: null }),
      k({ id: 'c', sonTarama: null, sonTaramaFarkVar: null }),
      k({ id: 'd', sonTaramaFarkVar: true }),
      k({ id: 'e', sonTaramaFarkVar: false }),
    ]);
    const o = radarOzeti(satirlar, 0);
    expect(o.engelliKaynak + o.karsilastirilamayan + o.hicTaranmayan)
      .toBeLessThanOrEqual(satirlar.length);
    expect(o.engelliKaynak).toBe(1);
    expect(o.karsilastirilamayan).toBe(1);
    expect(o.hicTaranmayan).toBe(1);
  });

  it('HER kaynak TAM OLARAK bir hâle düşer [MEV-RAD-002]', () => {
    const hepsi = kaynakSatirlari([
      k({ id: 'a', durum: 'engelli', sonTarama: null, sonTaramaFarkVar: null }),
      k({ id: 'b', durum: 'hata', sonTaramaFarkVar: null }),
      k({ id: 'c', sonTarama: null, sonTaramaFarkVar: null }),
      k({ id: 'd', sonTaramaFarkVar: true }),
    ]).map(kaynakHali);
    /* Engelli VE hiç taranmamış kaynak: sebep ENGELDİR, ekran önce onu söyler. */
    expect(hepsi).toEqual(['engelli', 'karsilastirilamadi', 'hic_taranmadi', 'okundu']);
  });
});

describe('ÜÇ DEĞERLİ FARK — null "değişiklik yok" DEMEZ [MEV-RAD-002]', () => {
  it('hiç taranmamış kaynak "değişiklik yok" DEMEZ [MEV-RAD-002]', () => {
    const [s] = kaynakSatirlari([k({ sonTarama: null, sonTaramaFarkVar: null })]);
    expect(s.hicTaranmadi).toBe(true);
    expect(s.farkSozu).toBe('Hiç taranmadı');
    expect(s.farkSozu).not.toContain('yok');
  });

  it('farkVar NULL "karşılaştırılamadı" der, FALSE "değişiklik yok" der [MEV-RAD-002]', () => {
    const [bilinmez, temiz] = kaynakSatirlari([
      k({ sonTaramaFarkVar: null }), k({ sonTaramaFarkVar: false }),
    ]);
    expect(bilinmez.farkSozu).not.toBe(temiz.farkSozu);
    expect(bilinmez.farkSozu.toLocaleLowerCase('tr')).toContain('karşılaştırılamadı');
  });
});

describe('EKRAN CÜMLELERİ — sıfır aday "temiz" demez [MEV-RAD-002]', () => {
  it('hiçbir kaynak taranmıyorsa başlık BUNU söyler [MEV-RAD-002]', () => {
    const o = radarOzeti(kaynakSatirlari([k({ etkin: false })]), 0);
    expect(baslikCumlesi(o)).toBe('HİÇBİR KAYNAK TARANMIYOR');
  });

  it('bakılamamış kaynak varken "bekleyen değişiklik yok" DENMEZ [MEV-RAD-002]', () => {
    const o = radarOzeti(kaynakSatirlari([k({ durum: 'engelli', sonTaramaFarkVar: null })]), 0);
    expect(baslikCumlesi(o)).not.toBe('BEKLEYEN DEĞİŞİKLİK YOK');
  });

  it('kapsam cümlesi ENGELLİ ile KARŞILAŞTIRILAMADI\'yı AYRI söyler [MEV-RAD-002]', () => {
    const satirlar = kaynakSatirlari([
      k({ id: 'a', durum: 'engelli', sonTaramaFarkVar: null }),
      k({ id: 'b', durum: 'hata', sonTaramaFarkVar: null }),
    ]);
    const c = kapsamCumlesi(radarOzeti(satirlar, 0), 2);
    expect(c).toContain('1 kaynak ENGELLİ');
    expect(c).toContain('1 kaynakta son tarama KARŞILAŞTIRILAMADI');
    /* İki iş bambaşkadır: biri kurumdan izin istemek, öbürü
       ayrıştırıcıyı düzeltmek. Tek sayıya toplanmazlar: ikisini de
       "2 kaynak ENGELLİ" ya da tek bir "sorunlu kaynak" cümlesinde
       birleştirmek, iki ayrı işi aynı satıra sıkıştırmak olurdu. */
    expect(c).not.toContain('2 kaynak ENGELLİ');
    expect(c).not.toContain('2 kaynakta');
    expect(c.toLocaleLowerCase('tr')).not.toContain('sorunlu');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   SAYI KIRPILMIŞ LİSTEDEN GELMEZ [MEV-RAD-002]

   Bağımsız inceleme (#50 tur 2): başlık sayısı sunucuda `take: 200` ile
   kırpılmış listeden hesaplanıyordu ve 252 karar bekleyen adayda ekran
   "200" diyordu; üstelik 200'den ESKİ bekleyen adaylar hiçbir mercekten
   ULAŞILAMAZ hâle geliyordu.

   Bu vakalar `radarOzeti`nin sayıyı DIŞARIDAN aldığını ölçer: kırpılmış
   liste ile gerçek sayı AYRIŞABİLİR ve ekran gerçek sayıyı gösterir.
   ═══════════════════════════════════════════════════════════════════════ */
describe('KIRPILMIŞ LİSTE gerçek sayıyı gölgelemez [MEV-RAD-002]', () => {
  it('özet, bekleyen sayısını DIŞARIDAN alır — listeden saymaz [MEV-RAD-002]', () => {
    const satirlar = kaynakSatirlari([k({ id: 'a' })]);
    /* Liste kırpılmış olsun: ekranda 200 satır var, gerçekte 252. */
    const o = radarOzeti(satirlar, 252);
    expect(o.bekleyenAday, 'sayı kırpılmış listeden geliyor').toBe(252);
    expect(baslikCumlesi(o)).toBe('252 BEKLEYEN DEĞİŞİKLİK ADAYI');
  });

  it('sıfır bekleyen + temiz kaynak → "BEKLEYEN DEĞİŞİKLİK YOK" [MEV-RAD-002]', () => {
    const o = radarOzeti(kaynakSatirlari([k({ sonTaramaFarkVar: false })]), 0);
    expect(baslikCumlesi(o)).toBe('BEKLEYEN DEĞİŞİKLİK YOK');
  });
});
