import { describe, expect, it } from 'vitest';
import {
  aktarimSatirlari, baslikCumlesi, basvuruSatirlari, kapsamCumlesi,
  veriKorumaOzeti, type AktarimKaydi, type BasvuruKaydi, type FaaliyetKaydi,
} from '../app/(kabuk)/(operasyonel)/kisisel-veri/mantik';
import type { SureKurali } from '@/lib/veriKoruma/sureler';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · /kisisel-veri EKRAN MANTIĞI [KVK-ENV-006]

   Depodaki her ekranın bir `*-mantik*.test.ts` dosyası var; bağımsız
   inceleme (#50 tur 1) mevzuat radarında bunun eksikliğini kusurla
   birlikte yakaladı. Bu ekran o dersle birlikte yazıldı.

   ── EN PAHALI İDDİA ───────────────────────────────────────────────────
   Üç ayrı "bilinmiyor" hâli TEK sayıya toplanmamalı: sayacı işlemeyen
   başvuru · tarihi girilmemiş aktarım · değerlendirilmemiş faaliyet.
   Toplansaydı ekran üç bambaşka işi (süre kuralı kurmak · tarihi yazmak
   · faaliyeti değerlendirmek) aynı satıra sıkıştırırdı.
   ═══════════════════════════════════════════════════════════════════════ */

const SIMDI = new Date('2026-09-10T09:00:00Z').getTime();
const GUN = 24 * 3_600_000;

const KURAL: SureKurali = {
  konu: 'basvuru_yanit', gun: 30, isGunu: false, haftaSonu: null,
  dayanak: 'Kurgusal dayanak', aktif: true,
};

const basvuru = (o: Partial<BasvuruKaydi>): BasvuruKaydi => ({
  id: 'b1', kod: 'VSB-001', alinma: new Date(SIMDI - 3 * GUN), konu: 'bilgi_talebi',
  kanal: null, ozet: null, durum: 'yeni', sonTarih: null,
  yanitMetni: null, redGerekcesi: null, ...o,
});

const faaliyet = (o: Partial<FaaliyetKaydi>): FaaliyetKaydi => ({
  id: 'f1', kod: 'KVK-001', ad: 'Kurgusal faaliyet', amac: 'Kurgusal amaç',
  hukukiSebep: 'Kurgusal sebep', surecKod: 'SUR-1', surecAd: 'Kurgusal süreç',
  ozelNitelikli: false, veriKategorileri: [], ilgiliKisiGruplari: [],
  aliciGruplari: [], saklamaAdi: null, maddeKodu: null, aktarimSayisi: 0, ...o,
});

const aktarim = (o: Partial<AktarimKaydi>): AktarimKaydi => ({
  id: 'a1', faaliyetKod: 'KVK-001', aliciUlke: 'Kurgusalya', aliciAd: null,
  dayanak: 'standart_sozlesme', bildirimTarihi: null, ...o,
});

describe('ÜÇ AYRI BİLİNMİYOR — tek sayıya toplanmaz [KVK-ENV-006]', () => {
  const AKTARIM_KURALI: SureKurali = { ...KURAL, konu: 'aktarim_bildirim_standart_sozlesme', gun: 5, isGunu: true };

  it('değerlendirilmemiş faaliyet ile tarihsiz aktarım AYRI sayılır [KVK-ENV-006]', () => {
    const o = veriKorumaOzeti({
      basvurular: basvuruSatirlari([basvuru({})], KURAL, SIMDI),
      faaliyetler: [
        faaliyet({ id: 'f1', ozelNitelikli: null }),
        faaliyet({ id: 'f2', ozelNitelikli: false }),
      ],
      aktarimlar: aktarimSatirlari([aktarim({})], AKTARIM_KURALI, SIMDI),
    });
    expect(o.degerlendirilmeyen).toBe(1);
    expect(o.tarihsizAktarim).toBe(1);
    /* İkisi AYRI cümlede görünür — tek bir "sorunlu kayıt" sayısı YOK. */
    const c = kapsamCumlesi(o);
    expect(c).toContain('1 faaliyette özel nitelikli veri DEĞERLENDİRİLMEDİ');
    expect(c).toContain('1 aktarımda bildirim tarihi GİRİLMEDİ');
    expect(c.toLocaleLowerCase('tr')).not.toContain('sorunlu');
  });

  it('özel nitelikli FALSE ile NULL aynı kefeye konmaz [KVK-ENV-006]', () => {
    /* `false` = insan baktı ve yok dedi. `null` = kimse bakmadı.
       İkisini toplamak, değerlendirilmiş bir envanteri eksik göstermek
       ya da eksik olanı temiz göstermek olurdu. */
    const hepsiHayir = veriKorumaOzeti({
      basvurular: [], aktarimlar: [],
      faaliyetler: [faaliyet({ id: 'f1', ozelNitelikli: false }),
        faaliyet({ id: 'f2', ozelNitelikli: false })],
    });
    expect(hepsiHayir.degerlendirilmeyen).toBe(0);
    const hepsiBos = veriKorumaOzeti({
      basvurular: [], aktarimlar: [],
      faaliyetler: [faaliyet({ id: 'f1', ozelNitelikli: null }),
        faaliyet({ id: 'f2', ozelNitelikli: null })],
    });
    expect(hepsiBos.degerlendirilmeyen).toBe(2);
  });

  it('SÜRE KURALI olmayan başvuru "süresiz" sayılır ve cümleyle söylenir [KVK-ENV-006]', () => {
    const o = veriKorumaOzeti({
      basvurular: basvuruSatirlari([basvuru({})], null, SIMDI),
      faaliyetler: [], aktarimlar: [],
    });
    expect(o.suresizBasvuru).toBe(1);
    expect(kapsamCumlesi(o)).toContain('süre kuralı YOK');
  });

  it('BİR BAŞVURU, BİR SAYAÇ: süresi geçen bekleyen sayılmaz [KVK-ENV-006]', () => {
    const o = veriKorumaOzeti({
      basvurular: basvuruSatirlari([
        basvuru({ id: 'b1', durum: 'suresi_gecti' }),
        basvuru({ id: 'b2', durum: 'yeni' }),
      ], KURAL, SIMDI),
      faaliyetler: [], aktarimlar: [],
    });
    expect(o.suresiGecen).toBe(1);
    expect(o.bekleyenBasvuru, 'süresi geçen başvuru İKİNCİ kez sayıldı').toBe(1);
  });
});

describe('EKRAN CÜMLELERİ — sıfır başvuru "temiz" demez [KVK-ENV-006]', () => {
  it('süresi GEÇEN varsa başlık ONU söyler [KVK-ENV-006]', () => {
    const o = veriKorumaOzeti({
      basvurular: basvuruSatirlari([basvuru({ durum: 'suresi_gecti' })], KURAL, SIMDI),
      faaliyetler: [faaliyet({})], aktarimlar: [],
    });
    expect(baslikCumlesi(o)).toBe('1 BAŞVURUNUN SÜRESİ GEÇTİ');
  });

  it('envanter BOŞSA başlık bunu söyler — "yolunda" demez [KVK-ENV-006]', () => {
    const o = veriKorumaOzeti({ basvurular: [], faaliyetler: [], aktarimlar: [] });
    expect(baslikCumlesi(o)).toBe('İŞLEME ENVANTERİ BOŞ');
  });
});

describe('GERİ SAYIM SÖZÜ — üç hâl üç cümle [KVK-ENV-006]', () => {
  it('süre yoksa geri sayım YERİNE "belirlenmedi" der [KVK-ENV-006]', () => {
    const [s] = basvuruSatirlari([basvuru({})], null, SIMDI);
    expect(s.geri.sureVar).toBe(false);
    expect(s.geri.soz).toContain('belirlenmedi');
    expect(s.geri.soz).not.toMatch(/kaldı|GECİKME/);
  });

  it('süre GEÇMİŞSE "GECİKME" der, kalmışsa "kaldı" [KVK-ENV-006]', () => {
    const [gecmis] = basvuruSatirlari(
      [basvuru({ alinma: new Date(SIMDI - 60 * GUN) })], KURAL, SIMDI);
    expect(gecmis.geri.sureVar && gecmis.geri.gecti).toBe(true);
    expect(gecmis.geri.soz).toContain('GECİKME');
    const [kalan] = basvuruSatirlari([basvuru({})], KURAL, SIMDI);
    expect(kalan.geri.soz).toContain('kaldı');
  });
});

describe('AKTARIM BİLDİRİMİ — dayanak ve tarih ayrı sorular [KVK-ENV-006]', () => {
  const AKTARIM_KURALI: SureKurali = { ...KURAL, konu: 'aktarim_bildirim_standart_sozlesme', gun: 5, isGunu: true };

  it('bildirim GEREKTİRMEYEN dayanakta tarih SORULMAZ [KVK-ENV-006]', () => {
    const [s] = aktarimSatirlari([aktarim({ dayanak: 'yeterlilik' })], AKTARIM_KURALI, SIMDI);
    expect(s.bildirim.hal).toBe('gerekmiyor');
    expect(s.dayanakSozu).toBe('Yeterlilik kararı bulunan ülke');
  });

  it('TANINMAYAN dayanak kendi adıyla görünür, uydurulmaz [KVK-ENV-006]', () => {
    const [s] = aktarimSatirlari(
      [aktarim({ dayanak: 'kurgusal_yeni' })], AKTARIM_KURALI, SIMDI);
    expect(s.dayanakSozu).toBe('kurgusal_yeni');
    expect(s.bildirim.hal).toBe('gerekmiyor');
  });
});
