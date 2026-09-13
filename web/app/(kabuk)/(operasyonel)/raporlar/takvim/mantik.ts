/* RAPORLAMA TAKVİMİ · SAF KATMAN

   Ekranın TEK birincil işi: "hangi raporlama dönemi açık, ne zamana kadar,
   sırada ne var". Bu dosya o soruyu cevaplayan satırları üretir; hiçbir
   şey yazmaz ve saat OKUMAZ — `simdi` dışarıdan gelir (sunucu bir kez
   okur, iki makine iki farklı sayı göstermesin).

   ── DÖNEMSİZ YÜKÜMLÜLÜK LİSTEDEN DÜŞMEZ ───────────────────────────────
   Mevzuatın periyodunu vermediği bir yükümlülüğün `BildirimDonemi`
   satırı YOKTUR. Bu satırları gizlemek, ekranı "her şey yolunda"
   gösterirdi: kurumun bir raporlama yükümlülüğü var, ürün periyodunu
   bilmiyor ve bunu SÖYLEMİYOR olurdu. Bilinmeyen ≠ sıfır — dönemsiz
   yükümlülük kendi grubunda, bilinmeyen sınıfıyla durur. */

import {
  DONEMSIZ_SOZU, DONEM_DURUM_SINIFI, DONEM_DURUM_SOZU, DONEM_SOZU,
  TESLIMSIZ_SOZU, donemGeriSayimi, gorunenDonemDurumu,
  type Donem, type DonemDurumu,
} from '@/lib/uyum/bildirimDonemi';
import type { Durum } from '@/components/kabuk/temel';

/** Sunucudan gelen dönem kaydı — ekranın ihtiyacı kadarı. */
export type DonemKaydi = {
  id: string;
  donemEtiketi: string;
  baslangic: string;
  bitis: string;
  /** `null` = mevzuat teslim süresi vermedi; geri sayım YOK. */
  sonTarih: string | null;
  durum: string;
  referansNo: string | null;
  verenAd: string | null;
  verilmeZamani: string | null;
  teyitZamani: string | null;
  uygulanmazGerekcesi: string | null;
};

/** Takvim tetikli yükümlülük + (varsa) dönemleri. */
export type YukumlulukKaydi = {
  id: string;
  kod: string;
  ad: string;
  merci: string;
  dayanak: string;
  kanalNotu: string | null;
  /** `null` = periyot mevzuatta belirlenmedi. */
  donem: string | null;
  donemBaslangici: string | null;
  /** `null` = teslim süresi mevzuatta belirlenmedi. */
  teslimGun: number | null;
  donemler: DonemKaydi[];
};

export const GRUP_DONEM = 'Raporlama dönemleri';
export const GRUP_DONEMSIZ = 'Dönemi mevzuatta belirlenmemiş yükümlülükler';

/** Ekran satırı — dönem ya da dönemsiz yükümlülük. */
export type TakvimSatiri = {
  id: string;
  /** Dönemsiz yükümlülükte `null`: üzerinde verilecek bir karar yoktur. */
  donemId: string | null;
  yukumlulukId: string;
  kod: string;
  ad: string;
  merci: string;
  dayanak: string;
  kanalNotu: string | null;
  donemEtiketi: string;
  periyotSozu: string;
  /** Ham durum — motorun ne YAZDIĞI. Dönemsiz satırda `null`. */
  durum: DonemDurumu | null;
  /** Ekranın gösterdiği durum: süresi geçmiş ama motor henüz koşmamışsa
      ekran bunu SAKLAMAZ. Yazma yok — yalnız görünüm. */
  gorunen: DonemDurumu | null;
  durumSozu: string;
  im: Durum;
  /** Geri sayım cümlesi; süre yoksa mevzuatın hâli. */
  geriSayimSozu: string;
  /** `false` = sayaç YOK (dönem ya da teslim süresi belirlenmemiş). */
  sureVar: boolean;
  gecti: boolean;
  kalanDakika: number | null;
  sonTarih: string | null;
  referansNo: string | null;
  verenAd: string | null;
  verilmeZamani: string | null;
  teyitZamani: string | null;
  uygulanmazGerekcesi: string | null;
  grup: string;
};

const DONEM_ADI = (d: string | null): string => (
  d === null ? DONEMSIZ_SOZU : DONEM_SOZU[d as Donem] ?? d
);

/** Yükümlülük listesini ekran satırlarına çevirir. */
export function takvimSatirlari(
  yukumlulukler: YukumlulukKaydi[], simdi: number,
): TakvimSatiri[] {
  const satirlar: TakvimSatiri[] = [];

  for (const y of yukumlulukler) {
    const ortak = {
      yukumlulukId: y.id, kod: y.kod, ad: y.ad, merci: y.merci,
      dayanak: y.dayanak, kanalNotu: y.kanalNotu,
      periyotSozu: DONEM_ADI(y.donem),
    };

    if (y.donemler.length === 0) {
      /* DÖNEMSİZ SATIR. Periyot belirlenmemişse motor dönem açmaz ve
         açmadığını ekran söyler; periyot belliyken dönem yoksa da satır
         kalır — motor henüz koşmamış olabilir ve "henüz koşmadı" ile
         "yükümlülük yok" aynı şey değildir. */
      satirlar.push({
        ...ortak,
        id: `yuk:${y.id}`,
        donemId: null,
        donemEtiketi: '—',
        durum: null,
        gorunen: null,
        durumSozu: y.donem === null
          ? DONEMSIZ_SOZU
          : 'Dönem henüz açılmadı — motor bu yükümlülüğü işlemedi',
        im: 'unk',
        geriSayimSozu: y.donem === null ? DONEMSIZ_SOZU : TESLIMSIZ_SOZU,
        sureVar: false,
        gecti: false,
        kalanDakika: null,
        sonTarih: null,
        referansNo: null,
        verenAd: null,
        verilmeZamani: null,
        teyitZamani: null,
        uygulanmazGerekcesi: null,
        grup: GRUP_DONEMSIZ,
      });
      continue;
    }

    for (const d of y.donemler) {
      const sonTarih = d.sonTarih === null ? null : new Date(d.sonTarih).getTime();
      const geriSayim = donemGeriSayimi({ sonTarih, simdi });
      const gorunen = gorunenDonemDurumu({
        donemDurumu: d.durum, geriSayim,
      }) as DonemDurumu;
      satirlar.push({
        ...ortak,
        id: d.id,
        donemId: d.id,
        donemEtiketi: d.donemEtiketi,
        durum: d.durum as DonemDurumu,
        gorunen,
        durumSozu: DONEM_DURUM_SOZU[gorunen] ?? gorunen,
        im: (DONEM_DURUM_SINIFI[gorunen] ?? 'unk') as Durum,
        geriSayimSozu: geriSayim.soz,
        sureVar: geriSayim.sureVar,
        gecti: geriSayim.gecti,
        kalanDakika: geriSayim.kalanDakika,
        sonTarih: d.sonTarih,
        referansNo: d.referansNo,
        verenAd: d.verenAd,
        verilmeZamani: d.verilmeZamani,
        teyitZamani: d.teyitZamani,
        uygulanmazGerekcesi: d.uygulanmazGerekcesi,
        grup: GRUP_DONEM,
      });
    }
  }

  /* SIRALAMA KARARI TAŞIR: en yakın son tarih üstte, sayacı olmayan
     dönemler ardından, dönemsiz yükümlülükler en altta. Kullanıcının ilk
     üç saniyede aradığı satır "ne zamana kadar"ı olan satırdır. */
  return satirlar.sort((a, b) => {
    if (a.grup !== b.grup) return a.grup === GRUP_DONEM ? -1 : 1;
    if (a.sureVar !== b.sureVar) return a.sureVar ? -1 : 1;
    if (a.sureVar && b.sureVar) {
      const fark = (a.kalanDakika ?? 0) - (b.kalanDakika ?? 0);
      if (fark !== 0) return fark;
    }
    return a.kod.localeCompare(b.kod, 'tr') || a.donemEtiketi.localeCompare(b.donemEtiketi, 'tr');
  });
}

export type TakvimOzeti = {
  toplamYukumluluk: number;
  acik: number;
  suresiGecti: number;
  kapali: number;
  /** Periyodu mevzuatta belirlenmemiş yükümlülük sayısı — SIFIR DEĞİL, YOK. */
  donemsiz: number;
  /** Dönemi var ama teslim süresi yok — sayaç gösterilmez. */
  teslimsiz: number;
};

export function takvimOzeti(satirlar: TakvimSatiri[]): TakvimOzeti {
  const yukumlulukler = new Set(satirlar.map((s) => s.yukumlulukId));
  return {
    toplamYukumluluk: yukumlulukler.size,
    acik: satirlar.filter((s) => s.gorunen === 'acik').length,
    suresiGecti: satirlar.filter((s) => s.gorunen === 'suresi_gecti').length,
    kapali: satirlar.filter((s) => s.gorunen === 'verildi' || s.gorunen === 'teyit_alindi'
      || s.gorunen === 'uygulanmaz').length,
    donemsiz: satirlar.filter((s) => s.grup === GRUP_DONEMSIZ).length,
    teslimsiz: satirlar.filter((s) => s.donemId !== null && !s.sureVar).length,
  };
}

/** Ekran mercekleri — kapalı dönemler varsayılan görünümü kirletmez. */
export const MERCEKLER = [
  { id: 'acik', ad: 'Açık' },
  { id: 'gecti', ad: 'Süresi geçti' },
  { id: 'sayacsiz', ad: 'Sayacı olmayan' },
  { id: 'hepsi', ad: 'Tümü' },
] as const;

export function mercekSuz(satirlar: TakvimSatiri[], mercek: string): TakvimSatiri[] {
  if (mercek === 'gecti') return satirlar.filter((s) => s.gorunen === 'suresi_gecti');
  /* SAYAÇSIZ MERCEĞİ bilinçli olarak vardır: "ürün neyi bilmiyor"
     sorusunun kendi görünümü olmalı — ölçülmeyeni aramak için ekranı
     baştan sona taramak gerekmemeli. */
  if (mercek === 'sayacsiz') return satirlar.filter((s) => !s.sureVar);
  if (mercek === 'hepsi') return satirlar;
  return satirlar.filter((s) => s.gorunen === 'acik' || s.gorunen === 'suresi_gecti'
    || s.grup === GRUP_DONEMSIZ);
}
