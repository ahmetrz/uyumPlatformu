/* ═══════════════════════════════════════════════════════════════════════
   KURUCU HESAP — boş bir kurulumun İLK kullanıcısı [KUR-HES-001]

   ── ÖLÇÜLEN KUSUR ─────────────────────────────────────────────────────
   Kurulum provası (10 Eylül 2026, `docs/KURULUM_PROVASI.md`): `docs/
   KURULUM.md` harfiyen izlendi, kurulum sorunsuz ayağa kalktı — 174
   tablo göç etti, sağlık ucu 200 döndü, üç bağımlılık da sağlıklıydı.
   Sonra `/` açıldı ve `/giris`e döndü: e-posta ve parola isteyen bir
   form. `Kullanici` tablosunda SIFIR satır vardı ve belgede ilk
   kullanıcıyı kuran hiçbir adım yoktu.

   Yani ürün kuruluyordu ve İÇİNE GİRİLEMİYORDU. Kapılar bunu göremezdi:
   `rota:duman` kendi fikstürünü tohumlar, `kapi-compose` de öyle — ikisi
   de kuruluma bir kullanıcı KOYARAK ölçüyordu. Müşteri mühendisinin
   yolunu hiçbir kapı sürmemişti.

   ── BU ARAÇ NE YAPAR, NE YAPMAZ ───────────────────────────────────────
   Yapar: BOŞ bir kurulumda tek bir yönetici hesabı açar ve bunu denetim
   izine yazar.

   Yapmaz — ve bu bir kaçış kapısı değil, aracın var oluş koşuludur:
   · Kurulumda BİR TANE BİLE kullanıcı varsa hiçbir şey yazmaz ve sıfır
     dışı çıkar. Aksi hâlde bu araç kalıcı bir arka kapı olurdu: kapsayıcı
     kabuğuna erişen herkes, istediği an kendine yönetici üretebilirdi.
   · Parolayı ARGÜMANDAN almaz. Komut satırı `ps` çıktısında ve kabuk
     geçmişinde görünür; bir uyum ürününün kurucu parolası oraya yazılmaz.
   · Parolayı hiçbir yere YAZMAZ — ne günlüğe, ne denetim izine, ne
     ekrana. Saklanan tek şey scrypt özetidir (`lib/auth.ts` ile AYNI
     parametreler; bağı `tests/kurucu-hesap.test.ts` ölçer).

   ── NİYE `arac/` ALTINDA VE `.ts` ─────────────────────────────────────
   Kurulum imajı `arac/`, `lib/prisma-client/` ve `node_modules`u taşır;
   `lib/db.ts` ile `app/`i TAŞIMAZ. Bu yüzden araç istemcisini KENDİ
   kurar ve `app/` altından hiçbir şey içe aktarmaz. Sabitleri oradan
   kopyalamak yerine testle bağlanır: kopyalanan sayı bir gün ayrışır,
   bağlanan sayı ayrışamaz.

   Kullanım (kurulumda):
     docker compose exec -T uygulama \
       node_modules/.bin/tsx arac/kurucu-hesap.ts \
       --eposta=ad.soyad@ornek.local --ad="Ad Soyad" < parola.txt
   ═══════════════════════════════════════════════════════════════════════ */
import { randomBytes, scryptSync } from 'node:crypto';
import path from 'node:path';
import { PrismaClient } from '../lib/prisma-client/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

/** Parola alt sınırı. `app/(kabuk)/(operasyonel)/ayarlar/mantik.ts`
    içindeki `PAROLA_EN_AZ` ile AYNI olmak zorundadır — `app/` kurulum
    imajında olmadığı için içe aktarılamıyor, bu yüzden bağ TESTLE
    kuruldu (`tests/kurucu-hesap.test.ts`). Kurucu hesabın alt sınırı
    ürünün geri kalanından gevşek olamaz: en zayıf parola, en yetkili
    hesapta olurdu. */
export const KURUCU_PAROLA_EN_AZ = 12;

/** Kurucunun rolü. `lib/erisim.ts` → `ROL_IZINLERI` kataloğundan gelir;
    kapsam alanlarının hepsi `null` olduğu için yetki KÜRESELDİR. */
export const KURUCU_ROL = 'yonetici';

/** `lib/auth.ts` → `parolaOzetle` ile BİREBİR aynı sözleşme.
    Ayrışırlarsa kurucu hesap giriş yapamaz ve kusur "parola yanlış" diye
    görünür — yani en yanıltıcı hâliyle. Bağı test ölçer. */
export function ozetle(parola: string): string {
  const tuz = randomBytes(16).toString('hex');
  const ozet = scryptSync(parola, tuz, 64,
    { N: 2 ** 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 }).toString('hex');
  return `s1$${tuz}$${ozet}`;
}

export type Girdi = { eposta: string; ad: string; parola: string };
export type Kusur = { alan: string; mesaj: string };

/** Girdi doğrulaması. Ayrı ve SAF: kabuk olmadan sınanabilsin. */
export function girdiKusurlari(g: Partial<Girdi>): Kusur[] {
  const k: Kusur[] = [];
  const eposta = (g.eposta ?? '').trim();
  /* Kasıtlı olarak dar bir kontrol: RFC 5322'yi taklit eden bir düzenli
     ifade geçerli adresleri reddetmesiyle ünlüdür. Burada aranan şey
     "adres gibi mi", "adres mi" değil. */
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(eposta)) {
    k.push({ alan: 'eposta', mesaj: '--eposta geçerli bir adres olmalı' });
  }
  if (!(g.ad ?? '').trim()) k.push({ alan: 'ad', mesaj: '--ad boş olamaz' });
  const parola = g.parola ?? '';
  if (parola.length < KURUCU_PAROLA_EN_AZ) {
    k.push({ alan: 'parola', mesaj:
      `Parola en az ${KURUCU_PAROLA_EN_AZ} karakter olmalı (şu an ${parola.length})` });
  }
  if (parola.length > 256) {
    k.push({ alan: 'parola', mesaj: 'Parola 256 karakteri aşamaz' });
  }
  return k;
}

/** Bu araç yalnız BOŞ kurulumda çalışır — koşulun kendisi. */
export const BOS_KURULUM_SOZU = 'Kurulumda zaten kullanıcı var — bu araç yalnız '
  + 'BOŞ kurulumda çalışır ve hiçbir şey yazmadı. Yeni kullanıcı, giriş '
  + 'yapmış bir yöneticinin /yetkiler ekranından açılır.';

export type Sonuc =
  | { ok: true; kullaniciId: string; eposta: string }
  | { ok: false; hata: string };

/**
 * Kurucu hesabı açar.
 *
 * TÜMÜ YA DA HİÇBİRİ: kullanıcı, yetkisi ve denetim izi TEK transaction
 * içinde yazılır. Yetkisi yazılmamış bir kurucu hesap giriş yapar ve
 * hiçbir şey göremez; izi yazılmamış bir kurucu hesap ise denetim
 * izinin ilk satırını kaybeder — ürünün en temel vaadi orada başlar.
 *
 * BOŞLUK KONTROLÜ TRANSACTION'IN İÇİNDEDİR. Dışarıda okuyup içeride
 * yazmak TOCTOU açardı: iki operatör aynı anda koşarsa ikisi de "boş"
 * görür ve kurulum iki yöneticiyle açılır.
 */
export async function kurucuHesapAc(db: PrismaClient, g: Girdi): Promise<Sonuc> {
  const kusur = girdiKusurlari(g);
  if (kusur.length > 0) return { ok: false, hata: kusur.map((x) => x.mesaj).join(' · ') };
  const eposta = g.eposta.trim().toLowerCase();
  const parolaHash = ozetle(g.parola);
  try {
    return await db.$transaction(async (tx) => {
      const varOlan = await tx.kullanici.count();
      if (varOlan > 0) return { ok: false as const, hata: BOS_KURULUM_SOZU };
      const k = await tx.kullanici.create({
        data: { eposta, adSoyad: g.ad.trim(), aktif: true, parolaHash },
        select: { id: true },
      });
      await tx.yetki.create({
        data: {
          kullaniciId: k.id, rol: KURUCU_ROL,
          modul: null, surecId: null, kapsamOgesiId: null,
          tuzelKisiId: null, regulasyonId: null,
        },
      });
      /* `aktorId` NULL ve bu bilerek: hesabı açan kişi henüz platformun
         bir kullanıcısı değildir, veritabanına erişimi olan operatördür.
         Onu yeni hesabın kendisiymiş gibi yazmak, izin ilk satırını
         yalan yapardı. Parola, uzunluğu ya da özeti İZE GİRMEZ. */
      await tx.aktiviteKaydi.create({
        data: {
          aktorId: null, varlikTipi: 'Kullanici', varlikId: k.id,
          eylem: 'olusturma', alan: 'kurucu_hesap',
          oncekiDeger: 'kurulumda kullanıcı yok', yeniDeger: eposta,
          kaynak: 'kurulum',
          gerekce: 'Boş kurulumun kurucu hesabı (arac/kurucu-hesap.ts); '
            + `rol ${KURUCU_ROL}, kapsam küresel.`,
        },
      });
      return { ok: true as const, kullaniciId: k.id, eposta };
    });
  } catch (e) {
    return { ok: false, hata: e instanceof Error ? e.message : String(e) };
  }
}

/** Kurulumun kendi istemcisi. `lib/db.ts` imajda yok; sürücü seçimi
    orayla AYNI kuralla yapılır ve bağı test ölçer. */
export function istemciKur(url: string | undefined): PrismaClient {
  if (url && /^postgres(ql)?:\/\//i.test(url)) {
    return new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  }
  const dosya = url ? url.replace(/^file:/i, '').split('?')[0]
    : path.join(process.cwd(), 'prisma', 'dev.db');
  const mutlak = path.isAbsolute(dosya) ? dosya
    : path.join(process.cwd(), 'prisma', dosya.replace(/^\.\//, ''));
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: `file:${mutlak}` }) });
}

/** Parolayı stdin'den okur. ARGÜMANDAN OKUNMAZ: komut satırı `ps`
    çıktısında ve kabuk geçmişinde görünür. */
async function parolaOku(): Promise<string> {
  const parcalar: Buffer[] = [];
  for await (const p of process.stdin) parcalar.push(Buffer.from(p));
  /* Yalnız SONDAKİ satır sonu atılır: parolanın kendi boşluğu kırpılmaz,
     çünkü kırpmak kullanıcının yazdığından BAŞKA bir parola saklardı. */
  return Buffer.concat(parcalar).toString('utf8').replace(/\r?\n$/, '');
}

/* ── ÜST DÜZEY `await` YOK ─────────────────────────────────────────────
   Ölçüldü (`tests/kurucu-hesap.test.ts`): araç `tsx` ile koşturulduğunda
   `ERR_REQUIRE_ASYNC_MODULE` ile HİÇ AÇILMIYORDU — `tsx` bu depoda `.ts`i
   CJS'e çeviriyor ve orada üst düzey `await` yok. Kusur yalnız SÜRECİ
   ÇAĞIRAN vaka ile görünür: kütüphane yolunu süren testler yeşildi.
   Bu yüzden gövde bir async IIFE içindedir. */
if (process.argv[1] && /kurucu-hesap\.ts$/.test(process.argv[1])) void (async () => {
  const arg = (ad: string) => {
    const e = process.argv.find((a) => a.startsWith(`--${ad}=`));
    return e ? e.slice(ad.length + 3) : '';
  };
  const eposta = arg('eposta');
  const ad = arg('ad');
  if (process.argv.some((a) => a.startsWith('--parola'))) {
    console.error('Parola argümandan alınmaz — `ps` çıktısında ve kabuk '
      + 'geçmişinde görünür. Parolayı stdin ile verin:\n'
      + '  … arac/kurucu-hesap.ts --eposta=… --ad="…" < parola.txt');
    process.exit(2);
  }
  const parola = await parolaOku();
  const db = istemciKur(process.env.DATABASE_URL);
  const sonuc = await kurucuHesapAc(db, { eposta, ad, parola });
  await db.$disconnect();
  if (!sonuc.ok) { console.error(sonuc.hata); process.exit(1); }
  console.log(`kurucu hesap açıldı: ${sonuc.eposta} · rol ${KURUCU_ROL} · `
    + `id ${sonuc.kullaniciId}`);
  console.log('Parola hiçbir yere yazılmadı; yalnız scrypt özeti saklandı.');
})();
