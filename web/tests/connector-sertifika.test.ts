import { beforeAll, describe, expect, it } from 'vitest';
import { copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

// TEST_DB'yi importlardan ÖNCE ayarla (db modülü ilk erişimde okur)
const dizin = mkdtempSync(path.join(tmpdir(), 'uyum-sertifika-'));
const testDb = path.join(dizin, 'test.db');
copyFileSync('prisma/dev.db', testDb);
process.env.TEST_DB = testDb;

/* Sentetik sandbox sırrı: hiçbir sisteme kimlik doğrulamaz, yalnız
   `sirVarMi()` yolunun 'var' dönebildiğini gösterir. Karşılığı olmayan
   referansın gerçekten 'yok' dönmesi için ikinci değişken SİLİNİR. */
process.env.UYUM_SERTIFIKA_SANDBOX_SIR = 'sertifika-fikstur-degeri-gercek-degil';
delete process.env.UYUM_SERTIFIKA_TANIMSIZ_SIR;

const { ADAPTORLER, ADAPTOR_TIPLERI } = await import('@/lib/entegrasyon/adaptorler');
const {
  KONTROL_KODLARI, raporTablosu, sertifikaKos,
} = await import('@/lib/entegrasyon/sertifika');
const { FIKSTURLER, fiksturCoz } = await import('./fixture');
const { sandboxKur } = await import('./fixture/sandbox');
import type { Adaptor, DogrulamaSonucu, Gozlem } from '@/lib/entegrasyon/sozlesme';
import type {
  KontrolDurumu, KontrolKodu, SertifikaRaporu,
} from '@/lib/entegrasyon/sertifika';

/* ═══════════════════════════════════════════════════════════════════════
   CONNECTOR SERTİFİKASYONU — sekiz adaptörün TAMAMI

   Beklenen sonuç, sekiz adaptörün sekizinin de sertifikayı GEÇMESİDİR;
   ama "geçmek" hepsinin aynı şeyi yapması demek değildir:

     · manual_import  — gerçekten bağlanabilir; içerik kontrolleri KOŞAR.
     · diğer yedisi   — bağlı değil; içerik kontrolleri UYGULANAMAZ çıkar
                        ve bu BEKLENEN sonuçtur, bir kusur değildir.

   Bu ayrım testin asıl konusudur: `uygulanamaz` ile `kaldi` karışırsa ya
   doğru davranan bir adaptör kusurlu gösterilir ya da hiç koşmamış bir
   kontrol "geçti" sanılır. İkisi de yalan rapor üretir. */

/** Bağlı olmayan adaptörlerde çalıştırılamayan kontroller. */
const BAGLANTI_GEREKTIREN: KontrolKodu[] = [
  'payload_ayristirici', 'normalize_dogru', 'bilinmeyen_yanlis_degil',
  'yinelenen_tespiti', 'idempotency', 'santral_kapsami', 'bozuk_reddi',
  'kismi_basarisizlik', 'retry_backoff', 'koken_eksiksiz',
];

const raporlar = new Map<string, SertifikaRaporu>();

function durum(tip: string, kod: KontrolKodu): KontrolDurumu {
  return raporlar.get(tip)!.kontroller.find((k) => k.kod === kod)!.durum;
}
function gerekce(tip: string, kod: KontrolKodu): string {
  return raporlar.get(tip)!.kontroller.find((k) => k.kod === kod)!.gerekce;
}

beforeAll(async () => {
  for (const tip of ADAPTOR_TIPLERI) {
    const adaptor = ADAPTORLER[tip] as Adaptor;
    const fikstur = fiksturCoz(tip);
    /* Sandbox YALNIZ dış bağlantı gerektirmeyen fikstürlere kurulur:
       sertifikasyon koşusu hiçbir kurum sistemine bağlanmaz. */
    const sandbox = fikstur.disBaglantiGerekmez ? sandboxKur(adaptor, fikstur) : null;
    raporlar.set(tip, await sertifikaKos(adaptor, {
      fikstur,
      kosucu: sandbox?.kosucu,
      kuruKosucu: sandbox?.kuruKosucu,
    }));
    await sandbox?.temizle();
  }
  // Tablo raporun (c) maddesi; koşu çıktısında görünür.
  console.log('\n' + raporTablosu(ADAPTOR_TIPLERI.map((t) => raporlar.get(t)!)) + '\n');
}, 120_000);

describe('Sertifikasyon kapsamı', () => {
  it('sekiz adaptörün sekizi de fikstürlü ve sertifikasyondan geçirildi', () => {
    expect(ADAPTOR_TIPLERI).toHaveLength(8);
    expect(Object.keys(FIKSTURLER).sort()).toEqual([...ADAPTOR_TIPLERI].sort());
    expect([...raporlar.keys()].sort()).toEqual([...ADAPTOR_TIPLERI].sort());
    // Fikstür kataloğu adaptör kataloğundan ayrışmaz.
    for (const tip of ADAPTOR_TIPLERI) expect(FIKSTURLER[tip].tip).toBe(tip);
  });

  it('her adaptörde 14 kontrolün 14ü de sonuçlanır ve gerekçelidir', () => {
    for (const tip of ADAPTOR_TIPLERI) {
      const r = raporlar.get(tip)!;
      expect(r.kontroller.map((k) => k.kod)).toEqual([...KONTROL_KODLARI]);
      for (const k of r.kontroller) {
        // `uygulanamaz` da gerekçe taşır: "koşmadı" bilgisi sessiz kalmaz.
        expect(k.gerekce.trim().length).toBeGreaterThan(10);
      }
      expect(r.ozet.gecti + r.ozet.kaldi + r.ozet.uygulanamaz + r.ozet.bilinmiyor).toBe(14);
    }
  });

  it('hiçbir adaptör sözleşmeyi İHLAL etmiyor (tek bir `kaldi` yok)', () => {
    const kalanlar = ADAPTOR_TIPLERI.flatMap((tip) =>
      raporlar.get(tip)!.kontroller
        .filter((k) => k.durum === 'kaldi')
        .map((k) => `${tip}/${k.kod}: ${k.gerekce}`));
    expect(kalanlar).toEqual([]);
    for (const tip of ADAPTOR_TIPLERI) expect(raporlar.get(tip)!.gecerli).toBe(true);
  });
});

describe('Bağlanmayan yedi adaptör: `uygulanamaz` BEKLENEN sonuçtur', () => {
  const bagliOlmayanlar = ADAPTOR_TIPLERI.filter((t) => !(ADAPTORLER[t] as Adaptor).baglanabilir);

  it('yedi adaptör bağlı değildir ve bu doğrudur', () => {
    expect(bagliOlmayanlar).toHaveLength(7);
    expect(bagliOlmayanlar).not.toContain('manual_import');
  });

  it('bağlantı gerektiren kontroller `uygulanamaz` çıkar, `kaldi` DEĞİL', () => {
    for (const tip of bagliOlmayanlar) {
      for (const kod of BAGLANTI_GEREKTIREN) {
        expect(`${tip}/${kod}=${durum(tip, kod)}`).toBe(`${tip}/${kod}=uygulanamaz`);
        // Gerekçe adaptörün kendi `gereken` metnini taşır: ne eksik, yazılı.
        expect(gerekce(tip, kod)).toContain('Adaptör bağlı değil');
      }
    }
  });

  it('sır kontrolü: bağlı olmayan adaptörde eksik sır KUSUR DEĞİLDİR', () => {
    for (const tip of bagliOlmayanlar) {
      /* Adaptörler gereken sırlarını beyan ediyor ama bu kurulumda hiçbiri
         tanımlı değil — bu bekleyen bir kurulum adımıdır. `kaldi` demek,
         kurulumu yapılmamış connector'ı bozuk göstermek olurdu. */
      expect(durum(tip, 'sir_referanslari')).toBe('uygulanamaz');
      expect(gerekce(tip, 'sir_referanslari')).toContain('bekleyen bir kurulum adımı');
    }
  });

  it('bayat connector kontrolü koşucusuz ölçülemez ama sessiz geçmez', () => {
    for (const tip of bagliOlmayanlar) {
      expect(durum(tip, 'bayat_connector')).toBe('uygulanamaz');
      expect(gerekce(tip, 'bayat_connector')).toContain('ölçül');
    }
  });
});

describe('Yapılandırma şeması: sekiz adaptörün sekizi de beyan ediyor', () => {
  it('geçerli yapılandırma kabul, geçersiz yapılandırma reddedildi', () => {
    for (const tip of ADAPTOR_TIPLERI) {
      expect(`${tip}=${durum(tip, 'yapilandirma_semasi')}`).toBe(`${tip}=gecti`);
    }
  });

  it('PASSIVE-FIRST kısıtı şema düzeyinde: aktif işlem izni açılamıyor', () => {
    /* Bu kısıtın şemada olması bilinçli: adaptör gövdesindeki bir `if`
       adaptör yazılırken unutulabilir, şema unutulamaz — yapılandırma
       kaydedilirken reddedilir. */
    const yasaklar: [string, string][] = [
      ['ot_discovery', 'aktifSorgulama'],
      ['vuln_scanner', 'taramaBaslat'],
      ['edr', 'mudahaleIzni'],
      ['network_firewall', 'yazmaIzni'],
      ['backup', 'geriYuklemeIzni'],
      ['siem', 'playbookIzni'],
      ['ad_entra', 'yazmaIzni'],
    ];
    for (const [tip, alan] of yasaklar) {
      const sema = (ADAPTORLER[tip as keyof typeof ADAPTORLER] as unknown as {
        yapilandirmaSemasi: { safeParse(v: unknown): { success: boolean } };
      }).yapilandirmaSemasi;
      expect(`${tip}.${alan}=true → ${sema.safeParse({ [alan]: true }).success}`)
        .toBe(`${tip}.${alan}=true → false`);
      expect(sema.safeParse({ [alan]: false }).success).toBe(true);
    }
  });
});

describe('manual_import: gerçekten koşan tek adaptör', () => {
  const TIP = 'manual_import';

  it('sır gerektirmediğini beyan ediyor: aranacak referans yok', () => {
    expect(durum(TIP, 'sir_referanslari')).toBe('uygulanamaz');
    expect(gerekce(TIP, 'sir_referanslari')).toContain('hiç sır gerektirmediğini');
  });

  it('içerik kontrolleri gerçekten KOŞTU ve geçti', () => {
    for (const kod of ['payload_ayristirici', 'normalize_dogru', 'bilinmeyen_yanlis_degil',
      'yinelenen_tespiti', 'koken_eksiksiz'] as KontrolKodu[]) {
      expect(`${kod}=${durum(TIP, kod)}`).toBe(`${kod}=gecti`);
    }
  });

  it('çekirdek kontrolleri (idempotency, kapsam, kısmî hata, retry) geçti', () => {
    for (const kod of ['idempotency', 'santral_kapsami', 'kismi_basarisizlik',
      'retry_backoff'] as KontrolKodu[]) {
      expect(`${kod}=${durum(TIP, kod)}`).toBe(`${kod}=gecti`);
    }
    // Geri çekilme gerçekten ölçüldü: 1s/4s ve kalıcı hatada tek deneme.
    expect(gerekce(TIP, 'retry_backoff')).toContain('1s/4s');
  });

  it('bayat koşu ve bayat kaynak birlikte raporlanıyor', () => {
    expect(durum(TIP, 'bayat_connector')).toBe('gecti');
    expect(gerekce(TIP, 'bayat_connector')).toContain('kapatıldı');
    expect(gerekce(TIP, 'bayat_connector')).toContain('dk yaşında');
  });

  it('bozuk payload reddediliyor; dead-letter yazımı henüz uygulanmadıysa BİLİNMİYOR kalır', () => {
    const d = durum(TIP, 'bozuk_reddi');
    /* Reddin görünür olması ŞART (sessiz düşüş = kaldi). `ReddedilenKayit`
       satırının yazılması çekirdek sahibinin işi: yazılmıyorsa sonuç
       `bilinmiyor`dur — ne sahte başarı ne haksız başarısızlık. */
    expect(['gecti', 'bilinmiyor']).toContain(d);
    if (d === 'bilinmiyor') {
      expect(gerekce(TIP, 'bozuk_reddi')).toContain('dead-letter');
    }
  });

  it('kuru koşu: uygulandıysa ölçülür, uygulanmadıysa UYDURULMAZ', () => {
    const d = durum(TIP, 'kuru_kosu');
    expect(['gecti', 'uygulanamaz']).toContain(d);
    if (d === 'uygulanamaz') expect(gerekce(TIP, 'kuru_kosu')).toContain('henüz uygulanmadı');
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   HARNESS'IN KENDİ SINAMASI

   Bir kontrolün "geçti" demesi, o kontrolün kusuru YAKALAYABİLDİĞİ
   gösterilmeden bir şey ifade etmez. Aşağıdaki adaptörler kasten
   kusurludur; her biri tek bir kontrolün kırmızıya dönmesini sağlar.
   (Mutasyon sınaması: gerçek adaptörde aynı kusurlar elle üretilip
   testin kırıldığı doğrulandı, sonra geri alındı.) */
describe('Harness kusurları yakalıyor mu (mutasyon sınaması)', () => {
  const temelFikstur = () => fiksturCoz('manual_import');

  function kusurluAdaptor(o: Partial<Adaptor>): Adaptor {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    return {
      tip: 'manual_import',
      baglanabilir: true,
      // Vekil gerçek adaptörü taklit eder: beyanları da ondan devralır.
      yapilandirmaSemasi: gercek.yapilandirmaSemasi,
      gerekenSirlar: gercek.gerekenSirlar,
      testConnection: (b) => gercek.testConnection(b),
      discover: (b) => gercek.discover(b),
      fetchChanges: (b) => gercek.fetchChanges(b),
      normalize: (h, b) => gercek.normalize(h, b),
      validate: (g) => gercek.validate(g),
      health: (b) => gercek.health(b),
      ...o,
    };
  }

  it('bilinmeyen alanı `false`a çeviren adaptör kontrolü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({
        ...g, seriNo: false, macAdresi: '',
      } as unknown as Gozlem)),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'bilinmeyen_yanlis_degil')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('seriNo');
    expect(r.gecerli).toBe(false);
  });

  it('güveni 0 yazan adaptör kontrolü DÜŞÜRÜR (0 ≠ ölçülmedi)', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({
        ...g, koken: { ...g.koken, guven: 0 },
      })),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    expect(r.kontroller.find((x) => x.kod === 'bilinmeyen_yanlis_degil')!.durum).toBe('kaldi');
  });

  it('kararsız kimlik üreten adaptör yinelenen kontrolünü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    let sayac = 0;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({
        ...g, koken: { ...g.koken, kaynakKayitId: `rastgele-${sayac++}` },
      })),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'yinelenen_tespiti')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('kararsız');
  });

  it('bozuk kaydı SESSİZCE düşüren adaptör ret kontrolünü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      // Kimliksiz kaydı hiç üretmiyor: sayaç da sebep de oluşmuyor.
      normalize: (h, b) => gercek.normalize(h, b).filter((g) => !!g.koken.kaynakKayitId),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'bozuk_reddi')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('sessizce düşürdü');
  });

  it('bozuk kaydı GEÇERLİ sayan adaptör ret kontrolünü DÜŞÜRÜR', async () => {
    const bozuk = kusurluAdaptor({
      validate: (g): DogrulamaSonucu => ({ gecerli: g, reddedilen: [] }),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'bozuk_reddi')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('GEÇERLİ sayıldı');
  });

  it('kökensiz gözlem üreten adaptör köken kontrolünü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({
        ...g, koken: { ...g.koken, kaynakSistem: '', toplanma: null },
      } as unknown as Gozlem)),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'koken_eksiksiz')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('kaynakSistem boş');
  });

  it('tanınmayan kolonu ham veriden silen adaptör ayrıştırıcı kontrolünü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({ ...g, ham: { silindi: true } })),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'payload_ayristirici')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('denetim izi eksildi');
  });

  it('tanımsız santral kodunu silen adaptör kapsam kontrolünü DÜŞÜRÜR', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const bozuk = kusurluAdaptor({
      normalize: (h, b) => gercek.normalize(h, b).map((g) => ({ ...g, tesisKodu: null })),
    });
    const r = await sertifikaKos(bozuk, { fikstur: temelFikstur() });
    const k = r.kontroller.find((x) => x.kod === 'santral_kapsami')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('kapsam denetimi kör kalır');
  });

  it('fikstür ile adaptör tipi ayrışırsa harness sessiz kalmaz', async () => {
    await expect(sertifikaKos(ADAPTORLER.edr as Adaptor, { fikstur: temelFikstur() }))
      .rejects.toThrow(/fikstürü uyuşmuyor/);
  });
});

/* Sağlayıcısı bağlı olmayan sır referansı: yanıt 'yok' DEĞİL
   'bilinmiyor'dur ve sertifikayı düşürmez. Bu ayrım kaybolursa kurulumu
   eksik olmayan bir connector "kimlik bilgisi yok" diye raporlanır. */
describe('Sır varlığı: bilinmiyor ≠ yok', () => {
  it('vault referansı `bilinmiyor` döner ve sertifika düşmez', async () => {
    const { BAGLI_OLMAYAN_SAGLAYICI_REFERANSI } = await import('./fixture');
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const adaptor = Object.assign(Object.create(Object.getPrototypeOf(gercek)) as Adaptor, gercek, {
      gerekenSirlar: [BAGLI_OLMAYAN_SAGLAYICI_REFERANSI],
    });
    const r = await sertifikaKos(adaptor, { fikstur: fiksturCoz('manual_import') });
    const k = r.kontroller.find((x) => x.kod === 'sir_referanslari')!;
    expect(k.durum).toBe('bilinmiyor');
    expect(k.gerekce).toContain('DOĞRULANAMADI');
    expect(r.gecerli).toBe(true);          // bilinmiyor kusur DEĞİLDİR
  });

  it('karşılığı GERÇEKTEN var olan sır beyan edilirse kontrol GEÇER', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const adaptor = Object.assign(Object.create(Object.getPrototypeOf(gercek)) as Adaptor, gercek, {
      gerekenSirlar: ['env:UYUM_SERTIFIKA_SANDBOX_SIR'],
    });
    const r = await sertifikaKos(adaptor, { fikstur: fiksturCoz('manual_import') });
    const k = r.kontroller.find((x) => x.kod === 'sir_referanslari')!;
    expect(k.durum).toBe('gecti');
    // Değer RAPORA GİRMEZ: yalnız varlığı bildirilir.
    expect(JSON.stringify(r)).not.toContain(process.env.UYUM_SERTIFIKA_SANDBOX_SIR!);
  });

  it('karşılığı gerçekten olmayan sır beyan edilirse kontrol DÜŞER', async () => {
    const gercek = ADAPTORLER.manual_import as Adaptor;
    const adaptor = Object.assign(Object.create(Object.getPrototypeOf(gercek)) as Adaptor, gercek, {
      gerekenSirlar: ['env:UYUM_SERTIFIKA_TANIMSIZ_SIR'],
    });
    const r = await sertifikaKos(adaptor, { fikstur: fiksturCoz('manual_import') });
    const k = r.kontroller.find((x) => x.kod === 'sir_referanslari')!;
    expect(k.durum).toBe('kaldi');
    expect(k.gerekce).toContain('bulunamadı');
  });
});
