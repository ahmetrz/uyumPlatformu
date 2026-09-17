import { describe, expect, it } from 'vitest';
import {
  centikYazi, eksenPenceresi, pencereOrani, yakinAdim,
} from '../app/(kabuk)/(flagship)/eksenPenceresi';

/* ═══════════════════════════════════════════════════════════════════════
   SAH-EKS-001 · EKSEN PENCERESİ

   Saha takımyıldızının eksenleri sabitti (%0–100 · 0–enBüyükGüç) ve
   ölçüldü (17 Eyl 2026 · üretim derlemesi · 1440×900 · 1366×768 ·
   1280×800, üçünde de aynı): çizilen dört tesisin uyum endeksleri 56 ·
   67 · 73 · 73, kurulu güçleri 165 · 135 · 80 · 57 MW. Sabit eksende bu
   dört nokta tuval GENİŞLİĞİNİN %14,5'ine, YÜKSEKLİĞİNİN %31,9'una
   sıkışıyordu. Ekranın en büyük yüzeyi, portföyün karar sorusunu
   (hangi tesis hem büyük hem uyumsuz) okunamayacak kadar küçük bir
   yamada cevaplıyordu.

   Bu dosya pencerenin İKİ YÜZÜNÜ birden sınar:
     · pencere veriyi AÇAR (sıkışma biter);
     · pencere veriye YAPIŞMAZ (uçlar yuvarlanır, asgari genişlik korunur,
       sınırlar delinmez) — yoksa yakınlaştırma kendi yalanını üretir.
   ═══════════════════════════════════════════════════════════════════════ */

/** ÖLÇÜLEN veri: tuvale çizilen dört tesisin uyum endeksi ve kurulu gücü.
 *  Ekranın künye başlıklarından okunmuştur (`<tesis adı> · 165 MW ·
 *  %56 · 4 uygunsuz` …), tahmin değildir. */
const OLCULEN_ENDEKSLER = [56, 67, 73, 73];
const OLCULEN_GUCLER = [165, 135, 80, 57];

describe('SAH-EKS-001 · pencere veriyi AÇAR', () => {
  it('ölçülen dört endeks, ESKİ SABİT EKSENİN dört katından fazla yayılır [SAH-EKS-001]', () => {
    /* KUSURUN KENDİSİ, eski davranışla YAN YANA ölçülür — eşik elle
       seçilmiş bir sayı değil, düzeltmenin getirdiği KAZANÇTIR.

       Eski eksen sabit %0–100'dü: 56…73 oranlarda 0,56…0,73 ediyordu,
       yayılım 0,17 (yerleşim payıyla çarpılınca tuvalin ölçülen %14,5'i).
       Pencere 50–80 olunca aynı dört değer 0,20…0,767'ye yayılır:
       0,567, yani 3,3 kat. Eşik "üç kat" — ölçülen kazancın ALTINDA bir
       taban; veri değişse de kuralı ölçmeye devam eder, ama sabit
       eksene dönüşü geçirmez.

       Yayılımın TAM 1 olmaması kasıtlıdır: uçlar onluğa yuvarlandığı
       için iki uçta pay kalır ve künye nefesi oradan gelir. */
    const p = eksenPenceresi(OLCULEN_ENDEKSLER, { taban: 0, tavan: 100, adim: 10 })!;
    const oranlar = OLCULEN_ENDEKSLER.map((e) => pencereOrani(e, p));
    const yayilim = Math.max(...oranlar) - Math.min(...oranlar);

    /* Eski davranış: eksen [0, 100]'e ÇAKILI. */
    const eskiOranlar = OLCULEN_ENDEKSLER.map((e) => e / 100);
    const eskiYayilim = Math.max(...eskiOranlar) - Math.min(...eskiOranlar);

    expect(eskiYayilim).toBeCloseTo(0.17, 3);
    expect(yayilim).toBeGreaterThan(eskiYayilim * 3);
  });

  it('pencere ölçülen kümeyi KAPSAR ve uçları onluğa oturur [SAH-EKS-001]', () => {
    const p = eksenPenceresi(OLCULEN_ENDEKSLER, { taban: 0, tavan: 100, adim: 10 })!;
    expect(p).toEqual({ alt: 50, ust: 80, adim: 10 });
    for (const e of OLCULEN_ENDEKSLER) {
      expect(e).toBeGreaterThanOrEqual(p.alt);
      expect(e).toBeLessThanOrEqual(p.ust);
    }
  });

  it('GÜÇ ekseni adımını kendi büyüklüğünden seçer ve kümeyi kapsar [SAH-EKS-001]', () => {
    /* Güçte doğal bir tavan yoktur; adım veriden gelir. Ölçülen dört
       güç (57…165 MW) 50'lik adımda 50–200 penceresine oturur ve
       ekrandaki çentikler ("50" · "200 MW") bunu doğruladı. */
    const p = eksenPenceresi(OLCULEN_GUCLER, { taban: 0 })!;
    expect(p).toEqual({ alt: 50, ust: 200, adim: 50 });
    expect(Math.min(...OLCULEN_GUCLER)).toBeGreaterThanOrEqual(p.alt);
    expect(Math.max(...OLCULEN_GUCLER)).toBeLessThanOrEqual(p.ust);
  });
});

describe('SAH-EKS-001 · pencere veriye YAPIŞMAZ', () => {
  it('tek noktalı kümede aralık sıfıra inmez [SAH-EKS-001]', () => {
    /* Yapışkan bir pencere burada alt === üst verirdi; `pencereOrani`
       sıfıra bölerdi ve tek tesisli bir kiracıda tuval çökerdi. */
    const p = eksenPenceresi([62], { taban: 0, tavan: 100, adim: 10 })!;
    expect(p.ust - p.alt).toBeGreaterThanOrEqual(20);
    expect(Number.isFinite(pencereOrani(62, p))).toBe(true);
  });

  it('BİR PUAN farkla ayrılan iki tesis tuvalin iki ucuna DÜŞMEZ [SAH-EKS-001]', () => {
    /* Yakınlaştırılmış eksenin klasik yalanı. Asgari iki adım kuralı
       olmasaydı 61 ile 62 arası tuvalin tamamı olurdu. */
    const p = eksenPenceresi([61, 62], { taban: 0, tavan: 100, adim: 10 })!;
    const fark = pencereOrani(62, p) - pencereOrani(61, p);
    expect(fark).toBeLessThanOrEqual(1 / 20);
  });

  it('uyum endeksi penceresi [0, 100] SINIRINI DELMEZ [SAH-EKS-001]', () => {
    /* Yüzde eksenine "%-10" ya da "%110" çentiği yazılamaz. */
    const dip = eksenPenceresi([1, 3], { taban: 0, tavan: 100, adim: 10 })!;
    expect(dip.alt).toBeGreaterThanOrEqual(0);
    const tepe = eksenPenceresi([97, 99], { taban: 0, tavan: 100, adim: 10 })!;
    expect(tepe.ust).toBeLessThanOrEqual(100);
    /* Sınıra dayandığında genişleme ÖBÜR YÖNE gider; asgari genişlik korunur. */
    expect(tepe.ust - tepe.alt).toBeGreaterThanOrEqual(20);
  });

  it('sınırlar asgari genişliğe yer vermiyorsa pencere SINIRI DELMEK yerine dar kalır [SAH-EKS-001]', () => {
    const p = eksenPenceresi([4, 6], { taban: 0, tavan: 10, adim: 10 })!;
    expect(p.alt).toBeGreaterThanOrEqual(0);
    expect(p.ust).toBeLessThanOrEqual(10);
  });

  it('BOŞ kümede pencere YOKTUR — uydurma aralık yazılmaz [SAH-EKS-001]', () => {
    /* `{ alt: 0, ust: 100 }` dönmek, çizilecek hiçbir nokta yokken
       ekrana ölçülmüş bir eksen yazmak olurdu. */
    expect(eksenPenceresi([], { taban: 0, tavan: 100 })).toBeNull();
    expect(eksenPenceresi([Number.NaN], { taban: 0, tavan: 100 })).toBeNull();
  });
});

describe('SAH-EKS-001 · oran DOĞRUSALDIR', () => {
  it('eşit aralıklı değerler eşit aralıklı oranlar verir [SAH-EKS-001]', () => {
    /* Karekök ölçek burada kırmızı yakardı: 0→0,5→1 yerine
       0→0,707→1 üretirdi ve iki nokta arası mesafe okunamaz olurdu. */
    const p = { alt: 0, ust: 100, adim: 10 };
    expect(pencereOrani(50, p) - pencereOrani(25, p))
      .toBeCloseTo(pencereOrani(75, p) - pencereOrani(50, p), 10);
  });

  it('pencere dışındaki değer KIRPILIR, tuvalden taşmaz [SAH-EKS-001]', () => {
    const p = { alt: 50, ust: 70, adim: 10 };
    expect(pencereOrani(20, p)).toBe(0);
    expect(pencereOrani(90, p)).toBe(1);
  });
});

describe('SAH-EKS-001 · adım ve çentik metni', () => {
  it('adım 1 · 2 · 5 ve on katlarından biridir [SAH-EKS-001]', () => {
    for (const yayilim of [0.3, 1, 3, 7, 18, 45, 90, 240, 1800, 12000]) {
      const a = yakinAdim(yayilim);
      expect(a).toBeGreaterThan(0);
      /* a / 10^k ∈ {1, 2, 5, 10} — yuvarlak olmayan bir adım
         ("3,7 MW") çentiği okunamaz kılar. */
      const k = Math.floor(Math.log10(a));
      expect([1, 2, 5, 10]).toContain(Math.round(a / 10 ** k));
    }
  });

  it('yayılım yoksa adım çöker değil, 1 olur [SAH-EKS-001]', () => {
    expect(yakinAdim(0)).toBe(1);
    expect(yakinAdim(Number.NaN)).toBe(1);
  });

  it('ondalık adımda çentik ONDALIK yazar [SAH-EKS-001]', () => {
    /* 0,5'lik adımda iki uç "12" ve "12" görünürse pencere yalan söyler. */
    expect(centikYazi(12, 0.5)).toBe('12,0');
    expect(centikYazi(12.5, 0.5)).toBe('12,5');
    expect(centikYazi(120, 10)).toBe('120');
  });
});
