import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import {
  EN_UZUN_RETRY_AFTER_MS, HttpHatasi, adresKur, basliklariMaskele, durumSinifi,
  istek, jsonIstek, ozelAgMi, retryAfterMs,
} from '../lib/entegrasyon/http';
import {
  bellekTokenDeposu, basliklariUret, kimlikDurumu, ozet,
} from '../lib/entegrasyon/kimlikDogrulama';
import {
  KAYIP_ORANI_ESIGI, KUCUK_KUME_MUTLAK_SINIR, mezarTaslariniCikar,
} from '../lib/entegrasyon/mezarTasi';
import { geriCekilmeMerdiveni } from '../lib/entegrasyon/cekirdek';

/* ═══════════════════════════════════════════════════════════════════════
   OT-40 · Otomatik veri toplama

   Bu dosya HİÇBİR KURUM SİSTEMİNE BAĞLANMAZ. Ağ testleri 127.0.0.1'de
   açılan, testin kendi kurduğu bir sunucuya gider: sınanan şey ÜRÜNÜN
   KENDİ İSTEMCİSİDİR, bir vendor API'si değil.

   Sınanan tek kural üç yüzüyle:

     SESSİZ BAŞARI YOKTUR.

   Zaman aşımına uğrayan istek asılı kalmaz, yönlendirme sessizce
   izlenmez, kırpılan gövde "boş sonuç" sayılmaz, delta koşusundan silme
   çıkarılmaz, ayarlanmış bir yeniden deneme sayısı yok sayılmaz.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Yerel sunucu ────────────────────────────────────────────────────── */

let sunucu: Server;
let taban = '';
/** Sonraki isteğe verilecek yanıt — her test kendi senaryosunu kurar. */
let davranis: (yol: string) => {
  durum?: number; govde?: string; basliklar?: Record<string, string>; gecikmeMs?: number;
};

beforeAll(async () => {
  sunucu = createServer((istekNesnesi, yanit) => {
    const d = davranis(istekNesnesi.url ?? '/');
    const yaz = () => {
      yanit.writeHead(d.durum ?? 200, {
        'content-type': 'application/json',
        ...(d.basliklar ?? {}),
      });
      yanit.end(d.govde ?? '{}');
    };
    if (d.gecikmeMs) setTimeout(yaz, d.gecikmeMs);
    else yaz();
  });
  await new Promise<void>((coz) => sunucu.listen(0, '127.0.0.1', coz));
  const adres = sunucu.address() as AddressInfo;
  taban = `http://127.0.0.1:${adres.port}`;
});

afterAll(async () => {
  await new Promise<void>((coz) => sunucu.close(() => coz()));
});

/** 127.0.0.1 özel ağdır; düz http yalnız açık izinle kabul edilir. */
const yerel = { guvensizHttpKabul: true };

/* ═══ Adres politikası ════════════════════════════════════════════════ */

describe('OT-40 · adres politikası: TLS ve SSRF', () => {
  it('https her zaman kabul edilir', () => {
    const k = adresKur('https://kurum.ornek/api', 'cihazlar');
    expect(k.ok).toBe(true);
  });

  it('düz http açık izin OLMADAN reddedilir', () => {
    const k = adresKur('http://10.0.0.5/api', 'cihazlar');
    expect(k.ok).toBe(false);
    if (!k.ok) expect(k.hata).toMatch(/TLS zorunlu/i);
  });

  /* Kurum içi TLS'siz eski bir yönetim arayüzü GERÇEK bir durumdur;
     ama aynı bayrağın internete açık bir adrese uygulanması kimlik
     bilgisini düz metin taşımak olurdu. */
  it('açık izin YALNIZ özel ağda geçerlidir', () => {
    const ic = adresKur('http://10.0.0.5/api', 'x', { guvensizHttpKabul: true });
    const dis = adresKur('http://kurum.ornek/api', 'x', { guvensizHttpKabul: true });
    expect(ic.ok).toBe(true);
    expect(dis.ok).toBe(false);
    if (!dis.ok) expect(dis.hata).toMatch(/özel ağ değil/i);
  });

  it('bulut metadata adresi HER KOŞULDA reddedilir', () => {
    for (const u of [
      'http://169.254.169.254/latest/meta-data/',
      'https://metadata.google.internal/computeMetadata/v1/',
    ]) {
      const k = adresKur(u, '', { guvensizHttpKabul: true });
      expect(k.ok).toBe(false);
      if (!k.ok) expect(k.hata).toMatch(/metadata/i);
    }
  });

  it('http/https dışındaki şema reddedilir', () => {
    const k = adresKur('file:///etc/passwd', '', { guvensizHttpKabul: true });
    expect(k.ok).toBe(false);
  });

  it('özel ağ testi hem IPv4 hem IPv6 aralıklarını tanır', () => {
    for (const h of ['127.0.0.1', 'localhost', '10.1.2.3', '192.168.1.1', '172.20.0.1', 'fd00::1']) {
      expect(ozelAgMi(h)).toBe(true);
    }
    for (const h of ['8.8.8.8', 'kurum.ornek', '172.32.0.1', '2001:db8::1']) {
      expect(ozelAgMi(h)).toBe(false);
    }
  });
});

/* ═══ Durum sınıfı ve Retry-After ═════════════════════════════════════ */

describe('OT-40 · hata sınıfı: 401 tekrar DENENMEZ, 429 denenir', () => {
  /* 401'i geçici saymak, geçersiz kimlikle üst üste vurmak demektir ve
     çoğu dizinde bu servis hesabını KİLİTLER. */
  it('401 ve 403 yetki hatasıdır ve geçici değildir', () => {
    expect(durumSinifi(401)).toEqual({ sinif: 'yetki', gecici: false });
    expect(durumSinifi(403)).toEqual({ sinif: 'yetki', gecici: false });
  });

  it('429 ve 5xx geçicidir', () => {
    expect(durumSinifi(429).gecici).toBe(true);
    expect(durumSinifi(503).gecici).toBe(true);
  });

  it('404 bir yapılandırma hatasıdır — tekrar denemek düzeltmez', () => {
    expect(durumSinifi(404)).toEqual({ sinif: 'yapilandirma', gecici: false });
  });

  it('Retry-After saniye ve HTTP-date biçimlerini okur', () => {
    expect(retryAfterMs('30')).toBe(30_000);
    const ileri = new Date(Date.now() + 45_000).toUTCString();
    const ms = retryAfterMs(ileri, Date.now());
    expect(ms).not.toBeNull();
    expect(ms!).toBeGreaterThan(40_000);
  });

  /* Sunucunun istediği bekleme saatlerce olabilir; o kadar beklemek koşuyu
     bayat eşiğine taşır ve süreç ölü sanılır. Sınırın üstü YOK SAYILIR. */
  it('aşırı uzun Retry-After yok sayılır', () => {
    expect(retryAfterMs(String(EN_UZUN_RETRY_AFTER_MS / 1000 + 60))).toBeNull();
    expect(retryAfterMs('abc')).toBeNull();
    expect(retryAfterMs(null)).toBeNull();
  });
});

describe('OT-40 · kimlik başlıkları hata metnine SIZMAZ', () => {
  it('maskeleme kimlik taşıyan başlıkları gizler, ötekilere dokunmaz', () => {
    const m = basliklariMaskele({
      Authorization: 'Bearer cok-gizli', 'X-API-Key': 'anahtar',
      Accept: 'application/json',
    });
    expect(m.Authorization).toBe('***');
    expect(m['X-API-Key']).toBe('***');
    expect(m.Accept).toBe('application/json');
  });
});

/* ═══ Gerçek istek davranışı ══════════════════════════════════════════ */

describe('OT-40 · istemci: zaman aşımı · yönlendirme · boyut', () => {
  it('başarılı yanıt gövdesiyle döner', async () => {
    davranis = () => ({ govde: '{"a":1}' });
    const y = await istek({ tabanUrl: taban, yol: 'api', ...yerel });
    expect(y.durum).toBe(200);
    expect(y.govde).toBe('{"a":1}');
    expect(y.kirpildi).toBe(false);
  });

  /* Zaman aşımı olmayan bir istemci, yanıt vermeyen bir uçta koşuyu
     `calisiyor` durumunda asar ve connector 15 dakika kilitlenir. */
  it('sınırın altında kalan yavaş yanıt BAŞARILI sayılır', async () => {
    davranis = () => ({ gecikmeMs: 120 });
    const y = await istek({ tabanUrl: taban, yol: 'yavas', zamanAsimiMs: 3_000, ...yerel });
    expect(y.durum).toBe(200);
  });

  it('sınırı aşan yanıt GEÇİCİ hata olur, asılı KALMAZ', async () => {
    davranis = () => ({ gecikmeMs: 900 });
    const asan = await istek({ tabanUrl: taban, yol: 'yavas', zamanAsimiMs: 120, ...yerel })
      .then(() => null, (e: HttpHatasi) => e);
    expect(asan).toBeInstanceOf(HttpHatasi);
    expect(asan!.sinif).toBe('gecici');
    expect(asan!.gecici).toBe(true);
    expect(asan!.message).toMatch(/yanıt vermedi/);
  });

  /* Otomatik izlenen bir yönlendirme, `Authorization` başlığını hedef
     origin'e taşır. Bu sessiz bir sır sızıntısıdır. */
  it('yeniden yönlendirme İZLENMEZ, hata olarak bildirilir', async () => {
    davranis = () => ({ durum: 302, basliklar: { location: 'https://baska.ornek/' } });
    const e = await istek({ tabanUrl: taban, yol: 'yonlendir', ...yerel })
      .then(() => null, (x: HttpHatasi) => x);
    expect(e).toBeInstanceOf(HttpHatasi);
    expect(e!.sinif).toBe('yapilandirma');
    expect(e!.message).toMatch(/Yeniden yönlendirme izlenmedi/);
    expect(e!.message).toContain('baska.ornek');
  });

  it('gövde sınırı aşılırsa KIRPILDI bayrağı kalkar', async () => {
    davranis = () => ({ govde: 'x'.repeat(5_000) });
    const y = await istek({ tabanUrl: taban, yol: 'buyuk', govdeSiniriBayt: 1_024, ...yerel });
    expect(y.kirpildi).toBe(true);
  });

  /* Kırpılmış JSON bazen (dizinin ortasında kesilirse) ayrıştırılabilir
     ve EKSİK veri sessizce geçer. O yüzden kırpılma ayrı bir hatadır. */
  it('kırpılmış gövde AYRIŞTIRILMAZ — eksik veri sessizce geçemez', async () => {
    davranis = () => ({ govde: JSON.stringify({ x: 'y'.repeat(5_000) }) });
    const e = await jsonIstek({ tabanUrl: taban, yol: 'buyuk', govdeSiniriBayt: 1_024, ...yerel })
      .then(() => null, (x: HttpHatasi) => x);
    expect(e).toBeInstanceOf(HttpHatasi);
    expect(e!.message).toMatch(/sınırını aştı/);
  });

  it('4xx yanıt durum koduyla birlikte sınıflandırılır', async () => {
    davranis = () => ({ durum: 403, govde: '{"error":"forbidden"}' });
    const e = await istek({ tabanUrl: taban, yol: 'yasak', ...yerel })
      .then(() => null, (x: HttpHatasi) => x);
    expect(e!.status).toBe(403);
    expect(e!.sinif).toBe('yetki');
    expect(e!.gecici).toBe(false);
  });

  it('JSON olmayan yanıt yapılandırma hatasıdır', async () => {
    davranis = () => ({ govde: '<html>hata</html>', basliklar: { 'content-type': 'text/html' } });
    const e = await jsonIstek({ tabanUrl: taban, yol: 'html', ...yerel })
      .then(() => null, (x: HttpHatasi) => x);
    expect(e!.sinif).toBe('yapilandirma');
    expect(e!.message).toMatch(/JSON döndürmedi/);
  });
});

/* ═══ Kimlik doğrulama ════════════════════════════════════════════════ */

describe('OT-40 · kimlik: dört durum, üçe indirilmez', () => {
  it('none her zaman hazırdır', () => {
    expect(kimlikDurumu('none', { sirVar: false, yapilandirma: {} }).durum).toBe('hazir');
  });

  it('sırrı olmayan api_key SIR EKSİK der, "hazır değil" demez', () => {
    const d = kimlikDurumu('api_key', { sirVar: false, yapilandirma: {} });
    expect(d.durum).toBe('sir_eksik');
  });

  it('tokenUrl’ü olmayan OAuth2 YAPILANDIRMA EKSİK der', () => {
    const d = kimlikDurumu('oauth2_client_credentials', { sirVar: true, yapilandirma: {} });
    expect(d.durum).toBe('yapilandirma_eksik');
    if (d.durum === 'yapilandirma_eksik') expect(d.gerekce).toMatch(/tokenUrl/);
  });

  /* Sertifika bu üründe UYGULANMADI. Bunu "sır eksik" demek, kuruluma
     var olmayan bir işi yaptırırdı; "hazır değil" demek ise neyin eksik
     olduğunu söylemezdi. */
  it('certificate UYGULANMADI der — sır eksikliğiyle karıştırılmaz', () => {
    const d = kimlikDurumu('certificate', { sirVar: true, yapilandirma: {} });
    expect(d.durum).toBe('uygulanmadi');
    expect(ozet('certificate', d)).toMatch(/uygulanmadı/i);
  });

  it('bilinmeyen kimlik tipi sessizce geçmez', () => {
    expect(kimlikDurumu('sihirli', { sirVar: true, yapilandirma: {} }).durum)
      .toBe('yapilandirma_eksik');
  });
});

describe('OT-40 · başlık üretimi', () => {
  it('api_key varsayılan başlığa yazılır', async () => {
    const s = await basliklariUret({ kimlikTipi: 'api_key', sir: 'A1', yapilandirma: {} });
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.basliklar.Authorization).toBe('A1');
  });

  it('api_key başlığı ve ön eki yapılandırmadan gelir', async () => {
    const s = await basliklariUret({
      kimlikTipi: 'api_key', sir: 'A1',
      yapilandirma: { apiAnahtarBasligi: 'X-Api-Key', apiAnahtarOnEki: 'Token ' },
    });
    if (s.ok) expect(s.basliklar['X-Api-Key']).toBe('Token A1');
  });

  it('basic base64 üretir', async () => {
    const s = await basliklariUret({ kimlikTipi: 'basic', sir: 'kul:parola', yapilandirma: {} });
    if (s.ok) {
      expect(s.basliklar.Authorization)
        .toBe(`Basic ${Buffer.from('kul:parola', 'utf8').toString('base64')}`);
    }
  });

  /* Ayıraçsız sır, parolayı kullanıcı adı sanıp BOŞ PAROLAYLA kimlik
     denemesi yapardı; bu bir başarısız oturum denemesidir ve kilitleme
     sayacını çalıştırır. */
  it('iki noktası olmayan basic sırrı REDDEDİLİR', async () => {
    const s = await basliklariUret({ kimlikTipi: 'basic', sir: 'parolaSadece', yapilandirma: {} });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/kullanıcı:parola/);
  });
});

/* Token akışı https ZORUNLU kıldığı için yerel http sunucusuyla
   sınanamaz; onun yerine `fetch` enjekte edilir. Böylece test hiçbir ağa
   çıkmaz ve TLS kuralı da gerçek hâliyle yürürlükte kalır. */
const TOKEN_URL = 'https://kimlik.ornek/token';

function sahteGetir(govde: unknown, sayac?: { n: number }): typeof fetch {
  return (async () => {
    if (sayac) sayac.n += 1;
    return new Response(
      JSON.stringify(typeof govde === 'function' ? (govde as () => unknown)() : govde),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  }) as unknown as typeof fetch;
}

describe('OT-40 · OAuth2 token', () => {
  const yapilandirma = { tokenUrl: TOKEN_URL, istemciId: 'ist-1' };

  it('token alınır ve Bearer olarak taşınır', async () => {
    const s = await basliklariUret({
      kimlikTipi: 'oauth2_client_credentials', sir: 'gizli', yapilandirma,
      getir: sahteGetir({ access_token: 'T1', expires_in: 3600 }),
    });
    expect(s.ok).toBe(true);
    if (s.ok) expect(s.basliklar.Authorization).toBe('Bearer T1');
  });

  it('süresi bildirilen token önbelleğe girer ve ikinci istek yapılmaz', async () => {
    const sayac = { n: 0 };
    const ortak = {
      kimlikTipi: 'oauth2_client_credentials', sir: 'gizli', yapilandirma,
      tokenDeposu: bellekTokenDeposu(),
      getir: sahteGetir({ access_token: 'T1', expires_in: 3600 }, sayac),
    };
    const a = await basliklariUret(ortak);
    const b = await basliklariUret(ortak);
    expect(sayac.n).toBe(1);
    if (a.ok && b.ok) expect(a.basliklar.Authorization).toBe(b.basliklar.Authorization);
  });

  /* `expires_in` yoksa süre TAHMİN EDİLMEZ: kısa ömürlü bir tokeni uzun
     sanmak, yenilenmeyen bir kimlikle 401 almaya ve devre kesiciyi
     tetiklemeye götürürdü. */
  it('süresi bildirilmeyen token önbelleğe HİÇ girmez', async () => {
    const sayac = { n: 0 };
    const ortak = {
      kimlikTipi: 'oauth2_client_credentials', sir: 'gizli', yapilandirma,
      tokenDeposu: bellekTokenDeposu(),
      getir: sahteGetir({ access_token: 'T' }, sayac),
    };
    await basliklariUret(ortak);
    await basliklariUret(ortak);
    expect(sayac.n).toBe(2);
  });

  it('access_token yoksa açık hata verir', async () => {
    const s = await basliklariUret({
      kimlikTipi: 'oauth2_client_credentials', sir: 'gizli', yapilandirma,
      getir: sahteGetir({ hata: 'yok' }),
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/access_token/);
  });

  /* İSTEMCİ SIRRI token isteğinin GÖVDESİNDE gider. Onu düz http ile
     göndermek özel ağda da kabul edilemez; bu yüzden `tokenAl`
     `guvensizHttpKabul` bayrağını hiç geçirmez. */
  it('düz http token adresi ÖZEL AĞDA BİLE reddedilir', async () => {
    const s = await basliklariUret({
      kimlikTipi: 'oauth2_client_credentials', sir: 'gizli',
      yapilandirma: { tokenUrl: 'http://10.0.0.9/token', istemciId: 'ist-1' },
      getir: sahteGetir({ access_token: 'T' }),
    });
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/TLS zorunlu/i);
  });
});

/* ═══ Mezar taşı ══════════════════════════════════════════════════════ */

const tamKosu = { senkronKipi: 'tam', devamVar: false, basarili: true };

describe('OT-40 · mezar taşı: yokluk tek başına kanıt değildir', () => {
  it('DELTA koşusundan mezar taşı çıkmaz', () => {
    const s = mezarTaslariniCikar(['a', 'b'], ['a'], { ...tamKosu, senkronKipi: 'delta' });
    expect(s.durum).toBe('uygulanamaz');
    if (s.durum === 'uygulanamaz') expect(s.gerekce).toMatch(/değişmedi/);
  });

  it('sayfa sınırına takılan tam koşudan mezar taşı çıkmaz', () => {
    const s = mezarTaslariniCikar(['a', 'b'], ['a'], { ...tamKosu, devamVar: true });
    expect(s.durum).toBe('uygulanamaz');
  });

  it('başarısız koşu hiçbir şey kanıtlamaz', () => {
    const s = mezarTaslariniCikar(['a', 'b'], ['a'], { ...tamKosu, basarili: false });
    expect(s.durum).toBe('uygulanamaz');
  });

  it('ilk tam koşuda karşılaştırılacak taban yoktur', () => {
    const s = mezarTaslariniCikar([], ['a', 'b'], tamKosu);
    expect(s.durum).toBe('uygulanamaz');
  });

  it('kaybolan kayıt bulunur ve gerekçesi sayı verir', () => {
    const onceki = Array.from({ length: 30 }, (_, i) => `k${i}`);
    const simdiki = onceki.slice(0, 28);
    const s = mezarTaslariniCikar(onceki, simdiki, tamKosu);
    expect(s.durum).toBe('uretildi');
    if (s.durum === 'uretildi') {
      expect(s.kayipKayitIdleri.sort()).toEqual(['k28', 'k29']);
      expect(s.gerekce).toMatch(/30 kayıttan 2/);
    }
  });

  /* "Filonun %90'ı silinmiş" bir gözlem değil, kaynak sorgusunun
     daraldığının belirtisidir. O durumda mezar taşı üretmek envanterin
     yarısını silme önerisiyle doldururdu. */
  it('eşiği aşan kayıp oranı ARIZA sayılır, mezar taşı üretilmez', () => {
    const onceki = Array.from({ length: 100 }, (_, i) => `k${i}`);
    const simdiki = onceki.slice(0, 20);
    const s = mezarTaslariniCikar(onceki, simdiki, tamKosu);
    expect(s.durum).toBe('ariza');
    if (s.durum === 'ariza') {
      expect(s.kayip).toBe(80);
      expect(s.oran).toBeGreaterThan(KAYIP_ORANI_ESIGI);
      expect(s.gerekce).toMatch(/silme dalgası değil/);
    }
  });

  /* Küçük kümede oran yanıltıcıdır: 3 kayıtlık bir kaynakta 2 kaydın
     düşmesi %67'dir ama gerçekten iki cihaz sökülmüş olabilir. */
  it('küçük kümede oran değil MUTLAK SAYI sorulur', () => {
    const s = mezarTaslariniCikar(['a', 'b', 'c'], ['a'], tamKosu);
    expect(s.durum).toBe('uretildi');

    const cok = Array.from({ length: 12 }, (_, i) => `k${i}`);
    const t = mezarTaslariniCikar(cok, cok.slice(0, 12 - (KUCUK_KUME_MUTLAK_SINIR + 1)), tamKosu);
    expect(t.durum).toBe('ariza');
  });

  it('hiçbir kayıt kaybolmadıysa boş liste döner — "uygulanamaz" değil', () => {
    const s = mezarTaslariniCikar(['a', 'b'], ['a', 'b', 'c'], tamKosu);
    expect(s.durum).toBe('uretildi');
    if (s.durum === 'uretildi') expect(s.kayipKayitIdleri).toEqual([]);
  });
});

/* ═══ Ölü ayar ════════════════════════════════════════════════════════ */

describe('OT-40 · geri çekilme merdiveni connector ayarını OKUR', () => {
  /* ÖLÇÜLMÜŞ KUSUR: `Connector.geriCekilmeMs` şemada vardı, ekranda
     düzenlenebiliyordu ve hiçbir yerde okunmuyordu. */
  it('ayar yoksa ürün varsayılanı kullanılır', () => {
    expect(geriCekilmeMerdiveni(null)).toEqual([1_000, 4_000, 16_000]);
    expect(geriCekilmeMerdiveni(undefined)).toEqual([1_000, 4_000, 16_000]);
  });

  it('ayar verilirse merdiven ona göre ölçeklenir', () => {
    expect(geriCekilmeMerdiveni(500)).toEqual([500, 2_000, 8_000]);
  });

  it('anlamsız değer varsayılana düşer, sıfır beklemeye DEĞİL', () => {
    expect(geriCekilmeMerdiveni(0)).toEqual([1_000, 4_000, 16_000]);
    expect(geriCekilmeMerdiveni(-5)).toEqual([1_000, 4_000, 16_000]);
    expect(geriCekilmeMerdiveni(Number.NaN)).toEqual([1_000, 4_000, 16_000]);
  });

  it('uç değerler sınırlara çekilir', () => {
    expect(geriCekilmeMerdiveni(10)).toEqual([100, 400, 1_600]);
    expect(geriCekilmeMerdiveni(900_000)).toEqual([60_000, 240_000, 960_000]);
  });
});
