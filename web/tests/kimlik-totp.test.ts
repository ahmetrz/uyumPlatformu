import { describe, expect, it } from 'vitest';
import {
  ADIM_SANIYE, BASAMAK, KURTARMA_ADEDI, KURTARMA_UZUNLUK,
  adimNo, base32Coz, base32Kodla, hotp, kaydolmaUri, kurtarmaKodlariUret,
  kurtarmaNormalize, totp, totpDogrula, totpSirriUret,
} from '@/lib/kimlik/totp';
import {
  ATIL_TABAN_SAAT, MUTLAK_TAVAN_SAAT, VARSAYILAN_POLITIKA,
  mfaGirisKapisi, politikaCoz, politikaKapisi,
} from '@/lib/kimlik/politika';

/* ═══════════════════════════════════════════════════════════════════════
   P6 · TOTP VE OTURUM POLİTİKASI [SIS-KML-004 · SIS-KML-005]

   TOTP RFC 4226'nın KENDİ VEKTÖRLERİYLE ölçülür. "Kod üretiyor" demek
   bir doğrulama değildir: yanlış uygulanmış bir HOTP de kod üretir ve
   kullanıcının doğrulayıcı uygulaması ancak müşteride tutmadığında
   anlaşılır.
   ═══════════════════════════════════════════════════════════════════════ */

/** RFC 4226 Ek D: sır "12345678901234567890", sayaç 0–9. */
const RFC_SIR = Buffer.from('12345678901234567890', 'ascii');
const RFC_HOTP = [
  '755224', '287082', '359152', '969429', '338314',
  '254676', '287922', '162583', '399871', '520489',
];

describe('HOTP · RFC 4226 vektörleri [SIS-KML-004]', () => {
  it('on sayacın onu da RFC ile birebir [SIS-KML-004]', () => {
    expect(RFC_HOTP.map((_, i) => hotp(RFC_SIR, i))).toEqual(RFC_HOTP);
  });
});

describe('TOTP · RFC 6238 zaman vektörleri [SIS-KML-004]', () => {
  /* RFC 6238 Ek B (SHA-1 satırları); sır aynı 20 baytlık dizedir. */
  const SIR32 = base32Kodla(RFC_SIR);
  const VEKTOR: [number, string][] = [
    [59, '287082'], [1111111109, '081804'], [1111111111, '050471'],
    [1234567890, '005924'], [2000000000, '279037'],
  ];

  it('beş zaman noktasının beşi de RFC ile birebir [SIS-KML-004]', () => {
    for (const [saniye, beklenen] of VEKTOR) {
      expect(totp(SIR32, saniye * 1000), `t=${saniye}`).toBe(beklenen);
    }
  });

  it('adım 30 saniyedir: adım İÇİNDE sabit, SINIRINDA değişir [SIS-KML-004]', () => {
    /* İki iddia birlikte ölçülür ve ikincisi olmadan birincisi yalan
       söyleyebilir: hep aynı kodu üreten bozuk bir uygulama da "adım
       içinde değişmiyor" testini geçerdi. RFC'nin kendi vektörleri bunu
       gösteriyor — 1111111109 ve 1111111111 AYRI adımlardadır. */
    const ic = 1111111111 * 1000;
    expect(adimNo(ic)).toBe(Math.floor(1111111111 / ADIM_SANIYE));
    expect(totp(SIR32, ic)).toBe(totp(SIR32, ic + 1000));
    expect(totp(SIR32, 1111111109 * 1000)).not.toBe(totp(SIR32, ic));
  });
});

describe('base32 gidiş-dönüş [SIS-KML-004]', () => {
  it('kodlanan çözülür ve aynı bayta döner [SIS-KML-004]', () => {
    for (const n of [1, 5, 10, 20, 32]) {
      const b = Buffer.from(Array.from({ length: n }, (_, i) => (i * 37) % 256));
      expect(base32Coz(base32Kodla(b))?.equals(b), `n=${n}`).toBe(true);
    }
  });

  it('boşluk ve küçük harf hoş görülür — elle giriş [SIS-KML-004]', () => {
    const s = base32Kodla(RFC_SIR);
    expect(base32Coz(s.toLowerCase().replace(/(.{4})/g, '$1 '))?.equals(RFC_SIR)).toBe(true);
  });

  it('bozuk karakter SESSİZCE ATLANMAZ, null döner [SIS-KML-004]', () => {
    /* Atlansaydı yanlış bir sır "çözülmüş" sayılır ve kullanıcı hiçbir
       zaman geçmeyen kodlarla baş başa kalırdı. */
    expect(base32Coz('ABCD1EFG')).toBeNull();
    expect(base32Coz('')).toBeNull();
  });
});

describe('doğrulama penceresi ve tekrar engeli [SIS-KML-004]', () => {
  const sir = totpSirriUret();
  const T = Date.UTC(2026, 8, 10, 12, 0, 0);

  it('şimdiki adımın kodu geçer [SIS-KML-004]', () => {
    const s = totpDogrula({ sirBase32: sir, kod: totp(sir, T)!, simdiMs: T });
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.adim).toBe(adimNo(T));
  });

  it('bir önceki ve bir sonraki adım da geçer (saat kayması) [SIS-KML-004]', () => {
    for (const k of [-1, 1]) {
      const t = T + k * ADIM_SANIYE * 1000;
      expect(totpDogrula({ sirBase32: sir, kod: totp(sir, t)!, simdiMs: T }).ok, `k=${k}`)
        .toBe(true);
    }
  });

  it('İKİ adım öteki kod GEÇMEZ — pencere ±1 [SIS-KML-004]', () => {
    const t = T + 2 * ADIM_SANIYE * 1000;
    const s = totpDogrula({ sirBase32: sir, kod: totp(sir, t)!, simdiMs: T });
    expect(s.ok).toBe(false);
  });

  it('AYNI kod ikinci kez KABUL EDİLMEZ [SIS-KML-004]', () => {
    const kod = totp(sir, T)!;
    const ilk = totpDogrula({ sirBase32: sir, kod, simdiMs: T });
    expect(ilk.ok).toBe(true);
    const ikinci = totpDogrula({
      sirBase32: sir, kod, simdiMs: T, sonKullanilanAdim: ilk.ok ? ilk.adim : null,
    });
    expect(ikinci.ok).toBe(false);
    if (!ikinci.ok) expect(ikinci.sebep).toBe('tekrar');
  });

  it('GERİYE dönük bir adım da tekrar sayılır [SIS-KML-004]', () => {
    /* Pencere ±1 olduğu için "bir önceki adımın kodu" tekrar sunulabilir;
       son kabul edilen adım eşiği bunu da keser. */
    const onceki = T - ADIM_SANIYE * 1000;
    const s = totpDogrula({
      sirBase32: sir, kod: totp(sir, onceki)!, simdiMs: T, sonKullanilanAdim: adimNo(T),
    });
    expect(s.ok).toBe(false);
  });

  it('yanlış uzunluktaki kod BİÇİM olarak reddedilir [SIS-KML-004]', () => {
    const s = totpDogrula({ sirBase32: sir, kod: '1234', simdiMs: T });
    expect(s.ok ? 'GEÇTİ' : s.sebep).toBe('bicim');
  });

  it('bozuk sır "kod yanlış" DEĞİL, "sır bozuk" der [SIS-KML-004]', () => {
    const s = totpDogrula({ sirBase32: 'ABCD1', kod: '000000', simdiMs: T });
    expect(s.ok ? 'GEÇTİ' : s.sebep).toBe('sir_bozuk');
  });

  it('üretilen sır 160 bit ve her seferinde farklı [SIS-KML-004]', () => {
    expect(base32Coz(totpSirriUret())?.length).toBe(20);
    expect(totpSirriUret()).not.toBe(totpSirriUret());
  });
});

describe('kaydolma URI\'si ve kurtarma kodları [SIS-KML-004]', () => {
  it('otpauth URI standart alanları taşır [SIS-KML-004]', () => {
    const uri = kaydolmaUri({ yayinci: 'Kurgusal Kurulum', hesap: 'a@b.local', sirBase32: 'AAAA' });
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    const u = new URL(uri);
    expect(u.searchParams.get('secret')).toBe('AAAA');
    expect(u.searchParams.get('digits')).toBe(String(BASAMAK));
    expect(u.searchParams.get('period')).toBe(String(ADIM_SANIYE));
    /* Yayıncı MARKADAN gelir; koda gömülü bir ad burada görünmemeli. */
    expect(u.searchParams.get('issuer')).toBe('Kurgusal Kurulum');
  });

  it('kurtarma kodları sayıca ve uzunlukça sabit, hepsi FARKLI [SIS-KML-004]', () => {
    const kodlar = kurtarmaKodlariUret();
    expect(kodlar).toHaveLength(KURTARMA_ADEDI);
    expect(new Set(kodlar).size).toBe(KURTARMA_ADEDI);
    for (const k of kodlar) expect(k).toHaveLength(KURTARMA_UZUNLUK);
  });

  it('normalize boşluk ve tireyi yok sayar [SIS-KML-004]', () => {
    expect(kurtarmaNormalize(' ab-cd ef ')).toBe('ABCDEF');
  });
});

describe('oturum politikası [SIS-KML-005]', () => {
  it('kayıt YOKSA varsayılan uygulanır — 12/2 DEĞİŞMEDİ [SIS-KML-005]', () => {
    expect(politikaCoz(null)).toEqual(VARSAYILAN_POLITIKA);
    expect(VARSAYILAN_POLITIKA.mutlakSaat).toBe(12);
    expect(VARSAYILAN_POLITIKA.atilSaat).toBe(2);
    expect(VARSAYILAN_POLITIKA.mfaZorunlu).toBe(false);
  });

  it('eksik alan varsayılandan tamamlanır, SIFIR sayılmaz [SIS-KML-005]', () => {
    expect(politikaCoz({ mutlakSaat: 8 })).toEqual({
      mutlakSaat: 8, atilSaat: 2, mfaZorunlu: false,
    });
  });

  it('tavanı aşan mutlak süre reddedilir [SIS-KML-005]', () => {
    const s = politikaKapisi({ mutlakSaat: MUTLAK_TAVAN_SAAT + 1, atilSaat: 2 });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.sebep).toContain('Mutlak oturum süresi');
  });

  it('tabanın altındaki atıl süre reddedilir [SIS-KML-005]', () => {
    expect(politikaKapisi({ mutlakSaat: 12, atilSaat: ATIL_TABAN_SAAT / 2 }).ok).toBe(false);
  });

  it('ATIL süre MUTLAKTAN büyük olamaz [SIS-KML-005]', () => {
    /* Büyük olsaydı atıl eşiği hiç işlemez, ekran ise uygulanmayan bir
       kontrolü uygulanıyor gösterirdi. */
    const s = politikaKapisi({ mutlakSaat: 2, atilSaat: 6 });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.sebep).toContain('Atıl süre mutlak süreden büyük olamaz');
  });

  it('sıkılaştırma geçer [SIS-KML-005]', () => {
    expect(politikaKapisi({ mutlakSaat: 4, atilSaat: 0.5 }).ok).toBe(true);
  });
});

describe('MFA zorunluluğu kapısı [SIS-KML-005]', () => {
  it('politika kapalıysa kapı açık [SIS-KML-005]', () => {
    expect(mfaGirisKapisi({ mfaZorunlu: false, mfaKurulu: false, kurumHesabi: false }).ok)
      .toBe(true);
  });

  it('zorunluyken TOTP\'siz YEREL hesap giremez [SIS-KML-005]', () => {
    const s = mfaGirisKapisi({ mfaZorunlu: true, mfaKurulu: false, kurumHesabi: false });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.sebep).toContain('çok adımlı doğrulama zorunlu');
  });

  it('zorunluyken TOTP\'li yerel hesap girer [SIS-KML-005]', () => {
    expect(mfaGirisKapisi({ mfaZorunlu: true, mfaKurulu: true, kurumHesabi: false }).ok)
      .toBe(true);
  });

  it('KURUM hesabında ikinci faktör IdP\'nin işidir [SIS-KML-005]', () => {
    /* Bilinçli sınır: ürün IdP'nin verdiği kararı bilmediği hâlde tekrar
       etmez. Sınır ekranda da yazılıdır. */
    expect(mfaGirisKapisi({ mfaZorunlu: true, mfaKurulu: false, kurumHesabi: true }).ok)
      .toBe(true);
  });
});
