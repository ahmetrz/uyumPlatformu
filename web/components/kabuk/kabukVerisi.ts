import 'server-only';
import { ayar } from '@/lib/yapilandirma/oku';
import { db } from '@/lib/db';
import { aktifKullanici } from '@/lib/auth';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { birlesikKapsam } from '@/app/kapsam';
import { durumAyagiVerisi } from '@/components/kabuk/durumAyagiVerisi';
import { DEMO } from '@/lib/demo';
import paket from '../../package.json';
import type { KabukVerisi } from './Kabuk';

/* Kabuğun SUNUCU verisi — proje kalıbı: `page.tsx → veri.ts`.

   İş mantığına dokunulmaz. Yetki kapısı ve silinen kayıt yüklemi zaten
   `durumAyagiVerisi`de yaşıyor ve buradan olduğu gibi çağrılır: dış
   denetçi her sayfanın altında grup geneli connector durumunu görmemeli
   (PR #1 incelemesi, P2). Yeni kabuk o düzeltmeyi DEVRALIR, yeniden
   yazmaz.

   Veri kesiti damgası UYDURULMAZ: gerçek bir koşu yoksa `null` döner ve
   kabuk "—" yazar. Prototipte damga hep doluydu (harita §7 kusur 8). */

export async function kabukVerisi(): Promise<KabukVerisi> {
  const k = await aktifKullanici().catch(() => null);

  /* ── KAPSAM ÇUBUĞU DA BİR EKRANDIR ────────────────────────────────
     Sayılar kapsamsız okunuyordu: bir santrale kısıtlı kullanıcı her
     sayfanın tepesinde "16 santral" görüyordu. Bu, göremediği on üç
     santralin VARLIĞINI doğrulamak demek — /portfoy ve /tesisler için
     kapatılan sızıntının aynısı, yalnız kabukta.

     Kapsam BİRLEŞİK alınır (uyum ∪ envanter ∪ risk ∪ denetim): çubuk
     "bu üründe hangi sahaya girebiliyorum" sorusunu yanıtlar, tek bir
     modülün penceresini değil. Oturum yoksa kapsam BOŞ kümedir; `null`
     "sınırsız" demek olurdu ve tam tersi doğru. */
  const kapsam = k
    ? birlesikKapsam(
      izinliTesisIdleri(k, 'uyum'),
      izinliTesisIdleri(k, 'envanter'),
      izinliTesisIdleri(k, 'risk'),
      izinliTesisIdleri(k, 'denetim'),
    )
    : [];

  const [ayak, grup, tesisler, okunmamis] = await Promise.all([
    durumAyagiVerisi(k).catch(() => null),
    db.grup.findFirst({ select: { ad: true } }).catch(() => null),
    db.tesis.findMany({
      where: { durum: 'aktif', ...(kapsam === null ? {} : { id: { in: kapsam } }) },
      select: { tuzelKisiId: true },
    }).catch(() => []),
    /* ── OKUNMAMIŞ BİLDİRİM SAYACI (D30) ─────────────────────────────
       Kutu sahipliği sınırı burada da aynen geçerlidir: sayı YALNIZ
       aktif kullanıcının kendi bildirimlerinden türer (`kullaniciId`),
       başkasının kutusu hiç sayılmaz. `okundu: null` = okunmadı;
       bildirimler/mantik.ts `okunmamisMi` ile aynı yüklem. Oturum yoksa
       sorgu bile yapılmaz: 0, "kutu boş" değil "kutu yok" demektir ve
       kabuk 0'da rozet çizmediği için ikisi aynı görünür — bilerek. */
    k ? db.bildirim.count({ where: { kullaniciId: k.id, okundu: null } }).catch(() => 0)
      : Promise.resolve(0),
  ]);
  const santral = tesisler.length;
  /* Tüzel kişi de aynı kapsamdan türer: kapsamdaki santrallerin bağlı
     olduğu AYRI tüzel kişi sayısı. Kapsamsız `tuzelKisi.count()` aynı
     sızıntının başka biçimiydi. */
  const tuzelKisi = new Set(
    tesisler.map((t) => t.tuzelKisiId).filter((x): x is string => x !== null),
  ).size;

  return {
    /* `yonetim`: hesap menüsünde "Yönetim tezgâhı" bağı çizilsin mi.
       Yüklem /yonetim-tezgahi sayfasının kendi kapısıyla AYNIDIR (tanımlar
       ∨ uyum ∨ yönetim okuma); yetkisi olmayana gidip "Yetkisiz" görecek
       bağ gösterilmez. Kapı sayfada durur, burası yalnız sunum. */
    kullanici: k ? {
      ad: k.adSoyad, unvan: k.unvan, demo: k.id === 'demo',
      yonetim: izinVar(k, 'tanimlar', 'okuma') || izinVar(k, 'uyum', 'okuma') || izinVar(k, 'yonetim', 'okuma'),
    } : null,
    kapsam: grup ? { grup: grup.ad, tuzelKisi, santral } : null,
    ayak: ayak && {
      toplam: ayak.toplam,
      sayimlar: ayak.sayimlar,
      sonKosu: ayak.sonKosu ? ayak.sonKosu.toISOString() : null,
    },
    /* Veri kesiti = en son BAŞARILI connector koşusu. Yoksa null; sistem
       saatini damga diye göstermek "veri taze" demek olurdu — oysa hiçbir
       kaynak bağlı değilken hiçbir şey tazelenmemiştir. Yetkisiz
       kullanıcıda da null: damga da bir sağlık bilgisidir. */
    kesit: ayak?.sonKosu ? ayak.sonKosu.toISOString() : null,
    okunmamis,
    /* Ayak künyesi: sürüm package.json'dan OKUNUR (elle yazılmış sürüm
       ilk yayında yalan söylerdi); ortam demo bayrağı + NODE_ENV'den. */
    surum: paket.version,
    kunye: await ayar<string>('kabuk.kunye').catch(() => 'Zorlu Enerji Yönetişim Platformu'),
    ortam: DEMO ? 'demo' : process.env.NODE_ENV === 'production' ? 'uretim' : 'gelistirme',
  };
}
