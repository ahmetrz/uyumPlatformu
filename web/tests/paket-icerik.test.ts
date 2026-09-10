import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { kademeAnahtari, maddeMetniDurumu } from '@/lib/paket/bicim';
import { SOZLUK_SATIRI, cerceve, fiksturEslemesi, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · İÇERİK — köken sütunları ve uygulanabilirlik beyanı
   (URN-PKT-019 · URN-PKT-020)

   İki kural burada sınanır, ikisi de sessizce yanlış olabilir:

   1. KÖKEN: metni olan bir madde, metnin NEREDEN ve NE ZAMAN alındığını
      taşır (`kaynak_url` · `kaynak_yeri` · `erisim_tarihi`). Kaynağı
      olduğunu SÖYLEYEN çerçevede (kimlikte `kaynakUrl` var) bu zorunludur;
      kiracının kendi iç politikası ve kurgusal demo paketi muaftır —
      onlara resmî adres uydurmak kuralın kendisini bozardı.
   2. UYGULANABİLİRLİK: çerçeve hangi kapsam öğesi TÜRÜNE, hangi öznitelik
      koşuluyla asılır — paket BEYAN eder, koda gömülmez. Beyandaki tür ve
      alan adları paketin kendi dosyalarına karşı doğrulanır; uydurma
      anahtar sessizce "kural hiç sağlanmadı"ya dönüşürdü.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const KAYNAKLI = (ek: Record<string, unknown> = {}) => ({
  ...cerceve('KYN-REG', { tur: 'kamuya_acik', metinDahil: true }),
  temsili: false, kaynakUrl: 'https://www.resmigazete.gov.tr/eskiler/2023/06/20230606-2.htm', ...ek,
});
const BASLIK = 'kod;ust_kod;baslik;metin;sira;seviye;zorunluluk_tipi;kanit_beklentisi;dis_kontrol_id;kanit_tipi;kaynak_url;kaynak_yeri;erisim_tarihi;yururluk_tarihi';
const OZNITELIK = (anahtar: string, kural: boolean) => ({
  anahtar, tip: 'sayi', birim: 'MWe', etiketAnahtari: anahtar, rol: null, grup: null, secenekler: null, kuraldaKullanilir: kural, sira: 1,
});
const TUR = { kod: 'kontrol_sistemi', ad: 'Kontrol sistemi', etiketAnahtari: null, tesiseBagli: true, sira: 10 };
const dosyalar = (kimlik: Record<string, unknown>, csv: string, ek: PaketDosyalari = {}): PaketDosyalari => ({
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'santral')],
  'kapsam-turleri.json': [TUR],
  'oznitelikler.json': [OZNITELIK('kuruluGuc', true), OZNITELIK('lisansNo', false)],
  'cerceve/KYN-REG.json': kimlik,
  'cerceve/KYN-REG.csv': csv,
  ...ek,
});
const dogrula = (kimlik: Record<string, unknown>, csv: string, manifest: Record<string, unknown> = {}) =>
  paketiDogrula(paketYaz(dosyalar(kimlik, csv), {
    kod: 'KYN-PAKET', sektor: { kod: 'KYN-SEKTOR', ad: 'Kaynak' },
    /* Temsilî olmayan çerçeve alan eşlemesi beyan etmek zorundadır (URN-PKT-022);
       bu fikstürün konusu KÖKEN, beyanı üreteç sağlar. */
    ...(kimlik.temsili === false ? { alanEslemesi: fiksturEslemesi('KYN-REG', csv) } : {}),
    ...manifest,
  }));
const hatalari = (s: ReturnType<typeof paketiDogrula>) => s.hatalar.map(hataSatiri);

describe('köken sütunları: metnin nereden ve ne zaman alındığı [URN-PKT-019]', () => {
  const SATIR = (ek: string) => `${BASLIK}\n1;;Amaç;Bu Yönetmeliğin amacı…;0;;;;;;${ek}\n`;

  it('kaynağı olan çerçevede metinli madde kaynak_url + erisim_tarihi taşır; taşımayan KAYNAK [URN-PKT-019]', () => {
    const eksik = dogrula(KAYNAKLI(), SATIR(';;;'));
    expect(hatalari(eksik).join('\n')).toMatch(/KAYNAK: metin girilmiş ama kaynak_url boş/);
    const tarihsiz = dogrula(KAYNAKLI(), SATIR('https://www.epdk.gov.tr/x;Yönetmelik · MADDE 1;;'));
    expect(hatalari(tarihsiz).join('\n')).toMatch(/KAYNAK: metin girilmiş ama erisim_tarihi boş/);
    const tam = dogrula(KAYNAKLI(), SATIR('https://www.epdk.gov.tr/x;Yönetmelik · MADDE 1;2026-09-09;2023-06-06'));
    expect(hatalari(tam)).toEqual([]);
    expect(tam.icerik?.cerceveler[0].maddeler[0]).toMatchObject({
      kaynakUrl: 'https://www.epdk.gov.tr/x', kaynakYeri: 'Yönetmelik · MADDE 1', erisimTarihi: '2026-09-09', yururlukTarihi: '2023-06-06',
    });
  });

  it('kaçış kapısı kapalı: kaynak adresini SİLMEK muafiyet vermez — çerçeve ya kaynağını ya temsilîliğini beyan eder [URN-PKT-019]', () => {
    /* Bağımsız inceleme (PR #43 tur 2): kural yalnız `kaynakUrl` beyan eden çerçeveyi
       bağlıyordu; adresi kimlikten silen paket 565 satır resmî metni kökensiz taşıyabilirdi. */
    const sade = { ...cerceve('KYN-REG', { tur: 'kamuya_acik', metinDahil: true }), temsili: false } as Record<string, unknown>;
    expect(hatalari(dogrula({ ...sade }, SATIR(';;;'))).join('\n')).toMatch(/KAYNAK: KYN-REG metin taşıyor ama kaynak adresi beyan etmiyor/);
    /* TEMSİLÎ beyanı muaf tutar — beyan alanda durur, yorumda değil. */
    expect(hatalari(dogrula({ ...sade, temsili: true }, SATIR(';;;')))).toEqual([]);
    /* İkisi birden olamaz: kaynağı olduğunu söyleyen çerçeve temsilî değildir. */
    expect(hatalari(dogrula(KAYNAKLI({ temsili: true }), SATIR('https://x.gov.tr/y;;2026-09-09;'))).join('\n')).toMatch(/hem temsilî hem kaynak adresi/);
    /* Kurgusal demo paketi muaf. */
    expect(hatalari(dogrula(KAYNAKLI(), SATIR(';;;'), { tur: 'demo' }))).toEqual([]);
  });

  it('kaynak_url adres olmalı, tarihler takvimde olmalı, kaynak_yeri konumdur [URN-PKT-019]', () => {
    expect(hatalari(dogrula(KAYNAKLI(), SATIR('epdk.gov.tr;;2026-09-09;'))).join('\n')).toMatch(/KAYNAK: kaynak_url geçerli bir http\(s\) adresi değil/);
    expect(hatalari(dogrula(KAYNAKLI(), SATIR('https://x.gov.tr/y;;2026-02-30;'))).join('\n')).toMatch(/erisim_tarihi takvim tarihi değil/);
    expect(hatalari(dogrula(KAYNAKLI(), SATIR('https://x.gov.tr/y;;2026-09-09;2023-13-01'))).join('\n')).toMatch(/yururluk_tarihi takvim tarihi değil/);
    expect(hatalari(dogrula(KAYNAKLI(), SATIR(`https://x.gov.tr/y;${'a'.repeat(201)};2026-09-09;`))).join('\n')).toMatch(/kaynak_yeri 201 karakter > 200/);
  });

  it('metinsiz madde köken istemez — "metin girilmedi" hâli boş bırakılır, uydurulmaz [URN-PKT-019]', () => {
    const s = dogrula(KAYNAKLI(), `${BASLIK}\n1;;Amaç;;0;;;;;;;;;\n`);
    expect(hatalari(s)).toEqual([]);
    expect(s.icerik?.cerceveler[0].maddeler[0]).toMatchObject({ metin: null, kaynakUrl: null, erisimTarihi: null });
  });
});

describe('uygulanabilirlik beyanı: paket söyler, koda gömülmez [URN-PKT-020]', () => {
  const CSV = `${BASLIK}\n1;;Amaç;;0;;;;;;;;;\n`;
  const beyanli = (u: unknown) => dogrula({ ...cerceve('KYN-REG', { tur: 'kamuya_acik', metinDahil: false }), uygulanabilirlik: u }, CSV);

  it('geçerli beyan: çekirdek ve paket türleri, kuralda kullanılan öznitelik [URN-PKT-020]', () => {
    const s = beyanli({ kapsamTurleri: ['tesis', 'kontrol_sistemi'], kosul: { herhangi: [{ alan: 'kuruluGuc', islec: '>=', deger: 100 }] }, aciklama: 'MADDE 2 (1)' });
    expect(hatalari(s)).toEqual([]);
    expect(s.sayilar.kurallar).toBe(1);
    expect(s.icerik?.cerceveler[0].kimlik.uygulanabilirlik).toMatchObject({ kapsamTurleri: ['tesis', 'kontrol_sistemi'] });
  });

  it('tanınmayan tür KAPSAM TÜRÜ; paketin olmayan özniteliği ÖZNİTELİK [URN-PKT-020]', () => {
    expect(hatalari(beyanli({ kapsamTurleri: ['santral'] })).join('\n')).toMatch(/KAPSAM TÜRÜ: tanınmayan kapsam öğesi türü: santral/);
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { herhangi: [{ alan: 'uydurmaAlan', islec: '=', deger: 1 }] } })).join('\n'))
      .toMatch(/ÖZNİTELİK: koşul alanı paketin özniteliği değil: uydurmaAlan/);
  });

  it('kuraldaKullanilir=false alan koşulda kullanılamaz [URN-PKT-020]', () => {
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'lisansNo', islec: '=', deger: 'x' }] } })).join('\n'))
      .toMatch(/lisansNo kuralda kullanılamaz/);
  });

  it('işleç–değer uyumu: >= sayı, icinde liste, = tek değer ister [URN-PKT-020]', () => {
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'kuruluGuc', islec: '>=', deger: 'yüz' }] } })).join('\n')).toMatch(/>= işleci sayı ister/);
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'kuruluGuc', islec: 'icinde', deger: 3 }] } })).join('\n')).toMatch(/icinde işleci liste ister/);
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'kuruluGuc', islec: '=', deger: ['a', 'b'] }] } })).join('\n')).toMatch(/= işleci tek değer ister/);
  });

  it('kural ya herhangi ya hepsi taşır; iç içe koşul da doğrulanır [URN-PKT-020]', () => {
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { herhangi: [{ alan: 'kuruluGuc', islec: '>=', deger: 1 }], hepsi: [{ alan: 'kuruluGuc', islec: '>=', deger: 2 }] } })).join('\n'))
      .toMatch(/`herhangi` ya `hepsi`/);
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ herhangi: [{ alan: 'yokAlan', islec: '=', deger: 1 }] }] } })).join('\n'))
      .toMatch(/kosul\.hepsi\[0\]\.herhangi\[0\] — ÖZNİTELİK/);
  });

  it('kapsamTuru alanı yalnız icinde/= ile ve tanınan tür değeriyle [URN-PKT-020]', () => {
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'kapsamTuru', islec: '>=', deger: 1 }] } })).join('\n')).toMatch(/kapsamTuru yalnız icinde ya da = ile/);
    expect(hatalari(beyanli({ kapsamTurleri: ['tesis'], kosul: { hepsi: [{ alan: 'kapsamTuru', islec: 'icinde', deger: ['uydurma_tur'] }] } })).join('\n')).toMatch(/tanınmayan kapsam öğesi türü: uydurma_tur/);
  });
});

describe('TR-ENERJI içeriği: resmî metin, köken, uygulanabilirlik [URN-PKT-019] [URN-PKT-020]', () => {
  const s = paketiDogrula(path.join(KOK, 'paketler', 'TR-ENERJI'));
  const cerceveleri = () => s.icerik!.cerceveler;

  it('ölçüm tabanı: paket geçerli, sekiz çerçeve, 3 803 madde', () => {
    expect(s.hatalar.map(hataSatiri)).toEqual([]);
    /* 23 yönetmelik satırı + yedi ek (aile satırları dâhil): Ek-1 488 · Ek-2 518 · Ek-3 578 ·
       Ek-4 565 · Ek-5 564 · Ek-6 591 · Ek-7 476. Her ek bir çerçeve, her çerçeve bir kural. */
    expect(s.sayilar).toMatchObject({ cerceveler: 8, maddeler: 3803, kurallar: 8 });
  });

  it('metinli her maddede kaynak adresi ve erişim tarihi var; metinsiz madde uydurma köken taşımaz [URN-PKT-019]', () => {
    const maddeler = cerceveleri().flatMap((c) => c.maddeler);
    const metinli = maddeler.filter((m) => m.metin);
    expect(metinli.length).toBe(3710); // 19 yönetmelik maddesi + 3 691 ek kontrolü (aile satırları metinsiz)
    expect(metinli.filter((m) => !m.kaynakUrl || !m.erisimTarihi)).toEqual([]);
    expect(new Set(metinli.map((m) => m.erisimTarihi))).toEqual(new Set(['2026-09-09']));
    expect(maddeler.filter((m) => !m.metin && (m.kaynakUrl === null))).toEqual([]); // başlık satırı da kaynağını söyler
  });

  it('yedi ekin ölçümü: aile · kontrol · metni olan — hiçbiri tahmin değil [URN-PKT-019]', () => {
    /* Ölçüm ekin kendi XLSX dosyasından yapıldı ve `docs/TR_SEKTOR_PAKETLERI.md` §4
       tablosuyla birebir aynıdır. Metni alınamayan kontrol "metin girilmedi" derdi;
       yedi ekte de yoktur — sayı sıfırdır, ölçülmemiş değil. */
    const BEKLENEN: Record<string, { aile: number; kontrol: number }> = {
      'EPDK-SGYM-EK1': { aile: 12, kontrol: 476 }, 'EPDK-SGYM-EK2': { aile: 13, kontrol: 505 },
      'EPDK-SGYM-EK3': { aile: 13, kontrol: 565 }, 'EPDK-SGYM-EK4': { aile: 13, kontrol: 552 },
      'EPDK-SGYM-EK5': { aile: 13, kontrol: 551 }, 'EPDK-SGYM-EK6': { aile: 13, kontrol: 578 },
      'EPDK-SGYM-EK7': { aile: 12, kontrol: 464 },
    };
    const s = paketiDogrula(path.join(KOK, 'paketler', 'TR-ENERJI'));
    let toplamKontrol = 0;
    for (const [kod, b] of Object.entries(BEKLENEN)) {
      const c = s.icerik!.cerceveler.find((x) => x.kimlik.kod === kod)!;
      expect(c, `${kod} pakette yok`).toBeTruthy();
      const aile = c.maddeler.filter((mm) => mm.ustKod === null);
      const kontrol = c.maddeler.filter((mm) => mm.ustKod !== null);
      expect([aile.length, kontrol.length], kod).toEqual([b.aile, b.kontrol]);
      expect(kontrol.filter((mm) => maddeMetniDurumu(mm.metin) !== 'var'), `${kod}: metni olmayan kontrol`).toEqual([]);
      expect(aile.filter((mm) => mm.metin !== null), `${kod}: aile satırı metin taşıyor`).toEqual([]);
      /* Kaynağın kademe sözcüğü OLDUĞU GİBİ taşınır — kaynakta "Ek kontrol" ve
         "Ek Kontrol" birlikte geçer; sessiz düzeltme aktarımı kaynaktan uzaklaştırır. */
      expect(kontrol.filter((mm) => mm.gereksinimTipi === null), `${kod}: kademesiz kontrol`).toEqual([]);
      expect(kontrol.filter((mm) => (mm.gereksinimTipi ?? '').toLowerCase() === 'ek kontrol' && mm.zorunlulukTipi !== 'OPTIONAL'),
        `${kod}: "Ek kontrol" zorunlu sayıldı`).toEqual([]);
      toplamKontrol += kontrol.length;
    }
    expect(toplamKontrol, 'yedi ekin toplam kontrolü').toBe(3691);
  });

  it('kademe DÖRT kanonik sınıftır: ham dize sadık, gruplama anahtarı tek [URN-PKT-019]', () => {
    /* Kaynak aynı kademeyi iki yazımla taşıyor ("Ek Kontrol" / "Ek kontrol").
       Ham dize korunur (kaynağa sadakat); anahtar tekleştirilir, yoksa
       gruplayan ilk ekran tek kademeyi iki sınıf gösterir. */
    const s = paketiDogrula(path.join(KOK, 'paketler', 'TR-ENERJI'));
    const kontroller = s.icerik!.cerceveler
      .filter((c) => /^EPDK-SGYM-EK\d$/.test(c.kimlik.kod))
      .flatMap((c) => c.maddeler.filter((m) => m.ustKod !== null));
    const hamYazimlar = new Set(kontroller.map((m) => m.gereksinimTipi));
    const anahtarlar = new Set(kontroller.map((m) => kademeAnahtari(m.gereksinimTipi)));
    expect(hamYazimlar.size, 'kaynakta iki yazım bekleniyordu').toBeGreaterThan(anahtarlar.size);
    expect([...anahtarlar].sort()).toEqual(['ek kontrol', 'seviye 1', 'seviye 2', 'seviye 3']);
    expect(kademeAnahtari('  Ek   Kontrol ')).toBe('ek kontrol');
    expect(kademeAnahtari('')).toBeNull();
    expect(kademeAnahtari(null)).toBeNull();
  });

  it('Ek-3: 565 kontrol, 57 "Ek Kontrol" seviyesiz ve OPTIONAL — seviyesizlik sıfır değil [URN-PKT-019]', () => {
    const ek3 = cerceveleri().find((c) => c.kimlik.kod === 'EPDK-SGYM-EK3')!;
    const kontroller = ek3.maddeler.filter((m) => m.ustKod);
    expect(kontroller.length).toBe(565);
    /* EPDK kademesi ürünün HEDEF OLGUNLUĞU değildir (inceleme, PR #43 tur 2):
       `gereksinim_tipi` sütununda durur, `seviye` (olgunluk hedefi) boştur. */
    const sayim = (t: string) => kontroller.filter((m) => m.gereksinimTipi === t).length;
    expect([sayim('Seviye 1'), sayim('Seviye 2'), sayim('Seviye 3'), sayim('Ek Kontrol')]).toEqual([264, 213, 31, 57]);
    expect(kontroller.filter((m) => m.seviye !== null), 'EPDK kademesi hedef olgunluğa yazılmış').toEqual([]);
    expect(kontroller.filter((m) => m.gereksinimTipi === 'Ek Kontrol').every((m) => m.zorunlulukTipi === 'OPTIONAL')).toBe(true);
    expect(kontroller.filter((m) => m.gereksinimTipi !== 'Ek Kontrol').every((m) => m.zorunlulukTipi === 'REGULATION')).toBe(true);
  });

  it('iki çerçeve de uygulanabilirlik beyan eder; beyan dayanağını (madde) yazar [URN-PKT-020]', () => {
    for (const c of cerceveleri()) {
      expect(c.kimlik.uygulanabilirlik, c.kimlik.kod).toBeTruthy();
      expect(c.kimlik.uygulanabilirlik!.kapsamTurleri).toContain('tesis');
      expect(c.kimlik.uygulanabilirlik!.aciklama).toMatch(/MADDE \d/);
    }
  });

  it('lisans: kamuya açık, metin dâhil, FSEK md. 31 dayanağı kimliklerde yazılı [URN-PKT-019]', () => {
    expect(s.icerik!.manifest.lisans).toMatchObject({ tur: 'kamuya_acik', metinDahil: true });
    expect(s.icerik!.manifest.lisans.not).toMatch(/FSEK md\. 31/);
    for (const c of cerceveleri()) expect(c.kimlik.lisans.not, c.kimlik.kod).toMatch(/FSEK md\. 31/);
  });
});


/* ═══ YÜKÜMLÜLÜK DAYANAĞI · ATIF ÖLÇÜLÜR ═════════════════════════════

   Bağımsız inceleme bulgusu (P1, #48). `dayanak` serbest metindir ve
   HİÇBİR kapı onun kaynağa uyup uymadığını ölçmüyordu. Ölçüldü:
   `EPDK-USOM-OLAY` maddesinin dayanağı "Ek-1…Ek-7, OYS-50/56/59"
   diyordu; oysa USOM bildirim kriteri maddesinin KODU EKE GÖRE
   DEĞİŞİYOR — Ek-1/2'de OYS-50, Ek-3/4/5'te OYS-47, Ek-6'da OYS-56,
   Ek-7'de OYS-59. Yazılan atıf yedi ekin beşinde yanlış maddeyi
   gösteriyordu (yedekleme, iş sürekliliği, log senkronizasyonu) ve
   OYS-47 hiç yazılmamıştı. Biçim doğru, alan dolu, hiçbir kapı görmez:
   R-D'nin tarif ettiği sınıfın ta kendisi.

   Kapı ATFIN DOĞRULUĞUNU ölçemez ama ATFIN VAR OLDUĞUNU ölçebilir:
   `dayanak` bir "Ek-N ... OYS-MM" çifti sayıyorsa, o ek dosyasında o
   kodlu madde GERÇEKTEN durmalıdır. Kabul edilen sınır: maddenin
   İÇERİĞİNİN iddiayı desteklediğini bağımsız inceleme doğrular. */

describe('yükümlülük dayanağındaki madde atıfları paketin kendi metnine uyar', () => {
  const KOK = path.join(process.cwd(), 'paketler', 'TR-ENERJI');
  const yukumlulukler = JSON.parse(
    readFileSync(path.join(KOK, 'yukumlulukler.json'), 'utf8'),
  ) as { kod: string; dayanak: string; merci: string }[];

  /** "Ek-1/2 OYS-50" · "Ek-6 OYS-56" gibi çiftleri çıkarır. */
  function atiflar(dayanak: string): { ek: string; kod: string }[] {
    const cikan: { ek: string; kod: string }[] = [];
    for (const m of dayanak.matchAll(/Ek-([\d/]+)\s+(OYS-\d+)/g)) {
      for (const ek of m[1].split('/')) cikan.push({ ek, kod: m[2] });
    }
    return cikan;
  }

  /** Ekteki `kod → { baslik, metin }` eşlemesi (3. ve 4. sütun). */
  const ektekiMaddeler = (ek: string): Map<string, { baslik: string; metin: string }> => {
    const csv = readFileSync(path.join(KOK, 'cerceve', `EPDK-SGYM-EK${ek}.csv`), 'utf8');
    const m = new Map<string, { baslik: string; metin: string }>();
    for (const satir of csv.split('\n').slice(1)) {
      const s = satir.split(';');
      if (s[0]) m.set(s[0], { baslik: (s[2] ?? '').trim(), metin: (s[3] ?? '').trim() });
    }
    return m;
  };

  /** Merciden kısaltma: "… Merkezi (USOM)" → "USOM". */
  const merciKisaltmasi = (merci: string): string | null =>
    merci.match(/\(([A-ZÇĞİÖŞÜ]{2,10})\)/)?.[1] ?? null;

  /** `dayanak`ta tırnak içinde adı geçen kontrol başlığı. */
  const iddiaEdilenBaslik = (dayanak: string): string | null =>
    dayanak.match(/[""]([^""]+)[""]/)?.[1]?.trim() ?? null;

  it('atıf çıkarıcı, kısaltmalı yazımı (Ek-3/4/5) AÇAR', () => {
    /* Kalıp kendini ölçer: "Ek-3/4/5 OYS-47" tek eşleşmedir ama ÜÇ
       atıftır. Açmasaydı kapı yalnız ilk eki denetler, kalan ikisi
       sessizce ölçüsüz kalırdı. */
    expect(atiflar('… Ek-3/4/5 OYS-47, Ek-6 OYS-56 …')).toEqual([
      { ek: '3', kod: 'OYS-47' }, { ek: '4', kod: 'OYS-47' },
      { ek: '5', kod: 'OYS-47' }, { ek: '6', kod: 'OYS-56' },
    ]);
  });

  it('atıfta geçen HER madde, o ekte GERÇEKTEN vardır', () => {
    const kusurlar = kusurlariBul(yukumlulukler);
    const sayilan = yukumlulukler.reduce((n, y) => n + atiflar(y.dayanak).length, 0);
    expect(kusurlar, kusurlar.join('\n')).toEqual([]);
    /* Sıfır atıf ölçmek, hiçbir şeye bakmadan temiz raporlamaktır. */
    expect(sayilan, 'hiç madde atfı ölçülmedi — kalıp mı bozuldu').toBeGreaterThanOrEqual(7);
  });

  /** Kapının GERÇEK boru hattı — vaka da, sabotaj da bunu koşar. */
  function kusurlariBul(satirlar: { kod: string; dayanak: string; merci: string }[]): string[] {
    const kusurlar: string[] = [];
    for (const y of satirlar) {
      const iddia = iddiaEdilenBaslik(y.dayanak);
      for (const a of atiflar(y.dayanak)) {
        const madde = ektekiMaddeler(a.ek).get(a.kod);
        if (madde === undefined) {
          kusurlar.push(`${y.kod}: Ek-${a.ek} içinde ${a.kod} YOK`);
          continue;
        }
        const { baslik } = madde;
        /* VARLIK YETMEZ: aynı kod her ekte BAŞKA bir maddedir ve
           "doğru kod, yanlış ek" hatası varlık kontrolünden geçerdi —
           ölçüldü, `OYS-47` yedi ekin altısında mevcut ama yalnız
           üçünde USOM kriteridir. Atıf tırnak içinde bir kontrol
           BAŞLIĞI söylüyorsa, gösterilen maddenin başlığı O OLMALIDIR.
           Kapı hâlâ metnin iddiayı desteklediğini doğrulamaz (kabul
           edilmiş sınır) ama artık yanlış MADDEYİ gösteremez. */
        if (iddia !== null && baslik !== iddia) {
          kusurlar.push(`${y.kod}: Ek-${a.ek} ${a.kod} → "${baslik}" (iddia: "${iddia}")`);
          continue;
        }
        /* BAŞLIK DA YETMEZ — ölçüldü (#48 turu 2 sabotajı): EPDK AYNI
           başlığı farklı maddelerde kullanıyor, yani "doğru başlık,
           yanlış madde" başlık kontrolünden geçiyordu. Yükümlülüğün
           MERCİSİ bir kısaltma taşıyorsa (USOM) gösterilen maddenin
           METNİ o mercii anmalıdır: bir USOM bildirim yükümlülüğünün
           dayanağı, USOM'dan hiç söz etmeyen bir maddeye asılamaz.
           Kapı hâlâ metnin iddiayı TAM olarak desteklediğini
           doğrulamaz — o bağımsız incelemenin işi (§1.10). */
        const kisaltma = merciKisaltmasi(y.merci);
        if (kisaltma !== null && !madde.metin.includes(kisaltma)) {
          kusurlar.push(`${y.kod}: Ek-${a.ek} ${a.kod} metninde "${kisaltma}" geçmiyor`);
        }
      }
    }
    return kusurlar;
  }

  it('SABOTAJ: olmayan bir maddeye atıf KIRMIZI yakar', () => {
    /* İlk hâlinde bu vaka `atiflar` ve `ektekiKodlar` yardımcılarını AYRI
       AYRI sınıyordu; kapının kendi döngüsünü hiç koşmuyordu (bağımsız
       inceleme, #48 turu 2). Biri döngüyü ya da `toEqual([])` satırını
       gevşetse bu test yine yeşil kalırdı. Bugün sahte veri GERÇEK boru
       hattından geçer. */
    const M = 'Ulusal Siber Olaylara Müdahale Merkezi (USOM)';
    expect(kusurlariBul([{ kod: 'SAHTE', merci: M, dayanak: '"Bir Başlık" Ek-1 OYS-9999' }]))
      .toEqual(['SAHTE: Ek-1 içinde OYS-9999 YOK']);

    /* ASIL KUSUR SINIFI: kod VAR ama BAŞKA maddedir. Bu, gerçekte
       yaşanan hatanın ta kendisi (#48 turu 1: Ek-3'ün OYS-50'si USOM
       kriteri değil, "Olayların yaşam döngüsü"dür). */
    const yanlisEk = kusurlariBul([{
      kod: 'SAHTE', merci: M,
      dayanak: '"Siber Güvenlik Olaylarını Analiz Etme ve Bildirme" Ek-6 OYS-47',
    }]);
    expect(yanlisEk).toHaveLength(1);
    expect(yanlisEk[0]).toContain('iddia:');

    /* AYNI BAŞLIK, BAŞKA MADDE — gerçekte yaşanan hata (#48 turu 1):
       Ek-3'ün OYS-50'si de "Siber Güvenlik Olaylarını Analiz Etme ve
       Bildirme" başlığını taşır ama metni "Olayların yaşam döngüsü…"dür
       ve USOM'dan hiç söz etmez. Başlık kontrolü bunu GEÇİRİYORDU. */
    const ayniBaslik = kusurlariBul([{
      kod: 'SAHTE', merci: M,
      dayanak: '"Siber Güvenlik Olaylarını Analiz Etme ve Bildirme" Ek-3 OYS-50',
    }]);
    expect(ayniBaslik, 'aynı başlıklı YANLIŞ madde kapıdan geçti').toHaveLength(1);
    expect(ayniBaslik[0]).toContain('USOM');

    /* Doğru atıf temiz geçer — kapı her şeyi kırmızı yakmıyor. */
    expect(kusurlariBul([{
      kod: 'GERCEK', merci: M,
      dayanak: '"Siber Güvenlik Olaylarını Analiz Etme ve Bildirme" Ek-3 OYS-47',
    }])).toEqual([]);
  });
});
