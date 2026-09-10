import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · KİMLİK KATMANINDA SIR DEĞERİ SAKLANMAZ [URN-KML-001]

   Kural yetmez, kapı gerekir — R-C'nin öğrettiği ders. "Sır yalnız
   `sirReferansi` ile taşınır" yazılıydı ve doğruydu; ama P6 ile kimlik
   sağlayıcı geldi ve `client_secret` kavramı ürüne YENİ bir sır değeri
   sokma fırsatı açtı. Bu dosya o fırsatı kapatır.

   Üç diş:
   1. ŞEMADA SIR DEĞERİ ALANI YOK. `KimlikSaglayici` üzerinde
      `istemciSirri` gibi bir sütun olsaydı bir gün biri onu doldururdu;
      olmayan bir alan doldurulamaz.
   2. EYLEM KATMANI SIR DEĞERİ ALMAZ. `kimlikSaglayici.ts` şeması yalnız
      `...Referansi` alanı tanır.
   3. EKRAN VERİSİ SIRRI ÇÖZMEZ. `veri.ts` `siriCoz` çağırmaz; yalnız
      `sirMaskesi` (adres) kullanır.

   Dördüncü diş MFA içindir: TOTP sırrı ZORUNLU olarak saklanır ama AÇIK
   DEĞİL — kayda giden tek yol `sifrele()`dir.
   ═══════════════════════════════════════════════════════════════════════ */

const oku = (yol: string) => readFileSync(yol, 'utf8');

/** Yorumları ve satır-içi notları düşürür: kuralı ANLATAN bir cümle,
    kuralı ÇİĞNEYEN bir kod sanılmasın. */
function kodu(ham: string): string {
  return ham.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').map((s) => s.replace(/\/\/.*$/, '')).join('\n');
}

const SEMA = oku('prisma/schema.prisma');

/** Şemadaki bir modelin gövdesi. */
function modelGovdesi(ad: string): string {
  const m = new RegExp(`\\nmodel ${ad} \\{([\\s\\S]*?)\\n\\}`).exec(SEMA);
  if (!m) throw new Error(`model ${ad} şemada yok`);
  return m[1];
}

/* Sır DEĞERİ taşıyabilecek alan adları. `...Referansi` ve `...Zarfi`
   BİLEREK dışarıdadır: biri adres, öbürü şifreli gövde.

   İki kalıp var çünkü iki dil var: Prisma alanı `ad Tip` (boşlukla),
   TypeScript alanı `ad: Tip` (iki noktayla). Tek kalıpla ölçen bir bekçi
   ötekini görmez ve gördüğünü sanır. */
const SIR_ADLARI = /^\s*(\w*(?:sir|sirri|secret|parola|password|token|anahtar)\w*)\s+/gim;
const SIR_ADLARI_TS = /^\s*(\w*(?:sir|sirri|secret|parola|password|token|anahtar)\w*)\s*[?:]/gim;

describe('bekçi: kimlik şemasında SIR DEĞERİ alanı yok [URN-KML-001]', () => {
  it('`KimlikSaglayici` yalnız REFERANS taşır [URN-KML-001]', () => {
    const govde = modelGovdesi('KimlikSaglayici');
    const adlar = [...govde.matchAll(SIR_ADLARI)].map((m) => m[1]);
    /* Kabul edilen TEK ad: referans. */
    expect(adlar).toEqual(['istemciSirriReferansi']);
  });

  it('`MfaKaydi` düz sır değil ZARF taşır [URN-KML-001]', () => {
    const govde = modelGovdesi('MfaKaydi');
    const adlar = [...govde.matchAll(SIR_ADLARI)].map((m) => m[1]);
    expect(adlar).toEqual(['sirZarfi']);
    /* Zarfın ne olduğu şemanın kendi yorumunda yazılı olmalı: alanı
       okuyan biri "düz sır" sanmasın. */
    expect(SEMA).toMatch(/AES-256-GCM/);
  });

  it('`MfaKurtarmaKodu` kodu değil ÖZETİ tutar [URN-KML-001]', () => {
    const govde = modelGovdesi('MfaKurtarmaKodu');
    expect(govde).toMatch(/kodHash\s+String/);
    expect(govde).not.toMatch(/^\s*kod\s+String/m);
  });

  /* SABOTAJ VAKASI: bekçinin kendisi ölçüyor mu? Şemaya sır değeri
     alanı EKLENMİŞ bir kopya kırmızı yanmak ZORUNDA. */
  it('SABOTAJ: `istemciSirri` sütunu eklenmiş bir şema YAKALANIR [URN-KML-001]', () => {
    const sahte = '\nmodel KimlikSaglayici {\n  id String @id\n'
      + '  istemciSirri String?\n  istemciSirriReferansi String?\n}\n';
    const m = /\nmodel KimlikSaglayici \{([\s\S]*?)\n\}/.exec(sahte)!;
    const adlar = [...m[1].matchAll(SIR_ADLARI)].map((x) => x[1]);
    expect(adlar).toContain('istemciSirri');
    expect(adlar).not.toEqual(['istemciSirriReferansi']);
  });
});

describe('bekçi: eylem katmanı sır DEĞERİ kabul etmez [URN-KML-001]', () => {
  const kaynak = kodu(oku('lib/eylemler2/kimlikSaglayici.ts'));

  it('zod şemasında `...Referansi` dışında sır alanı yok [URN-KML-001]', () => {
    const sema = /const Sema = z\.object\(\{([\s\S]*?)\n\}\);/.exec(kaynak);
    expect(sema, 'Sema bloğu bulunamadı').not.toBeNull();
    const adlar = [...sema![1].matchAll(SIR_ADLARI_TS)].map((m) => m[1]);
    expect(adlar).toEqual(['istemciSirriReferansi']);
  });

  it('çözülmüş bir sır BU DOSYADAN geçmez — `siriCoz` çağrılmaz [URN-KML-001]', () => {
    expect(kaynak).not.toMatch(/siriCoz/);
  });

  it('ize giden metin MASKELİDİR [URN-KML-001]', () => {
    /* İz satırı sırra giden adresi taşır, sırrın kendisini değil. */
    expect(kaynak).toMatch(/sirMaskesi\(/);
  });
});

describe('bekçi: ekran verisi sırrı ÇÖZMEZ [URN-KML-001]', () => {
  const yol = 'app/(kabuk)/(operasyonel)/ayarlar/kimlik/veri.ts';
  const kaynak = kodu(oku(yol));

  it('`siriCoz` bu dosyada çağrılmaz [URN-KML-001]', () => {
    expect(kaynak).not.toMatch(/\bsiriCoz\s*\(/);
  });

  it('yalnız `sirMaskesi` (adres) kullanılır [URN-KML-001]', () => {
    expect(kaynak).toMatch(/sirMaskesi\(/);
  });

  it('istemci bileşenine giden tipte sır DEĞERİ alanı yok [URN-KML-001]', () => {
    /* İZİN LİSTESİ ADIYLA DURUR ve YALNIZ KÜÇÜLÜR. Kalıba takılan her
       alan burada gerekçesiyle sayılıdır; listede olmayan yeni bir alan
       kapıyı KIRMIZI yakar — "herhalde zararsızdır" diye geçilemez.

         sirMaskeli      → sırra giden ADRES (değer değil)
         mfaAnahtariVar  → boolean; "anahtar çözülebiliyor mu"
         mfaAnahtarNotu  → maskeli adres ya da hata metni

       Üçü de bir sır DEĞERİ taşıyamaz: ilki ve üçüncüsü `sirMaskesi()`
       çıktısı, ikincisi bir bayrak. */
    const IZINLI = ['sirMaskeli', 'mfaAnahtariVar', 'mfaAnahtarNotu'];
    const mantik = kodu(oku('app/(kabuk)/(operasyonel)/ayarlar/kimlik/mantik.ts'));
    const adlar = [...new Set([...mantik.matchAll(SIR_ADLARI_TS)].map((m) => m[1]))];
    const beyansiz = adlar.filter((a) => !IZINLI.includes(a));
    expect(beyansiz, `beyansız sır alanı: ${beyansiz.join(', ')}`).toEqual([]);
    /* Liste ÖLÜ SATIR taşıyamaz: kaldırılan bir alan izin listesinde
       kalırsa, bir sonraki eklemede sessiz bir kaçak kapısı olur. */
    const olu = IZINLI.filter((a) => !adlar.includes(a));
    expect(olu, `izin listesinde ölü satır: ${olu.join(', ')}`).toEqual([]);
  });
});

describe('bekçi: giriş doğrulaması SUNUCU EYLEMİ olamaz [URN-KML-001]', () => {
  it('`mfaGirisDogrula` `use server` dosyasından ihraç EDİLMEZ [URN-KML-001]', () => {
    /* Bu fonksiyon `kullaniciId`yi OTURUMDAN alamaz — çağrıldığı anda
       oturum yoktur. Bir `'use server'` dosyasında dursaydı derlenmiş bir
       uç nokta olur ve oturumsuz bir çağıran istediği kullanıcı için kod
       deneyip kurtarma kodlarını tüketebilirdi (bağımsız inceleme
       bulgusu, #49). Kardeş eylemler `kendiHesabi()` ile korunuyor; bu
       korunamadığı için AYRI ve `server-only` bir modülde durur. */
    const eylem = oku('lib/eylemler2/mfa.ts');
    expect(eylem.startsWith("'use server'")).toBe(true);
    expect(kodu(eylem)).not.toMatch(/export\s+(async\s+)?function\s+mfaGirisDogrula/);

    const giris = oku('lib/kimlik/mfaGiris.ts');
    const girisKodu = kodu(giris);
    expect(girisKodu).toMatch(/import 'server-only'/);
    /* KOD taranır, YORUM değil: dosyanın kendi gerekçesi `'use server'`
       dizesini ANLATMAK için taşıyor. Ham metinde arayan bir bekçi,
       kuralı açıklayan cümleyi kuralın ihlali sanardı — bu dosyanın
       başındaki `kodu()` tam bu yüzden var. */
    expect(girisKodu).not.toMatch(/'use server'/);
    expect(girisKodu).toMatch(/export async function mfaGirisDogrula/);
  });

  it('giriş doğrulaması tekrar engelini KOŞULLU yazar [URN-KML-001]', () => {
    /* Koşulsuz `update`, iki eşzamanlı çağrının aynı kodu geçirmesine
       izin verirdi (aynı bulgu). Okunan adım yazma koşuludur. */
    const giris = kodu(oku('lib/kimlik/mfaGiris.ts'));
    expect(giris).toMatch(/updateMany\(\{\s*where:\s*\{\s*id:\s*kayit\.id,\s*sonAdim:\s*kayit\.sonAdim/);
    expect(giris).not.toMatch(/mfaKaydi\.update\(/);
  });

  it('başarılı TOTP girişi İZ bırakır [URN-KML-001]', () => {
    /* Kurtarma dalı izi yazıyordu, TOTP dalı yazmıyordu — komşu yolun
       doğru yapması bunun atlanmış bir dal olduğunu gösterir. */
    const giris = kodu(oku('lib/kimlik/mfaGiris.ts'));
    const totpDali = giris.slice(giris.indexOf('if (sonuc.ok)'), giris.indexOf('const aday'));
    expect(totpDali).toMatch(/await iz\(/);
  });
});

describe('bekçi: TOTP sırrı ZARFSIZ yazılmaz [URN-KML-001]', () => {
  it('`sirZarfi` alanına yazan her yol `sifrele()`den geçer [URN-KML-001]', () => {
    /* `lib/` altında `sirZarfi:` yazan her dosya, aynı dosyada
       `sifrele(` de çağırmalı. Düz sırrı doğrudan yazan bir yol, bu
       kuralla adıyla düşer. */
    const kokler = ['lib', 'app'];
    const yazanlar: string[] = [];
    const gez = (d: string) => {
      for (const ad of readdirSync(d, { withFileTypes: true })) {
        const tam = path.join(d, ad.name);
        if (ad.isDirectory()) {
          if (ad.name === 'prisma-client' || ad.name === 'node_modules') continue;
          gez(tam);
        } else if (/\.tsx?$/.test(ad.name)) {
          const k = kodu(readFileSync(tam, 'utf8'));
          if (/sirZarfi\s*:/.test(k)) yazanlar.push(tam);
        }
      }
    };
    for (const k of kokler) gez(k);

    /* Ölçüm sayısı sıfır olamaz: hiçbir dosya bulunamazsa tarama
       kırılmıştır ve "kusur yok" demek hiçbir şeye bakmamaktır. */
    expect(yazanlar.length).toBeGreaterThan(0);
    const zarfsiz = yazanlar.filter((y) => !/\bsifrele\s*\(/.test(kodu(readFileSync(y, 'utf8'))));
    expect(zarfsiz, `zarfsız yazan dosya: ${zarfsiz.join(', ')}`).toEqual([]);
  });

  it('şifreleme anahtarı REFERANSTAN çözülür, koda gömülmez [URN-KML-001]', () => {
    const kaynak = kodu(oku('lib/kimlik/sifreleme.ts'));
    expect(kaynak).toMatch(/siriCoz\(/);
    /* Anahtarın kendisi bir sabit olamaz: 16+ karakterlik base64/hex
       görünümlü bir dize burada bir anahtar kaçağıdır. */
    for (const m of kaynak.matchAll(/['"`]([A-Za-z0-9+/=]{24,})['"`]/g)) {
      throw new Error(`sifreleme.ts içinde gömülü görünen dize: ${m[1].slice(0, 12)}…`);
    }
  });
});
