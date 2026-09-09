import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SAGLAYICI } from '@/lib/veritabani';
import { depoKoku } from '@/lib/uyum/kanitDeposu';
import { ortamiCoz } from '@/lib/yapilandirma/ortam';
import { access, constants } from 'node:fs/promises';

/* DOSYA ADI `route.api.ts` — deponun kendi kuralı (`next.config.ts`
   `pageExtensions`): `api.ts` YALNIZ demo dışı derlemeye girer. Statik demo
   `output: 'export'`tur ve dinamik yönlendirici dışa aktarılamaz; adı
   `route.ts` olsaydı TEK uç bütün demo çıktısını düşürürdü (ölçüldü:
   "Failed to collect page data for /api/v1/health"). Demoda veritabanı ve
   kanıt deposu zaten yoktur — ölçülecek bağımlılık olmadığı için uç orada
   HİÇ YOKTUR; "sağlıklı" diye yalan söyleyen bir koçan koymuyoruz. */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* ═══════════════════════════════════════════════════════════════════════
   SAĞLIK UCU — liveness ve readiness AYRI ŞEYLERDİR (P7 · 2.3)

   · liveness (`?kip=canli`)  — süreç ayakta mı. Bağımlılığa BAKMAZ; bakarsa
     veritabanı bir dakika düştüğünde orkestratör sağlıklı bir süreci
     öldürür ve kesintiyi UZATIR.
   · readiness (varsayılan)   — istek karşılayabilir mi. Veritabanı VE kanıt
     deposu ölçülür; biri erişilemezse **503 + SEBEP**.

   "SAĞLIKLI" YALNIZ GERÇEKTEN SAĞLIKLIYSA YAZILIR. Ölçülemeyen bağımlılık
   "bilinmiyor"dur ve bilinmeyen sağlıklı DEĞİLDİR — ürünün "bilinmeyen ≠
   sıfır" kuralının buradaki karşılığı budur.

   Uç KİMLİK İSTEMEZ (orkestratör oturum açmaz) ve bu yüzden İÇ AYRINTI
   SIZDIRMAZ: bağlantı dizesi, dosya yolu, sürüm, yığın izi yazılmaz —
   yalnız bağımlılığın ADI ve durumu. Sebep cümlesi operatöre yeter,
   saldırgana bir şey vermez.
   ═══════════════════════════════════════════════════════════════════════ */

type Durum = 'saglikli' | 'saglıksız' | 'bilinmiyor';
type Bagimlilik = { ad: string; durum: Durum; sebep?: string };

/** Ölçer, hüküm vermez. Hata METNİ dışarı çıkmaz — sınıfı çıkar. */
async function veritabani(): Promise<Bagimlilik> {
  try {
    await db.$queryRawUnsafe('SELECT 1');
    return { ad: 'veritabani', durum: 'saglikli' };
  } catch {
    return { ad: 'veritabani', durum: 'saglıksız', sebep: `bağlantı kurulamadı (${SAGLAYICI})` };
  }
}

async function kanitDeposu(): Promise<Bagimlilik> {
  const kok = depoKoku();
  try {
    await access(kok, constants.R_OK | constants.W_OK);
    return { ad: 'kanit_deposu', durum: 'saglikli' };
  } catch (e) {
    const kod = (e as NodeJS.ErrnoException).code;
    return {
      ad: 'kanit_deposu',
      durum: 'saglıksız',
      sebep: kod === 'ENOENT' ? 'depo kökü yok' : kod === 'EACCES' ? 'depo köküne yazılamıyor' : 'depo kökü okunamadı',
    };
  }
}

function ortam(): Bagimlilik {
  const o = ortamiCoz();
  return o.ok
    ? { ad: 'ortam', durum: 'saglikli' }
    : { ad: 'ortam', durum: 'saglıksız', sebep: `geçersiz anahtar: ${o.hatalar.map((h) => h.anahtar).join(', ')}` };
}

export async function GET(istek: Request): Promise<NextResponse> {
  const kip = new URL(istek.url).searchParams.get('kip');

  /* LIVENESS: süreç ayakta. Bağımlılık ölçülmez — bilerek. */
  if (kip === 'canli') {
    return NextResponse.json({ durum: 'saglikli', kip: 'canli' }, { status: 200 });
  }

  const bagimliliklar: Bagimlilik[] = [ortam(), await veritabani(), await kanitDeposu()];
  const saglikli = bagimliliklar.every((b) => b.durum === 'saglikli');
  return NextResponse.json(
    {
      durum: saglikli ? 'saglikli' : 'saglıksız',
      kip: 'hazir',
      /* SAĞLAYICI HER YANITTA YAZILIR: `DATABASE_URL` verilmeyen bir kurulum
         geliştirme veritabanına düşer ve "sağlıklı" görünür. Operatör
         beklediği sağlayıcıyı burada okur — sessiz yanlış kurulum yok. */
      saglayici: SAGLAYICI,
      bagimliliklar,
      /* Sağlıksızken SEBEP tek cümlede de durur: günlükte tek satır arayan
         operatör alanları tek tek okumak zorunda kalmasın. */
      ...(saglikli ? {} : {
        sebep: bagimliliklar.filter((b) => b.durum !== 'saglikli')
          .map((b) => `${b.ad}: ${b.sebep ?? b.durum}`).join(' · '),
      }),
    },
    { status: saglikli ? 200 : 503, headers: { 'cache-control': 'no-store' } },
  );
}
