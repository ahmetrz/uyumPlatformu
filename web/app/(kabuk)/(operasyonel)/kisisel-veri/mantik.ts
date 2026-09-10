import {
  aktarimBildirimDurumu, type AktarimDurumu, DAYANAK_SOZU, type AktarimDayanagi,
} from '@/lib/veriKoruma/aktarim';
import {
  BASVURU_DURUM_SINIFI, BASVURU_DURUM_SOZU, type BasvuruDurumu,
  basvuruGeriSayimi,
} from '@/lib/veriKoruma/basvuru';
import type { GeriSayim, SureKurali } from '@/lib/veriKoruma/sureler';

/* ═══════════════════════════════════════════════════════════════════════
   R15 · /kisisel-veri EKRAN MANTIĞI

   ── BİRİNCİL İŞ ───────────────────────────────────────────────────────
   "Süresi dolmak üzere olan veri sahibi başvurusunu bul ve yanıtla."
   İkinci iş aynı ağırlıkta: "hangi işleme faaliyetinin kaynağı
   BİLİNMİYOR" — gizlenirse ekran "her şey yolunda" derken envanterin
   yarısı değerlendirilmemiş olabilir.

   ── ROTA NEDEN /kisisel-veri, /kvkk DEĞİL ─────────────────────────────
   Çekirdeğe mevzuat adı girmez (CLAUDE.md · sektör ve ülke bağımsızlık).
   `/kvkk` bir Türkiye kanununun kısaltmasıdır ve bir Alman kiracının
   adres çubuğunda görünmesi ürünün vaadini bozar. Ekranın BAŞLIĞI
   kiracının paketinden gelen terimi taşıyabilir; ROTASI taşımaz.
   ═══════════════════════════════════════════════════════════════════════ */

export type FaaliyetKaydi = {
  id: string;
  kod: string;
  ad: string;
  amac: string;
  hukukiSebep: string;
  surecKod: string;
  surecAd: string;
  /** `null` = DEĞERLENDİRİLMEDİ; "hayır" DEĞİL. */
  ozelNitelikli: boolean | null;
  veriKategorileri: string[];
  ilgiliKisiGruplari: string[];
  aliciGruplari: string[];
  saklamaAdi: string | null;
  maddeKodu: string | null;
  aktarimSayisi: number;
};

export type AktarimKaydi = {
  id: string;
  faaliyetKod: string;
  aliciUlke: string;
  aliciAd: string | null;
  dayanak: string;
  bildirimTarihi: Date | null;
};

export type BasvuruKaydi = {
  id: string;
  kod: string;
  alinma: Date;
  konu: string;
  kanal: string | null;
  ozet: string | null;
  durum: string;
  sonTarih: Date | null;
  yanitMetni: string | null;
  redGerekcesi: string | null;
};

export type SicilKaydiGorunumu = {
  id: string;
  sicilAd: string;
  sicilNo: string | null;
  kayitTarihi: Date | null;
  sonGuncelleme: Date | null;
  /** `null` = kayıt yükümlülüğü DEĞERLENDİRİLMEDİ. */
  yukumluMu: boolean | null;
  muafiyetGerekcesi: string | null;
  dayanak: string | null;
};

/* ── BAŞVURU SATIRI ────────────────────────────────────────────────── */

export type BasvuruSatiri = BasvuruKaydi & {
  durumSozu: string;
  durumSinifi: 'ok' | 'md' | 'bd' | 'unk' | 'pl';
  geri: GeriSayim;
};

export function basvuruSatirlari(
  kayitlar: readonly BasvuruKaydi[], kural: SureKurali | null, simdiMs: number,
): BasvuruSatiri[] {
  return kayitlar.map((b) => ({
    ...b,
    durumSozu: BASVURU_DURUM_SOZU[b.durum as BasvuruDurumu] ?? b.durum,
    durumSinifi: BASVURU_DURUM_SINIFI[b.durum as BasvuruDurumu] ?? 'unk',
    geri: basvuruGeriSayimi({ alinmaMs: b.alinma.getTime(), simdiMs, kural }),
  }));
}

/* ── AKTARIM SATIRI ────────────────────────────────────────────────── */

export type AktarimSatiri = AktarimKaydi & {
  dayanakSozu: string;
  bildirim: AktarimDurumu;
};

export function aktarimSatirlari(
  kayitlar: readonly AktarimKaydi[], kural: SureKurali | null, simdiMs: number,
): AktarimSatiri[] {
  return kayitlar.map((a) => ({
    ...a,
    dayanakSozu: DAYANAK_SOZU[a.dayanak as AktarimDayanagi] ?? a.dayanak,
    bildirim: aktarimBildirimDurumu({
      dayanak: a.dayanak,
      bildirimTarihiMs: a.bildirimTarihi?.getTime() ?? null,
      kural, simdiMs,
    }),
  }));
}

/* ── ÖZET ──────────────────────────────────────────────────────────── */

export type VeriKorumaOzeti = {
  /** Yanıt bekleyen (yeni + incelemede) başvuru. */
  bekleyenBasvuru: number;
  /** Süresi GEÇMİŞ başvuru. */
  suresiGecen: number;
  /** Envanterdeki işleme faaliyeti. */
  faaliyet: number;
  /** Özel nitelikli olup olmadığı DEĞERLENDİRİLMEMİŞ faaliyet — AYRI. */
  degerlendirilmeyen: number;
  /** Bildirim tarihi GİRİLMEMİŞ, süresi işlemeyen aktarım — AYRI. */
  tarihsizAktarim: number;
  /** Süre kuralı olmadığı için geri sayımı hiç OLMAYAN başvuru. */
  suresizBasvuru: number;
};

/* BİR BAŞVURU, BİR HÂL. Sayaçlar bağımsız süzgeçlerle kurulsaydı aynı
   satır iki kutuya birden girerdi — mevzuat radarında ölçüldü (#50 tur 1)
   ve aynı kusur burada tekrarlanmadı. */
export function veriKorumaOzeti(o: {
  basvurular: readonly BasvuruSatiri[];
  faaliyetler: readonly FaaliyetKaydi[];
  aktarimlar: readonly AktarimSatiri[];
}): VeriKorumaOzeti {
  let bekleyen = 0; let gecen = 0; let suresiz = 0;
  for (const b of o.basvurular) {
    if (b.durum === 'suresi_gecti') { gecen += 1; continue; }
    if (b.durum === 'yeni' || b.durum === 'incelemede') {
      bekleyen += 1;
      if (!b.geri.sureVar) suresiz += 1;
    }
  }
  return {
    bekleyenBasvuru: bekleyen,
    suresiGecen: gecen,
    faaliyet: o.faaliyetler.length,
    /* NULL "hayır" DEĞİLDİR: kimse bakmamış demektir ve ayrı sayılır. */
    degerlendirilmeyen: o.faaliyetler.filter((f) => f.ozelNitelikli === null).length,
    tarihsizAktarim: o.aktarimlar.filter((a) => a.bildirim.hal === 'tarih_girilmedi').length,
    suresizBasvuru: suresiz,
  };
}

/** Başlık cümlesi — sıfır başvuru "her şey yolunda" DEMEZ. */
export function baslikCumlesi(o: VeriKorumaOzeti): string {
  if (o.suresiGecen > 0) return `${o.suresiGecen} BAŞVURUNUN SÜRESİ GEÇTİ`;
  if (o.bekleyenBasvuru > 0) return `${o.bekleyenBasvuru} BAŞVURU YANIT BEKLİYOR`;
  if (o.faaliyet === 0) return 'İŞLEME ENVANTERİ BOŞ';
  return 'YANIT BEKLEYEN BAŞVURU YOK';
}

/**
 * Kapsam cümlesi — ekranın NEYİ GÖRMEDİĞİNİ söyler.
 *
 * "Bilinmeyen ≠ sıfır" bu ekranda üç ayrı cümleye dönüşür: sayacı
 * işlemeyen başvuru, tarihi girilmemiş aktarım ve değerlendirilmemiş
 * faaliyet. Gizlenselerdi ekran "yanıt bekleyen başvuru yok" derken
 * aslında hiçbir sayaç çalışmıyor olabilirdi.
 */
export function kapsamCumlesi(o: VeriKorumaOzeti): string {
  const p: string[] = [`${o.faaliyet} işleme faaliyeti kayıtlı`];
  if (o.degerlendirilmeyen > 0) {
    p.push(`${o.degerlendirilmeyen} faaliyette özel nitelikli veri DEĞERLENDİRİLMEDİ`);
  }
  if (o.tarihsizAktarim > 0) {
    p.push(`${o.tarihsizAktarim} aktarımda bildirim tarihi GİRİLMEDİ (sayaç çalışmıyor)`);
  }
  if (o.suresizBasvuru > 0) {
    p.push(`${o.suresizBasvuru} başvuruda süre kuralı YOK (geri sayım gösterilmiyor)`);
  }
  return p.join(' · ');
}
