'use server';

/* Otomasyon motoru eylemleri (§68): motorlar YALNIZ isKos sarmalayıcısı
   üzerinden koşar — her koşu IsKosusu satırı bırakır, sessiz hata yoktur.
   Motor çalıştırmak yönetim yetkisi ister. */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { yetkiZorunlu } from '../erisim';
import { isKos } from '../motorlar/isKosucu';
import { kanitTazeligiIsle } from '../motorlar/kanitTazelik';
import { sonTarihleriIsle } from '../motorlar/sonTarih';
import { gapAksiyonIsle } from '../motorlar/gapAksiyon';
import { veriKalitesiniIsle } from '../motorlar/veriKalitesi';
import { anlikGoruntuAl } from '../motorlar/anlik';
import { yedekDogrulamayiIsle } from '../motorlar/yedekDogrulama';
import { topolojiSapmasiniIsle } from '../motorlar/topolojiSapma';
import { olayEtkileriniIsle } from '../motorlar/olayEtki';
import { tamam, hata, type Sonuc } from './ortak';

const ISLER = {
  kanit_tazelik: kanitTazeligiIsle,
  deadline_motoru: sonTarihleriIsle,
  gap_to_action: gapAksiyonIsle,
  veri_kalitesi: veriKalitesiniIsle,
  uyum_anlik: anlikGoruntuAl,
  yedek_dogrulama: yedekDogrulamayiIsle,
  olay_etki: olayEtkileriniIsle,
  topoloji_sapma: topolojiSapmasiniIsle,
} as const;

const IsAdiSemasi = z.enum(
  Object.keys(ISLER) as [keyof typeof ISLER, ...(keyof typeof ISLER)[]],
  'Bilinmeyen iş adı');

/** Kayıtlı motorların TAMAMINI sırayla çalıştırır: önce tazelik ve son
    tarihler işlenir, gap-to-action bunların çıktısını görür, veri kalitesi
    en sonda tarar.

    NOT — iki farklı sıra vardır ve bu bilinçlidir:
    · Buradaki sıra ELLE tetiklenen "hepsini çalıştır" düğmesinindir ve
      ürünün özgün tasarımıdır (veri kalitesi en sonda tam tarama yapar).
    · Entegrasyondan YENİ VERİ geldiğinde koşan sıra farklıdır ve
      lib/entegrasyon/zincir.ts içinde yaşar: orada veri kalitesi
      gap-to-action'dan ÖNCE koşar, çünkü yeni aktarılan kaydın
      kalitesi bilinmeden ondan aksiyon türetmek yanlış olur. */
export async function tumIsleriCalistir(): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    /* Başarısız koşu SESSİZ GEÇMEZ. Eskiden hepsi patlasa bile tamam()
       dönüyordu; kullanıcı motorların çalıştığını sanıyordu. Koşu kaydı
       zaten /saglik'te görünüyor ama çağırana da bildirilmeli. */
    const basarisizlar: string[] = [];
    for (const [ad, motor] of Object.entries(ISLER)) {
      const sonuc = await isKos(ad, motor);
      if (!sonuc.ok && sonuc.sebep === 'hata') basarisizlar.push(ad);
    }
    revalidatePath('/saglik');
    if (basarisizlar.length > 0) {
      return { ok: false, hata: `${basarisizlar.length} motor başarısız: ${basarisizlar.join(', ')}. Ayrıntı platform sağlığı ekranında.` };
    }
    return tamam();
  } catch (e) { return hata(e); }
}

/** Tek motoru adıyla çalıştırır. */
export async function tekIsCalistir(ad: string): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    const isAdi = IsAdiSemasi.parse(ad);
    const sonuc = await isKos(isAdi, ISLER[isAdi]);
    revalidatePath('/saglik');
    if (!sonuc.ok) {
      return sonuc.sebep === 'zaten_calisiyor'
        ? { ok: false, hata: 'Bu motor hâlihazırda koşuyor.' }
        : { ok: false, hata: `Motor başarısız: ${sonuc.hata}` };
    }
    return tamam();
  } catch (e) { return hata(e); }
}
