'use client';
import { Bar, Im, type Durum } from '@/components/abacus/temel';
import {
  CekmeceKimlik, CekmeceAlanlar, CekmeceBagli,
} from '@/components/abacus/panel';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import type {
  ConnectorSagligi, EntegrasyonOzeti, KosuSatiri,
} from '@/lib/entegrasyon/saglikOzeti';
import { MotorCalistir } from './Eylemler';
import {
  ConnectorEylemleri, ConnectorYapilandirma, EslemeProfilSecimi, KuruAyrinti,
} from './Yapilandirma';
import {
  CONNECTOR_TIP, ENTEGRASYON_ACIKLAMA, ENTEGRASYON_IM, ENTEGRASYON_SOZU,
  KIMLIK_TIP, TETIKLEYEN, VADE_IM,
  devreKesiciIlerlemesi, kaliteImi, kisalt, kuruEslesmeYazisi, kuruImi,
  hataSinifiYazisi, sirBeyanImi, sirBeyanYazisi,
  kuruSayacYazisi, maskeSaglayicisi, motorCumlesi, motorImi,
  motorSozu, ortamRengi, ortamYazisi, saglayiciImi, saglayiciNotu, senkronYazisi,
  sonKosu, sureFmt, tazelikDurumu, tazelikYazisi, vadeCevabi,
  type KaliteBulgusu, type Kosu, type Motor,
} from './mantik';

/* Platform sağlığının ÜÇ kayıt ailesinin çekmece gövdeleri.

   Ayrı dosyada duruyorlar çünkü SaglikIstemci yalnız canvası (kip anahtarı +
   tablo) kurar; kayıt detayı ondan bağımsız okunur ve değişir. Durum sözcüğü
   yalnız burada — kimlik bloğunda — yazılır (06 §A2). Modal YOK: hepsi 420px
   çekmecede render edilir. */

/* ── Çekmece · motor ────────────────────────────────────────────────── */

export function MotorOzeti({ motor, yazabilir }: { motor: Motor; yazabilir: boolean }) {
  const s = sonKosu(motor);
  const im = motorImi(motor);

  return (
    <>
      <CekmeceKimlik durum={im} soz={motorSozu(motor)} baslik={motor.etiket}
        cumle={motorCumlesi(motor)} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Başlangıç', deger: s ? zamanTR(s.baslangic) : 'koşu kaydı yok',
          durum: s ? undefined : 'unk' },
        { etiket: 'Bitiş · süre',
          deger: s ? `${s.bitis ? zamanTR(s.bitis) : 'bitmedi'} · ${sureFmt(s.sureMs)}` : '—',
          durum: s && !s.bitis ? 'pl' : undefined },
        { etiket: 'İşlenen → üretilen', deger: s ? `${s.islenen} → ${s.uretilen}` : '—' },
        { etiket: 'Tetikleme',
          deger: motor.elleCalisir ? 'elle ya da zamanlanmış' : 'yalnız zincirden' },
      ]} />

      {s?.hata && <HataBlogu metin={s.hata} />}

      <KosuListesi kosular={motor.kosular} />

      <MotorCalistir motor={motor} yazabilir={yazabilir} />
    </>
  );
}

/** Motorun son koşuları — Ozalit'te bu liste tek bir global tabloydu ve
    modalla açılıyordu; artık kaydın kendi çekmecesinde yaşıyor. */
function KosuListesi({ kosular }: { kosular: Kosu[] }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Son koşular</p>
      {kosular.length === 0 ? (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Bu motor hiç koşmadı — sağlıklı olduğu anlamına gelmez.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {kosular.map((k) => (
            <div key={k.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              alignItems: 'start', gap: 'var(--s8)' }}>
              <span style={{ paddingTop: 3 }}>
                <Im durum={kosuImi(k.durum)} ad={kosuAdi(k.durum)} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                  {zamanTR(k.baslangic)}
                </span>
                <span className="mono" style={{ display: 'block', marginTop: 2,
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {k.islenen} → {k.uretilen} · {sureFmt(k.sureMs)}
                  {k.denemeNo > 1 && ` · ${k.denemeNo}. deneme`}
                </span>
                {k.hata && (
                  <span style={{ display: 'block', marginTop: 4,
                    fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                    {kisalt(k.hata, 140)}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function kosuImi(durum: string): Durum {
  if (durum === 'basarili') return 'ok';
  if (durum === 'basarisiz') return 'bd';
  if (durum === 'calisiyor') return 'pl';
  return 'unk';
}

function kosuAdi(durum: string): string {
  if (durum === 'basarili') return 'Koşu tamamlandı';
  if (durum === 'basarisiz') return 'Koşu hata ile bitti';
  if (durum === 'calisiyor') return 'Koşu sürüyor';
  return 'Koşu durumu bilinmiyor';
}

/* ── Çekmece · connector ────────────────────────────────────────────── */

export function ConnectorOzeti({ c, ozet, yazabilir, kapat }: {
  c: ConnectorSagligi; ozet: EntegrasyonOzeti; yazabilir: boolean; kapat: () => void;
}) {
  const im = ENTEGRASYON_IM[c.durum];
  const s = c.sonKosu;
  const hataMetni = s?.hata ?? c.sonHata;
  /* Renk `durum`dan gelir, `hata` alanının doluluğundan DEĞİL: başarılı bir
     koşu da geçmiş bir hata metni taşıyabilir. */
  const hataliMi = c.durum === 'basarisiz' || c.durum === 'bayat_kosu';
  const devreKesici = devreKesiciIlerlemesi(c);

  return (
    <>
      <CekmeceKimlik durum={im} soz={ENTEGRASYON_SOZU[c.durum]} baslik={c.ad}
        cumle={ENTEGRASYON_ACIKLAMA[c.durum]} />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Tip · kaynak sistem',
          deger: `${CONNECTOR_TIP[c.tip] ?? etiketle(c.tip)} · ${c.kaynakSistem}` },
        { etiket: 'Kayıt durumu',
          deger: `${etiketle(c.kayitDurumu)} · `
            + `${c.etkin ? 'otomatik koşuya açık' : 'otomatik koşuya kapalı'}` },
        { etiket: 'Son başarılı koşu',
          deger: c.sonBasariliKosu ? zamanTR(c.sonBasariliKosu) : 'hiç',
          durum: c.sonBasariliKosu ? undefined : 'unk' },
        { etiket: 'Veri tazeliği', deger: tazelikYazisi(c.tazelik),
          durum: tazelikDurumu(c.tazelik) },
        /* ORTAM bir güvenlik bilgisidir ve kendi satırında yazılır: üretim
           sistemine bakan bir kaydı test sanmak en kolay yapılan hatadır.
           Bilinmiyorsa "geliştirme" varsayılmaz. */
        { etiket: 'Ortam · senkron kipi',
          deger: (
            <span>
              <span style={{ color: ortamRengi(c.ortam) }}>{ortamYazisi(c.ortam)}</span>
              {' · '}{senkronYazisi(c.senkronKipi)}
            </span>
          ),
          durum: c.ortam === null ? 'unk' : undefined },
        /* Devre kesici bir DAMGA değil, bir İLERLEMEDİR: kullanıcı
           devrenin ne zaman keseceğini görmeli ("3/5 ardışık hata"). */
        { etiket: 'Devre kesici', deger: devreKesici.metin,
          durum: devreKesici.durum === 'ok' ? undefined : devreKesici.durum },
      ]} />

      {devreKesici.oran !== null && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s12)' }}>
          <Bar oran={devreKesici.oran}
            durum={devreKesici.durum === 'ok' ? 'ok' : devreKesici.durum === 'md' ? 'md' : 'bd'}
            deger={devreKesici.metin} />
        </div>
      )}

      {c.sonHataOzeti && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s16)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>Son hatanın izi</p>
          <p className="mono" style={{ margin: 0, fontSize: 'var(--t-label)',
            color: 'var(--i2)', wordBreak: 'break-word' }}>{c.sonHataOzeti}</p>
          <p className="ab-panel-dip" style={{ margin: 'var(--s6) 0 0' }}>
            Aynı iz tekrar ediyorsa hata da tekrar ediyor demektir.
          </p>
        </div>
      )}

      <GerekenSirlar c={c} />

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
        <p className="ab-panel-dip" style={{ margin: 0 }}>{c.tazelik.aciklama}</p>
      </div>

      {/* Hiç koşmamış connector, durumu başka bir sebeple gölgelense bile
          bunu saklamaz. */}
      {c.hicKosmadi && c.durum !== 'hic_kosmadi' && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s16)' }}>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Hiç koşu kaydı yok; yukarıdaki durum başka bir kaynaktan geliyor.
          </p>
        </div>
      )}

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
        <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Kimlik · sır referansı</p>
        <p className="mono" style={{ margin: 0, fontSize: 'var(--t-field)' }}>
          {KIMLIK_TIP[c.kimlikTipi] ?? etiketle(c.kimlikTipi)}
          {c.kimlikTipi === 'none' ? '' : ` · ${c.sirMaskeli}`}
        </p>
        <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>
          Yalnız sırra giden adres gösterilir. Kimlik bilgisinin kendisi
          veritabanında tutulmaz, loglanmaz ve bu ekrana hiçbir koşulda gelmez.
        </p>
        {c.kimlikGerekce && (
          <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)',
            color: 'var(--pl)' }}>
            {c.kimlikGerekce}
          </p>
        )}
        <SaglayiciSatiri sirMaskeli={c.sirMaskeli} ozet={ozet} />
      </div>

      <ZamanlayiciBlogu c={c} ozet={ozet} />

      {c.imlec && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Senkronizasyon imleci</p>
          <p className="mono" style={{ margin: 0, fontSize: 'var(--t-label)',
            wordBreak: 'break-all', color: 'var(--i2)' }}>{c.imlec}</p>
        </div>
      )}

      {s && (s.reddedilen > 0 || s.sayacTutarsiz || s.yinelenenTutarsiz || s.ayrinti) && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Son koşunun sayaçları</p>
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            {s.alinan} alındı · {s.kabulEdilen} kabul · {s.reddedilen} red ·
            {' '}{s.yinelenen} yinelenen
          </p>
          {/* `ayrinti` bir başarısızlık DEĞİLDİR — bilgi notudur. */}
          {s.ayrinti && s.ayrinti !== hataMetni && (
            <p className="ab-panel-dip" style={{ margin: 'var(--s8) 0 0' }}>{s.ayrinti}</p>
          )}
          {s.reddSebebiEksik && (
            <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
              {s.reddedilen} kayıt reddedildi ama sebebi yazılmamış — reddedilen
              kayıtlar sessizce yok sayılmış olabilir.
            </p>
          )}
          {/* Çekirdeğin sözleşmesi: alinan = kabul + red; yinelenen ⊆ kabul.
              Yinelenen ayrı bir kova DEĞİLDİR — delta koşuda yinelenen
              normaldir ve tutarsızlık sayılmaz. */}
          {s.sayacTutarsiz && (
            <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
              Sayaçlar tutmuyor: alınan ≠ kabul + red.
            </p>
          )}
          {s.yinelenenTutarsiz && (
            <p style={{ margin: 'var(--s8) 0 0', fontSize: 'var(--t-field)', color: 'var(--md)' }}>
              Yinelenen sayısı kabul edileni aşıyor; yinelenen kabul edilenlerin
              alt kümesi olmalıydı.
            </p>
          )}
        </div>
      )}

      {hataMetni && (hataliMi
        ? <HataBlogu metin={hataMetni} />
        : (
          <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
            <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Önceki hata</p>
            {/* Hata metni duruyor ama connector artık hatalı değil: kaybolmaz,
                ama kritik renge de boyanmaz. */}
            <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
              {kisalt(hataMetni, 220)}
            </p>
          </div>
        ))}

      <ConnectorGecmisi gecmis={c.gecmis} />
      <KuruGecmisi c={c} />

      <EslemeProfilSecimi c={c} ozet={ozet} yazabilir={yazabilir} />
      <ConnectorEylemleri c={c} yazabilir={yazabilir} />
      <ConnectorYapilandirma key={c.id} c={c} yazabilir={yazabilir} kapat={kapat} />
    </>
  );
}

/** Adaptörün BEYAN ETTİĞİ sırlar ve varlıkları. Sırrın DEĞERİ okunmaz;
    `sirVarMi()` yalnız var/yok/bilinmiyor der ve `bilinmiyor` ile `yok`
    ekranda da karıştırılmaz. */
function GerekenSirlar({ c }: { c: ConnectorSagligi }) {
  const sirlar = c.gerekenSirlar;
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s20)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Adaptörün istediği sırlar
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
        gap: 'var(--s8)', alignItems: 'start' }}>
        <span style={{ paddingTop: 3 }}>
          <Im durum={sirBeyanImi(sirlar)} ad={sirBeyanYazisi(sirlar)} />
        </span>
        <span style={{ fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
          {sirBeyanYazisi(sirlar)}
        </span>
      </div>
      {sirlar && sirlar.length > 0 && (
        <div style={{ display: 'grid', gap: 'var(--s6)', marginTop: 'var(--s10)' }}>
          {sirlar.map((x) => (
            <p key={x.referans} className="mono" style={{ margin: 0,
              fontSize: 'var(--t-label)',
              color: x.durum === 'var' ? 'var(--i3)'
                : x.durum === 'yok' ? 'var(--pl)' : 'var(--unk)' }}>
              {x.maske}{x.sebep ? ` · ${x.sebep}` : ''}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** Yeni bağlantı çekmecesi — kayıt yokken yalnız form yaşar. */
export function YeniConnector({ yazabilir, kapat }: {
  yazabilir: boolean; kapat: () => void;
}) {
  return (
    <>
      <CekmeceKimlik durum="unk" soz="Kayıt yok" baslik="Yeni bağlantı"
        cumle={'Bağlantı taslak ve pasif doğar. Kimlik bilgisinin kendisi değil, '
          + 'sırra giden adres girilir; koşmaya başlaması ayrıca etkinleştirme ister.'} />
      <ConnectorYapilandirma key="yeni" c={null} yazabilir={yazabilir} kapat={kapat} />
    </>
  );
}

/**
 * Kuru koşu geçmişi — GERÇEK koşulardan AYRI listede.
 *
 * Aynı listede dursalardı sağlık durumu son kuru koşudan okunur ve hiç veri
 * getirmemiş bir entegrasyon "başarılı" görünürdü. Bu blok bu yüzden kendi
 * başlığını taşır ve metni daima "yazılmadı" der.
 */
function KuruGecmisi({ c }: { c: ConnectorSagligi }) {
  if (c.kuruGecmis.length === 0) return null;
  const son = c.sonKuruKosu;
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        Kuru koşular · {c.kuruGecmis.length}
      </p>
      <div style={{ display: 'grid', gap: 'var(--s10)' }}>
        {c.kuruGecmis.slice(0, 4).map((g) => (
          <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
            gap: 'var(--s8)', alignItems: 'start' }}>
            <span style={{ paddingTop: 3 }}>
              <Im durum={kuruImi(g)} ad="Kuru koşu — hiçbir kayıt yazılmadı" />
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                {zamanTR(g.baslangic)} · {TETIKLEYEN[g.tetikleyen] ?? etiketle(g.tetikleyen)}
              </span>
              <span className="mono" style={{ display: 'block', marginTop: 2,
                fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                {g.kuruOzet
                  ? kuruSayacYazisi(g.kuruOzet.sayaclar)
                  : g.kuruOzetBozuk
                    ? 'kuru koşu raporu okunamadı — sayaçlar kayıp'
                    : 'kuru koşu raporu yazılmamış'}
              </span>
              {g.kuruOzet && (
                <span className="mono" style={{ display: 'block', marginTop: 2,
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {kuruEslesmeYazisi(g.kuruOzet.sayaclar)}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
      {son?.kuruOzet && <KuruAyrinti ozet={son.kuruOzet} />}
      <p className="ab-panel-dip" style={{ margin: 'var(--s12) 0 0' }}>
        Kuru koşu hiçbir kayıt yazmaz ve imleci ilerletmez; bu yüzden GERÇEK
        koşu sayılmaz. Yalnız kuru koşmuş bir connector hâlâ &quot;hiç
        koşmadı&quot; ve verisi &quot;tazeliği bilinmiyor&quot; görünür.
      </p>
    </div>
  );
}

/** "Bu connector neden senkronize olmuyor?" — cevabı zamanlayıcı verir.
    Sebep metni `lib/is/zamanlayici.ts` üretir; ekran onu YENİDEN YAZMAZ. */
function ZamanlayiciBlogu({ c, ozet }: { c: ConnectorSagligi; ozet: EntegrasyonOzeti }) {
  const cevap = vadeCevabi(ozet.zamanlayici, c.id);
  const im = VADE_IM[cevap.tur];
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Zamanlayıcı</p>
      <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
        gap: 'var(--s8)', alignItems: 'start' }}>
        <span style={{ paddingTop: 3 }}>
          <Im durum={im} ad={cevap.tur === 'vadeli' ? 'Vadesi geldi'
            : cevap.tur === 'koşmuyor' ? 'Otomatik koşmuyor' : 'Zamanlayıcı durumu bilinmiyor'} />
        </span>
        <span style={{ fontSize: 'var(--t-field)', color: 'var(--i2)' }}>{cevap.cumle}</span>
      </div>
    </div>
  );
}

/** Bu connector'ın sırrının yaşadığı sağlayıcı bağlı mı? Bağlı değilse
    ne gerektiği YAZILIR — sır çözülemediğinde tek dürüst cevap budur. */
function SaglayiciSatiri({ sirMaskeli, ozet }: {
  sirMaskeli: string; ozet: EntegrasyonOzeti;
}) {
  const ad = maskeSaglayicisi(sirMaskeli);
  if (!ad) return null;
  const s = ozet.saglayicilar.find((x) => x.ad === ad);
  if (!s) {
    return (
      <p style={{ margin: 'var(--s10) 0 0', fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
        &lsquo;{ad}&rsquo; adında kayıtlı bir sır sağlayıcısı yok — bu referans çözülemez.
      </p>
    );
  }
  const not = saglayiciNotu(s);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr', gap: 'var(--s8)',
      alignItems: 'start', marginTop: 'var(--s12)' }}>
      <span style={{ paddingTop: 3 }}>
        <Im durum={saglayiciImi(s)}
          ad={s.bagli ? `${s.ad} sağlayıcısı bağlı` : `${s.ad} sağlayıcısı bağlı değil`} />
      </span>
      <span style={{ fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
        <span className="mono">{s.ad}</span>
        {not && <> · {not}</>}
      </span>
    </div>
  );
}

function ConnectorGecmisi({ gecmis }: { gecmis: KosuSatiri[] }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>Son koşular</p>
      {gecmis.length === 0 ? (
        <p className="ab-panel-dip" style={{ margin: 0 }}>
          Bu connector hiç koşmadı — sağlıklı olduğu anlamına gelmez.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--s10)' }}>
          {gecmis.map((g) => (
            <div key={g.id} style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
              alignItems: 'start', gap: 'var(--s8)' }}>
              <span style={{ paddingTop: 3 }}>
                <Im durum={g.bayat ? 'bd' : kosuImi(g.durum)}
                  ad={g.bayat ? 'Koşu bayat — süreç yanıt vermiyor' : kosuAdi(g.durum)} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 'var(--t-field)' }}>
                  {zamanTR(g.baslangic)} · {TETIKLEYEN[g.tetikleyen] ?? etiketle(g.tetikleyen)}
                </span>
                <span className="mono" style={{ display: 'block', marginTop: 2,
                  fontSize: 'var(--t-label)', color: 'var(--i3)' }}>
                  {g.alinan} → {g.kabulEdilen} · {g.reddedilen} red · {g.yinelenen} yinelenen
                  {' · '}{sureFmt(g.sureMs)}
                  {g.denemeNo > 1 && ` · ${g.denemeNo}. deneme`}
                </span>
                {(g.durum === 'basarisiz' || g.hataSinifi) && (
                  <span style={{ display: 'block', marginTop: 2,
                    fontSize: 'var(--t-label)',
                    color: hataSinifiYazisi(g).eksik ? 'var(--md)' : 'var(--i3)' }}>
                    {hataSinifiYazisi(g).metin}
                  </span>
                )}
                {g.korelasyonId && (
                  <span className="mono" style={{ display: 'block', marginTop: 2,
                    fontSize: 'var(--t-label)', color: 'var(--i3)', wordBreak: 'break-all' }}>
                    korelasyon · {g.korelasyonId}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Çekmece · veri kalitesi ─────────────────────────────────────────── */

export function KaliteOzeti({ b }: { b: KaliteBulgusu }) {
  const im = kaliteImi(b);
  return (
    <>
      <CekmeceKimlik
        durum={im}
        soz={im === 'unk' ? 'Kaynak kayıt silinmiş' : 'Açık veri boşluğu'}
        baslik={etiketle(b.kural)}
        cumle={b.aciklama}
      />

      <CekmeceAlanlar alanlar={[
        { etiket: 'Kaynak tipi', deger: etiketle(b.kaynakTipi) },
        { etiket: 'İlgili kayıt', deger: b.kayitEtiket ?? 'silinmiş',
          durum: b.kayitEtiket ? undefined : 'unk' },
        { etiket: 'Tespit', deger: tarihTR(b.olusturuldu) },
      ]} />

      {b.href && b.kayitEtiket && (
        <CekmeceBagli baslik="Kayıt" kayitlar={[
          { id: b.id, kod: b.kayitEtiket, alt: etiketle(b.kaynakTipi), yol: b.href },
        ]} />
      )}

      {!b.href && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            {b.kayitEtiket
              ? 'Bu kayıt tipinin kendi ekranı yok; bulgu kaydın üstünde durur.'
              : 'Bulgunun işaret ettiği kayıt silinmiş — boşluk doğrulanamıyor.'}
          </p>
        </div>
      )}
    </>
  );
}

/* ── Ortak parçalar ─────────────────────────────────────────────────── */

function HataBlogu({ metin }: { metin: string }) {
  return (
    <div className="ab-panel-blok" style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)', color: 'var(--bd)' }}>Hata</p>
      <pre className="mono" style={{ margin: 0, padding: 'var(--s12)',
        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        background: 'var(--panel)', border: 'var(--bw-edge) solid var(--bd)',
        fontSize: 'var(--t-label)', color: 'var(--bd)' }}>
        {metin}
      </pre>
    </div>
  );
}
