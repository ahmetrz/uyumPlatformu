import { describe, expect, it } from 'vitest';
import { MADDE_SUTUNLARI, takvimTarihi } from '@/lib/paket/bicim';
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
    expect(s.sayilar).toEqual({ sozluk: 1, kapsamTurleri: 1, oznitelikler: 1, cerceveler: 1, maddeler: 3, yukumlulukler: 1, formlar: 0, raporlar: 0, roller: 0, eslemeler: 0, kaynaklar: 0, kurallar: 0 });
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

  it('ust_kod kendisine eşit satır KİMLİK — öz-referans üst madde değildir, kurulumda köke düşmez [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;1;Kendine bağlı;m;0;;\n` }));
    expect(s.hatalar.map((h) => [h.sinif, h.konum, h.mesaj])).toEqual([['KİMLİK', '2', '"ust_kod" değeri "1" bulunamadı']]);
  });

  it('sektörsüz paket (uluslararasi, sektor=null) sözlük ve öznitelik beyan edemez — kurucu sessizce düşürmesin [URN-PKT-001]', () => {
    /* Ölçüldü: ölçüt yalnız tur=yatay idi; sektörsüz uluslararasi paket geçiyor,
       kurucu sektorId boş diye döngüyü kırıp içeriği düşürüyordu (inceleme bulgusu). */
    const s = paketiDogrula(paketYaz(TEMIZ, { tur: 'uluslararasi', ulke: null, sektor: null }));
    expect(s.ok).toBe(false);
    expect(s.hatalar.map((h) => h.sinif)).toEqual(expect.arrayContaining(['ÖZNİTELİK', 'SÖZLÜK']));
    expect(s.hatalar.find((h) => h.sinif === 'SÖZLÜK')?.mesaj).toMatch(/sektörsüz paket \(tur=uluslararasi\)/);
  });

  it('seviye 0–5 dışındaysa BIÇIM (ürünün olgunluk ölçeği); 5 geçer [URN-PKT-001]', () => {
    for (const s of ['6', '-1', '99']) {
      const r = paketiDogrula(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;m;0;${s};\n` }));
      expect(r.hatalar.some((h) => h.sinif === 'BIÇIM' && h.konum === '2' && /seviye 0–5 aralığında/.test(h.mesaj)), `seviye ${s}`).toBe(true);
    }
    const bes = paketiDogrula(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;m;0;5;\n` }));
    expect(bes.ok, bes.hatalar.map(hataSatiri).join('\n')).toBe(true);
  });

  it('takvimde olmayan tarih (2025-02-30, 2025-13-01) BIÇIM — biçim yetmez, gidiş-dönüş eşitliği ister [URN-PKT-001]', () => {
    expect(takvimTarihi('2025-02-30')).toBe(false);
    expect(takvimTarihi('2025-13-01')).toBe(false);
    expect(takvimTarihi('2025-02-29')).toBe(false);
    expect(takvimTarihi('2024-02-29')).toBe(true);
    expect(takvimTarihi('2024-1-5')).toBe(false);
    const s = paketiDogrula(paketYaz({ ...TEMIZ,
      'cerceve/TEST-REG.json': cerceve('TEST-REG', { tur: 'kamuya_acik', metinDahil: true }, { yayimTarihi: '2025-02-30', yururlukTarih: '2025-13-01' }) }));
    expect(s.ok).toBe(false);
    expect(s.hatalar.filter((h) => h.sinif === 'BIÇIM').map((h) => h.konum)).toEqual(['yayimTarihi', 'yururlukTarih']);
  });

  it('kapanmamış tırnak BIÇIM — dosyanın kalanı tek hücreye yutulmaz, satır numarası söylenir [URN-PKT-001]', () => {
    const s = paketiDogrula(paketYaz({ ...TEMIZ, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;"açık kaldı;0;;\n2;;Kapsam;m;1;;\n` }));
    expect(s.ok).toBe(false);
    const h = s.hatalar.find((x) => x.sinif === 'BIÇIM' && x.dosya === 'cerceve/TEST-REG.csv');
    expect(h?.mesaj).toMatch(/kapanmamış tırnak: 2\. satırda/);
    expect(s.sayilar.maddeler).toBe(0);
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

  it('paket yapısında yeri olmayan dosya BIÇIM — özeti doğru olsa da hiçbir tanımlayıcı okumaz, lisans kontrolü göremezdi [URN-PKT-002]', () => {
    /* Ölçüldü: `cerceve/tam-metin.csv` doğru özetle listelenince geçiyor,
       hiçbir kimlik onu okumuyor ama pakette taşınıyordu (inceleme bulgusu). */
    const s = paketiDogrula(paketYaz({ ...telifli, 'cerceve/tam-metin.csv': `${CSV_BASLIK}\n1;;Amaç;Gizli tam metin;0;;\n`, 'notlar.txt': 'başka bir metin' }));
    expect(s.ok).toBe(false);
    const yersiz = s.hatalar.filter((h) => h.sinif === 'BIÇIM' && /yeri olmayan dosya/.test(h.mesaj)).map((h) => h.dosya).sort();
    expect(yersiz).toEqual(['cerceve/tam-metin.csv', 'notlar.txt']);
    const temiz = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${CSV_BASLIK}\n1;;Amaç;;0;;\n` }));
    expect(temiz.ok, temiz.hatalar.map(hataSatiri).join('\n')).toBe(true);
  });

  it('telifli çerçevede kanit_beklentisi serbest metindir → LİSANS; dis_kontrol_id 60 karakteri aşamaz; kısa kimlik geçer [URN-PKT-002]', () => {
    /* Ölçüldü: tekrar başlık ve fazla hücre kapandıktan sonra tam metin,
       tanınan ama sınırsız `kanit_beklentisi` sütununa konabiliyordu (inceleme bulgusu). */
    const baslik = MADDE_SUTUNLARI.join(';');
    const kacak = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${baslik}\n1;;Amaç;;0;;;Gizli madde metni buraya kaçırıldı;\n` }));
    expect(kacak.hatalar.map((h) => h.sinif)).toEqual(['LİSANS']);
    expect(kacak.hatalar[0].mesaj).toMatch(/kanit_beklentisi serbest metindir/);
    const uzunKimlik = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${baslik}\n1;;Amaç;;0;;;;${'K'.repeat(61)}\n` }));
    expect(uzunKimlik.hatalar.map((h) => h.sinif)).toEqual(['LİSANS']);
    const temiz = paketiDogrula(paketYaz({ ...telifli, 'cerceve/TEST-REG.csv': `${baslik}\n1;;Amaç;;0;;;;A.5.1\n` }));
    expect(temiz.ok, temiz.hatalar.map(hataSatiri).join('\n')).toBe(true);
    expect(temiz.icerik?.cerceveler[0].maddeler[0]).toMatchObject({ disKontrolId: 'A.5.1', kanitBeklentisi: null });
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


/* ═══ YÜKÜMLÜLÜK TETİKLEYİCİSİ · TÜR İLE ALANLAR TUTARLI OLMALI ═══════

   Ölçüldü (#49, R-E): bu kural yazıldı ve HİÇBİR TEST onu sınamadı —
   sabotaj turunda kaldırıldığında bütün küme yeşil kaldı. Kırmızı
   yakmayan sabotaj bir bulgudur; kural değil, testi eksikti.

   Kusur sınıfı R-D'nin ta kendisi: bir takvim yükümlülüğüne `sureSaat`
   yazmak ya da bir olay yükümlülüğüne `donem` yazmak, biçimi geçerli ve
   değeri aralıkta bir satır üretir. `asgariSiddet` takvim tetiklide
   anlamsızdır, `donem` olay tetiklide anlamsızdır; ikisi de sessizce
   yanlış davranır. */

const YUK = {
  kod: 'Y-1', ad: 'Test yükümlülüğü', asgariSiddet: 'yuksek',
  dayanak: 'Kurgusal', merci: 'Kurgusal Merci',
};

/** Doğrulama sonucunu tek satıra çevirir; temizse boş dize. */
const hatalar = (satir: Record<string, unknown>): string => {
  const r = paketiDogrula(paketYaz({ 'yukumlulukler.json': [satir] }));
  return r.hatalar.map(hataSatiri).join(' | ');
};

describe('yükümlülük tetikleyicisi: tür ile alanlar tutarlı [URN-PKT-001]', () => {
  it('OLAY tetikli · süre ile geçerli', () => {
    const h = hatalar({ ...YUK, sureSaat: 72 });
    expect(h, h).toBe('');
  });

  it('OLAY tetikli · süresi BOŞ da geçerli — mevzuat süre vermemiş olabilir', () => {
    const h = hatalar({ ...YUK, sureSaat: null });
    expect(h, h).toBe('');
  });

  it('OLAY tetikliye DÖNEM yazılamaz', () => {
    const h = hatalar({ ...YUK, sureSaat: 72, donem: 'yillik' });
    expect(h).toMatch(/donem.*KULLANILMAZ|KULLANILMAZ.*donem/);
  });

  it('OLAY tetikliye TESLİM GÜNÜ yazılamaz', () => {
    const h = hatalar({ ...YUK, sureSaat: 72, teslimGun: 30 });
    expect(h).toMatch(/teslimGun/);
  });

  it('TAKVİM tetikli · dönem ve teslim günüyle geçerli', () => {
    const h = hatalar({
      ...YUK, tetikleyici: 'takvim', sureSaat: null,
      donem: 'yillik', donemBaslangici: '01-01', teslimGun: 30,
    });
    expect(h, h).toBe('');
  });

  it('TAKVİM tetikliye SÜRE SAAT yazılamaz — süre olaydan değil dönemden sayılır', () => {
    const h = hatalar({ ...YUK, tetikleyici: 'takvim', sureSaat: 72, donem: 'yillik' });
    expect(h).toMatch(/sureSaat/);
  });

  it('TAKVİM tetikli · dönemi BOŞ da geçerli — mevzuat periyot vermemiş olabilir', () => {
    /* Dönem açılmaz ve ekran bunu söyler; paket geçersiz DEĞİLDİR.
       Bilinmeyen ≠ sıfır: eksik bilgiyi reddetmek, kiracıyı bir sayı
       uydurmaya zorlardı. */
    const h = hatalar({ ...YUK, tetikleyici: 'takvim', sureSaat: null, donem: null });
    expect(h, h).toBe('');
  });

  it('teslim günü SIFIR olamaz — dönem biter bitmez geçmiş bir sayaçtır', () => {
    const h = hatalar({
      ...YUK, tetikleyici: 'takvim', sureSaat: null, donem: 'yillik', teslimGun: 0,
    });
    expect(h).toMatch(/teslimGun/);
  });

  it('dönem başlangıcı BİÇİMLİDİR — "MM-DD", 29–31 kabul edilmez', () => {
    /* 29–31 her ayda yoktur; kabul edilseydi şubatta dönem kayardı. */
    for (const kotu of ['1-1', '2026-01-01', '13-01', '01-31', 'ocak']) {
      const h = hatalar({
        ...YUK, tetikleyici: 'takvim', sureSaat: null,
        donem: 'aylik', donemBaslangici: kotu,
      });
      expect(h, `"${kotu}" kabul edildi`).toMatch(/donemBaslangici/);
    }
  });

  it('bilinmeyen TETİKLEYİCİ reddedilir', () => {
    const h = hatalar({ ...YUK, sureSaat: 72, tetikleyici: 'ayin_hali' });
    expect(h).toMatch(/tetikleyici/);
  });
});
