import { describe, expect, it } from 'vitest';
import {
  ETKI_DUZEYLERI, degerlendirilmemisBaglar, enAgirEtki, enSikiRpo, enSikiRto,
  etkiDuzeyi, etkiOzeti, gecerliEtki, tekNoktaRiskleri, type AdimBagi,
} from '../lib/varlik/etki';
import {
  devirOnizlemesi, etkinSahip, sahiplikDurumu, sahiplikOzeti,
  type SahiplikGirdisi,
} from '../lib/varlik/sahiplik';
import {
  YAKLASMA_ESIGI_GUN, bakimDurumu, enAcilSure, kalanGun, olcumBorcu,
  sureDurumu, sureleriCoz,
} from '../lib/varlik/omurTarihleri';
import {
  kararGecerliMi, tersKarsilastir, yetkiOzeti, yinelenenAdayMi,
} from '../lib/varlik/kesifYetkisi';
import {
  macKanonik, multicastMacMi, ouiCoz, ouiOnEki, protokolAdaylari,
  protokolAdi, protokolKodu, yerelMacMi,
} from '../lib/varlik/otGozlem';
import { driftKarsilastir, driftOzeti, kararGerekceIster } from '../lib/varlik/konfigDrift';
import {
  hesabiDegerlendir, hesapOzeti, merkezdenKapatilabilir, type HesapGirdisi,
} from '../lib/varlik/hesapTipi';

/* ═══ FAZ B alan mantığı — OT-05 · 08 · 09 · 16 · 17 · 20 · 28 · 33 ═══

   Altı saf modülün tamamı aynı doktrini taşır ve her testi onun bir
   yüzü: BİLİNMEYEN SIFIR DEĞİLDİR, ölçülmemiş başarısız değildir,
   uygulanamaz eksik değildir. */

const AN = Date.UTC(2026, 8, 3);
const gunSonra = (n: number) => new Date(AN + n * 86_400_000).toISOString();

/* ── OT-05 · OT-08 · Etki ──────────────────────────────────────────── */

const bag = (ek: Partial<AdimBagi> = {}): AdimBagi => ({
  adimId: 'a1', adimAd: 'Türbin devreye alma', surecKod: 'P1', surecAd: 'Üretim',
  rol: 'kontrol', tekNokta: null, yedekli: null,
  adimEtkisi: 'bilinmiyor', rtoSaat: null, rpoSaat: null, ...ek,
});

describe('OT-08 · Etki miras alınır ama ÖLÇÜLMÜŞ değeri ezmez', () => {
  it('kendi etkisi biliniyorsa miras devreye girmez', () => {
    const s = gecerliEtki('dusuk', [bag({ adimEtkisi: 'uretim_durur' })]);
    expect(s.duzey).toBe('dusuk');
    expect(s.kaynak).toBe('olculdu');
  });

  it('kendi etkisi bilinmiyorsa adımdan miras alınır', () => {
    const s = gecerliEtki('bilinmiyor', [bag({ adimEtkisi: 'uretim_durur' })]);
    expect(s.duzey).toBe('uretim_durur');
    expect(s.kaynak).toBe('miras');
    expect(s.mirasAdimId).toBe('a1');
  });

  it('miras birden çok adımdan gelirse EN AĞIRI kazanır', () => {
    const s = gecerliEtki(null, [
      bag({ adimId: 'a1', adimEtkisi: 'dusuk' }),
      bag({ adimId: 'a2', adimEtkisi: 'yuksek' }),
    ]);
    expect(s.duzey).toBe('yuksek');
    expect(s.mirasAdimId).toBe('a2');
  });

  it('hiçbir kaynak bilinmiyorsa sonuç BİLİNMİYOR — "yok" değil', () => {
    const s = gecerliEtki(null, [bag()]);
    expect(s.duzey).toBe('bilinmiyor');
    expect(s.kaynak).toBe('yok');
  });

  it('tanınmayan etiket bilinmiyora düşer, uydurulmaz', () => {
    expect(etkiDuzeyi('felaket')).toBe('bilinmiyor');
    expect(etkiDuzeyi(undefined)).toBe('bilinmiyor');
  });

  it('"yok" bilinen bir değerdir ve bilinmeyeni bastırır', () => {
    /* "Etki yok" bir ÖLÇÜMDÜR; ölçülmemişlikle karıştırılamaz. */
    expect(enAgirEtki(['bilinmiyor', 'yok'])).toBe('yok');
    expect(enAgirEtki(['bilinmiyor'])).toBe('bilinmiyor');
  });

  it('sözlük ile ağırlık tablosu aynı kümedir', () => {
    for (const d of ETKI_DUZEYLERI) expect(etkiDuzeyi(d)).toBe(d);
  });
});

describe('OT-08 · MW toplamı kısmi ölçümü tam gibi göstermez', () => {
  it('hiçbir satır ölçülmemişse toplam NULL — "0 MW" yazılmaz', () => {
    const o = etkiOzeti([
      { uretimKaybiMw: null, etki: gecerliEtki(null, []) },
      { uretimKaybiMw: null, etki: gecerliEtki(null, []) },
    ]);
    expect(o.toplamMw).toBeNull();
    expect(o.olculmeyen).toBe(2);
  });

  it('ölçülen satırlar toplanır, ölçülmeyenler ayrı sayılır', () => {
    const o = etkiOzeti([
      { uretimKaybiMw: 12.5, etki: gecerliEtki('yuksek', []) },
      { uretimKaybiMw: 7.25, etki: gecerliEtki('orta', []) },
      { uretimKaybiMw: null, etki: gecerliEtki(null, []) },
    ]);
    expect(o.toplamMw).toBe(19.75);
    expect(o.olculen).toBe(2);
    expect(o.olculmeyen).toBe(1);
    expect(o.etkisiBilinmeyen).toBe(1);
  });

  it('üretimi durduran satırlar ayrı sayılır (miras dâhil)', () => {
    const o = etkiOzeti([
      { uretimKaybiMw: null, etki: gecerliEtki(null, [bag({ adimEtkisi: 'uretim_durur' })]) },
    ]);
    expect(o.uretimDurduran).toBe(1);
  });
});

describe('OT-05 · Tek nokta riski DEĞERLENDİRİLMİŞ olandan sayılır', () => {
  it('değerlendirilmemiş bağ tek nokta SAYILMAZ', () => {
    const baglar = [bag({ tekNokta: null })];
    expect(tekNoktaRiskleri(baglar)).toHaveLength(0);
    expect(degerlendirilmemisBaglar(baglar)).toHaveLength(1);
  });

  it('tek nokta ama yedekli olan bağ risk değildir', () => {
    expect(tekNoktaRiskleri([bag({ tekNokta: true, yedekli: true })])).toHaveLength(0);
  });

  it('tek nokta ve yedekliliği bilinmeyen bağ RİSKTİR', () => {
    /* Yedekliliği ölçülmemiş bir tek noktayı güvenli saymak, en pahalı
       varsayım olurdu. */
    expect(tekNoktaRiskleri([bag({ tekNokta: true, yedekli: null })])).toHaveLength(1);
  });

  it('en sıkı RTO/RPO seçilir; hiçbiri yoksa null', () => {
    expect(enSikiRto([bag({ rtoSaat: 8 }), bag({ rtoSaat: 2 })])).toBe(2);
    expect(enSikiRto([bag()])).toBeNull();
    expect(enSikiRpo([bag({ rpoSaat: 24 }), bag({ rpoSaat: 4 })])).toBe(4);
  });
});

/* ── OT-09 · Sahiplik ──────────────────────────────────────────────── */

const sahiplik = (ek: Partial<SahiplikGirdisi> = {}): SahiplikGirdisi => ({
  sahip: null, emanetci: null, ekip: null, ...ek,
});
const kisi = (aktif: boolean) => ({ id: 'k1', ad: 'B. Şahin', aktif });
const ekip = (aktif: boolean, aktifUye: number) =>
  ({ id: 'e1', kod: 'OT-BAKIM', aktif, aktifUye });

describe('OT-09 · Üç eksiklik üç ayrı addır', () => {
  it('hiç atama yoksa ATANMADI', () => {
    expect(sahiplikDurumu(sahiplik())).toBe('atanmadi');
  });

  it('sahip pasifse PASİF — bu "sahibi var" görünen en sinsi hâldir', () => {
    expect(sahiplikDurumu(sahiplik({ sahip: kisi(false), ekip: ekip(true, 3) })))
      .toBe('pasif');
  });

  it('aktif kişi ama ekip yoksa EKİPSİZ', () => {
    expect(sahiplikDurumu(sahiplik({ sahip: kisi(true) }))).toBe('ekipsiz');
  });

  it('ekip atanmış ama aktif üyesi yoksa BOŞ EKİP', () => {
    expect(sahiplikDurumu(sahiplik({ sahip: kisi(true), ekip: ekip(true, 0) })))
      .toBe('bos_ekip');
  });

  it('yalnız ekip de SAĞLAM sayılır: ekip kişiden dayanıklıdır', () => {
    expect(sahiplikDurumu(sahiplik({ ekip: ekip(true, 2) }))).toBe('saglam');
  });

  it('pasif ekip yok sayılır — atama gerçek değildir', () => {
    expect(sahiplikDurumu(sahiplik({ ekip: ekip(false, 5) }))).toBe('atanmadi');
  });

  it('özet sayaçları toplamı bozmaz', () => {
    const o = sahiplikOzeti(['saglam', 'pasif', 'pasif', 'atanmadi']);
    expect(o.toplam).toBe(4);
    expect(o.pasif).toBe(2);
    expect(o.saglam + o.ekipsiz + o.pasif + o.bos_ekip + o.atanmadi).toBe(o.toplam);
  });
});

describe('OT-09 · Etkin sahip PASİF kişiye düşmez', () => {
  it('aktif kişi varsa o döner', () => {
    const s = etkinSahip(sahiplik({ sahip: kisi(true) }), []);
    expect(s).toMatchObject({ id: 'k1', kaynak: 'kisi' });
  });

  it('kişi pasifse ekibin AKTİF sahibine düşer', () => {
    const s = etkinSahip(sahiplik({ sahip: kisi(false), ekip: ekip(true, 1) }), [
      { kullaniciId: 'k9', ad: 'A. Yıldız', aktif: true },
    ]);
    expect(s).toMatchObject({ id: 'k9', kaynak: 'ekip' });
  });

  it('hiçbir aktif sahip yoksa NULL — pasif kişiye görev atanmaz', () => {
    const s = etkinSahip(sahiplik({ sahip: kisi(false) }), [
      { kullaniciId: 'k9', ad: 'A. Yıldız', aktif: false },
    ]);
    expect(s).toBeNull();
  });
});

describe('OT-09 · Toplu devir önce SAYIYI söyler', () => {
  const kayitlar = [
    { id: 'v1', sahipId: 'k1' }, { id: 'v2', sahipId: 'k2' }, { id: 'v3', sahipId: null },
  ];

  it('zaten hedefte olan kayıt yazılmaz', () => {
    const { degisecek, degismeyen } = devirOnizlemesi(kayitlar, 'k1');
    expect(degismeyen.map((k) => k.id)).toEqual(['v1']);
    expect(degisecek).toHaveLength(2);
  });

  it('sahipliği kaldırma da bir devirdir ve null hedefi tanır', () => {
    const { degisecek, degismeyen } = devirOnizlemesi(kayitlar, null);
    expect(degismeyen.map((k) => k.id)).toEqual(['v3']);
    expect(degisecek).toHaveLength(2);
  });
});

/* ── OT-20 · Ömür tarihleri ────────────────────────────────────────── */

describe('OT-20 · Girilmemiş tarih GEÇMİŞ değildir', () => {
  it('tarih yoksa durum ÖLÇÜLMEDİ, kalan gün NULL', () => {
    expect(sureDurumu(null, AN)).toBe('olculmedi');
    expect(kalanGun(null, AN)).toBeNull();
  });

  it('çözümlenemeyen tarih de ölçülmedi sayılır', () => {
    expect(sureDurumu('geçen bahar', AN)).toBe('olculmedi');
  });

  it('geçmiş tarih DOLDU, eşik içindeki YAKLAŞIYOR', () => {
    expect(sureDurumu(gunSonra(-1), AN)).toBe('doldu');
    expect(sureDurumu(gunSonra(YAKLASMA_ESIGI_GUN - 1), AN)).toBe('yaklasiyor');
    expect(sureDurumu(gunSonra(YAKLASMA_ESIGI_GUN + 10), AN)).toBe('gecerli');
  });

  it('beş süre de ayrı ayrı çözülür ve hiçbiri kaybolmaz', () => {
    const k = sureleriCoz({
      garantiBitis: gunSonra(-10), destekBitis: gunSonra(400),
      bakimBitis: null, eolTarihi: null, eosTarihi: gunSonra(30),
    }, AN);
    expect(k).toHaveLength(5);
    expect(k.find((x) => x.tip === 'garanti')?.durum).toBe('doldu');
    expect(k.find((x) => x.tip === 'destek')?.durum).toBe('gecerli');
    expect(olcumBorcu(k).sort()).toEqual(['bakim', 'eol']);
  });

  it('en acil süre yalnız GİRİLMİŞLER arasından seçilir', () => {
    const k = sureleriCoz({
      garantiBitis: gunSonra(200), destekBitis: gunSonra(50),
      bakimBitis: null, eolTarihi: null, eosTarihi: null,
    }, AN);
    expect(enAcilSure(k)?.tip).toBe('destek');
  });

  it('hiçbir tarih girilmemişse en acil süre NULL — "bugün doluyor" değil', () => {
    const k = sureleriCoz({
      garantiBitis: null, destekBitis: null, bakimBitis: null,
      eolTarihi: null, eosTarihi: null,
    }, AN);
    expect(enAcilSure(k)).toBeNull();
  });

  it('bakım takvimi sözleşmeden AYRI değerlendirilir', () => {
    expect(bakimDurumu(gunSonra(-5), AN)).toBe('gecikti');
    expect(bakimDurumu(gunSonra(30), AN)).toBe('planlandi');
    expect(bakimDurumu(null, AN)).toBe('planlanmadi');
  });
});

/* ── OT-16 · Keşif yetkisi ─────────────────────────────────────────── */

describe('OT-16 · Gerekçesiz yok sayma reddedilir', () => {
  it('yetkisiz ve yoksayıldı kararları gerekçe ister', () => {
    expect(kararGecerliMi('yetkisiz', 'kısa').ok).toBe(false);
    expect(kararGecerliMi('gerekceyle_yoksayildi', null).ok).toBe(false);
  });

  it('yeterli gerekçeyle karar geçer', () => {
    expect(kararGecerliMi('yetkisiz', 'Envanterde karşılığı yok, sahaya sorulacak.').ok)
      .toBe(true);
  });

  it('"bilinen" kararı gerekçe istemez', () => {
    expect(kararGecerliMi('bilinen', null).ok).toBe(true);
  });
});

describe('OT-16 · Yinelenen aday — IP tek başına karar verdirmez', () => {
  const kayit = (ek: Partial<Parameters<typeof yinelenenAdayMi>[0]> = {}) => ({
    id: 'k1', seriNo: null, macAdresi: null, hostname: null, ipAdresi: null, ...ek,
  });

  it('MAC eşleşmesi ayraç ve harf boyundan bağımsızdır', () => {
    const r = yinelenenAdayMi(
      kayit({ id: 'a', macAdresi: 'AA:BB:CC:DD:EE:FF' }),
      kayit({ id: 'b', macAdresi: 'aa-bb-cc-dd-ee-ff' }),
    );
    expect(r).toEqual({ aynı: true, anahtar: 'macAdresi' });
  });

  it('yalnız IP eşleşiyorsa karar VERİLEMEZ (DHCP kirası)', () => {
    const r = yinelenenAdayMi(
      kayit({ id: 'a', ipAdresi: '10.0.0.5' }),
      kayit({ id: 'b', ipAdresi: '10.0.0.5' }),
    );
    expect(r.aynı).toBeNull();
    expect(r.anahtar).toBe('ipAdresi');
  });

  it('hiçbir kimlik alanı eşleşmezse aynı değildir', () => {
    expect(yinelenenAdayMi(kayit({ id: 'a' }), kayit({ id: 'b' })).aynı).toBe(false);
  });

  it('aynı kayıt kendisiyle yinelenen sayılmaz', () => {
    expect(yinelenenAdayMi(kayit({ macAdresi: 'AABBCCDDEEFF' }),
      kayit({ macAdresi: 'AABBCCDDEEFF' })).aynı).toBe(false);
  });
});

describe('OT-16 · Ters karşılaştırma iki ayrı kümedir', () => {
  it('hiç görülmeyen ile kaybolan karıştırılmaz', () => {
    const r = tersKarsilastir({
      varliklar: [
        { id: 'v1', etiket: 'A', sonGorulmeMs: null },
        { id: 'v2', etiket: 'B', sonGorulmeMs: AN - 200 * 86_400_000 },
        { id: 'v3', etiket: 'C', sonGorulmeMs: AN - 2 * 86_400_000 },
      ],
      esikGun: 30, simdi: AN,
    });
    expect(r.hicGorulmeyen.map((x) => x.etiket)).toEqual(['A']);
    expect(r.kayboldu.map((x) => x.etiket)).toEqual(['B']);
    expect(r.kayboldu[0].gecenGun).toBe(200);
  });
});

describe('OT-16 · Yetki özeti tanınmayan durumu karar verilmedi sayar', () => {
  it('sayaçlar toplamı bozmaz', () => {
    const o = yetkiOzeti(['bilinen', 'yetkisiz', 'saçma', 'gerekceyle_yoksayildi']);
    expect(o.toplam).toBe(4);
    expect(o.karar_verilmedi).toBe(1);
    expect(o.bilinen + o.yetkisiz + o.gerekceyle_yoksayildi + o.karar_verilmedi)
      .toBe(o.toplam);
  });
});

/* ── OT-17 · OUI ve protokol ───────────────────────────────────────── */

describe('OT-17 · MAC kanonikleştirme kimliktir, Türkçe metin değildir', () => {
  it('ayraçlar düşer, harfler büyür', () => {
    expect(macKanonik('00:1b:1b:aa:bb:cc')).toBe('001B1BAABBCC');
    expect(macKanonik('001b.1baa.bbcc')).toBe('001B1BAABBCC');
  });

  it('geçersiz MAC null döner — "boş MAC" diye bir şey yoktur', () => {
    expect(macKanonik('kısa')).toBeNull();
    expect(macKanonik(null)).toBeNull();
    expect(macKanonik('00:1b:1b:aa:bb')).toBeNull();
  });

  it('OUI ön eki ilk üç sekizlidir', () => {
    expect(ouiOnEki('00:1B:1B:AA:BB:CC')).toBe('001B1B');
  });

  it('yerel ve multicast adres tanınır', () => {
    expect(yerelMacMi('02:00:00:00:00:01')).toBe(true);
    expect(yerelMacMi('00:1B:1B:AA:BB:CC')).toBe(false);
    expect(multicastMacMi('01:00:5E:00:00:01')).toBe(true);
    expect(multicastMacMi('00:1B:1B:AA:BB:CC')).toBe(false);
  });
});

describe('OT-17 · OUI kütüğü BOŞ gelir ve üretici uydurulmaz', () => {
  const bosKutuk = new Map<string, string>();
  const doluKutuk = new Map([['001B1B', 'Örnek Otomasyon A.Ş.']]);

  it('kütük boşsa üretici NULL, ön ek yine okunur', () => {
    const r = ouiCoz('00:1B:1B:AA:BB:CC', bosKutuk);
    expect(r.onEk).toBe('001B1B');
    expect(r.uretici).toBeNull();
    expect(r.aranamaz).toBeNull();
  });

  it('kütükte varsa üretici döner', () => {
    expect(ouiCoz('00:1B:1B:AA:BB:CC', doluKutuk).uretici).toBe('Örnek Otomasyon A.Ş.');
  });

  it('yerel yönetilen adreste ARAMA YAPILMAZ ve sebebi taşınır', () => {
    const r = ouiCoz('02:00:00:00:00:01', doluKutuk);
    expect(r.uretici).toBeNull();
    expect(r.aranamaz).toBe('yerel_yonetilen');
  });

  it('geçersiz MAC sebebiyle birlikte döner', () => {
    expect(ouiCoz('kısa', doluKutuk).aranamaz).toBe('gecersiz_mac');
  });
});

describe('OT-17 · Protokol imzası bir İPUCUDUR, kimlik değil', () => {
  it('tek adaylı port kod döndürür', () => {
    expect(protokolKodu(502, 'tcp')).toBe('modbus');
    expect(protokolAdi('modbus')).toBe('Modbus/TCP');
  });

  it('çok adaylı port (102) KARAR VERDİRMEZ', () => {
    /* S7comm ve IEC 61850 MMS aynı portu paylaşır; birini seçmek
       gözlemin söylemediğini söylemek olurdu. */
    expect(protokolAdaylari(102, 'tcp')).toHaveLength(2);
    expect(protokolKodu(102, 'tcp')).toBeNull();
  });

  it('tanınmayan port BOŞ döner — "OT değil" diye işaretlenmez', () => {
    expect(protokolAdaylari(8080, 'tcp')).toHaveLength(0);
    expect(protokolKodu(8080, 'tcp')).toBeNull();
  });

  it('taşıma katmanı filtrelemesi çalışır', () => {
    expect(protokolAdaylari(47808, 'tcp')).toHaveLength(0);
    expect(protokolAdaylari(47808, 'udp')).toHaveLength(1);
    /* `her_ikisi` işaretli protokol iki taşımada da görünür. */
    expect(protokolAdaylari(20000, 'tcp')).toHaveLength(1);
    expect(protokolAdaylari(20000, 'udp')).toHaveLength(1);
  });

  it('geçersiz port sessizce boş liste verir, throw etmez', () => {
    expect(protokolAdaylari(null)).toHaveLength(0);
    expect(protokolAdaylari(Number.NaN)).toHaveLength(0);
  });
});

/* ── OT-28 · Konfigürasyon drift ───────────────────────────────────── */

describe('OT-28 · Eksik özet SAPMA değildir', () => {
  it('taban yoksa karar verilemez', () => {
    const r = driftKarsilastir({ temelHash: null, gozlenenHash: 'abc' });
    expect(r.sonuc).toBe('karar_verilemedi');
    expect(r.gerekce).toMatch(/taban/i);
  });

  it('gözlem özeti yoksa karar verilemez — cihaz "değişmiş" sayılmaz', () => {
    expect(driftKarsilastir({ temelHash: 'abc', gozlenenHash: null }).sonuc)
      .toBe('karar_verilemedi');
  });

  it('aynı özet sapma değildir, farklı özet sapmadır', () => {
    expect(driftKarsilastir({ temelHash: 'abc123', gozlenenHash: 'abc123' }).sonuc)
      .toBe('ayni');
    expect(driftKarsilastir({ temelHash: 'abc123', gozlenenHash: 'def456' }).sonuc)
      .toBe('sapma');
  });

  it('kapatan her karar gerekçe ister', () => {
    expect(kararGerekceIster('giderildi')).toBe(true);
    expect(kararGerekceIster('kabul_edildi')).toBe(true);
    expect(kararGerekceIster('onayli')).toBe(true);
    expect(kararGerekceIster('acik')).toBe(false);
  });
});

describe('OT-28 · Tabansız cihaz PAYDAYA girmez', () => {
  it('tabansız cihaz sapmasız SAYILMAZ, ayrı durur', () => {
    const o = driftOzeti([
      { temelVar: false, sonuc: 'karar_verilemedi', acikSapmaVar: false, onayliSapmaVar: false },
      { temelVar: true, sonuc: 'ayni', acikSapmaVar: false, onayliSapmaVar: false },
      { temelVar: true, sonuc: 'sapma', acikSapmaVar: true, onayliSapmaVar: false },
    ]);
    expect(o.tabansiz).toBe(1);
    expect(o.olculen).toBe(2);
    expect(o.oran).toBe(50);
  });

  it('hiç ölçülebilen yoksa oran NULL — %0 da %100 de yalan olurdu', () => {
    const o = driftOzeti([
      { temelVar: false, sonuc: 'karar_verilemedi', acikSapmaVar: false, onayliSapmaVar: false },
    ]);
    expect(o.oran).toBeNull();
  });
});

/* ── OT-33 · Hesap tipleri ─────────────────────────────────────────── */

const hesap = (ek: Partial<HesapGirdisi> = {}): HesapGirdisi => ({
  tip: 'kisi', kaynakTipi: 'dizin', ayricalikli: false, mfaVar: true,
  sonaErme: null, sonKullanim: gunSonra(-2), parolaRotasyon: gunSonra(-30),
  durum: 'aktif', ...ek,
});

describe('OT-33 · Kaynak tipi ile hesap tipi AYRI eksenlerdir', () => {
  it('dizin hesabı merkezden kapatılabilir, yerel kapatılamaz', () => {
    expect(merkezdenKapatilabilir('dizin')).toBe(true);
    expect(merkezdenKapatilabilir('yerel')).toBe(false);
    expect(merkezdenKapatilabilir('uygulama')).toBe(false);
  });

  it('kaynağı bilinmeyen hesapta karar VERİLEMEZ', () => {
    expect(merkezdenKapatilabilir('bilinmiyor')).toBeNull();
    /* Tedarikçi hesabı dizinde de cihazda da olabilir. */
    expect(merkezdenKapatilabilir('tedarikci')).toBeNull();
  });
});

describe('OT-33 · Ölçülmemiş alan BULGU değil BORÇTUR', () => {
  it('MFA ölçülmemişse bulgu açılmaz, borç yazılır', () => {
    const r = hesabiDegerlendir(hesap({ ayricalikli: true, mfaVar: null }), AN);
    expect(r.bulgular).not.toContain('mfa_yok');
    expect(r.borclar).toContain('mfa');
  });

  it('ayrıcalık ölçülmemişse MFA bulgusu AÇILMAZ', () => {
    /* İki bilinmeyeni bir kusura çevirmek yasak. */
    const r = hesabiDegerlendir(hesap({ ayricalikli: null, mfaVar: false }), AN);
    expect(r.bulgular).not.toContain('mfa_yok');
    expect(r.borclar).toContain('ayricalik');
  });

  it('ayrıcalıklı VE MFA yoksa bulgu açılır', () => {
    const r = hesabiDegerlendir(hesap({ ayricalikli: true, mfaVar: false }), AN);
    expect(r.bulgular).toContain('mfa_yok');
  });
});

describe('OT-33 · Süre ve atıllık bulguları', () => {
  it('süresi geçmiş ama aktif hesap bulgudur', () => {
    const r = hesabiDegerlendir(hesap({ sonaErme: gunSonra(-1) }), AN);
    expect(r.bulgular).toContain('suresi_gecmis');
  });

  it('kapatılmış hesapta süre bulgusu AÇILMAZ', () => {
    const r = hesabiDegerlendir(hesap({ sonaErme: gunSonra(-1), durum: 'kapatildi' }), AN);
    expect(r.bulgular).not.toContain('suresi_gecmis');
  });

  it('bitişsiz tedarikçi hesabı bulgudur', () => {
    const r = hesabiDegerlendir(hesap({ kaynakTipi: 'tedarikci', sonaErme: null }), AN);
    expect(r.bulgular).toContain('suresiz_tedarikci');
  });

  it('yerel ayrıcalıklı hesap bulgudur — merkezden kapatılamaz', () => {
    const r = hesabiDegerlendir(hesap({ kaynakTipi: 'yerel', ayricalikli: true }), AN);
    expect(r.bulgular).toContain('yerel_ayricalikli');
  });

  it('eşikten uzun süredir kullanılmayan aktif hesap ATILDIR', () => {
    const r = hesabiDegerlendir(hesap({ sonKullanim: gunSonra(-200) }), AN);
    expect(r.bulgular).toContain('atil');
  });

  it('son kullanımı hiç bilinmeyen hesap atıl SAYILMAZ, borç yazılır', () => {
    const r = hesabiDegerlendir(hesap({ sonKullanim: null }), AN);
    expect(r.bulgular).not.toContain('atil');
    expect(r.borclar).toContain('son_kullanim');
  });
});

describe('OT-33 · Özet ayrıcalıklıyı ölçülmemişten ayırır', () => {
  it('sayaçlar birbirine karışmaz', () => {
    const satirlar = [
      hesap({ ayricalikli: true, mfaVar: false }),
      hesap({ ayricalikli: null }),
      hesap({ kaynakTipi: 'yerel' }),
    ].map((g) => ({ girdi: g, sonuc: hesabiDegerlendir(g, AN) }));
    const o = hesapOzeti(satirlar);
    expect(o.toplam).toBe(3);
    expect(o.ayricalikli).toBe(1);
    expect(o.ayricalikOlculmemis).toBe(1);
    expect(o.kaynakDagilimi.yerel).toBe(1);
    expect(o.kaynakDagilimi.dizin).toBe(2);
  });
});
