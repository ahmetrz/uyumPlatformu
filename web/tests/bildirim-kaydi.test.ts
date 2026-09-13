import { describe, expect, it } from 'vitest';
import {
  BILDIRIM_KAYDI_DURUMLARI, GEREKCE_ASGARI, KAYIT_DURUM_SINIFI, KAYIT_DURUM_SOZU,
  MOTORUN_YAZABILECEGI, REFERANS_ASGARI, SURESIZ_SOZU,
  geriSayim, gonderimKapisi, gorunenDurum, kayitCumlesi, kayitKapali, kayitOzeti,
  motorYazabilirMi, motorunKarari, teyitKapisi, uyanYukumlulukler, uygulanmazKapisi,
  type SureliYukumluluk,
} from '@/lib/uyum/bildirimKaydi';
import {
  BILDIRIM_SINIFI, BILDIRIM_SOZU, bildirimKarari, kuralKapisi, uyanYukumluluk,
} from '@/lib/uyum/bildirimSuresi';

/* ═══════════════════════════════════════════════════════════════════════
   R10 · OLAY → MEVZUAT BİLDİRİMİ — SAF KURALLAR [OLY-BIL]

   Üç iddia burada ölçülür ve üçü de ürünün en temel vaadine dokunur:

   1. MOTOR GÖNDERMEZ. Motorun yazabileceği iki durum vardır; `gonderildi`
      onlardan biri DEĞİLDİR. [OLY-BIL-003]
   2. SÜRE YOKSA GERİ SAYIM YOK ve `suresi_gecti` ASLA yazılmaz. Süresiz
      bir yükümlülük "geciken" değildir; saat UYDURULMAZ. [OLY-BIL-002]
   3. REFERANSSIZ GÖNDERİM REDDEDİLİR — referansı olmayan bir gönderim
      denetimde doğrulanamaz. [OLY-BIL-004]
   ═══════════════════════════════════════════════════════════════════════ */

const SAAT = 3_600_000;
const simdi = Date.UTC(2026, 8, 10, 12, 0, 0);

const yuk = (ek: Partial<SureliYukumluluk> = {}): SureliYukumluluk => ({
  id: 'y1', kod: 'KVKK-72', ad: 'Kişisel veri ihlali bildirimi',
  regulasyonId: null, asgariSiddet: 'yuksek', sureSaat: 72,
  merci: 'Kişisel Verileri Koruma Kurulu', aktif: true, tetikleyici: 'olay', ...ek,
});

describe('MOTOR GÖNDERMEZ [OLY-BIL-003]', () => {
  it('motorun yazabileceği durumlar YALNIZ taslak ve suresi_gecti', () => {
    expect([...MOTORUN_YAZABILECEGI].sort()).toEqual(['suresi_gecti', 'taslak']);
  });

  it('gonderildi · teyit_alindi · uygulanmaz motora KAPALI', () => {
    for (const d of ['gonderildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(motorYazabilirMi(d), d).toBe(false);
    }
  });

  it('motor KAPALI bir kayda dokunmaz — süresi geçmiş olsa bile', () => {
    /* Gönderilmiş bir bildirimi "süresi geçti" diye işaretlemek, yapılmış
       bir işi yapılmamış göstermek olurdu. */
    const gecmis = geriSayim({ baslangic: simdi - 100 * SAAT, simdi, sureSaat: 72 });
    expect(gecmis.gecti).toBe(true);
    for (const d of ['gonderildi', 'teyit_alindi', 'uygulanmaz']) {
      expect(motorunKarari({ mevcutDurum: d, geriSayim: gecmis }), d).toBeNull();
      expect(kayitKapali(d), d).toBe(true);
    }
  });

  it('motor AÇIK taslağı süresi geçince suresi_gecti yapar', () => {
    const gecmis = geriSayim({ baslangic: simdi - 100 * SAAT, simdi, sureSaat: 72 });
    expect(motorunKarari({ mevcutDurum: 'taslak', geriSayim: gecmis })).toBe('suresi_gecti');
  });

  it('süresi GEÇMEMİŞ taslağa dokunmaz', () => {
    const isliyor = geriSayim({ baslangic: simdi - 1 * SAAT, simdi, sureSaat: 72 });
    expect(motorunKarari({ mevcutDurum: 'taslak', geriSayim: isliyor })).toBeNull();
  });

  it('motorun kararı `suresi_gecti` bile olsa yazma listesinden geçer', () => {
    const gecmis = geriSayim({ baslangic: simdi - 100 * SAAT, simdi, sureSaat: 72 });
    const karar = motorunKarari({ mevcutDurum: 'taslak', geriSayim: gecmis });
    expect(karar !== null && motorYazabilirMi(karar)).toBe(true);
  });
});

describe('SÜRE YOKSA GERİ SAYIM YOK [OLY-BIL-002]', () => {
  it('sureSaat null → son tarih yok, kalan yok, geçmedi', () => {
    const g = geriSayim({ baslangic: simdi - 10_000 * SAAT, simdi, sureSaat: null });
    expect(g.sureVar).toBe(false);
    expect(g.sonTarih).toBeNull();
    expect(g.kalanDakika).toBeNull();
    expect(g.gecti).toBe(false);
    expect(g.soz).toBe(SURESIZ_SOZU);
  });

  it('süresiz yükümlülükte `suresi_gecti` ASLA yazılmaz — kaç yıl geçerse geçsin', () => {
    const g = geriSayim({ baslangic: 0, simdi, sureSaat: null });
    expect(motorunKarari({ mevcutDurum: 'taslak', geriSayim: g })).toBeNull();
  });

  it('SIFIR saat ile süresiz AYNI ŞEY DEĞİLDİR', () => {
    /* Sıfır "doğduğu anda geçti" demektir; null "geçecek süre yok" der.
       Karıştırılırsa ürün hiç gecikmemiş bir yükümlülük için
       "geciktiniz" diye bağırır. */
    const sifir = geriSayim({ baslangic: simdi, simdi, sureSaat: 0 });
    expect(sifir.sureVar).toBe(true);
    expect(sifir.sonTarih).toBe(simdi);
    const bos = geriSayim({ baslangic: simdi, simdi, sureSaat: null });
    expect(bos.sureVar).toBe(false);
  });

  it('süreli yükümlülükte son tarih olayın BAŞLANGICINDAN hesaplanır', () => {
    const g = geriSayim({ baslangic: simdi - 24 * SAAT, simdi, sureSaat: 72 });
    expect(g.sonTarih).toBe(simdi + 48 * SAAT);
    expect(g.kalanDakika).toBe(48 * 60);
    expect(g.gecti).toBe(false);
    expect(g.soz).toMatch(/2 gün 0 saat kaldı/);
  });

  it('geçmiş süre GECİKME diye söylenir, negatif sayı diye değil', () => {
    const g = geriSayim({ baslangic: simdi - 80 * SAAT, simdi, sureSaat: 72 });
    expect(g.gecti).toBe(true);
    expect(g.soz).toMatch(/GECİKME/);
  });

  it('kural kapısı BOŞ süreyi kabul eder ama SIFIRI reddeder', () => {
    const temel = { asgariSiddet: 'yuksek', dayanak: '7545 md. 7', merci: 'Merci' };
    expect(kuralKapisi({ ...temel, sureSaat: null }).ok).toBe(true);
    const sifir = kuralKapisi({ ...temel, sureSaat: 0 });
    expect(sifir.ok).toBe(false);
    if (!sifir.ok) expect(sifir.sebep).toMatch(/BOŞ bırakın/);
  });

  it('süresiz kural yine de DAYANAK ve MERCİ ister', () => {
    expect(kuralKapisi({ sureSaat: null, asgariSiddet: 'yuksek', dayanak: '  ', merci: 'M' }).ok)
      .toBe(false);
    expect(kuralKapisi({ sureSaat: null, asgariSiddet: 'yuksek', dayanak: 'X', merci: '' }).ok)
      .toBe(false);
  });
});

describe('HER UYAN YÜKÜMLÜLÜK AYRI [OLY-BIL-001]', () => {
  const kurallar = [
    yuk({ id: 'y1', kod: 'KVKK-72', sureSaat: 72 }),
    yuk({ id: 'y2', kod: '7545-MD7', sureSaat: null }),
    yuk({ id: 'y3', kod: 'SPK-10G', sureSaat: 240, regulasyonId: 'r-spk' }),
    yuk({ id: 'y4', kod: 'PASIF', aktif: false }),
    yuk({ id: 'y5', kod: 'KRITIK-ONLY', asgariSiddet: 'kritik' }),
  ];

  it('uyanların HEPSİ döner — en kısa süreli seçilmez [OLY-BIL-001]', () => {
    const u = uyanYukumlulukler({ siddet: 'yuksek', regulasyonIdleri: [], kurallar });
    expect(u.map((x) => x.kod)).toEqual(['7545-MD7', 'KVKK-72']);
  });

  it('regülasyona bağlı kural yalnız o regülasyon kapsamdaysa uyar', () => {
    const u = uyanYukumlulukler({ siddet: 'yuksek', regulasyonIdleri: ['r-spk'], kurallar });
    expect(u.map((x) => x.kod)).toEqual(['7545-MD7', 'KVKK-72', 'SPK-10G']);
  });

  it('pasif kural ve eşiği aşmayan şiddet uymaz', () => {
    const u = uyanYukumlulukler({ siddet: 'orta', regulasyonIdleri: [], kurallar });
    expect(u).toEqual([]);
  });

  it('sıra DETERMİNİSTİK — iki koşu aynı listeyi verir', () => {
    const bir = uyanYukumlulukler({ siddet: 'kritik', regulasyonIdleri: [], kurallar });
    const iki = uyanYukumlulukler({
      siddet: 'kritik', regulasyonIdleri: [], kurallar: [...kurallar].reverse(),
    });
    expect(bir.map((x) => x.kod)).toEqual(iki.map((x) => x.kod));
  });
});

describe('UY-63 tek-kural katmanı süresiz kuralı YUTMAZ', () => {
  it('süreli kural varsa o kazanır (en kısa)', () => {
    const k = uyanYukumluluk({
      siddet: 'yuksek',
      regulasyonIdleri: [],
      kurallar: [yuk({ sureSaat: null, kod: 'A' }), yuk({ id: 'y2', kod: 'B', sureSaat: 24 })],
    });
    expect(k?.kod).toBe('B');
  });

  it('YALNIZ süresizler uyuyorsa yükümlülük GÖRÜNÜR ve durum sure_belirsiz', () => {
    /* Süresizi hiç saymamak, yükümlülüğü görünmez yapardı: kurum
       "bildirim yükümlülüğü doğmadı" sanırdı. */
    const k = bildirimKarari({
      siddet: 'yuksek',
      baslangic: simdi - 500 * SAAT,
      simdi,
      bildirimGerekli: null,
      bildirimTarihi: null,
      regulasyonIdleri: [],
      kurallar: [yuk({ sureSaat: null })],
    });
    expect(k.durum).toBe('sure_belirsiz');
    expect(k.yukumluluk?.kod).toBe('KVKK-72');
    expect(k.sonTarih).toBeNull();
    expect(k.kalanDakika).toBeNull();
  });

  it('sure_belirsiz YEŞİL değildir — bilinmeyen sıfır sayılmaz', () => {
    /* "Süre belirlenmedi" bir iyi haber değil, ölçülemeyendir; yeşil
       göstermek onu "yolunda" diye okutur. */
    expect(BILDIRIM_SINIFI.sure_belirsiz).toBe('unk');
    expect(BILDIRIM_SOZU.sure_belirsiz).toMatch(/süre mevzuatta belirlenmedi/);
  });

  it('süresiz yükümlülükte bildirim yapılmışsa "bildirildi" denir', () => {
    /* Geri sayım yok ama bildirim VAR: geç mi erken mi olduğunu ürün
       söyleyemez ve söylemeye çalışmaz. */
    const k = bildirimKarari({
      siddet: 'yuksek',
      baslangic: simdi - 500 * SAAT,
      simdi,
      bildirimGerekli: null,
      bildirimTarihi: simdi - 1 * SAAT,
      regulasyonIdleri: [],
      kurallar: [yuk({ sureSaat: null })],
    });
    expect(k.durum).toBe('bildirildi');
    expect(k.sonTarih).toBeNull();
  });
});

describe('İNSAN KARARI KAPILARI [OLY-BIL-004]', () => {
  it('REFERANSSIZ gönderim REDDEDİLİR [OLY-BIL-004]', () => {
    const r = gonderimKapisi({ mevcutDurum: 'taslak', referansNo: '  ' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toMatch(/referans numarası zorunlu/i);
  });

  it('çok kısa referans da reddedilir', () => {
    expect(gonderimKapisi({ mevcutDurum: 'taslak', referansNo: 'A' }).ok).toBe(false);
    expect(REFERANS_ASGARI).toBe(3);
  });

  it('referansla gönderim geçer — süresi geçmiş kayıttan da', () => {
    expect(gonderimKapisi({ mevcutDurum: 'taslak', referansNo: 'KVKK-2026-0042' }).ok).toBe(true);
    /* Geç bildirim yine de bir bildirimdir: kapı onu engellemez, kayıt
       gecikmeyi saklamaz. */
    expect(gonderimKapisi({ mevcutDurum: 'suresi_gecti', referansNo: 'X-1' }).ok).toBe(true);
  });

  it('zaten gönderilmiş kayıt İKİNCİ kez gönderilmiş işaretlenemez', () => {
    expect(gonderimKapisi({ mevcutDurum: 'gonderildi', referansNo: 'X-1' }).ok).toBe(false);
    expect(gonderimKapisi({ mevcutDurum: 'teyit_alindi', referansNo: 'X-1' }).ok).toBe(false);
  });

  it('"uygulanmaz" kapatılmış kayıt önce geri alınmadan gönderilemez', () => {
    const r = gonderimKapisi({ mevcutDurum: 'uygulanmaz', referansNo: 'X-1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toMatch(/uygulanmaz/);
  });

  it('teyit YALNIZ gönderilmiş bildirime işlenir', () => {
    expect(teyitKapisi({ mevcutDurum: 'gonderildi' }).ok).toBe(true);
    for (const d of ['taslak', 'suresi_gecti', 'uygulanmaz', 'teyit_alindi']) {
      expect(teyitKapisi({ mevcutDurum: d }).ok, d).toBe(false);
    }
  });

  it('GEREKÇESİZ "uygulanmaz" reddedilir', () => {
    const r = uygulanmazKapisi({ mevcutDurum: 'taslak', gerekce: 'yok' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toMatch(/Gerekçe zorunlu/);
    expect(GEREKCE_ASGARI).toBe(15);
  });

  it('gerekçeli "uygulanmaz" geçer; GÖNDERİLMİŞ kayıt için geçmez', () => {
    expect(uygulanmazKapisi({
      mevcutDurum: 'taslak', gerekce: 'Olay kişisel veri içermiyor; KVKK kapsamı doğmuyor.',
    }).ok).toBe(true);
    expect(uygulanmazKapisi({
      mevcutDurum: 'gonderildi', gerekce: 'Olay kişisel veri içermiyor; kapsam doğmuyor.',
    }).ok).toBe(false);
  });
});

describe('durum sözlüğü ve özet', () => {
  it('her durumun sözü ve sınıfı var — eksik durum sessiz kalmaz', () => {
    for (const d of BILDIRIM_KAYDI_DURUMLARI) {
      expect(KAYIT_DURUM_SOZU[d], d).toBeTruthy();
      expect(KAYIT_DURUM_SINIFI[d], d).toBeTruthy();
    }
  });

  it('taslak YEŞİL değildir; süresi geçen KIRMIZI, uygulanmaz nötr', () => {
    expect(KAYIT_DURUM_SINIFI.taslak).toBe('md');
    expect(KAYIT_DURUM_SINIFI.suresi_gecti).toBe('bd');
    expect(KAYIT_DURUM_SINIFI.uygulanmaz).toBe('pl');
    expect(KAYIT_DURUM_SINIFI.gonderildi).toBe('ok');
  });

  it('özet süresizleri AYRI sayar ve cümlede söyler', () => {
    const o = kayitOzeti([
      { durum: 'taslak', sureSaat: null },
      { durum: 'taslak', sureSaat: 72 },
      { durum: 'gonderildi', sureSaat: 72 },
    ]);
    expect(o).toEqual({
      toplam: 3, taslak: 2, gonderildi: 1, teyitAlindi: 0,
      suresiGecti: 0, uygulanmaz: 0, suresiz: 1,
    });
    expect(kayitCumlesi(o)).toMatch(/süre mevzuatta belirlenmedi/);
  });

  it('süresi geçen varsa cümle ONU söyler — öncelik kusurdadır', () => {
    const o = kayitOzeti([
      { durum: 'suresi_gecti', sureSaat: 72 },
      { durum: 'taslak', sureSaat: null },
    ]);
    expect(kayitCumlesi(o)).toMatch(/süresi GEÇTİ/);
  });

  it('kayıt yoksa "yükümlülük doğmadı" denir, "hepsi tamam" denmez', () => {
    expect(kayitCumlesi(kayitOzeti([]))).toMatch(/yükümlülüğü doğmadı/);
  });
});

/* ═══ EKRANIN GÖSTERDİĞİ DURUM · bağımsız inceleme bulgusu #47/1 ══════ */

describe('ekran durumu geri sayımla UZLAŞTIRILIR [OLY-BIL-002]', () => {
  const SAAT = 3_600_000;
  const gecmis = (saat: number) => geriSayim({
    baslangic: Date.now() - saat * SAAT, simdi: Date.now(), sureSaat: 24,
  });

  it('süresi dolmuş TASLAK ekranda "süresi geçti" görünür — motor daha yetişmedi', () => {
    /* Kusur: motor SAATTE BİR koşar, geri sayım her istekte canlıdır.
       Aradaki pencerede satır "Taslak hazır — gönderilmedi · 20 dakika
       GECİKME" diyordu: iki söz aynı satırda çelişiyordu. */
    expect(gorunenDurum({ kayitDurumu: 'taslak', geriSayim: gecmis(25) }))
      .toBe('suresi_gecti');
  });

  it('süresi DOLMAMIŞ taslak taslak kalır', () => {
    expect(gorunenDurum({ kayitDurumu: 'taslak', geriSayim: gecmis(1) })).toBe('taslak');
  });

  it('SÜRESİZ yükümlülükte hiçbir zaman "geçti" gösterilmez', () => {
    const suresiz = geriSayim({ baslangic: Date.now() - 1000 * SAAT, simdi: Date.now(), sureSaat: null });
    expect(gorunenDurum({ kayitDurumu: 'taslak', geriSayim: suresiz })).toBe('taslak');
  });

  it('İNSAN KARARI ekranda geri alınmaz — kapalı kayıt olduğu gibi görünür', () => {
    /* Ekran uzlaştırması motorun kararını taklit eder, İNSANINKİNİ
       değil: gönderilmiş bir bildirim gecikmeli de olsa gönderilmiştir. */
    for (const d of ['gonderildi', 'teyit_alindi', 'uygulanmaz'] as const) {
      expect(gorunenDurum({ kayitDurumu: d, geriSayim: gecmis(99) })).toBe(d);
    }
  });

  it('ekran YAZMAZ: karar motorun yazabildiği kümenin dışına çıkamaz', () => {
    const sonuc = gorunenDurum({ kayitDurumu: 'taslak', geriSayim: gecmis(25) });
    expect(MOTORUN_YAZABILECEGI).toContain(sonuc);
  });
});
