import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { PrismaClient } from '@/lib/prisma-client/client';
import { PAKET_KOKU } from '@/lib/paket/dizin';
import { hataSatiri, paketiDogrula, type Sayilar } from '@/lib/paket/dogrula';
import type { KurulumRaporu } from '@/lib/paket/kur';
import { paketHali, type PaketHali } from './mantik';

/* ═══ P4 · 2.6 · /paketler — VERİ ═══════════════════════════════════════
   İki kaynak, tek satır: disk (`paketler/<KOD>`) ve veritabanı
   (`IcerikPaketi` + kurulu sürüm). Disk her açılışta doğrulayıcıdan
   geçirilir — "diskte 0.2.0 var" demek için manifestin okunması yetmez,
   paketin kurulabilir olması gerekir; doğrulanamayan paket diskte VAR ama
   KURULAMAZ diye ayrı yazılır.

   Ekran hiçbir çerçeveyi aktifleştirmez; taslak/aktif sayısı yalnız
   "aktifleştirme bekleyen ne var" sorusunu cevaplar (Regülasyonlar
   ekranına bağ). */

export type DiskBilgisi = {
  surum: string; tur: string | null; sektor: string | null; ad: string | null;
  bagimliliklar: string[]; hatalar: string[]; sayilar: Sayilar | null;
};
export type KuruluBilgisi = {
  surum: string; durum: 'kurulu' | 'arsiv'; zaman: string; kuran: string | null;
  bagimliliklar: string[]; rapor: KurulumRaporu | null;
};
export type PaketSatiri = {
  kod: string; ad: string; tur: string; sektor: string | null;
  disk: DiskBilgisi | null;
  kurulu: KuruluBilgisi | null;
  /** bu pakete bağımlı KURULU paketler — kaldırma engeli */
  bagimlilar: string[];
  cerceve: { aktif: number; taslak: number; arsiv: number };
  hal: PaketHali;
};
export type PaketEkranVerisi = {
  satirlar: PaketSatiri[];
  ozet: { kurulu: number; guncellemeVar: number; dogrulanamadi: number; taslakCerceve: number };
  /** paket kökü okunamadıysa neden — "paket yok" ile karıştırılmaz */
  kokHatasi: string | null;
};

type HamManifest = { kod?: unknown; ad?: unknown; tur?: unknown; sektor?: unknown; surum?: unknown; bagimliliklar?: unknown };
const dize = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null);

/** Diskteki paketler — dizin başına doğrulayıcı; manifest okunamıyorsa dizin adı kimliktir. */
export function diskPaketleri(kok: string): { paketler: Map<string, DiskBilgisi>; kokHatasi: string | null } {
  const paketler = new Map<string, DiskBilgisi>();
  if (!existsSync(kok) || !statSync(kok).isDirectory()) return { paketler, kokHatasi: `paket kökü yok: ${kok}` };
  for (const ad of readdirSync(kok).sort()) {
    const dizin = path.join(kok, ad);
    if (!statSync(dizin).isDirectory()) continue;
    const sonuc = paketiDogrula(dizin);
    let ham: HamManifest = {};
    try { ham = JSON.parse(readFileSync(path.join(dizin, 'manifest.json'), 'utf8')) as HamManifest; } catch { ham = {}; }
    const m = sonuc.icerik?.manifest;
    const sektorHam = ham.sektor as { kod?: unknown } | null | undefined;
    paketler.set(ad, {
      surum: m?.surum ?? dize(ham.surum) ?? '?',
      tur: m?.tur ?? dize(ham.tur),
      sektor: m?.sektor?.kod ?? dize(sektorHam?.kod),
      ad: m?.ad ?? dize(ham.ad),
      bagimliliklar: m?.bagimliliklar ?? (Array.isArray(ham.bagimliliklar) ? ham.bagimliliklar.filter((x): x is string => typeof x === 'string') : []),
      hatalar: sonuc.hatalar.map(hataSatiri),
      sayilar: sonuc.ok ? sonuc.sayilar : null,
    });
  }
  return { paketler, kokHatasi: null };
}

export async function paketEkranVerisi(istemci: PrismaClient, kok: string = path.resolve(process.cwd(), PAKET_KOKU)): Promise<PaketEkranVerisi> {
  const { paketler: disk, kokHatasi } = diskPaketleri(kok);
  const kayitlar = await istemci.icerikPaketi.findMany({
    include: { surumler: { orderBy: { kurulumZamani: 'desc' }, include: { kuran: { select: { adSoyad: true } } } } },
    orderBy: { kod: 'asc' },
  });
  const surumIdleri = kayitlar.flatMap((p) => p.surumler.map((s) => s.id));
  const gruplar = surumIdleri.length
    ? await istemci.frameworkSurumu.groupBy({ by: ['paketSurumId', 'durum'], where: { paketSurumId: { in: surumIdleri } }, _count: { _all: true } })
    : [];
  const cerceveSayaci = new Map<string, { aktif: number; taslak: number; arsiv: number }>();
  for (const p of kayitlar) {
    const c = { aktif: 0, taslak: 0, arsiv: 0 };
    for (const g of gruplar) {
      if (!g.paketSurumId || !p.surumler.some((s) => s.id === g.paketSurumId)) continue;
      if (g.durum === 'aktif') c.aktif += g._count._all;
      else if (g.durum === 'taslak') c.taslak += g._count._all;
      else if (g.durum === 'arsiv') c.arsiv += g._count._all;
    }
    cerceveSayaci.set(p.kod, c);
  }

  const kurulular = new Map<string, KuruluBilgisi>();
  for (const p of kayitlar) {
    const s = p.surumler.find((x) => x.durum === 'kurulu') ?? p.surumler[0];
    if (!s) continue;
    let bagimliliklar: string[] = [];
    try { bagimliliklar = ((JSON.parse(s.manifestJson) as { bagimliliklar?: string[] }).bagimliliklar ?? []); } catch { bagimliliklar = []; }
    let rapor: KurulumRaporu | null = null;
    try { rapor = s.raporJson ? (JSON.parse(s.raporJson) as KurulumRaporu) : null; } catch { rapor = null; }
    kurulular.set(p.kod, {
      surum: s.surum, durum: p.durum === 'arsiv' ? 'arsiv' : 'kurulu', zaman: s.kurulumZamani.toISOString(),
      kuran: s.kuran?.adSoyad ?? null, bagimliliklar, rapor,
    });
  }
  /* Bağımlılar: kurulu paketlerin kurulu sürüm manifestlerinden ters dizin. */
  const bagimlilar = new Map<string, string[]>();
  for (const [kod, k] of kurulular) {
    if (k.durum !== 'kurulu') continue;
    for (const b of k.bagimliliklar) bagimlilar.set(b, [...(bagimlilar.get(b) ?? []), kod].sort());
  }

  const kodlar = [...new Set([...disk.keys(), ...kurulular.keys()])].sort();
  const satirlar: PaketSatiri[] = kodlar.map((kod) => {
    const d = disk.get(kod) ?? null;
    const k = kurulular.get(kod) ?? null;
    const kayit = kayitlar.find((p) => p.kod === kod);
    const hal = paketHali({ diskSurum: d?.surum ?? null, diskHatalari: d?.hatalar.length ?? 0, kuruluSurum: k?.surum ?? null, durum: k?.durum ?? null });
    return {
      kod,
      ad: kayit?.ad ?? d?.ad ?? kod,
      tur: kayit?.tur ?? d?.tur ?? '—',
      sektor: kayit?.sektorKod ?? d?.sektor ?? null,
      disk: d, kurulu: k,
      bagimlilar: bagimlilar.get(kod) ?? [],
      cerceve: cerceveSayaci.get(kod) ?? { aktif: 0, taslak: 0, arsiv: 0 },
      hal,
    };
  });
  /* Sıra karar sırasıdır: dikkat isteyen önce (güncelleme · doğrulanamadı ·
     diskte yok · eski), sonra kurulu-güncel, sonra kurulabilir, en sonda arşiv. */
  const oncelik: Record<PaketHali, number> = { guncelleme_var: 0, dogrulanamadi: 1, disk_yok: 2, disk_eski: 3, guncel: 4, kurulu_degil: 5, arsiv: 6 };
  satirlar.sort((a, b) => oncelik[a.hal] - oncelik[b.hal] || a.kod.localeCompare(b.kod, 'tr'));

  return {
    satirlar,
    ozet: {
      kurulu: satirlar.filter((s) => s.kurulu?.durum === 'kurulu').length,
      guncellemeVar: satirlar.filter((s) => s.hal === 'guncelleme_var').length,
      dogrulanamadi: satirlar.filter((s) => s.hal === 'dogrulanamadi').length,
      taslakCerceve: satirlar.reduce((a, s) => a + s.cerceve.taslak, 0),
    },
    kokHatasi,
  };
}
