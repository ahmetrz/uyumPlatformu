'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import {
  connectorEtkinlik, connectorKapsamGorunumu, connectorKapsamKaydet,
  connectorKaydet, connectorKuruKosu, connectorSenkronize, connectorTest,
} from '@/lib/eylemler2/entegrasyon';
import { eslemeProfiliBagla } from '@/lib/eylemler2/esleme';
import { connectorCalismaAyari } from '@/lib/eylemler2/connectorCalisma';
import type { KuruOzet } from '@/lib/entegrasyon/kuru';
import type { ConnectorSagligi, EntegrasyonOzeti } from '@/lib/entegrasyon/saglikOzeti';
import {
  CONNECTOR_TIP, KAPSAM_KAYNAK_SOZU, KIMLIK_TIP, ORTAM_SOZU, SENKRON_SOZU,
  TEST_IM, TEST_SOZU,
  etkinEslemeProfili, formSorunlari, formVarsayilani, kapsamCumlesi,
  kapsamDegisti, kapsamUyarilari, kuruEslesmeYazisi,
  kuruSayacYazisi, ortamGerekcesiEksik, ortamRengi, profilYazisi,
  testSonucunuYorumla,
  type ConnectorFormu, type KapsamGorunumu, type TestSonucu,
} from './mantik';

/* Connector YAPILANDIRMA TEZGÂHI — §8'in yazma yüzeyi.

   Bu dosyanın var olma sebebi tek cümleyle: `lib/eylemler2/entegrasyon.ts`
   içindeki dört sunucu eylemi yazılmış, test edilmiş, `/saglik` için
   `revalidatePath` çağırıyor ama HİÇBİR EKRANDAN çağrılmıyordu. Yani ürün
   connector'ı yönetebiliyor görünüyor, kullanıcı ise yalnız okuyabiliyordu.

   Üç değişmez burada görünür hâle gelir:

   1. SIR DEĞERİ FORMA GİRMEZ. Form yalnız sırra giden ADRESİ alır
      (`env:AD`, `dosya:/yol#alan`, `vault:yol#alan`). Kayıtlı adres ekrana
      `sirMaskesi()` çıktısı olarak iner ve forma GERİ DOLDURULMAZ —
      kaydeden kişi neyi kaydettiğini yeniden yazarak beyan eder.
   2. SAHTE BAŞARI YOK. "Bağlantıyı test et" adaptör bağlanamadığında
      `kimlik_bekleniyor` döner; ekran bunu HATA olarak değil, bekleyen
      kurulum adımı olarak gösterir. Eylemin `ok:true` dönmesi "bağlandı"
      demek değildir; bağlanmayı yalnız `baglandi` alanı söyler.
   3. ORTAM BİR GÜVENLİK ALANIDIR. Değiştirmek gerekçe ister ve kendi
      denetim izi satırını bırakır (lib/eylemler2/connectorCalisma.ts).
   4. SANTRAL KAPSAMI DA BİR GÜVENLİK ALANIDIR ve artık BU EKRANDAN
      yazılabilir. Şemadaki `Connector.kapsamTesisleriJson` kolonunu
      çekirdek okuyordu ama ona yazan hiçbir yüzey yoktu; kapsamı
      ayarlamanın tek yolu belgelenmemiş bir yapılandırma anahtarıydı.
      Kapsam kendi bloğunda, kendi kaydetme düğmesiyle ve kendi iz
      satırıyla yaşar (`connectorKapsamKaydet`).

   Modal YOK, snackbar YOK: her şey 420px çekmecede yaşar, sonuç ekranda
   satır olarak kalır. */

const TIPLER = ['ad_entra', 'vuln_scanner', 'edr', 'siem', 'backup',
  'network_firewall', 'ot_discovery', 'manual_import'];
const KIMLIK_TIPLERI = ['none', 'api_key', 'basic',
  'oauth2_client_credentials', 'certificate'];
const ORTAMLAR = ['gelistirme', 'test', 'uretim'];
const SENKRON_KIPLERI = ['delta', 'tam'];

const pasifStil = (pasif: boolean) =>
  (pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined);

/* ── Yapılandırma formu ─────────────────────────────────────────────── */

export function ConnectorYapilandirma({
  c, yazabilir, kapat,
}: { c: ConnectorSagligi | null; yazabilir: boolean; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<ConnectorFormu>(() => formVarsayilani(c));
  const [ayarHatasi, setAyarHatasi] = useState<string | null>(null);

  if (!yazabilir) {
    return (
      <CekmeceEylemler dipNot={'Connector yapılandırmak yönetim yazma yetkisi ister. '
        + 'Bu ekrandan yalnız okuyabilirsiniz.'} />
    );
  }

  const yaz = (k: keyof ConnectorFormu) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setF((o) => ({ ...o, [k]: e.target.value }));

  const sorunlar = formSorunlari(f);
  const gerekceEksik = ortamGerekcesiEksik(f, c?.ortam ?? null);
  const pasif = bekliyor || sorunlar.length > 0 || gerekceEksik;

  /* İKİ AŞAMALI KAYIT ve nedeni:
     `connectorKaydet` kimlik/bağlantı alanlarını yazar; ortam, senkron kipi
     ve devre kesici eşiği ayrı bir eylemdedir (ortam değişimi kendi
     gerekçesini ve kendi iz satırını ister). İkinci aşama patlarsa BİRİNCİ
     AŞAMA GERİ ALINMAZ ama tehlikeli yön güvenlidir: yeni kayıt daima
     `gelistirme` ortamında doğar, mevcut kaydın ortamı ise DEĞİŞMEDEN
     kalır. Yarım kalan aşama sessiz kalmaz, altta hata satırı olarak yazılır. */
  function kaydet() {
    setAyarHatasi(null);
    calistir(
      async () => {
        const birinci = await connectorKaydet({
          id: f.id ?? undefined,
          kod: f.kod.trim(),
          ad: f.ad.trim(),
          tip: f.tip,
          kaynakSistem: f.kaynakSistem.trim(),
          kimlikTipi: f.kimlikTipi,
          sirReferansi: f.sirReferansi.trim() || null,
          pollAralikDk: f.pollAralikDk.trim() ? Number(f.pollAralikDk) : null,
          etkin: c?.etkin ?? false,
        });
        if (!birinci.ok) return birinci;

        const ikinci = await connectorCalismaAyari({
          kod: f.kod.trim().toUpperCase(),
          ortam: f.ortam,
          senkronKipi: f.senkronKipi,
          ardisikHataSiniri: f.ardisikHataSiniri.trim()
            ? Number(f.ardisikHataSiniri) : null,
          gerekce: f.gerekce.trim() || null,
        });
        if (!ikinci.ok) {
          setAyarHatasi('Kimlik/bağlantı alanları kaydedildi, çalışma ayarları '
            + `yazılamadı: ${ikinci.hata}`);
        }
        return ikinci;
      },
      () => { setF((o) => ({ ...o, sirReferansi: '', gerekce: '' })); kapat(); },
    );
  }

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s12)' }}>
        {c ? 'Yapılandırmayı düzenle' : 'Yeni bağlantı'}
      </p>

      <div style={{ display: 'grid', gap: 'var(--s12)' }}>
        <Alan etiket="Kod" zorunlu>
          <input className="ab-gr mono" value={f.kod} onChange={yaz('kod')}
            placeholder="AD-01" spellCheck={false} />
        </Alan>
        <Alan etiket="Ad" zorunlu>
          <input className="ab-gr" value={f.ad} onChange={yaz('ad')}
            placeholder="Kurumsal dizin" />
        </Alan>
        <Alan etiket="Tip" zorunlu>
          <select className="ab-gr" value={f.tip} onChange={yaz('tip')}>
            {TIPLER.map((t) => (
              <option key={t} value={t}>{CONNECTOR_TIP[t] ?? t}</option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Kaynak sistem" zorunlu>
          <input className="ab-gr mono" value={f.kaynakSistem} onChange={yaz('kaynakSistem')}
            placeholder="entra.ornek.local" spellCheck={false} />
        </Alan>
        <Alan etiket="Kimlik tipi">
          <select className="ab-gr" value={f.kimlikTipi} onChange={yaz('kimlikTipi')}>
            {KIMLIK_TIPLERI.map((t) => (
              <option key={t} value={t}>{KIMLIK_TIP[t] ?? t}</option>
            ))}
          </select>
        </Alan>

        <SirAlani f={f} yaz={yaz} kayitliMaske={c?.sirMaskeli ?? null} />

        <Alan etiket="Poll aralığı (dakika)">
          <input className="ab-gr mono" value={f.pollAralikDk} onChange={yaz('pollAralikDk')}
            inputMode="numeric" placeholder="boş = yalnız elle tetiklenir" />
        </Alan>
        <Alan etiket="Ortam" zorunlu>
          <select className="ab-gr" value={f.ortam} onChange={yaz('ortam')}
            style={{ color: ortamRengi(f.ortam) }}>
            {ORTAMLAR.map((o) => (
              <option key={o} value={o}>{ORTAM_SOZU[o]}</option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Senkron kipi">
          <select className="ab-gr" value={f.senkronKipi} onChange={yaz('senkronKipi')}>
            {SENKRON_KIPLERI.map((o) => (
              <option key={o} value={o}>{SENKRON_SOZU[o]}</option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Ardışık hata sınırı">
          <input className="ab-gr mono" value={f.ardisikHataSiniri}
            onChange={yaz('ardisikHataSiniri')} inputMode="numeric"
            placeholder="boş = otomatik duraklatma yok" />
        </Alan>
        <Alan etiket="Gerekçe" zorunlu={gerekceEksik}>
          <input className="ab-gr" value={f.gerekce} onChange={yaz('gerekce')}
            placeholder={c && f.ortam !== c.ortam
              ? 'Ortam değişiyor — dayanağı denetim izine yazılır'
              : 'ortam değişmiyorsa isteğe bağlı'} />
        </Alan>
      </div>

      {sorunlar.length > 0 && (
        <ul style={{ margin: 'var(--s12) 0 0', paddingLeft: 'var(--s16)',
          fontSize: 'var(--t-field)', color: 'var(--md)' }}>
          {sorunlar.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}
      {gerekceEksik && (
        <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
          Ortam {ORTAM_SOZU[c?.ortam ?? ''] ?? 'bilinmiyor'} → {ORTAM_SOZU[f.ortam]}{' '}
          değiştiriliyor; gerekçe zorunlu.
        </p>
      )}

      <div style={{ marginTop: 'var(--s14)' }}>
        <Dugme tur="tam" disabled={pasif} style={pasifStil(pasif)} onClick={kaydet}>
          {bekliyor ? 'Kaydediliyor…' : c ? 'Yapılandırmayı kaydet' : 'Bağlantıyı oluştur'}
        </Dugme>
      </div>

      {(hata || ayarHatasi) && (
        <p role="alert" style={{ margin: 'var(--s12) 0 0',
          fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
          {ayarHatasi ?? hata}
        </p>
      )}

      <p className="ab-panel-dip" style={{ margin: 'var(--s14) 0 0' }}>
        Yeni kayıt taslak ve pasif doğar; koşmaya başlaması için ayrıca
        etkinleştirilmesi gerekir. Her kayıt denetim izine yazılır; sır
        DEĞERİ hiçbir izde, logda ve yanıtta yer almaz. Adaptör
        yapılandırması (JSON) bu formdan GEÇMEZ ve bu yüzden kaydederken
        DOKUNULMADAN kalır — eskiden buradan kaydetmek onu sessizce
        siliyordu.
      </p>

      {c && <KapsamAlani c={c} />}
    </div>
  );
}

/* ── Santral kapsamı ───────────────────────────────────────────────────

   Kapsam, connector'ın YAZABİLECEĞİ santrallerin listesidir; bir güvenlik
   sınırıdır ve yapılandırmanın geri kalanından ayrı kaydedilir. Ayrı
   olmasının sebebi kayıt sırasının güvenliği: bu blok kaydedilmezse
   yukarıdaki alanların kaydı da kapsamı DEĞİŞTİRMEZ.

   Blok yalnız KAYITLI connector'da görünür — kapsam bir kimliğe bağlanır,
   henüz var olmayan kayda değil. */
function KapsamAlani({ c }: { c: ConnectorSagligi }) {
  const [gorunum, setGorunum] = useState<KapsamGorunumu | null>(null);
  const [okumaHatasi, setOkumaHatasi] = useState<string | null>(null);
  const [secili, setSecili] = useState<string[]>([]);
  const [gerekce, setGerekce] = useState('');
  const [yukleniyor, setYukleniyor] = useState(true);
  const { bekliyor, hata, calistir } = useEylem();

  /* Kapsam SUNUCUDAN okunur, ekranda türetilmez: yürürlükteki listeyi
     çekirdeğin kendi fonksiyonu hesaplar (bkz. connectorKapsamGorunumu).
     Ekranın gösterdiği kapsam ile koşuda uygulanan kapsam böylece
     ayrışamaz. Okunamıyorsa BOŞ LİSTE gösterilmez — "sınır yok" ile
     "okunamadı" aynı şey değildir. */
  const uygula = useCallback((y: Awaited<ReturnType<typeof connectorKapsamGorunumu>>) => {
    if (!y.ok) {
      setOkumaHatasi(y.hata);
      setGorunum(null);
    } else {
      setOkumaHatasi(null);
      setGorunum({
        kodlar: y.kodlar, kaynak: y.kaynak, mirasKodlari: y.mirasKodlari,
        varsayilanTesisKodu: y.varsayilanTesisKodu, secenekler: y.secenekler,
      });
      setSecili(y.kodlar);
    }
    setYukleniyor(false);
  }, []);

  const yenile = useCallback(() => {
    connectorKapsamGorunumu(c.id).then(uygula, (e: unknown) => {
      setGorunum(null);
      setOkumaHatasi(e instanceof Error ? e.message : 'okunamadı');
      setYukleniyor(false);
    });
  }, [c.id, uygula]);

  /* Effect yalnız isteği BAŞLATIR; durum tazelemesi yanıtın geri
     çağrısındadır. Çekmece kapanırsa gelen yanıt yok sayılır. */
  useEffect(() => {
    let iptal = false;
    connectorKapsamGorunumu(c.id).then(
      (y) => { if (!iptal) uygula(y); },
      (e: unknown) => {
        if (iptal) return;
        setGorunum(null);
        setOkumaHatasi(e instanceof Error ? e.message : 'okunamadı');
        setYukleniyor(false);
      },
    );
    return () => { iptal = true; };
  }, [c.id, uygula]);

  if (yukleniyor) {
    return (
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: 0 }}>Santral kapsamı</p>
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>Okunuyor…</p>
      </div>
    );
  }

  if (!gorunum) {
    return (
      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: 0 }}>Santral kapsamı</p>
        <p role="alert" style={{ margin: 'var(--s8) 0 0',
          fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
          Kapsam okunamadı: {okumaHatasi ?? 'bilinmeyen sebep'}
        </p>
      </div>
    );
  }

  const degisti = kapsamDegisti(gorunum.kodlar, secili);
  const uyarilar = kapsamUyarilari(secili, gorunum);
  const pasif = bekliyor || !degisti;

  const cevir = (kod: string) => setSecili((o) =>
    (o.includes(kod) ? o.filter((x) => x !== kod) : [...o, kod]));

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>Santral kapsamı</p>
      <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--md)' }}>
        Kayıtlı: {kapsamCumlesi(gorunum.kodlar)}
      </p>
      <p style={{ margin: 'var(--s4) 0 var(--s12)',
        fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
        Kaynak · {KAPSAM_KAYNAK_SOZU[gorunum.kaynak]}
      </p>

      <div style={{ display: 'grid', gap: 'var(--s6)' }}>
        {gorunum.secenekler.length === 0 && (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--md)' }}>
            Tanımlı santral yok.
          </p>
        )}
        {gorunum.secenekler.map((t) => (
          <label key={t.kod} style={{ display: 'flex', gap: 'var(--s8)',
            alignItems: 'baseline', fontSize: 'var(--t-field)' }}>
            <input type="checkbox" checked={secili.includes(t.kod)}
              onChange={() => cevir(t.kod)} />
            <span className="mono">{t.kod}</span>
            <span style={{ color: 'var(--md)' }}>{t.ad}</span>
          </label>
        ))}
      </div>

      <div style={{ marginTop: 'var(--s12)' }}>
        <Alan etiket="Gerekçe">
          <input className="ab-gr" value={gerekce}
            onChange={(e) => setGerekce(e.target.value)}
            placeholder="kapsam değişimi denetim izine yazılır" />
        </Alan>
      </div>

      {uyarilar.length > 0 && (
        <ul style={{ margin: 'var(--s12) 0 0', paddingLeft: 'var(--s16)',
          fontSize: 'var(--t-field)', color: 'var(--md)' }}>
          {uyarilar.map((x) => <li key={x}>{x}</li>)}
        </ul>
      )}

      <div style={{ marginTop: 'var(--s14)' }}>
        <Dugme tur="tam" disabled={pasif} style={pasifStil(pasif)}
          onClick={() => calistir(
            () => connectorKapsamKaydet({
              connectorId: c.id, tesisKodlari: secili,
              gerekce: gerekce.trim() || null,
            }),
            () => { setGerekce(''); yenile(); },
          )}>
          {bekliyor ? 'Kaydediliyor…' : degisti ? 'Kapsamı kaydet' : 'Kapsam değişmedi'}
        </Dugme>
      </div>

      {hata && (
        <p role="alert" style={{ margin: 'var(--s12) 0 0',
          fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{hata}</p>
      )}

      <p className="ab-panel-dip" style={{ margin: 'var(--s14) 0 0' }}>
        Kapsam connector&apos;ın YAZABİLECEĞİ santralleri sınırlar: kapsam dışı
        santral adına gelen kayıt reddedilir, koşu sayacında görünür ve tek
        satır bile yazılmaz. Hiçbir santral seçmemek sınırı KALDIRIR.
      </p>
    </div>
  );
}

/** Sır referansı alanı — değerin DEĞİL, adresin girildiği tek yer. */
function SirAlani({ f, yaz, kayitliMaske }: {
  f: ConnectorFormu;
  yaz: (k: keyof ConnectorFormu) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  kayitliMaske: string | null;
}) {
  return (
    <div>
      <Alan etiket="Sır referansı" zorunlu={f.kimlikTipi !== 'none'}>
        <input className="ab-gr mono" value={f.sirReferansi} onChange={yaz('sirReferansi')}
          spellCheck={false} autoComplete="off"
          placeholder="env:AD_BIND_PAROLA · dosya:/run/secrets/ad#parola" />
      </Alan>
      {kayitliMaske && (
        <p className="mono" style={{ margin: 'var(--s8) 0 0',
          fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
          Kayıtlı adres · {kayitliMaske}
        </p>
      )}
      <p className="ab-panel-dip" style={{ margin: 'var(--s6) 0 0' }}>
        Buraya sırrın KENDİSİ değil, sırra giden adres yazılır. Kayıtlı adres
        forma geri doldurulmaz; kaydederken yeniden yazmanız gerekir.
      </p>
    </div>
  );
}

/* ── Bağlantı testi · senkronizasyon · etkinlik ─────────────────────── */

export function ConnectorEylemleri({
  c, yazabilir,
}: { c: ConnectorSagligi; yazabilir: boolean }) {
  const [bekliyor, baslat] = useTransition();
  const [test, setTest] = useState<TestSonucu | null>(null);
  const [senkron, setSenkron] = useState<string | null>(null);
  const [kuru, setKuru] = useState<{ durum: string; ozet: KuruOzet | null } | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const { bekliyor: etkinlikBekliyor, hata: etkinlikHatasi, calistir } = useEylem();

  if (!yazabilir) {
    return (
      <CekmeceEylemler dipNot={'Bağlantı testi ve senkronizasyon yönetim yazma '
        + 'yetkisi ister.'} />
    );
  }

  function testEt() {
    setHata(null); setSenkron(null); setKuru(null);
    baslat(async () => {
      /* Sonuç YORUMLANIR, uydurulmaz: `ok:true` yalnız eylemin koştuğunu
         söyler; bağlanıp bağlanmadığını `baglandi` söyler. */
      setTest(testSonucunuYorumla(await connectorTest(c.id)));
    });
  }

  function senkronizeEt() {
    setHata(null); setTest(null); setKuru(null);
    baslat(async () => {
      const y = await connectorSenkronize(c.id, 'manuel');
      if (y.ok) setSenkron(`${y.ozet.durum} · ${y.ozet.ayrinti}`);
      else setHata(y.hata);
    });
  }

  /* KURU KOŞU pasif connector'da da yapılabilir — asıl kullanımı budur:
     "bunu etkinleştirseydim ne olurdu". Gerçek koşu pasifte atlanır. */
  function kuruKos() {
    setHata(null); setTest(null); setSenkron(null);
    baslat(async () => {
      const y = await connectorKuruKosu(c.id);
      if (y.ok) setKuru({ durum: y.ozet.durum, ozet: y.ozet.kuruOzet });
      else setHata(y.hata);
    });
  }

  const mesgul = bekliyor || etkinlikBekliyor;

  return (
    <CekmeceEylemler
      birincil={
        <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
          <Dugme tur="tam" disabled={mesgul} style={pasifStil(mesgul)} onClick={testEt}>
            {bekliyor ? 'Deneniyor…' : 'Bağlantıyı test et'}
          </Dugme>
          <Dugme disabled={mesgul} style={pasifStil(mesgul)} onClick={kuruKos}>
            Kuru koş · hiçbir şey yazmaz
          </Dugme>
          <Dugme disabled={mesgul} style={pasifStil(mesgul)} onClick={senkronizeEt}>
            Şimdi senkronize et
          </Dugme>
          <Dugme disabled={mesgul} style={pasifStil(mesgul)}
            onClick={() => calistir(() => connectorEtkinlik(c.id, !c.etkin, null))}>
            {c.etkin ? 'Otomatik koşuyu duraklat' : 'Otomatik koşuya aç'}
          </Dugme>
        </div>
      }
      ikincil={
        <>
          {test && <TestSatiri sonuc={test} />}
          {kuru && <KuruSonucu durum={kuru.durum} ozet={kuru.ozet} />}
          {senkron && (
            <p className="mono" style={{ margin: 'var(--s12) 0 0',
              fontSize: 'var(--t-label)', color: 'var(--i2)' }}>{senkron}</p>
          )}
          {(hata || etkinlikHatasi) && (
            <p role="alert" style={{ margin: 'var(--s12) 0 0',
              fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
              {hata ?? etkinlikHatasi}
            </p>
          )}
        </>
      }
      dipNot={'Test bir koşu kaydı bırakmaz; senkronizasyon ve kuru koşu '
        + 'bırakır. Kuru koşu kaydı GERÇEK koşu sayılmaz: yalnız kuru koşmuş '
        + 'bir connector hâlâ "hiç koşmadı" görünür, çünkü hiç veri yazılmamıştır. '
        + 'Bağlanamayan adaptör "başarılı" dönmez — kimlik bekleyen bir '
        + 'kurulum adımı olarak işaretlenir.'}
    />
  );
}

/** Test sonucunun tek satırlık gösterimi. Durum sözcüğü işaretçinin
    yanında değil, ayrıntı metninin ÜSTÜNDE yaşar; bu blok bir sonuç
    bildirimidir, satır durumu değildir. */
function TestSatiri({ sonuc }: { sonuc: TestSonucu }) {
  const im = TEST_IM[sonuc.tur];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
      gap: 'var(--s8)', alignItems: 'start', marginTop: 'var(--s12)' }}>
      <span style={{ paddingTop: 3 }}><Im durum={im} ad={TEST_SOZU[sonuc.tur]} /></span>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--t-field)',
          color: `var(--${im})` }}>{TEST_SOZU[sonuc.tur]}</span>
        <span className="mono" style={{ display: 'block', marginTop: 2,
          fontSize: 'var(--t-label)', color: 'var(--i3)', wordBreak: 'break-word' }}>
          {sonuc.ayrinti}
        </span>
      </span>
    </div>
  );
}

/** Kuru koşunun "olsaydı ne olurdu" tablosu. Gerçek koşu sonucuyla aynı
    biçimde YAZILMAZ: kuru koşu satırı `pl` işaretçisi alır ve metni
    daima gelecek zamanlıdır. */
function KuruSonucu({ durum, ozet }: { durum: string; ozet: KuruOzet | null }) {
  return (
    <div style={{ marginTop: 'var(--s12)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
        gap: 'var(--s8)', alignItems: 'start' }}>
        <span style={{ paddingTop: 3 }}>
          <Im durum={durum === 'basarisiz' ? 'bd' : 'pl'} ad="Kuru koşu — hiçbir kayıt yazılmadı" />
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--t-field)', color: 'var(--pl)' }}>
            Kuru koşu · hiçbir kayıt yazılmadı, imleç ilerlemedi
          </span>
          {ozet ? (
            <>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {kuruSayacYazisi(ozet.sayaclar)}
              </span>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {kuruEslesmeYazisi(ozet.sayaclar)}
              </span>
            </>
          ) : (
            <span style={{ display: 'block', marginTop: 2,
              fontSize: 'var(--t-label)', color: 'var(--unk)' }}>
              Rapor üretilemedi — koşu {durum} ile kapandı.
            </span>
          )}
        </span>
      </div>
      {ozet && <KuruAyrinti ozet={ozet} />}
    </div>
  );
}

/** Ret sebepleri ve kuru koşunun KENDİ SINIRLARI. Uyarılar gizlenmez:
    kuru koşunun ölçemediği şey, ölçtüğü kadar önemlidir. */
export function KuruAyrinti({ ozet }: { ozet: KuruOzet }) {
  return (
    <>
      {ozet.eslemeProfili && (
        <p className="mono" style={{ margin: 'var(--s8) 0 0',
          fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
          eşleme profili · {ozet.eslemeProfili.kod} v{ozet.eslemeProfili.surum}
        </p>
      )}
      {ozet.redSebepleri.length > 0 && (
        <ul style={{ margin: 'var(--s8) 0 0', paddingLeft: 'var(--s16)',
          fontSize: 'var(--t-label)', color: 'var(--md)' }}>
          {ozet.redSebepleri.slice(0, 5).map((r) => (
            <li key={r.sebep}>{r.sebep} · {r.adet}</li>
          ))}
        </ul>
      )}
      {ozet.uyarilar.length > 0 && (
        <ul style={{ margin: 'var(--s8) 0 0', paddingLeft: 'var(--s16)',
          fontSize: 'var(--t-label)', color: 'var(--unk)' }}>
          {ozet.uyarilar.map((u) => <li key={u}>{u}</li>)}
        </ul>
      )}
      {ozet.ornekler.length > 0 && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
          {ozet.ornekler.length} örnek kayıt hesaplandı (sınır {ozet.ornekSiniri}).
        </p>
      )}
    </>
  );
}

/* ── Eşleme profili bağlama ─────────────────────────────────────────── */

/**
 * Connector'ın eşleme profilini bağlar. Profil TİPE aittir ve sürümü asla
 * güncellenmez; bu yüzden seçenekler daima `kod vN` biçiminde yazılır —
 * hangi sürümün koştuğu, kuralın ne yaptığı kadar önemlidir.
 */
export function EslemeProfilSecimi({
  c, ozet, yazabilir,
}: { c: ConnectorSagligi; ozet: EntegrasyonOzeti; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [secim, setSecim] = useState<string>(c.eslemeProfilId ?? '');

  const uygun = ozet.eslemeProfilleri.filter((p) => p.connectorTipi === c.tip);
  const etkin = etkinEslemeProfili(c, ozet.eslemeProfilleri);

  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Eşleme profili</p>
      <p className="mono" style={{ margin: 0, fontSize: 'var(--t-field)',
        color: etkin.kaynak === 'bagli' && !etkin.profil ? 'var(--bd)' : 'var(--i2)' }}>
        {profilYazisi(etkin)}
      </p>

      {yazabilir && (
        <>
          <div style={{ marginTop: 'var(--s12)' }}>
            <Alan etiket="Bağlı profil">
              <select className="ab-gr" value={secim} disabled={bekliyor}
                onChange={(e) => setSecim(e.target.value)}>
                <option value="">Tipin etkin profili (bağ yok)</option>
                {uygun.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.kod} v{p.surum} · {p.ad} · {p.durum}
                  </option>
                ))}
              </select>
            </Alan>
          </div>
          <div style={{ marginTop: 'var(--s12)' }}>
            <Dugme disabled={bekliyor || secim === (c.eslemeProfilId ?? '')}
              style={pasifStil(bekliyor || secim === (c.eslemeProfilId ?? ''))}
              onClick={() => calistir(() => eslemeProfiliBagla(c.id, secim || null))}>
              {bekliyor ? 'Bağlanıyor…' : 'Profili bağla'}
            </Dugme>
          </div>
          {hata && (
            <p role="alert" style={{ margin: 'var(--s10) 0 0',
              fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{hata}</p>
          )}
        </>
      )}

      <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Profil sürümü asla güncellenmez: her yayın yeni bir sürüm açar, eskisi
        arşive geçer. Eski içe aktarımlar hangi sürümle yorumlandıysa öyle kalır.
      </p>
    </div>
  );
}
