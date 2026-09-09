import { describe, expect, it } from 'vitest';
import { KURULUMDA_VERILIR, ORTAM_ANAHTARLARI, ortamHataCumlesi, ortamiCoz } from '@/lib/yapilandirma/ortam';

/* ═══════════════════════════════════════════════════════════════════════
   ORTAM ŞEMASI — EKSİK YA DA BOZUK DEĞER AÇILIŞTA ADIYLA DÜŞER [URN-KUR-012]

   Yapılandırma okuması koda dağıldığında üç kusur birden doğar: değer
   ADI olmadan patlar, "belirtilmedi" ile "yanlış yazıldı" karışır ve
   hatalı bir değer sessiz varsayılana düşer. Kurulumda bunların hepsi
   aynı sonucu verir: uygulama açılır, YANLIŞ çalışır ve bunu ancak
   müşteri fark eder.

   En pahalı vaka ölçüldü (bağımsız inceleme): `openssl rand -base64 32`
   ile üretilen parola `/` içerdiğinde bağlantı dizesinin otoritesi
   bölünür. PostgreSQL parolayı KABUL eder — kusur veritabanında değil,
   dizede — ve uygulama bağlanamaz. Operatör "uygulama bozuk" görür.
   ═══════════════════════════════════════════════════════════════════════ */

/** `ProcessEnv` her değeri `string | undefined` sayar; test sabitleri dar
    tiptedir. Genişletme tek yerde yapılır ki her çağrıda `as` yazılmasın. */
const ortam = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;

describe('ortam şeması [URN-KUR-012]', () => {
  it('geçerli ortam çözülür ve hata listesi BOŞTUR [URN-KUR-012]', () => {
    const o = ortamiCoz(ortam({ DATABASE_URL: 'postgresql://uyum:parola@veritabani:5432/uyum' }));
    expect(o.ok, o.ok ? '' : ortamHataCumlesi(o.hatalar)).toBe(true);
  });

  it('AYRIŞTIRILAMAYAN PostgreSQL dizesi ADIYLA reddedilir [URN-KUR-012]', () => {
    /* `openssl rand -base64 32` çıktısı: `s/IvYfpC8orZ6yR4E2+gus0iwEdE1qO06ssIvdtM1vY=`
       İçindeki `/` URI otoritesini böler. Bu dize kurgusaldır ve gerçek
       bir kuruluma ait değildir. */
    const o = ortamiCoz(ortam({
      DATABASE_URL: 'postgresql://uyum:s/IvYfpC8orZ6yR4E2+gus0iwEdE1qO06ssIvdtM1vY=@veritabani:5432/uyum',
    }));
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.hatalar.map((h) => h.anahtar)).toContain('DATABASE_URL');
    expect(ortamHataCumlesi(o.hatalar)).toMatch(/DATABASE_URL/);
    // Sebep OKUNABİLİR olmalı: "geçersiz" demek operatörü tahmine zorlar.
    expect(o.hatalar.find((h) => h.anahtar === 'DATABASE_URL')?.mesaj)
      .toMatch(/URL-güvenli|ayrıştırılamıyor/i);
  });

  it('URL kodlanmış parola KABUL edilir — kural dizeye, parolaya değil [URN-KUR-012]', () => {
    const o = ortamiCoz(ortam({ DATABASE_URL: 'postgresql://uyum:s%2FIv%2Bg%3D@veritabani:5432/uyum' }));
    expect(o.ok ? [] : o.hatalar.map((h) => h.anahtar)).not.toContain('DATABASE_URL');
  });

  it('TANINMAYAN sağlayıcı sessizce SQLite olmaz [URN-KUR-012]', () => {
    const o = ortamiCoz(ortam({ DATABASE_URL: 'mysql://u:p@h/d' }));
    expect(o.ok).toBe(false);
    if (o.ok) return;
    expect(o.hatalar.map((h) => h.anahtar)).toContain('DATABASE_URL');
  });

  it('BOZUK sayı ve mantık değeri varsayılana DÜŞMEZ, hata verir [URN-KUR-012]', () => {
    const o = ortamiCoz(ortam({ API_ORAN_SINIRI: 'çok', TRUST_PROXY: 'belki' }));
    expect(o.ok).toBe(false);
    if (o.ok) return;
    const adlar = o.hatalar.map((h) => h.anahtar);
    expect(adlar).toContain('API_ORAN_SINIRI');
    /* `TRUST_PROXY` bilerek serbest metindir (`lib/istemciAdresi.ts` onu
       kendi kuralıyla çözer ve tanınmayan değerde GÜVENMEZ + günlüğe
       yazar); şema onu reddetmez. Bu ayrım burada YAZILIDIR ki bir gün
       "neden bu da kontrol edilmiyor" diye sorulmasın. */
    expect(adlar).not.toContain('TRUST_PROXY');
  });

  it('kurulumda verilmesi gereken anahtarlar ADIYLA sayılıdır [URN-KUR-012]', () => {
    expect(ORTAM_ANAHTARLARI.length).toBeGreaterThanOrEqual(10);
    for (const a of KURULUMDA_VERILIR) expect(ORTAM_ANAHTARLARI).toContain(a);
    // Liste boş kalırsa `docs/KURULUM.md` neyi anlatacağını bilemez.
    expect(KURULUMDA_VERILIR.length).toBeGreaterThan(0);
  });
});
