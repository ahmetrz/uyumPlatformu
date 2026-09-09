import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
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

  it('ölçüm tabanı: paket geçerli, iki çerçeve, 601 madde', () => {
    expect(s.hatalar.map(hataSatiri)).toEqual([]);
    expect(s.sayilar).toMatchObject({ cerceveler: 2, maddeler: 601, kurallar: 2 });
  });

  it('metinli her maddede kaynak adresi ve erişim tarihi var; metinsiz madde uydurma köken taşımaz [URN-PKT-019]', () => {
    const maddeler = cerceveleri().flatMap((c) => c.maddeler);
    const metinli = maddeler.filter((m) => m.metin);
    expect(metinli.length).toBe(584); // 19 yönetmelik maddesi + 565 Ek-3 kontrolü
    expect(metinli.filter((m) => !m.kaynakUrl || !m.erisimTarihi)).toEqual([]);
    expect(new Set(metinli.map((m) => m.erisimTarihi))).toEqual(new Set(['2026-09-09']));
    expect(maddeler.filter((m) => !m.metin && (m.kaynakUrl === null))).toEqual([]); // başlık satırı da kaynağını söyler
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
