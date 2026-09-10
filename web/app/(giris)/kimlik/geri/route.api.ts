import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { db } from '@/lib/db';
import { DEMO } from '@/lib/demo';
import { oturumAc } from '@/lib/auth';
import { istemciAdresi } from '@/lib/girisKorumasi';
import { AKIS_CEREZI, akisCoz } from '@/lib/kimlik/akisCerezi';
import { kimlikGirisiYaz } from '@/lib/kimlik/girisIzi';
import { konuOzeti, kodukimligeCevir } from '@/lib/kimlik/oidcAkis';
import { guvenliHedef } from '@/app/(giris)/giris/mantik';

/* P6 · KURUM HESABIYLA GİRİŞ · DÖNÜŞ

   Sıra: çerez → state → kod takası → jeton doğrulama → kullanıcı eşlemesi
   → oturum. Her ret dalı denetim izine yazılır; ekrana TEK cümle döner
   (yerel girişteki kuralın aynısı: hangi sebeple reddedildiği sızmaz,
   gerçek sebep izdedir).

   ── ÇEREZ HER DURUMDA SİLİNİR ─────────────────────────────────────────
   Başarıda da retde de. Kalan bir doğrulayıcı, bir sonraki denemede
   yeniden kullanılabilir bir sır bırakırdı. */

/** Ekranda görünen tek ret cümlesi. */
const GENEL_RET = 'kimlik_reddedildi';

function esitMi(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(istek: Request): Promise<NextResponse> {
  if (DEMO) return NextResponse.redirect(new URL('/giris', istek.url));

  const depo = await cookies();
  const akis = akisCoz(depo.get(AKIS_CEREZI)?.value);
  depo.delete(AKIS_CEREZI);

  const url = new URL(istek.url);
  const kod = url.searchParams.get('code');
  const durum = url.searchParams.get('state');
  const idpHatasi = url.searchParams.get('error');
  const adres = await istemciAdresi();

  const ret = (kimlik: string) => NextResponse.redirect(
    new URL(`/giris?kimlik=${kimlik}`, istek.url));

  if (!akis) {
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: '(bilinmiyor)', sonuc: 'red', not: 'akış çerezi yok',
      gerekce: 'Giriş akışı başlatılmadan ya da süresi dolduktan sonra dönüldü', adres,
    });
    return ret('akis_yok');
  }

  const saglayici = await db.kimlikSaglayici.findUnique({ where: { id: akis.s } });
  const ad = saglayici?.ad ?? '(bilinmiyor)';

  if (idpHatasi) {
    /* IdP'nin döndürdüğü hata metni DIŞ VERİDİR: ize kısaltılarak
       yazılır, ekrana hiç çıkmaz. */
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: ad, sonuc: 'red',
      not: `IdP hatası: ${idpHatasi.slice(0, 80)}`,
      gerekce: 'Kimlik sağlayıcı yetkilendirmeyi reddetti', adres,
    });
    return ret(GENEL_RET);
  }

  if (!durum || !esitMi(durum, akis.t)) {
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: ad, sonuc: 'red', not: 'state uyuşmadı',
      gerekce: 'Dönüş isteği bu tarayıcının başlattığı akışa ait değil (CSRF)', adres,
    });
    return ret(GENEL_RET);
  }
  if (!kod) {
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: ad, sonuc: 'red', not: 'kod yok',
      gerekce: 'Yetkilendirme kodu gelmedi', adres,
    });
    return ret(GENEL_RET);
  }
  if (!saglayici) {
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: ad, sonuc: 'red', not: 'sağlayıcı silinmiş',
      gerekce: 'Akış sürerken kimlik sağlayıcı kaldırıldı', adres,
    });
    return ret('bagli_degil');
  }

  const sonuc = await kodukimligeCevir({
    saglayici, kod, dogrulayici: akis.d, nonce: akis.n, simdiMs: Date.now(),
  });

  if (!sonuc.ok) {
    const r = sonuc.ret;
    await kimlikGirisiYaz({
      kullaniciId: null, saglayiciAd: ad, sonuc: 'red',
      not: r.tur === 'taninmayan_kullanici' ? `sub özeti ${r.konuOzeti}` : r.tur,
      gerekce: r.mesaj, adres,
    });
    /* TANINMAYAN KULLANICI ayrı bir ret kodudur: ekran ne yapması
       gerektiğini söyleyebilsin. Bu bir bilgi sızıntısı değildir —
       zaten geçerli bir kurum kimliğiyle gelen kişiye "bu kurulumda
       hesabınız yok" demek, ona yeni bir şey söylemez. */
    return ret(r.tur === 'taninmayan_kullanici' ? 'taninmayan' : GENEL_RET);
  }

  await oturumAc(sonuc.kullaniciId);
  await db.kimlikBagi.updateMany({
    where: { saglayiciId: saglayici.id, konu: sonuc.konu },
    data: { sonGiris: new Date() },
  });
  await kimlikGirisiYaz({
    kullaniciId: sonuc.kullaniciId, saglayiciAd: ad, sonuc: 'kabul',
    not: `sub özeti ${konuOzeti(sonuc.konu)}`,
    gerekce: sonuc.rolOnerileri.length > 0
      ? `IdP rol önerisi: ${sonuc.rolOnerileri.join(', ')}`
        + (sonuc.eslenmeyen.length > 0 ? ` · eşlenmeyen grup: ${sonuc.eslenmeyen.join(', ')}` : '')
      /* ROL ÖNERİSİ YETKİ DEĞİLDİR: bu akış hiçbir `Yetki` satırı
         yazmaz. Öneri ize yazılır ve yönetici ekranında görünür. */
      : 'IdP rol önerisi yok',
    adres,
  });

  return NextResponse.redirect(new URL(guvenliHedef(akis.h), istek.url));
}
