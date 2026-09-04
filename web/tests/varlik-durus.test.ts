import { describe, expect, it } from 'vitest';
import { enOzgulTemel, firmwareKarariVer, kotuSurumListesi } from '@/lib/varlik/firmwareKarari';
import {
  enAgirSonuc, korelasyonKarariVer, urunEslesiyorMu, type AdvisoryUrunGirdi, type VarlikGirdi,
} from '@/lib/varlik/zafiyetKarari';

/* OT-22 ve OT-25 aynı sürüm primitifine dayanır; buradaki testler
   kararların "bilinmeyen ≠ uyumlu ≠ etkilenmiyor" kuralını gerçekten
   uyguladığını çiviler. */

const TEMEL = { onayliSurum: '4.4.0', asgariSurum: '4.2.0', bilinenKotuSurumler: null };

describe('OT-22 · Firmware kararı', () => {
  it('asgariyi karşılayan sürüm uyumludur', () => {
    expect(firmwareKarariVer('4.2.0', TEMEL).durum).toBe('uyumlu');
    expect(firmwareKarariVer('4.10.0', TEMEL).durum).toBe('uyumlu');
  });

  it('asgarinin altındaki sürüm eskidir', () => {
    expect(firmwareKarariVer('4.1.9', TEMEL).durum).toBe('eski');
    /* Dize karşılaştırması burada "4.9 > 4.10" derdi; sürüm mantığı demez. */
    expect(firmwareKarariVer('4.9.0', TEMEL).durum).toBe('uyumlu');
  });

  it('TABAN YOKSA uyumlu SAYILMAZ [ENV-FRM-001]', () => {
    /* Hiç kural yazılmamış bir cihazı "kurallara uyuyor" saymak, uyum
       ölçümünü anlamsızlaştırırdı. */
    const k = firmwareKarariVer('4.4.0', null);
    expect(k.durum).toBe('taban_yok');
    expect(k.durum).not.toBe('uyumlu');
  });

  it('ÇÖZÜMLENEMEYEN sürüm uyumlu SAYILMAZ', () => {
    for (const bozuk of [null, '', 'bilinmiyor', 'latest', 'N/A']) {
      const k = firmwareKarariVer(bozuk, TEMEL);
      expect(k.durum, String(bozuk)).toBe('karar_verilemedi');
      expect(k.durum).not.toBe('uyumlu');
    }
  });

  it('bilinen kötü sürüm, ESKİ olmasa bile yakalanır', () => {
    /* Geri çekilmiş bir firmware tabandan YENİ olabilir; sıralama bu
       yüzden bilinen-kötüyü öne alır. */
    const t = { ...TEMEL, bilinenKotuSurumler: '4.5.1, 4.6.0' };
    expect(firmwareKarariVer('4.5.1', t).durum).toBe('bilinen_kotu');
    expect(firmwareKarariVer('4.6.0', t).durum).toBe('bilinen_kotu');
    expect(firmwareKarariVer('4.5.2', t).durum).toBe('uyumlu');
  });

  it('kötü sürüm listesi boşluklara ve boş girdilere dayanıklıdır', () => {
    expect(kotuSurumListesi(' 1.0 , , 2.0 ')).toEqual(['1.0', '2.0']);
    expect(kotuSurumListesi(null)).toEqual([]);
  });

  it('gerekçe her durumda insan cümlesidir', () => {
    for (const [kurulu, temel] of [['4.1.0', TEMEL], ['x', TEMEL], ['4.4.0', null]] as const) {
      expect(firmwareKarariVer(kurulu, temel).gerekce.length).toBeGreaterThan(10);
    }
  });
});

describe('OT-22 · Taban seçimi — en özgül kazanır', () => {
  const temeller = [
    { id: 'genel', turId: 'plc', uretici: null, model: null, aktif: true },
    { id: 'uretici', turId: 'plc', uretici: 'Siemens', model: null, aktif: true },
    { id: 'model', turId: 'plc', uretici: 'Siemens', model: 'S7-1500', aktif: true },
  ];

  it('model eşleşmesi üreticiyi ve türü ezer', () => {
    const s = enOzgulTemel(temeller, { turId: 'plc', uretici: 'Siemens', model: 'S7-1500' });
    expect(s?.id).toBe('model');
  });

  it('model tutmazsa üretici tabanına düşer', () => {
    const s = enOzgulTemel(temeller, { turId: 'plc', uretici: 'Siemens', model: 'S7-1200' });
    expect(s?.id).toBe('uretici');
  });

  it('üretici de tutmazsa genel tabana düşer', () => {
    const s = enOzgulTemel(temeller, { turId: 'plc', uretici: 'ABB', model: 'AC500' });
    expect(s?.id).toBe('genel');
  });

  it('hiçbir taban uymuyorsa null döner — uydurma taban seçilmez', () => {
    expect(enOzgulTemel(temeller, { turId: 'router', uretici: 'Cisco', model: 'C9300' })).toBeNull();
  });

  it('pasif taban seçilmez', () => {
    const pasif = temeller.map((t) => ({ ...t, aktif: t.id !== 'model' }));
    const s = enOzgulTemel(pasif, { turId: 'plc', uretici: 'Siemens', model: 'S7-1500' });
    expect(s?.id).toBe('uretici');
  });
});

const URUN: AdvisoryUrunGirdi = {
  uretici: 'Siemens', urunAdi: 'S7-1500', cpe: null,
  etkilenenAlt: '4.0.0', etkilenenAltDahil: true,
  etkilenenUst: '4.4.0', etkilenenUstDahil: false,
  duzeltilenSurum: null,
};
const VARLIK: VarlikGirdi = { uretici: 'Siemens', model: 'S7-1500', cpe: null, surum: '4.2.0' };

describe('OT-25 · Ürün eşleşmesi sürümden ÖNCE sorulur', () => {
  it('üretici tutmazsa etkilenmez — sürüme hiç bakılmaz', () => {
    const k = korelasyonKarariVer(URUN, { ...VARLIK, uretici: 'ABB' });
    expect(k.sonuc).toBe('etkilenmeyen');
    expect(k.gerekce).toContain('Ürün eşleşmedi');
  });

  it('CPE eşleşmesi en güçlü güveni verir', () => {
    const cpe = 'cpe:2.3:o:siemens:s7-1500:4.2.0';
    const e = urunEslesiyorMu({ ...URUN, cpe }, { ...VARLIK, cpe });
    expect(e.eslesti).toBe(true);
    expect(e.yontem).toBe('cpe');
    expect(e.guven).toBeGreaterThan(0.9);
  });

  it('üretici+model eşleşmesi CPE\'den zayıf, ürün adından güçlüdür', () => {
    const um = urunEslesiyorMu(URUN, VARLIK);
    const ua = urunEslesiyorMu({ ...URUN, urunAdi: null }, VARLIK);
    expect(um.guven).toBeGreaterThan(ua.guven);
  });

  it('eşleşme ayraç ve büyük/küçük harfe dayanıklıdır', () => {
    expect(urunEslesiyorMu(URUN, { ...VARLIK, model: 's7 1500' }).eslesti).toBe(true);
    expect(urunEslesiyorMu(URUN, { ...VARLIK, uretici: 'SIEMENS' }).eslesti).toBe(true);
  });
});

describe('OT-25 · Sürüm aralığı kararı', () => {
  it('aralık içindeki sürüm etkilenendir', () => {
    expect(korelasyonKarariVer(URUN, VARLIK).sonuc).toBe('etkilenen');
    expect(korelasyonKarariVer(URUN, { ...VARLIK, surum: '4.0.0' }).sonuc).toBe('etkilenen');
  });

  it('üst uç HARİÇ olduğu için sınır sürüm etkilenmez', () => {
    expect(korelasyonKarariVer(URUN, { ...VARLIK, surum: '4.4.0' }).sonuc).toBe('etkilenmeyen');
  });

  it('aralığın altındaki sürüm etkilenmez', () => {
    expect(korelasyonKarariVer(URUN, { ...VARLIK, surum: '3.9.9' }).sonuc).toBe('etkilenmeyen');
  });

  it('düzeltilmiş sürüm ve sonrası etkilenmez', () => {
    const u = { ...URUN, etkilenenAlt: null, etkilenenUst: null, duzeltilenSurum: '4.4.1' };
    expect(korelasyonKarariVer(u, { ...VARLIK, surum: '4.4.1' }).sonuc).toBe('etkilenmeyen');
    expect(korelasyonKarariVer(u, { ...VARLIK, surum: '4.5.0' }).sonuc).toBe('etkilenmeyen');
    expect(korelasyonKarariVer(u, { ...VARLIK, surum: '4.4.0' }).sonuc).toBe('etkilenen');
  });

  it('ÜRÜN eşleşip SÜRÜM okunamazsa "etkilenmiyor" DENMEZ', () => {
    /* Bu, korelasyondaki en pahalı yanlış: zafiyet ekrandan tümüyle
       kaybolur ve kimse onu aramaz. */
    for (const bozuk of [null, '', 'bilinmiyor']) {
      const k = korelasyonKarariVer(URUN, { ...VARLIK, surum: bozuk });
      expect(k.sonuc, String(bozuk)).toBe('karar_verilemedi');
      expect(k.guven).toBeNull();
      expect(k.sonuc).not.toBe('etkilenmeyen');
    }
  });

  it('kanıt her kararda taşınır — "neye bakıldı" cevaplanabilir', () => {
    const k = korelasyonKarariVer(URUN, VARLIK);
    expect(k.kanit.map((x) => x.alan)).toEqual(['uretici', 'urun', 'cpe', 'surum']);
  });
});

describe('OT-25 · Çok satırlı advisory — en AĞIR sonuç kazanır', () => {
  const et = korelasyonKarariVer(URUN, VARLIK);
  const yok = korelasyonKarariVer(URUN, { ...VARLIK, surum: '5.0.0' });
  const belirsiz = korelasyonKarariVer(URUN, { ...VARLIK, surum: null });

  it('etkilenen her şeyi ezer', () => {
    expect(enAgirSonuc([yok, et, belirsiz])?.sonuc).toBe('etkilenen');
  });

  it('KARAR VERİLEMEDİ, etkilenmiyordan ağırdır', () => {
    /* Bir satırda belirsizlik varsa, başka bir satırın "etkilenmiyor"
       demesi o belirsizliği ortadan kaldırmaz. */
    expect(enAgirSonuc([yok, belirsiz])?.sonuc).toBe('karar_verilemedi');
  });

  it('hepsi etkilenmiyorsa sonuç etkilenmiyordur', () => {
    expect(enAgirSonuc([yok, yok])?.sonuc).toBe('etkilenmeyen');
  });

  it('boş liste null döner', () => {
    expect(enAgirSonuc([])).toBeNull();
  });
});
