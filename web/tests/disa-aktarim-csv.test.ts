import { describe, expect, it } from 'vitest';
import {
  CSV_BOM, CSV_SATIR_SONU, csvAlani, csvMetni, damgaliAd, formulKalkani,
  guvenliDosyaAdi, hucreMetni,
} from '../lib/disaAktarim/csv';
import {
  ENVANTER_DISA_BASLIKLARI, envanterDisaAktarimi, envanterDisaSatiri,
} from '../app/(kabuk)/(operasyonel)/envanter/mantik';
import { ornekVarlik } from './yardim/varlik';

/* ═══ OT-38 · CSV dışa aktarımı ════════════════════════════════════════

   Bu testlerin çoğu bir GÜVENLİK testidir. CSV kolay bir biçim gibi
   görünür ve tam bu yüzden yanlış üretilir: dosya açılır, doğru görünür,
   yanlış olur. Aşağıdaki her vaka gerçekte görülmüş bir kusurun karşılığı
   olacak şekilde yazıldı. */

describe('Hücre metni', () => {
  it('null ve undefined BOŞ dizeye düşer', () => {
    expect(hucreMetni(null)).toBe('');
    expect(hucreMetni(undefined)).toBe('');
  });

  it('"null" metnini yazmaz — ölçülmemiş alan dosyada da boştur', () => {
    expect(csvAlani(null)).not.toContain('null');
    expect(csvAlani(undefined)).toBe('');
  });

  it('sayıyı olduğu gibi taşır', () => {
    expect(hucreMetni(0)).toBe('0');
    expect(hucreMetni(-12.5)).toBe('-12.5');
  });

  it('sıfır boşa düşmez — ölçülmüş sıfır ile ölçülmemiş ayrıdır', () => {
    expect(csvAlani(0)).toBe('0');
    expect(csvAlani(null)).toBe('');
  });
});

describe('Formül enjeksiyonu kalkanı', () => {
  it('= ile başlayan metni tırnaklar', () => {
    expect(formulKalkani('=1+1')).toBe("'=1+1");
  });

  it('klasik komut çalıştırma yükünü etkisizleştirir', () => {
    const yuk = '=cmd|\'/C calc\'!A0';
    expect(formulKalkani(yuk).startsWith("'=")).toBe(true);
  });

  it('dört tehlikeli başlangıcın hepsini yakalar', () => {
    for (const b of ['=', '+', '-', '@']) {
      expect(formulKalkani(`${b}KOMUT`)).toBe(`'${b}KOMUT`);
    }
  });

  it('sekme ve satır başı ile başlayan hücreyi de yakalar', () => {
    expect(formulKalkani('\t=1+1')).toBe("'\t=1+1");
    expect(formulKalkani('\r=1+1')).toBe("'\r=1+1");
  });

  it('sayı tipindeki hücreye DOKUNMAZ', () => {
    expect(formulKalkani(-5)).toBe('-5');
    expect(formulKalkani(0)).toBe('0');
  });

  it('sayı GİBİ metni de bozmaz — "-5" bir saldırı değildir', () => {
    expect(formulKalkani('-5')).toBe('-5');
    expect(formulKalkani('+3,14')).toBe('+3,14');
    expect(formulKalkani('-1.234')).toBe('-1.234');
  });

  it('sayıyla başlayan ama sayı OLMAYAN metni korur', () => {
    expect(formulKalkani('-5+cmd')).toBe("'-5+cmd");
  });

  it('tehlikesiz metne tırnak eklemez', () => {
    expect(formulKalkani('Kızıldere II')).toBe('Kızıldere II');
  });
});

describe('Alan tırnaklama', () => {
  it('ayraç içeren alanı tırnaklar', () => {
    expect(csvAlani('a;b', ';')).toBe('"a;b"');
    expect(csvAlani('a;b', ',')).toBe('a;b');
    expect(csvAlani('a,b', ',')).toBe('"a,b"');
  });

  it('çift tırnağı ikiler', () => {
    expect(csvAlani('12" raf')).toBe('"12"" raf"');
  });

  it('satır sonu içeren alanı tırnaklar', () => {
    expect(csvAlani('bir\niki')).toBe('"bir\niki"');
    expect(csvAlani('bir\riki')).toBe('"bir\riki"');
  });

  it('baştaki ve sondaki boşluğu tırnakla korur', () => {
    expect(csvAlani(' boşluklu ')).toBe('" boşluklu "');
  });

  it('kalkanlı alanı da doğru tırnaklar', () => {
    expect(csvAlani('=A1;B2', ';')).toBe('"\'=A1;B2"');
  });
});

describe('CSV metni', () => {
  const satirlar = [['Ad', 'Kod'], ['Kızıldere II', 'KZD2']];

  it('BOM ile başlar — Excel Türkçe karakterleri doğru okusun', () => {
    expect(csvMetni(satirlar).startsWith(CSV_BOM)).toBe(true);
  });

  it('BOM kapatılabilir', () => {
    expect(csvMetni(satirlar, { bom: false }).startsWith(CSV_BOM)).toBe(false);
  });

  it('Türkçe karakterler bozulmadan geçer', () => {
    const m = csvMetni([['Şırnak', 'Iğdır', 'çöğüş']]);
    expect(m).toContain('Şırnak');
    expect(m).toContain('Iğdır');
    expect(m).toContain('çöğüş');
  });

  it('satır sonu CRLF', () => {
    const m = csvMetni(satirlar, { bom: false });
    expect(m.split(CSV_SATIR_SONU)[0]).toBe('Ad;Kod');
  });

  it('son satırdan sonra da satır sonu koyar', () => {
    expect(csvMetni(satirlar, { bom: false }).endsWith(CSV_SATIR_SONU)).toBe(true);
  });

  it('varsayılan ayraç noktalı virgül — Türkçe Excel böyle açar', () => {
    expect(csvMetni([['a', 'b']], { bom: false })).toBe(`a;b${CSV_SATIR_SONU}`);
  });

  it('virgül ayracı istenirse verilir', () => {
    expect(csvMetni([['a', 'b']], { bom: false, ayrac: ',' })).toBe(`a,b${CSV_SATIR_SONU}`);
  });

  it('boş dizide yalnız BOM döner — sahte başlık üretmez', () => {
    expect(csvMetni([])).toBe(CSV_BOM);
  });

  it('düzensiz satır uzunluğunu OLDUĞU GİBİ yazar, doldurmaz', () => {
    const m = csvMetni([['a', 'b', 'c'], ['x']], { bom: false });
    expect(m).toBe(`a;b;c${CSV_SATIR_SONU}x${CSV_SATIR_SONU}`);
  });

  it('10.000 satırı üretir ve satır sayısı korunur', () => {
    const cok = Array.from({ length: 10_000 }, (_, i) => [`etiket-${i}`, i, 'Kızıldere II']);
    const m = csvMetni(cok, { bom: false });
    expect(m.trimEnd().split(CSV_SATIR_SONU)).toHaveLength(10_000);
  });
});

describe('Dosya adı', () => {
  it('yol ayracını ve tehlikeli işaretleri temizler', () => {
    expect(guvenliDosyaAdi('../../etc/passwd', 'csv')).toBe('etc-passwd.csv');
  });

  it('uzantıyı bir kez ekler', () => {
    expect(guvenliDosyaAdi('envanter.csv', 'csv')).toBe('envanter.csv');
    expect(guvenliDosyaAdi('envanter', 'csv')).toBe('envanter.csv');
  });

  it('boş ada varsayılan verir', () => {
    expect(guvenliDosyaAdi('///', 'csv')).toBe('disa-aktarim.csv');
  });

  it('Türkçe harfleri korur', () => {
    expect(guvenliDosyaAdi('Kızıldere Envanteri', 'csv')).toBe('Kızıldere-Envanteri.csv');
  });

  it('noktayı gövdede bırakmaz — çift uzantı saldırısı olmaz', () => {
    expect(guvenliDosyaAdi('rapor.html', 'csv')).toBe('rapor-html.csv');
  });

  it('damga tarih taşır', () => {
    const ad = damgaliAd('envanter', new Date('2026-09-04T08:30:00').getTime(), 'csv');
    expect(ad).toMatch(/^envanter-20260904-\d{4}\.csv$/);
  });
});

describe('Envanter sütun kümesi', () => {
  const simdi = new Date('2026-09-04T00:00:00Z').getTime();

  it('müşterinin istediği bütün alanları taşır', () => {
    const b = ENVANTER_DISA_BASLIKLARI as readonly string[];
    for (const beklenen of [
      'Etiket', 'Ad', 'Tür', 'Sınıf', 'Santral', 'Ünite', 'Sistem/Servis',
      'Ağ bölgesi', 'Segment', 'VLAN', 'Subnet', 'Üretici', 'Model', 'Seri no',
      'IP', 'MAC', 'İşletim sistemi', 'OS sürümü', 'Firmware', 'Kritiklik',
      'Sahip', 'Ekip', 'Yaşam döngüsü', 'EOL', 'EOS', 'Garanti bitiş',
      'Bakım bitiş', 'Destek bitiş', 'Yama durumu', 'Firmware durumu',
      'EDR kapsaması', 'Log kaynağı', 'İzleme', 'Yedekleme',
      'Son görülme', 'Veri kaynağı',
    ]) {
      expect(b).toContain(beklenen);
    }
  });

  it('satır uzunluğu başlık uzunluğuna EŞİT — sütun kayması olmaz', () => {
    const satir = envanterDisaSatiri(ornekVarlik(), simdi);
    expect(satir).toHaveLength(ENVANTER_DISA_BASLIKLARI.length);
  });

  it('başlık satırı + veri satırları döner', () => {
    const t = envanterDisaAktarimi([ornekVarlik(), ornekVarlik()], simdi);
    expect(t).toHaveLength(3);
    expect(t[0]).toEqual([...ENVANTER_DISA_BASLIKLARI]);
  });

  it('ölçülmemiş tarih BOŞ kalır, "—" yazmaz', () => {
    const v = ornekVarlik({ eosTarihi: null, garantiBitis: null });
    const satir = envanterDisaSatiri(v, simdi);
    expect(satir).not.toContain('—');
  });

  it('keşif kaydı yoksa veri kaynağı "elle" yazar', () => {
    const satir = envanterDisaSatiri(ornekVarlik({ sonKesif: null }), simdi);
    const i = (ENVANTER_DISA_BASLIKLARI as readonly string[]).indexOf('Veri kaynağı');
    expect(satir[i]).toBe('elle');
  });

  it('keşif kaydı varsa kaynak sistemin adını yazar', () => {
    const v = ornekVarlik({
      sonKesif: { id: 'k1', kaynak: 'ot-kesif', sonGorulme: '2026-09-01T00:00:00Z' },
    });
    const i = (ENVANTER_DISA_BASLIKLARI as readonly string[]).indexOf('Veri kaynağı');
    expect(envanterDisaSatiri(v, simdi)[i]).toBe('ot-kesif');
  });

  it('CSV üretimi sütun kaymasına yol açmaz — virgüllü ad bir hücre kalır', () => {
    const v = ornekVarlik({ ad: 'Trafo; yedek, hat' });
    const m = csvMetni(envanterDisaAktarimi([v], simdi), { bom: false });
    const veriSatiri = m.trimEnd().split(CSV_SATIR_SONU)[1]!;
    expect(veriSatiri).toContain('"Trafo; yedek, hat"');
  });

  it('varlık adına gömülü formül dosyada çalışmaz', () => {
    const v = ornekVarlik({ ad: '=HYPERLINK("http://x","tıkla")' });
    const m = csvMetni(envanterDisaAktarimi([v], simdi), { bom: false });
    expect(m).toContain("'=HYPERLINK");
    expect(m).not.toMatch(/(^|;)=HYPERLINK/m);
  });
});
