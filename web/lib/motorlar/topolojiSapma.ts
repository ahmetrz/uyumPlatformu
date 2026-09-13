import 'server-only';
import { db } from '../db';
import { anligiKarsilastir, temelVarMi as temelKaydiVarMi } from '../entegrasyon/topoloji';

/* Topoloji sapma motoru (P2-2).

   Ne yapar: henüz karşılaştırılmamış topoloji anlıklarını yürürlükteki
   ONAYLI temelle karşılaştırır ve farkları `TopolojiSapmasi` satırı olarak
   yazar. Kritik farklar risk/bulgu ADAYI olur — kaydı motor AÇMAZ.

   Ne YAPMAZ:
     · ağ/geçit/varlık kaydı değiştirmez (tek bir update bile yok),
     · kendi kendine temel kurmaz — temel yoksa hesaplamaz, "temel yok" der,
     · gözlem kaynağı yokken hata üretmez; sıfır işleyip TEMİZ kapanır ama
       bunu koşu kaydında açıkça söyler (durum: 'kaynak_yok').

   Sessiz hata yok: her koşu bir `EntegrasyonKosusu` satırı bırakır ve
   sarmalayıcı `isKos` ayrıca `IsKosusu` satırı yazar. */

const KAYNAK = 'topoloji_sapma';

/** Topoloji gözlemi üretebilecek connector tipleri (sözleşmedeki tip alanı). */
export const TOPOLOJI_CONNECTOR_TIPLERI = ['ot_discovery', 'network_firewall'] as const;

/** Bir koşuda en fazla bu kadar anlık işlenir — uzun koşu kilit tutmasın. */
const KOSU_BASINA_ANLIK = 50;

export async function topolojiSapmasiniIsle(): Promise<{ islenen: number; uretilen: number }> {
  const basla = Date.now();

  // Delta imleci: en son işlenen anlığın `alindi` damgası. `imlecSonra`
  // alanı tam bunun için var — koşu geçmişi imleci taşır.
  const sonImlecKosusu = await db.entegrasyonKosusu.findFirst({
    where: { kaynak: KAYNAK, imlecSonra: { not: null } },
    orderBy: { baslangic: 'desc' },
    select: { imlecSonra: true },
  });
  const imlecOnce = sonImlecKosusu?.imlecSonra ?? null;
  const imlecTarihi = imlecOnce ? new Date(imlecOnce) : null;

  const kosu = await db.entegrasyonKosusu.create({
    data: {
      kaynak: KAYNAK,
      durum: 'calisiyor',
      tetikleyen: 'zamanlanmis',
      guvenEtiketi: 'otomatik',
      imlecOnce,
    },
  });

  try {
    // Zaten sapması yazılmış anlık tekrar işlenmez; imleç ayrıca sapması
    // olmayan (fark üretmemiş) anlıkları da geride bırakır.
    const anliklar = await db.topolojiAnlik.findMany({
      where: {
        temelMi: false,
        sapmalar: { none: {} },
        ...(imlecTarihi && !Number.isNaN(imlecTarihi.getTime())
          ? { alindi: { gt: imlecTarihi } }
          : {}),
      },
      orderBy: { alindi: 'asc' },
      take: KOSU_BASINA_ANLIK,
      select: { id: true, tesisId: true, alindi: true },
    });

    if (anliklar.length === 0) {
      // İşlenecek anlık yok. Bunun iki ayrı sebebi olabilir ve ikisi AYNI
      // ŞEY DEĞİLDİR: (a) hiç gözlem kaynağı bağlı değil, (b) kaynak var
      // ama yeni anlık gelmemiş. Koşu kaydı hangisi olduğunu söyler.
      const kaynakSayisi = await db.connector.count({
        where: {
          silindi: null,
          etkin: true,
          tip: { in: [...TOPOLOJI_CONNECTOR_TIPLERI] },
        },
      });
      await db.entegrasyonKosusu.update({
        where: { id: kosu.id },
        data: {
          durum: kaynakSayisi === 0 ? 'kaynak_yok' : 'basarili',
          bitis: new Date(),
          sureMs: Date.now() - basla,
          imlecSonra: imlecOnce,
          // Hata DEĞİL: "kaynak yok" bir başarısızlık değil, bir durumdur.
          // `hata` alanı bilerek boş bırakılır.
        },
      });
      return { islenen: 0, uretilen: 0 };
    }

    // Temel tesis bazlıdır; bir tesisin temeli yoksa o tesisin anlıkları
    // HESAPLANMADAN atlanır (kural 2: temelsizken sapma hesaplanmaz).
    const temelVarMi = new Map<string, boolean>();
    const temelKontrol = async (tesisId: string | null) => {
      const anahtar = tesisId ?? '__global__';
      /* `temelAnlik()` DEĞİL: o çağrı temelin bütün gözlemlerini belleğe
         çeker ve burada sorulan tek şey "var mı?"dır. Gerçek bir OT ağında
         tesis başına binlerce gözlem demek olurdu. */
      if (!temelVarMi.has(anahtar)) temelVarMi.set(anahtar, await temelKaydiVarMi(tesisId));
      return temelVarMi.get(anahtar)!;
    };

    let islenen = 0;
    let uretilen = 0;
    let temelsiz = 0;
    let sonAlindi: Date | null = null;

    for (const a of anliklar) {
      if (!(await temelKontrol(a.tesisId))) {
        // İmleci İLERLETMEZ: temel onaylandığında bu anlık yeniden ele alınır.
        temelsiz++;
        continue;
      }
      const sonuc = await anligiKarsilastir(a.id);
      islenen++;
      uretilen += sonuc.yazilan;
      sonAlindi = a.alindi;
    }

    const durum = islenen > 0 ? 'basarili' : temelsiz > 0 ? 'temel_yok' : 'basarili';
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum,
        bitis: new Date(),
        sureMs: Date.now() - basla,
        kayitSayisi: uretilen,
        alinan: anliklar.length,
        kabulEdilen: islenen,
        // "reddedilen" burada veri reddi değil, temeli olmadığı için
        // hesaplanamayan anlık sayısıdır; koşu kaydında görünür kalsın.
        reddedilen: temelsiz,
        imlecSonra: sonAlindi ? sonAlindi.toISOString() : imlecOnce,
      },
    });

    return { islenen, uretilen };
  } catch (e) {
    // Sessiz hata yasak: koşu kaydı hatayı taşır, sonra yukarı fırlatılır ki
    // isKos da IsKosusu satırını 'basarisiz' yazsın.
    await db.entegrasyonKosusu.update({
      where: { id: kosu.id },
      data: {
        durum: 'basarisiz',
        bitis: new Date(),
        sureMs: Date.now() - basla,
        hata: e instanceof Error ? e.message : String(e),
      },
    });
    throw e;
  }
}

/** Sağlık ekranı için: bu motorun son koşusu ne dedi? */
export async function sonTopolojiKosusu() {
  return db.entegrasyonKosusu.findFirst({
    where: { kaynak: KAYNAK },
    orderBy: { baslangic: 'desc' },
  });
}
