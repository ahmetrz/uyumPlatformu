import { sozlukKur } from '../lib/dil/terimler';
import { ENERJI_SOZLUGU, SU_SOZLUGU } from '../prisma/sozlukler';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  KAPSAM_SINIFI, KAPSAM_SOZU, UC_ETIKETI, ucEtiketi, UC_KIMLIKLERI, UC_MODULU,
  YAZMA_UCLARI, anahtarCumlesi, anahtarOzeti, kapsamKapisi, kapsamiCoz,
  ucaErisim, yazmaUcuMu, type UcKimligi,
} from '@/lib/api/kapsam';
import { UC_YOLU, openapiBelgesi } from '@/lib/api/sozlesme';

/* ═══════════════════════════════════════════════════════════════════════
   UY-52 · API anahtarı kapsamı ve sözleşmesi

   Bu dosyanın çivilediği kurallar:
     · kapsam listesi ile YAZMA UÇLARI listesi ürünün gerçeğiyle birebir,
     · bozuk kapsam "her şey" DEĞİL "hiçbir şey"dir,
     · salt okunur bayrağı kapsam listesinden BAĞIMSIZ ikinci katmandır,
     · kapsamsız ESKİ anahtar çalışır ama KUSUR olarak işaretlenir,
     · yeni anahtar kapsamsız açılamaz,
     · OpenAPI belgesi uç kütüğünü tam kapsar ve `servers` yazmaz.
   ═══════════════════════════════════════════════════════════════════════ */

const UCLAR_DIZINI = path.join(process.cwd(), 'lib/api/uclar');
const ucDosyalari = readdirSync(UCLAR_DIZINI).filter((d) => d.endsWith('.ts'));

/** Uç dosyalarındaki `apiUcu({ uc: '…', modul: '…', islem: '…' })` bildirimleri. */
const bildirimler = ucDosyalari.flatMap((dosya) => {
  const kaynak = readFileSync(path.join(UCLAR_DIZINI, dosya), 'utf8');
  const m = /apiUcu\(\s*\{\s*uc:\s*'([^']+)',\s*modul:\s*'([^']+)',\s*islem:\s*'([^']+)'/
    .exec(kaynak);
  return m ? [{ dosya, uc: m[1], modul: m[2], islem: m[3] }] : [];
});

describe('Uç kütüğü ürünün GERÇEĞİYLE birebir', () => {
  it('her uç dosyası kendi kimliğini bildirir', () => {
    expect(bildirimler.length).toBe(ucDosyalari.length);
  });

  it('UC_KIMLIKLERI ile bildirilen uçlar AYNI kümedir [API-KPS-003]', () => {
    expect([...bildirimler.map((b) => b.uc)].sort())
      .toEqual([...UC_KIMLIKLERI].sort());
  });

  /* Bu test FAZ F sırasında ölçülmüş bir hatayı yakalar: `YAZMA_UCLARI`
     ilk hâlinde yalnız `assets.upsert` içeriyordu, oysa POST alan beş uç
     vardı. Salt okunur bir anahtar zafiyet kaydı yazabiliyordu. */
  it('YAZMA_UCLARI, islem:yazma bildiren uçların TAMAMIDIR', () => {
    const yazanlar = bildirimler.filter((b) => b.islem === 'yazma').map((b) => b.uc);
    expect([...yazanlar].sort()).toEqual([...YAZMA_UCLARI].sort());
    expect(YAZMA_UCLARI.length).toBeGreaterThan(1);
  });

  it('UC_MODULU her uçta apiUcu bildirimiyle aynı modülü söyler', () => {
    for (const b of bildirimler) {
      expect(UC_MODULU[b.uc as UcKimligi]).toBe(b.modul);
    }
  });

  it('her ucun etiketi ve yolu vardır', () => {
    for (const uc of UC_KIMLIKLERI) {
      expect(UC_ETIKETI[uc]).toBeTruthy();
      expect(UC_YOLU[uc].startsWith('/api/v1/')).toBe(true);
    }
  });

  it('UC_YOLU app/api/v1 altındaki gerçek rotalarla eşleşir', () => {
    for (const uc of UC_KIMLIKLERI) {
      const dosya = path.join(process.cwd(), 'app', UC_YOLU[uc], 'route.api.ts');
      expect(() => readFileSync(dosya, 'utf8')).not.toThrow();
    }
  });
});

describe('kapsamiCoz — bozuk kapsam HER ŞEY değildir', () => {
  it('null = tanımsız (eski kayıt)', () => {
    const k = kapsamiCoz(null);
    expect(k.durum).toBe('tanimsiz');
    expect(k.uclar).toEqual([]);
  });

  it('bozuk JSON boş kapsama düşer, sınırsıza DEĞİL', () => {
    for (const bozuk of ['{', 'null', '"facilities"', '{"uclar":["facilities"]}', '42']) {
      const k = kapsamiCoz(bozuk);
      expect(k.durum).toBe('bozuk');
      expect(k.uclar).toEqual([]);
    }
  });

  it('boş dizi BOŞ kapsamdır — tanımsız değil', () => {
    expect(kapsamiCoz('[]').durum).toBe('bos');
  });

  it('tanınmayan girdiler SESSİZCE atılmaz, sayılır', () => {
    const k = kapsamiCoz('["facilities","olmayan-uc","facilities"]');
    expect(k.uclar).toEqual(['facilities']);
    expect(k.taninmayan).toEqual(['olmayan-uc']);
  });

  it('her kapsam durumunun sözü ve ekran sınıfı vardır', () => {
    for (const d of ['tanimli', 'tanimsiz', 'bos', 'bozuk'] as const) {
      expect(KAPSAM_SOZU[d]).toBeTruthy();
      expect(KAPSAM_SINIFI[d]).toBeTruthy();
    }
  });
});

describe('ucaErisim — İKİ KATMANLI savunma', () => {
  const yazmaUcu = YAZMA_UCLARI[0];
  const okumaUcu = UC_KIMLIKLERI.find((u) => !yazmaUcuMu(u))!;

  it('salt okunur anahtar yazma ucuna GİREMEZ — kapsamında olsa bile', () => {
    const k = ucaErisim({
      kapsamJson: JSON.stringify([yazmaUcu]), saltOkunur: true, uc: yazmaUcu,
    });
    expect(k.izin).toBe(false);
    if (k.izin) return;
    expect(k.sebep).toMatch(/salt okunur/i);
  });

  it('yazabilen anahtar kapsamındaki yazma ucuna girer', () => {
    const k = ucaErisim({
      kapsamJson: JSON.stringify([yazmaUcu]), saltOkunur: false, uc: yazmaUcu,
    });
    expect(k).toEqual({ izin: true, miras: false });
  });

  it('kapsam dışı uç reddedilir ve SEBEBİ uç adını söyler', () => {
    const k = ucaErisim({
      kapsamJson: JSON.stringify([okumaUcu]), saltOkunur: true,
      uc: UC_KIMLIKLERI.find((u) => u !== okumaUcu && !yazmaUcuMu(u))!,
    });
    expect(k.izin).toBe(false);
    if (k.izin) return;
    expect(k.sebep).toMatch(/kapsamında/i);
  });

  it('bozuk kapsam erişimi REDDEDER', () => {
    const k = ucaErisim({ kapsamJson: 'bozuk', saltOkunur: true, uc: okumaUcu });
    expect(k.izin).toBe(false);
  });

  /* Eski anahtarları bugün kesmek çalışan entegrasyonları sessizce
     kırardı; bunun yerine geçer ama `miras: true` ile işaretlenir. */
  it('kapsamı TANIMSIZ eski anahtar çalışır ama işaretlenir', () => {
    for (const uc of UC_KIMLIKLERI) {
      const k = ucaErisim({ kapsamJson: null, saltOkunur: false, uc });
      expect(k).toEqual({ izin: true, miras: true });
    }
  });

  it('kapsamı tanımsız AMA salt okunur anahtar yine de yazamaz', () => {
    const k = ucaErisim({ kapsamJson: null, saltOkunur: true, uc: yazmaUcu });
    expect(k.izin).toBe(false);
  });
});

describe('kapsamKapisi — yeni anahtar kapsamsız açılamaz', () => {
  it('boş kapsam reddedilir', () => {
    const k = kapsamKapisi({ uclar: [], saltOkunur: true });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toMatch(/en az bir uç/i);
  });

  it('tanınmayan uç reddedilir', () => {
    const k = kapsamKapisi({ uclar: ['facilities', 'hayali'], saltOkunur: true });
    expect(k.ok).toBe(false);
  });

  it('salt okunur + yazma ucu ÇELİŞKİSİ üretim anında kesilir', () => {
    const k = kapsamKapisi({ uclar: [YAZMA_UCLARI[0]], saltOkunur: true });
    expect(k.ok).toBe(false);
    if (k.ok) return;
    expect(k.sebep).toContain(YAZMA_UCLARI[0]);
  });

  it('aynı kapsam her zaman AYNI metni üretir (iz kirlenmesin)', () => {
    const a = kapsamKapisi({ uclar: ['assets', 'facilities', 'facilities'], saltOkunur: true });
    const b = kapsamKapisi({ uclar: ['facilities', 'assets'], saltOkunur: true });
    expect(a.ok && b.ok && a.kapsamJson === b.kapsamJson).toBe(true);
  });
});

describe('anahtarOzeti — kusur sayımı', () => {
  it('kapsamsız ETKİN anahtar kusurdur; pasif olan sayılmaz', () => {
    const o = anahtarOzeti([
      { kapsamJson: null, saltOkunur: true, pasif: false },
      { kapsamJson: null, saltOkunur: true, pasif: true },
      { kapsamJson: '["facilities"]', saltOkunur: true, pasif: false },
      { kapsamJson: '["assets.upsert"]', saltOkunur: false, pasif: false },
    ]);
    expect(o.toplam).toBe(4);
    expect(o.kapsamsiz).toBe(1);
    expect(o.pasif).toBe(1);
    expect(o.saltOkunur).toBe(2);
    expect(o.yazabilen).toBe(1);
    expect(anahtarCumlesi(o)).toMatch(/KAPSAMI TANIMSIZ/);
  });

  it('anahtar yoksa cümle bunu söyler', () => {
    expect(anahtarCumlesi(anahtarOzeti([]))).toMatch(/yok/i);
  });
});

describe('OpenAPI sözleşmesi ÜRÜNDEN türetilir', () => {
  const belge = openapiBelgesi() as {
    openapi: string; servers?: unknown;
    paths: Record<string, Record<string, { requestBody?: unknown }>>;
  };

  it('uç kütüğünün TAMAMI belgede', () => {
    expect(Object.keys(belge.paths).sort())
      .toEqual(UC_KIMLIKLERI.map((u) => UC_YOLU[u]).sort());
  });

  it('yazma uçları POST, okuma uçları GET', () => {
    for (const uc of UC_KIMLIKLERI) {
      const yontem = yazmaUcuMu(uc) ? 'post' : 'get';
      expect(Object.keys(belge.paths[UC_YOLU[uc]])).toEqual([yontem]);
    }
  });

  /* Örnek bir taban adres, üretilen her istemciye yanlış bir adres
     koymak olurdu; kimse değiştirmez ve ilk çağrı başka yere gider. */
  it('`servers` alanı YOKTUR', () => {
    expect(belge.servers).toBeUndefined();
    expect(JSON.stringify(belge)).not.toMatch(/https?:\/\/(?!json-schema)/);
  });

  it('yazma uçlarının gövde şeması ÜRÜNÜN zod şemasından gelir', () => {
    for (const uc of YAZMA_UCLARI) {
      const govde = belge.paths[UC_YOLU[uc]].post.requestBody as {
        content: { 'application/json': { schema: { properties: { records: unknown } } } };
      };
      // `records` zarfı gerçekten şemadan çıkmış olmalı — elle yazılmamış.
      expect(govde.content['application/json'].schema.properties.records).toBeTruthy();
    }
  });

  it('OpenAPI 3.1 ve bearer güvenlik şeması bildirilir', () => {
    expect(belge.openapi).toBe('3.1.0');
    expect(JSON.stringify(belge)).toContain('bearerAuth');
  });
});

/* ═══ R0-9 · SÖZLEŞME ARTEFAKTI ile EKRAN ETİKETİ AYRI ═══════════════════
   `UC_ETIKETI` OpenAPI belgesinin `summary` alanına gider: entegratörün
   okuduğu sözleşmedir ve kiracıya göre DEĞİŞMEMELİ. Ekranda gösterilen
   etiket ise kiracının sözcüğünü izlemeli. Aynı sabitin iki işi görmesi
   ikisinden birini yanlış yapardı. */
describe('R0-9 · uç etiketi: sözleşme çekirdekte, ekran sözlükte', () => {
  const enerji = sozlukKur(ENERJI_SOZLUGU);
  const su = sozlukKur(SU_SOZLUGU);

  it('SÖZLEŞME etiketi sözlükten BAĞIMSIZDIR', () => {
    /* Sabit olduğu için sözlük parametresi bile almıyor; vaka, ileride
       birinin onu sözlüğe bağlamasına karşı duruyor. */
    expect(UC_ETIKETI.facilities).toBe('Tesisler (okuma)');
    expect(JSON.stringify(openapiBelgesi())).toContain('Tesisler (okuma)');
  });

  it('EKRAN etiketi sözlüğü izler', () => {
    expect(ucEtiketi(null, 'facilities')).toBe('Tesisler (okuma)');
    expect(ucEtiketi(enerji, 'facilities')).toBe('Santraller (okuma)');
    expect(ucEtiketi(su, 'facilities')).toBe('Arıtma tesisleri (okuma)');
  });

  it('terim taşımayan uçlar iki hâlde de aynıdır', () => {
    for (const uc of ['evidence', 'vulnerabilities', 'integration-runs'] as const) {
      expect(ucEtiketi(su, uc)).toBe(UC_ETIKETI[uc]);
    }
  });

  it('uç KİMLİĞİ hiçbir sözlükte çevrilmez — kapsam dizesi anahtarda saklanır', () => {
    expect(UC_KIMLIKLERI).toContain('facilities');
    for (const uc of UC_KIMLIKLERI) expect(uc).toMatch(/^[a-z.-]+$/);
  });
});
