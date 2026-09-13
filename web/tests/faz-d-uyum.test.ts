import { describe, expect, it } from 'vitest';
import {
  DOGRULAMA_SINIFI, SAHIPLIK_SINIFI, dogrulamaDurumu, dogrulayabilirMi,
  kontrolSahipligi, sahiplikOzeti,
} from '@/lib/uyum/kontrolSahipligi';
import {
  KANIT_DURUMLARI, KANIT_TIPLERI, kanitGucu, kanitOzeti, surumGerekiyorMu,
  tazelikDurumu,
} from '@/lib/uyum/kanitMetadata';
import {
  DOSYA_SINIRI, IZINLI_TIPLER, guvenliDosyaAdi,
} from '@/lib/uyum/kanitDosyaKurali';
import {
  eksikDagilimi, kapsamaCumlesi, kapsamaOzeti, kontrolHazirligi,
} from '@/lib/uyum/kapsama';
import {
  DIS_SAGLAYICILAR, disEtkinSaglayici, imzaBeyani, imzaDurumu,
} from '@/lib/uyum/disSaglayicilar';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ D · Uyum kanıt katmanı — saf karar kodunun nöbetçisi

   Bu dosya veritabanına da dosya sistemine de dokunmaz: buradaki her
   fonksiyon saf olduğu için test edilebilir ve saf OLMASI gerektiği için
   test edilir. Kanıt katmanının kararları (bu kanıt sayılır mı, bu kişi
   doğrulayabilir mi, bu paket imzalı mı) ekranda tek bir sözcüğe iner ve
   o sözcük yanlışsa denetimde en pahalı hata üretilir. */

describe('UY-07 · kontrol sahipliği', () => {
  const kisi = (aktif: boolean) => ({ id: 'k1', ad: 'Sorumlu', aktif });
  const ekip = (aktifUye: number, aktif = true) =>
    ({ id: 'e1', kod: 'EKP', aktif, aktifUye });

  it('kişi + aktif ekip → sağlam [UYU-SHP-001]', () => {
    expect(kontrolSahipligi({ sorumlu: kisi(true), ekip: ekip(3) })).toBe('saglam');
  });

  it('yalnız aktif ekip → sağlam (kişi zorunlu değil)', () => {
    expect(kontrolSahipligi({ sorumlu: null, ekip: ekip(2) })).toBe('saglam');
  });

  it('yalnız kişi → ekipsiz (borç, kusur değil)', () => {
    expect(kontrolSahipligi({ sorumlu: kisi(true), ekip: null })).toBe('ekipsiz');
    expect(SAHIPLIK_SINIFI.ekipsiz).toBe('md');
  });

  it('pasif sorumlu EN AĞIR hâldir — ekip sağlam olsa bile', () => {
    /* Ekranda "sorumlusu var" görünür ve bu yüzden hiç incelenmez;
       OT-09 varlık tarafında aynı sırayı verir. */
    expect(kontrolSahipligi({ sorumlu: kisi(false), ekip: ekip(5) })).toBe('pasif');
    expect(SAHIPLIK_SINIFI.pasif).toBe('bd');
  });

  it('aktif ekibin aktif üyesi yoksa boş_ekip', () => {
    expect(kontrolSahipligi({ sorumlu: null, ekip: ekip(0) })).toBe('bos_ekip');
  });

  it('pasif ekip yok sayılır: kişi de yoksa atanmadı', () => {
    expect(kontrolSahipligi({ sorumlu: null, ekip: ekip(4, false) })).toBe('atanmadi');
  });

  it('hiçbiri yoksa atanmadı', () => {
    expect(kontrolSahipligi({ sorumlu: null, ekip: null })).toBe('atanmadi');
  });

  it('özet her durumu ayrı sayar ve toplamı korur', () => {
    const o = sahiplikOzeti(['saglam', 'saglam', 'pasif', 'atanmadi']);
    expect(o.saglam).toBe(2);
    expect(o.pasif).toBe(1);
    expect(o.toplam).toBe(4);
  });
});

describe('UY-07 · dört göz', () => {
  it('kendi değerlendirmesini kimse doğrulayamaz', () => {
    const k = dogrulayabilirMi({
      dogrulayanId: 'a', degerlendirenId: 'a', degerlendirildi: true,
    });
    expect(k.ok).toBe(false);
    expect(k.ok === false && k.sebep).toContain('dört göz');
  });

  it('başkası doğrulayabilir', () => {
    expect(dogrulayabilirMi({
      dogrulayanId: 'b', degerlendirenId: 'a', degerlendirildi: true,
    }).ok).toBe(true);
  });

  it('değerlendiren bilinmiyorsa dört göz KANITLANAMAZ — reddedilir', () => {
    /* "Muhtemelen başkasıdır" diye geçmek, doğrulamayı anlamsız kılardı. */
    const k = dogrulayabilirMi({
      dogrulayanId: 'b', degerlendirenId: null, degerlendirildi: true,
    });
    expect(k.ok).toBe(false);
  });

  it('hiç değerlendirilmemiş kontrol doğrulanamaz', () => {
    expect(dogrulayabilirMi({
      dogrulayanId: 'b', degerlendirenId: null, degerlendirildi: false,
    }).ok).toBe(false);
  });
});

describe('UY-07 · doğrulama tazeliği', () => {
  const gun = 86_400_000;
  const simdi = 1_800_000_000_000;

  it('doğrulama yoksa yok', () => {
    expect(dogrulamaDurumu({
      dogrulamaZamani: null, sonDegerlendirme: simdi, simdi,
    })).toBe('yok');
  });

  it('taze doğrulama', () => {
    expect(dogrulamaDurumu({
      dogrulamaZamani: simdi - 10 * gun, sonDegerlendirme: simdi - 20 * gun, simdi,
    })).toBe('dogrulandi');
  });

  it('eşiği aşan doğrulama bayat', () => {
    expect(dogrulamaDurumu({
      dogrulamaZamani: simdi - 400 * gun, sonDegerlendirme: simdi - 500 * gun, simdi,
    })).toBe('bayat');
  });

  it('doğrulamadan SONRA değişen değerlendirme en ağır hâldir', () => {
    /* Ekranda duran "doğrulandı" damgası artık BAŞKA bir kararı işaret
       eder; bu, hiç doğrulanmamış olmaktan tehlikelidir. */
    const d = dogrulamaDurumu({
      dogrulamaZamani: simdi - 10 * gun, sonDegerlendirme: simdi - 1 * gun, simdi,
    });
    expect(d).toBe('degerlendirme_sonrasi_degisti');
    expect(DOGRULAMA_SINIFI[d]).toBe('bd');
    expect(DOGRULAMA_SINIFI.yok).toBe('unk');
  });

  it('bayatlık, değerlendirme sonrası değişimi GİZLEMEZ', () => {
    expect(dogrulamaDurumu({
      dogrulamaZamani: simdi - 400 * gun, sonDegerlendirme: simdi - 10 * gun, simdi,
    })).toBe('degerlendirme_sonrasi_degisti');
  });
});

describe('UY-12 · kanıt tazeliği', () => {
  const gun = 86_400_000;
  const simdi = 1_800_000_000_000;

  it('bitiş tarihi yoksa SÜRESİZ — "geçerli" denmez', () => {
    /* Süresiz kanıt bir kusur değildir ama ölçülmüş tazelik de değildir. */
    expect(tazelikDurumu({ baslangic: null, bitis: null, simdi })).toBe('suresiz');
  });

  it('geçmiş bitiş → doldu', () => {
    expect(tazelikDurumu({ baslangic: null, bitis: simdi - gun, simdi })).toBe('doldu');
  });

  it('eşik içindeki bitiş → yaklaşıyor', () => {
    expect(tazelikDurumu({ baslangic: null, bitis: simdi + 10 * gun, simdi }))
      .toBe('yaklasiyor');
  });

  it('uzak bitiş → geçerli', () => {
    expect(tazelikDurumu({ baslangic: null, bitis: simdi + 200 * gun, simdi }))
      .toBe('gecerli');
  });

  it('geleceğe dönük başlangıç → başlamadı', () => {
    expect(tazelikDurumu({
      baslangic: simdi + gun, bitis: simdi + 100 * gun, simdi,
    })).toBe('baslamadi');
  });
});

describe('UY-12 · kanıt gücü', () => {
  const taban = {
    durum: 'gecerli', otomatik: false, dosyaHash: null as string | null,
    kaynakSistem: null as string | null, tazelik: 'gecerli' as const,
  };

  it('taslak kanıt hiç tartılmaz', () => {
    expect(kanitGucu({ ...taban, durum: 'taslak' })).toBe('kanit_degil');
  });

  it('reddedilmiş kanıt hiç tartılmaz', () => {
    expect(kanitGucu({ ...taban, durum: 'reddedildi' })).toBe('kanit_degil');
  });

  it('süresi dolmuş kanıt otomatik ve özetli olsa bile kanıt değildir', () => {
    expect(kanitGucu({
      ...taban, otomatik: true, dosyaHash: 'abc', tazelik: 'doldu',
    })).toBe('kanit_degil');
  });

  it('otomatik + özet → güçlü', () => {
    expect(kanitGucu({ ...taban, otomatik: true, dosyaHash: 'abc' })).toBe('guclu');
  });

  it('kaynağı belli → orta', () => {
    expect(kanitGucu({ ...taban, kaynakSistem: 'cmdb' })).toBe('orta');
  });

  it('elle girilmiş, kaynaksız, özetsiz → zayıf', () => {
    expect(kanitGucu(taban)).toBe('zayif');
  });

  it('otomatik ama özetsiz kanıt GÜÇLÜ sayılmaz', () => {
    expect(kanitGucu({ ...taban, otomatik: true })).toBe('zayif');
  });
});

describe('UY-12 · sürüm kuralı', () => {
  it('içerik özeti değişince yeni sürüm açılır', () => {
    expect(surumGerekiyorMu({ eskiHash: 'a', yeniHash: 'b' }).yeniSurum).toBe(true);
  });

  it('aynı özet yeni sürüm AÇMAZ', () => {
    expect(surumGerekiyorMu({ eskiHash: 'a', yeniHash: 'a' }).yeniSurum).toBe(false);
  });

  it('ilk dosya yeni sürüm açar', () => {
    expect(surumGerekiyorMu({ eskiHash: null, yeniHash: 'a' }).yeniSurum).toBe(true);
  });

  it('dosya verilmediyse (metadata düzeltmesi) sürüm açılmaz', () => {
    expect(surumGerekiyorMu({ eskiHash: 'a', yeniHash: null }).yeniSurum).toBe(false);
  });
});

describe('UY-12 · sözlükler ve özet', () => {
  it('kanıt tipi sözlüğü 12 tiptir ve tekrarsızdır', () => {
    expect(KANIT_TIPLERI.length).toBe(12);
    expect(new Set(KANIT_TIPLERI).size).toBe(12);
  });

  it('kabul durumu ile geçerlilik tarihi AYRI alanlardır', () => {
    expect([...KANIT_DURUMLARI]).toEqual(
      ['taslak', 'gecerli', 'reddedildi', 'arsivlendi'],
    );
  });

  it('özet dosyasız ve özetsiz kanıtı ayrı sayar', () => {
    const o = kanitOzeti([
      { durum: 'gecerli', tazelik: 'gecerli', dosyaHash: 'a', depoAnahtari: 'x' },
      { durum: 'gecerli', tazelik: 'doldu', dosyaHash: null, depoAnahtari: null },
      { durum: 'taslak', tazelik: 'suresiz', dosyaHash: null, depoAnahtari: null },
    ]);
    expect(o.toplam).toBe(3);
    expect(o.gecerli).toBe(2);
    expect(o.suresiDolan).toBe(1);
    expect(o.suresiz).toBe(1);
    expect(o.dosyasiz).toBe(2);
    expect(o.ozetsiz).toBe(2);
  });
});

describe('UY-13 · dosya kuralı', () => {
  it('sınır 25 MiB', () => {
    expect(DOSYA_SINIRI).toBe(25 * 1024 * 1024);
  });

  it('arşiv tipi KABUL EDİLMEZ — içine bakılmayan kutu kanıt değildir', () => {
    expect(IZINLI_TIPLER['application/zip']).toBeUndefined();
    expect(IZINLI_TIPLER['application/x-msdownload']).toBeUndefined();
  });

  it('izin listesi belge · tablo · görüntü · düz metinle sınırlıdır', () => {
    expect(IZINLI_TIPLER['application/pdf']).toBe('pdf');
    expect(IZINLI_TIPLER['image/png']).toBe('png');
    expect(IZINLI_TIPLER['text/csv']).toBe('csv');
  });

  it('yol ayıracı dosya adından temizlenir', () => {
    const ad = guvenliDosyaAdi('../../etc/passwd', 'text/plain');
    expect(ad).not.toContain('/');
    expect(ad).not.toContain('..');
    expect(ad.endsWith('.txt')).toBe(true);
  });

  it('kontrol karakteri temizlenir — başlık enjeksiyonu kapalı', () => {
    /* Content-Disposition başlığına gömülü CR/LF bir başlık enjeksiyonu
       kapısıdır; ad yalnız görüntüleme için kullanılsa bile temizlenir. */
    const ad = guvenliDosyaAdi('rapor\r\nX-Kotu: 1', 'application/pdf');
    expect(ad).not.toContain('\r');
    expect(ad).not.toContain('\n');
  });

  it('uzantı MIME tipinden gelir, kullanıcının yazdığından değil', () => {
    expect(guvenliDosyaAdi('sahte.exe', 'application/pdf')).toBe('sahte.pdf');
  });

  it('tanınmayan tip .bin olur — uydurma uzantı verilmez', () => {
    expect(guvenliDosyaAdi('x.dat', 'application/zip').endsWith('.bin')).toBe(true);
  });

  it('adı boşalan dosya "kanit" olur', () => {
    expect(guvenliDosyaAdi('///', 'text/plain')).toBe('___.txt');
    expect(guvenliDosyaAdi('.pdf', 'application/pdf')).toBe('kanit.pdf');
  });

  it('ad 120 karakterle sınırlanır', () => {
    const uzun = guvenliDosyaAdi(`${'a'.repeat(500)}.pdf`, 'application/pdf');
    expect(uzun.length).toBeLessThanOrEqual(125);
  });
});

describe('UY-16 · kontrol hazırlığı', () => {
  const taban = {
    durum: 'uyumlu', guven: 'oz_degerlendirme', kanitBayat: false,
    dogrulandi: true, gecerliKanit: 1,
  };

  it('kapsam dışı kontrol savunulabilir sayılır (borç üretmez)', () => {
    expect(kontrolHazirligi({ ...taban, durum: 'kapsamdisi', gecerliKanit: 0 }))
      .toBe('savunulabilir');
  });

  it('değerlendirilmemiş kontrol savunulamaz', () => {
    expect(kontrolHazirligi({ ...taban, durum: 'degerlendirilmedi' }))
      .toBe('savunulamaz');
  });

  it('"incelemede" bir karar DEĞİLDİR — savunulamaz', () => {
    expect(kontrolHazirligi({ ...taban, durum: 'incelemede' })).toBe('savunulamaz');
  });

  it('kanıtsız "uyumlu" savunulamaz', () => {
    expect(kontrolHazirligi({ ...taban, gecerliKanit: 0 })).toBe('savunulamaz');
  });

  it('kanıtlı "uyumsuz" SAVUNULABİLİR bir karardır', () => {
    /* Kurum sorunu görmüş, kayda geçirmiş ve aksiyona bağlamıştır. */
    expect(kontrolHazirligi({ ...taban, durum: 'uyumsuz' })).toBe('savunulabilir');
  });

  it('bayat kanıt zayıflatır', () => {
    expect(kontrolHazirligi({ ...taban, kanitBayat: true })).toBe('zayif');
  });

  it('doğrulanmamış karar zayıftır', () => {
    expect(kontrolHazirligi({ ...taban, dogrulandi: false })).toBe('zayif');
  });
});

describe('UY-16 · kapsama özeti', () => {
  const satir = (o: Partial<Parameters<typeof kontrolHazirligi>[0]>) => ({
    durum: 'uyumlu', guven: 'oz_degerlendirme', kanitBayat: false,
    dogrulandi: true, gecerliKanit: 1, ...o,
  });

  it('kapsam dışı kontrol PAYDAYA girmez ama ayrı raporlanır', () => {
    const o = kapsamaOzeti([
      satir({}), satir({ durum: 'kapsamdisi' }), satir({ durum: 'kapsamdisi' }),
    ]);
    expect(o.kapsamda).toBe(1);
    expect(o.kapsamDisi).toBe(2);
    expect(o.kapsamaOrani).toBe(100);
  });

  it('payda sıfırsa oran NULL — %0 da %100 de yalan olurdu', () => {
    const o = kapsamaOzeti([satir({ durum: 'kapsamdisi' })]);
    expect(o.kapsamda).toBe(0);
    expect(o.kapsamaOrani).toBeNull();
    expect(o.hazirlikOrani).toBeNull();
    expect(o.kanitOrani).toBeNull();
  });

  it('bayat kanıtlı kontrol kanıtsızdan AYRI sayılır', () => {
    const o = kapsamaOzeti([
      satir({ kanitBayat: true }), satir({ gecerliKanit: 0 }), satir({}),
    ]);
    expect(o.kanitli).toBe(1);
    expect(o.bayatKanitli).toBe(1);
  });

  it('hiç oran hesaplanamadığında bile sayımlar durur', () => {
    const o = kapsamaOzeti([]);
    expect(o.kapsamda).toBe(0);
    expect(o.savunulabilir).toBe(0);
    expect(o.savunulamaz).toBe(0);
  });

  it('düşük kapsama cümlesi ÖNCE gelir — küçük örneklem uyarısı', () => {
    /* %98 hazırlık, kontrollerin %20'si değerlendirilmişse bir bilgi
       değil bir yanılsamadır. */
    const o = kapsamaOzeti([
      satir({}), satir({ durum: 'degerlendirilmedi' }),
      satir({ durum: 'degerlendirilmedi' }),
    ]);
    expect(kapsamaCumlesi(o)).toContain('küçük örneklem');
  });

  it('kapsamda kontrol yoksa cümle bunu söyler', () => {
    expect(kapsamaCumlesi(kapsamaOzeti([]))).toContain('hesaplanamaz');
  });

  it('tamamı savunulabilirse cümle bunu yazar', () => {
    expect(kapsamaCumlesi(kapsamaOzeti([satir({}), satir({})])))
      .toContain('tamamı savunulabilir');
  });

  it('eksik dağılımı tek puana indirilmez, ayrı ayrı sayılır', () => {
    const d = eksikDagilimi([
      satir({ durum: 'degerlendirilmedi' }),
      satir({ gecerliKanit: 0 }),
      satir({ kanitBayat: true }),
      satir({ dogrulandi: false }),
      satir({ durum: 'kapsamdisi', gecerliKanit: 0 }),
    ]);
    expect(d.degerlendirilmedi).toBe(1);
    expect(d.kanitYok).toBe(1);
    expect(d.kanitBayat).toBe(1);
    expect(d.dogrulanmadi).toBe(1);
  });
});

describe('UY-18 / UY-20 · dış sağlayıcılar', () => {
  it('hiçbir sağlayıcı BAĞLI DEĞİL ve bu gizlenmez', () => {
    expect(DIS_SAGLAYICILAR.every((s) => !s.bagli)).toBe(true);
    expect(disEtkinSaglayici('imza')).toBeNull();
    expect(disEtkinSaglayici('belge_yonetimi')).toBeNull();
  });

  it('her sağlayıcı NE GEREKTİĞİNİ ve bağlı değilken ne YAPTIĞINI yazar', () => {
    for (const s of DIS_SAGLAYICILAR) {
      expect(s.gereken.length).toBeGreaterThan(40);
      expect(s.bagliDegilkenDavranis.length).toBeGreaterThan(40);
    }
  });

  it('imza yoksa sonuç "imzasız"dır — "doğrulanamadı" değil', () => {
    /* İmzasız paket geçerlidir ve denetçiye verilebilir; eksik olan tek
       şey imzanın kanıtladığı KİMLİKTİR. */
    expect(imzaDurumu({ imzaVar: false, dogrulandi: null })).toBe('imzasiz');
    expect(imzaDurumu({ imzaVar: false, dogrulandi: true })).toBe('imzasiz');
  });

  it('imzalı ama doğrulanmamış paket "imzalandı" DEMEZ', () => {
    expect(imzaDurumu({ imzaVar: true, dogrulandi: false })).toBe('dogrulanamadi');
    expect(imzaDurumu({ imzaVar: true, dogrulandi: null })).toBe('dogrulanamadi');
  });

  it('imzalı ve doğrulanmış paket imzalandı', () => {
    expect(imzaDurumu({ imzaVar: true, dogrulandi: true })).toBe('imzalandi');
  });

  it('imzasız beyan damga ile imzayı AYIRIR', () => {
    const b = imzaBeyani('imzasiz');
    expect(b).toContain('İMZASIZDIR');
    expect(b).toContain('SHA-256');
    expect(b).toContain('kimliğini kanıtlamaz');
  });
});
