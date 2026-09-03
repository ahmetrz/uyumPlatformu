'use server';

/* Veri kökeni doğrulama eylemleri (§ provenance).

   Sözleşmenin bu dosyaya düşen kısmı tek cümle: DOĞRULAMA İNSANIN İŞİDİR.
   Motor kendi verisini doğrulayamaz; bu yüzden doğrulayan her zaman
   veritabanında var olan, aktif, gerçek bir kullanıcıdır — sistem/servis
   kimliği, demo kullanıcısı ya da "entegrasyon" gibi sanal bir aktör kabul
   edilmez. Gerekçe zorunludur: neye dayanarak doğrulandığı yazılmadan bir
   doğrulama denetim izinde hiçbir şey ifade etmez.

   Kalıp: yetkiZorunlu(KAPSAM_SONRA) → zod → gerçek kullanıcı → kayıt +
   kapsam (kokenGetirVeKapsamDenetle) → db → iz → revalidatePath.

   Ön kapı KAPSAM_SONRA ile açılır çünkü hangi santralin sorulacağı ancak
   köken kaydı okunduktan sonra bilinir; kapsamsız çağrılsaydı tesise
   kısıtlı rol KENDİ santralinin kökenini bile doğrulayamazdı. Gerçek
   denetim `kokenGetirVeKapsamDenetle` içindedir ve kapsamsız kaydı `{}`
   ile sorar — yani kısıtlı rol kurumsal kayda uzanamaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu, izinVar, KAPSAM_SONRA } from '../erisim';
import { kokenDogrula } from '../entegrasyon/koken';
import { kokenTesisi } from '../entegrasyon/kokenRapor';
import type { AktifKullanici } from '../auth';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const SONUCLAR = ['dogrulandi', 'reddedildi'] as const;

/** Tek çağrıda doğrulanabilecek en fazla kayıt — sınırsız döngü, sınırsız
    denetim izi demektir; toplu işlem gözden geçirilebilir kalmalı. */
const TOPLU_SINIR = 200;

const gerekceAlani = z
  .string('Gerekçe zorunlu — dayanağı yazılmayan doğrulama denetim izinde bir şey ifade etmez')
  .trim()
  .min(1, 'Gerekçe boş olamaz');

const TekliSema = z.object({
  kokenId: bosluksuz('Köken kaydı'),
  sonuc: z.enum(SONUCLAR, 'Doğrulama sonucu yalnız dogrulandi ya da reddedildi olabilir'),
  gerekce: gerekceAlani,
});

const TopluSema = z.object({
  kokenIdler: z.array(bosluksuz('Köken kaydı')).min(1, 'En az bir köken kaydı seçilmeli'),
  sonuc: z.enum(SONUCLAR, 'Doğrulama sonucu yalnız dogrulandi ya da reddedildi olabilir'),
  gerekce: gerekceAlani,
});

type KokenSatiri = {
  id: string; varlikTipi: string; varlikId: string;
  kaynakSistem: string; dogrulamaDurumu: string;
};

/**
 * Doğrulayanın gerçek olduğunu KANITLAR. `yetkiZorunlu` bir oturum sahibi
 * döndürür ama demo yayınında sanal bir kimlik de dönebilir; köken
 * doğrulamasının arkasında hesap verebilir bir insan olmak zorunda.
 */
async function gercekKullanici(k: AktifKullanici): Promise<{ id: string; adSoyad: string }> {
  const kisi = await db.kullanici.findUnique({
    where: { id: k.id }, select: { id: true, adSoyad: true, aktif: true },
  });
  if (!kisi || !kisi.aktif)
    throw new Error(
      'Köken doğrulaması gerçek ve aktif bir kullanıcı gerektirir — sistem kimliği doğrulama yapamaz');
  return { id: kisi.id, adSoyad: kisi.adSoyad };
}

/** Köken satırını getirir ve santral kapsamını denetler. */
async function kokenGetirVeKapsamDenetle(
  k: AktifKullanici, kokenId: string,
): Promise<KokenSatiri> {
  const koken = await db.veriKokeni.findUnique({
    where: { id: kokenId },
    select: { id: true, varlikTipi: true, varlikId: true, kaynakSistem: true, dogrulamaDurumu: true },
  });
  if (!koken) throw new Error('Köken kaydı bulunamadı');

  const { bilinen, tesisId } = await kokenTesisi(koken.varlikTipi, koken.varlikId);
  // Kapsamı çözülemeyen kayıt "kapsam dışı" değil, "kapsamı bilinmiyor"dur:
  // bilinmeyeni serbest saymak, santral kapsamını sessizce delmek olurdu.
  if (!bilinen)
    throw new Error(
      `${koken.varlikTipi} kaydının santrali çözülemedi — kapsam denetlenmeden köken doğrulanamaz`);
  if (!izinVar(k, 'envanter', 'onay', tesisId ? { tesisId } : {}))
    throw new Error(tesisId
      ? 'Bu tesis kapsamında köken doğrulama yetkiniz yok'
      : 'Tesise bağlı olmayan kaydın kökenini doğrulamak kapsamsız envanter onay yetkisi ister');
  return koken;
}

async function dogrulamaIzi(
  aktorId: string, koken: KokenSatiri, sonuc: (typeof SONUCLAR)[number], gerekce: string,
) {
  await iz({
    aktorId,
    varlikTipi: 'VeriKokeni',
    varlikId: koken.id,
    eylem: sonuc === 'dogrulandi' ? 'onay' : 'red',
    alan: 'dogrulamaDurumu',
    once: koken.dogrulamaDurumu,
    sonra: sonuc,
    gerekce: `${gerekce} · ${koken.varlikTipi}/${koken.varlikId} · kaynak: ${koken.kaynakSistem}`,
  });
}

/**
 * Tek köken kaydının insan doğrulaması. `sonuc: 'reddedildi'` kaydı silmez;
 * kökeni "otomatik + reddedildi" durumunda bırakır — reddin kendisi de
 * saklanması gereken bir bilgidir.
 */
export async function kokenDogrulaEylem(girdi: {
  kokenId: string; sonuc: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = TekliSema.parse(girdi);
    const kisi = await gercekKullanici(k);
    const koken = await kokenGetirVeKapsamDenetle(k, v.kokenId);

    await kokenDogrula(koken.id, kisi.id, v.sonuc);
    await dogrulamaIzi(kisi.id, koken, v.sonuc, v.gerekce);

    revalidatePath('/envanter');
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/**
 * Birden çok köken kaydını aynı gerekçeyle doğrular. Toplu işlem TEK BİR
 * denetim satırına indirgenmez: her kayıt için ayrı iz düşer, yoksa altı ay
 * sonra "hangi kaydı kim, neye dayanarak doğruladı" sorusu cevapsız kalır.
 *
 * Kayıtların tamamı önce doğrulanır (varlık + kapsam); biri bile geçersizse
 * hiçbiri yazılmaz — yarım toplu onay bırakmaz.
 */
export async function kokenTopluDogrula(girdi: {
  kokenIdler: string[]; sonuc: string; gerekce?: string | null;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('envanter', 'onay', KAPSAM_SONRA);
    const v = TopluSema.parse(girdi);
    const idler = [...new Set(v.kokenIdler)];
    if (idler.length > TOPLU_SINIR)
      throw new Error(`Tek seferde en fazla ${TOPLU_SINIR} köken doğrulanabilir (${idler.length} istendi)`);

    const kisi = await gercekKullanici(k);

    // Ön denetim: eksik/kapsam dışı bir kayıt varsa hiçbirine dokunulmaz.
    const kokenler: KokenSatiri[] = [];
    for (const id of idler) kokenler.push(await kokenGetirVeKapsamDenetle(k, id));

    const yazilan: string[] = [];
    try {
      for (const koken of kokenler) {
        await kokenDogrula(koken.id, kisi.id, v.sonuc);
        // Her kayıt kendi iz satırını alır — toplu tek satır YOK.
        await dogrulamaIzi(kisi.id, koken, v.sonuc, v.gerekce);
        yazilan.push(koken.id);
      }
    } catch (e) {
      // Sessiz yutma yok: kaçının yazıldığı açıkça söylenir.
      const sebep = e instanceof Error ? e.message : 'bilinmeyen hata';
      throw new Error(
        `${kokenler.length} kayıttan ${yazilan.length} tanesi doğrulandı, sonrası yazılamadı: ${sebep}`);
    }

    revalidatePath('/envanter');
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}
