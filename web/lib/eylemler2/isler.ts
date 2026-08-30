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
import { tamam, hata, type Sonuc } from './ortak';

const ISLER = {
  kanit_tazelik: kanitTazeligiIsle,
  deadline_motoru: sonTarihleriIsle,
  gap_to_action: gapAksiyonIsle,
  veri_kalitesi: veriKalitesiniIsle,
  uyum_anlik: anlikGoruntuAl,
} as const;

const IsAdiSemasi = z.enum(
  Object.keys(ISLER) as [keyof typeof ISLER, ...(keyof typeof ISLER)[]],
  'Bilinmeyen iş adı');

/** Dört motoru SIRAYLA çalıştırır: önce tazelik ve son tarihler işlenir,
    gap-to-action bunların çıktısını görür, veri kalitesi en sonda tarar. */
export async function tumIsleriCalistir(): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    for (const [ad, motor] of Object.entries(ISLER)) await isKos(ad, motor);
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}

/** Tek motoru adıyla çalıştırır. */
export async function tekIsCalistir(ad: string): Promise<Sonuc> {
  try {
    await yetkiZorunlu('yonetim', 'yazma');
    const isAdi = IsAdiSemasi.parse(ad);
    await isKos(isAdi, ISLER[isAdi]);
    revalidatePath('/saglik');
    return tamam();
  } catch (e) { return hata(e); }
}
