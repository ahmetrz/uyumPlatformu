import 'server-only';
import { db } from '@/lib/db';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import type { AktifKullanici } from '@/lib/auth';
import { kapsamDaraltildi, kapsamda } from '@/app/kapsam';
import { connectorKapsamKodlari } from '@/lib/entegrasyon/cekirdek';
import type { RedSatiri } from './mantik';

/* Dead-letter kuyruğu — SUNUCU VERİSİ.

   ═══ KAPSAM SIZINTISI ══════════════════════════════════════════════════
   Kuyruk `yonetim/okuma` kapısını geçtikten sonra hiçbir SANTRAL kapsamı
   uygulamıyordu: `hamJson` reddedilen kaydın HAM YÜKÜdür ve içinde
   gözlemin beyan ettiği santral kodu, cihaz etiketi, hostname, IP gibi
   alanlar durur. Bir santrale kısıtlı `yonetici`, başka santralin
   connector'ından düşen kayıtları ham hâliyle okuyabiliyordu — üstelik
   `asama: 'kapsam'` redlerinin SEBEP metni santral kodunu düpedüz
   yazıyor ("kayıt 'X' santralini beyan ediyor").

   MODÜL SEÇİMİ: `yonetim`. Gerekçe kaydın konusudur: dead-letter satırı bir
   ENTEGRASYON işletim kaydıdır (connector, koşu, aşama), bir uyum/varlık
   kaydı değil. Ekranın mevcut kapısı ve `lib/eylemler2/reddedilenKayit.ts`
   → `yetkiZorunlu('yonetim', 'yazma')` da aynı modülü kullanır; okuma ile
   yazma ayrışamaz.

   ── SANTRAL NASIL TÜRETİLİR ────────────────────────────────────────────
   `ReddedilenKayit` şemada `tesisId` TAŞIMAZ (kayıt zaten hedefe
   yazılamadığı için düşmüştür). Santral iki kaynaktan, bu sırayla türetilir:
     1. Ham yükün beyan ettiği `tesisKodu` — `lib/entegrasyon/sozlesme.ts`
        Gözlem sözleşmesinin santral alanı, çekirdeğin de baktığı alan
        (`cekirdek.ts → kapsamDisiSebep`).
     2. Connector'ın YAZMA kapsamı (`connectorKapsamKodlari`) — kayıt
        beyan etmese bile o connector yalnız bu santrallere yazabilir.
   İkisi de yoksa santral BİLİNMİYOR demektir.

   ── SANTRALİ BİLİNMEYEN KAYIT ──────────────────────────────────────────
   `app/kapsam.ts → kapsamda` (= `lib/api/yetki.ts → tesisKapsamda`):
   santrali türetilemeyen satır YALNIZ kapsamsız kullanıcıya görünür.
   Bu, çekirdeğin kendi kuralıyla da tutarlıdır: kapsamı tanımlı bir
   connector'da "santral beyan etmeyen" kayıt zaten reddedilir, çünkü
   santral beyan etmemek kapsam sınırından kaçmanın en kolay yolu olurdu. */

/** Kuyruktan çekilen en fazla satır. Sınır bilinçlidir ve ekranda söylenir:
    sessizce kırpılan bir kuyruk, olmayan bir kuyruktur. */
export const SINIR = 300;

export type EkranVerisi = {
  satirlar: RedSatiri[];
  yetkili: boolean;
  yazabilir: boolean;
  toplam: number;
  sinir: number;
  /** true = kuyruk bir santral kapsamıyla daraltıldı */
  kapsamli: boolean;
};

/** Ham yükün beyan ettiği santral kodu; yoksa null. Bozuk JSON kaydı düşürmez. */
function beyanEdilenTesisKodu(hamJson: string | null): string | null {
  if (!hamJson) return null;
  try {
    const h: unknown = JSON.parse(hamJson);
    if (h === null || typeof h !== 'object') return null;
    const kod = (h as { tesisKodu?: unknown }).tesisKodu;
    return typeof kod === 'string' && kod.trim() ? kod.trim() : null;
  } catch {
    // Okunamayan ham yük "santralsiz" sayılır — yani yalnız kapsamsıza görünür.
    return null;
  }
}

/** Connector yapılandırmasını savunmacı okur; bozuk JSON kaydı düşürmez. */
function yapilandirmaOku(json: string | null): Record<string, unknown> {
  if (!json) return {};
  try {
    const y: unknown = JSON.parse(json);
    return y !== null && typeof y === 'object' ? (y as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export async function reddedilenlerVerisi(k: AktifKullanici): Promise<EkranVerisi> {
  const okuyabilir = izinVar(k, 'yonetim', 'okuma');
  const yazabilir = izinVar(k, 'yonetim', 'yazma');
  const izinli = izinliTesisIdleri(k, 'yonetim');

  if (!okuyabilir) {
    return {
      satirlar: [], yetkili: false, yazabilir: false,
      toplam: 0, sinir: SINIR, kapsamli: false,
    };
  }

  const [ham, tamToplam] = await Promise.all([
    db.reddedilenKayit.findMany({
      orderBy: [{ durum: 'asc' }, { olusturuldu: 'desc' }],
      take: SINIR,
      select: {
        id: true, kaynakSistem: true, kaynakKayitId: true, asama: true,
        sebep: true, durum: true, incelemeNotu: true, incelemeZamani: true,
        olusturuldu: true, hamJson: true,
        connector: {
          select: { ad: true, kapsamTesisleriJson: true, yapilandirmaJson: true },
        },
        inceleyen: { select: { adSoyad: true } },
      },
    }),
    db.reddedilenKayit.count(),
  ]);

  /* Santral kodları TEK sorguda id'ye çevrilir; satır başına sorgu açmak
     300 satırlık bir kuyrukta 300 sorgu demek olurdu. */
  const kodlar = new Set<string>();
  for (const r of ham) {
    const beyan = beyanEdilenTesisKodu(r.hamJson);
    if (beyan) kodlar.add(beyan);
    for (const kod of connectorKapsamKodlari(
      yapilandirmaOku(r.connector?.yapilandirmaJson ?? null),
      r.connector?.kapsamTesisleriJson,
    ) ?? []) kodlar.add(kod);
  }
  const kodIdleri = new Map<string, string>(
    kodlar.size === 0 ? [] : (await db.tesis.findMany({
      where: { kod: { in: [...kodlar] } }, select: { id: true, kod: true },
    })).map((t) => [t.kod, t.id] as const),
  );

  const gorunur = ham.filter((r) => {
    const beyan = beyanEdilenTesisKodu(r.hamJson);
    /* Beyan VARSA connector kapsamına düşülmez: kayıt kendi santralini
       söylüyorsa karar odur. Beyan edilen kod platformda tanımsızsa
       (`kodIdleri`de yok) santral BİLİNMİYOR sayılır — uydurulmaz. */
    if (beyan) return kapsamda(izinli, kodIdleri.get(beyan) ?? null);

    const connectorKodlari = connectorKapsamKodlari(
      yapilandirmaOku(r.connector?.yapilandirmaJson ?? null),
      r.connector?.kapsamTesisleriJson,
    );
    if (!connectorKodlari) return kapsamda(izinli, null); // kapsamsız connector
    return connectorKodlari.some((kod) => kapsamda(izinli, kodIdleri.get(kod) ?? null));
  });

  const satirlar: RedSatiri[] = gorunur.map((r) => ({
    id: r.id,
    kaynakSistem: r.kaynakSistem,
    kaynakKayitId: r.kaynakKayitId,
    asama: r.asama,
    sebep: r.sebep,
    durum: r.durum,
    connectorAdi: r.connector?.ad ?? null,
    inceleyen: r.inceleyen?.adSoyad ?? null,
    incelemeNotu: r.incelemeNotu,
    incelemeZamani: r.incelemeZamani?.toISOString() ?? null,
    olusturuldu: r.olusturuldu.toISOString(),
    hamJson: r.hamJson,
  }));

  return {
    satirlar,
    yetkili: true,
    yazabilir,
    /* Kuyruk TOPLAMI da daraltılır. Kapsamsız kullanıcı tablonun gerçek
       sayısını görür; kapsamlı kullanıcı KENDİ penceresindeki görünür
       satır sayısını görür. Tam tabloyu saymak, satırı gizleyip "ama
       görmediğin 412 kayıt var" demek olurdu — sayının kendisi sızıntıdır. */
    toplam: izinli === null ? tamToplam : satirlar.length,
    sinir: SINIR,
    kapsamli: kapsamDaraltildi(izinli),
  };
}
