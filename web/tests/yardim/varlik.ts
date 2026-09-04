/* Testler için paylaşılan varlık kalıbı.

   Her alanı BİLİNEN ve sağlıklı bir taban üretir; test tek alanı bozarak
   o alanın kuralını sınar. Taban sağlıklı olmasaydı her testte iki şey
   birden değişir ve düşen testin hangi kuralı yakaladığı belirsizleşirdi. */

import {
  BOS_DURUS, BOS_YONETISIM, type V,
} from '@/app/(kabuk)/(operasyonel)/envanter/mantik';

const TUR: V['tur'] = { id: 't-ot', kod: 'PLC', ad: 'PLC', sinif: 'OT' };

export function ornekVarlik(ek: Partial<V> = {}): V {
  return {
    id: 'v1', etiket: 'KIZILDERE-3-PLC-01', ad: 'Saha PLC',
    tur: TUR,
    tesis: { id: 'tesis-1', kod: 'KIZILDERE-3', ad: 'Kızıldere III JES' },
    unite: { id: 'u1', kod: 'UNITE-1', ad: '1. Ünite' },
    sistem: { id: 's1', kod: 'SCADA', ad: 'SCADA' },
    bolge: {
      id: 'b-ot', kod: 'KIZILDERE3-OT', ad: 'Süreç Kontrol Ağı',
      tip: 'ot', seviye: 2, tesisId: 'tesis-1',
    },
    sahip: { id: 'k1', ad: 'B. Şahin' }, emanetci: null,
    tedarikci: null, sozlesme: null,
    hostname: 'kzd3-plc-01', seriNo: 'SN-0001', uretici: 'Üretici A',
    model: 'M-100', ipAdresi: '10.20.30.40', macAdresi: '00:11:22:33:44:55',
    isletimSistemi: 'Gömülü', firmware: 'V4.12.3', surum: null,
    rafOda: 'Pano 3', kimlikDogrulama: null,
    ipv6Adresi: null, isletimSistemiSurumu: '4.12',
    firmwareYapisi: null, donanimRevizyonu: null, yazilimlar: [],
    garantiSaglayici: null, bakimBitis: '2027-01-01T00:00:00.000Z',
    sonBakim: null, sonrakiBakim: null,
    kritiklik: 'orta', uretimEtkisi: 'bilinmiyor',
    yamaDurumu: 'guncel', edrDurumu: 'var', yedekDurumu: 'var',
    izlemeDurumu: 'var', logKaynagi: 'var', internetMaruziyeti: 'yok',
    uzaktanErisim: false, yasamDongusu: 'aktif',
    kurulumTarihi: null, garantiBitis: '2026-12-31T00:00:00.000Z',
    destekBitis: null, eolTarihi: null,
    eosTarihi: '2028-01-01T00:00:00.000Z', guncellendi: '2026-09-01T00:00:00.000Z',
    iliskiler: [], riskler: [], kanitlar: [], acikZafiyet: 0,
    zafiyetler: [], projeler: [],
    sonYedek: null, sonKesif: null, yazilabilir: true, onaylanabilir: true,
    durus: BOS_DURUS, yonetisim: BOS_YONETISIM,
    ...ek,
  };
}
