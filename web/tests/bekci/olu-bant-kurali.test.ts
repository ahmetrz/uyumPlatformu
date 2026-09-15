import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { tabanKarari, tabanOku } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · ÖLÜ DAR BANT KURALI (URN-KBK-020)

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Mobil audit (11 Eylül 2026, 375×812) kabuk CSS'inde İKİ ölü bildirim
   ölçtü. İkisi de doğru yazılmış, doğru banda konmuş ve HİÇ
   UYGULANMAMIŞ kurallardı:

     · `@media (max-width: 620px) { .ab-hesap-dugme .kisi { display: none } }`
       — hesaplanan değer 375px'te `flex`. Aynı seçicinin MEDYASIZ temel
       kuralı CSS'te daha sonra geliyor, özgüllük eşit (0,2,0) ve
       eşitlikte SIRA kazanır. Kural yazıldığı günden beri telefonda
       61px'i boşuna tutuyordu.
     · `@media (max-width: 620px) { .ab-ust .marka { font-size: 15px } }`
       — ölçülen 14px. `max-width: 700px` bloğu daha sonra gelip 14px
       yazıyor ve 620 ≤ 700 olduğu için DAR bantta o da uygulanıyor.
       Ölü olmasının yanında TERSTİ: dar bantta daha BÜYÜK punto.

   Bu sınıf gözle yakalanmaz ve hiçbir kapı görmezdi: CSS geçerli, kural
   okunaklı, gerekçesi yazılı. Ekranda yanlış bir şey YOKTUR — yalnız
   yazılan iyileştirme hiç olmamıştır. "Hiçbir şey ölçmeden yeşil yanan
   kapı" sınıfının CSS'teki karşılığı budur.

   ── KURAL ─────────────────────────────────────────────────────────────
   Bir `@media (max-width: A)` bloğundaki bildirim ÖLÜDÜR, eğer CSS'te
   DAHA SONRA gelen bir kural
     · AYNI seçici metnini ve AYNI özelliği taşıyorsa, ve
     · dar bantta HER ZAMAN uygulanıyorsa — yani medyasızsa ya da
       `max-width: B` ile B ≥ A ise (genişlik ≤ A ise ≤ B de doğrudur).

   Seçici METNİ aynı olduğu için özgüllük de aynıdır; eşitlikte sonraki
   kazanır. Kural bu yüzden SAĞLAMDIR — özgüllük hesabı gerektirmez ve
   yanlış alarm veremez: daha DAR bir sonraki blok (B < A) ya da farklı
   bir seçici, dişin önüne hiç gelmez.

   ── DİŞLER ────────────────────────────────────────────────────────────
   (a) ÖLÇÜM TABANI: tarama en az N dar bant bloğu ve N bildirim
       görmeli — sıfır ölçümle "ölü kural yok" demek, hiçbir şeye
       bakmadan temiz raporlamaktır.
   (b) ÖLÜ BİLDİRİM SAYISI SIFIR. Gerekçeli istisna YOKTUR: ölü bir
       kuralın gerekçesi olamaz, çünkü kural hiç çalışmıyor — "neden
       kusur değil" sorusunun cevabı ancak "sil" olabilir.
   ═══════════════════════════════════════════════════════════════════════ */

const css = readFileSync('app/kabuk.css', 'utf8');

type Kural = { secici: string; ozellik: string; bant: number | null; sira: number };

/** `@media` koşulundan `max-width` değerini okur; yoksa (ya da min-width
    taşıyorsa) `null` — "her zaman uygulanır" SAYILMAZ. */
function maxGenislik(kosul: string): number | null {
  if (/min-width/.test(kosul)) return null;
  const m = kosul.match(/max-width:\s*(\d+)px/);
  return m ? Number(m[1]) : null;
}

/** CSS'i sırayla gezer; her bildirimi (seçici + özellik) kaydeder.
    Medya bloğu içindekiler bandıyla, dışındakiler `bant: Infinity` ile —
    medyasız kural her genişlikte uygulanır. */
function kurallar(): { icinde: (Kural & { bant: number })[]; hepsi: Kural[] } {
  const hepsi: Kural[] = [];
  const icinde: (Kural & { bant: number })[] = [];
  /* Medya bloklarını kendi koşullarıyla çıkar; kalan metin medyasızdır.
     Yerlerine aynı uzunlukta boşluk konur ki `sira` (karakter konumu)
     iki geçişte de AYNI eksende kalsın — kaydırılmış bir eksen,
     "önce/sonra" kararını sessizce tersine çevirirdi. */
  const medyasiz = css.replace(/@media([^{]*)\{((?:[^{}]|\{[^{}]*\})*)\}/g, (tam, kosul: string, govde: string, konum: number) => {
    const bant = maxGenislik(kosul);
    if (bant !== null) {
      /* Blok gövdesinin İÇİNDEKİ kuralların konumu, gövdenin dosyadaki
         gerçek başlangıcına göre hesaplanır. */
      const govdeBasi = konum + tam.indexOf('{', kosul.length) + 1;
      for (const k of govdedenKurallar(govde, govdeBasi)) {
        icinde.push({ ...k, bant });
        hepsi.push({ ...k, bant });
      }
    } else {
      /* min-width taşıyan blok dar bantta uygulanmayabilir; ezici
         SAYILMAZ ve kendi bildirimleri de dişe girmez. */
    }
    return ' '.repeat(tam.length);
  });
  for (const k of govdedenKurallar(medyasiz, 0)) hepsi.push({ ...k, bant: Infinity });
  hepsi.sort((a, b) => a.sira - b.sira);
  return { icinde, hepsi };
}

/** Bir CSS gövdesindeki `seçici { bildirimler }` çiftlerini ayrıştırır. */
function govdedenKurallar(metin: string, ofset: number): Kural[] {
  const cikti: Kural[] = [];
  const kalip = /([^{}@;]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = kalip.exec(metin)) !== null) {
    const secici = m[1].replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/\s+/g, ' ');
    if (!secici || secici.startsWith('@')) continue;
    for (const bildirim of m[2].split(';')) {
      const i = bildirim.indexOf(':');
      if (i < 0) continue;
      const ozellik = bildirim.slice(0, i).replace(/\/\*[\s\S]*?\*\//g, '').trim().toLowerCase();
      if (!ozellik || ozellik.startsWith('--')) continue;
      cikti.push({ secici, ozellik, bant: null, sira: ofset + m.index });
    }
  }
  return cikti;
}

/** Dar bant bildirimini ezen SONRAKİ kural (varsa). */
function ezen(k: Kural & { bant: number }, hepsi: Kural[]): Kural | null {
  return hepsi.find((o) => o.sira > k.sira
    && o.secici === k.secici && o.ozellik === k.ozellik
    && (o.bant === Infinity || (o.bant ?? 0) >= k.bant)) ?? null;
}

const { icinde, hepsi } = kurallar();
const oluler = icinde
  .map((k) => ({ k, o: ezen(k, hepsi) }))
  .filter((x) => x.o !== null)
  .map((x) => `@media(max-width:${x.k.bant}px) ${x.k.secici} { ${x.k.ozellik} } `
    + `→ sonraki kural eziyor: ${x.o!.secici} @${x.o!.bant === Infinity ? 'medyasız' : `max-width:${x.o!.bant}px`}`);

describe('bekçi · ölü dar bant kuralı [URN-KBK-020]', () => {
  it('ÖLÇÜM TABANI — tarama gerçekten bildirim görüyor [SIS-KBK-020]', () => {
    const hata = tabanKarari('kabuk.darBantBildirimi', icinde.length, tabanOku().tabanlar);
    expect(hata, String(hata)).toBeNull();
    /* Ayrıştırıcı medyasız kuralları da görmeli: dar bant bildirimi
       toplamın ALT kümesidir, eşit olması taramanın yarısının kör
       olduğunu söyler. */
    expect(hepsi.length).toBeGreaterThan(icinde.length);
  });

  it('ÖLÜ BİLDİRİM SIFIR — yazılan iyileştirme uygulanıyor [SIS-KBK-021]', () => {
    expect(oluler, `ölü dar bant bildirimi:\n  · ${oluler.join('\n  · ')}`).toEqual([]);
  });
});
