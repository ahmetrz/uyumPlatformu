import { describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  HEDEF_TURLERI, bagHedefleri, kaynakDosyalari, kokYol, rotaCozulur, rotaDesenleri,
} from '../../arac/rota-agaci.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   ÖLÜ BAĞ BEKÇİSİ — ekranın gösterdiği çıkış GERÇEK OLMALI [SIS-BAG-001]

   ── NEDEN BU DOSYA VAR ────────────────────────────────────────────────
   ÖLÇÜLDÜ (bağımsız inceleme, Brief L · tur 1): R0-21 kapatılırken on iki
   bölüm notuna "çıkış" eklendi ve bunların ÜÇÜ olmayan bir rotaya
   gidiyordu. Kodun yanındaki yorum "kullanıcıyı çözüme götürür" diyordu;
   kullanıcı 404 görüyordu. Bu, R-G'nin kendi kendini yiyen hâlidir:
   "eylemsiz boş durum yasak" kuralı, eylemi OLMAYAN bir boşluğa SAHTE
   eylem uydurma baskısı yaratır.

   Düzeltme turunda AYNI SINIF BİR KEZ DAHA çıktı: `saglik/Cekmeceler.tsx`
   içindeki `/isler` bağı — böyle bir rota yok.

   ── DÜZELTME TURUNDA ÜÇ KUSURU GİDERİLDİ ──────────────────────────────
   1. POPÜLASYON LİSTEDEN GELİYORDU. İlk yazım `arac/rotalar.json`u
      okuyordu; o dosya ÜRETİLMİŞtir ve üreticisi kör kalırsa bekçi
      olmayan bir rotayı "var" sayar. Bugün küme `app/` AĞACINDAN
      türetilir: her `page.tsx` bir rota, `(grup)` düşer, `[id]` desen
      olarak kalır.
   2. ÇÖZÜMLEYİCİ GEVŞEKTİ. Herhangi bir ÜST yolun bulunması yeterliydi:
      `/tesisler/cm1/olmayan/derin` üç seviyelik uydurma bir yol olduğu
      hâlde `/tesisler` üstü yüzünden ÇÖZÜLÜYORDU. Bugün eşleşme segment
      segmenttir ve SEGMENT SAYISI uyuşmalıdır.
   3. KAPSAM DARDI. Yalnız `href="..."` taranıyordu; `router.push`,
      `redirect`, `revalidatePath` ve şablon dizeli `href={...}` ölçümün
      dışındaydı; tarama da yalnız `app` + `components` içindeydi ve
      `revalidatePath` çağrılarının 272'si `lib`de yaşıyor. Ölçüldü:
      kapsam beş hedef türüne ve üç köke çıkınca taranan bağ sayısı
      20'den 423'e yükseldi ve DÖRT ölü hedef daha çıktı —
      `revalidatePath('/maddeler')`, olmayan bir rotayı tazeleyen sessiz
      bir no-op.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = path.resolve(__dirname, '../..');
const DESENLER = rotaDesenleri(KOK);
const KAYNAKLAR = kaynakDosyalari(KOK);

describe('ÖLÜ BAĞ YOKTUR [SIS-BAG-001]', () => {
  it('POPÜLASYON AĞAÇTAN gelir ve BOŞ DEĞİL [SIS-BAG-001]', () => {
    /* Sıfır desen bulan bir bekçi, sıfır ölü bağ bulur. */
    expect(DESENLER.size, 'app/ ağacından rota deseni çıkmadı').toBeGreaterThan(50);
    expect(KAYNAKLAR.length, 'kaynak dosyası bulunamadı').toBeGreaterThan(100);
    /* Ağaç GERÇEKTEN ağaç: dinamik desen taşımayan bir küme, dizin
       adlarını düz okumuş demektir. */
    expect([...DESENLER].filter((d) => d.includes('[')).length,
      'dinamik rota deseni hiç yok — ağaç okunmamış').toBeGreaterThanOrEqual(3);
    /* Rota GRUBU segmenti yola SIZMAZ. */
    expect([...DESENLER].filter((d) => d.includes('(')), 'rota grubu yola sızdı')
      .toEqual([]);
  });

  it('BEŞ HEDEF TÜRÜ de taranıyor — kapsam beyanlı [SIS-BAG-001]', () => {
    expect(HEDEF_TURLERI).toEqual([
      'href-duz', 'href-ifade', 'router-push', 'redirect', 'revalidate',
    ]);
    /* Her türün kaynakta GERÇEKTEN eşleştiği ölçülür: listede duran ama
       hiç eşleşmeyen bir tür, kapsamı olduğundan geniş gösterirdi. */
    const sayim: Record<string, number> = {};
    for (const { kod } of KAYNAKLAR) {
      for (const b of bagHedefleri(kod)) sayim[b.tur] = (sayim[b.tur] ?? 0) + 1;
    }
    const bos = HEDEF_TURLERI.filter((t) => !sayim[t]);
    expect(bos, `beyan edilen ama hiç eşleşmeyen hedef türü: ${bos.join(', ')}`)
      .toEqual([]);
  });

  it('İÇ BAĞLARIN HEPSİ gerçek bir rota desenine çözülür [SIS-BAG-001]', () => {
    const olu: string[] = [];
    let sayilan = 0;
    for (const { yer, kod } of KAYNAKLAR) {
      for (const b of bagHedefleri(kod)) {
        sayilan += 1;
        if (!rotaCozulur(b.yol, DESENLER)) olu.push(`${yer} → ${b.ham}  [${b.tur}]`);
      }
    }
    /* Sayım da yazılır: sıfır bağ tarayan bir diş, sıfır ölü bağ bulur. */
    expect(sayilan, 'hiç iç bağ bulunamadı — tarama kalıbı bozuk')
      .toBeGreaterThan(400);
    expect(olu, `OLMAYAN rotaya giden bağ:\n  ${olu.join('\n  ')}`).toEqual([]);
  });
});

/* ═══ KURALIN KENDİSİ · SENTETİK VAKALAR ═════════════════════════════
   Karar saf bir fonksiyondadır ve sentetik desenlerle sınanır — sabotaj
   kuralı sabote eder, ölçüm ortamını değil. */

describe('ÇÖZÜMLEYİCİ SAFTIR ve kaçamak DEĞİL [SIS-BAG-001]', () => {
  const D = new Set(['/', '/envanter', '/tesisler', '/tesisler/[id]',
    '/raporlar/karne', '/belge/[...yol]']);

  it('DÜZ ve SORGULU rota çözülür [SIS-BAG-001]', () => {
    expect(rotaCozulur('/envanter', D)).toBe(true);
    expect(rotaCozulur('/envanter?sec=abc', D)).toBe(true);
    expect(rotaCozulur('/envanter#bolum', D)).toBe(true);
    expect(rotaCozulur('/', D)).toBe(true);
  });

  it('DİNAMİK segment TEK seviye yer [SIS-BAG-001]', () => {
    expect(rotaCozulur('/tesisler/cm123', D)).toBe(true);
    /* ── ESKİ KUSURUN VAKASI ──────────────────────────────────────────
       İlk yazım "herhangi bir üst yol varsa çözülür" diyordu ve bu yol
       ÇÖZÜLÜYORDU. Üç seviyelik uydurma bir yol artık KIRMIZI. */
    expect(rotaCozulur('/tesisler/cm123/olmayan/derin', D),
      'üst yola yaslanan gevşek eşleşme geri geldi').toBe(false);
    expect(rotaCozulur('/tesisler/cm123/uydurma', D)).toBe(false);
  });

  it('YAKALAYICI desen kalan segmentleri yer; ZORUNLU olan çıplak üst yolu YEMEZ [SIS-BAG-001]', () => {
    /* ── ÖLÇÜLEN KUSUR (düzeltme turu · tur 2 · P3-12) ────────────────
       İlk yazım `/belge`yi ÇÖZÜLÜR sayıyordu ve TEST BUNU KİLİTLİYORDU.
       Next.js'te `[...yol]` en az bir segment ister: `/belge` o desenle
       eşleşmez ve o bağ ÖLÜDÜR. Yanlışı kilitleyen bir vaka, kuralı
       düzeltmeyi kırmızı gösterir — kapının en sinsi hâli budur. */
    expect(rotaCozulur('/belge/a/b/c', D)).toBe(true);
    expect(rotaCozulur('/belge', D),
      'ZORUNLU yakalayıcı çıplak üst yolu yedi — ölü bağ canlı sayılır').toBe(false);
    /* İSTEĞE BAĞLI yakalayıcı (`[[...]]`) sıfır segmenti KABUL eder. */
    const O = new Set(['/arsiv/[[...yol]]']);
    expect(rotaCozulur('/arsiv', O)).toBe(true);
    expect(rotaCozulur('/arsiv/2024/ocak', O)).toBe(true);
    /* Bugün ağaçta yakalayıcı desen YOK (ölçüldü: 65 desen, 0 yakalayıcı);
       vakalar kuralın kendisini ölçer, depoyu değil. */
    expect([...DESENLER].filter((d) => d.includes('[...') || d.includes('[[...')).length,
      'ağaca yakalayıcı desen eklendi — yorumdaki ölçüm bayatladı').toBe(0);
  });

  it('OLMAYAN rota ÇÖZÜLMEZ [SIS-BAG-001]', () => {
    expect(rotaCozulur('/entegrasyonlar', D)).toBe(false);
    expect(rotaCozulur('/varliklar/cm123', D)).toBe(false);
    expect(rotaCozulur('/isler', D)).toBe(false);
    /* Boş küme HİÇBİR ŞEYİ çözmez — bekçi sessizce yeşile dönemez. */
    expect(rotaCozulur('/envanter', new Set())).toBe(false);
  });

  it('ŞABLON İFADESİ bir segmenttir — şekil ölçülür [SIS-BAG-001]', () => {
    const [b] = bagHedefleri('<Link href={`/tesisler/${t.id}`}>x</Link>');
    expect(b.tur).toBe('href-ifade');
    expect(rotaCozulur(b.yol, D), 'şablon bağ çözülmedi').toBe(true);
    const [k] = bagHedefleri('<Link href={`/uydurma/${t.id}`}>x</Link>');
    expect(rotaCozulur(k.yol, D), 'uydurma şablon bağ çözüldü').toBe(false);
  });

  it('YORUMDAKİ yol bir bağ DEĞİLDİR [SIS-BAG-001]', () => {
    expect(bagHedefleri('/* eskiden href="/olmayan" idi */')).toEqual([]);
    expect(bagHedefleri('// href="/olmayan"')).toEqual([]);
  });

  it('KÖK YOL normalleşir [SIS-BAG-001]', () => {
    expect(kokYol('/x/?a=1#b')).toBe('/x');
    expect(kokYol('/')).toBe('/');
    expect(kokYol('///')).toBe('/');
  });
});
