import { describe, expect, it } from 'vitest';
import { ADVISORY_TAVANI, advisoryAyristir } from '../lib/varlik/advisory';

/* ═══ OT-25 · Duyuru ayrıştırıcı ══════════════════════════════════════

   Sözleşme `sbom.ts` ile aynı ve testler onu koruyor:
     · hiçbir girdi throw ETTİRMEZ,
     · alınamayan kayıt REDDEDİLEN olarak sayılır, sessizce düşmez,
     · çözümlenemeyen sürüm kaydı reddettirmez — motor `karar_verilemedi`
       üretir ve bu doğrudur. */

const belge = (o: unknown) => JSON.stringify(o);

const TAM = {
  kaynak: 'icscert',
  referans: 'ICSA-24-100-01',
  baslik: 'Örnek PLC ailesinde kimlik doğrulama atlatma',
  yayim: '2024-04-09',
  url: 'https://example.invalid/icsa-24-100-01',
  cveler: ['CVE-2024-1234', 'cve-2024-5678'],
  urunler: [{
    uretici: 'Örnek Otomasyon',
    urunAdi: 'PLC-9000',
    etkilenenAlt: '2.0.0',
    etkilenenUst: '2.4.5',
    duzeltilenSurum: '2.4.5',
  }],
};

describe('Ayrıştırıcı hiçbir girdide throw etmez', () => {
  it('geçersiz JSON reddedilen olarak döner, istisna fırlatmaz', () => {
    const s = advisoryAyristir('{ bozuk');
    expect(s.girdiler).toHaveLength(0);
    expect(s.reddedilen[0].sebep).toMatch(/JSON/);
  });

  it('dizi de { advisories: [...] } sarmalayıcısı da kabul edilir', () => {
    expect(advisoryAyristir(belge([TAM])).girdiler).toHaveLength(1);
    expect(advisoryAyristir(belge({ advisories: [TAM] })).girdiler).toHaveLength(1);
  });

  it('ne dizi ne sarmalayıcı olan belge gerekçesiyle reddedilir', () => {
    const s = advisoryAyristir(belge({ baslik: 'tek duyuru' }));
    expect(s.girdiler).toHaveLength(0);
    expect(s.reddedilen[0].sebep).toMatch(/dizisi/);
  });

  it('boş dizi bir hata değildir: sıfır duyuru, sıfır red', () => {
    const s = advisoryAyristir(belge([]));
    expect(s.girdiler).toHaveLength(0);
    expect(s.reddedilen).toHaveLength(0);
  });
});

describe('Kayıt reddi SESSİZ değildir', () => {
  it('referanssız kayıt gerekçesiyle reddedilir', () => {
    const s = advisoryAyristir(belge([{ baslik: 'referanssız' }]));
    expect(s.girdiler).toHaveLength(0);
    expect(s.reddedilen[0]).toMatchObject({ sira: 1 });
    expect(s.reddedilen[0].sebep).toMatch(/[Rr]eferans/);
  });

  it('başlıksız kayıt reddedilir ve referansı gerekçede geçer', () => {
    const s = advisoryAyristir(belge([{ referans: 'X-1' }]));
    expect(s.reddedilen[0].sebep).toContain('X-1');
  });

  it('aynı belgede yinelenen referans ikinci kez alınmaz', () => {
    const s = advisoryAyristir(belge([TAM, TAM]));
    expect(s.girdiler).toHaveLength(1);
    expect(s.reddedilen[0].sebep).toMatch(/[Yy]inelenen/);
  });

  it('bir kaydın bozuk ürün satırı BÜTÜN kaydı düşürmez', () => {
    const s = advisoryAyristir(belge([{
      ...TAM, urunler: [{ note: 'kimliksiz' }, TAM.urunler[0]],
    }]));
    expect(s.girdiler).toHaveLength(1);
    expect(s.girdiler[0].urunler).toHaveLength(1);
    expect(s.reddedilen).toHaveLength(1);
  });
});

describe('Aralık uçları tahmin edilmez', () => {
  it('varsayılan: alt uç DAHİL, üst uç HARİÇ', () => {
    const u = advisoryAyristir(belge([TAM])).girdiler[0].urunler[0];
    expect(u.etkilenenAltDahil).toBe(true);
    expect(u.etkilenenUstDahil).toBe(false);
  });

  it('belgede açıkça verilen uç varsayılanı EZER', () => {
    const u = advisoryAyristir(belge([{
      ...TAM,
      urunler: [{ ...TAM.urunler[0], etkilenenAltDahil: false, etkilenenUstDahil: true }],
    }])).girdiler[0].urunler[0];
    expect(u.etkilenenAltDahil).toBe(false);
    expect(u.etkilenenUstDahil).toBe(true);
  });

  it('metin olarak gelen mantık değeri okunur, tanınmayan varsayılana düşer', () => {
    const oku = (v: unknown) => advisoryAyristir(belge([{
      ...TAM, urunler: [{ ...TAM.urunler[0], etkilenenUstDahil: v }],
    }])).girdiler[0].urunler[0].etkilenenUstDahil;
    expect(oku('true')).toBe(true);
    expect(oku('evet')).toBe(true);
    expect(oku('hayir')).toBe(false);
    expect(oku('belki')).toBe(false);   // varsayılan: üst uç hariç
  });
});

describe('Çözümlenemeyen sürüm kaydı DÜŞÜRMEZ, işaretler', () => {
  it('okunamayan aralık ucu `surumBelirsiz` ile geri döner', () => {
    const s = advisoryAyristir(belge([{
      ...TAM, urunler: [{ ...TAM.urunler[0], etkilenenUst: 'çok yeni sürüm' }],
    }]));
    expect(s.girdiler[0].urunler[0].surumBelirsiz).toBe(true);
    expect(s.reddedilen).toHaveLength(0);
  });

  it('sürümleri çözülen kayıt belirsiz İŞARETLENMEZ', () => {
    expect(advisoryAyristir(belge([TAM])).girdiler[0].urunler[0].surumBelirsiz).toBe(false);
  });
});

describe('CVE kimlikleri normalleştirilir', () => {
  it('küçük harfli CVE büyük harfe çevrilir ve tekilleşir', () => {
    const g = advisoryAyristir(belge([{
      ...TAM, cveler: ['cve-2024-1234', 'CVE-2024-1234', 'CVE-2024-5678'],
    }])).girdiler[0];
    expect(g.cveler).toEqual(['CVE-2024-1234', 'CVE-2024-5678']);
  });

  it('CVE biçimine uymayan değer atılır, kaydı düşürmez', () => {
    const g = advisoryAyristir(belge([{
      ...TAM, cveler: ['CVE-24-1', 'not-a-cve', 'CVE-2024-1234'],
    }])).girdiler[0];
    expect(g.cveler).toEqual(['CVE-2024-1234']);
  });

  it('virgüllü tek metin de CVE listesi sayılır', () => {
    const g = advisoryAyristir(belge([{
      ...TAM, cveler: 'CVE-2024-1234, CVE-2024-5678',
    }])).girdiler[0];
    expect(g.cveler).toHaveLength(2);
  });
});

describe('Bilinmeyen değerler UYDURULMAZ', () => {
  it('tanınmayan kaynak `diger`e düşer, kayıt reddedilmez', () => {
    const g = advisoryAyristir(belge([{ ...TAM, kaynak: 'bizim-portal' }])).girdiler[0];
    expect(g.kaynak).toBe('diger');
  });

  it('çözümlenemeyen tarih null olur — bugünün tarihi yazılmaz', () => {
    const g = advisoryAyristir(belge([{ ...TAM, yayim: 'geçen bahar' }])).girdiler[0];
    expect(g.yayim).toBeNull();
  });

  it('ürünsüz duyuru KAYDA ALINIR: varlığı da bilgidir', () => {
    const s = advisoryAyristir(belge([{ ...TAM, urunler: [] }]));
    expect(s.girdiler).toHaveLength(1);
    expect(s.girdiler[0].urunler).toHaveLength(0);
    expect(s.reddedilen).toHaveLength(0);
  });

  it('yalnız CPE taşıyan ürün satırı geçerlidir', () => {
    const u = advisoryAyristir(belge([{
      ...TAM, urunler: [{ cpe: 'cpe:2.3:o:ornek:plc9000:2.1:*:*:*:*:*:*:*' }],
    }])).girdiler[0].urunler[0];
    expect(u.cpe).not.toBeNull();
    expect(u.uretici).toBeNull();
  });
});

describe('Tavan sabiti kaynakta durur', () => {
  it('ADVISORY_TAVANI pozitif ve ayrıştırıcıyla birlikte dışa aktarılır', () => {
    expect(ADVISORY_TAVANI).toBeGreaterThan(0);
  });
});
