import 'server-only';
import { connection } from 'next/server';
import { ayar } from '@/lib/yapilandirma/oku';
import { db } from '@/lib/db';
import { aktifKullanici } from '@/lib/auth';
import { izinVar, izinliTesisIdleri } from '@/lib/erisim';
import { birlesikKapsam } from '@/app/kapsam';
import { durumAyagiVerisi } from '@/components/kabuk/durumAyagiVerisi';
import { DEMO } from '@/lib/demo';
import { TEST_KOSUMU } from '@/lib/veritabani';
import { MARKA_AD } from '@/lib/marka';
import { kapsamAnahtari, kapsamSektorleri, kapsamSozlugu } from '@/lib/dil/sozlukOku';
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
  /* KABUK VERİSİ İSTEK ANINDA OKUNUR — derleme anında DEĞİL (P7).

     `connection()` bu noktayı isteğe bağlar: Next rotayı ön-render
     etmekten vazgeçer. İki kusuru birden kapatır:

     1. DERLEYEN MAKİNEDE veritabanı sorgulanır. Kurulum imajı derlenirken
        veritabanı YOKTUR ve olmamalıdır; ölçüldü — imaj derlemesi
        `PrismaClientInitializationError` ile düştü (üretilmiş istemci
        `postgres`, derlemede bağlantı yok, sürücü SQLite seçiliyor).
     2. Ön-render edilen kabuk, DERLEME ANINDAKİ kurulumun kiracı adını,
        sektör listesini ve menüsünü statik HTML'e gömer. Aynı imajı kuran
        ikinci müşteri birincinin kabuğunu görürdü — çok kiracılı bir
        üründe sessiz ve ağır bir kusur.

     STATİK DEMO'da çağrılmaz: `output: 'export'` sunucusuzdur ve her şey
     ön-render edilmek ZORUNDADIR; demo zaten depodaki kurgusal veriyi
     yayımlamak için vardır. `DEMO` derleme anında sabittir.

     TEST KOŞUMUNDA da çağrılmaz — ve bu bir kaçamak değil, tanım gereği:
     `connection()` ÖN-RENDER'DAN VAZGEÇME çağrısıdır ve ön-render yalnız
     Next'in render bağlamında vardır. Birim testi bu işlevi doğrudan
     çağırır; orada vazgeçilecek bir ön-render yoktur ve Next `connection
     was called outside a request scope` diye HATA verir. Hatayı yutmak
     (`catch`) yanlış olurdu: o zaman gerçek bir bağlam kusuru da
     sessizce yutulurdu. */
  if (!DEMO && !TEST_KOSUMU) await connection();

  const k = await aktifKullanici().catch(() => null);

  /* ── KAPSAM ÇUBUĞU DA BİR EKRANDIR ────────────────────────────────
     Sayılar kapsamsız okunuyordu: tek tesise kısıtlı kullanıcı her
     sayfanın tepesinde "16 tesis" görüyordu. Bu, göremediği on üç
     tesisin VARLIĞINI doğrulamak demek — /portfoy ve /tesisler için
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

  /* Kabuk PAYLAŞILAN katman: sözlük tek bir kaydın değil, KAPSAMIN
     dilinden gelir. Kapsamda birden çok sektör varsa `null` iner ve
     çekirdek sözcük yazılır — birini seçmek öbür yarısı için yalan
     olurdu (`lib/dil/sozlukOku.ts`). */
  const [ayak, grup, tesisler, okunmamis, sozluk, sektorler] = await Promise.all([
    durumAyagiVerisi(k).catch(() => null),
    db.grup.findFirst({ select: { ad: true } }).catch(() => null),
    db.tesis.findMany({
      where: { durum: 'aktif', ...(kapsam === null ? {} : { id: { in: kapsam } }) },
      /* `id` ve sektör de iniyor: sektör merceği kayıt listelerini
         (risk, bulgu, denetim) tesis üstünden süzüyor ve bu eşlemeyi
         her ekranın ayrı ayrı sorgulaması aynı veriyi beş kez okumak
         olurdu. */
      select: { id: true, tuzelKisiId: true, tip: { select: { sektorId: true } } },
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
    kapsamSozlugu(kapsamAnahtari(kapsam)).catch(() => null),
    /* Kapsamda geçen sektörler — merceğin seçenekleri. Sunucunun
       `sozluk` kararını EZMEZ, yanına konur: mercek seçilmemişken
       davranış aynen eskisi gibidir. */
    kapsamSektorleri(kapsamAnahtari(kapsam)).catch(() => []),
  ]);
  const tesisSayisi = tesisler.length;
  /* Tüzel kişi de aynı kapsamdan türer: kapsamdaki tesislerin bağlı
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
    kapsam: grup ? { grup: grup.ad, tuzelKisi, tesis: tesisSayisi } : null,
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
    sozluk,
    sektorler,
    /* Tesis → sektör eşlemesi. Sektörü BİLİNMEYEN tesis haritaya
       girmez; `undefined` "bilinmiyor" demektir ve süzgeç onu bir
       kovaya atmaz. */
    tesisSektoru: Object.fromEntries(
      tesisler.flatMap((t) => (t.tip?.sektorId ? [[t.id, t.tip.sektorId]] : [])),
    ) as Record<string, string>,
    surum: paket.version,
    kunye: await ayar<string>('kabuk.kunye').catch(() => MARKA_AD),
    ortam: DEMO ? 'demo' : process.env.NODE_ENV === 'production' ? 'uretim' : 'gelistirme',
  };
}
