import 'server-only';
import { cookies } from 'next/headers';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';
import { DEMO } from '@/lib/demo';
import type { AktifKullanici } from '@/lib/auth';
import { izinVar } from '@/lib/erisim';
import type { Hesap } from '../yetkiler/mantik';

/* D31 · Ayarlar — SUNUCU verisi (proje kalıbı: page.tsx → veri.ts).

   Bu ekran yalnız AKTİF KULLANICININ KENDİ kaydını okur; kimlik `k.id`
   ile sabitlenir, hiçbir sorgu başka bir kullanıcıyı görmez. Santral
   kapsamı yoktur: hesap bir santral kaydı değil kurum kaydıdır.

   PAROLA ÖZETİ EKRANA İNMEZ: yalnız "tanımlı mı" (boolean) gider.
   OTURUM JETONU EKRANA İNMEZ: "bu oturum" çerezin SHA-256 özetiyle DB'de
   bulunur, ekrana yalnız zaman damgaları gider. */

export type AyarlarVerisi = {
  profil: {
    adSoyad: string;
    eposta: string;
    unvan: string | null;
    /** hesabın açılış tarihi (ISO); kayıt bulunamazsa null */
    olusturuldu: string | null;
    /** parola özeti var mı — YALNIZ boolean */
    parolaVar: boolean;
    /** kullanıcı satırı okunabildi mi (demo/yetim oturumda false) */
    kayitVar: boolean;
  };
  oturum: {
    /** çerezdeki oturumun kendisi; bulunamazsa null (bilinmiyor) */
    buOturum: { baslangic: string; sonEtkinlik: string; mutlakBitis: string } | null;
    /** bu kullanıcının DB'deki açık oturum satırı sayısı (bu tarayıcı dâhil) */
    aktifSayi: number;
    /** denetim izindeki son başarılı giriş (ISO); yoksa null */
    sonGiris: string | null;
    /** son 24 saatte bu hesaba yapılan reddedilen giriş denemesi — COUNT */
    reddedilen24: number;
  };
  /** yetki özeti — /yetkiler ekranıyla aynı satır tipi, salt okunur */
  hesap: Hesap;
  /** /yetkiler ekranını açabilir mi (yonetim/okuma) — bağ ona göre kurulur */
  yonetimOkuyabilir: boolean;
};

/* Çerez adı ve özet algoritması `lib/auth.ts` içinde dışa açılmamış
   sabittir; `lib/eylemler2/hesap.ts` ile aynı sözleşme burada da tekrar
   edilir. auth.ts değişirse üçü birlikte değişmeli — tests/hesap.test.ts
   "bu oturum bulunur" iddiası bunu yakalar. */
const CEREZ_ADI = 'oturum';
async function mevcutOturumOzeti(): Promise<string | null> {
  /* DEMO statik dışa aktarımda `cookies()` dinamik API hatası verir;
     lib/auth.ts ile aynı sıra: önce DEMO dalı, sonra çerez. */
  if (DEMO) return null;
  const token = (await cookies()).get(CEREZ_ADI)?.value;
  return token ? createHash('sha256').update(token).digest('hex') : null;
}

const GUN_MS = 24 * 3_600_000;

export async function ayarlarVerisi(k: AktifKullanici, simdi: number): Promise<AyarlarVerisi> {
  const ozet = await mevcutOturumOzeti();
  const [
    kayit, yetkiler, buOturum, aktifSayi, sonGiris, reddedilen24,
    sahipVarlik, emanetVarlik,
  ] = await Promise.all([
    db.kullanici.findUnique({
      where: { id: k.id },
      // parolaHash SEÇİLİR ama ekrana yalnız `!== null` sonucu gider.
      select: { adSoyad: true, eposta: true, unvan: true, olusturuldu: true, parolaHash: true },
    }),
    db.yetki.findMany({
      where: { kullaniciId: k.id },
      include: { surec: { include: { regulasyon: true } }, tesis: true },
      orderBy: { rol: 'asc' },
    }),
    ozet
      ? db.oturum.findUnique({
        where: { tokenHash: ozet },
        select: { kullaniciId: true, olusturuldu: true, sonKullanim: true, bitis: true },
      })
      : Promise.resolve(null),
    // Süresi dolmuş satır da sayılır mı? Hayır: `aktifKullanici` düşen oturumu
    // siler; kalanlar mutlak süresi dolmamış satırlardır. Yine de `bitis`
    // ile daraltılır — temizlenmemiş bir satır "açık oturum" sayılmasın.
    db.oturum.count({ where: { kullaniciId: k.id, bitis: { gt: new Date(simdi) } } }),
    db.aktiviteKaydi.findFirst({
      where: { varlikTipi: 'Oturum', varlikId: k.id, eylem: 'olusturma', alan: 'giris' },
      orderBy: { zaman: 'desc' },
      select: { zaman: true },
    }),
    db.aktiviteKaydi.count({
      where: {
        varlikTipi: 'Oturum', varlikId: k.id, eylem: 'red', alan: 'giris',
        zaman: { gte: new Date(simdi - GUN_MS) },
      },
    }),
    /* OT-09 · kişinin kendi üstündeki varlık yükü. Sayı GERÇEKTEN
       ölçülür; sıfır varsayılmaz — "bilinmeyen ≠ sıfır". */
    db.varlik.count({ where: { silindi: null, sahipId: k.id } }),
    db.varlik.count({ where: { silindi: null, emanetciId: k.id } }),
  ]);

  /* Çerezdeki oturum başka bir kullanıcıya aitse (olmamalı; `aktifKullanici`
     aynı çerezden çözüldü) "bu oturum" bilinmiyor sayılır — başkasının
     damgası gösterilmez. */
  const sahipli = buOturum && buOturum.kullaniciId === k.id ? buOturum : null;

  const hesap: Hesap = {
    id: k.id,
    ad: kayit?.adSoyad ?? k.adSoyad,
    eposta: kayit?.eposta ?? k.eposta,
    unvan: kayit?.unvan ?? k.unvan,
    aktif: true,
    parolaVar: kayit?.parolaHash !== null && kayit?.parolaHash !== undefined,
    /* `devredilebilir` boş: bu ekranda devir YÜZEYİ yok. Kişi kendi
       sahipliğini kendi devredemez — devir `envanter/onay` yetkisiyle
       /yetkiler ekranından yapılır. Boş liste "devredilecek varlık yok"
       demez, "bu ekrandan devredilemez" demektir. */
    sahiplik: { toplam: sahipVarlik, emanet: emanetVarlik, devredilebilir: [] },
    yetkiler: yetkiler.map((y) => ({
      id: y.id,
      rol: y.rol,
      surec: y.surec
        ? { id: y.surec.id, kod: y.surec.kod, regKod: y.surec.regulasyon.kod }
        : null,
      tesis: y.tesis ? { id: y.tesis.id, kod: y.tesis.kod, ad: y.tesis.ad } : null,
    })),
  };

  return {
    profil: {
      adSoyad: hesap.ad,
      eposta: hesap.eposta,
      unvan: hesap.unvan,
      olusturuldu: kayit?.olusturuldu.toISOString() ?? null,
      parolaVar: hesap.parolaVar,
      kayitVar: kayit !== null,
    },
    oturum: {
      buOturum: sahipli
        ? {
          baslangic: sahipli.olusturuldu.toISOString(),
          sonEtkinlik: sahipli.sonKullanim.toISOString(),
          mutlakBitis: sahipli.bitis.toISOString(),
        }
        : null,
      aktifSayi,
      sonGiris: sonGiris?.zaman.toISOString() ?? null,
      reddedilen24,
    },
    hesap,
    yonetimOkuyabilir: izinVar(k, 'yonetim', 'okuma'),
  };
}
