import { describe, expect, it } from 'vitest';
import {
  MERCEKLER, bolumle, envanterDisaAktarimi, metrikleriHesapla, mercekten,
  sirala, suz, type Mercek, type V,
} from '@/app/(kabuk)/(operasyonel)/envanter/mantik';
import { celiskiVarMi } from '@/lib/varlik/canliDurus';
import { ornekVarlik } from './yardim/varlik';

/* ═══════════════════════════════════════════════════════════════════════
   Senaryo kütüğünün envanter boşlukları

   Bu dosya, mutlu yolun DIŞINDA kalan hâlleri ölçer: boş envanter, sonuç
   vermeyen süzgeç, süzülmüş dışa aktarım, kapsam sızıntısı ve envanter
   ile sahanın çelişmesi. Kütükteki kimlikler test başlığında geçer.
   ═══════════════════════════════════════════════════════════════════════ */

const SIMDI = new Date('2026-09-04T09:00:00.000Z').getTime();

describe('Envanter · boş ve süzülmüş hâller', () => {
  it('kapsamda hiç varlık yokken sayaçlar SIFIR ölçümdür, uydurma değil [ENV-LST-002]', () => {
    const m = metrikleriHesapla([], SIMDI);
    /* Boş envanterde her sayaç sıfırdır ve bu ÖLÇÜLMÜŞ bir sıfırdır:
       ekran "veri yok" der, "her şey yolunda" demez. */
    expect(m.kullanimdaki).toBe(0);
    expect(m.bilinmeyen).toBe(0);
    expect(m.sahipsiz).toBe(0);
    const b = bolumle(sirala([], SIMDI), SIMDI, false);
    expect(b.gorunur).toEqual([]);
    expect(b.toplanan).toEqual([]);
  });

  it('sonuç vermeyen mercek BOŞ küme döndürür — sessizce hepsini göstermez [ENV-LST-003]', () => {
    const saglikli = ornekVarlik({
      etiket: 'SAG-1', kritiklik: 'orta', yamaDurumu: 'guncel',
      edrDurumu: 'var', yedekDurumu: 'var', izlemeDurumu: 'var',
      logKaynagi: 'var', internetMaruziyeti: 'yok', uzaktanErisim: false,
      eosTarihi: '2030-01-01T00:00:00.000Z',
    });
    const suzulen = suz([saglikli], {
      mercek: 'sinyal', tesisId: null, turKapsami: null, kritiklik: null, arama: '',
    }, SIMDI);
    /* "Sinyal" merceği yalnız bilinen kötü ve kısmi kayıtları alır; temiz
       bir kayıt bu mercekte GÖRÜNMEZ ve ekran boş süzgeç durumuna düşer. */
    expect(suzulen).toEqual([]);
    expect(mercekten(saglikli, 'sinyal' as Mercek, SIMDI)).toBe(false);
    /* Mercek kimlikleri ekranla aynı kümedir — ölü bir mercek kalmaz. */
    expect(MERCEKLER.map((m) => m.id)).toContain('sinyal');
  });
});

describe('Envanter · dışa aktarım', () => {
  const a = ornekVarlik({ etiket: 'A-1', kritiklik: 'kritik' });
  const b = ornekVarlik({ etiket: 'B-1', kritiklik: 'dusuk' });

  it('dosya EKRANDA GÖRÜNEN süzülmüş kümeyi taşır [ENV-DIS-001]', () => {
    const suzulen = suz([a, b], {
      mercek: 'hepsi', tesisId: null, turKapsami: null, kritiklik: 'kritik', arama: '',
    }, SIMDI);
    expect(suzulen.map((v) => v.etiket)).toEqual(['A-1']);

    const tablo = envanterDisaAktarimi(suzulen, SIMDI);
    /* Başlık + bir satır: dosya ile ekran ayrışsaydı dosyayı açan kişi
       başka bir gerçeği okurdu. */
    expect(tablo).toHaveLength(2);
    expect(tablo[1]![0]).toBe('A-1');
  });

  it('dosya kapsam dışı hiçbir satır taşımaz [ENV-DIS-004]', () => {
    /* Kapsam sorguda uygulanır; dışa aktarım o kümenin ÜSTÜNE çıkamaz.
       Burada ölçülen şey şu: dışa aktarım kendi başına bir kaynak
       açmıyor, kendisine verilen listeyi yazıyor. */
    const kapsamli = [a];
    const tablo = envanterDisaAktarimi(kapsamli, SIMDI);
    const etiketler = tablo.slice(1).map((s) => s[0]);
    expect(etiketler).toEqual(['A-1']);
    expect(etiketler).not.toContain('B-1');
  });
});

describe('Canlı duruş · envanter ile saha çelişkisi', () => {
  it('iki değer farklıysa ÇELİŞKİ işaretlenir [DUR-CAK-002]', () => {
    expect(celiskiVarMi('Windows Server 2022', 'Windows Server 2019')).toBe(true);
  });

  it('değerlerden biri girilmemişse çelişki SAYILMAZ', () => {
    /* "Girilmemiş" ile "farklı" aynı şey değildir; boş alanı çelişki
       saymak ekranı her gün yanlış uyarı verir hâle getirirdi. */
    expect(celiskiVarMi(null, 'Windows 11')).toBe(false);
    expect(celiskiVarMi('Windows 11', null)).toBe(false);
    expect(celiskiVarMi('  ', 'Windows 11')).toBe(false);
  });

  it('yalnız boşlukla ayrılan aynı değer çelişki değildir', () => {
    expect(celiskiVarMi(' Windows 11 ', 'Windows 11')).toBe(false);
  });
});

describe('Envanter · tip sözleşmesi', () => {
  it('örnek varlık kütükteki V tipini tam karşılar', () => {
    const v: V = ornekVarlik();
    expect(v.durus.canli).toEqual([]);
    expect(v.zimmet).toBeNull();
  });
});
