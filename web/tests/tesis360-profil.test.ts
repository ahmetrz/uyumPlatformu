import { describe, expect, it } from 'vitest';

/* F3 · Tesis 360 — OT mimari profilinin SAF katmanı (B6/B9 · B2).

   Bu modül veritabanına, React'e ve server-only'ye dokunmaz; test de
   dokunmaz (tests/envanter-mantik.test.ts kalıbı). Sabitlenen sözler:
     · boş alan "tanımsız" SÖZCÜĞÜYLE gösterilir, boş bırakılmaz;
     · üç durumlu boolean'da null "yok" DEĞİLDİR;
     · liste alanı virgül ya da noktalı virgülle girilir, noktalı
       virgülle saklanır (şema sözleşmesi), virgülle gösterilir;
     · formdan boş giden her alan null'a (bilinmiyor) döner;
     · B2: sektöre özgü alanlar (lisans, kabul, black start, TEİAŞ,
       kritiklik sınıfı…) çekirdekte YOKTUR; paketin şemasından gelir
       ve çekirdek onları adıyla değil tipiyle çizer. Şeması boş sektör
       (su) yalnız çekirdek alanları görür — enerji ile aynı kodla. */

import {
  BOS_PROFIL, BOS_SEKTOR_PROFILI, PROFIL_ALANLARI, PROFIL_GRUPLARI, SEKTOR_GRUBU_VARSAYILAN, TANIMSIZ,
  alanDegeri, formVarsayilani, formdanGirdi, listeyiAyristir, listeyiSakla,
  profilGruplari, profilSatirlari, seceneklerOku, sektorAlaniKur, sektorDegerleri, tanimsizSayisi,
  type OtProfili, type ProfilAlani, type SektorProfili,
} from '@/app/(kabuk)/(flagship)/tesisler/[id]/mantik';

const DOLU: OtProfili = {
  ...BOS_PROFIL,
  otMimariTipi: 'plc_scada',
  dcsSaglayici: null,
  scadaSaglayici: 'Örnek SCADA',
  plcAileleri: 'Siemens S7; ABB AC800M',
  uzaktanErisim: false,
  iotVar: true,
  internetMaruziyeti: 'sinirli',
  guncellendi: '2026-05-01T10:00:00.000Z',
};

const alan = (anahtar: ProfilAlani['anahtar']) =>
  PROFIL_ALANLARI.find((a) => a.anahtar === anahtar)!;

/* ── Kurgusal bir SEKTÖR PAKETİNİN şeması: enerji anahtarlarıyla değil,
      çekirdeğin hiç tanımadığı anahtarlarla — çekirdek adıyla bilseydi
      bu test onu yakalayamazdı. Türlerin dördü de temsil edilir. */
const KABUL = JSON.stringify([{ deger: 'gecici', ad: 'Geçici kabul' }, { deger: 'kesin', ad: 'Kesin kabul' }]);
const SEMA = [
  { anahtar: 'ruhsatNo', tip: 'metin', etiket: 'Ruhsat numarası', secenekler: null, grup: 'Ruhsat', birim: null },
  { anahtar: 'kabulAsamasi', tip: 'metin', etiket: 'Kabul aşaması', secenekler: KABUL, grup: 'Ruhsat', birim: null },
  { anahtar: 'kabulGunu', tip: 'tarih', etiket: 'Kabul günü', secenekler: null, grup: 'Ruhsat', birim: null },
  { anahtar: 'adaCalisma', tip: 'mantik', etiket: 'Ada çalışma', secenekler: null, grup: 'Şebeke', birim: null },
  { anahtar: 'hatUzunlugu', tip: 'sayi', etiket: 'Hat uzunluğu', secenekler: null, grup: 'Şebeke', birim: 'km' },
  /* Çekirdek grupla AYNI ada sahip sektör grubu: o grubun sonuna eklenir. */
  { anahtar: 'onemSinifi', tip: 'metin', etiket: 'Önem sınıfı', secenekler: KABUL, grup: 'Kritiklik ve maruziyet', birim: null },
  { anahtar: 'grupsuz', tip: 'metin', etiket: 'Grupsuz alan', secenekler: null, grup: null, birim: null },
];
const ALANLAR = SEMA.map(sektorAlaniKur);
const SATIRLAR = [
  { anahtar: 'ruhsatNo', sayisalDeger: null, metinDeger: 'R-42' },
  { anahtar: 'kabulAsamasi', sayisalDeger: null, metinDeger: 'kesin' },
  { anahtar: 'kabulGunu', sayisalDeger: null, metinDeger: '2021-03-15' },
  { anahtar: 'adaCalisma', sayisalDeger: 0, metinDeger: null },
  { anahtar: 'hatUzunlugu', sayisalDeger: 12.5, metinDeger: null },
];
const SEKTOR: SektorProfili = { alanlar: ALANLAR, degerler: sektorDegerleri(ALANLAR, SATIRLAR) };

describe('liste alanları', () => {
  it('virgül ve noktalı virgülü kabul eder, kırpar, tekrarı düşürür', () => {
    expect(listeyiAyristir(' Siemens S7 , ABB AC800M;siemens s7 ;; ')).toEqual(['Siemens S7', 'ABB AC800M']);
    expect(listeyiAyristir(null)).toEqual([]);
    expect(listeyiAyristir('')).toEqual([]);
  });

  it('noktalı virgülle saklar, boşu null yapar', () => {
    expect(listeyiSakla('Siemens S7, ABB AC800M')).toBe('Siemens S7; ABB AC800M');
    expect(listeyiSakla('  ,  ; ')).toBeNull();
    expect(listeyiSakla(null)).toBeNull();
  });
});

describe('gösterim — çekirdek', () => {
  it('boş alan "tanımsız" sözcüğünü taşır ve tanimsiz işaretlidir', () => {
    const s = alanDegeri(BOS_PROFIL, alan('dcsSaglayici'));
    expect(s.deger).toBe(TANIMSIZ);
    expect(s.tanimsiz).toBe(true);
  });

  it('üç durumlu boolean: true var, false yok, null tanımsız', () => {
    expect(alanDegeri(DOLU, alan('iotVar')).deger).toBe('var');
    expect(alanDegeri(DOLU, alan('uzaktanErisim')).deger).toBe('yok');
    expect(alanDegeri(DOLU, alan('kritikAltyapiStatusu')).deger).toBe(TANIMSIZ);
    // false "tanımsız" DEĞİLDİR — ölçülmüş bir hayırdır.
    expect(alanDegeri(DOLU, alan('uzaktanErisim')).tanimsiz).toBe(false);
  });

  it('seçim alanı insan sözüyle, bilinmeyen kod olduğu gibi', () => {
    expect(alanDegeri(DOLU, alan('otMimariTipi')).deger).toBe('PLC + SCADA');
    expect(alanDegeri(DOLU, alan('internetMaruziyeti')).deger).toBe('Sınırlı');
    expect(alanDegeri({ ...DOLU, otMimariTipi: 'baska' }, alan('otMimariTipi')).deger).toBe('baska');
  });

  it('liste virgülle gösterilir', () => {
    expect(alanDegeri(DOLU, alan('plcAileleri')).deger).toBe('Siemens S7, ABB AC800M');
  });

  it('profil kaydı yokken her alan tanımsızdır; gruplar tüm çekirdek alanları kapsar [PRT-OZT-002]', () => {
    const sayim = tanimsizSayisi(null);
    expect(sayim.tanimsiz).toBe(sayim.toplam);
    expect(sayim.toplam).toBe(PROFIL_ALANLARI.length);
    const gruplar = profilSatirlari(null);
    expect(gruplar.map((g) => g.ad)).toEqual(PROFIL_GRUPLARI.map((g) => g.ad));
    expect(gruplar.flatMap((g) => g.satirlar)).toHaveLength(PROFIL_ALANLARI.length);
    /* B2: şemadaki 12 OT profil kolonu (veriIslemeProfili hariç: eylem şeması
       taşımıyor). Sekiz enerji alanı artık burada DEĞİL — pakettedir. */
    expect(PROFIL_ALANLARI).toHaveLength(12);
    expect(new Set(PROFIL_ALANLARI.map((a) => a.anahtar)).size).toBe(12);
    expect(PROFIL_ALANLARI.map((a) => a.anahtar)).not.toContain('blackStart');
    expect(PROFIL_ALANLARI.map((a) => a.anahtar)).not.toContain('kritiklikSinifi');
  });

  it('dolu profilde tanımsız sayısı doğru düşer', () => {
    // DOLU'da 6 alan dolu: otMimariTipi, scadaSaglayici, plcAileleri,
    // uzaktanErisim (=false, ölçülmüş hayır), iotVar, internetMaruziyeti.
    expect(tanimsizSayisi(DOLU)).toEqual({ tanimsiz: 6, toplam: 12 });
  });
});

describe('sektör öznitelikleri (B2) — paketin şeması çekirdeğin adını bilmediği alanları çizer', () => {
  it('şema tipi alan türüne çevrilir: mantık → üç durum, seçenekli metin → seçim, tarih, sayı [TES-PRF-005]', () => {
    const tur = Object.fromEntries(ALANLAR.map((a) => [a.anahtar, a.tur]));
    expect(tur).toEqual({
      ruhsatNo: 'metin', kabulAsamasi: 'secim', kabulGunu: 'tarih',
      adaCalisma: 'ucDurum', hatUzunlugu: 'sayi', onemSinifi: 'secim', grupsuz: 'metin',
    });
    expect(ALANLAR.find((a) => a.anahtar === 'kabulAsamasi')?.secenekler).toEqual([
      { deger: 'gecici', ad: 'Geçici kabul' }, { deger: 'kesin', ad: 'Kesin kabul' },
    ]);
  });

  it('bozuk ya da boş seçenek JSON\'u sessizce "geçerli" sayılmaz: alan metin kalır', () => {
    expect(seceneklerOku(null)).toBeNull();
    expect(seceneklerOku('{bozuk')).toBeNull();
    expect(seceneklerOku('[]')).toBeNull();
    expect(seceneklerOku('[{"ad":"eksik deger"}]')).toBeNull();
    expect(sektorAlaniKur({ ...SEMA[1], secenekler: '{bozuk' }).tur).toBe('metin');
  });

  it('satır değerleri: mantık 0/1 → boolean, sayı → number, satır yoksa null (ölçülmedi ≠ sıfır)', () => {
    expect(SEKTOR.degerler).toEqual({
      ruhsatNo: 'R-42', kabulAsamasi: 'kesin', kabulGunu: '2021-03-15',
      adaCalisma: false, hatUzunlugu: 12.5, onemSinifi: null, grupsuz: null,
    });
  });

  it('gruplar: sektör grupları ilk çekirdek grubun ardına girer, çekirdekle aynı adlı grup ona eklenir, grupsuz alan varsayılan grupta', () => {
    const gruplar = profilGruplari(SEKTOR);
    expect(gruplar.map((g) => g.ad)).toEqual([
      'OT mimarisi', 'Ruhsat', 'Şebeke', SEKTOR_GRUBU_VARSAYILAN, 'Kritiklik ve maruziyet', 'Yerel altyapı',
    ]);
    const kritiklik = gruplar.find((g) => g.ad === 'Kritiklik ve maruziyet')!;
    expect(kritiklik.alanlar.map((a) => a.anahtar)).toEqual([
      'kritikAltyapiStatusu', 'internetMaruziyeti', 'uzaktanErisim', 'onemSinifi',
    ]);
    expect(kritiklik.alanlar.at(-1)?.kaynak).toBe('sektor');
    expect(kritiklik.alanlar.at(-1)?.formAnahtari).toBe('oz:onemSinifi');
  });

  it('gösterim: sektör satırları çekirdekle aynı sözleşmeyi taşır — sayı birimiyle, tarih tr-TR, mantık var/yok, boş tanımsız', () => {
    const satirlar = profilSatirlari(DOLU, SEKTOR).flatMap((g) => g.satirlar);
    const deger = (formAnahtari: string) => satirlar.find((s) => s.anahtar === formAnahtari)!;
    expect(deger('oz:hatUzunlugu').deger).toBe('12.5 km');
    expect(deger('oz:kabulGunu').deger).toBe('15.03.2021');
    expect(deger('oz:kabulAsamasi').deger).toBe('Kesin kabul');
    expect(deger('oz:adaCalisma').deger).toBe('yok');
    expect(deger('oz:adaCalisma').tanimsiz).toBe(false);
    expect(deger('oz:onemSinifi').deger).toBe(TANIMSIZ);
    expect(deger('oz:onemSinifi').tanimsiz).toBe(true);
    expect(deger('oz:ruhsatNo').etiket).toBe('Ruhsat numarası');
  });

  it('tanımsız sayısı çekirdek + paket alanı: 12 + 7 = 19; su gibi şemasız sektörde 12 (K4)', () => {
    expect(tanimsizSayisi(DOLU, SEKTOR)).toEqual({ tanimsiz: 6 + 2, toplam: 19 });
    expect(tanimsizSayisi(DOLU, BOS_SEKTOR_PROFILI)).toEqual({ tanimsiz: 6, toplam: 12 });
    expect(profilGruplari(BOS_SEKTOR_PROFILI).map((g) => g.ad)).toEqual(PROFIL_GRUPLARI.map((g) => g.ad));
  });
});

describe('form', () => {
  it('varsayılan form kayıttan dolar: üç durum evet/hayir/boş, tarih YYYY-MM-DD, sektör alanı oz: önekiyle', () => {
    const f = formVarsayilani(DOLU, SEKTOR);
    expect(f.iotVar).toBe('evet');
    expect(f.uzaktanErisim).toBe('hayir');
    expect(f.kritikAltyapiStatusu).toBe('');
    expect(f.plcAileleri).toBe('Siemens S7, ABB AC800M');
    expect(f.dcsSaglayici).toBe('');
    expect(f['oz:adaCalisma']).toBe('hayir');
    expect(f['oz:kabulGunu']).toBe('2021-03-15');
    expect(f['oz:hatUzunlugu']).toBe('12.5');
    expect(f['oz:onemSinifi']).toBe('');
    // Profil ve öznitelik satırı yokken her alan boş metin; sektör DEĞERİ
    // varsa profil kaydı olmasa da form onu taşır (iki kaynak bağımsız).
    const BOS_SEKTOR = { alanlar: ALANLAR, degerler: {} };
    expect(Object.values(formVarsayilani(null, BOS_SEKTOR)).every((v) => v === '')).toBe(true);
    expect(formVarsayilani(null, SEKTOR)['oz:ruhsatNo']).toBe('R-42');
  });

  it('boş giden her alan null (bilinmiyor) olur; tesisId taşınır; paketin HER anahtarı girdide vardır', () => {
    const BOS_SEKTOR = { alanlar: ALANLAR, degerler: {} };
    const g = formdanGirdi('tesis-1', formVarsayilani(null, BOS_SEKTOR), BOS_SEKTOR);
    expect(g.tesisId).toBe('tesis-1');
    const { tesisId: _t, oznitelikler, ...kalan } = g;
    void _t;
    expect(Object.values(kalan).every((v) => v === null)).toBe(true);
    /* Boş bırakılan anahtar da girdidedir (null) — sunucu satırı SİLER;
       anahtarı atlamak "değişmedi" demek olurdu, "silindi" değil. */
    expect(Object.keys(oznitelikler).sort()).toEqual(SEMA.map((s) => s.anahtar).sort());
    expect(Object.values(oznitelikler).every((v) => v === null)).toBe(true);
  });

  it('gidiş-dönüş: kayıt → form → girdi aynı anlamı korur (çekirdek ve sektör)', () => {
    const g = formdanGirdi('tesis-1', formVarsayilani(DOLU, SEKTOR), SEKTOR);
    expect(g.otMimariTipi).toBe('plc_scada');
    expect(g.scadaSaglayici).toBe('Örnek SCADA');
    expect(g.plcAileleri).toBe('Siemens S7; ABB AC800M');
    expect(g.uzaktanErisim).toBe(false);
    expect(g.iotVar).toBe(true);
    expect(g.kritikAltyapiStatusu).toBeNull();
    expect(g.internetMaruziyeti).toBe('sinirli');
    expect(g.oznitelikler).toEqual({
      ruhsatNo: 'R-42', kabulAsamasi: 'kesin', kabulGunu: '2021-03-15',
      adaCalisma: false, hatUzunlugu: 12.5, onemSinifi: null, grupsuz: null,
    });
  });

  it('geçersiz seçim, tarih ya da sayı kaydedilmez, null\'a düşer; metin kırpılır; virgüllü ondalık kabul', () => {
    const f = { ...formVarsayilani(null, SEKTOR), otMimariTipi: 'uydurma',
      dcsSaglayici: '  Örnek DCS  ', plcAileleri: 'S7,S7, ',
      'oz:kabulAsamasi': 'uydurma', 'oz:kabulGunu': '15/03/2021', 'oz:hatUzunlugu': '3,5',
      'oz:adaCalisma': 'belki', 'oz:ruhsatNo': '  R-1 ' };
    const g = formdanGirdi('t', f, SEKTOR);
    expect(g.otMimariTipi).toBeNull();
    expect(g.dcsSaglayici).toBe('Örnek DCS');
    expect(g.plcAileleri).toBe('S7');
    expect(g.oznitelikler.kabulAsamasi).toBeNull();
    expect(g.oznitelikler.kabulGunu).toBeNull();
    expect(g.oznitelikler.hatUzunlugu).toBe(3.5);
    expect(g.oznitelikler.adaCalisma).toBeNull();
    expect(g.oznitelikler.ruhsatNo).toBe('R-1');
  });
});
