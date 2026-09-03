/* ═══════════════════════════════════════════════════════════════════════
   A4 · SANTRAL HARİTASI — saf kurallar

   ═══ NEDEN ÜLKE SINIRI ÇİZİLMİYOR ═════════════════════════════════════
   Bu tuval bir enlem/boylam ÇERÇEVESİDİR: paraleller, meridyenler ve
   üzerine oturan santral işaretleri. Türkiye'nin kıyı çizgisi elle
   yaklaştırılmadı — hafızadan çizilmiş bir sınır, ekrandaki her şeyi
   şüpheli hâle getirir; yanlış bir kıyı, olmayan bir kıyıdan pahalıdır.
   Doğrulanmış bir sınır verisi (GeoJSON) eklendiğinde tuval onu alır,
   işaret yerleşimi değişmez: projeksiyon zaten coğrafi.

   ═══ İKİ TÜR KONUM, ASLA KARIŞMAZ ═════════════════════════════════════
   · KESİN     — `Tesis.enlem/boylam` girilmiş; işaret dolu.
   · YAKLAŞIK  — koordinat yok, santralin İLİ biliniyor; işaret il
                 merkezine konur, İÇİ BOŞ çizilir ve "il merkezi ·
                 kesin konum girilmedi" yazılır.
   · YERLEŞTİRİLEMEZ — ne koordinat ne tanınan bir il var; santral haritaya
                 KONMAZ, yanına listelenir. Uydurulmuş bir nokta, sahayı
                 yanlış yere gönderir.
   Bu, ürünün "bilinmeyen ≠ sıfır" kuralının coğrafi hâlidir.
   ═══════════════════════════════════════════════════════════════════════ */

import type { Durum } from '@/components/kabuk/temel';
import type { PortfoySatiri } from '../portfoy/mantik';

/* ── İl merkezleri ────────────────────────────────────────────────────
   Kamuya açık il merkezi koordinatları (ondalık derece, WGS84), YAKLAŞIK
   yerleşim için. Bunlar santralin koordinatı DEĞİLDİR ve öyle sunulmaz:
   işaret içi boş çizilir, künyede "il merkezi" yazar.

   Liste yalnız portföyde geçen illeri taşır; tanınmayan il "yerleştirilemez"
   kovasına düşer — sessizce haritanın ortasına konmaz. */
export const IL_MERKEZI: Record<string, { enlem: number; boylam: number }> = {
  Adana: { enlem: 37.00, boylam: 35.32 },
  Aydın: { enlem: 37.85, boylam: 27.84 },
  Denizli: { enlem: 37.78, boylam: 29.09 },
  Erzincan: { enlem: 39.75, boylam: 39.49 },
  Erzurum: { enlem: 39.90, boylam: 41.27 },
  Eskişehir: { enlem: 39.78, boylam: 30.52 },
  Kars: { enlem: 40.60, boylam: 43.10 },
  Kırklareli: { enlem: 41.74, boylam: 27.22 },
  Manisa: { enlem: 38.62, boylam: 27.43 },
  Osmaniye: { enlem: 37.07, boylam: 36.25 },
  Rize: { enlem: 41.02, boylam: 40.52 },
  Tokat: { enlem: 40.31, boylam: 36.55 },
  Tunceli: { enlem: 39.11, boylam: 39.55 },
  İstanbul: { enlem: 41.01, boylam: 28.98 },
};

/** `konum` serbest metindir ("Denizli/Aydın"). İlk il adı esas alınır. */
export function ilAyikla(konum: string | null | undefined): string | null {
  if (!konum) return null;
  for (const parca of konum.split(/[/,·]/)) {
    const ad = parca.trim();
    if (ad && IL_MERKEZI[ad]) return ad;
  }
  return null;
}

/* ── Projeksiyon ──────────────────────────────────────────────────────
   Eşdikdörtgen (equirectangular): boylam → x, enlem → y. Türkiye'nin
   enlem kuşağında (≈36–42°) meridyenler yaklaşık yarı yarıya sıkışır;
   bu yüzden x ekseni `cos(ortalama enlem)` ile ölçeklenir, yoksa ülke
   doğu-batı yönünde gerilmiş görünürdü.

   Çerçeve Türkiye'nin sınırlarını değil, KAPSAYAN KUTUSUNU verir. */
export const CERCEVE = {
  batı: 25.5, doğu: 45.0, güney: 35.6, kuzey: 42.4,
} as const;

export const TUVAL = { en: 960, boy: 420, kenar: 28 } as const;

const ORTA_ENLEM = (CERCEVE.güney + CERCEVE.kuzey) / 2;
const X_ORAN = Math.cos((ORTA_ENLEM * Math.PI) / 180);

export function yerlestir(enlem: number, boylam: number): { x: number; y: number } {
  const genislik = (CERCEVE.doğu - CERCEVE.batı) * X_ORAN;
  const yukseklik = CERCEVE.kuzey - CERCEVE.güney;
  const ic = { en: TUVAL.en - TUVAL.kenar * 2, boy: TUVAL.boy - TUVAL.kenar * 2 };
  const x = TUVAL.kenar + (((boylam - CERCEVE.batı) * X_ORAN) / genislik) * ic.en;
  // Enlem yukarı artar, SVG y aşağı artar.
  const y = TUVAL.kenar + ((CERCEVE.kuzey - enlem) / yukseklik) * ic.boy;
  return { x, y };
}

/** Çerçevenin dışında kalan bir koordinat haritaya ZORLANMAZ. */
export function cercevede(enlem: number, boylam: number): boolean {
  return enlem >= CERCEVE.güney && enlem <= CERCEVE.kuzey
    && boylam >= CERCEVE.batı && boylam <= CERCEVE.doğu;
}

/* ── İşaret ───────────────────────────────────────────────────────────── */

/* ÜÇ durum, iki değil (P3-8). Eskiden `'kesin' | 'il'` idi ve
   koordinatı olan her santral "kesin" sayılıyordu — kamuya açık bir
   kaynaktan bulunmuş yaklaşık bir nokta da, saha ekibinin GPS'le
   ölçtüğü nokta da. Ekran ikisini de kesin gösteriyordu; "bilinmeyen ≠
   sıfır" kuralının koordinattaki ihlali buydu.

   · `dogrulanmis`   — koordinat var, bir İNSAN doğruladı
   · `dogrulanmamis` — koordinat var, henüz kimse bakmadı (aday)
   · `il`            — koordinat yok, il merkezine yaklaştırıldı */
export type KonumKaynagi = 'dogrulanmis' | 'dogrulanmamis' | 'il';

export type Isaret = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string;
  konum: string | null; il: string | null;
  gucMw: number | null;
  uyumYuzde: number | null;
  acikBulgu: number; acikRisk: number;
  kaynak: KonumKaynagi;
  /** Koordinatın künyesi; `il` kaynağında anlamsız olduğu için null. */
  konumKaynagi: string | null;
  enlem: number; boylam: number;
  x: number; y: number;
  durum: Durum;
  /** Yarıçap kurulu güçten türer; güç yoksa en küçük halka. */
  r: number;
  /* Etiketin işarete göre yönü. Yığında işaretler bir çember üzerine
     dağıtılır; etiket hep sağa yazılsaydı komşusunun üstüne binerdi
     (ölçüldü: Kızıldere üçlüsü, Osmaniye üçlüsü). Etiket, işaretin
     merkezden İTİLDİĞİ yöne yazılır. */
  etiketDx: number;
  etiketDy: number;
  etiketHiza: 'start' | 'end';
};

export type Yerlesim = {
  isaretler: Isaret[];
  /** Ne koordinatı ne tanınan ili olan santraller — haritada YOK, listede VAR. */
  yerlestirilemeyen: PortfoySatiri[];
  dogrulanmisSayisi: number;
  /** Koordinatı var ama doğrulanmamış — haritada "aday" olarak durur. */
  dogrulanmamisSayisi: number;
  yaklasikSayisi: number;
};

/* Uyum yüzdesi → durum. Eşikler kök ekranla aynı okumayı verir:
   ölçülmemiş santral YEŞİL DEĞİL, bilinmeyendir. */
export function uyumDurumu(yuzde: number | null): Durum {
  if (yuzde === null) return 'unk';
  if (yuzde >= 85) return 'ok';
  if (yuzde >= 60) return 'md';
  return 'bd';
}

/** Yarıçap: kurulu güç kökü (alan güçle orantılı olsun), 4–16 px arası. */
export function yaricap(gucMw: number | null): number {
  if (!gucMw || gucMw <= 0) return 4;
  return Math.min(16, 4 + Math.sqrt(gucMw) * 0.9);
}

export function yerlesimKur(satirlar: PortfoySatiri[]): Yerlesim {
  const isaretler: Isaret[] = [];
  const yerlestirilemeyen: PortfoySatiri[] = [];
  let dogrulanmisSayisi = 0;
  let dogrulanmamisSayisi = 0;
  let yaklasikSayisi = 0;

  for (const s of satirlar) {
    let enlem: number | null = null;
    let boylam: number | null = null;
    let kaynak: KonumKaynagi = 'il';

    if (s.enlem !== null && s.boylam !== null && cercevede(s.enlem, s.boylam)) {
      enlem = s.enlem; boylam = s.boylam;
      kaynak = s.konumDogrulandi ? 'dogrulanmis' : 'dogrulanmamis';
    } else {
      const il = ilAyikla(s.konum);
      const merkez = il ? IL_MERKEZI[il] : null;
      if (merkez) { enlem = merkez.enlem; boylam = merkez.boylam; kaynak = 'il'; }
    }

    if (enlem === null || boylam === null) { yerlestirilemeyen.push(s); continue; }
    if (kaynak === 'dogrulanmis') dogrulanmisSayisi++;
    else if (kaynak === 'dogrulanmamis') dogrulanmamisSayisi++;
    else yaklasikSayisi++;

    const { x, y } = yerlestir(enlem, boylam);
    isaretler.push({
      id: s.id, kod: s.kod, ad: s.ad, tipKod: s.tipKod, tipAdi: s.tipAdi,
      konum: s.konum, il: ilAyikla(s.konum),
      gucMw: s.gucMw, uyumYuzde: s.uyumYuzde,
      acikBulgu: s.acikBulgu, acikRisk: s.acikRisk,
      kaynak,
      // `il` kaynağında nokta santralin kendisi değil il merkezi; künye
      // orada bir şeye işaret etmez, bu yüzden null.
      konumKaynagi: kaynak === 'il' ? null : s.konumKaynagi,
      enlem, boylam, x, y,
      durum: uyumDurumu(s.uyumYuzde),
      r: yaricap(s.gucMw),
      etiketDx: 0, etiketDy: 0, etiketHiza: 'start',
    });
  }

  /* Büyük işaret önce çizilir ki küçüğü örtmesin (SVG'de son çizilen
     üstte kalır; sıralama tersten). */
  isaretler.sort((a, b) => b.r - a.r);
  return {
    isaretler, yerlestirilemeyen,
    dogrulanmisSayisi, dogrulanmamisSayisi, yaklasikSayisi,
  };
}

/** Aynı noktaya düşen işaretler — il merkezine yığılan santraller. */
export function yiginlar(isaretler: Isaret[]): Map<string, Isaret[]> {
  const g = new Map<string, Isaret[]>();
  for (const i of isaretler) {
    const anahtar = `${i.x.toFixed(1)}|${i.y.toFixed(1)}`;
    g.set(anahtar, [...(g.get(anahtar) ?? []), i]);
  }
  return g;
}

/* Yığındaki işaretler küçük bir çember üzerine dağıtılır: üst üste binen
   iki nokta "tek santral" gibi okunurdu. Tek başına duran işaret KAYMAZ. */
export function yiginKaydir(isaretler: Isaret[]): Isaret[] {
  const g = yiginlar(isaretler);
  const cikti: Isaret[] = [];
  for (const grup of g.values()) {
    if (grup.length === 1) {
      cikti.push({ ...grup[0], etiketDx: grup[0].r + 5, etiketDy: 3, etiketHiza: 'start' });
      continue;
    }
    const yaricapPx = 6 + grup.length;
    grup.forEach((i, s) => {
      const aci = (s / grup.length) * Math.PI * 2 - Math.PI / 2;
      const dx = Math.cos(aci);
      const dy = Math.sin(aci);
      /* Etiket işaretin itildiği yöne yazılır: sola itilen sola, sağa
         itilen sağa. Böylece bir yığındaki adlar birbirinden AÇILIR. */
      const sola = dx < -0.15;
      cikti.push({
        ...i,
        x: i.x + dx * yaricapPx,
        y: i.y + dy * yaricapPx,
        etiketDx: sola ? -(i.r + 5) : i.r + 5,
        etiketDy: 3 + dy * 4,
        etiketHiza: sola ? 'end' : 'start',
      });
    });
  }
  return cikti;
}

/** Kılavuz çizgileri: tam dereceli paralel ve meridyenler. */
export function kilavuz(): { dikey: { x: number; boylam: number }[]; yatay: { y: number; enlem: number }[] } {
  const dikey: { x: number; boylam: number }[] = [];
  for (let b = Math.ceil(CERCEVE.batı / 5) * 5; b <= CERCEVE.doğu; b += 5) {
    dikey.push({ x: yerlestir(CERCEVE.güney, b).x, boylam: b });
  }
  const yatay: { y: number; enlem: number }[] = [];
  for (let e = Math.ceil(CERCEVE.güney / 2) * 2; e <= CERCEVE.kuzey; e += 2) {
    yatay.push({ y: yerlestir(e, CERCEVE.batı).y, enlem: e });
  }
  return { dikey, yatay };
}

/** Koordinat yazısı — 4 ondalık ≈ 11 m, saha için yeterli çözünürlük. */
export function koordinatYazisi(enlem: number, boylam: number): string {
  return `${enlem.toFixed(4)}° K · ${boylam.toFixed(4)}° D`;
}

export function kaynakYazisi(i: Isaret): string {
  if (i.kaynak === 'il') return `${i.il} il merkezi · konum girilmedi`;
  const nokta = koordinatYazisi(i.enlem, i.boylam);
  if (i.kaynak === 'dogrulanmis') {
    return i.konumKaynagi ? `${nokta} · ${i.konumKaynagi}` : nokta;
  }
  /* Doğrulanmamış nokta KENDİNİ SÖYLER. Sessiz kalmak, onu doğrulanmış
     gibi göstermekle aynı kapıya çıkar. */
  return `${nokta} · ${i.konumKaynagi ?? 'kaynak belirtilmedi'} · DOĞRULANMADI`;
}

/* ── Başlık ölçüsü ───────────────────────────────────────────────────── */

export type HaritaOlcusu = {
  toplam: number;
  dogrulanmis: number;
  dogrulanmamis: number;
  yaklasik: number;
  yerlestirilemeyen: number;
  olculmeyenUyum: number;
};

export function olcu(y: Yerlesim): HaritaOlcusu {
  return {
    toplam: y.isaretler.length + y.yerlestirilemeyen.length,
    dogrulanmis: y.dogrulanmisSayisi,
    dogrulanmamis: y.dogrulanmamisSayisi,
    yaklasik: y.yaklasikSayisi,
    yerlestirilemeyen: y.yerlestirilemeyen.length,
    olculmeyenUyum: y.isaretler.filter((i) => i.uyumYuzde === null).length,
  };
}

export function baslikMetni(o: HaritaOlcusu): { vurgu: string; ad: string; durum: Durum | undefined } {
  if (o.toplam === 0) return { vurgu: '', ad: 'Kapsamınızda santral yok', durum: undefined };
  if (o.yerlestirilemeyen > 0) {
    return { vurgu: `${o.yerlestirilemeyen} santral`, ad: 'haritaya yerleştirilemedi', durum: 'unk' };
  }
  /* Sıra bilinçli: en pahalı belirsizlik önce söylenir. Doğrulanmamış
     nokta, il merkezine yaklaştırılmış noktadan DAHA yanıltıcıdır —
     ikincisi zaten "yaklaşık" diyor, birincisi kesin görünüyor. */
  if (o.dogrulanmamis > 0) {
    return { vurgu: `${o.dogrulanmamis} santral`, ad: 'koordinatı doğrulanmadı', durum: 'md' };
  }
  if (o.dogrulanmis === 0) {
    return { vurgu: `${o.yaklasik} santral`, ad: 'il merkezine yaklaştırıldı', durum: 'md' };
  }
  if (o.yaklasik > 0) {
    return { vurgu: `${o.yaklasik} santral`, ad: 'konumu girilmemiş', durum: 'md' };
  }
  return { vurgu: `${o.dogrulanmis} santral`, ad: 'doğrulanmış konumuyla haritada', durum: 'ok' };
}

/* ── Koordinat doğrulaması (form ve eylem aynı kuralı paylaşır) ──────── */

export function koordinatGecerli(enlem: number, boylam: number): boolean {
  return Number.isFinite(enlem) && Number.isFinite(boylam)
    && enlem >= -90 && enlem <= 90 && boylam >= -180 && boylam <= 180;
}

/** Türkiye çerçevesi dışındaki koordinat için uyarı cümlesi; engel DEĞİL. */
export function cerceveUyarisi(enlem: number, boylam: number): string | null {
  if (!cercevede(enlem, boylam)) {
    return 'Bu koordinat Türkiye çerçevesinin dışında; kayıt edilir ama haritada '
      + 'gösterilmez. Enlem/boylam sırasını karıştırmış olabilirsiniz.';
  }
  return null;
}
