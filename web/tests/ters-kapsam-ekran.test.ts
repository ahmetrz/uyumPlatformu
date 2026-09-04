import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { heroGorseli, kucukGorsel, GORSEL_ANAHTARLARI } from '@/lib/gorsel';
import { anahtarCumlesi } from '@/lib/api/kapsam';
import {
  MERCEKLER, mercekUyar, metrikleriHesapla, type Kayit,
} from '@/app/(kabuk)/(operasyonel)/aktivite/mantik';
import {
  sayimla, sayimTopla, BOS_SAYIM,
} from '@/app/(kabuk)/(operasyonel)/surecler/ortak';

/* ═══════════════════════════════════════════════════════════════════════
   TERS KAPSAMA · EKRAN SENARYOLARI

   `arac/ters-kapsam.mjs` dokuz rotanın kütükte hiç yazılmadığını, üç
   rotanın da yalnız mutlu yol senaryosu taşıdığını buldu. Bu dosya o
   ekranların BOZUK VERİ hâllerini dondurur.

   İki tür iddia var ve ikisi farklı şey kanıtlar:

   · ALAN MANTIĞI — saf fonksiyon çağrılır, sonucu ölçülür. En güçlü
     kanıt; kural yanlışsa test kırmızıdır.
   · KAYNAK METNİ — bileşenin kendi dosyası okunur ve bir kalıbın orada
     olduğu (ya da olmadığı) iddia edilir. Bu ürünün yerleşik kalıbı:
     ekran testi için tarayıcı çalıştırmak yerine, kuralı kaynağın
     kendisinde dondurmak. Zayıf tarafı bilinerek kabul edilir — kalıbın
     VARLIĞINI kanıtlar, çizildiğini değil; çizim tarafını tarayıcı
     kapıları (`tasarim:ux`, `tasarim:erisim`, `rota:duman`) ölçer.
   ═══════════════════════════════════════════════════════════════════ */

const kaynak = (yol: string) => readFileSync(yol, 'utf8');

const EKRAN = {
  bakim: 'components/kabuk/BakimEkrani.tsx',
  sistem: 'app/(kabuk)/(operasyonel)/sistem/page.tsx',
  galeri: 'app/(kabuk)/(operasyonel)/sistem/bilesenler/Galeri.tsx',
  tesisler: 'app/(kabuk)/(flagship)/tesisler/page.tsx',
  denetimler: 'app/(kabuk)/(operasyonel)/denetimler/DenetimlerIstemci.tsx',
  cerceve: 'app/(kabuk)/(operasyonel)/uyum/[cerceve]/CerceveIstemci.tsx',
  tezgah: 'app/(kabuk)/(operasyonel)/yonetim-tezgahi/TezgahIstemci.tsx',
  api: 'app/(kabuk)/(operasyonel)/api-sozlesmesi/ApiSozlesmesiIstemci.tsx',
} as const;

/* ── /  · Saha ─────────────────────────────────────────────────────── */

describe('/ · Saha', () => {
  it('fotoğrafı olmayan santral BAŞKA santralin görselini almaz [SAH-GRS-001]', () => {
    /* Bu ürünün en kolay bozulan kuralı: bir dolgu görseli, yanlış
       santralin fotoğrafını doğru santralin adıyla gösterir ve kimse
       fark etmez. `heroGorseli` bilmediği anahtarda null döner —
       "en yakın" ya da "ilk" görsele DÜŞMEZ. */
    expect(heroGorseli('boyle-bir-santral-yok')).toBeNull();
    expect(kucukGorsel('boyle-bir-santral-yok')).toBeNull();
    expect(heroGorseli(null)).toBeNull();
    expect(heroGorseli('')).toBeNull();

    /* Bilinen anahtar KENDİ dosyasını verir — başkasının değil. */
    for (const anahtar of GORSEL_ANAHTARLARI) {
      const yol = kucukGorsel(anahtar);
      expect(yol, `${anahtar} küçük görseli`).toContain(anahtar);
    }
  });
});

/* ── /aktivite ─────────────────────────────────────────────────────── */

let sayac = 0;
const kayit = (ek: Partial<Kayit> = {}): Kayit => ({
  id: `k${sayac++}`, zaman: new Date().toISOString(),
  varlikTipi: 'Bulgu', varlikId: 'b1', eylem: 'guncelleme',
  alan: null, once: null, sonra: null, aktor: 'Ali', kaynak: 'ui',
  dosya: null,
  ...ek,
});

describe('/aktivite', () => {
  it('mercek hiçbir kayda uymayınca boş SÜZGEÇ sonucu doğar [AKT-IZL-001]', () => {
    /* Boş süzgeç ile boş kütük aynı ekranı üretemez: birinde süzgeci
       temizlemek gerekir, ötekinde yapacak bir şey yoktur. */
    const kayitlar = [kayit({ eylem: 'guncelleme' }), kayit({ eylem: 'guncelleme' })];
    const suzulmus = kayitlar.filter((k) => mercekUyar(k, 'silme'));
    expect(suzulmus).toHaveLength(0);
    /* Aynı kayıtlar süzgeçsiz görünür — yani kütük BOŞ DEĞİL. */
    expect(kayitlar.filter((k) => mercekUyar(k, 'hepsi'))).toHaveLength(2);
    /* Her mercek kimliği sözlükte tanımlı; ekran bilmediği bir mercekle
       sessizce "hepsi"ne düşemez. */
    expect(MERCEKLER.map((m) => m.id)).toContain('silme');
  });

  it('aktörü bilinmeyen kayıt aktör sayısına KATILMAZ, ayrı sayılır [AKT-IZL-002]', () => {
    const kayitlar = [
      kayit({ aktor: 'Ali' }), kayit({ aktor: 'Ali' }), kayit({ aktor: 'Veli' }),
      kayit({ aktor: null, kaynak: 'ui' }),
    ];
    const m = metrikleriHesapla(kayitlar, Date.now());
    expect(m.aktorsuz).toBe(1);
    expect(m.toplam).toBe(4);
    /* Aktörsüz kayıt kendi başına bir "aktör" gibi sayılsaydı sayı 3
       yerine 4 çıkardı ve ekran olmayan bir kişiyi sayardı. */
    expect(m.aktor).toBeLessThanOrEqual(3);
  });
});

/* ── /api-sozlesmesi ───────────────────────────────────────────────── */

describe('/api-sozlesmesi', () => {
  it('kapsamı tanımsız anahtar, "salt okunur" cümlesinin ARDINA saklanmaz [API-SZL-001]', () => {
    /* Üç cümle aynı özetten çıkabilir. Sıra önemlidir: kapsamsız
       anahtar en tehlikeli bulgudur ve ekranın ilk cümlesi olmalıdır.
       "Aktif anahtarların tamamı salt okunur" cümlesi doğru olsa bile,
       kapsamsız bir anahtar varken YETERSİZDİR. */
    const ozet = { toplam: 4, pasif: 0, saltOkunur: 4, yazabilen: 0, kapsamsiz: 2 };
    const cumle = anahtarCumlesi(ozet);
    expect(cumle).toContain('KAPSAMI TANIMSIZ');
    expect(cumle).not.toContain('salt okunur');

    /* Kapsamsız yokken doğru cümle geri gelir. */
    expect(anahtarCumlesi({ ...ozet, kapsamsiz: 0 })).toContain('salt okunur');
    expect(anahtarCumlesi({ toplam: 0, pasif: 0, saltOkunur: 0, yazabilen: 0, kapsamsiz: 0 }))
      .toBe('Tanımlı API anahtarı yok.');

    /* Hiç anahtarın erişmediği uç, bilinmeyen işaretiyle durur — 'ok'
       yeşili "erişim denetimi tamam" diye okunurdu. */
    expect(kaynak(EKRAN.api)).toContain("sayi === 0 ? 'unk'");
  });
});

/* ── /bakim ────────────────────────────────────────────────────────── */

describe('/bakim', () => {
  it('bitiş saati uydurulmaz ve eylem düğmesi konmaz [SIS-BKM-001]', () => {
    const metin = kaynak(EKRAN.bakim);
    /* Bakım ekranı kayıt OKUMAZ: veri katmanına hiçbir çağrı yapmaz. */
    expect(metin).not.toMatch(/\bdb\./);
    expect(metin).not.toContain('aktifKullanici');
    /* Bitiş saati işletmenin yazdığı nottan gelir; kod bir süre
       hesaplamaz. Tahmini süre yazmak, olmayan bir ölçüyü uydurmaktır. */
    expect(metin).toContain('BAKIM_NOTU');
    expect(metin).not.toMatch(/dakika|saat içinde|tahmini/i);
  });
});

/* ── /sistem · /sistem/bilesenler ──────────────────────────────────── */

describe('/sistem', () => {
  it('token değerleri stil dosyasından OKUNUR, ekrana elle yazılmaz [SIS-TKN-001]', () => {
    const metin = kaynak(EKRAN.sistem);
    /* Ekranın kendisinde tek bir renk değişmezi bile olmamalı: olsaydı
       token değişince referans sessizce yalan söylerdi. */
    expect(metin.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toHaveLength(0);
    /* Kaynak tek: kabuk.css okunur. */
    expect(metin).toContain('kabuk.css');
    expect(metin).toContain('readFileSync');
  });
});

describe('/sistem/bilesenler', () => {
  it('bozuk durum primitiflerinin HEPSİ galeride yer alır [SIS-BLS-001]', () => {
    /* Galeri eksikse ekranlar bozuk durumu her yerde yeniden icat eder
       ve "ölçülmedi" bir ekranda gri, ötekinde yeşil görünür. */
    const galeri = kaynak(EKRAN.galeri);
    const temel = kaynak('components/kabuk/temel.tsx');
    const bozukDurumlar = [
      'BosIlk', 'BosFiltre', 'Olculmedi', 'BaglantiYok', 'KismiVeri',
      'EntegrasyonYok', 'Bakimda', 'KismiYukleniyor', 'Yetkisiz', 'Hata',
    ];
    for (const ad of bozukDurumlar) {
      expect(temel, `${ad} primitifi tanımlı olmalı`).toContain(`export function ${ad}(`);
      expect(galeri, `${ad} galeride gösterilmeli`).toContain(`<${ad}`);
    }
  });
});

/* ── /surecler ─────────────────────────────────────────────────────── */

describe('/surecler', () => {
  it('hiçbir madde değerlendirilmemişse yüzde null kalır — %0 değil [UYU-SRC-001]', () => {
    expect(BOS_SAYIM.yuzde).toBeNull();
    /* Yalnız "değerlendirilmedi" olan bir süreç de ölçülmemiştir. */
    const olculmemis = sayimla({ degerlendirilmedi: 12, incelemede: 3 });
    expect(olculmemis.yuzde).toBeNull();
    expect(olculmemis.bilinmeyen).toBe(15);
    expect(olculmemis.degerlendirilen).toBe(0);
    /* %0 dönseydi ekran "hiç uyumlu değil" derdi; oysa hiç bakılmamış. */
    expect(olculmemis.yuzde).not.toBe(0);
  });

  it('kapsam dışı madde paydaya girmez; toplam alt sayımların toplamıdır [UYU-SRC-002]', () => {
    const a = sayimla({ uyumlu: 4, uyumsuz: 1, kapsamdisi: 7 });
    expect(a.kapsamDisi).toBe(7);
    expect(a.toplam).toBe(5);            // kapsam dışı toplamda YOK
    expect(a.degerlendirilen).toBe(5);

    const b = sayimla({ uyumlu: 2, degerlendirilmedi: 3, kapsamdisi: 1 });
    const toplam = sayimTopla([a, b]);
    expect(toplam.uyumlu).toBe(6);
    expect(toplam.bilinmeyen).toBe(3);
    expect(toplam.kapsamDisi).toBe(8);
    /* Toplamın yüzdesi de yalnız değerlendirilenler üzerinden. */
    expect(toplam.yuzde).not.toBeNull();
    expect(toplam.toplam).toBe(toplam.degerlendirilen + toplam.bilinmeyen);
  });
});

/* ── /tesisler ─────────────────────────────────────────────────────── */

describe('/tesisler', () => {
  it('eski adres kanona yönlendirir; ikinci bir santral listesi tutulmaz [TES-YON-001]', () => {
    const metin = kaynak(EKRAN.tesisler);
    expect(metin).toContain("redirect('/portfoy')");
    /* Yönlendirme sayfası veri okumaz — okusaydı iki liste iki farklı
       gerçek söylemeye başlardı. */
    expect(metin).not.toMatch(/\bdb\./);
  });
});

/* ── /denetimler · /uyum/[cerceve] · /yonetim-tezgahi ──────────────── */

describe('yalnız mutlu yol taşıyan üç ekranın bozuk hâlleri', () => {
  it('boş liste ile boş süzgeç sonucu AYRI durumlardır [DEN-LST-002]', () => {
    /* İkisi aynı kutuyu çizseydi kullanıcı "denetim yok" ile "süzgecim
       çok dar" arasında ayrım yapamaz, olmayan bir temizliğe inanırdı. */
    const metin = kaynak(EKRAN.denetimler);
    expect(metin).toContain('<BosIlk');
    expect(metin).toContain('<BosFiltre');
    const temel = kaynak('components/kabuk/temel.tsx');
    /* Boş-süzgeç durumu bir EYLEM taşır: süzgeci temizle. */
    expect(temel).toMatch(/export function BosFiltre\(\{ temizle \}/);
  });

  it('değerlendirilmemiş madde uyumlu da uyumsuz da SAYILMAZ [UYU-CRC-004]', () => {
    /* Alan mantığı: bilinmeyen paydada durur ama uyumlu sayılmaz. */
    const s = sayimla({ uyumlu: 3, degerlendirilmedi: 5 });
    expect(s.uyumlu).toBe(3);
    expect(s.bilinmeyen).toBe(5);
    expect(s.degerlendirilen).toBe(3);
    expect(s.yuzde).toBe(100);           // değerlendirilenlerin tamamı uyumlu
    /* …ama ekran bunu tek başına yazamaz: bilinmeyen varsa satır
       bilinmeyen işaretiyle durur. */
    const metin = kaynak(EKRAN.cerceve);
    expect(metin).toContain("m.bilinmeyen > 0 ? 'unk'");
  });

  it('tezgâhta boş süzgeç sonucu, hiç görev olmamasından ayrılır [YON-TZG-001]', () => {
    const metin = kaynak(EKRAN.tezgah);
    expect(metin).toContain('<BosIlk');
    expect(metin).toContain('<BosFiltre');
  });
});
