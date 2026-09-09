import { describe, expect, it } from 'vitest';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { CSV_BASLIK, SOZLUK_SATIRI, cerceve, paketYaz } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · PAKET DOĞRULAYICI (URN-PKT-001 · URN-PKT-002)

   Sözleşme §3: kod bilmeyen biri paketi yazabilmeli — doğrulayıcı "hata
   var" demez; dosya:konum — SINIF: ne yanlış → nasıl düzeltilir der. Tek
   hata paketi reddeder; kurucu ancak `ok` paketi yazar.
   ═══════════════════════════════════════════════════════════════════════ */

const TEMIZ = {
  'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
  'kapsam-turleri.json': [{ kod: 'sistem', ad: 'Bilgi sistemi', etiketAnahtari: null, tesiseBagli: false, sira: 10 }],
  'oznitelikler.json': [
    { anahtar: 'aktifBuyuklugu', tip: 'sayi', birim: 'milyon TL', etiketAnahtari: 'aktifBuyuklugu', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: true, sira: 1 },
  ],
  'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: true }),
  'cerceve/TEST-REG.csv': `${CSV_BASLIK}\nB1;;Birinci Bölüm;;0;;\n1;B1;Amaç;Bu yönetmeliğin amacı test etmektir.;1;;\n2;B1;Kapsam;Kapsam metni.;2;2;LAW\n`,
  'yukumlulukler.json': [{ kod: 'TEST-BILDIRIM', ad: 'Olay bildirimi', regulasyonKod: 'TEST-REG', asgariSiddet: 'yuksek', sureSaat: 72, dayanak: 'md. 2', merci: 'Kurum' }],
};

const siniflar = (dizin: string) => paketiDogrula(dizin).hatalar.map((h) => `${h.sinif}|${h.dosya}|${h.konum ?? ''}`);

describe('paket doğrulayıcı — biçim ve manifest [URN-PKT-001]', () => {
  it('temiz paket geçer ve sayıları sayar', () => {
    const s = paketiDogrula(paketYaz(TEMIZ));
    expect(s.hatalar.map(hataSatiri)).toEqual([]);
    expect(s.ok).toBe(true);
    expect(s.sayilar).toEqual({ sozluk: 1, kapsamTurleri: 1, oznitelikler: 1, cerceveler: 1, maddeler: 3, yukumlulukler: 1 });
    expect(s.icerik?.cerceveler[0].maddeler[1]).toMatchObject({ kod: '1', ustKod: 'B1', baslik: 'Amaç', sira: 1, seviye: null });
    expect(s.icerik?.cerceveler[0].maddeler[2]).toMatchObject({ kod: '2', seviye: 2, zorunlulukTipi: 'LAW' });
  });

  it('eksik alan → BIÇIM, konum adıyla; sürüm SemVer değilse SÜRÜM [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz(TEMIZ, { yayinci: undefined, surum: '1.0' }));
    expect(s.ok).toBe(false);
    expect(s.hatalar.some((h) => h.sinif === 'BIÇIM' && h.konum === 'yayinci')).toBe(true);
    expect(s.hatalar.some((h) => h.sinif === 'SÜRÜM' && h.konum === 'surum')).toBe(true);
    for (const h of s.hatalar) expect(h.duzeltme.length, hataSatiri(h)).toBeGreaterThan(10);
  });

  it('bilinmeyen manifest alanı reddedilir — yazım hatası sessizce yutulmaz [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz(TEMIZ, { yayinci2: 'x' }));
    expect(s.hatalar.map((h) => h.mesaj).join(' ')).toMatch(/bilinmeyen alan: yayinci2/);
  });

  it('özet uyuşmazlığı, listede olmayan dosya ve eksik dosya üçü de BIÇIM [URN-PKT-001]', () => {
    expect(siniflar(paketYaz(TEMIZ, {}, { ozetBoz: 'sozluk.json' }))).toContain('BIÇIM|sozluk.json|');
    expect(siniflar(paketYaz(TEMIZ, {}, { ozetsiz: ['sozluk.json'] }))).toContain('BIÇIM|sozluk.json|');
    const s = paketiDogrula(paketYaz(TEMIZ, { icerikOzetleri: { 'yok.json': 'a'.repeat(64) } }));
    expect(s.hatalar.some((h) => h.dosya === 'yok.json' && h.mesaj.includes('dosya yok'))).toBe(true);
  });

  it('tur=sektor sektör ister; yatay paket sektör, öznitelik ve sözlük taşıyamaz [URN-PKT-001]', () => {
    expect(siniflar(paketYaz(TEMIZ, { sektor: null }))).toContain('BIÇIM|manifest.json|sektor');
    const y = paketiDogrula(paketYaz(TEMIZ, { tur: 'yatay', sektor: null }));
    expect(y.hatalar.map((h) => h.sinif)).toEqual(expect.arrayContaining(['ÖZNİTELİK', 'SÖZLÜK']));
  });

  it('madde ağacı: kod tekrarı ve sonra gelen üst madde KİMLİK — düzeltme cümlesi sözleşmedeki gibi [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMIZ,
      'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;B1;Amaç;m;0;;\n1;;Tekrar;m;1;;\nB1;;Bölüm;;2;;\n` }));
    const kimlik = s.hatalar.filter((h) => h.sinif === 'KİMLİK');
    expect(kimlik).toHaveLength(2);
    expect(kimlik[0].mesaj).toBe('"ust_kod" değeri "B1" bulunamadı');
    expect(kimlik[0].duzeltme).toBe('üst madde satırı bu satırdan ÖNCE gelmeli');
    expect(kimlik[0].konum).toBe('2');
  });

  it('CSV başlığında zorunlu sütun eksikse ya da bilinmeyen sütun varsa BIÇIM [URN-PKT-001]', () => {
    expect(siniflar(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': 'kod;baslik\n1;Amaç\n' }))).toContain('BIÇIM|cerceve/TEST-REG.csv|1');
    expect(siniflar(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': `${CSV_BASLIK};ekstra\n1;;Amaç;;0;;;x\n` }))).toContain('BIÇIM|cerceve/TEST-REG.csv|1');
  });

  it('sözlükte boş hâl SÖZLÜK; bilinmeyen rol, metinde birim ve iki kapasite ÖZNİTELİK; tür kodu büyük harfse KAPSAM TÜRÜ [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMIZ,
      'sozluk.json': [{ ...SOZLUK_SATIRI('tesis', 'şube'), yonelme: '' }],
      'oznitelikler.json': [
        { anahtar: 'a', tip: 'metin', birim: 'kg', etiketAnahtari: 'a', rol: 'kritiklik', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 1 },
        { anahtar: 'b', tip: 'sayi', birim: 'MW', etiketAnahtari: 'b', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 2 },
        { anahtar: 'c', tip: 'sayi', birim: 'MW', etiketAnahtari: 'c', rol: 'kapasite', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 3 },
        { anahtar: 'd', tip: 'sayi', birim: null, etiketAnahtari: 'd', rol: 'bilinmeyen', grup: null, secenekler: null, kuraldaKullanilir: false, sira: 4 },
      ],
      'kapsam-turleri.json': [{ kod: 'Sistem', ad: 'x', etiketAnahtari: null, tesiseBagli: false, sira: 1 }],
    }));
    const s2 = s.hatalar.map((h) => h.sinif);
    expect(s2).toContain('SÖZLÜK');
    expect(s2).toContain('KAPSAM TÜRÜ');
    expect(s.hatalar.filter((h) => h.sinif === 'ÖZNİTELİK').length).toBeGreaterThanOrEqual(3);
    expect(s.hatalar.some((h) => h.mesaj.includes('rol=kapasite 2 öznitelikte'))).toBe(true);
  });

  it('dizin adı manifest koduyla uyuşmalı — kopyalanmış dizin BAŞKA paketi kuramaz: KİMLİK [URN-PKT-001]', () => {
    /* Ölçüldü: `paketler/TR-YENI` içinde `manifest.kod = TR-ESKI` istenen
       kodu değil TR-ESKI'yi kuruyor, onun satırlarını eziyordu (inceleme bulgusu). */
    const s = paketiDogrula(paketYaz(TEMIZ, { kod: 'TR-ESKI' }, { dizinAdi: 'TR-YENI' }));
    expect(s.ok).toBe(false);
    const k = s.hatalar.find((h) => h.sinif === 'KİMLİK' && h.konum === 'kod');
    expect(k?.mesaj).toBe('manifest kodu "TR-ESKI" dizin adıyla uyuşmuyor: "TR-YENI"');
    expect(k?.duzeltme).toMatch(/paketler\/TR-ESKI/);
    expect(paketiDogrula(paketYaz(TEMIZ, { kod: 'TR-ESKI' })).ok).toBe(true);
  });

  it('CSV: tekrar eden başlık ve başlığı aşan dolu hücre BIÇIM — telifli metin ikinci "metin" sütunundan ya da satır sonundan kaçamaz [URN-PKT-002]', () => {
    const telifli = { ...TEMIZ, 'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'telifli', metinDahil: false }) };
    // ilk `metin` boş, kaçak tam metin ikinci `metin` sütununda — eskiden GEÇİYORDU
    const tekrar = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK};metin\n1;;Amaç;;0;;;Gizli tam metin\n` }));
    expect(tekrar.ok).toBe(false);
    expect(tekrar.hatalar.some((h) => h.sinif === 'BIÇIM' && h.konum === '1' && /tekrar ediyor: metin/.test(h.mesaj))).toBe(true);
    // başlıktan fazla DOLU hücre
    const tasan = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;;Gizli tam metin\n` }));
    expect(tasan.ok).toBe(false);
    expect(tasan.hatalar.some((h) => h.sinif === 'BIÇIM' && h.konum === '2' && /başlığı aşan 1 dolu hücre/.test(h.mesaj))).toBe(true);
    // sondaki boş `;` (elle yazılmış CSV) içerik taşımaz — geçer
    const bos = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;;\n` }));
    expect(bos.ok, bos.hatalar.map(hataSatiri).join('\n')).toBe(true);
  });

  it('hata satırı biçimi: dosya:konum — SINIF: mesaj → düzeltme [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz(TEMIZ, { surum: 'x' }));
    expect(hataSatiri(s.hatalar[0])).toMatch(/^manifest\.json:surum — SÜRÜM: .+ → .+$/);
  });

  it('paket dizini yoksa BIÇIM, çökme yok [URN-PKT-001]', () => {
    const s = paketiDogrula('/yok/boyle/bir/dizin');
    expect(s.ok).toBe(false);
    expect(s.hatalar[0].sinif).toBe('BIÇIM');
  });
});

describe('lisans sınırı — alanda, yorumda değil [URN-PKT-002]', () => {
  const telifli = { ...TEMIZ, 'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'telifli', metinDahil: false }) };

  it('telifli çerçeve metin taşıyorsa LİSANS: "lisans sınırı: <kod> telifli, metin girilemez" [URN-PKT-002]', () => {
    const s = paketiDogrula(paketYaz(telifli));
    const l = s.hatalar.filter((h) => h.sinif === 'LİSANS');
    expect(l.length).toBe(2); // iki maddede metin var
    expect(l[0].mesaj).toMatch(/^lisans sınırı: TEST-REG telifli, metin girilemez/);
  });

  it('telifli çerçevede başlık 120 karakteri aşamaz; metinsiz yapı GEÇER [URN-PKT-002]', () => {
    const uzun = 'a'.repeat(121);
    const s = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;${uzun};;0;;\n` }));
    expect(s.hatalar.map((h) => h.sinif)).toEqual(['LİSANS']);
    const temiz = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\nA.5;;Organizasyonel kontroller;;0;;\nA.5.1;A.5;Bilgi güvenliği politikaları;;1;;\n` }));
    expect(temiz.ok, temiz.hatalar.map(hataSatiri).join('\n')).toBe(true);
  });

  it('telifli + metinDahil=true çelişkisi hem manifestte hem çerçevede LİSANS [URN-PKT-002]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'telifli', metinDahil: true }) },
      { lisans: { tur: 'telifli', metinDahil: true } }));
    expect(s.hatalar.filter((h) => h.sinif === 'LİSANS' && h.konum === 'lisans.metinDahil').length).toBe(2);
  });

  it('kamuya açık ama metinDahil=false (iskelet) → metin taşıyan satır LİSANS; metinsiz geçer [URN-PKT-002]', () => {
    const iskelet = { ...TEMIZ, 'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: false }) };
    expect(paketiDogrula(paketYaz(iskelet)).hatalar.map((h) => h.sinif)).toEqual(['LİSANS', 'LİSANS']);
    const temiz = paketiDogrula(paketYaz({ ...iskelet, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n` }));
    expect(temiz.ok).toBe(true);
  });
});
