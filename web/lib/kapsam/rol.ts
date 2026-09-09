import 'server-only';
import { cache } from 'react';
import { db } from '../db';

/* ═══════════════════════════════════════════════════════════════════════
   ROL ÖZNİTELİĞİ — çekirdek anahtarı değil ROLÜ bilir (B2)

   `TesisProfili.kritiklikSinifi` çekirdek kolonuydu ve EPDK'nın
   kritiklik sınıfını taşıyordu — sektöre özgü bir alan çekirdekte.
   Artık enerji paketi `kritiklikSinifi` anahtarını `rol = 'kritiklik'`
   ile beyan eder; olay etki motoru "kritiklik rolündeki öznitelik"i
   okur, adını bilmez. Bankacılık paketi aynı rolü "sistem kritikliği"
   gibi başka bir anahtarla doldurabilir.

   ROL YOKSA DEĞER DE YOKTUR: sektör şeması bu rolü beyan etmemişse
   sonuç null'dur — "düşük" ya da "orta" uydurulmaz (bilinmeyen ≠ sıfır).
   ═══════════════════════════════════════════════════════════════════════ */

export type OznitelikRolu = 'kapasite' | 'kritiklik';

/** Sektörün bu role verdiği anahtar; yoksa null. İstek başına önbellekli. */
export const rolAnahtari = cache(async (sektorId: string | null, rol: OznitelikRolu): Promise<string | null> => {
  if (!sektorId) return null;
  const satir = await db.sektorOznitelikSemasi.findFirst({
    where: { sektorId, rol }, select: { anahtar: true } });
  return satir?.anahtar ?? null;
});

/** Tesisin rol özniteliğinin METİN değeri (kritiklik sınıfı gibi). Tesis
    `ozellikler` ve `tip.sektorId` ile yüklenmiş olmalı; rol beyan
    edilmemişse ya da satır yoksa null. */
export async function rolDegeri(
  tesis: { tip: { sektorId: string | null } | null; ozellikler: { anahtar: string; metinDeger: string | null; sayisalDeger: number | null }[] },
  rol: OznitelikRolu,
): Promise<string | null> {
  const anahtar = await rolAnahtari(tesis.tip?.sektorId ?? null, rol);
  if (!anahtar) return null;
  const o = tesis.ozellikler.find((x) => x.anahtar === anahtar);
  if (!o) return null;
  return o.metinDeger ?? (o.sayisalDeger === null ? null : String(o.sayisalDeger));
}

/** Motorların tesis sorgusuna eklediği ortak seçim. */
export const ROL_OZNITELIK_SECIMI = {
  tip: { select: { sektorId: true } },
  ozellikler: { select: { anahtar: true, metinDeger: true, sayisalDeger: true } },
} as const;
