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

   4 · BAŞLIK BAĞIRIYORDU. 56px'lik barda **17 büyük harfli dize** vardı
       (16'sı CSS `text-transform`, biri JS ile büyütülen sözcük markası)
       ve altısı DEĞERDİ: üç sektör adı (içerik paketinin kataloğundan
       gelir), kullanıcının unvanı, arama eylemi, bildirim bağı. Ürünün
       kendi kuralı şunu der — *"büyük harf YAPISAL KAŞA aittir; ada,
       cümleye, değere değil"* — ve kabuk o kuralı kendi barında
       çiğniyordu. Hepsi bağırınca hiçbiri duyulmuyordu.

       Kapı da göremiyordu: büyük harf bekçisi yalnız **≥13px**'i ölçer
       (`tests/bekci/buyuk-harf.test.ts`), oysa barın yükü 10–11px'teydi.
       Bugün başlığın büyük harf sayısı TAVANLIDIR ve yalnız küçülür.
       Ölçüldü: 17 → **9** (sözcük markası · ürün kaşı · beş sekme ·
       "Sektör" kaşı ×2 — yani yalnız yapı ve birincil gezinme).

   5 · KAYDIRMA ÇUBUĞU İKİ SINIR ARASINDA DURUR. Kullanıcı saha
       şeridinin çubuğunu "siteden bağımsız, kötü ve çok dikkat çekiyor"
       diye bildirdi (18 Eyl 2026). İlk düzeltmem rengi söndürmekti
       (4,18:1 → 1,72:1) ve YANLIŞTI: çubuk bir metin değil KONTROLDÜR,
       WCAG 1.4.11 eşiği 3:1'dir ve o taban `DESIGN.md`de dört zeminde
       ölçülerek kayıtlıdır. Görsel bir şikâyet erişilebilirlik tabanını
       düşüremez — öncelik sırası bunu söyler.

       Kusur renkte değil, O ŞERİDİN ÇUBUĞA İHTİYACI OLMAMASINDAYDI:
       saha şeridi bir gezinme rayıdır (kartlar `<Link>`), gradyanla
       solar ve kabuğun öbür rayları çubuğu zaten gizler. Düzeltme oraya
       taşındı. Diş bugün İKİ sınırı da tutar: ≥3:1 (bulunabilirlik) ve
       `--i3`ten sönük (ayırdığı içerikten okunaklı olamaz).

   ── DİŞLER ────────────────────────────────────────────────────────────
   1 · Marka kademesi gezinme kademesinden KESİNLİKLE büyük.
   2 · Aktif sekme ÜÇ ipucu taşır (mürekkep · zemin · bakır alt çizgi) —
       durum yalnız renkle anlatılmaz.
   3 · Kabuk bileşenlerinde kiracı adı DÜZ DİZGE olarak geçmez.
   4 · Ayakta kimlik kümesi gezinme kümesinden ÖNCE gelir.
   5 · Telif satırı kiracı adını ve yılı HESAPLAR, sabit yazmaz.
   6 · Başlıkta büyük harf YALNIZ yapı ve birincil gezinmede; sayı
       tavanlıdır ve yalnız küçülür (10–11px yükü buradan ölçülür,
       çünkü büyük harf bekçisi ≥13px'e bakar).
   7 · Kaydırma çubuğu saç çizgisi ailesinde kalır: `--cubuk` zemine
       göre `--i3`ten SÖNÜK olmalıdır.
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

  it('İKİNCİ DİŞ · aktif sekme İKİ ipucu taşır, ÜÇÜNCÜSÜ KUTU DEĞİL [URN-KBK-022]', () => {
    /* ── KARAR DEĞİŞTİ VE SEBEBİ YAZILI ─────────────────────────────────
       Diş önce ÜÇ ipucu istiyordu: mürekkep + panel zemini + bakır alt
       çizgi. Üçüncüsü bir KUTU üretiyordu ve kabuk yeniden tasarlanırken
       (kullanıcı: "komple değişiklik, çok daha elit") asıl kusur bileşimde
       ölçüldü: aynı 56px'te marka hücresi, mercek hücresi ve yardımcı
       hücresi dikey çizgiyle ayrılırken arama KUTUDA, mercek seçicisi
       KUTUDA ve sayaç DOLU bir rozetteydi. Her şeyin bir kabı olduğunda
       kap artık yapı anlatmaz.

       İPUCU SAYISI DÜŞTÜ AMA ERİŞİLEBİLİRLİK DÜŞMEDİ ve diş bunu ölçer:
       WCAG 1.4.1'in istediği "renk TEK kanal olmasın"dır, "üç kanal
       olsun" değil. Kalan iki kanalın biri renkten bağımsızdır (alt
       çizgi) — yani koşul karşılanıyor. Diş bu yüzden ikisini birden
       ZORUNLU tutar ve zemini AÇIKÇA YASAKLAR: kutu geri gelirse
       kırmızı yanar. */
    const bas = CSS.indexOf(".ab-ust > nav a[aria-current='page'] {");
    expect(bas, 'aktif sekme kuralı bulunamadı').toBeGreaterThan(-1);
    const govde = CSS.slice(bas, CSS.indexOf('}', bas));

    for (const ipucu of ['color:', 'border-bottom-color:']) {
      expect(govde, `aktif sekme ${ipucu} taşımıyor — durum iki kanaldan `
        + 'birini kaybetti').toContain(ipucu);
    }
    expect(govde, 'Aktif sekme yeniden ZEMİN alıyor. Barın grameri kap tanımaz: '
      + 'dolgulu bir dikdörtgen yanındaki dört sekmeyi "kapsız" gösterir ve rayı '
      + 'böler. Durumu mürekkep ağırlığı ve bakır alt çizgi söyler.')
      .not.toContain('background');
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

  it('ALTINCI DİŞ · başlıkta büyük harf yapı ve gezinmeyle sınırlı [URN-KBK-022]', () => {
    /* `text-transform: uppercase` taşıyan KAÇ kural başlığa düşüyor?
       Kaynaktan ölçülür; tarayıcı gerektirmez. Seçici başlık kapsamında
       ya da başlığın içindeki bir sınıfa aitse sayılır. */
    const BASLIK_SECICILERI = [
      '.ab-ust', '.ab-mercek', '.ab-ornek-veri', '.ab-hesap-dugme', '.ab-ara-dugme',
    ];
    const buyukHarfli: string[] = [];
    for (const m of CSS.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
      if (!/text-transform:\s*uppercase/.test(m[2])) continue;
      const sec = m[1].split('\n').pop()!.trim();
      if (BASLIK_SECICILERI.some((b) => sec.includes(b))) buyukHarfli.push(sec);
    }
    /* TAVAN — yalnız küçülür. Ölçüldü (18 Eyl 2026): ekrandaki büyük
       harfli dize 17'den 9'a indi; kaynaktaki KURAL sayısı ise 5'tir ve
       beşi de meşrumuş. Kabuk yeniden tasarımında (19 Eyl 2026) BİRİ
       düştü ve tavan ONUNLA BİRLİKTE indi:

         ~~`.ab-ust .marka .ikinci`~~  ürün adı — KALDIRILDI: bakır artık
                                       yalnız durumu işaretler, kimliği
                                       değil; ikinci satır cümle düzenine
                                       ve üçüncül mürekkebe indi
         1 · `.ab-ust > nav a`         birincil gezinme (kuralın kendi istisnası)
         2 · `.ab-ornek-veri`          uyarı işareti — ekran görüntüsünde
                                       görünmesi ürün şartıdır
         3 · `.ab-mercek .etiket`      "Sektör" kaşı
         4 · `.ab-mercek-dar .etiket`  aynı kaşın dar bant nüshası

       ── TAVAN NİÇİN İNDİ ──────────────────────────────────────────────
       Popülasyon 5'ten 4'e indiğinde tavan 5'te bırakılırsa, cırcır BİR
       İHLALLİK BOŞLUK açar: yeni bir büyük harf kuralı eklemek tavanı
       aşmaz ve kapı susar. SABOTAJ TURU TAM BUNU YAKALADI — "sektör
       ADLARINI yeniden büyük harf yap" sabotajı, tavan 5'te kaldığı için
       kırmızı yakmadı (R-E bulgusu). Bir tavan, ölçülen sayı düştüğünde
       onunla birlikte inmiyorsa artık tavan değildir.

       Tavan KURAL sayısındadır, öğe sayısında değil: bir kural beş
       sekmeyi birden büyütür ve asıl karar kuraldadır. */
    const TAVAN = 4;
    expect(buyukHarfli.length, `Başlıkta büyük harf kuralı: ${buyukHarfli.length} > ${TAVAN}\n  `
      + `${buyukHarfli.join('\n  ')}\n`
      + 'Büyük harf YAPISAL KAŞA aittir — ada, cümleye, DEĞERE değil. '
      + 'Sektör adı, unvan, eylem etiketi değerdir.').toBeLessThanOrEqual(TAVAN);
  });

  it('YEDİNCİ DİŞ · kaydırma çubuğu saç çizgisi ailesinde [URN-KBK-022]', () => {
    const oku = (ad: string) => {
      const m = new RegExp(`${ad}:\\s*(#[0-9A-Fa-f]{6})`).exec(CSS);
      return m ? m[1] : null;
    };
    const lum = (h: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
      const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const ora = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    const zemin = oku('--zemin'); const cubuk = oku('--cubuk');
    const hr2 = oku('--hr2'); const i3 = oku('--i3');
    for (const [ad, v] of [['--zemin', zemin], ['--cubuk', cubuk], ['--hr2', hr2], ['--i3', i3]]) {
      expect(v, `${ad} okunamadı — jeton adı değişmiş`).not.toBeNull();
    }
    const kC = ora(zemin!, cubuk!); const kI = ora(zemin!, i3!);
    /* TABAN — 3:1. Çubuk bir METİN değil KONTROLDÜR; WCAG 1.4.11 metin
       dışı kontrast eşiği 3:1'dir ve bu karar `DESIGN.md`de dört zeminde
       ölçülerek kayıtlıdır. Görsel bir şikâyet bu tabanı DÜŞÜREMEZ:
       denendi (1,72:1) ve geri alındı — öncelik sırası erişilebilirliği
       görsel iyileştirmenin üstüne koyar. Çok gürültülü bulunan bir
       çubuğun çözümü rengi söndürmek değil, o kabın çubuğa ihtiyacı
       olup olmadığını sormaktır (`GIZLI_IZINLI`). */
    expect(kC, `Çubuk erişilebilirlik tabanının altında: ${kC.toFixed(2)} < 3,00 (WCAG 1.4.11)`)
      .toBeGreaterThanOrEqual(3);
    /* TAVAN — üçüncül METİNDEN yüksek sesli olamaz. Bir kontrol,
       ayırdığı içerikten daha okunaklı çizilemez. */
    expect(kC, `Çubuk üçüncül metinden yüksek sesli: ${kC.toFixed(2)} ≥ ${kI.toFixed(2)}`)
      .toBeLessThan(kI);
  });

  it('ALTINCI DİŞ · bildirim sözcüğü ancak SAYAÇ VARKEN düşer [URN-KBK-022]', () => {
    /* ── ÖLÇÜLEN · bağımsız inceleme, PR #73 (P1) ────────────────────────
       Telefon kuralı (`≤430px`) "sözcük düşer, sayaç kalır" diyordu ve
       sözcüğü KOŞULSUZ gizliyordu. `Sayac` ise sıfırda HİÇ çizilmez
       (`sayacMetni` null döner). Okunmamış bildirimi olmayan bir
       kullanıcı — yani çoğu gün, çoğu kullanıcı — telefonda ADSIZ VE
       İŞARETSİZ bir kutu görüyordu: bağın ne olduğunu anlamanın ya da
       varlığını keşfetmenin görsel yolu kalmıyordu.

       İki taraf da tek tek DOĞRUYDU: gizleme kuralı da, sıfırda
       çizmeyen sayaç da. Kusur ikisinin BAĞINDAYDI — bu deponun R-F
       sınıfı. Bu yüzden diş ikisini BİRLİKTE okur: CSS yalnız
       koşullu sınıfı hedefleyebilir, sınıfı veren koşul da sayacın
       kendi kararı (`sayacMetni`) olmak zorundadır. `n > 0` yazmak
       aynı kararı ikinci kez tanımlamak olurdu ve iki tanım bir gün
       ayrışırdı — ayrıldığı gün de kimse görmezdi. */
    const satir = /<span className=\{`ad\$\{([^}]*?)\}`\}>Bildirim<\/span>/.exec(KABUK);
    expect(satir, 'Bildirim sözcüğü KOŞULSUZ bir `className="ad"` taşıyor. Telefonda '
      + 'onu gizleyen kural var; sayaç sıfırda çizilmiyor — bağ adsız bir kutuya '
      + 'döner.').not.toBeNull();
    expect(satir![1], 'Sözcüğün düşebilirlik koşulu `sayacMetni` ile kurulmuyor. Koşul '
      + 'sayacın KENDİ kararından gelmeli; ikinci bir tanım (`n > 0`) bir gün ayrışır.')
      .toContain('sayacMetni(n)');

    /* CSS tarafı: gizleme yalnız o sınıfı hedefler, `.ad`in tamamını değil. */
    const kural = /\.ab-ust \.bildirim \.ad(\.[a-z-]+)? \{ display: none; \}/.exec(CSS);
    expect(kural, 'Telefonda bildirim sözcüğünü gizleyen kural bulunamadı').not.toBeNull();
    expect(kural![1], 'Gizleme kuralı `.ad`in TAMAMINI hedefliyor — sayaç olsun olmasın '
      + 'sözcüğü düşürür. Koşullu sınıfı hedeflemeli.').toBeDefined();
    expect(kural![1], 'Gizleme kuralının hedeflediği sınıf bileşenin verdiği sınıf değil')
      .toBe('.dar-dusebilir');
  });

  it('YEDİNCİ DİŞ · ortam rozeti dar bant satır bütçesine GİRER [URN-KBK-022]', () => {
    /* ── ÖLÇÜLEN · bağımsız inceleme, PR #73 (P2) ────────────────────────
       Dar bantta başlığın doğrudan çocukları `order` ile diziliyordu —
       marka, mercek, yardımcı küme, gezinme. Ortam rozeti
       (`.ab-ornek-veri`; demo ve geliştirme kurulumlarında çizilir) o
       listede YOKTU: varsayılan `order: 0` ile sıranın BAŞINA geçiyor ve
       ~87px'iyle yardımcı kümeyi üçüncü satıra itiyordu.

       Yani "başlık iki satır" ölçümü YALNIZ üretim derlemesinde
       doğruydu. Kamuya açık demo (`NEXT_PUBLIC_DEMO=1`) ve her
       geliştirme kurulumu üç satır görüyordu — ölçüldü, 390×844:
       82px → 121px. Bu deponun "sağlayıcı/ortam farkı" sınıfı: ölçtüğün
       ortam, kullanıcının gördüğü ortam olmayabilir.

       Diş rozetin AYNI medya bloğunda sıra almasını ister. Sayı değil
       VARLIK ölçülür: hangi sıraya gireceği bir tasarım kararıdır,
       listede olmaması ise bir unutmadır. */
    /* ── YORUM METNİ KURAL DEĞİLDİR ──────────────────────────────────
       İlk yazımda kural `/\.ab-ornek-veri[^{]*\{[^}]*order:/` ile
       aranıyordu ve diş SABOTAJ TURUNDA KIRMIZI YANMADI (R-E): kuralı
       silsem bile seçici adı BU DİŞİN KENDİ GEREKÇE YORUMUNDA geçiyor,
       `[^{]*` oradan ileri koşup bir sonraki kuralın süslü parantezine
       giriyor ve onun `order:`ini okuyordu. Yani diş kuralı değil kendi
       nesrini ölçüyordu — "hiçbir şey ölçmeden yeşil yanan kapı"nın
       tam örneği. Bugün yorumlar ÖNCE ayıklanır ve bildirimler
       kuralın KENDİ gövdesinden okunur. */
    const yorumsuz = (m: string) => m.replace(/\/\*[\s\S]*?\*\//g, '');
    const blok = /@media \(max-width: 1024px\) \{([\s\S]*?)\n\}/.exec(CSS);
    expect(blok, 'başlığın dar bant bloğu (max-width: 1024px) bulunamadı').not.toBeNull();
    const g = yorumsuz(blok![1]);

    /** Bir seçicinin KENDİ gövdesindeki bildirimler. */
    const govde = (sec: string): string | null => {
      const kacis = sec.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const m = new RegExp(`(?:^|[,{}])\\s*${kacis}\\s*\\{([^{}]*)\\}`, 'm').exec(g);
      return m ? m[1] : null;
    };

    for (const sec of ['.ab-ust .marka', '.ab-mercek-dar', '.ab-ust .sag', '.ab-ust > nav']) {
      const b = govde(sec);
      expect(b, `${sec} bu blokta kendi kuralını taşımıyor — diş yanlış bloğu okuyor olabilir`)
        .not.toBeNull();
      expect(b!, `${sec} bu blokta sıra almıyor`).toMatch(/order:/);
    }

    const rozet = govde('.ab-ust .ab-ornek-veri');
    expect(rozet, 'Ortam rozeti (`.ab-ornek-veri`) dar bantta KENDİ KURALINI taşımıyor. '
      + 'Başlığın doğrudan çocuğudur ve demo/geliştirme kurulumlarında çizilir; sırasız '
      + 'kalınca `order: 0` ile en başa geçer ve yardımcı kümeyi bir satır aşağı iter. '
      + 'Ölçüldü (390×844): başlık 82px → 121px.').not.toBeNull();
    expect(rozet!, 'Ortam rozetinin kuralı var ama SIRA vermiyor').toMatch(/order:/);

    /* Kırıcı da burada: rozet sıra alsa bile satır kırılması yoksa
       gezinme ile aynı satırı paylaşamaz (ölçüldü: 105px · 3 satır). */
    const kirici = govde('.ab-ust::before');
    expect(kirici, 'Dar bant satır kırıcısı (`.ab-ust::before`) yok — gezinme kendi '
      + 'satırını `flex-basis: 100%` ile açarsa rozet o satıra sığamaz.').not.toBeNull();
    expect(kirici!, 'Kırıcı satırdan GENİŞ değil. Tam %100 olduğunda taban genişliği 0 '
      + 'olan gezinme aynı satıra sığıyor, 0px’te kalıyor ve rozet üçüncü satıra '
      + 'düşüyor (ölçüldü: başlık 105px).').toMatch(/calc\(100% \+ 1px\)/);
  });

  it('BEŞİNCİ DİŞ · telif kiracıdan ve takvimden gelir [URN-KBK-022]', () => {
    const g = ayakGovdesi();
    const satir = /<span className="telif">([\s\S]*?)<\/span>/.exec(g)?.[1] ?? '';
    expect(satir, 'telif satırı okunamadı').not.toBe('');
    expect(satir, 'Telif kiracı adını yapılandırmadan okumuyor').toContain('veri.kiraciAd');
    expect(satir, 'Telif yılı SABİT yazılmış; bir sonraki yıl ürün bayat tarih gösterir')
      .toMatch(/getFullYear\(\)/);
  });

  it('SEKİZİNCİ DİŞ · kenara çakılı süs, kontrolün vuruş alanının İÇİNDE [URN-KBK-022]', () => {
    /* ── ÖLÇÜLEN · bağımsız inceleme, PR #74 ───────────────────────────
       Dar bant merceğinin şevronu (`.ab-mercek-dar::after`) kapsayıcının
       sağ kenarına çakılıydı (`right: 0`) ve `pointer-events: none`
       taşıyordu — ikisi de doğru. Kusur ÜÇÜNCÜ bir kuraldaydı: kapsayıcı
       telefon bandında sağ DOLGU alıyordu (≤700px 14px · ≤430px 8px) ve
       dolgu `<select>` kutusunun DIŞINDADIR. Yani görünen ok, seçicinin
       üstünde değil yanındaki ölü boşlukta duruyordu; dokunuş işaretçi
       almayan süsün altındaki kapsayıcıya düşüyor ve mercek AÇILMIYORDU.

       Üç kural tek tek doğruydu ve hiçbir kapı göremedi — bu deponun R-F
       sınıfının geometrik karşılığı. Diş üçünü BİRLİKTE okur.

       POPÜLASYON TÜRETİLİR, sayılmaz: gelecekte eklenen her "işaretçi
       almayan, kenara çakılı süs" bu dişin önüne kendiliğinden gelir.
       Boş popülasyon KIRMIZIDIR — hiçbir şeye bakmadan temiz raporlamak,
       bu deponun kayıtlı kusuru. */
    const sus: { sec: string; kenar: string }[] = [];
    let suslu = 0;
    for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const sec = m[1].split('\n').pop()!.trim(); const g = m[2];
      if (!/::(after|before)/.test(sec)) continue;
      if (!/position:\s*absolute/.test(g) || !/pointer-events:\s*none/.test(g)) continue;
      suslu += 1;
      for (const kenar of ['right', 'left', 'top', 'bottom']) {
        if (new RegExp(`(?:^|;)\\s*${kenar}:\\s*0(?:px)?\\s*(?:;|$)`).test(g.trim())) {
          sus.push({ sec, kenar });
        }
      }
    }
    expect(suslu, 'Türetici HİÇBİR süs bulamadı — kabuk kromu böyle bir '
      + 'nesne taşımıyorsa diş silinir, boş küme "kusur yok" demek değildir')
      .toBeGreaterThan(0);
    expect(sus.length, 'Kenara ÇAKILI süs kalmadı; diş artık hiçbir şey '
      + 'ölçmüyor (R-E: ölçmeyen diş bir bulgudur)').toBeGreaterThan(0);

    for (const { sec, kenar } of sus) {
      const taban = sec.replace(/::(after|before)\s*$/, '').trim();
      /* ── KURALLAR TEK GEÇİŞTE BÖLÜNÜR, TEK TEK ARANMAZ ───────────────
         İlk yazım kapsayıcıyı kendi düzenli ifadesiyle arıyordu ve
         ÖNÜNDEKİ `}`yi TÜKETİYORDU: ardışık iki kural arasında delimiter
         paylaşıldığı için ikincisi hiç eşleşmiyordu. Ölçüldü — sabotaj
         turunda `.ab-mercek-dar { padding-right: 14px; }` yazıldı ve diş
         YEŞİL kaldı: dört kuralın üçünü görüyor, sabotajın düştüğü
         dördüncüsünü göremiyordu (R-E · yakmayan sabotaj bir bulgudur).
         Bugün dosya bir kez kurallara bölünür ve özne ADI karşılaştırılır;
         atlanacak bir delimiter yoktur.

         BEYANLI SINIR: diş medya bağlamını ÇÖZMEZ — kapsayıcıya dolgu
         veren kural, süsün çizildiği banttan başka bir bantta olsa da
         kırmızı yakar. Bilinçli ihtiyattır: yanlış yönü, olmayan bir
         kusuru bildirmektir; tersi, olanı kaçırmak olurdu. */
      for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        const ozne = m[1].split('\n').pop()!.trim();
        const hedefliyor = ozne.split(',')
          .some((p) => p.trim().endsWith(taban));
        if (!hedefliyor) continue;
        const g = m[2];
        const dolgu = new RegExp(`(?:^|;)\\s*padding-${kenar}:\\s*([^;]+)`).exec(g)?.[1]?.trim();
        expect(dolgu === undefined || /^0(?:px)?$/.test(dolgu),
          `${sec} kapsayıcının ${kenar} DOLGUSUNUN içine düşüyor `
          + `(\`${ozne}\` → padding-${kenar}: ${dolgu}). Dolgu, kapsayıcının `
          + 'içindeki kontrolün DIŞINDA kalan bir şerittir: süs orada durunca '
          + 'görünen işaret ile dokunulabilir alan AYRIŞIR ve '
          + '`pointer-events: none` yüzünden dokunuş hiçbir şey açmaz. '
          + `Komşudan ayıran boşluk bir DIŞ paydır — \`margin-${kenar}\` yazılır.`)
          .toBe(true);
        /* Kısa yazım aynı şeridi açar ve gözden kaçar. */
        const kisa = /(?:^|;)\s*padding:\s*([^;]+)/.exec(g)?.[1]?.trim();
        if (kisa) {
          expect(/^(?:0(?:px)?)(?:\s+0(?:px)?)*$/.test(kisa),
            `\`${ozne}\` kısa yazımla dolgu alıyor (padding: ${kisa}); `
            + `${sec} bu dolgunun içine düşebilir. Dolgu dış paya çevrilir.`)
            .toBe(true);
        }
      }
    }
  });
});
