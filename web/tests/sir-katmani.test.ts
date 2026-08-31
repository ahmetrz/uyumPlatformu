import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Sır katmanı — gerçek credential OLMADAN test edilebilen her şey.

   Burada test edilen şey bir sırrın DEĞERİ değil, katmanın SÖZLEŞMESİDİR:
   · bağlanmamış sağlayıcı "yok" demez, "bilinmiyor" der;
   · geçersiz referans ilk koşuya kadar ertelenmez, kaydederken yakalanır;
   · sır değeri hiçbir hata metnine sızmaz;
   · rotasyon sonrası eski değer yaşamaz (önbellek yok). */

const {
  siriCoz, sirVarMi, referansDenetle, referansGecerli, referansAyristir,
  sirMaskesi, sirlariAyikla, sirSizintisiVarMi, sirSaglayicilari,
  sirSaglayiciKaydet, rotasyonBildir,
} = await import('@/lib/entegrasyon/sir');

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-sir-'));

describe('Referans ayrıştırma ve doğrulama', () => {
  it('geçerli biçimleri ayrıştırır', () => {
    expect(referansAyristir('env:AD_PAROLA')).toEqual(
      { saglayici: 'env', yol: 'AD_PAROLA', alan: null });
    expect(referansAyristir('dosya:/run/secrets/ad#parola')).toEqual(
      { saglayici: 'dosya', yol: '/run/secrets/ad', alan: 'parola' });
    expect(referansAyristir('vault:ot/ad#parola')).toEqual(
      { saglayici: 'vault', yol: 'ot/ad', alan: 'parola' });
  });

  it('bozuk biçimi reddeder', () => {
    for (const kotu of ['', 'AD_PAROLA', 'env:', ':yol', 'env: bosluk var', 'env:a#b#c']) {
      expect(referansGecerli(kotu), `'${kotu}' geçerli sayıldı`).toBe(false);
    }
  });

  /* Biçim geçerliliği ile SAĞLAYICI tanınırlığı ayrı kontroldür: bir
     referans biçimsel olarak doğru ama sağlayıcısı kayıtlı olmayabilir. */
  it('tanınmayan sağlayıcı biçimsel olarak geçerli ama DENETİMDEN geçmez', () => {
    expect(referansGecerli('kasa:ot/ad')).toBe(true);
    const d = referansDenetle('kasa:ot/ad');
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.hata).toMatch(/Bilinmeyen sır sağlayıcısı/);
  });

  it('denetim, sağlayıcının bağlı olup olmadığını da bildirir', () => {
    const env = referansDenetle('env:X');
    expect(env.ok && env.saglayiciBagli).toBe(true);
    const vault = referansDenetle('vault:ot/ad');
    // Kayıtlı ama BAĞLI DEĞİL — ikisi ayrı bilgi.
    expect(vault.ok).toBe(true);
    expect(vault.ok && vault.saglayiciBagli).toBe(false);
  });
});

describe('env sağlayıcısı', () => {
  const AD = 'UYUM_TEST_SIRRI';
  beforeEach(() => { process.env[AD] = 'ilk-deger-12345'; });
  afterEach(() => { delete process.env[AD]; });

  it('tanımlı değeri çözer', async () => {
    const s = await siriCoz(`env:${AD}`);
    expect(s.ok && s.deger).toBe('ilk-deger-12345');
  });

  it('tanımsız değişken için AÇIK hata verir — boş dize dönmez', async () => {
    const s = await siriCoz('env:BOYLE_BIR_DEGISKEN_YOK');
    expect(s.ok).toBe(false);
    if (!s.ok) expect(s.hata).toMatch(/tanımsız/);
  });

  it('varlık kontrolü değeri döndürmez', async () => {
    const v = await sirVarMi(`env:${AD}`);
    expect(v.durum).toBe('var');
    expect(JSON.stringify(v)).not.toContain('ilk-deger-12345');
  });

  /* Rotasyon: kaynaktaki değer değişince BİR SONRAKİ çözüm yenisini
     getirmeli. Önbellek olsaydı eski değer yaşar ve kimlik doğrulama
     sessizce başarısız olurdu. */
  it('rotasyondan sonra YENİ değeri getirir — önbellek yok', async () => {
    expect((await siriCoz(`env:${AD}`) as { deger: string }).deger).toBe('ilk-deger-12345');
    process.env[AD] = 'donduruldu-67890';
    expect((await siriCoz(`env:${AD}`) as { deger: string }).deger).toBe('donduruldu-67890');
    expect(rotasyonBildir().temizlenen).toBe(0);
  });
});

describe('dosya sağlayıcısı', () => {
  const duz = path.join(dizin, 'duz.txt');
  const json = path.join(dizin, 'kimlik.json');
  beforeEach(() => {
    writeFileSync(duz, '  duz-sir-degeri  \n');
    writeFileSync(json, JSON.stringify({ parola: 'json-sir-degeri', bos: '' }));
  });

  it('düz dosyayı kırparak okur', async () => {
    const s = await siriCoz(`dosya:${duz}`);
    expect(s.ok && s.deger).toBe('duz-sir-degeri');
  });

  it('JSON alanını okur', async () => {
    const s = await siriCoz(`dosya:${json}#parola`);
    expect(s.ok && s.deger).toBe('json-sir-degeri');
  });

  it('boş alan "var" sayılmaz', async () => {
    expect((await sirVarMi(`dosya:${json}#bos`)).durum).toBe('yok');
  });

  it('olmayan dosya için hata metni İÇERİĞİ değil YOLU taşır', async () => {
    const yok = path.join(dizin, 'yok.json');
    const s = await siriCoz(`dosya:${yok}#parola`);
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.hata).toContain(yok);
      expect(s.hata).not.toContain('json-sir-degeri');
    }
  });
});

describe('vault sağlayıcısı — kayıtlı ama BAĞLI DEĞİL', () => {
  it('çözüm sessizce env\'e DÜŞMEZ, açık hata verir', async () => {
    process.env['ot/ad'] = 'bu-deger-kullanilmamali';
    const s = await siriCoz('vault:ot/ad');
    expect(s.ok).toBe(false);
    if (!s.ok) {
      expect(s.hata).toMatch(/bağlı değil/);
      expect(s.hata).not.toContain('bu-deger-kullanilmamali');
    }
    delete process.env['ot/ad'];
  });

  /* En kritik ayrım: bağlanmamış sağlayıcı "sır YOK" demez. "Yok" demek,
     kurulumu eksik OLMAYAN bir connector'ı eksik göstermek olurdu.

     Not (mutasyonla ölçüldü): bu değişmezi İKİ katman koruyor —
     sirVarMi() içindeki 'bağlı değil' kapısı ve sağlayıcının kendi
     varMi()'si. Yalnız birini bozmak testi kırmızıya döndürmez, çünkü
     öbürü tutuyor; ikisini birden bozmak döndürür. Bu bilinçli bir
     savunma derinliğidir, test eksikliği değil. */
  it('varlık kontrolü "yok" değil "bilinmiyor" döner', async () => {
    const v = await sirVarMi('vault:ot/ad');
    expect(v.durum).toBe('bilinmiyor');
    expect(v.durum).not.toBe('yok');
  });

  it('sağlayıcı listesinde bağlı olmadığı ve neyin gerektiği yazar', () => {
    const vault = sirSaglayicilari().find((s) => s.ad === 'vault');
    expect(vault?.bagli).toBe(false);
    expect(vault?.gereken).toMatch(/Vault|KMS/);
  });
});

describe('Sağlayıcı kayıt defteri', () => {
  it('üç sağlayıcı kayıtlı: env ve dosya bağlı, vault değil', () => {
    const adlar = sirSaglayicilari().map((s) => s.ad);
    expect(adlar).toEqual(['dosya', 'env', 'vault']);
    expect(sirSaglayicilari().filter((s) => s.bagli).map((s) => s.ad)).toEqual(['dosya', 'env']);
  });

  it('aynı ad iki kez SESSİZCE üzerine yazılmaz', () => {
    const sahte = {
      ad: 'env', bagli: true,
      coz: async () => ({ ok: true as const, deger: 'x' }),
      varMi: async () => ({ durum: 'var' as const }),
    };
    expect(() => sirSaglayiciKaydet(sahte)).toThrow(/zaten kayıtlı/);
  });
});

describe('Maskeleme ve redaksiyon', () => {
  it('maske yolu gösterir, değeri göstermez', () => {
    expect(sirMaskesi('env:AD_PAROLA')).toBe('env: AD_PAROLA');
    expect(sirMaskesi('dosya:/run/secrets/ad#parola')).toBe('dosya: /run/secrets/ad → parola');
    expect(sirMaskesi(null)).toBe('tanımsız');
    expect(sirMaskesi('bozuk')).toBe('(geçersiz referans)');
  });

  it('ayıklama sırrı metinden çıkarır, yapıyı korur', () => {
    const sir = 'sUpErGiZli123';
    const log = `Bağlantı hatası: parola=${sir} host=ad.local`;
    const temiz = sirlariAyikla(log, [sir]);
    expect(temiz).not.toContain(sir);
    expect(temiz).toContain('host=ad.local');
    expect(temiz).toContain('«sır ayıklandı»');
  });

  it('birden çok sırrı aynı anda ayıklar', () => {
    const temiz = sirlariAyikla('a=parola-bir b=token-iki', ['parola-bir', 'token-iki']);
    expect(temiz).not.toContain('parola-bir');
    expect(temiz).not.toContain('token-iki');
  });

  it('düzenli ifade karakteri içeren sır ayıklanır (kaçış)', () => {
    const sir = 'p@ss.w+rd*(1)';
    expect(sirlariAyikla(`x=${sir}`, [sir])).not.toContain(sir);
  });

  /* Çok kısa değerler metinde tesadüfen geçebilir; körlemesine
     değiştirmek okunabilir metni bozar. Eşik bilinçlidir. */
  it('çok kısa değer ayıklanmaz — okunabilirlik bozulmasın', () => {
    expect(sirlariAyikla('durum=acik', ['acik'])).toBe('durum=acik');
    expect(sirSizintisiVarMi('durum=acik', 'acik')).toBe(false);
  });

  it('null/undefined sır ayıklamayı bozmaz', () => {
    expect(sirlariAyikla('metin', [null, undefined])).toBe('metin');
  });
});
