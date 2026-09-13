'use server';

/* Tesis 360 eylemleri: tesis profili (uygulanabilirlik motorunun girdisi),
   kapsam yeniden hesaplama ve onaylı uygulanabilirlik override'ı.
   Kalıp: her eylem yetkiZorunlu → zod → db → iz → revalidatePath → Sonuc. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { tesisKapsaminiHesapla } from '../motorlar/uygulanabilirlik';
import { tesisinOgesi } from '../kapsam/db';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';
import { eylemSozlugu } from './kapsamMesaji';
import { tBas } from '../dil/terimler';

/* null = BİLİNMİYOR (§5.1): boş metin null'a çevrilir, boolean üç durumludur. */
const metin = z.string().trim().transform((s) => s || null).nullable().optional();
const ucDurum = z.boolean().nullable().optional();

/* Şema İŞLEVDİR: tesis etiketi sözlükten gelir ve sözlük oturum
   açıldıktan sonra çözülür. Modül sabiti olsaydı R0-8 sınırına girer,
   çekirdek sözcüğe çakılırdı. Tip `z.input` ile aynı yerden türüyor. */
const profilSemasi = (tesis: string) => z.object({
  tesisId: bosluksuz(tesis),
  /* B2 · Sektöre özgü alanlar (lisans, kabul, black start, TEİAŞ, kritiklik
     sınıfı…) ÇEKİRDEK KOLONU DEĞİL, paketin beyan ettiği ÖZNİTELİKTİR:
     anahtar → değer. Sektör şemasında olmayan anahtar reddedilir; değeri
     boş bırakılan anahtarın satırı silinir (null yazılmaz — "ölçülmedi"
     satırsızlıkla söylenir, URN-ALN-001). */
  oznitelikler: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  kritikAltyapiStatusu: ucDurum,
  internetMaruziyeti: z.enum(['yok', 'sinirli', 'var']).nullable().optional(),
  uzaktanErisim: ucDurum,
  otMimariTipi: z.enum(['dcs', 'scada', 'plc_scada', 'hibrit']).nullable().optional(),
  dcsSaglayici: metin,
  scadaSaglayici: metin,
  plcAileleri: metin,
  iotVar: ucDurum,
  akilliSayacVar: ucDurum,
  yerelAdVar: ucDurum,
  yerelVeriMerkeziVar: ucDurum,
  grupOrtakServisler: metin,
});

type ProfilGirdisi = z.input<ReturnType<typeof profilSemasi>>;

/** Sektör özniteliklerini şemaya göre yazar: `mantik` → 0/1 sayısal,
    `sayi` → sayısal, `metin`/`tarih` → metin. Şemada olmayan anahtar
    HATADIR (çekirdek tanımadığı bir niteliği sessizce saklamaz); boş
    değer satırı siler. Değer de ŞEMAYLA doğrulanır: seçenek listesi
    varsa listeden biri, tarih ayrıştırılabilir bir tarih, sayı sonlu bir
    sayı, mantık boolean ya da 0/1 olmalıdır — kritiklik rolündeki değeri
    olay etki motoru okur, "kuantum" gibi bir sınıf sessizce giremez. */
async function oznitelikleriYaz(tesisId: string, girdi: Record<string, string | number | boolean | null>) {
  const tesis = await db.tesis.findUniqueOrThrow({
    where: { id: tesisId }, select: { tip: { select: { sektorId: true } } } });
  const sektorId = tesis.tip?.sektorId ?? null;
  // yalnız AKTİF şema satırı: pasif özniteliğe değer yazılamaz — "bilinmeyen öznitelik" (2.1)
  const sema = sektorId
    ? await db.sektorOznitelikSemasi.findMany({ where: { sektorId, aktif: true } }) : [];
  const satirlar = new Map(sema.map((o) => [o.anahtar, o]));
  for (const [anahtar, deger] of Object.entries(girdi)) {
    const o = satirlar.get(anahtar);
    if (!o) throw new Error(`Bilinmeyen öznitelik: ${anahtar} — sektör şemasında beyan edilmemiş`);
    /* Boş ya da yalnız boşluk: satır SİLİNİR — '' ile '   ' aynı
       "bilinmiyor"dur; boşluklu dize null satır olarak kalmaz. */
    if (deger === null || (typeof deger === 'string' && deger.trim() === '')) {
      await db.tesisOzellik.deleteMany({ where: { tesisId, anahtar } });
      continue;
    }
    const veri = oznitelikDegeri(o, deger);
    await db.tesisOzellik.upsert({
      where: { tesisId_anahtar: { tesisId, anahtar } },
      update: { ...veri, kaynak: 'elle' },
      /* Birim şemadan gelir (ekrana gömülmez, §0.5); güncellemede korunur. */
      create: { tesisId, anahtar, ...veri, birim: o.birim, kaynak: 'elle' },
    });
  }
}

function oznitelikDegeri(
  o: { anahtar: string; tip: string; secenekler: string | null },
  deger: string | number | boolean,
): { sayisalDeger: number | null; metinDeger: string | null } {
  const gecersiz = (neden: string) => new Error(`${o.anahtar}: ${neden}`);
  switch (o.tip) {
    case 'mantik': {
      if (typeof deger === 'boolean') return { sayisalDeger: deger ? 1 : 0, metinDeger: null };
      if (deger === 0 || deger === 1) return { sayisalDeger: deger, metinDeger: null };
      throw gecersiz('mantık değeri evet/hayır olmalı');
    }
    case 'sayi': {
      const n = typeof deger === 'number' ? deger : Number(String(deger).replace(',', '.'));
      if (!Number.isFinite(n)) throw gecersiz('sayısal değer olmalı');
      return { sayisalDeger: n, metinDeger: null };
    }
    case 'tarih': {
      const m = String(deger);
      if (Number.isNaN(Date.parse(m))) throw gecersiz('tarih YYYY-AA-GG biçiminde olmalı');
      return { sayisalDeger: null, metinDeger: m };
    }
    default: {
      const m = String(deger).trim();
      if (!m) return { sayisalDeger: null, metinDeger: null };
      const secenekler = seceneklerOku(o.secenekler);
      if (secenekler && !secenekler.some((x) => x.deger === m)) {
        throw gecersiz(`geçersiz seçim — seçenekler: ${secenekler.map((x) => x.deger).join(', ')}`);
      }
      return { sayisalDeger: null, metinDeger: m };
    }
  }
}

/** `secenekler` JSON'u — `[{deger, ad}]`; bozuk ya da boş → null. Ekran
    tarafındaki `seceneklerOku` ile aynı kural (mantik.ts saf, buradan
    içe alınmaz: eylem dosyası ekran modülüne bağlanmaz). */
function seceneklerOku(json: string | null): { deger: string; ad: string }[] | null {
  if (!json) return null;
  try {
    const ham: unknown = JSON.parse(json);
    if (!Array.isArray(ham)) return null;
    const liste = ham.filter((x): x is { deger: string; ad: string } =>
      typeof x === 'object' && x !== null && typeof (x as { deger?: unknown }).deger === 'string');
    return liste.length ? liste : null;
  } catch { return null; }
}

/** Tesis profili upsert — null gönderilen alan "bilinmiyor" olarak saklanır. */
export async function profilKaydet(girdi: ProfilGirdisi): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', { tesisId: girdi.tesisId });
    const sozluk = await eylemSozlugu(k, 'tanimlar', girdi.tesisId);
    const v = profilSemasi(tBas(sozluk, 'tesis')).parse(girdi);
    const veri = {
      kritikAltyapiStatusu: v.kritikAltyapiStatusu ?? null,
      internetMaruziyeti: v.internetMaruziyeti ?? null,
      uzaktanErisim: v.uzaktanErisim ?? null,
      otMimariTipi: v.otMimariTipi ?? null,
      dcsSaglayici: v.dcsSaglayici ?? null,
      scadaSaglayici: v.scadaSaglayici ?? null,
      plcAileleri: v.plcAileleri ?? null,
      iotVar: v.iotVar ?? null,
      akilliSayacVar: v.akilliSayacVar ?? null,
      yerelAdVar: v.yerelAdVar ?? null,
      yerelVeriMerkeziVar: v.yerelVeriMerkeziVar ?? null,
      grupOrtakServisler: v.grupOrtakServisler ?? null,
    };
    const onceki = await db.tesisProfili.findUnique({ where: { tesisId: v.tesisId } });
    await db.tesisProfili.upsert({
      where: { tesisId: v.tesisId },
      update: veri,
      create: { tesisId: v.tesisId, ...veri },
    });
    if (v.oznitelikler) await oznitelikleriYaz(v.tesisId, v.oznitelikler);
    await iz({
      aktorId: k.id, varlikTipi: 'TesisProfili', varlikId: v.tesisId,
      eylem: onceki ? 'guncelleme' : 'olusturma', alan: 'profil',
    });
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Uygulanabilirlik motorunu bu tesis için koşturur.
    Override'lı (el ile değiştirilmiş) kararlara motor dokunmaz. */
export async function kapsamYenidenHesapla(girdi: { tesisId: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'yazma', { tesisId: girdi.tesisId });
    const v = z.object({
      tesisId: bosluksuz(tBas(await eylemSozlugu(k, 'tanimlar', girdi.tesisId), 'tesis')),
    }).parse(girdi);
    await tesisKapsaminiHesapla(v.tesisId, k.id); // motor kendi iz kayıtlarını düşer
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Kapsam kararını el ile değiştirir — GEREKÇE ZORUNLU, onay yetkisi ister.
    elIleDegistirildi=true işaretlenir; motor bu kararı bir daha ezmez. */
export async function uygulanabilirlikOverride(girdi: {
  tesisId: string; regulasyonId: string; uygulanabilir: boolean; gerekce: string;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('tanimlar', 'onay', { tesisId: girdi.tesisId });
    const v = z.object({
      tesisId: bosluksuz(tBas(await eylemSozlugu(k, 'tanimlar', girdi.tesisId), 'tesis')),
      regulasyonId: bosluksuz('Regülasyon'),
      uygulanabilir: z.boolean(),
      gerekce: z.string().trim().min(10, 'Gerekçe zorunlu (en az 10 karakter)'),
    }).parse(girdi);
    /* Karar KAPSAM ÖĞESİNE yazılır (B1); ekran tesis kimliğiyle gelir,
       öğe köprüden çözülür. Öğesi olmayan tesise karar yazılmaz. */
    const oge = await tesisinOgesi(v.tesisId);
    if (!oge) throw new Error('Bu kaydın kapsam öğesi yok — karar yazılamaz');
    const anahtar = { kapsamOgesiId: oge.id, regulasyonId: v.regulasyonId };
    const onceki = await db.uygulanabilirlikKarari.findUnique({
      where: { kapsamOgesiId_regulasyonId: anahtar } });
    const karar = await db.uygulanabilirlikKarari.upsert({
      where: { kapsamOgesiId_regulasyonId: anahtar },
      update: {
        uygulanabilir: v.uygulanabilir, elIleDegistirildi: true,
        degistirmeGerekcesi: v.gerekce, onaylayanId: k.id, hesaplandi: new Date(),
      },
      create: {
        ...anahtar, uygulanabilir: v.uygulanabilir, gerekce: v.gerekce,
        elIleDegistirildi: true, degistirmeGerekcesi: v.gerekce, onaylayanId: k.id,
      },
    });
    await iz({
      aktorId: k.id, varlikTipi: 'UygulanabilirlikKarari', varlikId: karar.id,
      eylem: 'onay', alan: 'uygulanabilirlik',
      once: onceki ? (onceki.uygulanabilir ? 'kapsamda' : 'kapsam dışı') : null,
      sonra: v.uygulanabilir ? 'kapsamda (el ile)' : 'kapsam dışı (el ile)',
      gerekce: v.gerekce,
    });
    revalidatePath(`/tesisler/${v.tesisId}`); revalidatePath('/tesisler');
    return tamam();
  } catch (e) { return hata(e); }
}
