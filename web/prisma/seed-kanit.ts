/* Kanıt katmanı — Faz 5, O1 (uyum kontrol odası) ve O6 (denetim kanıtı).

   Uyum matrisinin "%kanıt" metriği %6 okuyordu: değerlendirilmiş 70 madde
   durumuna karşılık yalnız 5 kanıt kaydı vardı. Kanıtsız bir uyum ürünü
   denetimde hiçbir işe yaramaz; ekranın metriği de anlamsız kalıyordu.

   Kural: kanıt DURUMDAN türer, uydurulmaz.
   - uyumlu   → geçerli kanıt (tipi maddenin kanitTipi alanından gelir)
   - kismi    → kanıt var ama kapsamı dar; bir kısmı bayat
   - uyumsuz  → kanıt YOK (uyumsuzluğun tanımı zaten budur)
   - incelemede / degerlendirilmedi → kanıt yok
   Bayat kanıt (gecerliBitis geçmiş) MaddeDurumu.kanitBayat ve
   guven='bayat_kanit' ile TUTARLI yazılır — kanıt tazelik motorunun
   kabul testi bu değişmezi doğruluyor. */

import type { PrismaClient } from '../lib/prisma-client/client';

const G = 86_400_000;
const gun = (n: number) => new Date(Date.now() + n * G);

function uret(tohum: number) {
  let s = tohum >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/* Kanıt tipine göre ad kalıbı — kanıt adı ne olduğunu söylemeli. */
const AD_KALIBI: Record<string, string> = {
  politika: '%s politikası',
  kayit: '%s kaydı',
  konfigurasyon: '%s konfigürasyon dışa aktarımı',
  ekran_goruntusu: '%s ekran görüntüsü',
  rapor: '%s raporu',
  log: '%s log örneği',
  bilet: '%s değişiklik kaydı',
  onay: '%s onay yazısı',
  test_sonucu: '%s test sonucu',
  egitim_kaydi: '%s eğitim kaydı',
  sozlesme: '%s sözleşme eki',
  ag_semasi: '%s ağ şeması',
};

const KAYNAK = ['SharePoint', 'ServiceNow', 'Elle yüklendi', 'SIEM', 'CMDB'];

export async function kanitVerisi(db: PrismaClient) {
  const rnd = uret(20260902);
  const K = Object.fromEntries(
    (await db.kullanici.findMany()).map((x) => [x.eposta.split('@')[0], x]),
  );
  const sahipler = ['ahmet.terzi', 'selin.aydin', 'burak.sahin', 'mehmet.kaya', 'zeynep.arslan'];

  const durumlar = await db.maddeDurumu.findMany({
    include: {
      madde: { select: { kod: true, baslik: true, kanitTipi: true } },
      tesis: { select: { kod: true, ad: true } },
      kanitBaglantilari: { select: { id: true } },
    },
  });

  let yeni = 0;
  let bayat = 0;

  for (const d of durumlar) {
    if (d.kanitBaglantilari.length > 0) continue;           // zaten kanıtı var
    if (d.durum === 'uyumsuz' || d.durum === 'kapsamdisi') continue;
    if (d.durum === 'incelemede' || d.durum === 'degerlendirilmedi') continue;

    // Kısmi uyumun bir bölümünde kanıt yok — kapsam eksikliği de bir gerçektir.
    if (d.durum === 'kismi' && rnd() > 0.72) continue;

    const tip = d.madde.kanitTipi ?? (rnd() > 0.5 ? 'kayit' : 'konfigurasyon');
    const kalip = AD_KALIBI[tip] ?? '%s kaydı';
    const ad = kalip.replace('%s', `${d.madde.kod} · ${d.tesis.kod}`);

    /* Bayat kanıt yalnız durum kaydı da bayat işaretliyse yazılır; ikisini
       ayrı yazmak kanıt tazelik motorunun değişmezini bozuyor. */
    const bayatMi = d.kanitBayat;
    const toplanma = gun(-Math.floor(bayatMi ? 260 + rnd() * 160 : 20 + rnd() * 150));
    const bitis = bayatMi
      ? gun(-Math.floor(5 + rnd() * 60))
      : gun(Math.floor(60 + rnd() * 300));

    const kanit = await db.kanit.create({
      data: {
        ad, tip,
        gecerlilikBaslangic: toplanma,
        toplanmaTarihi: toplanma,
        gecerliBitis: bitis,
        sahipId: K[sahipler[Math.floor(rnd() * 5)]]?.id ?? null,
        yukleyenId: K[sahipler[Math.floor(rnd() * 5)]]?.id ?? null,
        kaynakSistem: KAYNAK[Math.floor(rnd() * KAYNAK.length)],
        otomatik: rnd() > 0.7,
        gizlilik: d.madde.kod.startsWith('EPDK-SYM-6') ? 'ot_hassas' : 'kurumsal',
        surum: 1 + Math.floor(rnd() * 3),
      },
    });
    await db.kanitBaglantisi.create({
      data: { kanitId: kanit.id, maddeDurumuId: d.id },
    });
    yeni++;
    if (bayatMi) bayat++;
  }

  const toplam = await db.maddeDurumu.count();
  const kanitli = await db.maddeDurumu.count({ where: { kanitBaglantilari: { some: {} } } });
  console.log(
    `Kanıt: ${yeni} yeni kayıt (${bayat} bayat) · ` +
    `${kanitli}/${toplam} madde durumunda kanıt var`,
  );
}
