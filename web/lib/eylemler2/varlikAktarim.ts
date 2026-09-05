'use server';

/* CMDB toplu aktarımı — server action'lar (P1-2).

   Dört adım, üçü ayrı yetki kapısından geçer:
     yükle   → envanter/yazma  · dosya ayrıştırılır, eşleme ÖNERİLİR
     eşle    → envanter/yazma  · kullanıcının onayladığı eşleme doğrulanır
     onayla  → envanter/onay   · transaction içinde commit
     reddet  → envanter/onay

   Yükleme hiçbir varlığa dokunmaz; envanter yalnız ONAY adımında değişir.
   Kalıp: yetkiZorunlu → zod → lib/entegrasyon/varlikAktarim → iz → revalidatePath. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';
import {
  dosyayiAyristir, eslemeOner, eslemeDogrula, satirlariCoz, referanslariYukle,
  mevcutVarliklariYukle, kapsamKur, raporCoz, aktarimiUygula,
  HEDEF_ALANLAR,
  type Esleme, type HedefAlan, type AktarimRaporu,
} from '../entegrasyon/varlikAktarim';
import { zinciriCalistir } from '../entegrasyon/zincir';

export type SonucVeri<T> = { ok: true; veri: T } | { ok: false; hata: string };

const HEDEF_KODLARI = HEDEF_ALANLAR.map((a) => a.anahtar) as [HedefAlan, ...HedefAlan[]];
const EslemeSemasi = z.record(z.string(), z.union([z.enum(HEDEF_KODLARI), z.literal('')]));

/** Kabul edilen uzantılar — başka bir şey gelirse sessizce boş satır değil, hata. */
const UZANTILAR = ['csv', 'xlsx', 'xls'];
/** 12 MB: bunun üstü bellekte ayrıştırılmaz, açık hata döner. */
const AZAMI_BAYT = 12 * 1024 * 1024;

/**
 * 1 · YÜKLE — dosya ayrıştırılır, başlıklar ve ham satırlar saklanır,
 * kolon eşlemesi ÖNERİLİR. Hiçbir varlık yazılmaz; durum `eslesme` olur.
 */
export async function varlikAktarimYukle(form: FormData): Promise<SonucVeri<{ id: string }>> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const dosya = form.get('dosya');
    if (!(dosya instanceof File) || dosya.size === 0) {
      return { ok: false, hata: 'Dosya seçin (CSV veya Excel)' };
    }
    const uzanti = dosya.name.toLowerCase().split('.').pop() ?? '';
    if (!UZANTILAR.includes(uzanti)) {
      return { ok: false, hata: `Desteklenmeyen dosya türü (.${uzanti}) — CSV veya Excel yükleyin` };
    }
    if (dosya.size > AZAMI_BAYT) {
      return { ok: false, hata: `Dosya ${(dosya.size / 1048576).toFixed(1)} MB — en fazla 12 MB işlenir` };
    }

    const cozum = await dosyayiAyristir(Buffer.from(await dosya.arrayBuffer()), dosya.name);
    if (cozum.satirlar.length === 0) {
      return { ok: false, hata: 'Dosyada veri satırı yok — yalnız başlık satırı bulundu' };
    }
    const oneri = eslemeOner(cozum.basliklar);

    const kayit = await db.varlikAktarimi.create({ data: {
      dosyaAdi: dosya.name, kaynakTipi: cozum.kaynakTipi, yukleyenId: k.id,
      durum: 'eslesme',
      basliklarJson: JSON.stringify(cozum.basliklar),
      eslemeJson: JSON.stringify(oneri),
      okunan: cozum.satirlar.length,
      raporJson: JSON.stringify({ ham: cozum.satirlar } satisfies AktarimRaporu),
    } });

    await iz({
      aktorId: k.id, varlikTipi: 'VarlikAktarimi', varlikId: kayit.id,
      eylem: 'olusturma', alan: 'durum', sonra: `eslesme (${cozum.satirlar.length} satır)`,
      dosyaAdi: dosya.name,
    });
    revalidatePath('/varlik-aktarim');
    return { ok: true, veri: { id: kayit.id } };
  } catch (e) {
    const s = hata(e);
    return s.ok ? { ok: false, hata: 'Beklenmeyen hata' } : { ok: false, hata: s.hata };
  }
}

/**
 * 2 · EŞLE + DOĞRULA — kullanıcının onayladığı kolon eşlemesi uygulanır,
 * satırlar çözülür, hata/yinelenen listeleri ve önizleme raporu yazılır.
 * Eşleme değişirse yeniden çağrılabilir; onaylanmış aktarım değiştirilemez.
 */
export async function varlikAktarimEsle(girdi: {
  id: string; esleme: Esleme;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'yazma');
    const v = z.object({ id: bosluksuz('Aktarım'), esleme: EslemeSemasi }).parse(girdi);

    const kayit = await db.varlikAktarimi.findUnique({ where: { id: v.id } });
    if (!kayit) throw new Error('Aktarım bulunamadı');
    if (kayit.durum !== 'eslesme' && kayit.durum !== 'dogrulama_bekliyor') {
      throw new Error(`Bu aktarım artık düzenlenemez (durum: ${kayit.durum})`);
    }
    const sorunlar = eslemeDogrula(v.esleme);
    if (sorunlar.length > 0) throw new Error(sorunlar.join(' · '));

    const rapor = raporCoz(kayit.raporJson);
    if (!rapor.ham) throw new Error('Ham satırlar bulunamadı — dosyayı yeniden yükleyin');

    const [referanslar, mevcutlar] = await Promise.all([
      referanslariYukle(), mevcutVarliklariYukle(),
    ]);
    const cozum = satirlariCoz({
      satirlar: rapor.ham, esleme: v.esleme,
      referanslar, mevcutlar, kapsam: kapsamKur(k),
    });

    await db.varlikAktarimi.update({ where: { id: v.id }, data: {
      durum: 'dogrulama_bekliyor',
      eslemeJson: JSON.stringify(v.esleme),
      okunan: cozum.sayac.okunan, gecerli: cozum.sayac.gecerli,
      hatali: cozum.sayac.hatali, yinelenen: cozum.sayac.yinelenen,
      eklenen: 0, guncellenen: 0,
      raporJson: JSON.stringify({
        ham: rapor.ham, satirlar: cozum.satirlar,
        hatalar: cozum.hatalar, yinelenenler: cozum.yinelenenler, hataMesaji: null,
      } satisfies AktarimRaporu),
    } });

    await iz({
      aktorId: k.id, varlikTipi: 'VarlikAktarimi', varlikId: v.id,
      eylem: 'guncelleme', alan: 'esleme',
      once: kayit.durum,
      sonra: `dogrulama_bekliyor · ${cozum.sayac.gecerli} geçerli / ${cozum.sayac.hatali} hatalı / ${cozum.sayac.yinelenen} eşleşen`,
      dosyaAdi: kayit.dosyaAdi,
    });
    revalidatePath('/varlik-aktarim');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * 3 · ONAY — commit. Tüm satırlar tek transaction içinde yazılır; bir satır
 * patlarsa hiçbiri yazılmaz. Aynı aktarım ikinci kez onaylanamaz.
 */
export async function varlikAktarimOnayla(girdi: { id: string }): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = z.object({ id: bosluksuz('Aktarım') }).parse(girdi);
    await aktarimiUygula({ aktarimId: v.id, onaylayan: k });
    /* Commit'ten SONRA motor zinciri: toplu aktarım CMDB'ye gerçek varlık
       yazar, dolayısıyla veri kalitesi, yedek doğrulama, olay etkisi ve
       gap-to-action girdileri değişti. Zincir fırlatmaz; başarısız motor
       kendi koşu satırını bırakır ve /saglik'te görünür. */
    await zinciriCalistir({ degisenler: { varlik: true } });
    revalidatePath('/varlik-aktarim');
    revalidatePath('/envanter');
    revalidatePath('/omur');
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/** 4 · RET — hiçbir şey yazılmaz, karar denetim izine düşer. */
export async function varlikAktarimReddet(girdi: {
  id: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay');
    const v = z.object({
      id: bosluksuz('Aktarım'),
      gerekce: z.string().trim().transform((s) => s || null).nullable().optional(),
    }).parse(girdi);

    const kayit = await db.varlikAktarimi.findUnique({ where: { id: v.id } });
    if (!kayit) throw new Error('Aktarım bulunamadı');
    if (kayit.durum === 'onaylandi') throw new Error('Onaylanmış aktarım reddedilemez');

    await db.varlikAktarimi.update({ where: { id: v.id }, data: {
      durum: 'reddedildi', onaylayanId: k.id, onayZamani: new Date(),
    } });
    await iz({
      aktorId: k.id, varlikTipi: 'VarlikAktarimi', varlikId: v.id,
      eylem: 'red', alan: 'durum', once: kayit.durum, sonra: 'reddedildi',
      gerekce: v.gerekce ?? null, dosyaAdi: kayit.dosyaAdi,
    });
    revalidatePath('/varlik-aktarim');
    return tamam();
  } catch (e) { return hata(e); }
}
