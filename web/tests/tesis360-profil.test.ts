import { describe, expect, it } from 'vitest';

/* F3 · Plant 360 — OT mimari profilinin SAF katmanı (B6/B9).

   Bu modül veritabanına, React'e ve server-only'ye dokunmaz; test de
   dokunmaz (tests/envanter-mantik.test.ts kalıbı). Sabitlenen sözler:
     · boş alan "tanımsız" SÖZCÜĞÜYLE gösterilir, boş bırakılmaz;
     · üç durumlu boolean'da null "yok" DEĞİLDİR;
     · liste alanı virgül ya da noktalı virgülle girilir, noktalı
       virgülle saklanır (şema sözleşmesi), virgülle gösterilir;
     · formdan boş giden her alan null'a (bilinmiyor) döner. */

import {
  BOS_PROFIL, PROFIL_ALANLARI, PROFIL_GRUPLARI, TANIMSIZ,
  alanDegeri, formVarsayilani, formdanGirdi, listeyiAyristir, listeyiSakla,
  profilSatirlari, tanimsizSayisi,
  type OtProfili, type ProfilAlani,
} from '@/app/(kabuk)/(flagship)/tesisler/[id]/mantik';

const DOLU: OtProfili = {
  ...BOS_PROFIL,
  otMimariTipi: 'plc_scada',
  dcsSaglayici: null,
  scadaSaglayici: 'Örnek SCADA',
  plcAileleri: 'Siemens S7; ABB AC800M',
  kabulDurumu: 'kesin_kabul',
  kabulTarihi: '2021-03-15T00:00:00.000Z',
  blackStart: false,
  teiasScadaEms: true,
  kritiklikSinifi: 'yuksek',
  internetMaruziyeti: 'sinirli',
  guncellendi: '2026-05-01T10:00:00.000Z',
};

const alan = (anahtar: ProfilAlani['anahtar']) =>
  PROFIL_ALANLARI.find((a) => a.anahtar === anahtar)!;

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

describe('gösterim', () => {
  it('boş alan "tanımsız" sözcüğünü taşır ve tanimsiz işaretlidir', () => {
    const s = alanDegeri(BOS_PROFIL, alan('dcsSaglayici'));
    expect(s.deger).toBe(TANIMSIZ);
    expect(s.tanimsiz).toBe(true);
  });

  it('üç durumlu boolean: true var, false yok, null tanımsız', () => {
    expect(alanDegeri(DOLU, alan('teiasScadaEms')).deger).toBe('var');
    expect(alanDegeri(DOLU, alan('blackStart')).deger).toBe('yok');
    expect(alanDegeri(DOLU, alan('seriHaberlesme')).deger).toBe(TANIMSIZ);
    // false "tanımsız" DEĞİLDİR — ölçülmüş bir hayırdır.
    expect(alanDegeri(DOLU, alan('blackStart')).tanimsiz).toBe(false);
  });

  it('seçim alanı insan sözüyle, bilinmeyen kod olduğu gibi', () => {
    expect(alanDegeri(DOLU, alan('otMimariTipi')).deger).toBe('PLC + SCADA');
    expect(alanDegeri(DOLU, alan('kabulDurumu')).deger).toBe('Kesin kabul');
    expect(alanDegeri({ ...DOLU, otMimariTipi: 'baska' }, alan('otMimariTipi')).deger).toBe('baska');
  });

  it('liste virgülle, tarih tr-TR biçiminde', () => {
    expect(alanDegeri(DOLU, alan('plcAileleri')).deger).toBe('Siemens S7, ABB AC800M');
    expect(alanDegeri(DOLU, alan('kabulTarihi')).deger).toBe('15.03.2021');
    expect(alanDegeri({ ...DOLU, kabulTarihi: 'bozuk' }, alan('kabulTarihi')).deger).toBe('geçersiz tarih');
  });

  it('profil kaydı yokken her alan tanımsızdır; gruplar tüm alanları kapsar [PRT-OZT-002]', () => {
    const sayim = tanimsizSayisi(null);
    expect(sayim.tanimsiz).toBe(sayim.toplam);
    expect(sayim.toplam).toBe(PROFIL_ALANLARI.length);
    const gruplar = profilSatirlari(null);
    expect(gruplar.map((g) => g.ad)).toEqual(PROFIL_GRUPLARI.map((g) => g.ad));
    expect(gruplar.flatMap((g) => g.satirlar)).toHaveLength(PROFIL_ALANLARI.length);
    // Şemadaki 20 profil alanının tamamı listede (veriIslemeProfili hariç: eylem şeması taşımıyor).
    expect(PROFIL_ALANLARI).toHaveLength(20);
    expect(new Set(PROFIL_ALANLARI.map((a) => a.anahtar)).size).toBe(20);
  });

  it('dolu profilde tanımsız sayısı doğru düşer', () => {
    // DOLU'da 9 alan dolu: otMimariTipi, scadaSaglayici, plcAileleri, kabulDurumu,
    // kabulTarihi, blackStart, teiasScadaEms, kritiklikSinifi, internetMaruziyeti.
    // blackStart=false DOLU sayılır — ölçülmüş hayır, bilinmeyen değil.
    expect(tanimsizSayisi(DOLU)).toEqual({ tanimsiz: 11, toplam: 20 });
  });
});

describe('form', () => {
  it('varsayılan form kayıttan dolar: üç durum evet/hayir/boş, tarih YYYY-MM-DD', () => {
    const f = formVarsayilani(DOLU);
    expect(f.teiasScadaEms).toBe('evet');
    expect(f.blackStart).toBe('hayir');
    expect(f.seriHaberlesme).toBe('');
    expect(f.kabulTarihi).toBe('2021-03-15');
    expect(f.plcAileleri).toBe('Siemens S7, ABB AC800M');
    expect(f.dcsSaglayici).toBe('');
    // Profil yokken her alan boş metin.
    expect(Object.values(formVarsayilani(null)).every((v) => v === '')).toBe(true);
  });

  it('boş giden her alan null (bilinmiyor) olur; tesisId taşınır', () => {
    const g = formdanGirdi('tesis-1', formVarsayilani(null));
    expect(g.tesisId).toBe('tesis-1');
    const { tesisId: _t, ...kalan } = g;
    void _t;
    expect(Object.values(kalan).every((v) => v === null)).toBe(true);
  });

  it('gidiş-dönüş: kayıt → form → girdi aynı anlamı korur', () => {
    const g = formdanGirdi('tesis-1', formVarsayilani(DOLU));
    expect(g.otMimariTipi).toBe('plc_scada');
    expect(g.scadaSaglayici).toBe('Örnek SCADA');
    expect(g.plcAileleri).toBe('Siemens S7; ABB AC800M');
    expect(g.kabulDurumu).toBe('kesin_kabul');
    expect(g.kabulTarihi).toBe('2021-03-15');
    expect(g.blackStart).toBe(false);
    expect(g.teiasScadaEms).toBe(true);
    expect(g.seriHaberlesme).toBeNull();
    expect(g.internetMaruziyeti).toBe('sinirli');
  });

  it('geçersiz seçim ya da tarih kaydedilmez, null\'a düşer; metin kırpılır', () => {
    const f = { ...formVarsayilani(null), otMimariTipi: 'uydurma', kabulTarihi: '15/03/2021',
      dcsSaglayici: '  Örnek DCS  ', plcAileleri: 'S7,S7, ' };
    const g = formdanGirdi('t', f);
    expect(g.otMimariTipi).toBeNull();
    expect(g.kabulTarihi).toBeNull();
    expect(g.dcsSaglayici).toBe('Örnek DCS');
    expect(g.plcAileleri).toBe('S7');
  });
});
