import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

/* "bilinmiyor → false" kuralı.

   ── Neden bir kural gerekiyor ──────────────────────────────────────────
   Şemada `Boolean?` olan her alan ÜÇ DEĞERLİDİR ve bu bilinçlidir:
   `true` = ölçüldü, evet · `false` = ölçüldü, hayır · `null` = HİÇ
   ÖLÇÜLMEDİ. Üçüncüsünü ikinciye indirgemek, kimsenin bakmadığı bir
   kontrolü "bakıldı ve olumsuz" diye kayda geçirir — uydurma veridir ve
   denetimde tam tersi yönde yanıltır.

   Bu tam olarak bir kez oldu: `/operasyon` değişiklik formu OT emniyet
   kapılarını (`saglayiciOnayi`, `onDegisiklikYedegi`) `?? false` ile
   yüklüyordu. Sunucu üç değeri doğru saklıyordu, `mantik.ts` üçünü doğru
   ayırıyordu; kaybı yapan tek yer formdu. Kapı `=== true` istediği için
   davranış değişmiyordu — değişen şey, hiç sorulmamış bir alanın
   "sorulmuş ve olumsuz" görünmesiydi. Sessiz olduğu için de aylarca
   fark edilmeyebilirdi.

   ── Kuralın kapsamı ────────────────────────────────────────────────────
   Alan listesi ŞEMADAN türetilir: yarın eklenen bir `Boolean?` alan
   kendiliğinden korunur. Kural, yeni yazılan kodun aynı tuzağa düşmesini
   engellemek içindir; çalışma zamanında gözlemlenemez, bu yüzden dosya
   içeriğine bakar. */

const WEB = path.resolve('.');
const KOK = path.resolve('..');

/** Şemadaki her `Boolean?` alanın adı. */
function ucDegerliAlanlar(): string[] {
  const sema = readFileSync(path.join(WEB, 'prisma', 'schema.prisma'), 'utf8');
  const adlar = new Set<string>();
  for (const satir of sema.split('\n')) {
    const m = /^\s+([a-zA-Z][a-zA-Z0-9]*)\s+Boolean\?/.exec(satir);
    if (m) adlar.add(m[1]);
  }
  return [...adlar].sort();
}

function kaynakDosyalari(): string[] {
  const cikti: string[] = [];
  const gez = (d: string) => {
    for (const ad of readdirSync(d)) {
      if (ad === 'node_modules' || ad === '.next' || ad === 'prisma-client') continue;
      const tam = path.join(d, ad);
      if (statSync(tam).isDirectory()) gez(tam);
      else if (/\.tsx?$/.test(tam) && !tam.endsWith('.d.ts')) cikti.push(tam);
    }
  };
  for (const kok of ['app', 'lib', 'components']) gez(path.join(WEB, kok));
  return cikti;
}

describe('Üç değerli alan iki değere indirgenmez', () => {
  it('şemada gerçekten üç değerli alanlar var (kural boşa koşmuyor)', () => {
    const alanlar = ucDegerliAlanlar();
    expect(alanlar.length).toBeGreaterThan(5);
    // Kusurun yaşandığı iki alan listede olmalı; olmazsa kural yanlış türetiyor.
    expect(alanlar).toContain('saglayiciOnayi');
    expect(alanlar).toContain('mfaVar');
  });

  it('hiçbir kaynak dosyada `<üçDeğerliAlan> ?? false` benzeri indirgeme yok', () => {
    const alanlar = ucDegerliAlanlar();
    const kalip = new RegExp(
      `\\b(${alanlar.join('|')})\\s*(?:\\?\\?|\\|\\|)\\s*(?:false|true|0)\\b`,
    );
    const suclular: string[] = [];
    for (const dosya of kaynakDosyalari()) {
      const bagil = path.relative(KOK, dosya);
      readFileSync(dosya, 'utf8').split('\n').forEach((satir, i) => {
        if (kalip.test(satir)) suclular.push(`${bagil}:${i + 1} → ${satir.trim().slice(0, 100)}`);
      });
    }
    expect(
      suclular,
      '`null` = HİÇ ÖLÇÜLMEDİ. `?? false` yazmak, kimsenin bakmadığı bir kontrolü '
      + '"bakıldı ve olumsuz" diye kayda geçirir. Üç hâli de taşıyın (ör. '
      + "app/(atlas)/(operasyonel)/operasyon/Formlar.tsx içindeki ucDegerMetni/ucDegerCoz).",
    ).toEqual([]);
  });

  it('OT emniyet kapıları `null` ile `false` arasını AYIRIYOR', async () => {
    /* Kuralın davranışsal ayağı: gösterim katmanı üç hâli ayrı okumalı.
       İkisi de kapıyı geçmez ama ekranda ve denetimde ayrı görünür. */
    const { kapilar } = await import('@/app/(atlas)/(operasyonel)/operasyon/mantik');
    const temel = {
      id: 'x', kod: 'DEG-1', baslik: 'test', durum: 'taslak', otMu: true,
      bakimPenceresi: null, geriAlmaPlani: null, uretimEtkisi: null,
      onDegisiklikYedegi: null, planTarihi: null, tesis: null, varlikEtiketi: null,
      aciklama: null, talepEden: null, onaylayan: null, uygulayan: null,
    } as unknown as Parameters<typeof kapilar>[0];

    const bilinmiyor = kapilar({ ...temel, saglayiciOnayi: null })[0];
    const hayir = kapilar({ ...temel, saglayiciOnayi: false })[0];
    const evet = kapilar({ ...temel, saglayiciOnayi: true })[0];

    expect(bilinmiyor.tamam).toBe(false);
    expect(hayir.tamam).toBe(false);
    expect(evet.tamam).toBe(true);
    // Asıl ayrım burada: "ölçülmedi" bir DEĞER taşımaz, "hayır" taşır.
    expect(bilinmiyor.deger).toBeNull();
    expect(hayir.deger).toBe('alınmadı');
    expect(evet.deger).toBe('alındı');
  });
});
