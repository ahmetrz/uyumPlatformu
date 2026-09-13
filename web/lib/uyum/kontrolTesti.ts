/* ═══════════════════════════════════════════════════════════════════════
   UY-64 · Kontrol testi — SAF KARAR

   Ürün bir kontrolün DOĞRULANDIĞINI kaydediyordu (UY-07, dört göz) ama
   HANGİ YÖNTEMLE doğrulandığını kaydetmiyordu. Denetçinin ilk sorusu
   budur: "tasarımına mı baktınız, işlediğine mi; kaç örnek incelediniz?"

   ── TASARIM TESTİ KONTROLÜN ÇALIŞTIĞINI GÖSTERMEZ ─────────────────────
   Politikanın doğru yazıldığını gösterir. Hiç koşmamış bir kontrol de
   mükemmel tasarlanmış olabilir. İkisini aynı kefeye koymak, kâğıt
   üstünde uyumlu bir kurum üretir.

   ── İŞLEYİŞ TESTİ ÖRNEKLEM İSTER ──────────────────────────────────────
   "İşleyişini test ettik" demek, kaç kayda bakıldığını söylemeden bir
   iddiadır. Örneklemsiz işleyiş testi kabul edilmez.

   Bu dosya veritabanı ve React bilmez. */

export const YONTEMLER = ['tasarim', 'isleyis'] as const;
export type TestYontemi = (typeof YONTEMLER)[number];

export const YONTEM_ETIKETI: Record<TestYontemi, string> = {
  tasarim: 'Tasarım testi — kontrol doğru kurgulanmış mı',
  isleyis: 'İşleyiş testi — kontrol gerçekten çalışıyor mu',
};

export const SONUCLAR = ['uygun', 'kismen', 'uygun_degil'] as const;
export type TestSonucu = (typeof SONUCLAR)[number];

export const SONUC_ETIKETI: Record<TestSonucu, string> = {
  uygun: 'Uygun',
  kismen: 'Kısmen uygun',
  uygun_degil: 'Uygun değil',
};

export const SONUC_SINIFI: Record<TestSonucu, 'ok' | 'md' | 'bd'> = {
  uygun: 'ok', kismen: 'md', uygun_degil: 'bd',
};

/** Bu süreden eski bir test, bugünün kanıtı sayılmaz. */
export const TEST_TAZELIK_GUN = 365;

/* ── Kapı ────────────────────────────────────────────────────────────── */

export type Karar = { ok: true } | { ok: false; sebep: string };

/**
 * Test kaydı yazılabilir mi?
 *
 * İşleyiş testinde evren, örneklem ve uygun sayısı birlikte zorunludur
 * ve aralarında tutarlı olmalıdır: örneklem evreni, uygun sayısı
 * örneklemi aşamaz. Tasarım testinde bu alanlar BOŞ kalır — tasarım
 * testinin örneklemi yoktur ve sayı yazmak testi olduğundan güçlü
 * gösterirdi.
 */
export function testKapisi(o: {
  yontem: string;
  evrenSayisi: number | null;
  orneklemSayisi: number | null;
  uygunSayisi: number | null;
  sonuc: string;
  testTarihi: number;
  simdi: number;
}): Karar {
  if (!YONTEMLER.includes(o.yontem as TestYontemi)) {
    return { ok: false, sebep: `Tanınmayan test yöntemi: "${o.yontem}".` };
  }
  if (!SONUCLAR.includes(o.sonuc as TestSonucu)) {
    return { ok: false, sebep: `Tanınmayan test sonucu: "${o.sonuc}".` };
  }
  if (o.testTarihi > o.simdi) {
    return { ok: false, sebep: 'Test tarihi gelecekte olamaz.' };
  }

  if (o.yontem === 'tasarim') {
    if (o.evrenSayisi !== null || o.orneklemSayisi !== null || o.uygunSayisi !== null) {
      return {
        ok: false,
        sebep: 'Tasarım testinin örneklemi yoktur; evren ve örneklem alanları '
          + 'boş bırakılmalı. Sayı yazmak testi olduğundan güçlü gösterir.',
      };
    }
    return { ok: true };
  }

  if (o.evrenSayisi === null || o.orneklemSayisi === null || o.uygunSayisi === null) {
    return {
      ok: false,
      sebep: 'İşleyiş testi ÖRNEKLEM ister: evren, incelenen örnek ve uygun '
        + 'bulunan sayısı zorunlu. "İşleyişini test ettik" demek, kaç kayda '
        + 'bakıldığını söylemeden bir iddiadır.',
    };
  }
  if (o.evrenSayisi <= 0 || o.orneklemSayisi <= 0) {
    return { ok: false, sebep: 'Evren ve örneklem en az 1 olmalı.' };
  }
  if (o.orneklemSayisi > o.evrenSayisi) {
    return { ok: false, sebep: 'Örneklem evrenden büyük olamaz.' };
  }
  if (o.uygunSayisi < 0 || o.uygunSayisi > o.orneklemSayisi) {
    return { ok: false, sebep: 'Uygun bulunan sayı 0 ile örneklem arasında olmalı.' };
  }
  /* Örneklemin tamamı uygunsa sonuç "uygun değil" olamaz; bir kayıt
     kendi sayılarıyla çelişemez. */
  if (o.uygunSayisi === o.orneklemSayisi && o.sonuc === 'uygun_degil') {
    return {
      ok: false,
      sebep: 'Örneklemin tamamı uygun bulunmuş ama sonuç "uygun değil" '
        + 'yazılmış; kayıt kendi sayılarıyla çelişiyor.',
    };
  }
  if (o.uygunSayisi < o.orneklemSayisi && o.sonuc === 'uygun') {
    return {
      ok: false,
      sebep: `Örneklemde ${o.orneklemSayisi - o.uygunSayisi} uygunsuz kayıt var; `
        + 'sonuç "uygun" olamaz. "Kısmen uygun" ya da "uygun değil" seçin.',
    };
  }
  return { ok: true };
}

/* ── Kontrolün test duruşu ───────────────────────────────────────────── */

export type TestDurusu =
  | 'test_yok' | 'yalniz_tasarim' | 'bayat' | 'isleyis_uygun'
  | 'isleyis_kismen' | 'isleyis_uygunsuz';

export const DURUS_SOZU: Record<TestDurusu, string> = {
  /* Test edilmemiş kontrol "uygunsuz" DEĞİLDİR; ölçülmemiştir. */
  test_yok: 'hiç test edilmedi',
  yalniz_tasarim: 'yalnız TASARIM testi var — çalıştığı gösterilmedi',
  bayat: `en yeni test ${TEST_TAZELIK_GUN} günden eski`,
  isleyis_uygun: 'işleyiş testi uygun',
  isleyis_kismen: 'işleyiş testi kısmen uygun',
  isleyis_uygunsuz: 'işleyiş testi UYGUN DEĞİL',
};

export const DURUS_SINIFI: Record<TestDurusu, 'ok' | 'md' | 'bd' | 'unk'> = {
  test_yok: 'unk',
  yalniz_tasarim: 'md',
  bayat: 'md',
  isleyis_uygun: 'ok',
  isleyis_kismen: 'md',
  isleyis_uygunsuz: 'bd',
};

export type Test = {
  yontem: string;
  sonuc: string;
  testTarihi: number;
};

/**
 * Bir kontrolün test duruşu — EN YENİ İŞLEYİŞ testine bakar.
 *
 * Tasarım testi işleyiş testinin yerine geçmez: her ikisi de varsa
 * duruşu işleyiş belirler. Yalnız tasarım testi varsa ekran bunu
 * açıkça söyler, çünkü bu bir uyum iddiası için yetersizdir.
 */
export function testDurusu(o: {
  testler: readonly Test[];
  simdi: number;
  tazelikGun?: number;
}): TestDurusu {
  if (o.testler.length === 0) return 'test_yok';
  const isleyis = o.testler
    .filter((t) => t.yontem === 'isleyis')
    .sort((a, b) => b.testTarihi - a.testTarihi);
  if (isleyis.length === 0) return 'yalniz_tasarim';
  const son = isleyis[0];
  const esik = (o.tazelikGun ?? TEST_TAZELIK_GUN) * 86_400_000;
  if (o.simdi - son.testTarihi > esik) return 'bayat';
  if (son.sonuc === 'uygun') return 'isleyis_uygun';
  return son.sonuc === 'kismen' ? 'isleyis_kismen' : 'isleyis_uygunsuz';
}

/* ── Özet ────────────────────────────────────────────────────────────── */

export type TestOzeti = {
  toplam: number;
  testsiz: number;
  yalnizTasarim: number;
  bayat: number;
  isleyisUygun: number;
  sorunlu: number;
  /** İşleyiş testi olan kontrol oranı (%). Payda sıfırsa null. */
  isleyisKapsamasi: number | null;
};

export function testOzeti(duruslar: readonly TestDurusu[]): TestOzeti {
  const say = (d: TestDurusu) => duruslar.filter((x) => x === d).length;
  const isleyisli = say('isleyis_uygun') + say('isleyis_kismen')
    + say('isleyis_uygunsuz') + say('bayat');
  return {
    toplam: duruslar.length,
    testsiz: say('test_yok'),
    yalnizTasarim: say('yalniz_tasarim'),
    bayat: say('bayat'),
    isleyisUygun: say('isleyis_uygun'),
    sorunlu: say('isleyis_kismen') + say('isleyis_uygunsuz'),
    isleyisKapsamasi: duruslar.length === 0
      ? null
      : Math.round((isleyisli / duruslar.length) * 100),
  };
}

export function testCumlesi(o: TestOzeti): string {
  if (o.toplam === 0) return 'Kapsamda kontrol yok.';
  if (o.sorunlu > 0) {
    return `${o.sorunlu} kontrolün işleyiş testi uygun çıkmadı.`;
  }
  if (o.testsiz > 0) {
    return `${o.testsiz}/${o.toplam} kontrol hiç test edilmedi — uygunsuz `
      + 'DEĞİL, ölçülmemiş.';
  }
  if (o.yalnizTasarim > 0) {
    return `${o.yalnizTasarim} kontrolde yalnız tasarım testi var: kontrolün `
      + 'çalıştığı gösterilmedi.';
  }
  if (o.bayat > 0) {
    return `${o.bayat} kontrolün en yeni testi ${TEST_TAZELIK_GUN} günden eski.`;
  }
  return `${o.toplam} kontrolün tamamında güncel ve uygun işleyiş testi var.`;
}
