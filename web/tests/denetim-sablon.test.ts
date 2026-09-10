import { describe, expect, it } from 'vitest';
import { DEGERLENDIRILMEDI, type MaddeGirdisi } from '@/lib/denetim/formDoldurma';
import {
  BAGLANMADI, SABLON_SUTUNLARI, sablonOrtusmesi, sablonSatiri, sablonuDoldur,
  type Sablon,
} from '@/lib/denetim/sablonDoldurma';

/* ═══════════════════════════════════════════════════════════════════════
   PAKET FORM ŞABLONU — çekirdek yalnız DOLDURUR

   Öz denetim formu ürünün kendi tablosudur ve sütunları sektör/ülke
   bağımsızdır. Düzenleyicinin formu ürünün tablosu DEĞİLDİR: bölümlerini
   ve sorularını o belirler, paketle gelir, çekirdek doldurur.

   Buradaki asıl kusur sınıfı sessizdir: şablon bir kontrole işaret eder,
   o kontrol kurulumda YOKTUR ve form yine de dolu görünür. Paket ile
   kurulumun ayrışması tam oradan başlar.
   ═══════════════════════════════════════════════════════════════════════ */

const madde = (o: Partial<MaddeGirdisi> = {}): MaddeGirdisi => ({
  kod: 'X-1', baslik: 'Kontrol', durum: 'Uyumlu',
  hedefOlgunluk: 3, mevcutOlgunluk: 2,
  kapsamDisi: false, kapsamDisiGerekcesi: null,
  kanitSayisi: 1, sorumlu: 'Ad Soyad', sonDegerlendirme: '01.01.2026', ...o,
});

const SABLON: Sablon = {
  kod: 'X-OZDEG', ad: 'Öz değerlendirme',
  bolumler: [
    { kod: 'genel', baslik: 'Genel bilgi', alanlar: [
      { anahtar: 'donem', etiket: 'Değerlendirme dönemi', tip: 'metin' },
    ] },
    { kod: 'yonetisim', baslik: 'Yönetişim', alanlar: [
      { anahtar: 'komite', etiket: 'Komite kurulu mu', tip: 'mantik', maddeKod: 'X-1' },
      { anahtar: 'olmayan', etiket: 'Olmayan kontrol', tip: 'mantik', maddeKod: 'X-99' },
    ] },
  ],
};

const kurulum = new Map([['X-1', madde()]]);

describe('şablon alanının dört sınıfı', () => {
  it('KONTROLE BAĞLI ve kurulumda VAR → durumu yazılır', () => {
    const s = sablonSatiri({ anahtar: 'a', etiket: 'A', tip: 'mantik', maddeKod: 'X-1' }, kurulum);
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe('Uyumlu');
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger).toBe('Kontrol X-1');
    expect(s.isaretler).toEqual([]);
  });

  it('KONTROLE BAĞLI ama kurulumda YOK → KUSUR, dolu görünmez', () => {
    /* Sessiz kalırsa form dolu görünür, oysa şablonun sorduğu soru ürüne
       hiç sorulmamıştır. */
    const s = sablonSatiri({ anahtar: 'a', etiket: 'A', tip: 'mantik', maddeKod: 'X-99' }, kurulum);
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe(BAGLANMADI);
    expect(s.isaretler).toContain('gerekcesiz_kapsam_disi');
  });

  it('SERBEST alan → "Değerlendirilmedi" ve doldurmanın kurumun işi olduğu', () => {
    const s = sablonSatiri({ anahtar: 'a', etiket: 'A', tip: 'metin' }, kurulum);
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe(DEGERLENDIRILMEDI);
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger).toBe('Kurum doldurur');
    /* Ürün o değeri BİLMEZ — uydurulmuş bir dönem ya da tarih YOK. */
    expect(s.hucreler.every((h) => !/20\d\d/.test(h.deger))).toBe(true);
  });

  it('KAPSAM DIŞI kontrolün gerekçesi AYNEN taşınır', () => {
    const m = new Map([['X-1', madde({ kapsamDisi: true, kapsamDisiGerekcesi: 'Sistem yok' })]]);
    const s = sablonSatiri({ anahtar: 'a', etiket: 'A', tip: 'mantik', maddeKod: 'X-1' }, m);
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger)
      .toBe('Kapsam dışı — Sistem yok');
    expect(s.isaretler).toEqual([]);
  });

  it('kapsam dışı ve GEREKÇESİZ → öz denetim formuyla AYNI söz', () => {
    /* İki yerde iki farklı söz, aynı kusuru iki ayrı şey gibi gösterirdi. */
    const m = new Map([['X-1', madde({ kapsamDisi: true, kapsamDisiGerekcesi: '  ' })]]);
    const s = sablonSatiri({ anahtar: 'a', etiket: 'A', tip: 'mantik', maddeKod: 'X-1' }, m);
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger)
      .toBe('Kapsam dışı · GEREKÇE YOK');
    expect(s.isaretler).toContain('gerekcesiz_kapsam_disi');
  });
});

describe('şablonun tamamı', () => {
  it('bölüm ve alan SIRASI korunur', () => {
    const b = sablonuDoldur(SABLON, kurulum);
    expect(b.map((x) => x.ad)).toEqual(['Genel bilgi', 'Yönetişim']);
    expect(b[1]!.satirlar.map((s) => s.alanAnahtari)).toEqual(['komite', 'olmayan']);
  });

  it('HİÇBİR HÜCRE boş değil', () => {
    for (const bolum of sablonuDoldur(SABLON, kurulum)) {
      for (const s of bolum.satirlar) {
        expect(s.hucreler).toHaveLength(SABLON_SUTUNLARI.length);
        for (const h of s.hucreler) expect(h.deger.trim(), h.anahtar).not.toBe('');
      }
    }
  });

  it('örtüşme SAYIYLA söylenir — "kısmen dolu" diye bir şey yok', () => {
    expect(sablonOrtusmesi(SABLON, kurulum))
      .toEqual({ alan: 3, bagli: 1, baglanmadi: 1, sayim: 0, serbest: 1 });
  });

  it('BOŞ kurulumda hiçbir alan bağlanmaz ve bu sayıyla görünür', () => {
    const o = sablonOrtusmesi(SABLON, new Map());
    expect(o.bagli).toBe(0);
    expect(o.baglanmadi).toBe(2);
  });
});

describe('DURUM SAYIMI alanı — sayılmamış kova sıfır değildir', () => {
  const SAYIM = { anahtar: 'tamUyum', etiket: 'Tam Uyum sayısı', tip: 'sayi', sayimDurumu: 'uyumlu' } as const;

  it('sayım YAPILDIYSA sayı yazılır ve kaynağı durum kovasıdır', () => {
    const s = sablonSatiri(SAYIM, kurulum, new Map([['uyumlu', 42]]));
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe('42');
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger).toBe('Kapsamda "Uyumlu" sayımı');
    expect(s.isaretler).toEqual([]);
  });

  it('ÖLÇÜLMÜŞ SIFIR sıfırdır — "Değerlendirilmedi" değil', () => {
    /* Kova kuruldu ve içi boş çıktı: bu gerçek bir cevaptır ve iyi
       haberdir. Ölçülmemişle aynı sözü yazmak, ölçümü değersizleştirirdi. */
    const s = sablonSatiri(SAYIM, kurulum, new Map([['uyumlu', 0]]));
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe('0');
    expect(s.isaretler).toEqual([]);
  });

  it('SAYIM HİÇ YAPILMADIYSA "Değerlendirilmedi" — 0 YAZILMAZ', () => {
    const s = sablonSatiri(SAYIM, kurulum, null);
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe(DEGERLENDIRILMEDI);
    expect(s.hucreler.find((h) => h.anahtar === 'kaynak')?.deger).toBe('Kapsam sayımı yapılmadı');
    expect(s.isaretler).toContain('olculmedi');
  });

  it('kova EKSİKSE de "Değerlendirilmedi" — bilinmeyen ≠ sıfır', () => {
    /* Yarım bir sayım haritası geldiğinde eksik kovaya 0 yazmak, hiç
       bakılmamış bir durumu "hiç yok" diye raporlamak olurdu. */
    const s = sablonSatiri(SAYIM, kurulum, new Map([['uyumsuz', 3]]));
    expect(s.hucreler.find((h) => h.anahtar === 'deger')?.deger).toBe(DEGERLENDIRILMEDI);
    expect(s.isaretler).toContain('olculmedi');
  });

  it('sayım alanı SERBEST alan gibi görünmez — kontrol sütunu kovayı söyler', () => {
    const s = sablonSatiri(SAYIM, kurulum, new Map([['uyumlu', 1]]));
    expect(s.hucreler.find((h) => h.anahtar === 'maddeKod')?.deger)
      .toBe('Durum sayımı · Uyumlu');
  });

  it('örtüşme sayımı AYRI kovada sayar', () => {
    const sablon: Sablon = { kod: 'X', ad: 'X', bolumler: [{ kod: 'b', baslik: 'B', alanlar: [
      { anahtar: 'a', etiket: 'A', tip: 'sayi', sayimDurumu: 'uyumlu' },
      { anahtar: 'b', etiket: 'B', tip: 'mantik', maddeKod: 'X-1' },
      { anahtar: 'c', etiket: 'C', tip: 'metin' },
    ] }] };
    expect(sablonOrtusmesi(sablon, kurulum))
      .toEqual({ alan: 3, bagli: 1, baglanmadi: 0, sayim: 1, serbest: 1 });
  });
});

describe('GERÇEK paket şablonu okunur', () => {
  /* Sözleşmenin hayal değil GERÇEK olduğunun kanıtı: depodaki tek form
     şablonu bu doldurucudan geçiyor. İÇERİĞİ kapsam dışı (TR-BANKACILIK)
     ve buraya girmiyor; ölçülen şey yalnız BİÇİM uyumu ve doldurucunun
     boş hücre bırakmadığı. */
  const DEPODAKILER = [
    'paketler/TR-BANKACILIK/form/BDDK-BS-OZDEGERLENDIRME.json',
    'paketler/TR-ENERJI/form/EPDK-DENETIM-MUTABAKAT.json',
  ];

  it.each(DEPODAKILER)('%s doldurucudan geçer ve boş hücre bırakmaz', async (yol) => {
    const { readFileSync } = await import('node:fs');
    const ham = JSON.parse(readFileSync(yol, 'utf8')) as Sablon;
    const bolumler = sablonuDoldur(ham, new Map());
    expect(bolumler.length).toBeGreaterThan(0);
    for (const b of bolumler) {
      for (const s of b.satirlar) {
        for (const h of s.hucreler) expect(h.deger.trim(), `${b.ad}/${h.anahtar}`).not.toBe('');
      }
    }
    /* Kurulum boş: kontrole bağlı her alan "bağlanmadı" der ve bu sayıyla
       görünür — form dolu GÖRÜNMEZ. */
    const o = sablonOrtusmesi(ham, new Map());
    expect(o.bagli).toBe(0);
    expect(o.baglanmadi + o.sayim + o.serbest).toBe(o.alan);
    expect(o.alan).toBeGreaterThan(5);
  });

  it('EPDK mutabakat şablonu SAYIM alanı taşır ve sayımsız üretimde 0 yazmaz', async () => {
    /* Şablonun asıl yükü ana başlık sayılarıdır; sayım yapılmadan
       üretilirse dört kova birden "Değerlendirilmedi" der — dolu bir
       belge gibi görünmez. */
    const { readFileSync } = await import('node:fs');
    const ham = JSON.parse(readFileSync(
      'paketler/TR-ENERJI/form/EPDK-DENETIM-MUTABAKAT.json', 'utf8')) as Sablon;
    const o = sablonOrtusmesi(ham, new Map());
    expect(o.sayim).toBeGreaterThan(0);
    const degerler = sablonuDoldur(ham, new Map(), null)
      .flatMap((b) => b.satirlar)
      .map((s) => s.hucreler.find((h) => h.anahtar === 'deger')?.deger);
    expect(degerler).not.toContain('0');
    expect(degerler.filter((d) => d === DEGERLENDIRILMEDI).length).toBe(o.alan);
  });
});
