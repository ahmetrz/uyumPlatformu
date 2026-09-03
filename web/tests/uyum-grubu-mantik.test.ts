import { describe, expect, it } from 'vitest';

/* Faz 6 · Uyum/regülasyon üçlüsünün saf mantığı: süreç kütüğü,
   regülasyon kütüphanesi ve çapraz eşleme. Bu modüller veritabanına,
   React'e ve `server-only`ye dokunmaz; testi de dokunmaz
   (bkz. tests/envanter-mantik.test.ts kalıbı).

   Testin asıl işi yoğunluk sözleşmesinin SEMANTİK maddelerini korumaktır:
   bilinmeyen ≠ sıfır, kapsam dışı ≠ bilinmeyen, kanıtsız uyumlu ≠ uyumlu. */

import {
  BOS_SAYIM, degerlendirmeCumlesi, degerlendirmeImi, degerlendirmeSirasi,
  degerlendirmeSozu, denetimMetni, gecikti, kanitMetni, kanitYok,
  kisaKod as surecKisaKod,
  santralMetni, sayimla, sayimTopla, surecImi, takipte,
  type Degerlendirme, type S,
} from '@/app/(kabuk)/(operasyonel)/surecler/ortak';

import {
  acilisCercevesi, agaciKur, alansizSayisi, dallar, eslesiyor, maddeImi, regImi, silinebilir,
  surumImi, surumOzeti, surumsuzSayisi, yapraklar,
  type Madde, type Reg,
} from '@/app/(kabuk)/(operasyonel)/regulasyonlar/mantik';

import {
  acilisCifti, anahtar, ciftinEsleri, cizilebilirEsler, DENKLIK_IM,
  digerCerceveEsleri, hucreleriKur,
  karsiliksizlar, kisaBaslik, matrisKur,
  type E, type M,
} from '@/app/(kabuk)/(operasyonel)/eslestirme/mantik';

const SIMDI = Date.parse('2026-06-01T00:00:00.000Z');
const GUN = 86_400_000;
const gunSonra = (n: number) => new Date(SIMDI + n * GUN).toISOString();

/* ═══ Süreç kütüğü ═══════════════════════════════════════════════════ */

const TESIS = { id: 'tesis-1', kod: 'KIZILDERE-3', ad: 'Kızıldere III JES' };

function surec(ek: Partial<S> = {}): S {
  return {
    id: 's-1', kod: 'EPDK-SYM-2026', ad: 'EPDK SYM 2026 dönemi',
    durum: 'aktif',
    baslangic: gunSonra(-120), bitis: gunSonra(60), aciklama: null,
    regulasyon: { id: 'r-1', kod: 'EPDK-SYM', ad: 'EPDK Siber Yetkinlik' },
    tesisler: [TESIS],
    sayim: sayimla({ uyumlu: 6, kismi: 2, uyumsuz: 0, degerlendirilmedi: 2 }),
    acikBulgu: 0,
    denetimler: [],
    ...ek,
  };
}

describe('süreç sayımı — bilinmeyen sıfır değildir', () => {
  it('kapsam dışı maddeyi her iki paydanın da dışında tutar', () => {
    const s = sayimla({ uyumlu: 4, kismi: 0, uyumsuz: 0, kapsamdisi: 6 });
    expect(s.degerlendirilen).toBe(4);
    expect(s.toplam).toBe(4);
    expect(s.kapsamDisi).toBe(6);
    expect(s.yuzde).toBe(100);
  });

  it('incelemede ve değerlendirilmedi tek bilinmeyen payında toplanır', () => {
    const s = sayimla({ uyumlu: 2, incelemede: 1, degerlendirilmedi: 3 });
    expect(s.bilinmeyen).toBe(4);
    expect(s.toplam).toBe(6);
    // Yüzde YALNIZ değerlendirilenler üzerinden: bilinmeyen sıfır sayılmaz.
    expect(s.yuzde).toBe(100);
  });

  it('hiç değerlendirme yoksa yüzde null olur, %0 uydurulmaz', () => {
    expect(sayimla({ degerlendirilmedi: 12 }).yuzde).toBeNull();
    expect(BOS_SAYIM.yuzde).toBeNull();
  });

  it('toplama bilinmeyen payını korur', () => {
    const t = sayimTopla([
      sayimla({ uyumlu: 2, degerlendirilmedi: 1 }),
      sayimla({ uyumsuz: 1, incelemede: 2, kapsamdisi: 3 }),
    ]);
    expect(t.uyumlu).toBe(2);
    expect(t.uyumsuz).toBe(1);
    expect(t.bilinmeyen).toBe(3);
    expect(t.kapsamDisi).toBe(3);
  });
});

describe('süreç işaretçisi', () => {
  it('kapsamı boş kampanya BİLİNMEYENDİR, uyumlu değil', () => {
    expect(surecImi(surec({ tesisler: [], sayim: BOS_SAYIM }), SIMDI)).toBe('unk');
  });

  it('değerlendirmesi hiç açılmamış kampanya bilinmeyendir', () => {
    expect(surecImi(surec({ sayim: BOS_SAYIM }), SIMDI)).toBe('unk');
  });

  it('denetim tarihi geçen kampanya kritiktir', () => {
    expect(surecImi(surec({ bitis: gunSonra(-3) }), SIMDI)).toBe('bd');
  });

  it('tamamlanan kampanya gecikmez', () => {
    const s = surec({ durum: 'tamamlandi', bitis: gunSonra(-30) });
    expect(gecikti(s, SIMDI)).toBe(false);
    expect(surecImi(s, SIMDI)).toBe('tamam');
  });

  it('askıya alınan kampanya gecikmez, planlı görünür', () => {
    const s = surec({ durum: 'pasif', bitis: gunSonra(-30) });
    expect(gecikti(s, SIMDI)).toBe(false);
    expect(surecImi(s, SIMDI)).toBe('pl');
  });

  it('uyumsuz madde ya da açık bulgu kampanyayı kritik yapar', () => {
    expect(surecImi(surec({ sayim: sayimla({ uyumlu: 9, uyumsuz: 1 }) }), SIMDI)).toBe('bd');
    expect(surecImi(surec({ acikBulgu: 2 }), SIMDI)).toBe('bd');
  });

  it('bilinmeyeni kalan kampanya kısmi, hepsi uyumlu olan tamdır', () => {
    expect(surecImi(surec(), SIMDI)).toBe('md');
    expect(surecImi(surec({ sayim: sayimla({ uyumlu: 10 }) }), SIMDI)).toBe('ok');
  });
});

describe('denetim hücresi', () => {
  it('tarihi girilmemiş kampanya bilinmeyendir', () => {
    expect(denetimMetni(surec({ bitis: null }), SIMDI))
      .toEqual({ metin: 'tarih yok', durum: 'unk' });
  });

  it('aşılan tarihi gün olarak kritik yazar', () => {
    expect(denetimMetni(surec({ bitis: gunSonra(-9) }), SIMDI))
      .toEqual({ metin: '+9 gün', durum: 'bd' });
  });

  it('yaklaşan tarihi geri sayımla, uzağı ay olarak verir', () => {
    expect(denetimMetni(surec({ bitis: gunSonra(10) }), SIMDI).metin).toBe('10 gün');
    expect(denetimMetni(surec({ bitis: gunSonra(10) }), SIMDI).durum).toBe('md');
    expect(denetimMetni(surec({ bitis: gunSonra(120) }), SIMDI).metin).toMatch(/^\d+ \w+$/);
  });

  it('kapanmış kampanyanın geçmiş tarihine geri sayım yazmaz', () => {
    const s = surec({ durum: 'tamamlandi', bitis: gunSonra(-40) });
    expect(denetimMetni(s, SIMDI).durum).toBeUndefined();
    expect(denetimMetni(s, SIMDI).metin).not.toContain('gün');
  });

  it('kapsam metni tesis sayısını, boş kapsamı ayrı söyler', () => {
    expect(santralMetni(surec())).toBe('Kızıldere III JES');
    expect(santralMetni(surec({ tesisler: [] }))).toBe('kapsam boş');
    expect(santralMetni(surec({ tesisler: [TESIS, { ...TESIS, id: 't2' }] }))).toBe('2 santral');
  });
});

/* ── Değerlendirme (kampanya × madde × santral) ─────────────────────── */

function degerlendirme(ek: Partial<Degerlendirme> = {}): Degerlendirme {
  return {
    id: 'd-1',
    madde: {
      id: 'm-1', kod: 'EPDK-SYM-4.2.1', kisaKod: '4.2.1',
      baslik: 'Varlık envanteri', metin: 'Envanter tutulur.',
      bolum: 'Varlık Yönetimi', kanitTipi: 'kayit', alanlar: ['BT'], esler: [],
    },
    tesis: TESIS,
    durum: 'uyumlu',
    guven: 'oz_degerlendirme',
    kanitBayat: false,
    not: null,
    sorumlu: null,
    /* UY-07 · sorumluluk zinciri ve dört göz alanları. Fikstür varsayılanı
       "hiç doğrulanmamış": doğrulanmış varsaymak, testleri en iyimser
       hâlden başlatırdı. */
    sorumluAktif: false,
    ekip: null,
    dogrulayan: null,
    dogrulamaZamani: null,
    degerlendiren: null,
    dogrulayabilir: false,
    gecerliKanit: 0,
    sonDegerlendirme: gunSonra(-10),
    bulgular: [],
    kanitlar: [{ id: 'k-1', ad: 'Envanter raporu', tip: 'rapor', baslangic: gunSonra(-20) }],
    acikBulgu: 0,
    ...ek,
  };
}

describe('değerlendirme işaretçisi', () => {
  it('kapsam dışı bir KARARDIR: bilinmeyen değildir ve iş de değildir', () => {
    const d = degerlendirme({ durum: 'kapsamdisi' });
    expect(degerlendirmeImi(d)).toBe('pl');
    expect(takipte(d)).toBe(false);
  });

  it('değerlendirilmemiş madde uyumsuz DEĞİL, bilinmeyendir', () => {
    expect(degerlendirmeImi(degerlendirme({ durum: 'degerlendirilmedi' }))).toBe('unk');
    expect(degerlendirmeImi(degerlendirme({ durum: 'incelemede' }))).toBe('unk');
  });

  it('kanıtsız uyumlu kör güvenle yeşil gösterilmez', () => {
    const d = degerlendirme({ guven: 'kanit_yok', kanitlar: [] });
    expect(degerlendirmeImi(d)).toBe('md');
    expect(kanitYok(d)).toBe(true);
    expect(kanitMetni(d)).toEqual({ metin: 'kanıt yok', durum: 'md' });
  });

  it('bayat kanıt kritik hücre üretir ama satırı uyumsuz yapmaz', () => {
    const d = degerlendirme({ guven: 'bayat_kanit', kanitBayat: true });
    expect(kanitMetni(d).durum).toBe('bd');
    expect(degerlendirmeImi(d)).toBe('md');
  });

  it('açık bulgu uyumlu kaydı bile kritik yapar', () => {
    const d = degerlendirme({
      acikBulgu: 1,
      bulgular: [{ id: 'b1', baslik: 'Eksik', durum: 'acik', onem: 'yuksek' }],
    });
    expect(degerlendirmeImi(d)).toBe('bd');
  });

  it('kanıtlı uyumlu tamdır ve kuyruğa inebilir', () => {
    const d = degerlendirme();
    expect(degerlendirmeImi(d)).toBe('ok');
    expect(takipte(d)).toBe(false);
  });

  it('sıralama en kötüyü öne alır, kapsam dışını en sona', () => {
    const kritik = degerlendirme({ id: 'a', durum: 'uyumsuz' });
    const bilinmeyen = degerlendirme({ id: 'b', durum: 'degerlendirilmedi' });
    const disarida = degerlendirme({ id: 'c', durum: 'kapsamdisi' });
    const tam = degerlendirme({ id: 'd' });
    const sirali = [tam, disarida, bilinmeyen, kritik].sort(degerlendirmeSirasi);
    expect(sirali.map((x) => x.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('kimlik sözcüğü işaretçiyle çelişmez', () => {
    // Açık bulgu işaretçiyi kritiğe çeker: sözcük de "Uyumlu" diyemez.
    const bulgulu = degerlendirme({
      acikBulgu: 1,
      bulgular: [{ id: 'b1', baslik: 'Eksik', durum: 'acik', onem: 'orta' }],
    });
    expect(degerlendirmeImi(bulgulu)).toBe('bd');
    expect(degerlendirmeSozu(bulgulu)).toBe('Bulgu açık');

    const kanitsiz = degerlendirme({ guven: 'kanit_yok', kanitlar: [] });
    expect(degerlendirmeSozu(kanitsiz)).toBe('Kanıtsız uyumlu');
    expect(degerlendirmeSozu(degerlendirme({ guven: 'bayat_kanit', kanitBayat: true })))
      .toBe('Kanıtı bayat');
    expect(degerlendirmeSozu(degerlendirme())).toBe('Uyumlu');
    expect(degerlendirmeSozu(degerlendirme({ durum: 'kapsamdisi' }))).toBe('Kapsam dışı');
  });

  it('kimlik cümlesi bilinmeyeni sıfırdan ayırır', () => {
    expect(degerlendirmeCumlesi(degerlendirme({ durum: 'degerlendirilmedi' })))
      .toContain('sıfır sayılmaz');
    expect(degerlendirmeCumlesi(degerlendirme({ durum: 'kapsamdisi' })))
      .toContain('kapsam dışı');
  });

  it('kısa kod çerçeve önekini düşürür', () => {
    expect(surecKisaKod('EPDK-SYM-4.2.1', 'EPDK-SYM')).toBe('4.2.1');
    expect(surecKisaKod('A.5.9', 'ISO-27001')).toBe('A.5.9');
  });
});

/* ═══ Regülasyon kütüphanesi ═════════════════════════════════════════ */

function madde(ek: Partial<Madde> = {}): Madde {
  return {
    id: 'm', kod: 'EPDK-SYM-4', kisaKod: '4', baslik: 'Varlık Yönetimi',
    metin: 'Kritik enerji altyapısına ait varlıklar.', ustMaddeId: null,
    kanitTipi: null, surumsuz: false, alanlar: [], altSayisi: 0, kullanimSayisi: 0,
    ...ek,
  };
}

const KATALOG: Madde[] = [
  madde({ id: 'b1', kod: 'EPDK-SYM-4', kisaKod: '4', baslik: 'Varlık Yönetimi', altSayisi: 2 }),
  madde({ id: 'y1', kod: 'EPDK-SYM-4.1', kisaKod: '4.1', baslik: 'Envanter',
    ustMaddeId: 'b1', alanlar: [{ id: 'a-bt', kod: 'BT' }] }),
  madde({ id: 'y2', kod: 'EPDK-SYM-4.2', kisaKod: '4.2', baslik: 'Sınıflandırma',
    ustMaddeId: 'b1' }),
  madde({ id: 'b2', kod: 'EPDK-SYM-5', kisaKod: '5', baslik: 'Erişim',
    alanlar: [{ id: 'a-bt', kod: 'BT' }] }),
];

function reg(ek: Partial<Reg> = {}): Reg {
  return {
    id: 'r-1', kod: 'EPDK-SYM', ad: 'EPDK Siber Yetkinlik', surum: null,
    aktif: true, surecSayisi: 2, maddeler: KATALOG, surumler: [], ...ek,
  };
}

describe('katalog ağacı', () => {
  const agac = agaciKur(KATALOG);

  it('kök maddeleri null anahtarı altında toplar', () => {
    expect((agac.get(null) ?? []).map((m) => m.id)).toEqual(['b1', 'b2']);
  });

  it('yaprakları bölümün altından toplar; alt maddesi olmayan kök kendi yaprağıdır', () => {
    expect(yapraklar(KATALOG[0], agac).map((m) => m.id)).toEqual(['y1', 'y2']);
    expect(yapraklar(KATALOG[3], agac).map((m) => m.id)).toEqual(['b2']);
  });

  it('dalları girintiyle düzleştirir', () => {
    expect(dallar(KATALOG[0], agac)).toEqual([
      { madde: KATALOG[1], derinlik: 0 },
      { madde: KATALOG[2], derinlik: 0 },
    ]);
  });

  it('işaretçi katalog bütünlüğünü kodlar, uyumu değil', () => {
    // 4.2'nin kapsam alanı yok → bölüm eksik sayılır.
    expect(maddeImi(KATALOG[0], agac)).toBe('md');
    expect(maddeImi(KATALOG[1], agac)).toBe('ok');
    expect(maddeImi(KATALOG[2], agac)).toBe('md');
    expect(alansizSayisi(reg(), agac)).toBe(1);
  });

  it('kataloğu boş çerçeve BİLİNMEYENDİR; tek madde ise kendi yaprağıdır', () => {
    expect(regImi(reg({ maddeler: [] }), agaciKur([]))).toBe('unk');
    const tek = [madde({ id: 'x', alanlar: [{ id: 'a-bt', kod: 'BT' }] })];
    expect(maddeImi(tek[0], agaciKur(tek))).toBe('ok');
    expect(regImi(reg({ maddeler: tek }), agaciKur(tek))).toBe('ok');
  });

  it('arama bölümü altındaki eşleşme yüzünden ayakta tutar', () => {
    expect(eslesiyor(KATALOG[0], 'sınıflandırma', agac)).toBe(true);
    expect(eslesiyor(KATALOG[3], 'sınıflandırma', agac)).toBe(false);
    expect(eslesiyor(KATALOG[3], '', agac)).toBe(true);
  });

  it('kullanımdaki ya da alt maddesi olan madde silinemez', () => {
    expect(silinebilir(madde())).toBe(true);
    expect(silinebilir(madde({ kullanimSayisi: 3 }))).toBe(false);
    expect(silinebilir(madde({ altSayisi: 1 }))).toBe(false);
  });
});

describe('açılış çerçevesi', () => {
  it('kataloğu eksik olan çerçeveyi önceler, boş kataloğa düşmez', () => {
    const bos = reg({ id: 'bos', kod: 'AAA', maddeler: [] });
    const eksik = reg({ id: 'eksik', kod: 'ZZZ' });          // 4.2'nin alanı yok
    expect(acilisCercevesi([bos, eksik])?.id).toBe('eksik');
  });

  it('eksik yoksa kataloğu dolu olan ilk çerçeveye düşer', () => {
    const bos = reg({ id: 'bos', kod: 'AAA', maddeler: [] });
    const tam = reg({ id: 'tam', kod: 'BBB',
      maddeler: [madde({ id: 't1', alanlar: [{ id: 'a-bt', kod: 'BT' }] })] });
    expect(acilisCercevesi([bos, tam])?.id).toBe('tam');
    expect(acilisCercevesi([])).toBeNull();
  });
});

describe('sürüm yaşam döngüsü', () => {
  it('aktif sürümü olmayan katalog bilinmeyendir, boş değil', () => {
    expect(surumImi(reg())).toBe('unk');
    expect(surumsuzSayisi(reg({ maddeler: KATALOG.map((m) => ({ ...m, surumsuz: true })) })))
      .toBe(4);
  });

  it('aktif sürüm varken bekleyen taslak planlı işaretçi verir', () => {
    const aktif = { id: 'v1', etiket: '2026', durum: 'aktif', maddeSayisi: 4,
      yururluk: gunSonra(-30), farklar: [] };
    expect(surumImi(reg({ surumler: [aktif] }))).toBe('ok');
    expect(surumImi(reg({ surumler: [aktif,
      { id: 'v2', etiket: '2027', durum: 'taslak', maddeSayisi: 4, yururluk: null, farklar: [] }],
    }))).toBe('pl');
  });

  it('özet yalnız GERÇEK farkı sayar — "ayni" fark değildir', () => {
    const s = { id: 'v2', etiket: '2027', durum: 'taslak', maddeSayisi: 5, yururluk: null,
      farklar: [
        { kod: 'A', tip: 'yeni', ozet: null, etki: null },
        { kod: 'B', tip: 'ayni', ozet: null, etki: null },
      ] };
    expect(surumOzeti(s)).toBe('5 madde · 1 fark');
  });
});

/* ═══ Çapraz eşleme ══════════════════════════════════════════════════ */

function m(id: string, regId: string, regKod: string, kod: string): M {
  return { id, kod, kisaKod: kod, baslik: `${kod} maddesi`, regId, regKod };
}

const EPDK = [m('e1', 'r1', 'EPDK-SYM', '4.1'), m('e2', 'r1', 'EPDK-SYM', '4.2'),
  m('e3', 'r1', 'EPDK-SYM', '4.3')];
const ISO = [m('i1', 'r2', 'ISO-27001', 'A.5.9'), m('i2', 'r2', 'ISO-27001', 'A.8.1')];
const CBDDO = [m('c1', 'r3', 'CBDDO', '3.1')];

const ESLER: E[] = [
  { id: 'x1', denklik: 'tam', aciklama: null, kaynak: EPDK[0], hedef: ISO[0] },
  { id: 'x2', denklik: 'kismi', aciklama: 'kapsam dar', kaynak: ISO[1], hedef: EPDK[0] },
  { id: 'x3', denklik: 'ilgili', aciklama: null, kaynak: EPDK[1], hedef: ISO[1] },
  { id: 'x4', denklik: 'tam', aciklama: null, kaynak: EPDK[2], hedef: CBDDO[0] },
];

describe('çapraz eşleme', () => {
  const hucre = hucreleriKur(ESLER);

  it('eşleme yönsüzdür: iki yön de aynı kaydı açar', () => {
    expect(hucre.get(anahtar('e1', 'i1'))?.id).toBe('x1');
    expect(hucre.get(anahtar('i1', 'e1'))?.id).toBe('x1');
    expect(hucre.get(anahtar('e1', 'i2'))?.id).toBe('x2');
  });

  it('denklik gücü işaretçiye çevrilir; "ilgili" elmas DEĞİLDİR', () => {
    expect(DENKLIK_IM.tam).toBe('ok');
    expect(DENKLIK_IM.kismi).toBe('md');
    expect(DENKLIK_IM.ilgili).toBe('pl');
    expect(DENKLIK_IM.ilgili).not.toBe('unk');
  });

  it('çift filtresi yönden bağımsızdır', () => {
    expect(ciftinEsleri(ESLER, 'r1', 'r2').map((e) => e.id)).toEqual(['x1', 'x2', 'x3']);
    expect(ciftinEsleri(ESLER, 'r2', 'r1').map((e) => e.id)).toEqual(['x1', 'x2', 'x3']);
  });

  it('matris YALNIZ eşlemesi olan maddelerden kurulur', () => {
    const k = matrisKur(EPDK, ISO, hucre);
    expect(k.satirlar.map((x) => x.id)).toEqual(['e1', 'e2']);
    expect(k.kolonlar.map((x) => x.id)).toEqual(['i1', 'i2']);
    // e3'ün eşi başka çerçevede: bu matriste satır AÇILMAZ.
    expect(k.satirlar.some((x) => x.id === 'e3')).toBe(false);
  });

  it('bütçe aşılınca satır ve sütun toplanır, sayısı bildirilir', () => {
    const k = matrisKur(EPDK, ISO, hucre, 1, 1);
    expect(k.satirlar).toHaveLength(1);
    expect(k.kolonlar).toHaveLength(1);
    expect(k.toplananSatir).toBe(1);
    expect(k.toplananKolon).toBeGreaterThanOrEqual(0);
  });

  it('karşılıksız madde ÖLÇÜLMEMİŞTİR; başka çerçevedeki eşi ayrı sayılır', () => {
    const bos = karsiliksizlar(EPDK, ISO, hucre);
    expect(bos.map((x) => x.id)).toEqual(['e3']);
    expect(digerCerceveEsleri(EPDK[2], ESLER, 'r2')).toBe(1);
    expect(digerCerceveEsleri(EPDK[0], ESLER, 'r2')).toBe(0);
  });

  it('yaprak olmayan maddeye bağlı denklik çizilebilir kümeden düşer', () => {
    const bolum = m('kok', 'r1', 'EPDK-SYM', '4');   // yaprak değil: evrende yok
    const kirli: E[] = [...ESLER,
      { id: 'x9', denklik: 'tam', aciklama: null, kaynak: bolum, hedef: ISO[0] }];
    const evren = [...EPDK, ...ISO, ...CBDDO];
    expect(cizilebilirEsler(kirli, evren).map((e) => e.id)).toEqual(['x1', 'x2', 'x3', 'x4']);
    // Sayaç ile hücre aynı kümeden okunur: 5 kayıt var, 4'ü çizilebilir.
    expect(kirli.length - cizilebilirEsler(kirli, evren).length).toBe(1);
  });

  it('açılış çifti eşlemesi en yoğun ikiliye kurulur', () => {
    const cerceveler = [
      { id: 'r3', kod: 'CBDDO', ad: 'CBDDÖ' },
      { id: 'r1', kod: 'EPDK-SYM', ad: 'EPDK' },
      { id: 'r2', kod: 'ISO-27001', ad: 'ISO' },
    ];
    // r1×r2 üç denklik taşır; alfabetik ilk çift (r3×r1) yalnız bir tane.
    expect(acilisCifti(cerceveler, ESLER)).toEqual({ sol: 'r1', sag: 'r2' });
    expect(acilisCifti([], ESLER)).toEqual({ sol: '', sag: '' });
  });

  it('başlık matris satırına sığacak kadar kısaltılır', () => {
    expect(kisaBaslik('Kısa başlık')).toBe('Kısa başlık');
    const uzun = kisaBaslik('Varlık envanterinin bütünlüğü ve güncelliği ile ilgili kontroller');
    expect(uzun.length).toBeLessThanOrEqual(43);
    expect(uzun.endsWith('…')).toBe(true);
  });
});
