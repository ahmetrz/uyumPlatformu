import 'server-only';
import { db } from '../db';
import { MOTORLAR, type MotorAdi } from '../motorlar/kayit';
import { isKos } from '../motorlar/isKosucu';
import { dolmusKilitleriTemizle } from './kilit';
import { dolmusOturumlariTemizle } from '../auth';
import { adaptorVarMi, adaptorCoz } from '../entegrasyon/kayit';
import { adaptorGerekeni } from '../entegrasyon/adaptorler';
import { kuyrukSec } from './kuyruk';

/* ═══════════════════════════════════════════════════════════════════════
   ZAMANLAYICI — ne koşacağını VERİTABANINDAN TÜRETİR

   ── Kapatılan kusur ────────────────────────────────────────────────────
   `Connector.pollAralikDk` yapılandırılabiliyordu, ekranda görünüyordu ve
   `saglikOzeti.ts` bir connector'ın BAYAT olup olmadığına bu alana bakarak
   karar veriyordu. Ama HİÇBİR ŞEY bu aralığa göre connector koşturmuyordu:
   zamanlayıcı yalnız sekiz motoru koşturuyor, connector senkronizasyonu
   ise yalnız bir ekran düğmesinden tetikleniyordu.

   Sonuç şuydu: "15 dakikada bir çek" diye ayarlanmış bir connector hiç
   çekmiyor, `/saglik` ekranı onu "veri bayat" diye işaretliyordu — yani
   ürün, kendi zamanlayıcısındaki boşluğu KAYNAK SİSTEMİN suçu gibi
   gösteriyordu. Bu, gerçek sistemlere bağlandığımız gün ilk yanlış
   yönlendirecek şey olurdu.

   ── Neden "türetme", neden liste değil ─────────────────────────────────
   Vadesi gelen iş bir kuyruk listesinde SAKLANMAZ, her tikte veritabanı
   durumundan yeniden hesaplanır. Süreç yeniden başlarsa bekleyen işler
   kaybolur ama bir sonraki tikte yine vadesi gelmiş görünürler. Böylece
   süreç-içi (dayanıksız) kuyruk güvenli olur ve dağıtık kuyruğa geçiş
   davranışı DEĞİŞTİRMEZ.

   ── Sessiz atlama yasak ────────────────────────────────────────────────
   Koşmayan her hedef `atlanan` listesinde SEBEBİYLE döner. "Koşmadı" ile
   "koşacak bir şey yoktu" ayrı bilgilerdir; ikincisi ekranda birincisi
   gibi görünürse kimse eksik kurulumu fark etmez.

   ── Otomasyon sınırı ───────────────────────────────────────────────────
   Zamanlayıcı yalnız VERİ ÇEKER ve motorları koşturur. Hiçbir şeyi
   kapatmaz, hiçbir bulguyu kapatmaz, hiçbir kararı otomatik vermez;
   ürettiği her şey insan onayı bekleyen öneridir.
   ═══════════════════════════════════════════════════════════════════════ */

/** Motorların koşma aralığı. Connector'ların aksine motor başına
    ayarlanmaz: hepsi aynı veri kümesini tarar, ayrı aralık vermek
    aralarında tutarsız görünümler üretirdi. */
export const MOTOR_ARALIK_DK = 60;

/** Zamanlayıcı tikinin sıklığı. Aralıkların kendisi değil, yalnız
    çözünürlüğüdür: 15 dakikalık bir connector en fazla bir tik gecikir. */
export const TIK_ARALIK_MS = 60_000;

/** Bakım (süresi dolmuş satırların temizliği) aralığı. */
export const BAKIM_ARALIK_DK = 60;

/** Bakım işinin koşu kaydındaki adı. Motor defterine GİRMEZ: bulgu
    üretmez, veriyi yorumlamaz, yalnız süresi dolmuş satırları siler.
    Defterdeki her şeyin "otomasyon motoru" sayıldığı bir yerde onu da
    motor saymak, motor sayısını ve anlamını bozardı. */
export const BAKIM_ISI = 'bakim_temizlik';

export type VadeHedefi =
  | { tur: 'motor'; anahtar: string; hedef: MotorAdi; sonKosu: Date | null }
  | { tur: 'connector'; anahtar: string; hedef: string; ad: string; aralikDk: number; sonKosu: Date | null };

export type Atlanan = { tur: 'motor' | 'connector'; hedef: string; ad: string; sebep: string };

export type VadeSonucu = { kosulacak: VadeHedefi[]; atlanan: Atlanan[] };

function dkGecti(sonKosu: Date | null, simdi: Date): number | null {
  if (!sonKosu) return null;
  return (simdi.getTime() - sonKosu.getTime()) / 60_000;
}

/* ─── Motorlar ───────────────────────────────────────────────────────── */

async function motorVadeleri(simdi: Date, aralikDk: number): Promise<VadeSonucu> {
  const kosulacak: VadeHedefi[] = [];
  const atlanan: Atlanan[] = [];

  for (const ad of Object.keys(MOTORLAR) as MotorAdi[]) {
    /* Vade ölçüsü SON BAŞARILI koşudur, son koşu değil. Başarısız koşuyu
       "koştu" saymak, sürekli patlayan bir motoru bir daha hiç denememek
       demek olurdu. */
    const son = await db.isKosusu.findFirst({
      where: { isAdi: ad, durum: 'basarili' },
      orderBy: { baslangic: 'desc' },
      select: { baslangic: true },
    });
    const gecen = dkGecti(son?.baslangic ?? null, simdi);
    if (gecen === null || gecen >= aralikDk) {
      kosulacak.push({ tur: 'motor', anahtar: `motor:${ad}`, hedef: ad, sonKosu: son?.baslangic ?? null });
    } else {
      atlanan.push({
        tur: 'motor', hedef: ad, ad,
        sebep: `Vadesi gelmedi — ${Math.round(aralikDk - gecen)} dk kaldı`,
      });
    }
  }
  return { kosulacak, atlanan };
}

/* ─── Connector'lar ──────────────────────────────────────────────────── */

/**
 * Bir connector'ın neden koşmadığını (ya da koşacağını) söyler.
 *
 * Bağlanamayan adaptörü zamanlayıcı KOŞTURMAZ. Koştursaydı her poll
 * aralığında bir `kimlik_bekleniyor` koşu satırı düşer, koşu geçmişi
 * kurulumu bekleyen connector'ların gürültüsüyle dolar ve gerçek hatalar
 * içinde kaybolurdu. Bekleyen kurulum bir OLAY değil, bir DURUMDUR;
 * `/saglik` ekranı onu durum olarak gösterir.
 */
export function connectorVadesi(
  c: {
    id: string; ad: string; tip: string; durum: string; etkin: boolean;
    silindi: Date | null; pollAralikDk: number | null;
  },
  sonKosu: Date | null,
  simdi: Date,
): { vadeli: true; aralikDk: number } | { vadeli: false; sebep: string } {
  if (c.silindi) return { vadeli: false, sebep: 'Silinmiş connector' };
  if (!c.etkin) return { vadeli: false, sebep: 'Pasif — yalnız elle tetiklenir' };
  if (c.durum === 'hatali') {
    return {
      vadeli: false,
      sebep: 'Ardışık hata sınırı aşıldığı için duraklatıldı — '
        + 'sebep giderilip elle yeniden etkinleştirilmeli',
    };
  }
  if (c.durum === 'duraklatildi') return { vadeli: false, sebep: 'Elle duraklatıldı' };
  if (c.durum === 'taslak') return { vadeli: false, sebep: 'Taslak — yapılandırma tamamlanmadı' };
  if (!c.pollAralikDk || c.pollAralikDk <= 0) {
    return { vadeli: false, sebep: 'Poll aralığı tanımsız — yalnız elle tetiklenir' };
  }
  if (!adaptorVarMi(c.tip)) {
    return { vadeli: false, sebep: `Bu tip için adaptör kayıtlı değil: '${c.tip}'` };
  }
  const adaptor = adaptorCoz(c.tip);
  if (!adaptor.baglanabilir) {
    const gereken = adaptorGerekeni(adaptor);
    return {
      vadeli: false,
      sebep: `Adaptör bağlanamıyor (kimlik bekleniyor)${gereken ? ` — gereken: ${gereken}` : ''}`,
    };
  }
  const gecen = dkGecti(sonKosu, simdi);
  if (gecen !== null && gecen < c.pollAralikDk) {
    return { vadeli: false, sebep: `Vadesi gelmedi — ${Math.round(c.pollAralikDk - gecen)} dk kaldı` };
  }
  return { vadeli: true, aralikDk: c.pollAralikDk };
}

async function connectorVadeleri(simdi: Date): Promise<VadeSonucu> {
  const kosulacak: VadeHedefi[] = [];
  const atlanan: Atlanan[] = [];

  const connectorlar = await db.connector.findMany({
    where: { silindi: null },
    select: {
      id: true, ad: true, tip: true, durum: true, etkin: true,
      silindi: true, pollAralikDk: true,
    },
    orderBy: { kod: 'asc' },
  });

  for (const c of connectorlar) {
    /* Burada da ölçü SON BAŞARILI koşudur. `kimlik_bekleniyor` ile kapanan
       bir koşu "çekti" sayılmaz; sayılsaydı kurulumu bekleyen connector
       taze görünürdü. */
    const son = await db.entegrasyonKosusu.findFirst({
      where: { connectorId: c.id, durum: 'basarili' },
      orderBy: { baslangic: 'desc' },
      select: { baslangic: true },
    });
    const vade = connectorVadesi(c, son?.baslangic ?? null, simdi);
    if (vade.vadeli) {
      kosulacak.push({
        tur: 'connector', anahtar: `connector:${c.id}`, hedef: c.id, ad: c.ad,
        aralikDk: vade.aralikDk, sonKosu: son?.baslangic ?? null,
      });
    } else {
      atlanan.push({ tur: 'connector', hedef: c.id, ad: c.ad, sebep: vade.sebep });
    }
  }
  return { kosulacak, atlanan };
}

/* ─── Bakım ──────────────────────────────────────────────────────────── */

/**
 * Süresi dolmuş oturum ve kilit satırlarını siler.
 *
 * ── Neden gerekli ──────────────────────────────────────────────────────
 * İki temizleyici yazılmış, test edilmiş ve HİÇBİR YERDEN çağrılmıyordu.
 * Etkisi sessizdi ve iki yönlüydü: süresi dolmuş `Oturum` satırları
 * birikince "kaç açık oturum var" sorusunun yanıtı yanlış olur — bir
 * çalışan işten ayrıldığında sorulan ilk soru budur. `IsKilidi` tarafında
 * ise işleyiş bozulmaz (kirası dolmuş kilit zaten devralınabilir) ama
 * tablo sonsuza kadar büyür.
 *
 * İşleyişi ETKİLEMEDİĞİ için bu iş fırlatmaz; hata koşu kaydına girer.
 */
export async function bakimYap(simdi: Date = new Date()):
Promise<{ islenen: number; uretilen: number }> {
  const oturum = await dolmusOturumlariTemizle(simdi);
  const kilit = await dolmusKilitleriTemizle(simdi);
  // `islenen` silinen toplam satır, `uretilen` yeni kayıt üretilmediği için 0.
  return { islenen: oturum + kilit, uretilen: 0 };
}

async function bakimVadesi(simdi: Date): Promise<boolean> {
  const son = await db.isKosusu.findFirst({
    where: { isAdi: BAKIM_ISI, durum: 'basarili' },
    orderBy: { baslangic: 'desc' },
    select: { baslangic: true },
  });
  const gecen = dkGecti(son?.baslangic ?? null, simdi);
  return gecen === null || gecen >= BAKIM_ARALIK_DK;
}

/** Şu an vadesi gelmiş her şey + gelmemiş olanların SEBEBİ. */
export async function vadesiGelenler(
  simdi: Date = new Date(),
  motorAralikDk: number = MOTOR_ARALIK_DK,
): Promise<VadeSonucu> {
  const m = await motorVadeleri(simdi, motorAralikDk);
  const c = await connectorVadeleri(simdi);
  return { kosulacak: [...m.kosulacak, ...c.kosulacak], atlanan: [...m.atlanan, ...c.atlanan] };
}

/* ─── Tik ────────────────────────────────────────────────────────────── */

export type TikSecenegi = {
  simdi?: Date;
  motorAralikDk?: number;
  /** Testler gerçek senkronizasyon çekirdeğini çağırmasın diye enjekte edilir. */
  connectorKos?: (connectorId: string) => Promise<unknown>;
  /** Kuyruk boşalana kadar bekle (test ve kapanış). */
  bekle?: boolean;
};

export type TikOzeti = {
  siralanan: number;
  atlanan: Atlanan[];
  kuyruk: string;
  /** `bekle: true` verildiyse dolar. */
  sonuc: { anahtar: string; ok: boolean; hata: string | null }[];
};

/**
 * Bir zamanlayıcı tiki. Vadesi gelenleri kuyruğa koyar; kuyruk eşzamanlılık
 * sınırına uyar, kilit ikinci koşuyu engeller.
 *
 * FIRLATMAZ. Bir hedefin patlaması diğerlerini durdurmaz ve tik özeti her
 * durumda döner — zamanlayıcının kendisi sessizce ölmemelidir.
 */
export async function zamanlayiciTiki(secenek: TikSecenegi = {}): Promise<TikOzeti> {
  const simdi = secenek.simdi ?? new Date();
  const { kosulacak, atlanan } = await vadesiGelenler(simdi, secenek.motorAralikDk);
  const kuyruk = kuyrukSec();

  const connectorKos = secenek.connectorKos ?? (async (id: string) => {
    /* Çekirdek geç yüklenir: zamanlayıcı modülünü içe aktarmak, tüm
       entegrasyon çekirdeğini de yüklemek zorunda kalmasın. */
    const { senkronizasyonKos } = await import('../entegrasyon/cekirdek');
    return senkronizasyonKos(id, { tetikleyen: 'zamanlanmis' });
  });

  /* Bakım: motorlardan ve connector'lardan ayrı bir iştir ve kendi koşu
     satırını bırakır — sessiz temizlik yoktur. Vadesi gelmediyse hiç
     sıraya girmez. */
  if (await bakimVadesi(simdi)) {
    await kuyruk.gonder(
      { anahtar: `motor:${BAKIM_ISI}`, tur: 'bakim', hedef: BAKIM_ISI },
      async () => { await isKos(BAKIM_ISI, () => bakimYap(simdi)); },
    );
  }

  for (const hedef of kosulacak) {
    if (hedef.tur === 'motor') {
      const motor = MOTORLAR[hedef.hedef];
      await kuyruk.gonder(
        { anahtar: hedef.anahtar, tur: 'motor', hedef: hedef.hedef },
        /* `isKos` kendi kilidini alır ve kendi koşu satırını yazar; burada
           sarmalamak çift kilit olurdu. */
        async () => { await isKos(hedef.hedef, motor); },
      );
    } else {
      await kuyruk.gonder(
        { anahtar: hedef.anahtar, tur: 'connector', hedef: hedef.hedef },
        /* `senkronizasyonKos` de kendi çakışma kontrolünü ve koşu satırını
           yönetir; kuyruk yalnız eşzamanlılığı sınırlar. */
        async () => { await connectorKos(hedef.hedef); },
      );
    }
  }

  const sonuc = secenek.bekle
    ? (await kuyruk.bosalt()).map((s) => ({ anahtar: s.anahtar, ok: s.ok, hata: s.hata }))
    : [];

  return { siralanan: kosulacak.length, atlanan, kuyruk: kuyruk.ad, sonuc };
}
