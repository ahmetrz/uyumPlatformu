'use server';

/* ═══ P6 · KİMLİK SAĞLAYICI YÖNETİMİ ══════════════════════════════════

   Kalıp `entegrasyon.ts`ten alınmıştır ve aynı gerekçeyle:

   · GİRİŞTE SIR DEĞERİ KABUL EDİLMEZ. Yalnız `sirReferansi` alınır ve
     biçimi doğrulanır; değerin kendisi bu ürünün veritabanına hiç
     girmez. Bekçi bunu ölçer (URN-KML-001).
   · İZE MASKELİ ADRES YAZILIR. `sirMaskesi()` sırra giden adresi verir,
     sırrın kendisini değil.
   · BAĞLAMA AYRI BİR KARARDIR. Kayıt `bagli=false` doğar; yapılandırma
     tamamlanmadan bağlanamaz, bağlanmadan aktif edilemez, aktif değilse
     giriş ekranında GÖRÜNMEZ. Üç aşamanın üçü de insan kararıdır.

   Yetki `yonetim/onay`: kurum hesabıyla girişi açmak, bu kurulumda kimin
   içeri girebileceğini bir dış sisteme devretmektir — yazma yetkisiyle
   yapılmaz. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '../db';
import { yetkiZorunlu } from '../erisim';
import { referansDenetle, sirMaskesi } from '../entegrasyon/sir';
import { ayarKapisi } from '../kimlik/oidc';
import { rolEslemesiGecerli } from '../kimlik/oidcAkis';
import { politikaKapisi } from '../kimlik/politika';
import { type Sonuc, tamam, hata, iz, bosluksuz } from './ortak';

const YOL = '/ayarlar/kimlik';

/* SIR DEĞERİ ALANI YOKTUR VE EKLENMEYECEK. Bu şemada `istemciSirri` diye
   bir alan olsaydı, bir gün biri onu doldurur ve sır veritabanına
   girerdi; olmayan bir alan doldurulamaz. */
const Sema = z.object({
  id: z.string().trim().max(64).nullable().optional(),
  ad: bosluksuz('Ad').max(120),
  issuer: z.string().trim().max(400).nullable().optional(),
  clientId: z.string().trim().max(200).nullable().optional(),
  istemciSirriReferansi: z.string().trim().max(300).nullable().optional(),
  yetkilendirmeUcu: z.string().trim().max(400).nullable().optional(),
  jetonUcu: z.string().trim().max(400).nullable().optional(),
  jwksUcu: z.string().trim().max(400).nullable().optional(),
  yonlendirmeUri: z.string().trim().max(400).nullable().optional(),
  rolIddiasi: z.string().trim().max(80).nullable().optional(),
  rolEslemesiJson: z.string().trim().max(20000).nullable().optional(),
  jitAcik: z.boolean().optional(),
});

export type KimlikSaglayiciGirdisi = z.input<typeof Sema>;

const bos = (d: string | null | undefined) => (d && d.trim() !== '' ? d.trim() : null);

/** Sağlayıcıyı oluşturur ya da günceller. BAĞLAMAZ ve AKTİF ETMEZ. */
export async function kimlikSaglayiciKaydet(girdi: KimlikSaglayiciGirdisi): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = Sema.parse(girdi);

    /* SIR REFERANSI: biçim ve sağlayıcı BURADA denetlenir. Biçimi bozuk
       bir referansı kaydetmek, kurulumu ilk giriş denemesine kadar
       sessizce erteler. */
    const referans = bos(v.istemciSirriReferansi);
    if (referans) {
      const denetim = referansDenetle(referans);
      if (!denetim.ok) {
        return {
          ok: false,
          hata: `${denetim.hata}. Sır DEĞERİ buraya yazılmaz; değeri sır sağlayıcısına`
            + ' koyup adresini girin (env:AD · dosya:/yol#alan · vault:yol#alan).',
        };
      }
    }

    if (!rolEslemesiGecerli(bos(v.rolEslemesiJson))) {
      return {
        ok: false,
        hata: 'Rol eşlemesi JSON nesnesi olmalı: { "<IdP grubu>": "<ürün rolü>" }.'
          + ' Okunamayan bir eşleme hiçbir rol dağıtmaz ve bunu sessizce yapması,'
          + ' "neden yetkim yok" sorusunu cevapsız bırakırdı.',
      };
    }

    const veri = {
      ad: v.ad,
      tur: 'oidc',
      issuer: bos(v.issuer),
      clientId: bos(v.clientId),
      istemciSirriReferansi: referans,
      yetkilendirmeUcu: bos(v.yetkilendirmeUcu),
      jetonUcu: bos(v.jetonUcu),
      jwksUcu: bos(v.jwksUcu),
      yonlendirmeUri: bos(v.yonlendirmeUri),
      rolIddiasi: bos(v.rolIddiasi),
      rolEslemesiJson: bos(v.rolEslemesiJson),
      jitAcik: v.jitAcik ?? false,
    };

    const onceki = v.id
      ? await db.kimlikSaglayici.findUnique({ where: { id: v.id } })
      : null;
    if (v.id && !onceki) throw new Error('Kimlik sağlayıcı bulunamadı');

    /* YAPILANDIRMA DEĞİŞİRSE BAĞ DÜŞER. Bağlı bir sağlayıcının issuer'ını
       ya da sırrını değiştirip bağı ayakta bırakmak, bir insanın
       onaylamadığı bir yapılandırmayla giriş kabul etmek olurdu. */
    const kayit = onceki
      ? await db.kimlikSaglayici.update({
        where: { id: onceki.id }, data: { ...veri, bagli: false, aktif: false },
      })
      : await db.kimlikSaglayici.create({ data: { ...veri, bagli: false, aktif: false } });

    await iz({
      aktorId: k.id,
      varlikTipi: 'KimlikSaglayici',
      varlikId: kayit.id,
      eylem: onceki ? 'guncelleme' : 'olusturma',
      alan: 'yapilandirma',
      once: onceki
        ? `${onceki.ad} · ${onceki.issuer ?? 'issuer yok'} · sır: ${sirMaskesi(onceki.istemciSirriReferansi)}`
        : null,
      /* MASKELİ ADRES — sırrın kendisi değil. */
      sonra: `${kayit.ad} · ${kayit.issuer ?? 'issuer yok'} · sır: ${sirMaskesi(kayit.istemciSirriReferansi)}`
        + ` · JIT ${kayit.jitAcik ? 'AÇIK' : 'kapalı'}`,
      gerekce: onceki
        ? 'Yapılandırma değişti — bağ ve aktiflik DÜŞÜRÜLDÜ, yeniden bağlanmalı'
        : 'Kimlik sağlayıcı tanımlandı — bağlı değil, aktif değil',
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/**
 * Sağlayıcıyı BAĞLAR — yapılandırma tam değilse reddeder.
 *
 * Bağlamak bir ağ çağrısı YAPMAZ: keşif belgesini çekmek ya da IdP'ye
 * bir istek atmak bu kurulumun kararıdır ve ilk gerçek girişte olur.
 * Burada ölçülen şey yapılandırmanın BÜTÜNLÜĞÜ — eksikse eksiği adıyla
 * söyler, "bağlandı" demez.
 */
export async function kimlikSaglayiciBagla(girdi: {
  id: string; bagli: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = z.object({ id: bosluksuz('Sağlayıcı').max(64), bagli: z.boolean() }).parse(girdi);
    const kayit = await db.kimlikSaglayici.findUnique({ where: { id: v.id } });
    if (!kayit) throw new Error('Kimlik sağlayıcı bulunamadı');

    if (v.bagli) {
      const kapi = ayarKapisi(kayit);
      if (!kapi.ok) {
        return {
          ok: false,
          hata: `Yapılandırma eksik: ${kapi.eksikler.join(', ')}. Bağlanmamış bir sağlayıcı`
            + ' giriş ekranında görünmez ve bu bir kusur değil, ürünün "bağlı olmayan'
            + ' sağlayıcı bağlı değil der" kuralıdır.',
        };
      }
    }

    await db.kimlikSaglayici.update({
      where: { id: kayit.id },
      /* Bağ düşerse aktiflik de düşer: aktif ama bağsız bir sağlayıcı,
         giriş ekranında çalışmayan bir düğme demektir. */
      data: { bagli: v.bagli, aktif: v.bagli ? kayit.aktif : false },
    });

    await iz({
      aktorId: k.id, varlikTipi: 'KimlikSaglayici', varlikId: kayit.id,
      eylem: 'guncelleme', alan: 'bagli',
      once: kayit.bagli ? 'bağlı' : 'bağlı değil',
      sonra: v.bagli ? 'bağlı' : 'bağlı değil',
      gerekce: `${kayit.ad} · sır: ${sirMaskesi(kayit.istemciSirriReferansi)}`,
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/** Giriş ekranında görünsün mü. Bağlı olmayan sağlayıcı AKTİF EDİLEMEZ. */
export async function kimlikSaglayiciAktiflik(girdi: {
  id: string; aktif: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = z.object({ id: bosluksuz('Sağlayıcı').max(64), aktif: z.boolean() }).parse(girdi);
    const kayit = await db.kimlikSaglayici.findUnique({ where: { id: v.id } });
    if (!kayit) throw new Error('Kimlik sağlayıcı bulunamadı');
    if (v.aktif && !kayit.bagli) {
      return {
        ok: false,
        hata: 'Bağlı olmayan sağlayıcı aktif edilemez — giriş ekranında çalışmayan bir'
          + ' düğme gösterilmez.',
      };
    }
    await db.kimlikSaglayici.update({ where: { id: kayit.id }, data: { aktif: v.aktif } });
    await iz({
      aktorId: k.id, varlikTipi: 'KimlikSaglayici', varlikId: kayit.id,
      eylem: 'guncelleme', alan: 'aktif',
      once: kayit.aktif ? 'aktif' : 'pasif', sonra: v.aktif ? 'aktif' : 'pasif',
      gerekce: kayit.ad,
    });
    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}

/* ── Oturum politikası ────────────────────────────────────────────────── */

export async function oturumPolitikasiKaydet(girdi: {
  mutlakSaat: number; atilDakika: number; mfaZorunlu: boolean;
}): Promise<Sonuc> {
  try {
    const k = await yetkiZorunlu('yonetim', 'onay');
    const v = z.object({
      mutlakSaat: z.number().int().positive(),
      atilDakika: z.number().int().positive(),
      mfaZorunlu: z.boolean(),
    }).parse(girdi);

    const kapi = politikaKapisi({ mutlakSaat: v.mutlakSaat, atilSaat: v.atilDakika / 60 });
    if (!kapi.ok) return { ok: false, hata: kapi.sebep };

    const onceki = await db.oturumPolitikasi.findUnique({ where: { kiraci: 'varsayilan' } });
    await db.oturumPolitikasi.upsert({
      where: { kiraci: 'varsayilan' },
      create: { kiraci: 'varsayilan', ...v, guncelleyenId: k.id },
      update: { ...v, guncelleyenId: k.id },
    });

    await iz({
      aktorId: k.id, varlikTipi: 'OturumPolitikasi', varlikId: 'varsayilan',
      eylem: 'guncelleme', alan: 'politika',
      /* Kayıt YOKKEN varsayılan geçerliydi ve iz bunu "boş" değil
         "varsayılan" diye yazar — bilinmeyen ≠ sıfır. */
      once: onceki
        ? `${onceki.mutlakSaat} saat / ${onceki.atilDakika} dk / MFA ${onceki.mfaZorunlu ? 'zorunlu' : 'isteğe bağlı'}`
        : 'varsayılan (12 saat / 120 dk / MFA isteğe bağlı)',
      sonra: `${v.mutlakSaat} saat / ${v.atilDakika} dk / MFA ${v.mfaZorunlu ? 'zorunlu' : 'isteğe bağlı'}`,
      gerekce: 'Kiracı oturum politikası',
    });

    revalidatePath(YOL);
    return tamam();
  } catch (e) {
    return hata(e);
  }
}
