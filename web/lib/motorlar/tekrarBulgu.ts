import 'server-only';
import { db } from '../db';
import { TEKRAR_PENCERESI_GUN, tekrarKarari } from '../uyum/tekrarBulgu';

/* ═══ UY-28 · Tekrar bulgu motoru ══════════════════════════════════════

   `Bulgu.tekrarBulguId` ölü bir alandı: şemada vardı, ilişkileri
   tanımlıydı, ürün kodunda YAZAN yoktu. Bu motor onu yazar.

   ── MOTOR BAĞ KURAR, BULGU AÇMAZ ──────────────────────────────────────
   Motorun işi mevcut bulguları birbirine bağlamaktır; yeni bulgu
   açmaz, durum değiştirmez, kimseye bildirim yazmaz. Bir tekrarın
   sonucu (eskalasyon, kök neden zorunluluğu) BAŞKA katmanların işidir
   ve onlar bu bağı okur.

   ── ELLE KURULMUŞ BAĞA DOKUNULMAZ ─────────────────────────────────────
   `tekrarBulguId` dolu olan bir bulgu atlanır. İnsanın kurduğu bir bağı
   motorun ezmesi, kullanıcının kararını sessizce geri almak olurdu.

   ── KARAR BURADA DEĞİL ────────────────────────────────────────────────
   Hangi bulgunun tekrar olduğuna `lib/uyum/tekrarBulgu.ts` karar verir
   ve ekranın "tekrar adayı" önerisi de AYNI fonksiyonu çağırır. İki
   ayrı hesap, ekranda önerilen bağ ile motorun kurduğu bağın
   ayrışmasını üretirdi. */

export type TekrarKosusu = {
  islenen: number;
  /** Motor kayıt defterinin ortak sözleşmesi: kurulan bağ sayısı. */
  uretilen: number;
  baglanan: number;
  /* Zaten bağı olan ya da aday bulunamayan bulgular — kusur değil,
     motorun baktığı ve geçtiği kayıtlar. */
  atlanan: number;
};

export async function tekrarlariIsle(o?: { pencereGun?: number }): Promise<TekrarKosusu> {
  const pencere = o?.pencereGun ?? TEKRAR_PENCERESI_GUN;

  /* Yalnız bağı OLMAYAN bulgular aday: elle kurulmuş bağ korunur. */
  const adaylar = await db.bulgu.findMany({
    where: { silindi: null, tekrarBulguId: null },
    select: {
      id: true, maddeDurumuId: true, durum: true, onemDerecesi: true,
      tespitTarihi: true, kapanmaTarihi: true, tekrarBulguId: true,
    },
  });
  if (adaylar.length === 0) return { islenen: 0, uretilen: 0, baglanan: 0, atlanan: 0 };

  /* Aynı kontrolün bütün bulguları tek sorguda okunur; aday başına
     ayrı sorgu, kontrol sayısıyla orantılı bir sorgu patlaması olurdu. */
  const kontroller = [...new Set(adaylar.map((a) => a.maddeDurumuId))];
  const tumu = await db.bulgu.findMany({
    where: { maddeDurumuId: { in: kontroller }, silindi: null },
    select: {
      id: true, maddeDurumuId: true, durum: true, onemDerecesi: true,
      tespitTarihi: true, kapanmaTarihi: true, tekrarBulguId: true,
    },
  });
  const kontrolBazli = new Map<string, typeof tumu>();
  for (const b of tumu) {
    kontrolBazli.set(b.maddeDurumuId, [...(kontrolBazli.get(b.maddeDurumuId) ?? []), b]);
  }

  const cevir = (b: (typeof tumu)[number]) => ({
    id: b.id, maddeDurumuId: b.maddeDurumuId, durum: b.durum,
    onemDerecesi: b.onemDerecesi, tespit: b.tespitTarihi.getTime(),
    kapanma: b.kapanmaTarihi?.getTime() ?? null, tekrarBulguId: b.tekrarBulguId,
  });

  let baglanan = 0, atlanan = 0;
  for (const aday of adaylar) {
    const karar = tekrarKarari({
      yeni: cevir(aday),
      gecmis: (kontrolBazli.get(aday.maddeDurumuId) ?? []).map(cevir),
      pencereGun: pencere,
    });
    if (!karar.tekrar) { atlanan++; continue; }

    await db.bulgu.update({
      where: { id: aday.id },
      data: {
        tekrarBulguId: karar.oncekiId,
        tekrarKaynagi: 'motor',
        /* Pencere kayda yazılır: eşik sonradan değişirse, bu bağın
           hangi eşikle kurulduğu kaybolmasın. */
        tekrarPenceresiGun: pencere,
      },
    });
    /* Aktör YOK ve uydurulmaz: bağı bir insan kurmadı, motor kurdu.
       `kaynak: 'is_kosusu'` bunu söyler. */
    await db.aktiviteKaydi.create({
      data: {
        aktorId: null, varlikTipi: 'Bulgu', varlikId: aday.id,
        eylem: 'guncelleme', alan: 'tekrarBulguId',
        oncekiDeger: null, yeniDeger: karar.oncekiId,
        gerekce: `${karar.sebep} (pencere: ${pencere} gün)`,
        kaynak: 'is_kosusu',
      },
    });
    baglanan++;
  }
  return { islenen: adaylar.length, uretilen: baglanan, baglanan, atlanan };
}
