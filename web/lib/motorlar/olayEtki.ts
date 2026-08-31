import 'server-only';
import { db } from '../db';

/* Olay → etki zinciri motoru (P1-4).

   Zincir: Olay → Varlik → SistemServis → IsSureci → Tesis → üretim etkisi.
   Veri yolları: Varlik.sistemId, IsSureciSistemi(surecId, sistemId),
   IsSureci.uretimEtkisi, IsSureci.tesisId, Varlik.uretimEtkisi,
   Varlik.emniyetEtkisi, Varlik.kritiklik, TesisProfili.kritiklikSinifi.

   ─ SÖZLEŞME ─────────────────────────────────────────────────────────────
   1. Motor ÖNERİR, karar vermez. Çıktı YALNIZ `Olay.etkiOnerisiJson`a
      yazılır. `uretimEtkisi/emniyetEtkisi/regulasyonEtkisi/siberEtki`
      alanlarına bu dosya ASLA yazmaz — onları yalnız `etkiDogrula`
      (insan onayı) doldurur.
   2. Dayanaksız öneri yok. Her alan için gerekçede o önerinin hangi
      zincir halkasından geldiği yazılıdır; `bilinmiyor` önerisinin
      gerekçesi de zincirin NEREDE koptuğunu söyler.
   3. `bilinmiyor` ≠ `yok`. Zincir kopuksa (varlığın sistemi yok, sistemin
      süreci yok, sürecin tesisi yok) motor `bilinmiyor` der. `yok` YALNIZ
      tam zincir üzerinden okunan açık bir kayıttan çıkabilir — kayıt
      yokluğu hiçbir yerde "etki yok" sayılmaz.
   4. Koşu `isKos('olay_etki', …)` sarmalayıcısından geçer; sessiz hata yok. */

export const ETKI_ALANLARI = [
  'uretimEtkisi', 'emniyetEtkisi', 'regulasyonEtkisi', 'siberEtki',
] as const;
export type EtkiAlani = (typeof ETKI_ALANLARI)[number];

export const ETKI_ALAN_ETIKET: Record<EtkiAlani, string> = {
  uretimEtkisi: 'Üretim etkisi',
  emniyetEtkisi: 'Emniyet etkisi',
  regulasyonEtkisi: 'Regülasyon etkisi',
  siberEtki: 'Siber etki',
};

export type EtkiSeviyesi =
  | 'bilinmiyor' | 'yok' | 'dusuk' | 'orta' | 'yuksek' | 'kritik' | 'uretim_durdu';

export const SEVIYE_ETIKET: Record<EtkiSeviyesi, string> = {
  bilinmiyor: 'Bilinmiyor', yok: 'Yok', dusuk: 'Düşük', orta: 'Orta',
  yuksek: 'Yüksek', kritik: 'Kritik', uretim_durdu: 'Üretim durdu',
};

/** Alan başına geçerli değer kümesi — doğrulama bu kümeyi zorlar.
    `bilinmiyor` hiçbirinde yok: doğrulanan bir "bilinmiyor" olamaz,
    değerlendirilmemiş alan boş (null) kalır. */
export const SEVIYE_KUMESI: Record<EtkiAlani, EtkiSeviyesi[]> = {
  uretimEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'uretim_durdu'],
  emniyetEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
  regulasyonEtkisi: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
  siberEtki: ['yok', 'dusuk', 'orta', 'yuksek', 'kritik'],
};

const SIRA: Record<EtkiSeviyesi, number> = {
  bilinmiyor: -1, yok: 0, dusuk: 1, orta: 2, yuksek: 3, kritik: 4, uretim_durdu: 5,
};

/** Siber sinyali olan tespit kaynakları — siber etki önerisinin ön koşulu. */
const SIBER_KAYNAKLAR = ['siem', 'otomatik_kural'];

const KAYNAK_ETIKET: Record<string, string> = {
  siem: 'SIEM', operator: 'operatör', tedarikci: 'tedarikçi',
  denetim: 'denetim', musteri: 'müşteri', otomatik_kural: 'otomatik kural',
};

/** Kayıtta duran ham değerin okunabilir hâli (normalleştirmeden ÖNCE). */
const HAM_ETIKET: Record<string, string> = {
  yok: 'yok', dusuk: 'düşük', orta: 'orta', yuksek: 'yüksek',
  kritik: 'kritik', uretim_durur: 'üretim durur', uretim_durdu: 'üretim durdu',
  bilinmiyor: 'bilinmiyor',
};
const ham = (d: string | null) => (d === null ? 'kayıt yok' : HAM_ETIKET[d] ?? d);

/** Kayıttaki serbest metni ölçeğe indirger. Tanınmayan / boş / `bilinmiyor`
    değer null döner — "ölçülmedi" demektir, sıfır değil. */
function seviye(deger: string | null | undefined): EtkiSeviyesi | null {
  if (deger === null || deger === undefined) return null;
  const d = deger.trim().toLowerCase();
  if (d === '' || d === 'bilinmiyor') return null;
  if (d === 'uretim_durur' || d === 'uretim_durdu') return 'uretim_durdu';
  if (d === 'yok' || d === 'dusuk' || d === 'orta' || d === 'yuksek' || d === 'kritik') return d;
  return null;
}

/* ── zincir tipleri ───────────────────────────────────────────────────── */

export type ZincirVarligi = {
  id: string; etiket: string; ad: string; kritiklik: string;
  uretimEtkisi: EtkiSeviyesi | null; emniyetEtkisi: EtkiSeviyesi | null;
  /** kayıttaki ham değerler — gerekçe metni bunları yazar */
  hamUretim: string | null; hamEmniyet: string | null;
  rol: string;
};
export type ZincirSistemi = { id: string; kod: string; ad: string; kritiklik: string };
export type ZincirSureci = {
  id: string; kod: string; ad: string;
  uretimEtkisi: EtkiSeviyesi | null; hamUretim: string | null;
};
export type ZincirTesisi = {
  id: string; kod: string; ad: string;
  profilVar: boolean; kritiklikSinifi: string | null; kritikAltyapi: boolean | null;
};

/** Zincirin nerede koptuğu. null = varlıktan tesise kadar tam. */
export type Kopukluk = 'sistem_yok' | 'surec_yok' | 'tesis_yok' | null;

export const KOPUKLUK_SOZU: Record<Exclude<Kopukluk, null>, string> = {
  sistem_yok: 'varlık bir sisteme bağlı değil',
  surec_yok: 'sistem hiçbir iş sürecine bağlı değil',
  tesis_yok: 'iş sürecinin tesisi kayıtlı değil',
};

export type ZincirHalkasi = {
  /** zincire nereden girildi: olaya bağlı varlıktan mı, doğrudan sistemden mi */
  giris: 'varlik' | 'sistem';
  varlik: ZincirVarligi | null;
  sistem: ZincirSistemi | null;
  surecler: ZincirSureci[];
  tesisler: ZincirTesisi[];
  kopukluk: Kopukluk;
};

export type Gerekce = { alan: EtkiAlani; dayanak: string };

export type EtkiOnerisi = {
  surum: 1;
  motor: 'olay_etki';
  uretilme: string;
  uretimEtkisi: EtkiSeviyesi;
  emniyetEtkisi: EtkiSeviyesi;
  regulasyonEtkisi: EtkiSeviyesi;
  siberEtki: EtkiSeviyesi;
  gerekce: Gerekce[];
  zincir: ZincirHalkasi[];
};

/* ── zincir yürüyüşü ──────────────────────────────────────────────────── */

const sistemSecimi = {
  id: true, kod: true, ad: true, kritiklik: true,
  surecler: {
    select: {
      surec: {
        select: {
          id: true, kod: true, ad: true, uretimEtkisi: true,
          tesis: {
            select: {
              id: true, kod: true, ad: true,
              profil: { select: { kritiklikSinifi: true, kritikAltyapiStatusu: true } },
            },
          },
        },
      },
    },
  },
} as const;

type SistemKaydi = {
  id: string; kod: string; ad: string; kritiklik: string;
  surecler: {
    surec: {
      id: string; kod: string; ad: string; uretimEtkisi: string;
      tesis: {
        id: string; kod: string; ad: string;
        profil: { kritiklikSinifi: string | null; kritikAltyapiStatusu: boolean | null } | null;
      } | null;
    };
  }[];
};

/** Sistemden süreçlere, süreçlerden tesise: halkanın kuyruğu. */
function kuyrugu(sistem: SistemKaydi | null): {
  surecler: ZincirSureci[]; tesisler: ZincirTesisi[]; kopukluk: Kopukluk;
} {
  if (!sistem) return { surecler: [], tesisler: [], kopukluk: 'sistem_yok' };

  const surecler: ZincirSureci[] = sistem.surecler.map((s) => ({
    id: s.surec.id, kod: s.surec.kod, ad: s.surec.ad,
    uretimEtkisi: seviye(s.surec.uretimEtkisi), hamUretim: s.surec.uretimEtkisi,
  }));
  if (surecler.length === 0) return { surecler, tesisler: [], kopukluk: 'surec_yok' };

  const tesisHarita = new Map<string, ZincirTesisi>();
  for (const s of sistem.surecler) {
    const t = s.surec.tesis;
    if (!t || tesisHarita.has(t.id)) continue;
    tesisHarita.set(t.id, {
      id: t.id, kod: t.kod, ad: t.ad,
      profilVar: t.profil !== null,
      kritiklikSinifi: t.profil?.kritiklikSinifi ?? null,
      kritikAltyapi: t.profil?.kritikAltyapiStatusu ?? null,
    });
  }
  const tesisler = [...tesisHarita.values()];
  return { surecler, tesisler, kopukluk: tesisler.length === 0 ? 'tesis_yok' : null };
}

/** Gerekçedeki zincir metni: `VARLIK → SİSTEM → SÜREÇ → TESİS`. */
function zincirMetni(h: ZincirHalkasi, surec?: ZincirSureci, tesis?: ZincirTesisi): string {
  return [
    h.varlik?.etiket,
    h.sistem?.kod,
    surec?.kod,
    tesis?.kod,
  ].filter((x): x is string => Boolean(x)).join(' → ');
}

/* ── öneri türetme ────────────────────────────────────────────────────── */

type Karar = { seviye: EtkiSeviyesi; dayanak: string };

/** Üretim etkisi. `yok` YALNIZ tam zincirdeki bir süreç kaydından çıkabilir;
    zincir kopuksa varlık kaydı ancak POZİTİF bir etkiyi taşıyabilir, kayıt
    yokluğu ya da `yok` değeri `bilinmiyor`a düşer (kopuk zincirden
    "etki yok" sonucu çıkarılamaz). */
function uretimKarari(zincir: ZincirHalkasi[]): Karar {
  let enIyi: { s: EtkiSeviyesi; dayanak: string } | null = null;

  for (const h of zincir) {
    if (h.kopukluk !== null) continue; // tam olmayan zincir süreç kararı veremez
    for (const surec of h.surecler) {
      if (surec.uretimEtkisi === null) continue;
      const tesis = h.tesisler[0];
      const aday = {
        s: surec.uretimEtkisi,
        dayanak: `${zincirMetni(h, surec, tesis)} · iş süreci üretim etkisi ${ham(surec.hamUretim)}`,
      };
      if (!enIyi || SIRA[aday.s] > SIRA[enIyi.s]) enIyi = aday;
    }
  }
  if (enIyi) return { seviye: enIyi.s, dayanak: enIyi.dayanak };

  // Süreç kaydı yok: yalnız varlık kaydındaki POZİTİF etki öneriye dönüşebilir.
  let varlikAday: { s: EtkiSeviyesi; dayanak: string } | null = null;
  for (const h of zincir) {
    const v = h.varlik;
    if (!v || v.uretimEtkisi === null || SIRA[v.uretimEtkisi] <= SIRA.yok) continue;
    const eksik = h.kopukluk === null
      ? 'ulaşılan iş süreçlerinde üretim etkisi kaydı yok'
      : `zincir kopuk — ${KOPUKLUK_SOZU[h.kopukluk]}`;
    const aday = {
      s: v.uretimEtkisi,
      dayanak: `${v.etiket} varlık kaydı üretim etkisi ${ham(v.hamUretim)}`
        + ` · ${eksik} — süreç doğrulaması yok`,
    };
    if (!varlikAday || SIRA[aday.s] > SIRA[varlikAday.s]) varlikAday = aday;
  }
  if (varlikAday) return { seviye: varlikAday.s, dayanak: varlikAday.dayanak };

  return { seviye: 'bilinmiyor', dayanak: kopuklukGerekcesi(zincir, 'üretim etkisi') };
}

/** Emniyet etkisi varlığın KENDİ kaydından okunur (`Varlik.emniyetEtkisi`);
    zincirin ilerisine bakmaz. Kayıt yoksa `bilinmiyor`. */
function emniyetKarari(zincir: ZincirHalkasi[]): Karar {
  let enIyi: { s: EtkiSeviyesi; dayanak: string } | null = null;
  for (const h of zincir) {
    const v = h.varlik;
    if (!v || v.emniyetEtkisi === null) continue;
    const aday = {
      s: v.emniyetEtkisi,
      dayanak: `${v.etiket} varlık kaydı emniyet etkisi ${ham(v.hamEmniyet)}`
        + (h.sistem ? ` · sistem ${h.sistem.kod}` : ''),
    };
    if (!enIyi || SIRA[aday.s] > SIRA[enIyi.s]) enIyi = aday;
  }
  if (enIyi) return { seviye: enIyi.s, dayanak: enIyi.dayanak };

  const varlikSayisi = zincir.filter((h) => h.varlik).length;
  return {
    seviye: 'bilinmiyor',
    dayanak: varlikSayisi === 0
      ? 'olaya varlık bağlanmamış — emniyet etkisi okunacak kayıt yok'
      : `bağlı ${varlikSayisi} varlığın hiçbirinde emniyet etkisi kaydı yok`,
  };
}

/** Regülasyon etkisi santral profilinden gelir: kritik altyapı statüsü,
    yoksa EPDK kritiklik sınıfı. Profil yoksa `bilinmiyor` —
    "kritik altyapı değil" ile "sınıflandırılmadı" aynı şey değildir. */
function regulasyonKarari(zincir: ZincirHalkasi[], olayTesisi: ZincirTesisi | null): Karar {
  const adaylar: { s: EtkiSeviyesi; dayanak: string }[] = [];

  for (const h of zincir) {
    for (const t of h.tesisler) {
      const yol = zincirMetni(h, h.surecler[0], t);
      if (t.kritikAltyapi === true) {
        adaylar.push({ s: 'yuksek', dayanak: `${yol} · santral profili kritik altyapı statüsünde` });
        continue;
      }
      const sinif = seviye(t.kritiklikSinifi);
      if (sinif !== null) {
        adaylar.push({
          s: sinif,
          dayanak: `${yol} · santral profili kritiklik sınıfı ${ham(t.kritiklikSinifi)}`,
        });
      }
    }
  }

  // Zincirden tesise ulaşılamadıysa olayın KENDİ tesis kaydı ikinci dayanaktır.
  if (adaylar.length === 0 && olayTesisi) {
    if (olayTesisi.kritikAltyapi === true) {
      adaylar.push({
        s: 'yuksek',
        dayanak: `${olayTesisi.kod} · olay kaydındaki tesis kritik altyapı statüsünde`
          + ' · varlık→sistem→süreç zinciri kurulamadı',
      });
    } else {
      const sinif = seviye(olayTesisi.kritiklikSinifi);
      if (sinif !== null) {
        adaylar.push({
          s: sinif,
          dayanak: `${olayTesisi.kod} · olay kaydındaki tesisin kritiklik sınıfı`
            + ` ${ham(olayTesisi.kritiklikSinifi)} · varlık→sistem→süreç zinciri kurulamadı`,
        });
      }
    }
  }

  if (adaylar.length === 0) {
    const tesisVar = zincir.some((h) => h.tesisler.length > 0) || olayTesisi !== null;
    return {
      seviye: 'bilinmiyor',
      dayanak: tesisVar
        ? 'ulaşılan tesislerde santral profili / kritiklik sınıfı kaydı yok'
        : kopuklukGerekcesi(zincir, 'regülasyon etkisi'),
    };
  }
  const enIyi = adaylar.reduce((a, b) => (SIRA[b.s] > SIRA[a.s] ? b : a));
  return { seviye: enIyi.s, dayanak: enIyi.dayanak };
}

/** Siber etki yalnız tespit kaynağı siber sinyal taşıdığında önerilir.
    Kaynak operatör/tedarikçi/denetim ise motor `bilinmiyor` der — "siber
    değil" DEMEZ, sadece bunu söyleyecek dayanağı yoktur. */
function siberKarari(zincir: ZincirHalkasi[], tespitKaynagi: string | null): Karar {
  if (!tespitKaynagi) {
    return { seviye: 'bilinmiyor', dayanak: 'tespit kaynağı kaydedilmemiş — siber sinyal okunamıyor' };
  }
  const kaynakAd = KAYNAK_ETIKET[tespitKaynagi] ?? tespitKaynagi;
  if (!SIBER_KAYNAKLAR.includes(tespitKaynagi)) {
    return {
      seviye: 'bilinmiyor',
      dayanak: `tespit kaynağı ${kaynakAd} · siber sinyal taşımıyor, siber etki değerlendirilmedi`,
    };
  }

  let enIyi: { s: EtkiSeviyesi; dayanak: string } | null = null;
  for (const h of zincir) {
    const sistemSeviyesi = h.sistem ? seviye(h.sistem.kritiklik) : null;
    if (sistemSeviyesi !== null && h.sistem) {
      const aday = {
        s: sistemSeviyesi,
        dayanak: `tespit kaynağı ${kaynakAd} · ${zincirMetni(h)} · sistem kritikliği`
          + ` ${ham(h.sistem.kritiklik)}`,
      };
      if (!enIyi || SIRA[aday.s] > SIRA[enIyi.s]) enIyi = aday;
      continue;
    }
    const varlikSeviyesi = h.varlik ? seviye(h.varlik.kritiklik) : null;
    if (varlikSeviyesi !== null && h.varlik) {
      const aday = {
        s: varlikSeviyesi,
        dayanak: `tespit kaynağı ${kaynakAd} · ${h.varlik.etiket} varlık kritikliği`
          + ` ${ham(h.varlik.kritiklik)} · sistem bağı yok`,
      };
      if (!enIyi || SIRA[aday.s] > SIRA[enIyi.s]) enIyi = aday;
    }
  }
  if (enIyi) return { seviye: enIyi.s, dayanak: enIyi.dayanak };

  return {
    seviye: 'bilinmiyor',
    dayanak: `tespit kaynağı ${kaynakAd} siber sinyal taşıyor ama olaya kritikliği`
      + ' bilinen bir varlık/sistem bağlanmamış',
  };
}

/** `bilinmiyor` önerisinin gerekçesi: zincirin nerede koptuğunu söyler. */
function kopuklukGerekcesi(zincir: ZincirHalkasi[], konu: string): string {
  if (zincir.length === 0) {
    return `olaya varlık ya da sistem bağlanmamış — ${konu} zinciri hiç kurulamadı`;
  }
  const kopuklar = zincir.filter((h) => h.kopukluk !== null);
  if (kopuklar.length === 0) {
    return `zincir tam ama ulaşılan iş süreçlerinde ${konu} kaydı yok`;
  }
  const ozet = kopuklar.slice(0, 3).map((h) => {
    const ad = h.varlik?.etiket ?? h.sistem?.kod ?? '—';
    return `${ad}: ${KOPUKLUK_SOZU[h.kopukluk as Exclude<Kopukluk, null>]}`;
  }).join(' · ');
  const artan = kopuklar.length > 3 ? ` · +${kopuklar.length - 3} halka daha` : '';
  return `zincir kopuk — ${ozet}${artan}`;
}

/* ── ana giriş ────────────────────────────────────────────────────────── */

/** Olayın etki zincirini yürür, ÖNERİ üretir ve yalnız
    `Olay.etkiOnerisiJson` alanına yazar. Etki alanlarına dokunmaz. */
export async function etkiOnerisiUret(
  olayId: string,
): Promise<{ oneri: EtkiOnerisi; degisti: boolean }> {
  const olay = await db.olay.findUnique({
    where: { id: olayId },
    select: {
      id: true, kod: true, tesisId: true, tespitKaynagi: true, etkiOnerisiJson: true,
      tesis: {
        select: {
          id: true, kod: true, ad: true,
          profil: { select: { kritiklikSinifi: true, kritikAltyapiStatusu: true } },
        },
      },
      varliklar: {
        where: { varlik: { silindi: null } },
        select: {
          rol: true,
          varlik: {
            select: {
              id: true, etiket: true, ad: true, kritiklik: true,
              uretimEtkisi: true, emniyetEtkisi: true,
              sistem: { select: sistemSecimi },
            },
          },
        },
      },
      sistemler: { select: { rol: true, sistem: { select: sistemSecimi } } },
    },
  });
  if (!olay) throw new Error(`Olay bulunamadı: ${olayId}`);

  const zincir: ZincirHalkasi[] = [];

  for (const bag of olay.varliklar) {
    const v = bag.varlik;
    const kuyruk = kuyrugu(v.sistem);
    zincir.push({
      giris: 'varlik',
      varlik: {
        id: v.id, etiket: v.etiket, ad: v.ad, kritiklik: v.kritiklik,
        uretimEtkisi: seviye(v.uretimEtkisi), emniyetEtkisi: seviye(v.emniyetEtkisi),
        hamUretim: v.uretimEtkisi, hamEmniyet: v.emniyetEtkisi,
        rol: bag.rol,
      },
      sistem: v.sistem
        ? { id: v.sistem.id, kod: v.sistem.kod, ad: v.sistem.ad, kritiklik: v.sistem.kritiklik }
        : null,
      ...kuyruk,
    });
  }

  /* Doğrudan sistem bağı: varlık üzerinden zaten girilmiş bir sistem
     ikinci kez halka açmaz — aynı süreç iki kez sayılmasın. */
  const varliktanGelenSistemler = new Set(
    olay.varliklar.map((b) => b.varlik.sistem?.id).filter((x): x is string => Boolean(x)),
  );
  for (const bag of olay.sistemler) {
    if (varliktanGelenSistemler.has(bag.sistem.id)) continue;
    const kuyruk = kuyrugu(bag.sistem);
    zincir.push({
      giris: 'sistem',
      varlik: null,
      sistem: {
        id: bag.sistem.id, kod: bag.sistem.kod, ad: bag.sistem.ad,
        kritiklik: bag.sistem.kritiklik,
      },
      ...kuyruk,
      // Sistemden girilen halkada "varlığın sistemi yok" kopukluğu anlamsız.
      kopukluk: kuyruk.kopukluk === 'sistem_yok' ? null : kuyruk.kopukluk,
    });
  }

  const olayTesisi: ZincirTesisi | null = olay.tesis
    ? {
      id: olay.tesis.id, kod: olay.tesis.kod, ad: olay.tesis.ad,
      profilVar: olay.tesis.profil !== null,
      kritiklikSinifi: olay.tesis.profil?.kritiklikSinifi ?? null,
      kritikAltyapi: olay.tesis.profil?.kritikAltyapiStatusu ?? null,
    }
    : null;

  const kararlar: Record<EtkiAlani, Karar> = {
    uretimEtkisi: uretimKarari(zincir),
    emniyetEtkisi: emniyetKarari(zincir),
    regulasyonEtkisi: regulasyonKarari(zincir, olayTesisi),
    siberEtki: siberKarari(zincir, olay.tespitKaynagi),
  };

  const oneri: EtkiOnerisi = {
    surum: 1,
    motor: 'olay_etki',
    uretilme: new Date().toISOString(),
    uretimEtkisi: kararlar.uretimEtkisi.seviye,
    emniyetEtkisi: kararlar.emniyetEtkisi.seviye,
    regulasyonEtkisi: kararlar.regulasyonEtkisi.seviye,
    siberEtki: kararlar.siberEtki.seviye,
    gerekce: ETKI_ALANLARI.map((alan) => ({ alan, dayanak: kararlar[alan].dayanak })),
    zincir,
  };

  /* Zaman damgası dışında aynıysa yeniden yazılmaz: koşu idempotenttir,
     `uretilen` sayacı gerçekten DEĞİŞEN öneriyi sayar. */
  const onceki = olay.etkiOnerisiJson;
  const karsilastir = (o: EtkiOnerisi | null) =>
    (o === null ? null : JSON.stringify({ ...o, uretilme: '' }));
  const oncekiOneri = oneriOku(onceki);
  const degisti = karsilastir(oncekiOneri) !== karsilastir(oneri);

  if (!degisti && oncekiOneri) return { oneri: oncekiOneri, degisti: false };

  // YALNIZ öneri alanı yazılır — etki alanları insan doğrulamasına aittir.
  await db.olay.update({
    where: { id: olay.id },
    data: { etkiOnerisiJson: JSON.stringify(oneri) },
  });
  return { oneri, degisti: true };
}

/** Kayıtlı öneriyi güvenle çözer. Bozuk/eski sürüm kayıt null döner —
    ekran bunu "öneri okunamadı" diye söyler, sessizce boş göstermez. */
export function oneriOku(json: string | null | undefined): EtkiOnerisi | null {
  if (!json) return null;
  let ham: unknown;
  try {
    ham = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof ham !== 'object' || ham === null) return null;
  const o = ham as Partial<EtkiOnerisi>;
  if (o.surum !== 1 || o.motor !== 'olay_etki') return null;
  if (!Array.isArray(o.gerekce) || !Array.isArray(o.zincir)) return null;
  for (const alan of ETKI_ALANLARI) {
    if (typeof o[alan] !== 'string') return null;
  }
  return o as EtkiOnerisi;
}

/** Bir alanın önerisinin dayanağı. */
export function dayanak(oneri: EtkiOnerisi | null, alan: EtkiAlani): string | null {
  return oneri?.gerekce.find((g) => g.alan === alan)?.dayanak ?? null;
}

/** Motor koşusu (`ISLER.olay_etki`). Kapalı olaylar dondurulmuştur —
    onların önerisi tazelenmez. */
export async function olayEtkileriniIsle(): Promise<{ islenen: number; uretilen: number }> {
  const olaylar = await db.olay.findMany({
    where: { durum: { not: 'kapali' } },
    select: { id: true },
    orderBy: { baslangic: 'asc' },
  });
  let uretilen = 0;
  for (const o of olaylar) {
    const { degisti } = await etkiOnerisiUret(o.id);
    if (degisti) uretilen += 1;
  }
  return { islenen: olaylar.length, uretilen };
}
