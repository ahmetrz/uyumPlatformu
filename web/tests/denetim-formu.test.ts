import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import {
  DEGERLENDIRILMEDI, FORM_SUTUNLARI, GEREKCESIZ_KAPSAM_DISI,
  bosHucreKapisi, formOlcumu, formSatiri, kapsamHucresi,
  type FormHucresi, type MaddeGirdisi,
} from '@/lib/denetim/formDoldurma';
import { formCsv, formXlsx } from '@/lib/denetim/formDisaAktarim';
import { maddeGirdisi, soaGirdisi, type MaddeDurumSatiri } from '@/lib/denetim/formVerisi';
import { GEREKCESIZ_HARIC, SOA_SUTUNLARI, soaSatiri, type SoaGirdisi } from '@/lib/denetim/soa';

/* ═══════════════════════════════════════════════════════════════════════
   DENETİM FORMU — HİÇBİR HÜCRE BOŞ KALMAZ

   Boş hücre denetçiye üç ayrı şeyi aynı anda söyler ve hiçbirini
   söylemez: "değerlendirdik, sonuç yok" · "değerlendirmedik" · "bu
   kontrol bize uygulanmıyor". Denetçi boşluğu kendi okumasıyla doldurur
   ve kurum o okumayı göremez.

   Gerekçe UYDURULMAZ: motor önerir, insan karar verir. Gerekçesiz bir
   kapsam-dışı kararı GİZLENMEZ, işaretlenir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Her alanı ölçülmemiş bir madde — en kötü hâl. */
const BOS_MADDE: MaddeGirdisi = {
  kod: 'CRC-1', baslik: 'Erişim yetkileri gözden geçirilir',
  durum: null, hedefOlgunluk: null, mevcutOlgunluk: null,
  kapsamDisi: false, kapsamDisiGerekcesi: null,
  kanitSayisi: null, sorumlu: null, sonDegerlendirme: null,
};

describe('öz denetim formu · boş hücre yok', () => {
  it('HER ALANI ölçülmemiş maddede bile hiçbir hücre boş değil', () => {
    const s = formSatiri(BOS_MADDE);
    for (const h of s.hucreler) expect(h.deger.trim(), h.anahtar).not.toBe('');
    expect(formOlcumu([s]).bosHucre).toBe(0);
  });

  it('ölçülmemiş hücre "Değerlendirilmedi" der — boş da kalmaz, sıfır da yazmaz', () => {
    const s = formSatiri(BOS_MADDE);
    const durum = s.hucreler.find((h) => h.anahtar === 'durum');
    expect(durum?.deger).toBe(DEGERLENDIRILMEDI);
    expect(durum?.isaret).toBe('olculmedi');
    /* "0" yazmak ölçüm yapıldığını söylerdi — bilinmeyen ≠ sıfır. */
    expect(s.hucreler.map((h) => h.deger)).not.toContain('0');
  });

  it('OLGUNLUK 0 bir ÖLÇÜMDÜR — "Değerlendirilmedi" değildir', () => {
    const s = formSatiri({ ...BOS_MADDE, mevcutOlgunluk: 0 });
    const m = s.hucreler.find((h) => h.anahtar === 'mevcutOlgunluk');
    expect(m?.deger).toBe('0');
    expect(m?.isaret).toBeNull();
  });

  it('sütun sayısı ile hücre sayısı AYNI — sessiz kayma olmaz', () => {
    const s = formSatiri(BOS_MADDE);
    expect(s.hucreler).toHaveLength(FORM_SUTUNLARI.length);
    expect(s.hucreler.map((h) => h.anahtar)).toEqual(FORM_SUTUNLARI.map((x) => x.anahtar));
  });
});

describe('öz denetim formu · kapsam kararı', () => {
  it('kapsam içi madde "Kapsamda" der', () => {
    expect(kapsamHucresi({ kapsamDisi: false, kapsamDisiGerekcesi: null }).deger)
      .toBe('Kapsamda');
  });

  it('GEREKÇELİ kapsam dışı: gerekçe AYNEN yazılır, işaret yok', () => {
    const h = kapsamHucresi({
      kapsamDisi: true, kapsamDisiGerekcesi: 'Kurumda kablosuz ağ yok',
    });
    expect(h.deger).toBe('Kapsam dışı — Kurumda kablosuz ağ yok');
    expect(h.isaret).toBeNull();
  });

  it('GEREKÇESİZ kapsam dışı İŞARETLENİR — gerekçe uydurulmaz [DNT-FRM-002]', () => {
    const h = kapsamHucresi({ kapsamDisi: true, kapsamDisiGerekcesi: null });
    expect(h.deger).toBe(GEREKCESIZ_KAPSAM_DISI);
    expect(h.isaret).toBe('gerekcesiz_kapsam_disi');
    /* Uydurulmuş bir sebep cümlesi taşımadığının kanıtı: hücrede
       "ilgili değil" · "uygulanmıyor" gibi bir varsayılan YOK. */
    expect(h.deger).not.toMatch(/ilgili|uygulanm/i);
  });

  it('boşluktan ibaret gerekçe de GEREKÇESİZ sayılır', () => {
    expect(kapsamHucresi({ kapsamDisi: true, kapsamDisiGerekcesi: '   ' }).isaret)
      .toBe('gerekcesiz_kapsam_disi');
  });

  it('kapsam dışı maddenin UYUM DURUMU "Değerlendirilmedi" değil "Kapsam dışı"dır', () => {
    /* İkisini aynı söze düşürmek, gerçek ölçüm boşluğunu kapsam
       kararının arkasına saklardı. */
    const s = formSatiri({ ...BOS_MADDE, kapsamDisi: true, kapsamDisiGerekcesi: 'sebep' });
    expect(s.hucreler.find((h) => h.anahtar === 'durum')?.deger).toBe('Kapsam dışı');
  });
});

describe('öz denetim formu · ölçüm ve kapı', () => {
  it('ölçüm işaretleri sayar: ölçülmedi ve gerekçesiz kapsam dışı', () => {
    const o = formOlcumu([
      formSatiri(BOS_MADDE),
      formSatiri({ ...BOS_MADDE, kod: 'CRC-2', kapsamDisi: true, kapsamDisiGerekcesi: null }),
    ]);
    expect(o.satir).toBe(2);
    expect(o.hucre).toBe(2 * FORM_SUTUNLARI.length);
    expect(o.bosHucre).toBe(0);
    expect(o.gerekcesizKapsamDisi).toBe(1);
    expect(o.olculmedi).toBeGreaterThan(0);
  });

  it('BOŞ HÜCRE KAPISI sıfır dışında FIRLATIR', () => {
    expect(() => bosHucreKapisi({
      satir: 1, hucre: 9, bosHucre: 1, olculmedi: 0, gerekcesizKapsamDisi: 0,
    })).toThrow(/BOŞ hücre/);
  });

  it('boş hücre yoksa kapı susar', () => {
    expect(() => bosHucreKapisi(formOlcumu([formSatiri(BOS_MADDE)]))).not.toThrow();
  });
});

const BOS_SOA: SoaGirdisi = {
  kod: 'CRC-1', baslik: 'Erişim yetkileri gözden geçirilir',
  uygulanabilir: true, gerekce: null, uygulamaDurumu: null,
  kanitReferansi: null, sorumlu: null,
};

describe('uygulanabilirlik beyanı (SoA)', () => {
  it('sütun sayısı ile hücre sayısı AYNI', () => {
    const s = soaSatiri(BOS_SOA);
    expect(s.hucreler.map((h) => h.anahtar)).toEqual(SOA_SUTUNLARI.map((x) => x.anahtar));
  });

  it('hiçbir hücre boş değil', () => {
    for (const g of [BOS_SOA, { ...BOS_SOA, uygulanabilir: false }]) {
      for (const h of soaSatiri(g).hucreler) expect(h.deger.trim(), h.anahtar).not.toBe('');
    }
  });

  it('GEREKÇESİZ HARİÇ TUTMA kusurdur — denetçinin ilk sorusu budur', () => {
    const s = soaSatiri({ ...BOS_SOA, uygulanabilir: false, gerekce: null });
    expect(s.hucreler.find((h) => h.anahtar === 'gerekce')?.deger).toBe(GEREKCESIZ_HARIC);
    expect(s.isaretler).toContain('gerekcesiz_kapsam_disi');
  });

  it('gerekçesiz DAHİL ETME ölçüm boşluğudur, kusur değil', () => {
    /* Kontrol zaten uygulanıyor; eksik olan yalnız yazılı sebep. */
    const s = soaSatiri({ ...BOS_SOA, uygulanabilir: true, gerekce: null });
    expect(s.hucreler.find((h) => h.anahtar === 'gerekce')?.deger).toBe(DEGERLENDIRILMEDI);
    expect(s.isaretler).not.toContain('gerekcesiz_kapsam_disi');
  });

  it('HARİÇ kontrolün kanıtı "ölçülmedi" değil "beklenmiyor"dur', () => {
    const s = soaSatiri({ ...BOS_SOA, uygulanabilir: false, gerekce: 'sebep' });
    const kanit = s.hucreler.find((h) => h.anahtar === 'kanitReferansi');
    expect(kanit?.deger).toBe('Beklenmiyor (hariç)');
    /* İşaret HÜCREDE aranır: aynı satırdaki `sorumlu` boş olduğu için
       satır düzeyinde `olculmedi` işareti VARDIR ve olmalıdır. */
    expect(kanit?.isaret).toBeNull();
    expect(s.hucreler.find((h) => h.anahtar === 'uygulamaDurumu')?.isaret).toBeNull();
  });

  it('gerekçe AYNEN taşınır — kısaltılmaz, yeniden yazılmaz', () => {
    const metin = 'Kurumda kart bazlı fiziksel erişim sistemi bulunmuyor';
    const s = soaSatiri({ ...BOS_SOA, uygulanabilir: false, gerekce: metin });
    expect(s.hucreler.find((h) => h.anahtar === 'gerekce')?.deger).toBe(metin);
  });
});

/* ── DIŞA AKTARIM ───────────────────────────────────────────────────── */

const SALDIRI = "=cmd|'/C calc'!A0";

describe('form dışa aktarımı · CSV ve XLSX aynı satırlardan', () => {
  const bolum = (hucreler: FormHucresi[]) => ({
    ad: 'EPDK Ek-3', sutunlar: FORM_SUTUNLARI, satirlar: [{ hucreler }],
  });
  const kunye = {
    baslik: 'Öz denetim formu',
    alanlar: [{ etiket: 'Çerçeve', deger: 'EPDK-SGYM' }, { etiket: 'Denetim', deger: null }],
  };

  it('BOŞ HÜCRE varsa dosya HİÇ üretilmez — ikisinde de', () => {
    const bozuk = bolum([{ anahtar: 'a', deger: '', isaret: null }]);
    expect(() => formCsv(kunye, [bozuk])).toThrow(/BOŞ hücre/);
    expect(() => formXlsx(kunye, [bozuk])).toThrow(/BOŞ hücre/);
  });

  it('künyede ölçülmemiş alan "Değerlendirilmedi" der — boş kalmaz', () => {
    const metin = formCsv(kunye, [bolum(formSatiri(BOS_MADDE).hucreler)]);
    expect(metin).toContain('Değerlendirilmedi');
    expect(metin).toContain('EPDK-SGYM');
  });

  it('KÖTÜ NİYETLİ değer CSV\'de kalkanlı çıkar', () => {
    /* Gerekçeyi kullanıcı yazar; formu biz üretiriz. Kusur ürünündür.

       Kalkan hücrenin BAŞINDAKİ karaktere bakar: saldırı dizesi bir
       hücrenin tamamıysa tırnaklanır. `Kapsam dışı — =cmd…` gibi ortaya
       gömülü bir metin Excel'de zaten formül değildir ve ona tırnak
       koymak gerekçeyi bozardı — kalkan orada bilerek susar. */
    const satir = formSatiri({ ...BOS_MADDE, sorumlu: SALDIRI });
    const metin = formCsv(kunye, [bolum(satir.hucreler)]);
    expect(metin).toContain(`'${SALDIRI}`);

    /* Asıl güvence: HİÇBİR CSV alanı tehlikeli karakterle başlamaz. */
    for (const s of metin.split('\r\n')) {
      for (const h of s.split(';')) {
        expect(h.replace(/^"/, ''), h).not.toMatch(/^[=+@\t\r]/);
      }
    }
  });

  it('gerekçenin ORTASINDAKİ saldırı metni bozulmadan taşınır', () => {
    const satir = formSatiri({
      ...BOS_MADDE, kapsamDisi: true, kapsamDisiGerekcesi: SALDIRI,
    });
    const metin = formCsv(kunye, [bolum(satir.hucreler)]);
    expect(metin).toContain(`Kapsam dışı — ${SALDIRI}`);
  });

  it('KÖTÜ NİYETLİ gerekçe XLSX\'te formül hücresi olmaz', () => {
    const satir = formSatiri({
      ...BOS_MADDE, kapsamDisi: false, kapsamDisiGerekcesi: null, sorumlu: SALDIRI,
    });
    const buf = formXlsx(kunye, [bolum(satir.hucreler)]);
    const kitap = XLSX.read(buf, { type: 'buffer' });
    for (const ad of kitap.SheetNames) {
      const sayfa = kitap.Sheets[ad]!;
      for (const [adres, h] of Object.entries(sayfa)) {
        if (adres.startsWith('!')) continue;
        expect((h as { f?: string }).f, `${ad}!${adres}`).toBeUndefined();
        const v = (h as { v: unknown }).v;
        if (typeof v === 'string') expect(v).not.toMatch(/^=/);
      }
    }
  });

  it('XLSX: künye ayrı sayfa, her bölüm kendi sayfasında', () => {
    const s = formSatiri(BOS_MADDE).hucreler;
    const buf = formXlsx(kunye, [
      { ad: 'Ek-3', sutunlar: FORM_SUTUNLARI, satirlar: [{ hucreler: s }] },
      { ad: 'Ek-4', sutunlar: FORM_SUTUNLARI, satirlar: [{ hucreler: s }] },
    ]);
    expect(XLSX.read(buf, { type: 'buffer' }).SheetNames).toEqual(['Künye', 'Ek-3', 'Ek-4']);
  });
});

/* ── VERİ EŞLEMESİ (R-D) ────────────────────────────────────────────── */

const SATIR: MaddeDurumSatiri = {
  madde: { kod: 'CRC-1', baslik: 'Erişim yetkileri', olgunlukSeviyesi: 4 },
  durum: 'kismi', olgunlukSeviyesi: 2, not: null,
  sorumluAdi: null, sonDegerlendirme: null, kanitSayisi: null,
};

describe('veri eşlemesi · hedef ile mevcut KARIŞMAZ [R-D]', () => {
  it('hedef ÇERÇEVEDEN, mevcut BU ÖĞEDEN gelir', () => {
    /* Ürünün en pahalı kusuru buydu: kaynak belgenin kademesi HEDEF
       alanına yazılınca 508 zorunlu kontrolün hedefi düşmüş ve ad-hoc
       uygulama "hedefte" görünmüştü. Biçim doğru, değer aralıkta,
       hiçbir kapı göremedi. */
    const g = maddeGirdisi(SATIR);
    expect(g.hedefOlgunluk).toBe(4);
    expect(g.mevcutOlgunluk).toBe(2);
  });

  it('TERS yazılsaydı ölçüm değişirdi — vaka bunu gösterir', () => {
    const ters = maddeGirdisi({
      ...SATIR,
      madde: { ...SATIR.madde, olgunlukSeviyesi: 2 },
      olgunlukSeviyesi: 4,
    });
    expect(ters.hedefOlgunluk).toBe(2);
    expect(ters.mevcutOlgunluk).toBe(4);
    expect(ters.hedefOlgunluk).not.toBe(maddeGirdisi(SATIR).hedefOlgunluk);
  });

  it('ÖLÇÜLMEMİŞ kademe sıfıra çekilmez', () => {
    const g = maddeGirdisi({ ...SATIR, olgunlukSeviyesi: null });
    expect(g.mevcutOlgunluk).toBeNull();
    const s = formSatiri(g);
    expect(s.hucreler.find((h) => h.anahtar === 'mevcutOlgunluk')?.deger)
      .toBe(DEGERLENDIRILMEDI);
  });

  it('BİLİNMEYEN durum kodu "Değerlendirilmedi" değil KODUN KENDİSİ olur', () => {
    /* Sözlüğün eksiği ürünün eksiğidir; denetçi hangi kodu görmediğimizi
       görebilmeli. Bilinmeyeni "ölçülmedi" saymak kodu gizlerdi. */
    expect(maddeGirdisi({ ...SATIR, durum: 'yeni_kod' }).durum).toBe('yeni_kod');
  });

  it('kapsam dışı satırın GEREKÇESİ `not` alanından gelir', () => {
    const g = maddeGirdisi({ ...SATIR, durum: 'kapsamdisi', not: 'Kablosuz ağ yok' });
    expect(g.kapsamDisi).toBe(true);
    expect(g.kapsamDisiGerekcesi).toBe('Kablosuz ağ yok');
  });

  it('kapsam dışı ama `not` BOŞSA gerekçe üretilmez — kusur işaretlenir [DNT-FRM-002]', () => {
    const s = formSatiri(maddeGirdisi({ ...SATIR, durum: 'kapsamdisi', not: null }));
    expect(s.isaretler).toContain('gerekcesiz_kapsam_disi');
  });

  it('KAPSAM İÇİ satırın `not` alanı gerekçe sanılmaz', () => {
    /* `not` serbest bir alandır; kapsam dışı OLMAYAN bir satırda oradaki
       metin bir kapsam gerekçesi değildir ve öyle sunulamaz. */
    expect(maddeGirdisi({ ...SATIR, durum: 'uyumlu', not: 'gelecek çeyrek' })
      .kapsamDisiGerekcesi).toBeNull();
  });

  it('tarih denetçinin okuyacağı biçime çevrilir', () => {
    const g = maddeGirdisi({ ...SATIR, sonDegerlendirme: new Date('2026-03-07T00:00:00Z') });
    expect(g.sonDegerlendirme).toBe('07.03.2026');
  });
});

describe('veri eşlemesi · SoA', () => {
  it('kapsam dışı satır SoA\'da "uygulanabilir değil" olur', () => {
    const s = soaGirdisi({ ...SATIR, durum: 'kapsamdisi', not: 'sebep' });
    expect(s.uygulanabilir).toBe(false);
    expect(s.gerekce).toBe('sebep');
  });

  it('SIFIR kanıt REFERANS sayılmaz', () => {
    /* Sayı "kaç dosya var" der, referans "hangisi" der; sıfırı referans
       diye yazmak boş hücreyi süslemek olurdu. */
    expect(soaGirdisi({ ...SATIR, kanitSayisi: 0 }).kanitReferansi).toBeNull();
    expect(soaGirdisi({ ...SATIR, kanitSayisi: 3 }).kanitReferansi).toBe('3 kanıt kaydı');
  });

  it('SAYILMAMIŞ kanıt sıfırla karıştırılmaz', () => {
    const s = soaSatiri(soaGirdisi({ ...SATIR, kanitSayisi: null }));
    expect(s.hucreler.find((h) => h.anahtar === 'kanitReferansi')?.deger)
      .toBe(DEGERLENDIRILMEDI);
  });
});

/* ── SIR SÜZGECİ · kanıt paketiyle AYNI süzgeç ───────────────────────── */

describe('form dışa aktarımı · sır süzgeci', () => {
  const kunye = { baslik: 'Öz denetim formu', alanlar: [{ etiket: 'Çerçeve', deger: 'X' }] };
  const bolum = (deger: string) => ({
    ad: 'Bölüm',
    sutunlar: FORM_SUTUNLARI,
    satirlar: [{ hucreler: [{ anahtar: 'sorumlu', deger, isaret: null }] as FormHucresi[] }],
  });

  it('PEM özel anahtarı taşıyan hücre DOSYA ÜRETTİRMEZ', () => {
    /* Form serbest metin taşır: kapsam gerekçesi, `not`, sorumlu adı. Bir
       operatörün oraya yapıştırdığı anahtar denetçiye gidemez. */
    const b = bolum('-----BEGIN RSA PRIVATE KEY-----\nMIIE');
    expect(() => formCsv(kunye, [b])).toThrow();
    expect(() => formXlsx(kunye, [b])).toThrow();
  });

  it('Authorization başlığı taşıyan hücre de DOSYA ÜRETTİRMEZ', () => {
    const b = bolum('hata: bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    expect(() => formCsv(kunye, [b])).toThrow();
  });

  it('sıradan metin süzgeçten geçer — süzgeç her şeyi yakalamıyor', () => {
    /* Kapının yanlış pozitifi de ölçülür: her metni reddeden bir süzgeç
       formu hiç üretmezdi. */
    expect(() => formCsv(kunye, [bolum('Bilgi Güvenliği Sorumlusu')])).not.toThrow();
  });

  /* ── ÜÇÜNCÜ DİŞ: BİLİNEN SIRLAR (bağımsız inceleme bulgusu, PR #46) ──
     Süzgecin üç dişi var: alan ADI · değer KALIBI · BİLİNEN SIRLAR.
     Form yolu ilk turda üçüncüsünü hiç geçirmiyordu (`bilinenSirlar`
     varsayılan `[]`) ve gövdeyi yalnız DEĞER dizisi olarak
     serileştirdiği için birinci diş de hiçbir zaman gerçek bir alan adı
     görmüyordu. İkisi de bir kapı değil, metni okuyan bir inceleme
     tarafından yakalandı. */

  it('KURULUMDAKİ ham sır referansı hücrede geçerse dosya ÜRETİLMEZ', () => {
    /* Somut senaryo: bir sorumlu kapsam gerekçesine entegrasyonun vault
       yolunu yapıştırır. Ne ad kara listesi ne kalıp listesi bunu görür —
       yalnız "kurulumda bu değer sır olarak duruyor mu" karşılaştırması
       görür. */
    const sir = 'vault:kv/uretim/scada-toplayici#anahtar';
    const b = bolum(`Kapsam dışı — toplayıcı ${sir} ile otomatik izleniyor.`);
    expect(() => formCsv(kunye, [b], [sir])).toThrow(/sır sızıntısı/);
    expect(() => formXlsx(kunye, [b], [sir])).toThrow(/sır sızıntısı/);
  });

  it('aynı metin, bilinen sır LİSTESİ verilmezse geçer — dişin çalıştığının kanıtı', () => {
    /* Bu vaka kapının kendi yürüyüşünü ölçer: yukarıdaki kırmızı
       gerçekten ÜÇÜNCÜ dişten mi geliyor, yoksa metin başka bir sebeple
       mi reddediliyor. */
    const sir = 'vault:kv/uretim/scada-toplayici#anahtar';
    const b = bolum(`Kapsam dışı — toplayıcı ${sir} ile otomatik izleniyor.`);
    expect(() => formCsv(kunye, [b], [])).not.toThrow();
  });

  it('ALAN ADI süzgece ULAŞIYOR — gövde anahtarıyla serileştiriliyor', () => {
    /* İlk diş alan adına bakar; gövde yalnız değer dizisi olsaydı bu diş
       hiçbir zaman ısırmazdı. Hücrenin anahtarı `parola` olduğunda
       süzgeç DEĞERİNE bakmadan reddetmelidir. */
    const b = {
      ad: 'Bölüm',
      sutunlar: FORM_SUTUNLARI,
      satirlar: [{
        hucreler: [{ anahtar: 'parola', deger: 'Ayşe Yılmaz', isaret: null }] as FormHucresi[],
      }],
    };
    expect(() => formCsv(kunye, [b])).toThrow(/sır sızıntısı/);
  });

  it('kısa değer bilinen sır sayılmaz — yanlış alarm üretmez', () => {
    /* `sirSizintisiVarMi` altı karakterden kısa değerleri eler; form yolu
       o kuralın ikinci bir kopyasını taşımaz. */
    expect(() => formCsv(kunye, [bolum('Ali Veli')], ['env'])).not.toThrow();
  });
});
