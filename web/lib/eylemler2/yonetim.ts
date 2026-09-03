'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';
import { ayarTanimi, ayarDogrula, ayarCiftDogrula } from '../yapilandirma/tanimlar';
import { ayarOku } from '../yapilandirma/oku';
import { GORSEL_ANAHTARLARI } from '../gorsel';
import { kuralDegerlendir, tesisKapsaminiHesapla } from '../motorlar/uygulanabilirlik';
import { MODUL_SOZLUGU, ayarinModulu, type HedefTipi } from '../yonetim/moduller';

/* ═══ Yönetim konsolu sunucu eylemleri ═══════════════════════════════════

   İki değişiklik modeli, tek dosya:

   A · ADMIN-MANAGED  → `katalogKaydet` / `katalogArsivle` / `tesisGorselAta` /
                        `ayarKaydet`. Yetkili doğrudan yazar; her yazma
                        önce/sonra JSON'uyla AktiviteKaydi'na iz düşer.
   B · APPROVAL-MANAGED → Kaydet → İncele → Onayla → Uygula.
        degisiklikOner   : talep açılır (durum `incelemede`), önceki değer ve
                           ETKİ o anda dondurulur (talep okunurken yeniden
                           hesaplanmaz; onaylayan neye onay verdiğini görür).
        degisiklikOnayla : DÖRT GÖZ — talep eden onaylayamaz. Yetki 'onay'.
        degisiklikUygula : yalnız `onaylandi` durumundaki talep uygulanır;
                           uygulayan talep eden de olabilir (onay ayrı kişide).
        degisiklikReddet : gerekçe zorunlu.
        degisiklikIptal  : yalnız talep eden, yalnız `incelemede` iken.

   Yetki sunucuda: UI'nin düğmeyi gizlemesi yetki DEĞİLDİR. Bütün girişler
   `yetkiZorunlu('yonetim', …)` ile kapılanır; okuyucu rolü 'okuma' alır,
   yazma/onay alamaz (lib/erisim.ts ROL_IZINLERI). */

const KATALOG_TIPLERI = ['grup', 'tuzelKisi', 'uretimUnitesi', 'varlikTuru', 'agBolgesi'] as const;
type KatalogTipi = typeof KATALOG_TIPLERI[number];

const bosaNull = (s: unknown) => (typeof s === 'string' && s.trim() === '' ? null : s);
const sayiYaNull = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return null;
  return typeof v === 'string' ? Number(v) : v;
}, z.number().finite().nullable());
const tamSayiYaNull = z.preprocess((v) => {
  if (v === '' || v === null || v === undefined) return null;
  return typeof v === 'string' ? Number(v) : v;
}, z.number().int().nullable());
const mantik = z.preprocess((v) => (v === 'true' ? true : v === 'false' ? false : v), z.boolean());

const SEMALAR = {
  grup: z.object({
    kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
  }),
  tuzelKisi: z.object({
    kod: bosluksuz('Kod'), ad: bosluksuz('Ad'), grupId: bosluksuz('Grup'),
    vergiNo: z.preprocess(bosaNull, z.string().nullable().optional()),
  }),
  uretimUnitesi: z.object({
    tesisId: bosluksuz('Santral'), kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
    kuruluGucMw: sayiYaNull.optional(),
    durum: z.enum(['aktif', 'bakim', 'devre_disi']).optional(),
  }),
  varlikTuru: z.object({
    kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
    sinif: z.enum(['BT', 'OT', 'BT_OT_KOPRU', 'ORTAK_ALTYAPI', 'FIZIKSEL_EMNIYET']),
    aktif: mantik.optional(),
  }),
  agBolgesi: z.object({
    kod: bosluksuz('Kod'), ad: bosluksuz('Ad'),
    tip: z.enum(['bt', 'ot', 'dmz', 'ot_dmz', 'kurumsal', 'internet']),
    tesisId: z.preprocess(bosaNull, z.string().nullable().optional()),
    guvenlikSeviyesi: tamSayiYaNull.optional(),
  }),
} satisfies Record<KatalogTipi, z.ZodTypeAny>;

const VARLIK_TIPI: Record<KatalogTipi, string> = {
  grup: 'Grup', tuzelKisi: 'TuzelKisi', uretimUnitesi: 'UretimUnitesi',
  varlikTuru: 'VarlikTuru', agBolgesi: 'AgBolgesi',
};

const yenile = () => { revalidatePath('/yonetim-tezgahi'); revalidatePath('/'); };

const gerekceSemasi = bosluksuz('Gerekçe').pipe(z.string().min(10, 'Gerekçe en az 10 karakter'));

/* Kayıt okuyucular — önce/sonra JSON'u ve etki için ortak. */
async function katalogOku(tip: KatalogTipi, id: string): Promise<Record<string, unknown> | null> {
  switch (tip) {
    case 'grup': return db.grup.findUnique({ where: { id } });
    case 'tuzelKisi': return db.tuzelKisi.findUnique({ where: { id } });
    case 'uretimUnitesi': return db.uretimUnitesi.findUnique({ where: { id } });
    case 'varlikTuru': return db.varlikTuru.findUnique({ where: { id } });
    case 'agBolgesi': return db.agBolgesi.findUnique({ where: { id } });
  }
}

const sade = (k: Record<string, unknown> | null) => {
  if (!k) return null;
  const { id: _id, olusturuldu: _o, ...kalan } = k;
  void _id; void _o;
  return JSON.stringify(kalan);
};

/* ── A · Katalog kaydı (oluştur / düzenle) ─────────────────────────────── */
export async function katalogKaydet(girdi: {
  tip: string; id?: string | null; degerler: Record<string, unknown>; gerekce?: string;
}): Promise<Sonuc & { id?: string }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const tip = z.enum(KATALOG_TIPLERI).parse(girdi.tip);
    const v = SEMALAR[tip].parse(girdi.degerler) as Record<string, unknown>;
    const once = girdi.id ? await katalogOku(tip, girdi.id) : null;
    if (girdi.id && !once) return { ok: false, hata: 'Kayıt bulunamadı' };

    let id: string;
    switch (tip) {
      case 'grup': {
        const d = v as z.infer<typeof SEMALAR.grup>;
        id = girdi.id
          ? (await db.grup.update({ where: { id: girdi.id }, data: { ad: d.ad } })).id
          : (await db.grup.create({ data: d })).id;
        break;
      }
      case 'tuzelKisi': {
        const d = v as z.infer<typeof SEMALAR.tuzelKisi>;
        const grup = await db.grup.findUnique({ where: { id: d.grupId } });
        if (!grup) return { ok: false, hata: 'Seçilen grup bulunamadı' };
        const data = { ad: d.ad, grupId: d.grupId, vergiNo: d.vergiNo ?? null };
        id = girdi.id
          ? (await db.tuzelKisi.update({ where: { id: girdi.id }, data })).id
          : (await db.tuzelKisi.create({ data: { kod: d.kod, ...data } })).id;
        break;
      }
      case 'uretimUnitesi': {
        const d = v as z.infer<typeof SEMALAR.uretimUnitesi>;
        const tesis = await db.tesis.findUnique({ where: { id: d.tesisId } });
        if (!tesis) return { ok: false, hata: 'Seçilen santral bulunamadı' };
        const data = { ad: d.ad, kuruluGucMw: d.kuruluGucMw ?? null, durum: d.durum ?? 'aktif' };
        id = girdi.id
          ? (await db.uretimUnitesi.update({ where: { id: girdi.id }, data })).id
          : (await db.uretimUnitesi.create({ data: { tesisId: d.tesisId, kod: d.kod, ...data } })).id;
        break;
      }
      case 'varlikTuru': {
        const d = v as z.infer<typeof SEMALAR.varlikTuru>;
        const data = { ad: d.ad, sinif: d.sinif, aktif: d.aktif ?? true };
        id = girdi.id
          ? (await db.varlikTuru.update({ where: { id: girdi.id }, data })).id
          : (await db.varlikTuru.create({ data: { kod: d.kod, ...data } })).id;
        break;
      }
      case 'agBolgesi': {
        const d = v as z.infer<typeof SEMALAR.agBolgesi>;
        if (d.tesisId) {
          const tesis = await db.tesis.findUnique({ where: { id: d.tesisId } });
          if (!tesis) return { ok: false, hata: 'Seçilen santral bulunamadı' };
        }
        const data = { ad: d.ad, tip: d.tip, tesisId: d.tesisId ?? null,
          guvenlikSeviyesi: d.guvenlikSeviyesi ?? null };
        id = girdi.id
          ? (await db.agBolgesi.update({ where: { id: girdi.id }, data })).id
          : (await db.agBolgesi.create({ data: { kod: d.kod, ...data } })).id;
        break;
      }
    }
    const sonra = await katalogOku(tip, id);
    await iz({ aktorId: k.id, varlikTipi: VARLIK_TIPI[tip], varlikId: id,
      eylem: girdi.id ? 'guncelleme' : 'olusturma',
      once: sade(once), sonra: sade(sonra), gerekce: girdi.gerekce?.trim() || null });
    yenile();
    return { ...tamam(), id };
  } catch (e) { return hata(e); }
}

/* ── A · Arşivleme / pasife alma — BAĞIMLILIK VARSA REDDEDİLİR ─────────
   Silme yalnız bağımlılığı olmayan kayıtta; durum alanı olan kayıt
   (üretim ünitesi, varlık türü) silinmez, pasife alınır. Gerekçe zorunlu. */
export async function katalogArsivle(girdi: { tip: string; id: string; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const tip = z.enum(KATALOG_TIPLERI).parse(girdi.tip);
    const gerekce = gerekceSemasi.parse(girdi.gerekce);
    const once = await katalogOku(tip, girdi.id);
    if (!once) return { ok: false, hata: 'Kayıt bulunamadı' };

    const engel = (n: number, ne: string) =>
      ({ ok: false as const, hata: `Bu kayda bağlı ${n} ${ne} var; önce onları taşıyın ya da kapatın.` });

    switch (tip) {
      case 'grup': {
        const n = await db.tuzelKisi.count({ where: { grupId: girdi.id } });
        if (n > 0) return engel(n, 'tüzel kişi');
        await db.grup.delete({ where: { id: girdi.id } });
        break;
      }
      case 'tuzelKisi': {
        const [t, y] = await Promise.all([
          db.tesis.count({ where: { tuzelKisiId: girdi.id } }),
          db.yetki.count({ where: { tuzelKisiId: girdi.id } })]);
        if (t > 0) return engel(t, 'santral');
        if (y > 0) return engel(y, 'yetki kaydı');
        await db.tuzelKisi.delete({ where: { id: girdi.id } });
        break;
      }
      case 'uretimUnitesi': {
        await db.uretimUnitesi.update({ where: { id: girdi.id }, data: { durum: 'devre_disi' } });
        break;
      }
      case 'varlikTuru': {
        await db.varlikTuru.update({ where: { id: girdi.id }, data: { aktif: false } });
        break;
      }
      case 'agBolgesi': {
        const [v, g] = await Promise.all([
          db.varlik.count({ where: { bolgeId: girdi.id } }),
          db.agGeciti.count({ where: { OR: [{ kaynakBolgeId: girdi.id }, { hedefBolgeId: girdi.id }] } })]);
        if (v > 0) return engel(v, 'varlık');
        if (g > 0) return engel(g, 'ağ geçidi');
        await db.agBolgesi.delete({ where: { id: girdi.id } });
        break;
      }
    }
    const sonra = await katalogOku(tip, girdi.id);
    await iz({ aktorId: k.id, varlikTipi: VARLIK_TIPI[tip], varlikId: girdi.id,
      eylem: sonra ? 'pasife_alma' : 'silme', once: sade(once), sonra: sade(sonra), gerekce });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── A · Santral görsel eşlemesi ───────────────────────────────────────── */
export async function tesisGorselAta(girdi: { tesisId: string; gorselAnahtari: string | null; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const gerekce = gerekceSemasi.parse(girdi.gerekce);
    const anahtar = girdi.gorselAnahtari?.trim() || null;
    if (anahtar && !GORSEL_ANAHTARLARI.includes(anahtar))
      return { ok: false, hata: 'Bilinmeyen görsel anahtarı; katalogda olmayan dosya atanamaz.' };
    const tesis = await db.tesis.findUnique({ where: { id: girdi.tesisId } });
    if (!tesis) return { ok: false, hata: 'Santral bulunamadı' };
    /* Kural (gorsel.ts §1/3): bir görsel yalnız kendi santralini temsil eder.
       Aynı anahtar başka santralde kullanılıyorsa atama REDDEDİLİR. */
    if (anahtar) {
      const baska = await db.tesis.findFirst({ where: { gorselAnahtari: anahtar, NOT: { id: girdi.tesisId } } });
      if (baska) return { ok: false, hata: `Bu görsel ${baska.kod} santraline bağlı; başka santralin görseli dolgu olarak atanamaz.` };
    }
    await db.tesis.update({ where: { id: girdi.tesisId }, data: { gorselAnahtari: anahtar } });
    await iz({ aktorId: k.id, varlikTipi: 'Tesis', varlikId: girdi.tesisId, eylem: 'guncelleme',
      alan: 'gorselAnahtari', once: tesis.gorselAnahtari, sonra: anahtar, gerekce });
    revalidatePath('/'); revalidatePath('/tesisler'); revalidatePath('/yonetim-tezgahi');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── A · Yapılandırma ayarı (yalnız sınıf A anahtarlar doğrudan) ──────── */
export async function ayarKaydet(girdi: { anahtar: string; deger: unknown; gerekce: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const gerekce = gerekceSemasi.parse(girdi.gerekce);
    const t = ayarTanimi(girdi.anahtar);
    if (!t) return { ok: false, hata: `Bilinmeyen yapılandırma anahtarı: ${girdi.anahtar}` };
    if (t.sinif !== 'A')
      return { ok: false, hata: 'Bu ayar onaylı değişiklik ister; doğrudan kaydedilemez. Değişiklik önerin.' };
    const d = ayarDogrula(t.anahtar, sayiyaCevir(t, girdi.deger));
    if (!d.ok) return { ok: false, hata: d.hata };
    const once = await ayarOku(t.anahtar);
    await db.$transaction(async (tx) => {
      await tx.yapilandirma.upsert({ where: { anahtar: t.anahtar },
        update: { degerJson: JSON.stringify(d.deger), guncelleyenId: k.id },
        create: { anahtar: t.anahtar, degerJson: JSON.stringify(d.deger), guncelleyenId: k.id } });
      await iz({ aktorId: k.id, varlikTipi: 'Yapilandirma', varlikId: t.anahtar, eylem: 'guncelleme',
        once: JSON.stringify(once.deger), sonra: JSON.stringify(d.deger), gerekce }, tx);
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

/* Form alanı dize gelir; şema sayı/mantık bekler. */
function sayiyaCevir(t: { varsayilan: unknown }, deger: unknown): unknown {
  if (typeof t.varsayilan === 'number' && typeof deger === 'string' && deger.trim() !== '') {
    const n = Number(deger); return Number.isFinite(n) ? n : deger;
  }
  if (typeof t.varsayilan === 'boolean' && typeof deger === 'string') {
    return deger === 'true' ? true : deger === 'false' ? false : deger;
  }
  return deger;
}

/* ── ETKİ — "bu değişiklik nereyi etkiler?" ────────────────────────────
   Salt okunur sayımlar. Bilinmeyen sayı 0 DEĞİL null döner. */
export type EtkiSatiri = { baslik: string; deger: number | null; not?: string };

export async function etkiHesapla(girdi: { hedefTipi: string; hedefId?: string | null; sonra?: Record<string, unknown> | null })
  : Promise<{ ok: true; etki: EtkiSatiri[] } | { ok: false; hata: string }> {
  try {
    await yetkiZorunlu('yonetim', 'okuma');
    return { ok: true, etki: await etkiSatirlari(girdi.hedefTipi as HedefTipi, girdi.hedefId ?? null, girdi.sonra ?? null) };
  } catch (e) { const h = hata(e); return { ok: false, hata: h.ok ? 'Beklenmeyen hata' : h.hata }; }
}

async function etkiSatirlari(hedefTipi: HedefTipi, hedefId: string | null, sonra: Record<string, unknown> | null): Promise<EtkiSatiri[]> {
  switch (hedefTipi) {
    case 'grup': {
      if (!hedefId) return [{ baslik: 'Tüzel kişi', deger: 0, not: 'Yeni kayıt — bağ yok' }];
      const tk = await db.tuzelKisi.findMany({ where: { grupId: hedefId }, select: { id: true } });
      const t = await db.tesis.count({ where: { tuzelKisiId: { in: tk.map((x) => x.id) } } });
      return [{ baslik: 'Tüzel kişi', deger: tk.length }, { baslik: 'Santral (dolaylı)', deger: t }];
    }
    case 'tuzelKisi': {
      if (!hedefId) return [{ baslik: 'Santral', deger: 0, not: 'Yeni kayıt — bağ yok' }];
      const [t, y] = await Promise.all([
        db.tesis.count({ where: { tuzelKisiId: hedefId } }), db.yetki.count({ where: { tuzelKisiId: hedefId } })]);
      return [{ baslik: 'Santral', deger: t }, { baslik: 'Yetki kapsamı', deger: y, not: 'Bu tüzel kişiye kısıtlı roller' }];
    }
    case 'uretimUnitesi': {
      if (!hedefId) return [{ baslik: 'Varlık', deger: 0, not: 'Yeni kayıt — bağ yok' }];
      const [v, s] = await Promise.all([
        db.varlik.count({ where: { uniteId: hedefId } }), db.sistemServis.count({ where: { uniteId: hedefId } })]);
      return [{ baslik: 'Varlık', deger: v }, { baslik: 'Sistem / servis', deger: s }];
    }
    case 'varlikTuru': {
      if (!hedefId) return [{ baslik: 'Varlık', deger: 0, not: 'Yeni kayıt — bağ yok' }];
      const v = await db.varlik.count({ where: { turId: hedefId } });
      return [{ baslik: 'Varlık', deger: v, not: 'Pasife alma varlıkları silmez; yeni varlık bu türü seçemez.' }];
    }
    case 'agBolgesi': {
      if (!hedefId) return [{ baslik: 'Varlık', deger: 0, not: 'Yeni kayıt — bağ yok' }];
      const [v, g] = await Promise.all([
        db.varlik.count({ where: { bolgeId: hedefId } }),
        db.agGeciti.count({ where: { OR: [{ kaynakBolgeId: hedefId }, { hedefBolgeId: hedefId }] } })]);
      return [{ baslik: 'Varlık', deger: v }, { baslik: 'Ağ geçidi', deger: g }];
    }
    case 'tesisGorsel':
      return [{ baslik: 'Ekran', deger: 3, not: 'Saha şeridi · Portföy · Santral 360' }];
    case 'ayar': {
      const anahtar = String(sonra?.anahtar ?? hedefId ?? '');
      const t = ayarTanimi(anahtar);
      if (!t) return [{ baslik: 'Etki', deger: null, not: 'Bilinmeyen anahtar' }];
      const satirlar: EtkiSatiri[] = t.etki.map((e) => ({ baslik: e, deger: null, not: 'yeniden hesaplanır' }));
      const motor = anahtar.match(/^motor\.([a-z_]+)\.etkin$/)?.[1];
      const adaylar = motor ? [motor] : t.etki.filter((e) => /^[a-z_]+$/.test(e));
      for (const isAdi of adaylar) {
        const son = await db.isKosusu.findFirst({ where: { isAdi }, orderBy: { baslangic: 'desc' } });
        satirlar.push({ baslik: `Son koşu · ${isAdi}`, deger: son ? son.uretilen : null,
          not: son ? `${son.durum} · ${son.baslangic.toISOString().slice(0, 16).replace('T', ' ')} · üretilen` : 'hiç koşmadı' });
      }
      return satirlar;
    }
    case 'uygulanabilirlikKurali': {
      const regulasyonId = String(sonra?.regulasyonId ?? '');
      const mevcut = hedefId ? await db.uygulanabilirlikKurali.findUnique({ where: { id: hedefId } }) : null;
      const regId = regulasyonId || mevcut?.regulasyonId || '';
      const satirlar: EtkiSatiri[] = [];
      if (regId) {
        const [madde, karar, elle] = await Promise.all([
          db.madde.count({ where: { regulasyonId: regId } }),
          db.uygulanabilirlikKarari.count({ where: { regulasyonId: regId } }),
          db.uygulanabilirlikKarari.count({ where: { regulasyonId: regId, elIleDegistirildi: true } })]);
        satirlar.push({ baslik: 'Kontrol (madde)', deger: madde },
          { baslik: 'Mevcut kapsam kararı', deger: karar, not: 'yeniden hesaplanır' },
          { baslik: 'El ile değiştirilmiş karar', deger: elle, not: 'DOKUNULMAZ (override)' });
      }
      /* Önizleme: yeni koşul bugünkü santrallere uygulanırsa ne çıkar? */
      const kosul = typeof sonra?.kosulJson === 'string' ? sonra.kosulJson : mevcut?.kosulJson;
      if (kosul) {
        try {
          const tesisler = await db.tesis.findMany({ include: { profil: true } });
          let evet = 0, hayir = 0, bilinmiyor = 0;
          for (const t of tesisler) {
            const profil = t.profil ? JSON.parse(JSON.stringify(t.profil)) as Record<string, unknown> : null;
            const s = kuralDegerlendir(kosul, t, profil);
            if (s.uygulanabilir === true) evet++; else if (s.uygulanabilir === false) hayir++; else bilinmiyor++;
          }
          satirlar.push({ baslik: 'Önizleme · kapsama girer', deger: evet, not: `${tesisler.length} santral` },
            { baslik: 'Önizleme · kapsam dışı', deger: hayir },
            { baslik: 'Önizleme · karar verilemez', deger: bilinmiyor, not: 'profil eksik — bilinmiyor ≠ hayır' });
        } catch {
          satirlar.push({ baslik: 'Önizleme', deger: null, not: 'Koşul JSON okunamadı' });
        }
      }
      return satirlar;
    }
  }
}

/* ── B · Değişiklik önerisi (Kaydet + İncelemeye gönder) ───────────────── */
const KURAL_SEMASI = z.object({
  regulasyonId: bosluksuz('Regülasyon'), ad: bosluksuz('Kural adı'),
  kosulJson: bosluksuz('Koşul').refine((s) => {
    try { const k = JSON.parse(s) as { herhangi?: unknown; hepsi?: unknown };
      return Array.isArray(k.herhangi) || Array.isArray(k.hepsi); } catch { return false; }
  }, 'Koşul JSON "herhangi" ya da "hepsi" dizisi içermeli'),
  aciklama: z.preprocess(bosaNull, z.string().nullable().optional()),
  aktif: mantik.optional(),
});

export async function degisiklikOner(girdi: {
  hedefTipi: string; hedefId?: string | null; sonra: Record<string, unknown>; gerekce: string;
}): Promise<Sonuc & { id?: string }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const gerekce = gerekceSemasi.parse(girdi.gerekce);
    const hedefTipi = z.enum(['ayar', 'uygulanabilirlikKurali']).parse(girdi.hedefTipi);

    let onceJson: string | null = null; let sonraJson: string; let hedefEtiket: string; let hedefId = girdi.hedefId ?? null;
    if (hedefTipi === 'ayar') {
      const anahtar = String(girdi.sonra.anahtar ?? hedefId ?? '');
      const t = ayarTanimi(anahtar);
      if (!t) return { ok: false, hata: `Bilinmeyen yapılandırma anahtarı: ${anahtar}` };
      if (t.sinif !== 'B') return { ok: false, hata: 'Bu ayar doğrudan kaydedilir; onay akışı gerekmez.' };
      const d = ayarDogrula(anahtar, sayiyaCevir(t, girdi.sonra.deger));
      if (!d.ok) return { ok: false, hata: d.hata };
      const once = await ayarOku(anahtar);
      /* Bağlı eşik: yeni değer ile diğerinin bugünkü değeri birlikte doğrulanır. */
      const cift: Record<string, unknown> = { [anahtar]: d.deger };
      for (const es of ['risk.esik.kritik', 'risk.esik.yuksek']) if (es !== anahtar) cift[es] = (await ayarOku(es)).deger;
      const ciftHata = ayarCiftDogrula(cift);
      if (ciftHata) return { ok: false, hata: ciftHata };
      if (JSON.stringify(once.deger) === JSON.stringify(d.deger)) return { ok: false, hata: 'Yeni değer bugünkü değerle aynı.' };
      const acik = await db.degisiklikTalebi.findFirst({ where: { hedefTipi, hedefId: anahtar, durum: { in: ['incelemede', 'onaylandi'] } } });
      if (acik) return { ok: false, hata: 'Bu ayar için açık bir değişiklik talebi zaten var.' };
      hedefId = anahtar; hedefEtiket = t.etiket;
      onceJson = JSON.stringify({ anahtar, deger: once.deger });
      sonraJson = JSON.stringify({ anahtar, deger: d.deger });
    } else {
      const d = KURAL_SEMASI.parse(girdi.sonra);
      const reg = await db.regulasyon.findUnique({ where: { id: d.regulasyonId } });
      if (!reg) return { ok: false, hata: 'Regülasyon bulunamadı' };
      const mevcut = hedefId ? await db.uygulanabilirlikKurali.findUnique({ where: { id: hedefId } }) : null;
      if (hedefId && !mevcut) return { ok: false, hata: 'Kural bulunamadı' };
      if (hedefId) {
        const acik = await db.degisiklikTalebi.findFirst({ where: { hedefTipi, hedefId, durum: { in: ['incelemede', 'onaylandi'] } } });
        if (acik) return { ok: false, hata: 'Bu kural için açık bir değişiklik talebi zaten var.' };
      }
      hedefEtiket = `${reg.kod} · ${d.ad}`;
      onceJson = mevcut ? JSON.stringify({ regulasyonId: mevcut.regulasyonId, ad: mevcut.ad, kosulJson: mevcut.kosulJson,
        aciklama: mevcut.aciklama, aktif: mevcut.aktif, surum: mevcut.surum }) : null;
      sonraJson = JSON.stringify({ regulasyonId: d.regulasyonId, ad: d.ad, kosulJson: d.kosulJson,
        aciklama: d.aciklama ?? null, aktif: d.aktif ?? true });
    }
    const etki = await etkiSatirlari(hedefTipi, hedefId, JSON.parse(sonraJson) as Record<string, unknown>);
    const talep = await db.degisiklikTalebi.create({ data: {
      hedefTipi, hedefId, hedefEtiket, onceJson, sonraJson, etkiJson: JSON.stringify(etki),
      gerekce, durum: 'incelemede', talepEdenId: k.id } });
    await iz({ aktorId: k.id, varlikTipi: 'DegisiklikTalebi', varlikId: talep.id, eylem: 'olusturma',
      once: onceJson, sonra: sonraJson, gerekce });
    yenile();
    return { ...tamam(), id: talep.id };
  } catch (e) { return hata(e); }
}

/* ── B · Onay (dört göz) ───────────────────────────────────────────────── */
export async function degisiklikOnayla(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const t = await db.degisiklikTalebi.findUnique({ where: { id: girdi.id } });
    if (!t) return { ok: false, hata: 'Talep bulunamadı' };
    if (t.durum !== 'incelemede') return { ok: false, hata: `Talep "${t.durum}" durumunda; yalnız incelemedeki talep onaylanır.` };
    if (t.talepEdenId === k.id) return { ok: false, hata: 'Dört göz kuralı: talebi açan kişi onaylayamaz.' };
    await db.$transaction(async (tx) => {
      await tx.degisiklikTalebi.update({ where: { id: t.id },
        data: { durum: 'onaylandi', onaylayanId: k.id, inceleyenId: k.id, onaylandi: new Date(), incelendi: new Date() } });
      await iz({ aktorId: k.id, varlikTipi: 'DegisiklikTalebi', varlikId: t.id, eylem: 'onay',
        alan: 'durum', once: 'incelemede', sonra: 'onaylandi' }, tx);
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

export async function degisiklikReddet(girdi: { id: string; neden: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const neden = gerekceSemasi.parse(girdi.neden);
    const t = await db.degisiklikTalebi.findUnique({ where: { id: girdi.id } });
    if (!t) return { ok: false, hata: 'Talep bulunamadı' };
    if (!['incelemede', 'onaylandi'].includes(t.durum)) return { ok: false, hata: `Talep "${t.durum}" durumunda; reddedilemez.` };
    await db.$transaction(async (tx) => {
      await tx.degisiklikTalebi.update({ where: { id: t.id },
        data: { durum: 'reddedildi', inceleyenId: k.id, incelendi: new Date(), redNedeni: neden } });
      await iz({ aktorId: k.id, varlikTipi: 'DegisiklikTalebi', varlikId: t.id, eylem: 'red',
        alan: 'durum', once: t.durum, sonra: 'reddedildi', gerekce: neden }, tx);
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

export async function degisiklikIptal(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const t = await db.degisiklikTalebi.findUnique({ where: { id: girdi.id } });
    if (!t) return { ok: false, hata: 'Talep bulunamadı' };
    if (t.talepEdenId !== k.id) return { ok: false, hata: 'Yalnız talebi açan kişi iptal edebilir.' };
    if (t.durum !== 'incelemede') return { ok: false, hata: `Talep "${t.durum}" durumunda; iptal edilemez.` };
    await db.$transaction(async (tx) => {
      await tx.degisiklikTalebi.update({ where: { id: t.id }, data: { durum: 'iptal' } });
      await iz({ aktorId: k.id, varlikTipi: 'DegisiklikTalebi', varlikId: t.id, eylem: 'iptal',
        alan: 'durum', once: 'incelemede', sonra: 'iptal' }, tx);
    });
    yenile();
    return tamam();
  } catch (e) { return hata(e); }
}

/* ── B · Uygula — yalnız onaylı talep; yazma + iz aynı transaction ─────── */
export async function degisiklikUygula(girdi: { id: string }): Promise<Sonuc & { yenidenHesaplanan?: number }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const t = await db.degisiklikTalebi.findUnique({ where: { id: girdi.id } });
    if (!t) return { ok: false, hata: 'Talep bulunamadı' };
    if (t.durum !== 'onaylandi') return { ok: false, hata: `Talep "${t.durum}" durumunda; yalnız onaylanmış talep uygulanır.` };
    const sonra = JSON.parse(t.sonraJson) as Record<string, unknown>;
    let yenidenHesaplanan = 0;

    if (t.hedefTipi === 'ayar') {
      const anahtar = String(sonra.anahtar);
      const d = ayarDogrula(anahtar, sonra.deger);
      if (!d.ok) return { ok: false, hata: d.hata };
      await db.$transaction(async (tx) => {
        await tx.yapilandirma.upsert({ where: { anahtar },
          update: { degerJson: JSON.stringify(d.deger), guncelleyenId: k.id },
          create: { anahtar, degerJson: JSON.stringify(d.deger), guncelleyenId: k.id } });
        await tx.degisiklikTalebi.update({ where: { id: t.id }, data: { durum: 'uygulandi', uygulayanId: k.id, uygulandi: new Date() } });
        await iz({ aktorId: k.id, varlikTipi: 'Yapilandirma', varlikId: anahtar, eylem: 'guncelleme',
          once: t.onceJson, sonra: t.sonraJson, gerekce: `Talep ${t.id} · ${t.gerekce}` }, tx);
      });
    } else if (t.hedefTipi === 'uygulanabilirlikKurali') {
      const d = KURAL_SEMASI.parse(sonra);
      const kuralId = await db.$transaction(async (tx) => {
        const kural = t.hedefId
          ? await tx.uygulanabilirlikKurali.update({ where: { id: t.hedefId },
              data: { ad: d.ad, kosulJson: d.kosulJson, aciklama: d.aciklama ?? null, aktif: d.aktif ?? true, surum: { increment: 1 } } })
          : await tx.uygulanabilirlikKurali.create({ data: { regulasyonId: d.regulasyonId, ad: d.ad,
              kosulJson: d.kosulJson, aciklama: d.aciklama ?? null, aktif: d.aktif ?? true } });
        await tx.degisiklikTalebi.update({ where: { id: t.id }, data: { durum: 'uygulandi', uygulayanId: k.id, uygulandi: new Date(), hedefId: kural.id } });
        await iz({ aktorId: k.id, varlikTipi: 'UygulanabilirlikKurali', varlikId: kural.id,
          eylem: t.hedefId ? 'guncelleme' : 'olusturma', once: t.onceJson, sonra: t.sonraJson,
          gerekce: `Talep ${t.id} · ${t.gerekce}` }, tx);
        return kural.id;
      });
      void kuralId;
      /* Kapsam kararları yeniden hesaplanır (override'lara dokunulmaz). */
      const tesisler = await db.tesis.findMany({ select: { id: true } });
      for (const x of tesisler) {
        const s = await tesisKapsaminiHesapla(x.id, k.id);
        yenidenHesaplanan += s.hesaplanan;
      }
      revalidatePath('/uyum'); revalidatePath('/tesisler');
    } else {
      return { ok: false, hata: `Bu hedef tipi (${t.hedefTipi}) onay akışıyla uygulanmaz.` };
    }
    yenile();
    return { ...tamam(), yenidenHesaplanan };
  } catch (e) { return hata(e); }
}

/* Konsol başlığı için modül→hedef doğrulaması; UI gizlemesi yetki değildir,
   ama hangi eylemin hangi modüle düştüğünü tek yerden okunur kılar. */
export async function modulSinifi(kod: string): Promise<'A' | 'B' | 'C' | null> {
  return MODUL_SOZLUGU[kod]?.sinif ?? ayarinModulu(kod)?.sinif ?? null;
}
