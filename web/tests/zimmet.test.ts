import { describe, expect, it } from 'vitest';
import {
  ZIMMET_AZAMI_GUN, ZIMMET_DURUMLARI, ZIMMET_SINIFI, ZIMMET_SOZU,
  ZIMMET_UYARI_GUN, acikMi, cevapKapisi, iptalKapisi, kalanGun, redSonrasi,
  sonTarihAni, sureDurumu, talepKapisi, zimmetCumlesi, zimmetOzeti,
} from '../lib/varlik/zimmet';

/* ═══ OT-09b · Zimmet kabul/red akışı ══════════════════════════════════

   Bu testlerin çoğu bir YETKİ testidir. Akışın var olma sebebi, sahipliğin
   karşılıklı bir imzaya bağlanmasıdır; "yönetici kişi adına kabul etsin"
   diyen tek bir satır bu sebebi ortadan kaldırır. Aşağıdaki her vaka o
   satırın yazılmasını engellemek için var. */

const GUN = 86_400_000;
const SIMDI = Date.parse('2026-09-04T00:00:00.000Z');

const TABAN = {
  atananId: 'k2', atayanId: 'k1', atananAktif: true,
  mevcutSahipId: 'k1' as string | null, acikTalepVar: false, sureGun: 14,
};

describe('Sözlük', () => {
  it('beş durum vardır ve hepsinin sözü ile sınıfı yazılıdır', () => {
    expect(ZIMMET_DURUMLARI).toHaveLength(5);
    for (const d of ZIMMET_DURUMLARI) {
      expect(ZIMMET_SOZU[d]).toBeTruthy();
      expect(ZIMMET_SINIFI[d]).toBeTruthy();
    }
  });

  it('cevapsız kalan zimmet SAĞLIKLI sayılmaz', () => {
    expect(ZIMMET_SINIFI.suresi_doldu).toBe('bd');
  });

  it('kabul dışında hiçbir durum "ok" değildir', () => {
    const okOlanlar = ZIMMET_DURUMLARI.filter((d) => ZIMMET_SINIFI[d] === 'ok');
    expect(okOlanlar).toEqual(['kabul_edildi']);
  });

  it('yalnız "bekliyor" açıktır', () => {
    expect(acikMi('bekliyor')).toBe(true);
    expect(acikMi('kabul_edildi')).toBe(false);
    expect(acikMi('suresi_doldu')).toBe(false);
  });
});

describe('Talep kapısı', () => {
  it('geçerli talebi kabul eder', () => {
    expect(talepKapisi(TABAN).ok).toBe(true);
  });

  it('kendi kendine zimmet açılamaz', () => {
    const r = talepKapisi({ ...TABAN, atananId: 'k1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('Kendinize');
  });

  it('pasif kullanıcıya zimmet verilemez', () => {
    const r = talepKapisi({ ...TABAN, atananAktif: false });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('Pasif');
  });

  it('zaten sahibi olan kişiye ikinci kez zimmet açılmaz', () => {
    expect(talepKapisi({ ...TABAN, mevcutSahipId: 'k2' }).ok).toBe(false);
  });

  it('aynı varlık için ikinci bekleyen talep açılamaz', () => {
    const r = talepKapisi({ ...TABAN, acikTalepVar: true });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('cevap bekleyen');
  });

  it('sahipsiz varlık zimmetlenebilir', () => {
    expect(talepKapisi({ ...TABAN, mevcutSahipId: null }).ok).toBe(true);
  });

  it('süre en az bir gün olmalı', () => {
    expect(talepKapisi({ ...TABAN, sureGun: 0 }).ok).toBe(false);
    expect(talepKapisi({ ...TABAN, sureGun: -3 }).ok).toBe(false);
    expect(talepKapisi({ ...TABAN, sureGun: 1.5 }).ok).toBe(false);
  });

  it('süre tavanı aşılamaz — sonsuza kadar bekleyen zimmet, zimmet değildir', () => {
    expect(talepKapisi({ ...TABAN, sureGun: ZIMMET_AZAMI_GUN }).ok).toBe(true);
    expect(talepKapisi({ ...TABAN, sureGun: ZIMMET_AZAMI_GUN + 1 }).ok).toBe(false);
  });
});

describe('Cevap kapısı — kimse başkası adına cevap veremez', () => {
  const acik = {
    durum: 'bekliyor', atananId: 'k2', cevaplayanId: 'k2',
    kabul: true, cevapNotu: null as string | null,
    sonTarih: SIMDI + 5 * GUN, simdi: SIMDI,
  };

  it('zimmetlenen kişi kabul edebilir', () => {
    expect(cevapKapisi(acik).ok).toBe(true);
  });

  it('ATAYAN kişi kabul EDEMEZ', () => {
    const r = cevapKapisi({ ...acik, cevaplayanId: 'k1' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('yalnız zimmetlenen kişi');
  });

  it('başka bir kullanıcı kabul edemez', () => {
    expect(cevapKapisi({ ...acik, cevaplayanId: 'k9' }).ok).toBe(false);
  });

  it('kapanmış talep yeniden cevaplanamaz', () => {
    for (const d of ['kabul_edildi', 'reddedildi', 'iptal_edildi', 'suresi_doldu']) {
      expect(cevapKapisi({ ...acik, durum: d }).ok).toBe(false);
    }
  });

  it('süresi geçmiş talep cevaplanamaz', () => {
    const r = cevapKapisi({ ...acik, simdi: SIMDI + 10 * GUN });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('süresi geçmiş');
  });

  it('red GEREKÇE ister', () => {
    const r = cevapKapisi({ ...acik, kabul: false, cevapNotu: null });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.sebep).toContain('gerekçe');
  });

  it('boşluktan ibaret gerekçe red için yetmez', () => {
    expect(cevapKapisi({ ...acik, kabul: false, cevapNotu: '   ' }).ok).toBe(false);
  });

  it('gerekçeli red kabul edilir', () => {
    expect(cevapKapisi({ ...acik, kabul: false, cevapNotu: 'Bu saha bana ait değil' }).ok)
      .toBe(true);
  });

  it('kabulde not isteğe bağlıdır', () => {
    expect(cevapKapisi({ ...acik, kabul: true, cevapNotu: null }).ok).toBe(true);
  });
});

describe('İptal kapısı — yönetici iptal eder, KABUL ETMEZ', () => {
  const t = { durum: 'bekliyor', iptalEdenId: 'k1', atayanId: 'k1', yoneticiMi: false };

  it('talebi açan kişi iptal edebilir', () => {
    expect(iptalKapisi(t).ok).toBe(true);
  });

  it('yönetici iptal edebilir', () => {
    expect(iptalKapisi({ ...t, iptalEdenId: 'k9', yoneticiMi: true }).ok).toBe(true);
  });

  it('ilgisiz kullanıcı iptal edemez', () => {
    expect(iptalKapisi({ ...t, iptalEdenId: 'k9', yoneticiMi: false }).ok).toBe(false);
  });

  it('kapanmış talep iptal edilemez', () => {
    expect(iptalKapisi({ ...t, durum: 'kabul_edildi' }).ok).toBe(false);
  });
});

describe('Süre', () => {
  it('son tarih başlangıç + süre', () => {
    expect(sonTarihAni(SIMDI, 14)).toBe(SIMDI + 14 * GUN);
  });

  it('uyarı eşiğinden uzakken süre işler', () => {
    expect(sureDurumu({ sonTarih: SIMDI + 10 * GUN, simdi: SIMDI })).toBe('isliyor');
  });

  it('eşiğe girince daralır', () => {
    expect(sureDurumu({ sonTarih: SIMDI + ZIMMET_UYARI_GUN * GUN, simdi: SIMDI }))
      .toBe('daraliyor');
  });

  it('geçince geçer', () => {
    expect(sureDurumu({ sonTarih: SIMDI - 1, simdi: SIMDI })).toBe('gecti');
  });

  it('kalan gün geçmişte negatiftir', () => {
    expect(kalanGun({ sonTarih: SIMDI - 3 * GUN, simdi: SIMDI })).toBe(-3);
  });
});

describe('Red sonrası sahiplik — red SAHİPSİZLİK ÜRETMEZ', () => {
  it('aktif önceki sahibe döner', () => {
    expect(redSonrasi({ oncekiSahipId: 'k1', oncekiSahipAktif: true }))
      .toEqual({ yeniSahipId: 'k1', sahipsizKaliyor: false });
  });

  it('önceki sahip PASİFSE dönmez — sorun görünmez kılınmaz', () => {
    expect(redSonrasi({ oncekiSahipId: 'k1', oncekiSahipAktif: false }))
      .toEqual({ yeniSahipId: null, sahipsizKaliyor: true });
  });

  it('önceki sahip yoksa varlık sahipsiz kalır ve bu İŞARETLENİR', () => {
    const r = redSonrasi({ oncekiSahipId: null, oncekiSahipAktif: false });
    expect(r.yeniSahipId).toBeNull();
    expect(r.sahipsizKaliyor).toBe(true);
  });
});

describe('Özet', () => {
  const t = (durum: string, gun: number) => ({ durum, sonTarih: SIMDI + gun * GUN });

  it('boş kütükte cümle uydurmaz', () => {
    const o = zimmetOzeti([], SIMDI);
    expect(o.toplam).toBe(0);
    expect(zimmetCumlesi(o)).toContain('Hiç zimmet talebi açılmamış');
  });

  it('bekleyen, daralan ve gecikmişi ayrı sayar', () => {
    const o = zimmetOzeti([
      t('bekliyor', 10), t('bekliyor', 1), t('bekliyor', -2),
      t('kabul_edildi', -30), t('reddedildi', -40),
    ], SIMDI);
    expect(o.bekleyen).toBe(3);
    expect(o.daralan).toBe(1);
    expect(o.gecikmis).toBe(1);
    expect(o.kabul).toBe(1);
    expect(o.red).toBe(1);
  });

  it('gecikmiş varsa cümle ONU söyler', () => {
    const o = zimmetOzeti([t('bekliyor', -2)], SIMDI);
    expect(zimmetCumlesi(o)).toContain('GEÇTİ');
  });

  it('kapanmış talepler bekleyene sayılmaz', () => {
    const o = zimmetOzeti([t('suresi_doldu', -1), t('iptal_edildi', -1)], SIMDI);
    expect(o.bekleyen).toBe(0);
    expect(o.suresiDolan).toBe(1);
    expect(o.iptal).toBe(1);
  });
});
