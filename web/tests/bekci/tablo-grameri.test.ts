import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { tabanDogrula } from '../../arac/olcum-tabani.mjs';

/* ═══════════════════════════════════════════════════════════════════════
   BEKÇİ · KÜTÜK GRAMERİ TEK YERDEN ÇIKAR (URN-TBL-001)

   ── ÖLÇÜLEN ─────────────────────────────────────────────────────────
   18 Eylül 2026, `app` + `components` taranarak:

     <Tablo>        46 dosya          <VeriTablosu>   7 dosya
     <Matris>        3 dosya          ham <table>     6 bildirim

   İlk bakışta "İKİ tablo bileşeni var, 48 ekran birinde 6 ekran
   öbüründe" gibi göründü ve göç planlanacaktı. Kaynağı okuyunca
   dayanaksız çıktı: `Tablo` bir RAKİP DEĞİL, `VeriTablosu` üzerine
   SARMALAYICIDIR — eski satır biçimini (`hucreler[]`) kolon biçimine
   (`VtKolon[]`) çevirir ve çizimi ona bırakır. Çizen tek bir yol var;
   48 ekranı "göç ettirmek" aynı yolu ikinci kez çağırmak olurdu.

   Bulgu BAŞKA yerdeydi ve göç planı onu gizliyordu: paylaşılan sınıfı
   (`ab-vt`) ELLE yazan bir yüzey var — `tedarikciler/loading.tsx`.
   Paylaşılan CSS'i miras alır, ekranda paylaşılan bileşen gibi görünür,
   ama `VeriTablosu`nun kendi iskelet dalıyla (satır 172–198) hiçbir
   bağı yoktur. Bugün ikisi de doğru; yarın biri değişirse öbürü
   değişmez ve KİMSE GÖRMEZ.

   ── NEDEN KAPI, NEDEN KURAL DEĞİL ────────────────────────────────────
   "Tabloyu paylaşılan bileşenden çiz" zaten yazılı bir kuraldı. Ham
   tablo yine de altı yerde duruyor ve BEŞİ HAKLI. Yazılı kural haklıyı
   haksızdan ayıramaz; kapı ayırır: her ham tablo dosyasıyla, sınıfıyla
   ve GEREKÇESİYLE beyanlıdır, sayısı yalnız küçülür ve paylaşılan
   sınıfı taşıyan kopya yapısal sözleşmesini KANITLAR.

   ── DİŞLER ───────────────────────────────────────────────────────────
   1 · ALT KÜME — beyansız ham tablo KIRMIZI.
   2 · TAVAN — dosya başına sayı `azami`yi aşamaz.
   3 · ÖLÜ SATIR — kaynakta karşılığı kalmayan izin satırı KIRMIZI.
   4 · SÖZLEŞME — `paylasilanSinif` satırı paylaşılan iskeletin yapısal
       işaretlerini taşımalı (`aria-busy` · `.kolonbas` · `tr.iskelet`).
       Sınıfı taşıyıp sözleşmeyi kaybeden kopya EKRANDA doğru görünür.
   5 · İKİ GİRİŞ KAPISI — `Tablo` `VeriTablosu`yu çağırmayı sürdürmeli;
       `Matris` ise `<table>` DEĞİL, ARIA rolleriyle tablo olan bir CSS
       ızgarasıdır ve tabloluğu YALNIZ o rollerde durur. Roller düşerse
       ekranda hiçbir şey değişmez, ekran okuyucuda her şey değişir.
   6 · ÖLÇÜM TABANI — tarama en az N ham tablo görmeli. Kör bir tarayıcı
       sıfır kusur raporlar; bu deponun dört kez ölçtüğü sınıf budur.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = join(__dirname, '..', '..');
const PAYLASILAN = join('components', 'kabuk', 'tablo.tsx');

/** Yorumsuz kaynak: gerekçe metnindeki `<table>` kural sayılmaz. */
function yorumsuz(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
}

function dosyalar(dizin: string, uzanti: RegExp): string[] {
  const cikti: string[] = [];
  const yuru = (d: string) => {
    for (const ad of readdirSync(d)) {
      const yol = join(d, ad);
      if (statSync(yol).isDirectory()) { if (ad !== 'node_modules') yuru(yol); }
      else if (uzanti.test(ad)) cikti.push(yol);
    }
  };
  yuru(dizin);
  return cikti;
}

type Izin = {
  dosya: string; sinif: string; azami: number; paylasilanSinif: boolean; sebep: string;
};
const IZIN: Izin[] = JSON.parse(
  readFileSync(join(__dirname, 'tablo-izin.json'), 'utf8'),
).istisnalar;

type Ham = { dosya: string; sinif: string; satir: number };

const HAM: Ham[] = (() => {
  const cikti: Ham[] = [];
  for (const kok of ['app', 'components']) {
    for (const yol of dosyalar(join(KOK, kok), /\.tsx?$/)) {
      const bagil = yol.slice(KOK.length + 1);
      if (bagil === PAYLASILAN) continue;
      const kaynak = yorumsuz(readFileSync(yol, 'utf8'));
      for (const m of kaynak.matchAll(/<table\b([^>]*)>/g)) {
        const sc = /className=['"`]([^'"`]*)/.exec(m[1]);
        cikti.push({
          dosya: bagil.split('\\').join('/'),
          sinif: sc ? sc[1].trim() : '(sınıfsız)',
          satir: kaynak.slice(0, m.index).split('\n').length,
        });
      }
    }
  }
  return cikti;
})();

describe('bekçi · kütük grameri tek yerden çıkar', () => {
  it('BİRİNCİ DİŞ · beyansız ham tablo yok [URN-TBL-001]', () => {
    const beyanli = new Set(IZIN.map((i) => `${i.dosya}|${i.sinif}`));
    const kacak = HAM.filter((h) => !beyanli.has(`${h.dosya}|${h.sinif}`));
    expect(
      kacak.map((k) => `${k.dosya}:${k.satir} → .${k.sinif}`),
      'Paylaşılan bileşen dışında ham <table>. Gerekçesi varsa tests/bekci/tablo-izin.json',
    ).toEqual([]);
  });

  it('İKİNCİ DİŞ · dosya başına tavan aşılmıyor [URN-TBL-001]', () => {
    const asan: string[] = [];
    for (const i of IZIN) {
      const say = HAM.filter((h) => h.dosya === i.dosya && h.sinif === i.sinif).length;
      if (say > i.azami) asan.push(`${i.dosya} .${i.sinif}: ${say} > ${i.azami}`);
    }
    expect(asan, 'Ham tablo sayısı yalnız KÜÇÜLÜR.').toEqual([]);
  });

  it('ÜÇÜNCÜ DİŞ · ölü izin satırı yok [URN-TBL-001]', () => {
    const olu = IZIN.filter(
      (i) => !HAM.some((h) => h.dosya === i.dosya && h.sinif === i.sinif),
    ).map((i) => `${i.dosya} .${i.sinif}`);
    expect(olu, 'Kaynakta karşılığı kalmayan izin satırı; liste ölü referans taşıyamaz.').toEqual([]);
  });

  it('DÖRDÜNCÜ DİŞ · paylaşılan sınıfı taşıyan kopya sözleşmesini kanıtlar [URN-TBL-001]', () => {
    /* `VeriTablosu`nun iskelet dalının yapısal işaretleri. Sınıfı taşıyıp
       bunları kaybeden kopya EKRANDA doğru görünür: kapı olmasa görülmez. */
    const SOZLESME: [RegExp, string][] = [
      [/aria-busy=\{?["{]?true/, 'kaydırma kabında aria-busy'],
      [/className="kolonbas"/, 'kolon kaşında .kolonbas'],
      [/className="iskelet"/, 'iskelet satırında tr.iskelet'],
      [/className="ab-vt-sar"/, 'paylaşılan kaydırma kabı .ab-vt-sar'],
    ];
    const eksik: string[] = [];
    for (const i of IZIN.filter((x) => x.paylasilanSinif)) {
      const kaynak = readFileSync(join(KOK, i.dosya), 'utf8');
      for (const [kalip, ad] of SOZLESME) {
        if (!kalip.test(kaynak)) eksik.push(`${i.dosya}: ${ad} YOK`);
      }
    }
    expect(eksik, 'Paylaşılan sınıf paylaşılan grameri VAAT EDER; sözleşme kaybolursa kopya sessizce kayar.').toEqual([]);
  });

  it('BEŞİNCİ DİŞ · iki giriş kapısı da sözleşmesini sürdürür [URN-TBL-001]', () => {
    const kaynak = yorumsuz(readFileSync(join(KOK, PAYLASILAN), 'utf8'));
    const govde = (ad: string) => {
      const bas = kaynak.indexOf(`export function ${ad}(`);
      expect(bas, `${ad} bulunamadı`).toBeGreaterThan(-1);
      const sonraki = kaynak.indexOf('\nexport function ', bas + 1);
      return kaynak.slice(bas, sonraki === -1 ? undefined : sonraki);
    };

    /* `Tablo` bir SARMALAYICIDIR: eski satır biçimini kolon biçimine
       çevirir ve çizimi `VeriTablosu`ya bırakır. Kendi <table>'ına
       kaçarsa 46 ekran sessizce ikinci bir gramere geçer — dosya başlığı
       "tek semantik çekirdek" demeye devam ederken. */
    expect(govde('Tablo'), 'Tablo kendi <table>\'ını çiziyor — tek çizim yolu kırıldı')
      .toMatch(/<VeriTablosu/);

    /* `Matris` `<table>` DEĞİLDİR ve olmamalıdır: kesişim ızgarası CSS
       grid'dir, çünkü sütun sayısı veriden gelir. Tabloluğu ARIA ile
       kurulur ve semantiği YALNIZ orada durur — roller düşerse ızgara
       ekran okuyucuya div yığını olur ve EKRANDA hiçbir şey değişmez.

       Bu kapının ilk yazımı `Matris`in de `VeriTablosu` çağırdığını
       VARSAYDI ve kırmızı yandı; varsayım kaynağa bakılarak düzeltildi.
       İKİNCİ yazımı da kusurluydu ve onu SABOTAJ buldu (R-E): rolün
       kaynakta BULUNMASINI ölçüyordu. Konu sütununun rolü silindiğinde
       kapı yeşil kaldı — çünkü veri sütunlarının rolü hâlâ oradaydı.
       Bu, deponun kütüğünde adı konmuş sınıftır: "kapı yalnız maddenin
       VARLIĞINI ölçüyordu". Bugün HER kolon kaşı tek tek ölçülür. */
    const matris = govde('Matris');
    const acilislar = [...matris.matchAll(/<(?:span|div)\b[^>]*>/g)].map((m) => m[0]);
    const kaslar = acilislar.filter((t) => /className="kolonbas/.test(t));
    expect(kaslar.length, 'Matris kolon kaşı hiç bulunamadı — tarama körleşmiş').toBeGreaterThan(1);
    const rolsuz = kaslar.filter((t) => !/role="columnheader"/.test(t));
    expect(rolsuz, 'Her kolon kaşı role="columnheader" taşımalı; biri taşıyor diye öbürü muaf değildir')
      .toEqual([]);

    /* Izgaranın kalan ARIA grameri de eksiksiz olmalı: kap tablo, satır
       satır, kimlik hücresi satır başlığı, ölçüm hücresi hücre. */
    for (const rol of ['role="table"', 'role="row"', 'role="rowheader"', 'role="cell"']) {
      expect(matris, `Matris ızgarası ${rol} taşımıyor — tabloluğu ARIA'dadır`).toContain(rol);
    }
  });

  it('ALTINCI DİŞ · ölçüm tabanı — tarama kör değil [URN-TBL-001]', () => {
    tabanDogrula('tablo.hamBildirim', HAM.length);
    /* Sarmalayıcıların gerçekten kullanıldığını da ölç: popülasyon
       yalnız ham tablo değil, ürünün TABLO YÜZEYİDİR. */
    const kullanan = new Set<string>();
    for (const kok of ['app', 'components']) {
      for (const yol of dosyalar(join(KOK, kok), /\.tsx$/)) {
        const s = yorumsuz(readFileSync(yol, 'utf8'));
        if (/<(Tablo|VeriTablosu|Matris)\b/.test(s)) kullanan.add(yol);
      }
    }
    tabanDogrula('tablo.kullananDosya', kullanan.size);
  });
});
