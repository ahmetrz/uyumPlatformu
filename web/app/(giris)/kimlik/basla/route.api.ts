import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEMO } from '@/lib/demo';
import { durumUret, nonceUret, pkceUret, yetkilendirmeAdresi } from '@/lib/kimlik/oidc';
import { ayariCoz } from '@/lib/kimlik/oidcAkis';
import { AKIS_CEREZI, akisCerezSecenekleri } from '@/lib/kimlik/akisCerezi';
import { guvenliHedef } from '@/app/(giris)/giris/mantik';

/* P6 · KURUM HESABIYLA GİRİŞ · BAŞLANGIÇ

   ── PKCE DOĞRULAYICISI VERİTABANINA YAZILMAZ ──────────────────────────
   Doğrulayıcı, nonce ve state kısa ömürlü bir httpOnly çerezde taşınır.
   Veritabanına yazsaydık kısa ömürlü bir SIR daha saklamış olurduk ve
   temizlenmeyen satırlar birikirdi; çerez isteğin kendisiyle gelir,
   kullanılınca silinir ve tarayıcı dışına çıkmaz.

   ── `next` DIŞARIDAN GELİR, DENETLENİR ────────────────────────────────
   Yerel girişteki kuralın aynısı (`guvenliHedef`): yalnız site içi
   göreli yol kabul edilir. Açık yönlendirme, kimlik akışının en ucuz
   istismarıdır.

   Bu uç HİÇBİR ŞEY YAZMAZ ve oturum AÇMAZ; yalnız IdP'ye yönlendirir. */

export async function GET(istek: Request): Promise<NextResponse> {
  if (DEMO) return NextResponse.redirect(new URL('/giris', istek.url));

  const url = new URL(istek.url);
  const saglayiciId = url.searchParams.get('saglayici') ?? '';
  const hedef = guvenliHedef(url.searchParams.get('next'));

  const saglayici = await db.kimlikSaglayici.findFirst({
    /* BAĞLI VE AKTİF olmayan sağlayıcı bu uçtan da geçmez: giriş
       ekranında görünmeyen bir sağlayıcıya doğrudan adresle
       başlanabilseydi, ekran kapısı bir süs olurdu. */
    where: { id: saglayiciId, bagli: true, aktif: true },
  });
  if (!saglayici) {
    return NextResponse.redirect(new URL('/giris?kimlik=bagli_degil', istek.url));
  }
  const cozum = ayariCoz(saglayici);
  if (!cozum.ok) {
    return NextResponse.redirect(new URL('/giris?kimlik=yapilandirma', istek.url));
  }

  const pkce = pkceUret();
  const durum = durumUret();
  const nonce = nonceUret();

  (await cookies()).set(
    AKIS_CEREZI,
    JSON.stringify({ s: saglayici.id, d: pkce.dogrulayici, n: nonce, t: durum, h: hedef }),
    akisCerezSecenekleri(),
  );

  return NextResponse.redirect(yetkilendirmeAdresi({
    ayar: cozum.ayar, durum, nonce, meydanOkuma: pkce.meydanOkuma,
  }));
}
