'use server';

/* Eşleme tezgâhı eylemleri (§7).

   Kalıp: yetkiZorunlu → zod → motor → db → iz → revalidatePath.

   İki sert kural bu dosyada uygulanır:
   · YAYIMLANMIŞ PROFİL DÜZENLENMEZ. "Kaydet" diye bir eylem yoktur; yalnız
     `eslemeProfilYayinla` vardır ve o her zaman YENİ SÜRÜM açar. Eski
     sürümün üstüne yazmak, onunla yorumlanmış içe aktarımların kuralını
     silmek olurdu.
   · ÖNİZLEME HİÇBİR ŞEY YAZMAZ ve hiçbir dış sisteme bağlanmaz. Girdisi
     kullanıcının yapıştırdığı örnek kayıttır; çıktısı "bu kural bu kayda
     ne yapardı" raporudur. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import {
  connectorProfili, eslemeUygula, kurallariDogrula, profilSurumleri, profilSurumu,
  profilYayinla, DONUSUMLER, OZEL_HEDEFLER,
  type EslemeKurali, type EslemeUygulamasi, type ProfilKaydi,
} from '../entegrasyon/esleme';
import { HEDEF_ALANLAR } from '../entegrasyon/varlikAktarim';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

/** `hata()` ile aynı metni üretir, ama yalnız başarısız dalı taşır. */
function basarisiz(e: unknown): { ok: false; hata: string } {
  const s = hata(e);
  return s.ok ? { ok: false, hata: 'Beklenmeyen hata' } : s;
}

const HEDEFLER = HEDEF_ALANLAR.map((a) => a.anahtar) as [string, ...string[]];

const KuralSemasi = z.object({
  kaynakAlan: bosluksuz('Kaynak alan'),
  hedefAlan: z.enum(HEDEFLER, 'Bilinmeyen hedef alan'),
  donusum: z.enum(DONUSUMLER as unknown as [string, ...string[]], 'Bilinmeyen dönüşüm').optional(),
  zorunlu: z.boolean().optional(),
  varsayilan: z.string().nullable().optional(),
  enumEsleme: z.record(z.string(), z.string()).optional(),
  guvenKurali: z.object({
    agirlik: z.number().min(0, 'Ağırlık 0–1 aralığında olmalı').max(1, 'Ağırlık 0–1 aralığında olmalı'),
    eksikCezasi: z.number().min(0).max(1).optional(),
  }).optional(),
});

const ProfilSemasi = z.object({
  kod: bosluksuz('Kod').transform((s) => s.toUpperCase()),
  ad: bosluksuz('Ad'),
  connectorTipi: bosluksuz('Connector tipi'),
  aciklama: z.string().trim().nullable().optional(),
  kurallar: z.array(KuralSemasi).min(1, 'Profil en az bir kural içermeli'),
  /** false = taslak olarak yayımla (koşuda kullanılmaz) */
  etkinlestir: z.boolean().optional(),
});

/* ═══ Sözlük (ekranın kural düzenleyicisi için) ═══════════════════════ */

export type EslemeSozlugu = {
  hedefAlanlar: { anahtar: string; etiket: string; tip: string; sozluk: string[] | null; ozel: string | null }[];
  donusumler: string[];
};

/** Kural düzenleyicisinin hedef alan sözlüğü. `varlikAktarim` ile AYNI
    kaynaktan gelir: kullanıcı iki ekranda iki farklı alan listesi görmez. */
export async function eslemeSozlugu(): Promise<EslemeSozlugu> {
  return {
    hedefAlanlar: HEDEF_ALANLAR.map((a) => ({
      anahtar: a.anahtar,
      etiket: a.etiket,
      tip: a.tip,
      sozluk: a.sozluk ? [...a.sozluk] : null,
      ozel: OZEL_HEDEFLER[a.anahtar] ?? null,
    })),
    donusumler: [...DONUSUMLER],
  };
}

/* ═══ Yayımlama ═══════════════════════════════════════════════════════ */

/**
 * Yeni bir eşleme profili SÜRÜMÜ yayımlar. Var olan sürüm hiçbir koşulda
 * güncellenmez — aynı kod için yeni satır açılır, eskisi arşive geçer.
 */
export async function eslemeProfilYayinla(girdi: {
  kod: string; ad: string; connectorTipi: string;
  aciklama?: string | null; kurallar: EslemeKurali[]; etkinlestir?: boolean;
}): Promise<{ ok: true; id: string; kod: string; surum: number } | { ok: false; hata: string }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = ProfilSemasi.parse(girdi);
    const kurallar = v.kurallar as EslemeKurali[];

    /* Motor doğrulaması zod'un üstüne biner: zod biçimi, `kurallariDogrula`
       ANLAMI denetler (çift hedef, çelişkili zorunlu+varsayılan, sözlükte
       olmayan enum hedefi). Bozuk profil koşuda patlarsa hangi kaydın neden
       düştüğü kaybolur. */
    const sorunlar = kurallariDogrula(kurallar);
    if (sorunlar.length > 0) throw new Error(sorunlar.join(' · '));

    const yeni = await profilYayinla({
      kod: v.kod, ad: v.ad, connectorTipi: v.connectorTipi,
      aciklama: v.aciklama ?? null, kurallar,
    }, { olusturanId: k.id, etkinlestir: v.etkinlestir !== false });

    await iz({
      aktorId: k.id, varlikTipi: 'EslemeProfili', varlikId: yeni.id,
      eylem: 'olusturma', alan: 'surum',
      sonra: `${yeni.kod} v${yeni.surum} · ${kurallar.length} kural · ${yeni.durum}`,
      gerekce: yeni.surum > 1
        ? `v${yeni.surum - 1} arşive alındı; eski içe aktarımlar o sürümle yorumlanmış kalır`
        : null,
    });
    revalidatePath('/saglik');
    return { ok: true, id: yeni.id, kod: yeni.kod, surum: yeni.surum };
  } catch (e) { return basarisiz(e); }
}

/** Bir connector'a eşleme profili bağlar (null = tipin etkin profiline dön). */
export async function eslemeProfiliBagla(
  connectorId: string,
  profilId: string | null,
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const c = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
    if (c.silindi) throw new Error('Silinmiş connector düzenlenemez');

    let sonra = 'tipin etkin profili';
    if (profilId) {
      const p = await db.eslemeProfili.findUniqueOrThrow({ where: { id: profilId } });
      /* Tipi tutmayan profil bağlanamaz: başka bir kaynağın alan adlarıyla
         yazılmış kural bu connector'ın yükünde hiçbir şey bulamaz ve her
         kayıt sessizce boş alanlarla geçerdi. */
      if (p.connectorTipi !== c.tip) {
        throw new Error(`Profil '${p.kod}' ${p.connectorTipi} tipi için yazılmış, bu connector ${c.tip}`);
      }
      sonra = `${p.kod} v${p.surum} (${p.durum})`;
    }
    await db.connector.update({ where: { id: c.id }, data: { eslemeProfilId: profilId } });
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: c.id,
      eylem: 'guncelleme', alan: 'eslemeProfil',
      once: c.eslemeProfilId ?? 'tipin etkin profili', sonra,
    });
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/* ═══ Okuma ═══════════════════════════════════════════════════════════ */

export type ProfilOzeti = {
  id: string; kod: string; ad: string; connectorTipi: string;
  surum: number; durum: string; kuralSayisi: number; aciklama: string | null;
};

function ozet(p: ProfilKaydi): ProfilOzeti {
  return {
    id: p.id, kod: p.kod, ad: p.ad, connectorTipi: p.connectorTipi,
    surum: p.surum, durum: p.durum, kuralSayisi: p.kurallar.length, aciklama: p.aciklama,
  };
}

/** Bir profilin TÜM sürümleri (arşiv dahil) — geçmiş gizlenmez. */
export async function eslemeProfilGecmisi(kod: string): Promise<
  { ok: true; surumler: ProfilOzeti[] } | { ok: false; hata: string }
> {
  try {
    await yetkiZorunlu('yonetim', 'okuma');
    const surumler = await profilSurumleri(kod);
    return { ok: true, surumler: surumler.map(ozet) };
  } catch (e) { return basarisiz(e); }
}

/** Belirli bir sürümün kuralları — "bu alan neden böyle" sorusunun yanıtı. */
export async function eslemeProfilKurallari(kod: string, surum: number): Promise<
  { ok: true; profil: ProfilOzeti; kurallar: EslemeKurali[] } | { ok: false; hata: string }
> {
  try {
    await yetkiZorunlu('yonetim', 'okuma');
    const p = await profilSurumu(kod, surum);
    if (!p) throw new Error(`Profil sürümü bulunamadı: ${kod} v${surum}`);
    return { ok: true, profil: ozet(p), kurallar: p.kurallar };
  } catch (e) { return basarisiz(e); }
}

/** Bir connector'ın koşuda kullanacağı profil (null = gömülü eşleme). */
export async function connectorEslemeProfili(connectorId: string): Promise<
  { ok: true; profil: ProfilOzeti | null } | { ok: false; hata: string }
> {
  try {
    await yetkiZorunlu('yonetim', 'okuma');
    const c = await db.connector.findUniqueOrThrow({
      where: { id: connectorId }, select: { tip: true, eslemeProfilId: true },
    });
    const p = await connectorProfili(c);
    return { ok: true, profil: p ? ozet(p) : null };
  } catch (e) { return basarisiz(e); }
}

/* ═══ Önizleme ════════════════════════════════════════════════════════ */

export type OnizlemeSatiri = {
  sira: number;
  uygulama: EslemeUygulamasi;
};

/**
 * Kuralları örnek kayıtlara uygular ve NE OLACAĞINI gösterir.
 *
 * Hiçbir şey yazmaz, hiçbir yere bağlanmaz: girdi kullanıcının yapıştırdığı
 * JSON'dur. Profil yayımlamadan önce kuralın gerçekten çalıştığını görmenin
 * tek dürüst yolu budur.
 */
export async function eslemeOnizle(girdi: {
  kurallar: EslemeKurali[];
  /** tek nesne ya da nesne dizisi */
  ornekJson: string;
}): Promise<
  | { ok: true; satirlar: OnizlemeSatiri[]; sorunlar: string[] }
  | { ok: false; hata: string }
> {
  try {
    await yetkiZorunlu('yonetim', 'okuma');
    const kurallar = z.array(KuralSemasi).min(1, 'En az bir kural gerekli')
      .parse(girdi.kurallar) as EslemeKurali[];

    let ham: unknown;
    try {
      ham = JSON.parse(girdi.ornekJson);
    } catch (e) {
      throw new Error(`Örnek kayıt geçerli JSON değil: ${e instanceof Error ? e.message : 'okunamadı'}`);
    }
    const kayitlar = Array.isArray(ham) ? ham : [ham];
    if (kayitlar.length === 0) throw new Error('Örnek kayıt boş');
    if (kayitlar.length > 50) throw new Error('Önizleme en çok 50 kayıt alır');

    return {
      ok: true,
      // Kural sorunları önizlemeyi ENGELLEMEZ; ekranda uyarı olarak görünür.
      sorunlar: kurallariDogrula(kurallar),
      satirlar: kayitlar.map((k, i) => ({ sira: i + 1, uygulama: eslemeUygula(kurallar, k) })),
    };
  } catch (e) { return basarisiz(e); }
}
