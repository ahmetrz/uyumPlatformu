'use server';

/* Connector yönetimi eylemleri (§ entegrasyon katmanı).

   Kalıp: yetkiZorunlu → zod → (sır referansı doğrula) → db → iz → revalidatePath.

   Sır sözleşmesi bu dosyada iki yönlü uygulanır:
   · GİRİŞTE: eylem sır DEĞERİ kabul etmez. Yalnız `sirReferansi` alınır ve
     biçimi `referansGecerli()` ile doğrulanır; yapılandırma JSON'una gizlice
     parola konmasın diye kimlik bilgisi kokan alanlar reddedilir.
   · ÇIKIŞTA: denetim izine ve dönen değere yalnız referans ADRESİ
     (`sirMaskesi`) yazılır; değer hiçbir yolda yüzeye çıkmaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { referansGecerli, sirMaskesi, siriCoz } from '../entegrasyon/sir';
import { adaptorCoz } from '../entegrasyon/kayit';
import { senkronizasyonKos, sirsizlastir, type KosuOzeti, type Tetikleyen } from '../entegrasyon/cekirdek';
import { tamam, hata, iz, bosluksuz, type Sonuc } from './ortak';

const TIPLER = ['ad_entra', 'vuln_scanner', 'edr', 'siem', 'backup',
  'network_firewall', 'ot_discovery', 'manual_import'] as const;
const KIMLIK_TIPLERI = ['none', 'api_key', 'basic',
  'oauth2_client_credentials', 'certificate'] as const;

/** Yapılandırmada kimlik bilgisi kokan alanlar — değer taşıyorlarsa reddedilir. */
const SIR_KOKAN_ALAN =
  /(parola|password|passwd|sifre|şifre|secret|token|api_?key|apikey|anahtar|credential|kimlik_?bilgisi|private_?key|passphrase|pfx|client_?secret)/i;

const metin = z.string().trim().transform((s) => s || null).nullable().optional();

/** `hata()` ile aynı metni üretir, ama yalnız başarısız dalı taşır —
    veri döndüren eylemlerin dönüş tipi böylece daralır. */
function basarisiz(e: unknown): { ok: false; hata: string } {
  const s = hata(e);
  return s.ok ? { ok: false, hata: 'Beklenmeyen hata' } : s;
}

const ConnectorSemasi = z.object({
  id: z.string().trim().min(1).optional(),
  kod: bosluksuz('Kod').transform((s) => s.toUpperCase()),
  ad: bosluksuz('Ad'),
  tip: z.enum(TIPLER, 'Geçersiz connector tipi'),
  kaynakSistem: bosluksuz('Kaynak sistem'),
  kimlikTipi: z.enum(KIMLIK_TIPLERI, 'Geçersiz kimlik tipi').default('none'),
  yapilandirmaJson: metin,
  sirReferansi: metin,
  pollAralikDk: z.number().int().positive('Poll aralığı pozitif olmalı').nullable().optional(),
  etkin: z.boolean().default(false),
});

/** Yapılandırma nesnesini gezip sır DEĞERİ taşıyan alan var mı bakar. */
function sirDegeriAra(deger: unknown, yol: string[] = []): string | null {
  if (yol.length > 8) return null;
  if (Array.isArray(deger)) {
    for (const [i, e] of deger.entries()) {
      const bulunan = sirDegeriAra(e, [...yol, String(i)]);
      if (bulunan) return bulunan;
    }
    return null;
  }
  if (!deger || typeof deger !== 'object') return null;
  for (const [anahtar, alt] of Object.entries(deger as Record<string, unknown>)) {
    if (SIR_KOKAN_ALAN.test(anahtar) && typeof alt === 'string' && alt.trim()) {
      // Referans (env:… / dosya:…) adrestir, sır değildir — geçebilir.
      if (!referansGecerli(alt.trim())) return [...yol, anahtar].join('.');
    }
    const bulunan = sirDegeriAra(alt, [...yol, anahtar]);
    if (bulunan) return bulunan;
  }
  return null;
}

/**
 * Connector oluşturur/günceller. Sır DEĞERİ kabul edilmez: yalnız referans
 * (`env:AD_PAROLA`, `dosya:/run/secrets/ad#parola`) saklanır.
 */
export async function connectorKaydet(girdi: {
  id?: string; kod: string; ad: string; tip: string; kaynakSistem: string;
  kimlikTipi?: string; yapilandirmaJson?: string | null;
  sirReferansi?: string | null; pollAralikDk?: number | null; etkin?: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const v = ConnectorSemasi.parse(girdi);

    if (v.sirReferansi && !referansGecerli(v.sirReferansi)) {
      throw new Error(
        'Geçersiz sır referansı. Beklenen biçim: env:ANAHTAR ya da dosya:/yol#alan — ' +
        'sırrın kendisi değil, adresi girilir.');
    }
    if (v.kimlikTipi !== 'none' && !v.sirReferansi) {
      throw new Error(`'${v.kimlikTipi}' kimlik tipi bir sır referansı gerektirir`);
    }
    if (v.yapilandirmaJson) {
      let ayristirilan: unknown;
      try {
        ayristirilan = JSON.parse(v.yapilandirmaJson);
      } catch (e) {
        throw new Error(`Yapılandırma geçerli JSON değil: ${e instanceof Error ? e.message : 'okunamadı'}`);
      }
      if (!ayristirilan || typeof ayristirilan !== 'object' || Array.isArray(ayristirilan)) {
        throw new Error('Yapılandırma bir JSON nesnesi olmalı');
      }
      const sirli = sirDegeriAra(ayristirilan);
      if (sirli) {
        throw new Error(
          `Yapılandırmaya kimlik bilgisi yazılamaz ('${sirli}'). ` +
          'Değeri sır sağlayıcısına koyup sirReferansi alanına adresini girin.');
      }
    }

    const veri = {
      kod: v.kod, ad: v.ad, tip: v.tip, kaynakSistem: v.kaynakSistem,
      kimlikTipi: v.kimlikTipi, yapilandirmaJson: v.yapilandirmaJson ?? null,
      sirReferansi: v.sirReferansi ?? null, pollAralikDk: v.pollAralikDk ?? null,
      etkin: v.etkin,
    };

    const onceki = v.id
      ? await db.connector.findUnique({ where: { id: v.id } })
      : await db.connector.findUnique({ where: { kod: v.kod } });
    if (v.id && !onceki) throw new Error('Connector bulunamadı');
    if (onceki?.silindi) throw new Error('Silinmiş connector güncellenemez');

    const kayit = onceki
      ? await db.connector.update({ where: { id: onceki.id }, data: veri })
      : await db.connector.create({ data: { ...veri, durum: 'taslak' } });

    // Denetim izine yalnız ADRES yazılır; sır değeri asla.
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'connector',
      once: onceki ? `${onceki.ad} · ${onceki.tip} · sır: ${sirMaskesi(onceki.sirReferansi)}` : null,
      sonra: `${kayit.ad} · ${kayit.tip} · sır: ${sirMaskesi(kayit.sirReferansi)} · ${kayit.etkin ? 'etkin' : 'pasif'}`,
    });
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Bağlantı testi. Sonuç izde ve dönen değerde YALNIZ metin olarak görünür;
 * sır değeri döndürülmez ve sızmışsa maskelenir.
 */
export async function connectorTest(connectorId: string): Promise<
  | { ok: true; baglandi: boolean; kimlikEksik: boolean; ayrinti: string }
  | { ok: false; hata: string }
> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const c = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
    if (c.silindi) throw new Error('Silinmiş connector test edilemez');

    const adaptor = adaptorCoz(c.tip);   // bilinmeyen tip → açık hata
    let sir: string | null = null;
    if (c.sirReferansi) {
      const cozum = await siriCoz(c.sirReferansi);
      if (!cozum.ok) throw new Error(`Sır çözülemedi: ${cozum.hata}`);
      sir = cozum.deger;
    } else if (c.kimlikTipi !== 'none') {
      throw new Error(`Kimlik tipi '${c.kimlikTipi}' için sır referansı tanımlı değil`);
    }

    const yapilandirma = c.yapilandirmaJson
      ? (JSON.parse(c.yapilandirmaJson) as Record<string, unknown>)
      : {};
    const sonuc = await adaptor.testConnection({
      connectorId: c.id, kod: c.kod, kaynakSistem: c.kaynakSistem,
      yapilandirma, sir, imlec: c.imlec,
    });

    const ayrinti = sirsizlastir(sonuc.ok ? sonuc.ayrinti : sonuc.hata, sir);
    const kimlikEksik = sonuc.ok ? false : Boolean(sonuc.kimlikEksik);

    /* Testin sonucu connector'ın son hatasını tazeler; kimlik eksikse bu bir
       arıza değil, eksik yapılandırmadır — connector 'hatali' işaretlenmez. */
    await db.connector.update({
      where: { id: c.id },
      data: sonuc.ok
        ? { sonHata: null, durum: c.durum === 'hatali' ? 'etkin' : c.durum }
        : { sonHata: ayrinti, ...(kimlikEksik ? { durum: 'taslak' } : { durum: 'hatali' }) },
    });

    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: c.id,
      eylem: 'test', alan: 'baglanti',
      sonra: `${sonuc.ok ? 'başarılı' : kimlikEksik ? 'kimlik bekleniyor' : 'başarısız'} · ` +
        `sır: ${sirMaskesi(c.sirReferansi)} · ${ayrinti}`,
    });
    revalidatePath('/saglik');
    return { ok: true, baglandi: sonuc.ok, kimlikEksik, ayrinti };
  } catch (e) { return basarisiz(e); }
}

/** Senkronizasyonu elle tetikler. Koşu kaydı çekirdekte yazılır. */
export async function connectorSenkronize(
  connectorId: string,
  tetikleyen: string = 'manuel',
): Promise<{ ok: true; ozet: KosuOzeti } | { ok: false; hata: string }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const tetik = z.enum(['manuel', 'zamanlanmis', 'api'], 'Geçersiz tetikleyen')
      .parse(tetikleyen) as Tetikleyen;
    const ozet = await senkronizasyonKos(connectorId, { tetikleyen: tetik });
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: connectorId,
      eylem: 'senkronizasyon', alan: 'kosu',
      sonra: `${ozet.durum} · ${ozet.ayrinti}`,
      gerekce: ozet.hata,
    });
    revalidatePath('/saglik');
    return { ok: true, ozet };
  } catch (e) { return basarisiz(e); }
}

/**
 * KURU KOŞU: senkronizasyonun ne yapacağını hesaplar, HİÇBİR ŞEY YAZMAZ.
 *
 * Yetki gerçek senkronizasyonla aynıdır ('yonetim/yazma'): kuru koşu dış
 * sistemden veri ÇEKER ve kaynağın içeriğini raporlar — okuma yetkisiyle
 * yapılacak bir iş değildir. Denetim izine ayrıca 'kuru' olarak yazılır ki
 * geçmişte gerçek koşuyla karıştırılmasın.
 */
export async function connectorKuruKosu(
  connectorId: string,
): Promise<{ ok: true; ozet: KosuOzeti } | { ok: false; hata: string }> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const ozet = await senkronizasyonKos(connectorId, { tetikleyen: 'manuel', kuru: true });
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: connectorId,
      eylem: 'kuru_kosu', alan: 'kosu',
      sonra: `${ozet.durum} · ${ozet.ayrinti}`,
      gerekce: ozet.hata,
    });
    revalidatePath('/saglik');
    return { ok: true, ozet };
  } catch (e) { return basarisiz(e); }
}

/** Connector'ı etkinleştirir/duraklatır. Pasif connector koşturulmaz. */
export async function connectorEtkinlik(
  connectorId: string,
  etkin: boolean,
  gerekce?: string | null,
): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'yazma');
    const c = await db.connector.findUniqueOrThrow({ where: { id: connectorId } });
    if (c.silindi) throw new Error('Silinmiş connector etkinleştirilemez');
    if (etkin && !c.sirReferansi && c.kimlikTipi !== 'none') {
      throw new Error('Sır referansı tanımlanmadan connector etkinleştirilemez');
    }
    const durum = etkin ? (c.durum === 'hatali' ? 'hatali' : 'etkin') : 'duraklatildi';
    await db.connector.update({ where: { id: c.id }, data: { etkin, durum } });
    await iz({
      aktorId: k.id, varlikTipi: 'Connector', varlikId: c.id,
      eylem: 'durum_degisikligi', alan: 'etkin',
      once: String(c.etkin), sonra: String(etkin), gerekce: gerekce ?? null,
    });
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}
