import { afterEach, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

/* Veri kalitesi motorunun AKTARILAN VERİ kuralları.

   Bu kurallar bugün hiç bulgu üretmiyor — entegrasyon tabloları boş,
   çünkü hiçbir gerçek sisteme bağlı değiliz ve sahte veri üretmiyoruz.
   Kuralı "veri gelince yazarız" demek, ilk kötü aktarımı kaçırmak
   demektir. Bu yüzden koşullar burada YAPAY olarak yaratılıyor ve her
   kural ayrı ayrı ölçülüyor.

   Sessizliğin kendisi de bir sözleşmedir ve ölçülür: temiz veri üzerinde
   bu kuralların HİÇ bulgu üretmemesi gerekir. Yanlış pozitif üreten bir
   kural, gerçek bulguyu gürültüye gömer. */

const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-vk-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

const { db } = await import('@/lib/db');
const { veriKalitesiniIsle, VARSAYILAN_BAYAT_GUN, BAYAT_PERIYOT_KATI, INCELEME_YIGILMA_GUN } =
  await import('@/lib/motorlar/veriKalitesi');

const gunOnce = (g: number) => new Date(Date.now() - g * 86_400_000);

/** Kuralın ürettiği AÇIK bulgular. */
async function bulgular(kural: string) {
  return db.veriKalitesiBulgusu.findMany({ where: { kural, durum: 'acik' } });
}

const AKTARIM_KURALLARI = [
  'kokensiz_dogrulama', 'bayat_koken', 'cakisan_kaynak_kaydi',
  'kapsamsiz_kesif', 'bekleyen_kesif_yigilmasi', 'sahipsiz_gorulen_varlik',
];

async function temizle() {
  await db.veriKokeni.deleteMany({});
  await db.kesifKaydi.deleteMany({});
  await db.veriKalitesiBulgusu.deleteMany({ where: { kural: { in: AKTARIM_KURALLARI } } });
}

afterEach(temizle);

/* `sahipsiz_gorulen_varlik` bu listede DEĞİLDİR ve olmamalıdır: kural
   entegrasyon tablolarına değil, seed'de de bulunan keşif kayıtlarına
   bakar ve orada GERÇEK bir sahiplik boşluğu vardır. Sessiz kalmasını
   beklemek, kuralı gerçek bulgusunu gizleyecek kadar dar yazmak
   olurdu. */
const SESSIZ_OLMASI_GEREKENLER = AKTARIM_KURALLARI
  .filter((k) => k !== 'sahipsiz_gorulen_varlik');

describe('Temiz veride sessizlik', () => {
  it('entegrasyon tabloları boşken HİÇBİR aktarım kuralı bulgu üretmez', async () => {
    await veriKalitesiniIsle();
    for (const kural of SESSIZ_OLMASI_GEREKENLER) {
      expect((await bulgular(kural)).length, `${kural} yanlış pozitif üretti`).toBe(0);
    }
  });

  it('kökeni olmayan 347 varlık için bulgu ÜRETİLMEZ', async () => {
    /* Bilinçli bir sınır: bugün hiçbir varlığın kökeni yok, çünkü hepsi
       elle/seed ile girildi. "Kökeni olmayan her kayıt" diye bir kural
       yüzlerce gürültü üretir ve gerçek bulguyu gömerdi. Kural, kökenin
       VARLIĞINI değil, var olan kökenin TUTARLILIĞINI denetler. */
    expect(await db.varlik.count({ where: { silindi: null } })).toBeGreaterThan(100);
    expect(await db.veriKokeni.count()).toBe(0);
    await veriKalitesiniIsle();
    const toplam = await db.veriKalitesiBulgusu.count({
      where: { kural: { in: AKTARIM_KURALLARI }, durum: 'acik' },
    });
    expect(toplam).toBe(0);
  });
});

describe('B1 — köken doğrulandı ama koşu bağlamı yok', () => {
  it('koşusuz doğrulama yakalanır', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'manuel',
        kaynakSistem: 'elle', kaynakKayitId: 'B1-1',
        dogrulamaDurumu: 'dogrulandi', connectorId: null, kosuId: null,
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(1);
  });

  it('İKİSİNDEN BİRİ eksikse de yakalanır — connector var, koşu yok', async () => {
    /* Bu vaka mutasyonla bulundu: koşul yanlışlıkla "ikisi de yok" olarak
       yazılsa, yalnız ikisinin de boş olduğu vakayı ölçen bir test yeşil
       kalırdı. Kısmi bağlam da denetlenemez bir doğrulamadır: hangi
       connector'dan geldiği bilinip hangi koşuda geldiği bilinmiyorsa,
       iddianın hangi veriye dayandığı hâlâ belirsizdir. */
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    const c = await db.connector.create({
      data: {
        kod: `VK-B1-${Date.now()}`, ad: 'Kısmi bağlam', tip: 'manual_import',
        kaynakSistem: 'test',
      },
    });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
        kaynakSistem: 'test', kaynakKayitId: 'B1-3',
        dogrulamaDurumu: 'dogrulandi', connectorId: c.id, kosuId: null,
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(1);
    await db.veriKokeni.deleteMany({ where: { connectorId: c.id } });
    await db.connector.delete({ where: { id: c.id } });
  });

  it('doğrulanmamış köken için bulgu ÜRETİLMEZ — iddia yoksa denetlenecek şey de yok', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'manuel',
        kaynakSistem: 'elle', kaynakKayitId: 'B1-2',
        dogrulamaDurumu: 'dogrulanmadi',
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(0);
  });
});

describe('B2 — otomatik kaynak beslemeyi kesmiş', () => {
  it("connector'ı olmayan otomatik köken varsayılan eşiğe göre bayatlar", async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
        kaynakSistem: 'edr', kaynakKayitId: 'B2-1',
        aktarim: gunOnce(VARSAYILAN_BAYAT_GUN + 5),
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('bayat_koken')).toHaveLength(1);
  });

  it('eşik connector POLL ARALIĞINDAN türetilir — sabit gün sayısı değil', async () => {
    /* Saatte bir çeken kaynakla haftada bir çekeni aynı ölçmek yanlış
       olurdu: sıkça çeken bir kaynağın iki gün susması kesintidir, seyrek
       çekenin iki gün susması normaldir. */
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    const c = await db.connector.create({
      data: {
        kod: `VK-TEST-${Date.now()}`, ad: 'Vade testi', tip: 'manual_import',
        kaynakSistem: 'test', pollAralikDk: 60,
      },
    });
    // 60 dk × 3 = 3 saat eşiği; 1 günlük yaş bunu aşar ama 30 günü aşmaz.
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
        kaynakSistem: 'test', kaynakKayitId: 'B2-2',
        connectorId: c.id, aktarim: gunOnce(1),
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('bayat_koken')).toHaveLength(1);
    expect(BAYAT_PERIYOT_KATI).toBeGreaterThan(1);
    await db.connector.delete({ where: { id: c.id } });
  });

  it('taze otomatik köken bayat sayılmaz', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
        kaynakSistem: 'edr', kaynakKayitId: 'B2-3', aktarim: gunOnce(1),
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('bayat_koken')).toHaveLength(0);
  });
});

describe('B3 — tek kaynak kaydı iki varlığa yazılmış', () => {
  it('aynı kaynakKayitId iki farklı varlığa bağlanınca yakalanır', async () => {
    /* Veritabanı tekilliği (varlikTipi, varlikId, kaynakSistem,
       kaynakKayitId) üzerinde: bu çakışmayı ENGELLEMEZ. Kaynaktaki tek
       sunucu CMDB'de iki satır olarak yaşamaya başlar ve İKİSİ DE
       "kaynaktan doğrulandı" görünür. */
    const [a, b] = await db.varlik.findMany({ where: { silindi: null }, take: 2 });
    for (const v of [a, b]) {
      await db.veriKokeni.create({
        data: {
          varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
          kaynakSistem: 'edr', kaynakKayitId: 'AYNI-KAYNAK-KAYDI',
        },
      });
    }
    await veriKalitesiniIsle();
    const b3 = await bulgular('cakisan_kaynak_kaydi');
    expect(b3).toHaveLength(1);
    expect(b3[0].aciklama).toContain('AYNI-KAYNAK-KAYDI');
  });

  it('aynı kaynak kaydı TEK varlığa bağlıysa bulgu yok', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'otomatik',
        kaynakSistem: 'edr', kaynakKayitId: 'TEKIL-KAYIT',
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('cakisan_kaynak_kaydi')).toHaveLength(0);
  });
});

describe('B4 / B5 — keşif kuyruğu', () => {
  it('santrali çözülemeyen açık keşif kaydı yakalanır', async () => {
    await db.kesifKaydi.create({
      data: {
        kaynak: 'switch_arp', kaynakKayitId: 'B4-1', tesisId: null,
        hamJson: '{}', durum: 'kesfedildi',
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kapsamsiz_kesif')).toHaveLength(1);
  });

  it('KARARI VERİLMİŞ kapsamsız kayıt için bulgu üretilmez', async () => {
    // Reddedilmiş bir kaydın santralinin bilinmemesi artık bir sorun değil.
    await db.kesifKaydi.create({
      data: {
        kaynak: 'switch_arp', kaynakKayitId: 'B4-2', tesisId: null,
        hamJson: '{}', durum: 'reddedildi',
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kapsamsiz_kesif')).toHaveLength(0);
  });

  it('insan inceleme kuyruğunda yığılan kayıt yakalanır', async () => {
    const t = await db.tesis.findFirstOrThrow();
    await db.kesifKaydi.create({
      data: {
        kaynak: 'siem', kaynakKayitId: 'B5-1', tesisId: t.id, hamJson: '{}',
        durum: 'inceleme_bekliyor', ilkGorulme: gunOnce(INCELEME_YIGILMA_GUN + 3),
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('bekleyen_kesif_yigilmasi')).toHaveLength(1);
  });

  it('yeni bekleyen kayıt yığılma sayılmaz', async () => {
    const t = await db.tesis.findFirstOrThrow();
    await db.kesifKaydi.create({
      data: {
        kaynak: 'siem', kaynakKayitId: 'B5-2', tesisId: t.id, hamJson: '{}',
        durum: 'inceleme_bekliyor', ilkGorulme: gunOnce(1),
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('bekleyen_kesif_yigilmasi')).toHaveLength(0);
  });
});

describe('B6 — OT-16b · ağda görülen ama sahipsiz varlık', () => {
  /** Sahipsiz, silinmemiş bir varlık; testten sonra sahibi geri konur. */
  async function sahipsizVarlik() {
    const v = await db.varlik.findFirstOrThrow({
      where: { silindi: null }, select: { id: true, sahipId: true },
    });
    await db.varlik.update({ where: { id: v.id }, data: { sahipId: null } });
    return v;
  }

  it('gözlemde görülen sahipsiz varlık için bulgu açılır', async () => {
    const v = await sahipsizVarlik();
    await db.kesifKaydi.create({
      data: {
        kaynak: 'switch_arp', kaynakKayitId: 'B6-1', hamJson: '{}',
        durum: 'eslesti', eslesenVarlikId: v.id,
      },
    });
    await veriKalitesiniIsle();
    const b = await bulgular('sahipsiz_gorulen_varlik');
    expect(b).toHaveLength(1);
    expect(b[0]!.kaynakId).toBe(v.id);
    await db.varlik.update({ where: { id: v.id }, data: { sahipId: v.sahipId } });
  });

  it('aynı varlığı iki kaynak görse bile TEK bulgu açılır', async () => {
    /* Bulgu varlık başınadır: gözlem başına açılsaydı tek bir sahipsiz
       cihaz için beş bulgu üretilir ve kuyruk gürültüye boğulurdu. */
    const v = await sahipsizVarlik();
    for (const kaynak of ['switch_arp', 'siem', 'dhcp']) {
      await db.kesifKaydi.create({
        data: {
          kaynak, kaynakKayitId: `B6-cok-${kaynak}`, hamJson: '{}',
          durum: 'eslesti', eslesenVarlikId: v.id,
        },
      });
    }
    await veriKalitesiniIsle();
    expect(await bulgular('sahipsiz_gorulen_varlik')).toHaveLength(1);
    await db.varlik.update({ where: { id: v.id }, data: { sahipId: v.sahipId } });
  });

  it('SAHİBİ OLAN varlık görülse de bulgu üretilmez', async () => {
    const v = await db.varlik.findFirstOrThrow({
      where: { silindi: null, sahipId: { not: null } }, select: { id: true },
    });
    await db.kesifKaydi.create({
      data: {
        kaynak: 'siem', kaynakKayitId: 'B6-2', hamJson: '{}',
        durum: 'eslesti', eslesenVarlikId: v.id,
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('sahipsiz_gorulen_varlik')).toHaveLength(0);
  });

  it('REDDEDİLMİŞ gözlem sahipsizlik bulgusu açmaz', async () => {
    const v = await sahipsizVarlik();
    await db.kesifKaydi.create({
      data: {
        kaynak: 'siem', kaynakKayitId: 'B6-3', hamJson: '{}',
        durum: 'reddedildi', eslesenVarlikId: v.id,
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('sahipsiz_gorulen_varlik')).toHaveLength(0);
    await db.varlik.update({ where: { id: v.id }, data: { sahipId: v.sahipId } });
  });

  it('eşleşmemiş gözlem bu kuralın konusu DEĞİLDİR', async () => {
    /* Envanterde karşılığı olmayan cihaz keşif kuyruğunun işidir; burada
       sayılsaydı iki ayrı boşluk tek bir bulguya karışırdı. */
    await db.kesifKaydi.create({
      data: {
        kaynak: 'arp', kaynakKayitId: 'B6-4', hamJson: '{}',
        durum: 'inceleme_bekliyor', eslesenVarlikId: null,
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('sahipsiz_gorulen_varlik')).toHaveLength(0);
  });
});

describe('Bulgu yaşam döngüsü', () => {
  it('koşul düzelince açık bulgu ÇÖZÜLDÜ olur — el ile kapatmak gerekmez', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    const koken = await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'manuel',
        kaynakSistem: 'elle', kaynakKayitId: 'DONGU-1',
        dogrulamaDurumu: 'dogrulandi',
      },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(1);

    await db.veriKokeni.update({
      where: { id: koken.id }, data: { dogrulamaDurumu: 'dogrulanmadi' },
    });
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(0);
    const cozulen = await db.veriKalitesiBulgusu.findFirst({
      where: { kural: 'kokensiz_dogrulama', durum: 'cozuldu' },
    });
    expect(cozulen).not.toBeNull();
  });

  it('ikinci koşu aynı bulguyu ÇOĞALTMAZ', async () => {
    const v = await db.varlik.findFirstOrThrow({ where: { silindi: null } });
    await db.veriKokeni.create({
      data: {
        varlikTipi: 'Varlik', varlikId: v.id, kokenTipi: 'manuel',
        kaynakSistem: 'elle', kaynakKayitId: 'DONGU-2',
        dogrulamaDurumu: 'dogrulandi',
      },
    });
    await veriKalitesiniIsle();
    await veriKalitesiniIsle();
    expect(await bulgular('kokensiz_dogrulama')).toHaveLength(1);
  });
});
