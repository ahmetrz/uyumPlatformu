import 'server-only';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { DOSYA_SINIRI, IZINLI_TIPLER } from './kanitDosyaKurali';

/* ═══════════════════════════════════════════════════════════════════════
   UY-13 · Kanıt dosyası deposu

   Kanıt kaydının bir `dosyaYolu` alanı vardı ve o alana HİÇBİR ŞEY
   yazılmıyordu: ürün kanıt dosyası tutmuyordu. Bir uyum platformunun
   denetçiye gösterebileceği tek şey ekran çıktısıysa, kanıt katmanı yok
   demektir.

   Bu modül OT-48'in `nesne_deposu` sağlayıcı ailesinin bugünkü BAĞLI
   üyesidir: yerel dosya sistemi. Gerçek nesne deposu (S3 uyumlu) hâlâ
   bağlı değildir ve `saglayicilar.ts` bunu açıkça söyler.

   ── İÇERİK ADRESLİ: KULLANICI GİRDİSİ YOLA GİRMEZ ─────────────────────
   Dosya adı kullanıcıdan gelir ve bir kullanıcı girdisi asla dosya
   yoluna konmaz. Depo anahtarı içeriğin SHA-256 özetinden türetilir:
   `<ilk2>/<sonraki2>/<tam özet>`. Bu üç şeyi birden verir — yol
   geçişi (`../`) imkânsızdır, aynı içerik iki kez saklanmaz ve dosyanın
   bütünlüğü adının kendisiyle doğrulanabilir.

   ── İZİN LİSTESİ, YASAK LİSTESİ DEĞİL ─────────────────────────────────
   Kabul edilen MIME tipleri sayılıdır. Yasak listesi tutmak, listede
   olmayan her yeni tehlikeli tipi sessizce kabul etmek demektir.

   ── ÜRÜN DOSYAYI YORUMLAMAZ ───────────────────────────────────────────
   Yüklenen dosya AÇILMAZ, ayrıştırılmaz, önizlenmez ve çalıştırılmaz.
   Ürün onu bir bayt dizisi olarak saklar ve özetini alır. Bir kanıt
   dosyasını ayrıştırmak, saldırı yüzeyini kanıt katmanına taşımak
   olurdu. */

export type DepoSonucu =
  | {
    ok: true;
    /** İçerik adresli depo anahtarı — dosya yolu DEĞİL, kimliktir. */
    anahtar: string;
    ozet: string;
    boyut: number;
    /** Aynı içerik zaten duruyordu; yeniden yazılmadı. */
    zatenVardi: boolean;
  }
  | { ok: false; hata: string };

/** Depo kökü. Ortamdan gelir; verilmezse ürünün kendi dizini. */
export function depoKoku(): string {
  const ozel = process.env.KANIT_DEPO_KOKU?.trim();
  return ozel && ozel.length > 0 ? ozel : path.join(process.cwd(), 'veri', 'kanit');
}

/** Bu sağlayıcının adı — `Kanit.depoSaglayici` alanına yazılır. */
export const SAGLAYICI_ADI = 'yerel_dosya';

/** İçerik özetinden depo anahtarı. Kullanıcı girdisi HİÇ karışmaz. */
export function anahtarUret(ozet: string): string {
  return `${ozet.slice(0, 2)}/${ozet.slice(2, 4)}/${ozet}`;
}

/** Anahtarın biçimi — okuma yolunda ikinci kapı. */
const ANAHTAR_BICIMI = /^[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{64}$/;

/**
 * Dosyayı depoya yazar.
 *
 * Aynı içerik daha önce yazılmışsa YENİDEN YAZILMAZ ve `zatenVardi`
 * döner: içerik adresli bir depoda aynı özet aynı bayt dizisidir.
 * Çağıran bunu bir hata sanmamalı — iki kontrol aynı politika belgesini
 * kanıt gösterebilir ve bu doğru bir durumdur.
 */
export async function dosyayiYaz(o: {
  icerik: Uint8Array;
  mimeTipi: string;
}): Promise<DepoSonucu> {
  if (!(o.mimeTipi in IZINLI_TIPLER)) {
    return {
      ok: false,
      hata: `İçerik tipi kabul edilmiyor: ${o.mimeTipi}. İzinli tipler: `
        + `${Object.keys(IZINLI_TIPLER).join(', ')}.`,
    };
  }
  if (o.icerik.byteLength === 0) {
    /* Boş dosya sessizce kabul edilirse, denetçi "kanıt var" görür ve
       açtığında hiçbir şey bulamaz. */
    return { ok: false, hata: 'Dosya boş — boş bir dosya kanıt değildir.' };
  }
  if (o.icerik.byteLength > DOSYA_SINIRI) {
    return {
      ok: false,
      hata: `Dosya ${DOSYA_SINIRI} bayt sınırını aşıyor (${o.icerik.byteLength}).`,
    };
  }

  const ozet = createHash('sha256').update(o.icerik).digest('hex');
  const anahtar = anahtarUret(ozet);
  const tamYol = path.join(depoKoku(), anahtar);

  try {
    await stat(tamYol);
    return { ok: true, anahtar, ozet, boyut: o.icerik.byteLength, zatenVardi: true };
  } catch {
    /* Yok — yazılacak. `stat` hatası burada beklenen yoldur. */
  }

  try {
    await mkdir(path.dirname(tamYol), { recursive: true });
    await writeFile(tamYol, o.icerik);
  } catch (e) {
    return { ok: false, hata: `Depoya yazılamadı: ${(e as Error).message}` };
  }
  return { ok: true, anahtar, ozet, boyut: o.icerik.byteLength, zatenVardi: false };
}

export type OkumaSonucu =
  | { ok: true; icerik: Buffer; ozetDogru: boolean }
  | { ok: false; hata: string };

/**
 * Dosyayı depodan okur ve BÜTÜNLÜĞÜNÜ doğrular.
 *
 * Okunan içeriğin özeti anahtarla eşleşmiyorsa `ozetDogru: false` döner
 * ve çağıran bunu bir bulgu olarak yüzeye çıkarmalıdır. Sessizce
 * döndürmek, diskte bozulmuş ya da değiştirilmiş bir kanıtı denetçiye
 * sağlam diye vermek olurdu.
 */
export async function dosyayiOku(anahtar: string): Promise<OkumaSonucu> {
  /* Biçim denetimi bir yol geçişi (`../`) savunmasıdır ve `anahtar`
     veritabanından gelse bile uygulanır: veritabanı da bir gün yanlış
     veri taşıyabilir ve o gün dosya sistemi savunmasız kalmamalıdır. */
  if (!ANAHTAR_BICIMI.test(anahtar)) {
    return { ok: false, hata: 'Depo anahtarı biçimi geçersiz.' };
  }
  const tamYol = path.join(depoKoku(), anahtar);
  try {
    const icerik = await readFile(tamYol);
    const ozet = createHash('sha256').update(icerik).digest('hex');
    return { ok: true, icerik, ozetDogru: ozet === anahtar.split('/')[2] };
  } catch (e) {
    return { ok: false, hata: `Depodan okunamadı: ${(e as Error).message}` };
  }
}

export { DOSYA_SINIRI, IZINLI_TIPLER, guvenliDosyaAdi } from './kanitDosyaKurali';
