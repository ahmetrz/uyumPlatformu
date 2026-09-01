import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/* ═══════════════════════════════════════════════════════════════════════
   §15 · GÜVENİLİR VEKİL / İSTEMCİ ADRESİ SERTLEŞTİRMESİ

   ── ÖLÇÜLEN KUSUR ──────────────────────────────────────────────────────
   Eski `istemciAdresi()` `x-forwarded-for`ın İLK girdisini koşulsuz
   istemci sayıyordu. Oran sınırı kovası doğrudan o değerden üretildiği
   için saldırgan her istekte başka bir `X-Forwarded-For` göndererek HER
   İSTEK İÇİN YENİ KOVA açtırıyor, adres sınırı hiç dolmuyordu. Bu, hesap
   sayacının hiç göremediği tek saldırıyı — kimlik doldurmayı, ki her
   denemede BAŞKA hesap dener — sınırsız bırakıyordu.

   Bu dosyanın merkezi testi §6'dadır: GÜVENİLMEYEN MODDA HER İSTEKTE
   FARKLI XFF GÖNDERİLSE DE ADRES SINIRI TETİKLENİR. Yanında kontrol testi
   durur (güvenilen modda ayrı kovalar gerçekten ayrışır) — yoksa "sınır
   tetiklendi" iddiası, sınırın hep tetiklendiği bir kurulumda da geçerdi.

   Bu dosya VERİTABANINA DOKUNMAZ: `girisKotasiTuket` yalnız oran sayacına
   yazar, `tests/sahte/db.ts` tembeldir. Bu yüzden TEST_DB kurulumu yok.
   ═══════════════════════════════════════════════════════════════════════ */

const {
  ADRES_BILINMIYOR, AZAMI_ATLAMA, adresCoz, adresEtiketi, ipNormalize, istekAdresi,
  istemciAdresi, vekilPolitikasi, vekilPolitikasiCozumle, vekilPolitikasiniSifirla,
} = await import('@/lib/istemciAdresi');
const { girisOraniAyari, girisOraniAyarla, girisKotasiTuket } =
  await import('@/lib/girisKorumasi');
const { oranSayaclariniSifirla } = await import('@/lib/api/oranSinir');
const { basliklariAyarla, basliklariTemizle } = await import('@/tests/sahte/next-headers');

/** TRUST_PROXY'yi ayarlar ve politika önbelleğini (ve "bir kez uyar"
    kilidini) düşürür — üretimde bu değer süreç ömrü boyunca sabittir. */
function politika(deger: string | undefined): void {
  if (deger === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = deger;
  vekilPolitikasiniSifirla();
}

/** `adresCoz` için başlık okuyucu. */
const oku = (b: Record<string, string>) =>
  (ad: string): string | null => b[ad.toLowerCase()] ?? null;

const ilkPolitika = process.env.TRUST_PROXY;

beforeEach(() => {
  politika(undefined);
  basliklariTemizle();
});

afterEach(() => {
  politika(ilkPolitika);
  vi.restoreAllMocks();
});

/* ═══ 1 · TRUST_PROXY sözleşmesi ══════════════════════════════════════ */

describe('1 · TRUST_PROXY çözümlemesi', () => {
  it('yapılandırma YOKSA varsayılan GÜVENMEMEKtir', () => {
    for (const v of [undefined, '', '   ', '0', 'off', 'false', 'no', 'kapali']) {
      expect(vekilPolitikasiCozumle(v)).toEqual({ mod: 'guvenme', hatali: null });
    }
  });

  it('1 / on / true → en yakın vekile güven (bir atlama)', () => {
    for (const v of ['1', 'on', 'true', 'YES', 'Evet']) {
      expect(vekilPolitikasiCozumle(v)).toEqual({ mod: 'atlama', atlama: 1 });
    }
  });

  it('tam sayı → o kadar atlama; 0 güvenmemeye eşittir', () => {
    expect(vekilPolitikasiCozumle('3')).toEqual({ mod: 'atlama', atlama: 3 });
    expect(vekilPolitikasiCozumle(String(AZAMI_ATLAMA)))
      .toEqual({ mod: 'atlama', atlama: AZAMI_ATLAMA });
    expect(vekilPolitikasiCozumle('0')).toEqual({ mod: 'guvenme', hatali: null });
  });

  it('IP/CIDR listesi liste moduna çözülür', () => {
    const p = vekilPolitikasiCozumle('10.0.0.0/8, 192.0.2.1, 2001:db8::/32');
    expect(p.mod).toBe('liste');
    expect(p.mod === 'liste' && p.bloklar).toHaveLength(3);
  });

  it('listedeki TEK bozuk öğe listenin TAMAMINI düşürür', () => {
    /* Yarısı anlaşılmış bir güven listesi, anlaşılmamış yarısı kadar
       tehlikelidir: "10.0.0.0/8'e güven, gerisini bilmiyorum" diye bir
       güvenlik kararı yoktur. */
    const p = vekilPolitikasiCozumle('10.0.0.0/8, hepsi');
    expect(p).toMatchObject({ mod: 'guvenme' });
    expect(p.mod === 'guvenme' && p.hatali).toMatch(/geçersiz IP\/CIDR/);
  });

  it('atlama sayısı üst sınırı aşarsa yapılandırma HATALIDIR (sessizce kırpılmaz)', () => {
    const p = vekilPolitikasiCozumle(String(AZAMI_ATLAMA + 1));
    expect(p).toMatchObject({ mod: 'guvenme' });
    expect(p.mod === 'guvenme' && p.hatali).toBeTruthy();
  });
});

/* ═══ 2 · tanınmayan değer ════════════════════════════════════════════ */

describe('2 · Tanınmayan TRUST_PROXY sessizce güvenmeye DÖNÜŞMEZ', () => {
  it('anlaşılmayan değer: güvenme + AÇIK günlük (bir kez)', () => {
    const gunluk = vi.spyOn(console, 'error').mockImplementation(() => {});
    politika('belki-bazen');

    const p = vekilPolitikasi();
    expect(p).toMatchObject({ mod: 'guvenme' });
    expect(p.mod === 'guvenme' && p.hatali).toBeTruthy();

    // Sessiz DEĞİL: yanlış yapılandırma operatöre söylenir…
    expect(gunluk).toHaveBeenCalledTimes(1);
    expect(String(gunluk.mock.calls[0][0])).toMatch(/TRUST_PROXY/);
    expect(String(gunluk.mock.calls[0][0])).toMatch(/GÜVENİLMİYOR/);

    // …ama her istekte bağırmaz (gürültü, uyarıyı öldürür).
    vekilPolitikasi();
    adresCoz(oku({ 'x-forwarded-for': '198.51.100.5' }));
    expect(gunluk).toHaveBeenCalledTimes(1);
  });

  it('hatalı yapılandırma GÜVENME tarafına düşer — başlık yine yok sayılır', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    politika('2.5');   // ne tam sayı ne IP
    expect(adresCoz(oku({ 'x-forwarded-for': '198.51.100.5' }))).toBeNull();
    expect(adresCoz(oku({ 'x-real-ip': '198.51.100.5' }))).toBeNull();
  });
});

/* ═══ 3 · güvenilmeyen mod ════════════════════════════════════════════ */

describe('3 · Güvenilmeyen modda taklit edilmiş XFF ETKİSİZDİR', () => {
  it('x-forwarded-for ve x-real-ip HİÇ okunmaz', () => {
    expect(adresCoz(oku({ 'x-forwarded-for': '198.51.100.5, 10.0.0.1' }))).toBeNull();
    expect(adresCoz(oku({ 'x-real-ip': '198.51.100.9' }))).toBeNull();
  });

  it('istemciAdresi() ve istekAdresi() de null döner — "bilinmiyor" uydurulmaz', async () => {
    basliklariAyarla({ 'x-forwarded-for': '198.51.100.5', 'x-real-ip': '198.51.100.9' });
    expect(await istemciAdresi()).toBeNull();

    const istek = new Request('https://uyum.test/api/v1/plants', {
      headers: { 'x-forwarded-for': '198.51.100.5' } });
    expect(istekAdresi(istek)).toBeNull();
  });

  it('null bir dize DEĞİLDİR: "unknown"/"0.0.0.0" gibi sahte bir adres üretilmez', async () => {
    /* `bilinmiyor` ile `0.0.0.0` aynı şey değildir: ikincisi denetim izinde
       ve günlükte GERÇEK bir kaynakmış gibi okunur. */
    const a = await istemciAdresi();
    expect(a).toBeNull();
    expect(typeof a).not.toBe('string');
    // Kova etiketi ayrı bir katmandır ve adres değildir.
    expect(adresEtiketi(a)).toBe(ADRES_BILINMIYOR);
  });

  it('bağlantının uzak eşi biliniyorsa O kullanılır — taklit edilemeyen tek değer', () => {
    expect(adresCoz(oku({ 'x-forwarded-for': '198.51.100.5' }), '203.0.113.7'))
      .toBe('203.0.113.7');
  });
});

/* ═══ 4 · güvenilen mod (atlama) ══════════════════════════════════════ */

describe('4 · Güvenilen modda DOĞRU halka seçilir', () => {
  it('tek vekil (1): zincirdeki tek girdi istemcidir', () => {
    politika('1');
    expect(adresCoz(oku({ 'x-forwarded-for': '198.51.100.5' }))).toBe('198.51.100.5');
  });

  it('tek vekil (1): istemcinin ÖNCEDEN yazdığı sahte ön ek YOK SAYILIR', () => {
    /* Kusurun tam kalbi. Tek vekil `xff = [istemci]` yazar. Saldırgan
       `XFF: 1.2.3.4` göndermişse vekil KENDİ gördüğü adresi EKLER ve zincir
       `1.2.3.4, <gerçek>` olur. ESKİ KOD İLK GİRDİYİ alıyordu → saldırganın
       yazdığı değer. Sondan sayınca gerçek istemci seçilir. */
    politika('1');
    expect(adresCoz(oku({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })))
      .toBe('203.0.113.9');
  });

  it('iki vekil (2): sondan iki atlanır', () => {
    politika('2');
    expect(adresCoz(oku({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9, 10.0.0.1' })))
      .toBe('203.0.113.9');
  });

  it('zincir beyan edilen atlamadan KISAYSA adres çözülmez', () => {
    /* "İki vekil var" denmiş ama başlıkta bir halka var: ya yapılandırma
       yanlış ya zincir kırpılmış. Tahmin etmek, yanlış kovaya yazmaktır. */
    politika('2');
    expect(adresCoz(oku({ 'x-forwarded-for': '198.51.100.5' }))).toBeNull();
  });

  it('x-real-ip yalnız TEK vekilde yedektir', () => {
    politika('1');
    expect(adresCoz(oku({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');

    /* n > 1 iken `x-real-ip`i en yakın vekil yazar ve o yalnız KENDİ eşini
       (bir ara vekili) bilir; istemci değildir. Kullanılsaydı tüm trafiği
       tek bir ara vekilin kovasına yazardık. */
    politika('3');
    expect(adresCoz(oku({ 'x-real-ip': '198.51.100.9' }))).toBeNull();
  });

  it('istemciAdresi() güvenilen modda gerçekten çözer', async () => {
    politika('1');
    basliklariAyarla({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' });
    expect(await istemciAdresi()).toBe('203.0.113.9');
  });
});

/* ═══ 5 · bozuk zincir ════════════════════════════════════════════════ */

describe('5 · Bozuk zincir REDDEDİLİR (öğe ayıklanmaz, zincir düşer)', () => {
  beforeEach(() => politika('1'));

  it('geçersiz IP içeren zincir tamamen reddedilir', () => {
    expect(adresCoz(oku({ 'x-forwarded-for': 'bilinmiyor, 203.0.113.9' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '203.0.113.9, unknown' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '999.1.1.1' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '_gizliVekil' }))).toBeNull();
  });

  it('boş öğe zinciri düşürür', () => {
    expect(adresCoz(oku({ 'x-forwarded-for': '1.2.3.4,, 203.0.113.9' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': ',' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '' }))).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '   ' }))).toBeNull();
  });

  it('baştaki sıfırlı sekizli reddedilir (sekizlik okuma belirsizliği)', () => {
    expect(ipNormalize('010.0.0.1')).toBeNull();
    expect(adresCoz(oku({ 'x-forwarded-for': '010.0.0.1' }))).toBeNull();
  });

  it('port ve köşeli parantez normalize edilir, kimlik korunur', () => {
    expect(adresCoz(oku({ 'x-forwarded-for': '203.0.113.9:51234' }))).toBe('203.0.113.9');
    expect(adresCoz(oku({ 'x-forwarded-for': '[2001:db8::1]:443' }))).toBe('2001:db8::1');
    expect(ipNormalize('2001:DB8::1')).toBe('2001:db8::1');
    expect(ipNormalize('::ffff:192.0.2.128')).toBe('::ffff:192.0.2.128');
    expect(ipNormalize('fe80::1%eth0')).toBeNull();  // bölge kimliği: zincirde yeri yok
  });
});

/* ═══ 6 · aşırı uzun başlık ═══════════════════════════════════════════ */

describe('6 · Aşırı uzun başlık güvenli biçimde reddedilir', () => {
  beforeEach(() => politika('1'));

  it('2 KB üstü başlık AYRIŞTIRILMADAN reddedilir; çökme yok', () => {
    // ~5 KB geçerli-görünümlü zincir. Bellek: tek bir dizi bile ayrılmaz.
    const uzun = Array.from({ length: 500 }, (_, i) => `10.0.${i % 256}.1`).join(', ');
    expect(uzun.length).toBeGreaterThan(2048);
    expect(() => adresCoz(oku({ 'x-forwarded-for': uzun }))).not.toThrow();
    expect(adresCoz(oku({ 'x-forwarded-for': uzun }))).toBeNull();
  });

  it('atlama sayısı üst sınırı aşan zincir reddedilir', () => {
    // 2 KB'ın ALTINDA ama AZAMI_ATLAMA'nın üstünde: iki kapı da ayrı çalışmalı.
    const cok = Array.from({ length: AZAMI_ATLAMA + 1 }, (_, i) => `10.0.0.${i}`).join(',');
    expect(cok.length).toBeLessThan(2048);
    expect(adresCoz(oku({ 'x-forwarded-for': cok }))).toBeNull();
  });

  it('tam sınırdaki zincir hâlâ çözülür (kapı fazla dar değil)', () => {
    const tam = Array.from({ length: AZAMI_ATLAMA }, (_, i) => `10.0.0.${i}`).join(',');
    expect(adresCoz(oku({ 'x-forwarded-for': tam })))
      .toBe(`10.0.0.${AZAMI_ATLAMA - 1}`);
  });

  it('bayt kapısı, atlama kapısından BAĞIMSIZ çalışır', () => {
    /* Ayrı kapılar, ayrı kaynak riskleri: biri halka SAYISINI (ayrıştırma
       maliyeti), diğeri BAYTI (bellek) sınırlar. Halka sayısı sınırın
       altında ama başlık 2 KB'ı aşıyorsa — HTTP liste öğeleri çevresinde
       boşluk serbesttir, saldırgan bunu bedavaya şişirir — yine reddedilir.
       Bu test olmadan bayt kapısı hiçbir davranışa yansımaz ve sessizce
       silinebilirdi (mutasyonla ölçüldü: M8). */
    const sisik = Array.from({ length: AZAMI_ATLAMA }, () => '10.0.0.1'.padEnd(70))
      .join(',');
    expect(sisik.length).toBeGreaterThan(2048);
    expect(sisik.split(',')).toHaveLength(AZAMI_ATLAMA);   // atlama kapısı TEMİZ
    expect(adresCoz(oku({ 'x-forwarded-for': sisik }))).toBeNull();
  });

  it('megabaytlık çöp başlık da çökertmez', () => {
    const cop = 'x'.repeat(1_000_000);
    expect(adresCoz(oku({ 'x-forwarded-for': cop }))).toBeNull();
  });
});

/* ═══ 7 · liste modu ══════════════════════════════════════════════════ */

describe('7 · Liste modu: başlığı YAZANIN kim olduğu doğrulanır', () => {
  it('güvenilen vekilden gelen zincirde ilk güvenilmeyen halka istemcidir', () => {
    politika('10.0.0.0/8');
    expect(adresCoz(oku({ 'x-forwarded-for': '203.0.113.9, 10.0.0.9' }), '10.0.0.7'))
      .toBe('203.0.113.9');
  });

  it('güvenilmeyen bir eşten gelen başlık YOK SAYILIR; eşin adresi kullanılır', () => {
    /* Bağlantı vekilden değil, doğrudan istemciden geliyor: başlığı yazan
       istemcinin kendisidir, dolayısıyla kanıt değildir. */
    politika('10.0.0.0/8');
    expect(adresCoz(oku({ 'x-forwarded-for': '1.2.3.4' }), '203.0.113.9'))
      .toBe('203.0.113.9');
  });

  it('uzak eş BİLİNMİYORSA koşul değerlendirilemez → güvenme + uyarı', () => {
    /* Dürüst sınır: Next.js `headers()` soket eşini vermez. "Uzak eşi bir
       başlıktan oku" demek, kapatılan deliği geri açmak olurdu. */
    const gunluk = vi.spyOn(console, 'error').mockImplementation(() => {});
    politika('10.0.0.0/8');
    expect(adresCoz(oku({ 'x-forwarded-for': '1.2.3.4, 10.0.0.9' }))).toBeNull();
    expect(gunluk).toHaveBeenCalledTimes(1);
    expect(String(gunluk.mock.calls[0][0])).toMatch(/uzak eş/);
  });

  it('zincirin tamamı güvenilen bloklardaysa en dıştaki halka istemcidir', () => {
    politika('10.0.0.0/8, 192.168.0.0/16');
    expect(adresCoz(oku({ 'x-forwarded-for': '192.168.5.5, 10.0.0.9' }), '10.0.0.7'))
      .toBe('192.168.5.5');
  });

  it('IPv6 blokları da eşleşir', () => {
    politika('2001:db8::/32');
    expect(adresCoz(oku({ 'x-forwarded-for': '203.0.113.9, 2001:db8::5' }), '2001:db8::1'))
      .toBe('203.0.113.9');
  });
});

/* ═══ 8 · DAVRANIŞSAL KANIT — oran sınırı ═════════════════════════════ */

describe('8 · Kusurun doğrudan testi: oran sınırı taklit başlıkla ATLATILAMAZ', () => {
  const BILINMEYEN_SINIRI = 5;
  let eskiAyar: ReturnType<typeof girisOraniAyari>;

  beforeEach(async () => {
    eskiAyar = girisOraniAyari();
    /* Hesap sayacı bilerek GENİŞ: ölçülen şey ADRES boyutudur. Her deneme
       zaten başka bir e-posta ile yapılıyor (kimlik doldurma kalıbı), yani
       hesap sayacı bu saldırıyı hiç görmez. */
    girisOraniAyarla({
      hesapSiniri: 10_000, adresSiniri: BILINMEYEN_SINIRI,
      bilinmeyenSiniri: BILINMEYEN_SINIRI, pencereMs: 60_000 });
    await oranSayaclariniSifirla();
  });

  afterEach(async () => {
    girisOraniAyarla(eskiAyar);
    await oranSayaclariniSifirla();
  });

  /** Kimlik doldurma turu: her deneme BAŞKA hesap, BAŞKA sahte XFF. */
  async function saldiriTuru(adet: number): Promise<boolean[]> {
    const izinler: boolean[] = [];
    for (let i = 0; i < adet; i++) {
      basliklariAyarla({ 'x-forwarded-for': `198.51.100.${i}` });
      const kota = await girisKotasiTuket(`kurban-${i}@test.local`, await istemciAdresi());
      izinler.push(kota.izin);
    }
    return izinler;
  }

  it('GÜVENİLMEYEN modda her istekte FARKLI XFF gönderilse de sınır TETİKLENİR', async () => {
    politika(undefined);   // varsayılan: güvenme
    const izinler = await saldiriTuru(BILINMEYEN_SINIRI + 3);

    /* Eski kodda bu dizinin TAMAMI true olurdu: her sahte XFF yeni bir kova
       açar, hiçbiri dolmazdı. Artık sahte başlık kova SEÇİMİNE hiç girmiyor. */
    expect(izinler.slice(0, BILINMEYEN_SINIRI)).toEqual(
      Array(BILINMEYEN_SINIRI).fill(true));
    expect(izinler.slice(BILINMEYEN_SINIRI)).toEqual([false, false, false]);
  });

  it('reddin kaynağı ADRES kovasıdır (hesap sayacı değil)', async () => {
    politika(undefined);
    await saldiriTuru(BILINMEYEN_SINIRI);
    basliklariAyarla({ 'x-forwarded-for': '198.51.100.250' });
    const kota = await girisKotasiTuket('bambaska@test.local', await istemciAdresi());
    expect(kota).toMatchObject({ izin: false, kova: 'adres' });
  });

  it('x-real-ip ile de atlatılamaz', async () => {
    politika(undefined);
    for (let i = 0; i < BILINMEYEN_SINIRI; i++) {
      basliklariAyarla({ 'x-real-ip': `198.51.100.${i}` });
      await girisKotasiTuket(`r-${i}@test.local`, await istemciAdresi());
    }
    basliklariAyarla({ 'x-real-ip': '198.51.100.250' });
    const kota = await girisKotasiTuket('r-son@test.local', await istemciAdresi());
    expect(kota.izin).toBe(false);
  });

  /* KONTROL TESTİ. Yukarıdaki iddia, "sınır her koşulda tetikleniyor" gibi
     bir bozuklukla da geçerdi. Güvenilen modda farklı adresler GERÇEKTEN
     ayrı kovalara düşmeli — yoksa koruma, ayrı sahaları birbirine kilitleyen
     bir hizmet dışı bırakma aracına dönerdi. */
  it('KONTROL: güvenilen modda farklı GERÇEK adresler ayrı kovalardadır', async () => {
    politika('1');
    const izinler = await saldiriTuru(BILINMEYEN_SINIRI + 3);
    expect(izinler.every(Boolean)).toBe(true);
  });

  it('KONTROL: güvenilen modda AYNI adres sınıra takılır', async () => {
    politika('1');
    for (let i = 0; i < BILINMEYEN_SINIRI; i++) {
      basliklariAyarla({ 'x-forwarded-for': '198.51.100.42' });
      const k = await girisKotasiTuket(`s-${i}@test.local`, await istemciAdresi());
      expect(k.izin).toBe(true);
    }
    basliklariAyarla({ 'x-forwarded-for': '198.51.100.42' });
    const kota = await girisKotasiTuket('s-son@test.local', await istemciAdresi());
    expect(kota).toMatchObject({ izin: false, kova: 'adres' });
  });
});
