import { describe, expect, it } from 'vitest';
import {
  bagImi, bagSozu, saat, sayaclar, surecImi, surecSozu,
  type AdimSatiri, type BagSatiri, type SurecSatiri,
} from '../app/(kabuk)/(operasyonel)/prosesler/mantik';
import {
  devirDisi, metrikleriHesapla, type Hesap,
} from '../app/(kabuk)/(operasyonel)/yetkiler/mantik';

/* ═══════════════════════════════════════════════════════════════════════
   FAZ B ekran mantığı — OT-05 · OT-09

   Bu dosyanın sınadığı tek kural, üç yerde birden geçerli:

     KANITLI RİSK ≠ ÖLÇÜM BORCU ≠ SAĞLAM

   Üçü ikiye indiği anda ürün, hiç bakılmamış bir zinciri "risk yok" diye
   yeşile boyar ve o zincire bir daha kimse bakmaz. Testlerin her biri o
   indirgemenin bir yüzünü kapatır.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── OT-05 · proses zinciri ─────────────────────────────────────────── */

function bag(ozel: Partial<BagSatiri> = {}): BagSatiri {
  return {
    id: 'b1', varlikId: 'v1', etiket: 'KIZ-PLC-01', ad: 'Saha PLC',
    kritiklik: 'kritik', rol: 'kontrol',
    tekNokta: null, yedekli: null, aciklama: null, duzenlenebilir: true,
    ...ozel,
  };
}

function adim(ozel: Partial<AdimSatiri> = {}): AdimSatiri {
  return {
    id: 'a1', kod: 'A1', ad: 'Adım', sira: 1, aciklama: null,
    rtoSaat: null, rpoSaat: null, uretimEtkisi: 'bilinmiyor',
    varliklar: [], ...ozel,
  };
}

function surec(ozel: Partial<SurecSatiri> = {}): SurecSatiri {
  return {
    id: 's1', kod: 'URT', ad: 'Üretim', tesisId: 't1', tesisAd: 'Kızıldere',
    uretimEtkisi: 'bilinmiyor', adimlar: [], duzenlenebilir: true, ...ozel,
  };
}

describe('OT-05 · tek nokta ÜÇ DEĞERLİDİR ve üçü ayrı sayılır', () => {
  it('değerlendirilmemiş bağ TEK NOKTA sayılmaz ama ölçüm borcuna girer', () => {
    const s = surec({ adimlar: [adim({ varliklar: [bag({ tekNokta: null })] })] });
    const c = sayaclar(s);
    expect(c.tekNokta).toBe(0);
    expect(c.degerlendirilmedi).toBe(1);
  });

  it('"tek nokta değil" kararı ölçüm borcu DEĞİLDİR', () => {
    const s = surec({ adimlar: [adim({ varliklar: [bag({ tekNokta: false })] })] });
    const c = sayaclar(s);
    expect(c.tekNokta).toBe(0);
    expect(c.degerlendirilmedi).toBe(0);
  });

  /* Yedekli bir tek nokta hâlâ bir tek noktadır ama KAPATILMIŞ bir
     risktir; kırmızı sayaca girmez, çünkü yapılacak iş kalmamıştır. */
  it('yedekli tek nokta kırmızı sayaca GİRMEZ, yedeksiz olan girer', () => {
    const yedekli = surec({
      adimlar: [adim({ varliklar: [bag({ tekNokta: true, yedekli: true })] })],
    });
    const yedeksiz = surec({
      adimlar: [adim({ varliklar: [bag({ tekNokta: true, yedekli: false })] })],
    });
    expect(sayaclar(yedekli).tekNokta).toBe(0);
    expect(sayaclar(yedeksiz).tekNokta).toBe(1);
  });

  /* En sinsi hâl: tek nokta olduğu KESİN, yedekliliği hiç bakılmamış.
     "Yedekli değil" saymak yanlış olurdu ama "sorun yok" saymak çok daha
     tehlikeli: kimse bakmaz. Kırmızıda kalır. */
  it('tek nokta kesin ama yedekliliği ÖLÇÜLMEMİŞ bağ kırmızıda kalır', () => {
    const s = surec({
      adimlar: [adim({ varliklar: [bag({ tekNokta: true, yedekli: null })] })],
    });
    expect(sayaclar(s).tekNokta).toBe(1);
    expect(bagImi(bag({ tekNokta: true, yedekli: null }))).toBe('bd');
    expect(bagSozu(bag({ tekNokta: true, yedekli: null })))
      .toBe('tek nokta · yedeklilik ölçülmedi');
  });

  it('bağın dört hâli dört ayrı sözle yazılır', () => {
    expect(bagSozu(bag({ tekNokta: null }))).toBe('tek nokta değerlendirilmedi');
    expect(bagSozu(bag({ tekNokta: true, yedekli: false }))).toBe('tek nokta · yedeği yok');
    expect(bagSozu(bag({ tekNokta: true, yedekli: true }))).toBe('tek nokta ama yedekli');
    expect(bagSozu(bag({ tekNokta: false }))).toBe('tek nokta değil');
  });

  it('işaretçi de dört hâli ayırır — renk metni tekrar etmez', () => {
    expect(bagImi(bag({ tekNokta: null }))).toBe('unk');
    expect(bagImi(bag({ tekNokta: true, yedekli: false }))).toBe('bd');
    expect(bagImi(bag({ tekNokta: true, yedekli: true }))).toBe('md');
    expect(bagImi(bag({ tekNokta: false }))).toBe('ok');
  });
});

describe('OT-05 · adımı olmayan süreç "sorunsuz" değil BİLİNMEYENDİR', () => {
  it('adımsız süreç unk olur ve sözü kırılımın yokluğunu söyler', () => {
    const s = surec();
    expect(surecImi(s)).toBe('unk');
    expect(surecSozu(s)).toMatch(/Adım tanımlanmadı/);
  });

  it('adımı var ama hiç varlık bağlanmamışsa yine unk', () => {
    const s = surec({ adimlar: [adim()] });
    expect(surecImi(s)).toBe('unk');
    expect(surecSozu(s)).toMatch(/varlık bağlanmadı/);
  });

  it('kanıtlı tek nokta her şeyin önüne geçer', () => {
    const s = surec({
      adimlar: [
        adim({ varliklar: [bag({ tekNokta: true, yedekli: false })] }),
        adim({ id: 'a2', varliklar: [] }),
      ],
    });
    expect(surecImi(s)).toBe('bd');
    expect(surecSozu(s)).toMatch(/tek nokta/);
  });

  it('ölçüm borcu, kopuk halkadan ÖNCE gelir: biri masa işi öteki envanter işi', () => {
    const s = surec({
      adimlar: [
        adim({ varliklar: [bag({ tekNokta: null })] }),
        adim({ id: 'a2', varliklar: [] }),
      ],
    });
    expect(surecImi(s)).toBe('unk');
    expect(surecSozu(s)).toMatch(/değerlendirilmedi/);
  });

  it('varlıksız adım tek başına md — bir risk değil, kopuk halka', () => {
    const s = surec({
      adimlar: [
        adim({ varliklar: [bag({ tekNokta: false })] }),
        adim({ id: 'a2', varliklar: [] }),
      ],
    });
    expect(surecImi(s)).toBe('md');
    expect(sayaclar(s).bosAdim).toBe(1);
  });

  it('zincirin tamamı değerlendirilmişse ok', () => {
    const s = surec({
      adimlar: [adim({ varliklar: [bag({ tekNokta: false, yedekli: true })] })],
    });
    expect(surecImi(s)).toBe('ok');
    expect(surecSozu(s)).toMatch(/tamamı değerlendirildi/);
  });
});

describe('OT-05 · belirlenmemiş RTO sıfır saat DEĞİLDİR', () => {
  it('null "belirlenmedi" yazılır, "0 saat" değil', () => {
    expect(saat(null)).toBe('belirlenmedi');
    expect(saat(0)).toBe('0 saat');
    expect(saat(4)).toBe('4 saat');
  });

  it('RTO’su olmayan adım sayacı ayrı tutulur', () => {
    const s = surec({
      adimlar: [adim({ rtoSaat: 4 }), adim({ id: 'a2', rtoSaat: null })],
    });
    expect(sayaclar(s).rtosuz).toBe(1);
  });
});

/* ── OT-09 · sahiplik yükü ──────────────────────────────────────────── */

function hesap(ozel: Partial<Hesap> = {}): Hesap {
  return {
    id: 'k1', ad: 'Ahmet', eposta: 'a@b', unvan: null, aktif: true,
    parolaVar: true, yetkiler: [],
    sahiplik: { toplam: 0, emanet: 0, devredilebilir: [] },
    ...ozel,
  };
}

describe('OT-09 · kapalı hesabın üstündeki varlık ayrı bir kusurdur', () => {
  /* En sinsi hâl: erişim kaldırılmış, sahiplik durmakta. Ekran "sahibi
     var" der ve kimse bakmaz. Erişim sayaçlarına toplanamaz — kapanışı
     bambaşka bir iştir (devir). */
  it('pasif hesapların sahipliği ayrı sayaçta toplanır', () => {
    const m = metrikleriHesapla([
      hesap({ id: '1', aktif: false, sahiplik: { toplam: 12, emanet: 3, devredilebilir: [] } }),
      hesap({ id: '2', aktif: true, sahiplik: { toplam: 40, emanet: 0, devredilebilir: [] } }),
    ]);
    expect(m.pasifSahiplik).toBe(12);
  });

  it('aktif hesabın sahipliği o sayaca GİRMEZ', () => {
    const m = metrikleriHesapla([
      hesap({ sahiplik: { toplam: 99, emanet: 0, devredilebilir: [] } }),
    ]);
    expect(m.pasifSahiplik).toBe(0);
  });

  it('sahiplik sayacı yetkisiz/artık yetki sayaçlarından bağımsızdır', () => {
    const m = metrikleriHesapla([
      hesap({ id: '1', aktif: false, sahiplik: { toplam: 5, emanet: 0, devredilebilir: [] } }),
    ]);
    expect(m.pasifSahiplik).toBe(5);
    expect(m.yetkisiz).toBe(0);   // pasif hesap "yetkisiz" değildir
    expect(m.artik).toBe(0);      // yetkisi de yok
  });
});

describe('OT-09 · kapsam dışı varlık gizlenmez, SAYILIR', () => {
  /* Devir tek bir kapsam dışı kayıtta TAMAMEN reddedilir; bu yüzden
     liste peşin daraltılır. Ama fark yazılmazsa kullanıcı 12 varlığın
     5’ini devredip işi bitirdiğini sanırdı. */
  it('devredilemeyen fark açıkça hesaplanır', () => {
    const s = { toplam: 12, emanet: 0, devredilebilir: ['a', 'b', 'c', 'd', 'e'] };
    expect(devirDisi(s)).toBe(7);
  });

  it('hepsi kapsamdaysa fark sıfırdır', () => {
    expect(devirDisi({ toplam: 2, emanet: 0, devredilebilir: ['a', 'b'] })).toBe(0);
  });

  /* Yetkisi olmayan kullanıcıda `devredilebilir` boştur; bu "devredilecek
     varlık yok" DEĞİL "bu kullanıcı devredemez" demektir ve ekran ikisini
     ayrı yazar (form yerine yetki notu gösterir). */
  it('yetkisiz kullanıcıda fark, toplamın kendisidir', () => {
    expect(devirDisi({ toplam: 8, emanet: 2, devredilebilir: [] })).toBe(8);
  });
});
