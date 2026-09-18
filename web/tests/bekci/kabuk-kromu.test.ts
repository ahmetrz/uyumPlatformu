import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · KABUK KROMU — BAŞLIK VE AYAK (URN-KBK-022)

   Kabuk kromu ürünün her ekranında durur: 56px başlık, 32px ayak. Bir
   kusuru orada bırakmak, onu 49 rotanın hepsine bırakmaktır.

   ── ÖLÇÜLEN · 18 Eylül 2026 ───────────────────────────────────────────
   1 · MARKA İLE GEZİNME AYNI KADEMEDE YARIŞIYORDU. İkisi de
       `--t-baslik` (16px); tek fark ağırlıktı (700 / 500). 56px'lik bir
       barda altı eşit ağırlıklı tipografik nesne vardı ve hiçbiri öne
       çıkmıyordu. Sekme bir kademe indi (13px / 600); marka barın TEK
       16px nesnesi oldu.

   2 · AYAK TELİFİ KİRACI ADINI KODA GÖMMÜŞTÜ — `© 2026 Demo Enerji`
       düz dizgeydi. Başlık kiracı adını yapılandırmadan okuyordu
       (`veri.kiraciAd`), ayak okumuyordu: su kiracısı
       `NEXT_PUBLIC_KIRACI_AD="Şehir Su"` verip kurduğunda başlıkta
       "ŞEHİR SU", ayakta "Demo Enerji" yazıyordu. Üstelik "Enerji"
       ÇEKİRDEK bir kabuk bileşeninde duran bir SEKTÖR sözcüğüydü
       (sektör bağımsızlık kuralı) ve yıl da sabitti.

       Marka kapısı bunu GÖREMİYORDU: nöbetçi adla yalnız `MARKA_AD`
       sızıntısını ölçüyordu. O kapıya ikinci ad dişi eklendi
       (`arac/marka-kapisi.mjs`); bu bekçi ise aynı kusuru KAYNAKTA ve
       derleme beklemeden yakalar.

   3 · TELİF BAĞ KÜMESİNİN İÇİNE DÜŞÜYORDU. `nav { margin-left: auto }`
       telifi dört bağın sağına itiyordu; telif bir KÜNYE satırıdır,
       gezinme değil. Bugün kimlik kümesi (künye · sürüm · telif) solda,
       gezinme kümesi sağda.

   ── DİŞLER ────────────────────────────────────────────────────────────
   1 · Marka kademesi gezinme kademesinden KESİNLİKLE büyük.
   2 · Aktif sekme ÜÇ ipucu taşır (mürekkep · zemin · bakır alt çizgi) —
       durum yalnız renkle anlatılmaz.
   3 · Kabuk bileşenlerinde kiracı adı DÜZ DİZGE olarak geçmez.
   4 · Ayakta kimlik kümesi gezinme kümesinden ÖNCE gelir.
   5 · Telif satırı kiracı adını ve yılı HESAPLAR, sabit yazmaz.
   ═══════════════════════════════════════════════════════════════════════ */

const WEB = join(__dirname, '..', '..');
const CSS = readFileSync(join(WEB, 'app', 'kabuk.css'), 'utf8');
const KABUK = readFileSync(join(WEB, 'components', 'kabuk', 'Kabuk.tsx'), 'utf8');
const MARKA = readFileSync(join(WEB, 'lib', 'marka.ts'), 'utf8');

/** `:root` içindeki `--t-*` jetonları (px). */
const JETON: Record<string, number> = (() => {
  const j: Record<string, number> = {};
  for (const m of CSS.matchAll(/(--t-[a-z-]+):\s*([\d.]+)px/g)) j[m[1]] = Number(m[2]);
  return j;
})();

/** Bir seçicinin gövdesindeki `font-size` jetonunun px değeri. */
function boy(secici: string): number | null {
  const bas = CSS.indexOf(`\n${secici} {`);
  if (bas < 0) return null;
  const govde = CSS.slice(bas, CSS.indexOf('}', bas));
  const m = /font-size:\s*var\((--t-[a-z-]+)\)/.exec(govde);
  return m ? (JETON[m[1]] ?? null) : null;
}

/** `Ayak()` bileşeninin gövdesi — yorumsuz. */
function ayakGovdesi(): string {
  const bas = KABUK.indexOf('function Ayak(');
  expect(bas, 'Ayak bileşeni bulunamadı').toBeGreaterThan(-1);
  const son = KABUK.indexOf('\n}', bas);
  return KABUK.slice(bas, son).replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

describe('bekçi · kabuk kromu', () => {
  it('BİRİNCİ DİŞ · marka kademesi gezinmeden büyük [URN-KBK-022]', () => {
    const marka = boy('.ab-ust .marka');
    const sekme = boy('.ab-ust > nav a');
    expect(marka, '.ab-ust .marka boyu okunamadı — seçici değişmiş').not.toBeNull();
    expect(sekme, '.ab-ust > nav a boyu okunamadı — seçici değişmiş').not.toBeNull();
    expect(sekme!, 'Sekme marka ile AYNI ya da daha büyük kademede: barda hiyerarşi yok')
      .toBeLessThan(marka!);
  });

  it('İKİNCİ DİŞ · aktif sekme üç ipucu taşır [URN-KBK-022]', () => {
    const bas = CSS.indexOf(".ab-ust > nav a[aria-current='page'] {");
    expect(bas, 'aktif sekme kuralı bulunamadı').toBeGreaterThan(-1);
    const govde = CSS.slice(bas, CSS.indexOf('}', bas));
    /* Durum YALNIZ renkle anlatılmaz: renk + zemin + kenar. */
    for (const ipucu of ['color:', 'background:', 'border-bottom-color:']) {
      expect(govde, `aktif sekme ${ipucu} taşımıyor`).toContain(ipucu);
    }
  });

  it('ÜÇÜNCÜ DİŞ · kiracı adı kabuk bileşenine gömülmez [URN-KBK-022]', () => {
    const m = /export const KIRACI_AD = [^|]*\|\| '([^']+)'/.exec(MARKA);
    expect(m, 'lib/marka.ts içinde KIRACI_AD varsayılanı bulunamadı').not.toBeNull();
    const varsayilan = m![1];
    /* Yorumlar gerekçeyi anlatırken adı ANABİLİR; ölçüm koddadır. */
    const kod = KABUK.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    expect(kod, `"${varsayilan}" kabuk bileşenine DÜZ DİZGE olarak gömülmüş; `
      + 'kiracı adı yapılandırmadan gelir (`veri.kiraciAd`)').not.toContain(varsayilan);
  });

  it('DÖRDÜNCÜ DİŞ · ayakta kimlik kümesi gezinmeden önce [URN-KBK-022]', () => {
    const g = ayakGovdesi();
    const telif = g.indexOf('className="telif"');
    const gezinme = g.indexOf('<nav aria-label="Ayak bağları"');
    expect(telif, 'ayak telif satırı yok').toBeGreaterThan(-1);
    expect(gezinme, 'ayak gezinme kümesi yok').toBeGreaterThan(-1);
    expect(telif, 'Telif bağ kümesinin ARDINDA: künye satırı gezinme gibi okunur')
      .toBeLessThan(gezinme);
  });

  it('BEŞİNCİ DİŞ · telif kiracıdan ve takvimden gelir [URN-KBK-022]', () => {
    const g = ayakGovdesi();
    const satir = /<span className="telif">([\s\S]*?)<\/span>/.exec(g)?.[1] ?? '';
    expect(satir, 'telif satırı okunamadı').not.toBe('');
    expect(satir, 'Telif kiracı adını yapılandırmadan okumuyor').toContain('veri.kiraciAd');
    expect(satir, 'Telif yılı SABİT yazılmış; bir sonraki yıl ürün bayat tarih gösterir')
      .toMatch(/getFullYear\(\)/);
  });
});
