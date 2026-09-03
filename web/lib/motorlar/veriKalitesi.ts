import 'server-only';
import { db } from '../db';
import { ayarlar } from '../yapilandirma/oku';

/* Veri kalitesi motoru (§67): governance verisinin kendisi denetlenir.

   ── A. Yönetişim verisi kuralları ─────────────────────────────────────
   - sahipsiz_varlik       → kritik varlık ama sahibi yok
   - kritikligi_bilinmeyen → varlığın kritikliği değerlendirilmemiş
   - eksik_profil          → aktif tesisin profili yok (uygulanabilirlik kör)
   - envanteri_bos_tesis   → aktif tesisin envanterinde hiç varlık yok
   - sahipsiz_kanit        → kanıtın sahibi de yükleyeni de yok (tazelik sorumsuz)

   ── B. AKTARILAN veri kuralları ───────────────────────────────────────
   - kokensiz_dogrulama       → köken 'dogrulandi' ama koşu bağlamı yok
   - bayat_koken              → otomatik kaynak beslemeyi kesmiş
   - cakisan_kaynak_kaydi     → tek kaynak kaydı İKİ ayrı varlığa yazılmış
   - kapsamsiz_kesif          → keşif kaydının santrali çözülememiş
   - bekleyen_kesif_yigilmasi → insan inceleme kuyruğu tıkanmış

   B grubu neden VAR ama bugün SESSİZ: entegrasyon tabloları boş, çünkü
   hiçbir gerçek sisteme bağlı değiliz ve sahte veri üretmiyoruz. Bu
   kurallar bağlantı günü için ÖNCEDEN kurulur ve testlerle koşulları
   yapay olarak yaratılarak kanıtlanır. Kuralı veri geldikten sonra
   yazmak, ilk kötü aktarımı kaçırmak demektir.

   Neden "kökeni olmayan her kayıt" diye bir kural YOK: bugün 347 varlığın
   hiçbirinin kökeni yok, çünkü hepsi elle/seed ile girildi. Böyle bir
   kural 347 gürültü üretir ve gerçek bulguyu gömer. Kural, kökenin
   VARLIĞINI değil, var olan kökenin TUTARLILIĞINI denetler.

   Açık aynı bulgu varsa yenisi üretilmez; koşul düzelmişse açık bulgu
   'cozuldu' yapılır. */

const KURALLAR = ['sahipsiz_varlik', 'kritikligi_bilinmeyen', 'eksik_profil',
  'envanteri_bos_tesis', 'sahipsiz_kanit',
  'kokensiz_dogrulama', 'bayat_koken', 'cakisan_kaynak_kaydi',
  'kapsamsiz_kesif', 'bekleyen_kesif_yigilmasi'] as const;

/** Poll aralığı bilinmeyen otomatik kaynak için bayatlık eşiği. */
export const VARSAYILAN_BAYAT_GUN = 30;
/** Poll aralığı bilinen kaynakta kaç periyot kaçırılınca bayat sayılır.
    Bir periyot kaçırmak gecikmedir; üçü art arda kaçırmak kesintidir. */
export const BAYAT_PERIYOT_KATI = 3;
/** İnsan inceleme kuyruğunda bu kadar bekleyen kayıt yığılma sayılır. */
export const INCELEME_YIGILMA_GUN = 14;

type Ihlal = { kural: string; kaynakTipi: string; kaynakId: string; aciklama: string };
const anahtar = (x: { kural: string; kaynakTipi: string; kaynakId: string }) =>
  `${x.kural}|${x.kaynakTipi}|${x.kaynakId}`;

export async function veriKalitesiniIsle(): Promise<{ islenen: number; uretilen: number }> {
  const ihlaller: Ihlal[] = [];
  /* Eşikler yönetim konsolundan (B sınıfı); kayıt yoksa kod varsayılanları. */
  const esik = await ayarlar([
    'motor.veri_kalitesi.bayat_gun', 'motor.veri_kalitesi.bayat_periyot_kati',
    'motor.veri_kalitesi.inceleme_yigilma_gun'] as const);
  const bayatGun = Number(esik['motor.veri_kalitesi.bayat_gun']);
  const periyotKati = Number(esik['motor.veri_kalitesi.bayat_periyot_kati']);
  const yigilmaGun = Number(esik['motor.veri_kalitesi.inceleme_yigilma_gun']);

  // sahipsiz kritik varlık + kritikliği bilinmeyen varlık
  const varliklar = await db.varlik.findMany({
    where: { silindi: null, OR: [
      { kritiklik: 'kritik', sahipId: null },
      { kritiklik: 'bilinmiyor' },
    ] },
    select: { id: true, etiket: true, ad: true, kritiklik: true, sahipId: true },
  });
  for (const v of varliklar) {
    if (v.kritiklik === 'kritik' && !v.sahipId)
      ihlaller.push({ kural: 'sahipsiz_varlik', kaynakTipi: 'Varlik', kaynakId: v.id,
        aciklama: `Kritik varlık ${v.etiket} (${v.ad}) sahipsiz — hesap verebilirlik zinciri kopuk.` });
    if (v.kritiklik === 'bilinmiyor')
      ihlaller.push({ kural: 'kritikligi_bilinmeyen', kaynakTipi: 'Varlik', kaynakId: v.id,
        aciklama: `${v.etiket} (${v.ad}) varlığının kritikliği değerlendirilmemiş.` });
  }

  // profili olmayan / envanteri boş aktif tesisler
  const tesisler = await db.tesis.findMany({
    where: { durum: 'aktif' },
    select: { id: true, kod: true, ad: true,
      profil: { select: { id: true } },
      _count: { select: { varliklar: { where: { silindi: null } } } } },
  });
  for (const t of tesisler) {
    if (!t.profil)
      ihlaller.push({ kural: 'eksik_profil', kaynakTipi: 'Tesis', kaynakId: t.id,
        aciklama: `${t.kod} (${t.ad}) aktif tesisin profili yok — uygulanabilirlik hesaplanamaz.` });
    if (t._count.varliklar === 0)
      ihlaller.push({ kural: 'envanteri_bos_tesis', kaynakTipi: 'Tesis', kaynakId: t.id,
        aciklama: `${t.kod} (${t.ad}) aktif tesisin envanterinde hiç varlık yok.` });
  }

  // ═══ B. Aktarılan veri kuralları ═══════════════════════════════════

  /* B1 — Köken 'dogrulandi' ama hangi koşudan geldiği bilinmiyor.

     §12'nin değişmezi: "veri geldi ama kaynak bağlamı yoksa doğrulanmış
     görünmesin". Doğrulama, bir insanın "bu kayıt kaynağında da böyle"
     demesidir; hangi koşuda, hangi connector'dan geldiği bilinmiyorsa o
     iddia denetlenemez. Denetlenemeyen doğrulama, doğrulanmamıştan daha
     kötüdür: yanlış güven verir. */
  const kokensizDogrulama = await db.veriKokeni.findMany({
    where: {
      dogrulamaDurumu: 'dogrulandi',
      OR: [{ connectorId: null }, { kosuId: null }],
    },
    select: { id: true, varlikTipi: true, varlikId: true, kaynakSistem: true },
  });
  for (const k of kokensizDogrulama)
    ihlaller.push({
      kural: 'kokensiz_dogrulama', kaynakTipi: 'VeriKokeni', kaynakId: k.id,
      aciklama: `${k.varlikTipi} kaydının kökeni '${k.kaynakSistem}' için doğrulandı `
        + 'işaretli ama hangi koşudan geldiği bilinmiyor — doğrulama denetlenemez.',
    });

  /* B2 — Otomatik kaynak beslemeyi kesmiş.

     Bir kaydın kökeni 'otomatik' diyorsa, o kaynağın kaydı tazelemesi
     beklenir. Kaynak susunca kayıt olduğu yerde kalır ve GÜNCELMİŞ gibi
     görünür; ekran onu kaynak sistemin bugünkü hâli sanır. Eşik
     connector'ın kendi poll aralığından türetilir — sabit bir gün sayısı,
     saatte bir çeken bir kaynağı da haftada bir çekeni de aynı ölçerdi. */
  const otomatikKokenler = await db.veriKokeni.findMany({
    where: { kokenTipi: 'otomatik' },
    select: {
      id: true, varlikTipi: true, varlikId: true, kaynakSistem: true,
      aktarim: true, connectorId: true,
    },
  });
  const pollOnbellegi = new Map<string, number | null>();
  const simdi = Date.now();
  for (const k of otomatikKokenler) {
    let esikMs = bayatGun * 86_400_000;
    if (k.connectorId) {
      if (!pollOnbellegi.has(k.connectorId)) {
        const c = await db.connector.findUnique({
          where: { id: k.connectorId }, select: { pollAralikDk: true },
        });
        pollOnbellegi.set(k.connectorId, c?.pollAralikDk ?? null);
      }
      const poll = pollOnbellegi.get(k.connectorId);
      if (poll && poll > 0) esikMs = poll * 60_000 * periyotKati;
    }
    const yas = simdi - k.aktarim.getTime();
    if (yas > esikMs)
      ihlaller.push({
        kural: 'bayat_koken', kaynakTipi: 'VeriKokeni', kaynakId: k.id,
        aciklama: `'${k.kaynakSistem}' kaynağı ${k.varlikTipi} kaydını `
          + `${Math.round(yas / 86_400_000)} gündür tazelemedi — kayıt güncel görünüyor `
          + 'ama kaynak susmuş olabilir.',
      });
  }

  /* B3 — Tek kaynak kaydı İKİ ayrı varlığa yazılmış.

     Veritabanı tekilliği (varlikTipi, varlikId, kaynakSistem,
     kaynakKayitId) üzerindedir; aynı kaynak kaydının İKİ FARKLI varlığa
     bağlanmasını engellemez. Bu, eşleşmenin yanlış varlığı seçtiği
     anlamına gelir: kaynaktaki tek sunucu, CMDB'de iki satır olarak
     yaşamaya başlar ve ikisi de "kaynaktan doğrulandı" görünür. */
  const kaynakKayitlari = await db.veriKokeni.groupBy({
    by: ['varlikTipi', 'kaynakSistem', 'kaynakKayitId'],
    _count: { varlikId: true },
    having: { varlikId: { _count: { gt: 1 } } },
  });
  for (const g of kaynakKayitlari) {
    const ornek = await db.veriKokeni.findFirst({
      where: {
        varlikTipi: g.varlikTipi, kaynakSistem: g.kaynakSistem,
        kaynakKayitId: g.kaynakKayitId,
      },
      select: { id: true },
      orderBy: { aktarim: 'asc' },
    });
    if (!ornek) continue;
    ihlaller.push({
      kural: 'cakisan_kaynak_kaydi', kaynakTipi: 'VeriKokeni', kaynakId: ornek.id,
      aciklama: `'${g.kaynakSistem}' sistemindeki tek kayıt (${g.kaynakKayitId}) `
        + `${g._count.varlikId} ayrı ${g.varlikTipi} satırına bağlanmış — eşleşme `
        + 'yanlış varlığı seçmiş olmalı.',
    });
  }

  /* B4 — Keşif kaydının santrali çözülememiş.

     Santrali bilinmeyen kayıt, kapsam süzgecinden geçemez: hangi
     kullanıcının görmeye yetkili olduğu belirsizdir. Sessizce kuyrukta
     bırakmak, onu görünmez ama silinmemiş bir kayda çevirir. */
  const kapsamsiz = await db.kesifKaydi.findMany({
    where: { tesisId: null, durum: { in: ['kesfedildi', 'normalize', 'inceleme_bekliyor'] } },
    select: { id: true, kaynak: true, kaynakKayitId: true },
    take: 200,
  });
  for (const k of kapsamsiz)
    ihlaller.push({
      kural: 'kapsamsiz_kesif', kaynakTipi: 'KesifKaydi', kaynakId: k.id,
      aciklama: `'${k.kaynak}' kaynağından gelen ${k.kaynakKayitId} kaydının santrali `
        + 'çözülemedi — kapsam süzgecinden geçemez, kimse göremez.',
    });

  /* B5 — İnsan inceleme kuyruğu tıkanmış.

     Otomasyon ÖNERİR, insan karar verir. Öneri kuyruğu birikiyorsa
     tasarım çalışmıyor demektir: ya öneriler anlamsız, ya kimse bakmıyor.
     İkisi de ürünün sorunudur ve sessiz kalmamalıdır. */
  const yigilmaEsigi = new Date(simdi - yigilmaGun * 86_400_000);
  const bekleyenler = await db.kesifKaydi.findMany({
    where: { durum: 'inceleme_bekliyor', ilkGorulme: { lt: yigilmaEsigi } },
    select: { id: true, kaynak: true, ilkGorulme: true },
    take: 200,
  });
  for (const k of bekleyenler)
    ihlaller.push({
      kural: 'bekleyen_kesif_yigilmasi', kaynakTipi: 'KesifKaydi', kaynakId: k.id,
      aciklama: `'${k.kaynak}' kaynağından gelen kayıt `
        + `${Math.round((simdi - k.ilkGorulme.getTime()) / 86_400_000)} gündür insan `
        + 'incelemesi bekliyor.',
    });

  // sahipsiz kanıt (sahip de yükleyen de yoksa tazelik görevi kimseye atanamaz)
  const kanitlar = await db.kanit.findMany({
    where: { silindi: null, sahipId: null, yukleyenId: null },
    select: { id: true, ad: true },
  });
  for (const kn of kanitlar)
    ihlaller.push({ kural: 'sahipsiz_kanit', kaynakTipi: 'Kanit', kaynakId: kn.id,
      aciklama: `"${kn.ad}" kanıtının sahibi yok — yenileme sorumlusu belirsiz.` });

  // mevcut açık bulgularla karşılaştır
  const acikBulgular = await db.veriKalitesiBulgusu.findMany({
    where: { durum: 'acik', kural: { in: [...KURALLAR] } },
  });
  const acikKume = new Set(acikBulgular.map(anahtar));
  const ihlalKume = new Set(ihlaller.map(anahtar));

  let uretilen = 0;
  for (const i of ihlaller) {
    if (acikKume.has(anahtar(i))) continue; // açık aynı kayıt var — üretme
    await db.veriKalitesiBulgusu.create({ data: i });
    uretilen++;
  }
  for (const b of acikBulgular) {
    if (ihlalKume.has(anahtar(b))) continue;
    // koşul düzelmiş — açık bulguyu çöz
    await db.veriKalitesiBulgusu.update({ where: { id: b.id },
      data: { durum: 'cozuldu', kapanis: new Date() } });
  }

  return { islenen: ihlaller.length + acikBulgular.length, uretilen };
}
