'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import {
  alanUygulanabilirligiKaldir, alanUygulanamazIsaretle, firmwareIstisnasiKaydet,
  kapsamKaydet, korelasyonElleKarar, sbomYukle, varligaSegmentAta, yamaKaydiKaydet,
} from '@/lib/eylemler2/varlikDurusu';
import {
  KAPSAM_DURUMLARI, KAPSAM_DURUM_SINIFI, KAPSAM_ETIKETI, KAPSAM_TIPLERI,
  type KapsamDurumu, type KapsamTipi,
} from '@/lib/varlik/kapsam';
import { etiketle, tarihTR, zamanTR } from '@/lib/sabitler';
import {
  DURUS_ALANLARI, DURUS_ALAN_ETIKETI, TAZELIK_SOZU,
  celiskiVarMi, durusuCoz, type DurusAlani, type TazelikDurumu,
} from '@/lib/varlik/canliDurus';
import {
  kimlikEnvanteri, kimlikTamligi,
  type CanliAyar, type DurusCanliKaynak, type Segment, type V,
} from './mantik';

/* ═══ O11 · Duruş sekmesi — OT-03 · 11 · 21 · 22 · 25 · 26 · 27 ════════

   Çekmecenin beşinci sekmesi. Varlığın KENDİ satırında olmayan yedi
   kaydı tek yüzeyde toplar ve her birinde aynı üç ayrımı korur:

     ölçülmedi   ≠  yok
     uygulanamaz ≠  eksik
     motor kararı ≠  insan kararı

   Yazma yüzeyleri buradadır ama yetkinin kendisi burada DEĞİLDİR:
   düğmeler yalnız görünürlüğü kapatır, `lib/eylemler2/varlikDurusu.ts`
   her çağrıyı ayrıca yetki ve tesis kapsamıyla reddeder. */

const KAPSAM_ADI: Record<KapsamTipi, string> = {
  edr: 'EDR', antivirus: 'Antivirüs', siem: 'SIEM', izleme: 'İzleme',
  yedekleme: 'Yedekleme', pam: 'PAM', mfa: 'MFA',
  zafiyet_yonetimi: 'Zafiyet yönetimi', konfig_yedek: 'Konfigürasyon yedeği',
  ntp: 'NTP', syslog: 'Syslog',
};

const FIRMWARE_ETIKET: Record<string, string> = {
  uyumlu: 'uyumlu', eski: 'eski sürüm', bilinen_kotu: 'bilinen kötü sürüm',
  taban_yok: 'taban tanımlı değil', karar_verilemedi: 'karar verilemedi',
};
const FIRMWARE_SINIF: Record<string, string> = {
  uyumlu: 'uygun', eski: 'kismi', bilinen_kotu: 'uygunsuz',
  taban_yok: 'yok', karar_verilemedi: 'yok',
};

const YAMA_ETIKET: Record<string, string> = {
  uyumlu: 'uyumlu', eksik: 'eksik yama var', yamalanamaz: 'yamalanamaz',
  istisna: 'onaylı istisna', karar_verilemedi: 'karar verilemedi',
};
const YAMA_SINIF: Record<string, string> = {
  uyumlu: 'uygun', eksik: 'uygunsuz', yamalanamaz: 'kismi',
  istisna: 'kismi', karar_verilemedi: 'yok',
};

const KORELASYON_ETIKET: Record<string, string> = {
  etkilenen: 'etkilenen', etkilenmeyen: 'etkilenmiyor',
  karar_verilemedi: 'karar verilemedi',
};
const KORELASYON_SINIF: Record<string, string> = {
  etkilenen: 'uygunsuz', etkilenmeyen: 'uygun', karar_verilemedi: 'yok',
};

/** Bölüm başlığı + isteğe bağlı sağ üst rozet. */
function Blok({ ad, rozet, children }: {
  ad: string; rozet?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section className="ab-durus-blok">
      <p className="etiket blokbas">
        {ad}
        {rozet ? <span className="ab-durus-rozet">{rozet}</span> : null}
      </p>
      {children}
    </section>
  );
}

/** "kayıt yok" cümlesi — "sorun yok" DEĞİLDİR ve öyle yazılmaz. */
function KayitYok({ ne }: { ne: string }) {
  return <p className="bos">{ne} kaydı yok — ölçülmedi.</p>;
}

/* ── OT-21b · Canlı duruş ───────────────────────────────────────────

   Bu blok tek bir soruyu cevaplar: "bu cihazın işletim sistemi, yaması ve
   firmware'i hakkında ŞU AN ne biliyoruz ve bunu nereden biliyoruz?"

   Üç şey asla karıştırılmaz:
     · envanterde YAZAN     — bir insanın girdiği kayıt
     · sahada GÖRÜLEN       — bir kaynak sistemin bildirdiği ölçüm
     · hiç ölçülmemiş olan  — kaynağın bağlı olmadığı alan

   "CANLI" sözcüğü yalnız kaynak gerçekten bağlıyken, son koşu başarılıyken
   ve veri kaynağın kendi sorgu aralığı içinde geldiğinde yazılır. Bağlı
   olmayan bir kaynağın önüne "canlı" yazmak, ürünün söyleyebileceği en
   pahalı yalandır. */

const TAZELIK_GLIF: Record<TazelikDurumu, string> = {
  canli: 'uygun', guncel: 'uygun', bayat: 'kismi',
  kaynak_yok: 'planli', hata: 'uygunsuz', bilinmiyor: 'yok',
};

/** Envanter satırının KENDİ değeri — gözlemin karşısına konur. */
const ENVANTER_DEGERI: Record<DurusAlani, (v: V) => string | null> = {
  isletimSistemi: (v) => v.isletimSistemi,
  osSurumu: (v) => v.isletimSistemiSurumu,
  yamaSeviyesi: (v) => v.durus.yamalar[0]?.mevcutSeviye ?? null,
  firmware: (v) => v.firmware,
};

function yasCumlesi(yasDk: number | null): string {
  if (yasDk === null) return 'yaş ölçülemedi';
  if (yasDk < 1) return 'az önce';
  if (yasDk < 60) return `${yasDk} dk önce`;
  if (yasDk < 1440) return `${Math.round(yasDk / 60)} sa önce`;
  return `${Math.round(yasDk / 1440)} gün önce`;
}

/** Bir kaynağın bağlantı durumu — cümlesi ve sınıfı. */
function kaynakDurumu(g: DurusCanliKaynak): { yazi: string; sinif: string } {
  if (!g.bagli) return { yazi: 'bağlı değil', sinif: 'planli' };
  if (g.hatali) return { yazi: 'HATA', sinif: 'uygunsuz' };
  if (g.pollAralikDk === null || g.pollAralikDk <= 0) {
    return { yazi: 'elle tetiklenir', sinif: 'yok' };
  }
  return { yazi: `${g.pollAralikDk} dk'da bir sorgulanır`, sinif: 'uygun' };
}

function CanliBlogu({ v, simdi, ayar }: {
  v: V; simdi: number; ayar: CanliAyar;
}) {
  const kaynaklar = v.durus.canli;

  /* Çözüm SAF bir hesaptır ve girdisi sunucudan gelen `simdi`dir:
     render gövdesinde saat okunmaz, iki kullanıcı aynı ekranı aynı
     eşiklerle görür. */
  const cozum = durusuCoz(
    kaynaklar.map((g) => ({
      kaynakSistem: g.kaynakSistem,
      bagli: g.bagli,
      hatali: g.hatali,
      pollAralikDk: g.pollAralikDk,
      kaynakZamani: g.kaynakZamani === null ? null : new Date(g.kaynakZamani).getTime(),
      guven: g.guven,
      alanlar: {
        isletimSistemi: g.isletimSistemi,
        osSurumu: g.osSurumu === null ? g.osYapisi
          : g.osYapisi === null ? g.osSurumu : `${g.osSurumu} (${g.osYapisi})`,
        yamaSeviyesi: g.yamaSeviyesi,
        firmware: g.firmware,
      },
    })),
    {
      simdi,
      canliKat: ayar.canliKat,
      guncelKat: ayar.guncelKat,
      kaynakOnceligi: ayar.kaynakOnceligi,
    },
  );

  const bagliSayisi = kaynaklar.filter((g) => g.bagli).length;

  return (
    <Blok
      ad="Canlı duruş"
      rozet={(
        <span className="mono">
          {kaynaklar.length === 0 ? 'kaynak yok'
            : `${kaynaklar.length} kaynak · ${bagliSayisi} bağlı`}
        </span>
      )}
    >
      {bagliSayisi === 0 && (
        <p className="mono dipnot">
          KAYNAK BAĞLI DEĞİL — aşağıdaki değerler envantere elle girilmiştir
          ve hiçbiri canlı ölçüm değildir. Bir kaynak sistem bağlandığında
          bu blok sahadan gelen değeri envanterdekinin yanına koyar.
        </p>
      )}

      {DURUS_ALANLARI.map((alan) => {
        const c = cozum[alan];
        const envanter = ENVANTER_DEGERI[alan](v);
        const durum: TazelikDurumu = c.tazelik?.durum ?? 'kaynak_yok';
        const celiski = celiskiVarMi(c.deger, envanter);
        return (
          <div key={alan} className="ab-durus-satir">
            <span className={`ab-glif g-${TAZELIK_GLIF[durum]}`} aria-hidden />
            <span className="konu">{DURUS_ALAN_ETIKETI[alan]}</span>
            <span className="mono son">{TAZELIK_SOZU[durum]}</span>
            <dl className="ciftler">
              <div>
                <dt>Sahada görülen</dt>
                <dd className={`mono${c.deger ? '' : ' unk'}`}>
                  {c.deger ?? 'ölçülmedi'}
                </dd>
              </div>
              <div>
                <dt>Envanter kaydı</dt>
                <dd className={`mono${envanter ? (celiski ? ' vurgu' : '') : ' unk'}`}>
                  {envanter ?? 'girilmedi'}
                </dd>
              </div>
              <div>
                <dt>Veri kaynağı</dt>
                <dd className={`mono${c.kaynakSistem ? '' : ' unk'}`}>
                  {c.kaynakSistem ?? 'kaynak bağlı değil'}
                </dd>
              </div>
              <div>
                <dt>Son veri</dt>
                <dd className={`mono${c.tazelik?.yasDk == null ? ' unk' : ''}`}>
                  {yasCumlesi(c.tazelik?.yasDk ?? null)}
                </dd>
              </div>
            </dl>
            {celiski && (
              <p className="mono dipnot">
                Envanterde yazan ile sahada görülen AYNI DEĞİL. Ürün
                envanteri kendiliğinden değiştirmez: hangisinin doğru
                olduğuna insan karar verir.
              </p>
            )}
            {c.cakisanlar.length > 0 && (
              <p className="mono dipnot">
                Çakışma · {c.cakisanlar.map((k) => `${k.kaynakSistem}: ${k.deger}`).join(' · ')}
                {' — '}en yeni ölçüm kazandı, diğerleri gizlenmedi.
              </p>
            )}
          </div>
        );
      })}

      {kaynaklar.length === 0 ? (
        <p className="bos">
          Bu varlığı besleyen kaynak sistem yok — duruş ölçülmedi.
        </p>
      ) : (
        <>
          <p className="etiket blokbas">Kaynak sağlığı</p>
          {kaynaklar.map((g) => {
            const kd = kaynakDurumu(g);
            return (
              <div key={g.kaynakSistem} className="ab-durus-satir">
                <span className={`ab-glif g-${kd.sinif}`} aria-hidden />
                <span className="konu">{g.connectorAd ?? g.kaynakSistem}</span>
                <span className="mono son">{kd.yazi}</span>
                <dl className="ciftler">
                  <div>
                    <dt>Kaynak sistem</dt>
                    <dd className="mono">{g.kaynakSistem}</dd>
                  </div>
                  <div>
                    <dt>Kaynağın ölçtüğü an</dt>
                    <dd className={`mono${g.kaynakZamani ? '' : ' unk'}`}>
                      {g.kaynakZamani ? zamanTR(g.kaynakZamani) : 'kaynak zaman bildirmedi'}
                    </dd>
                  </div>
                  <div>
                    <dt>Bize ulaştığı an</dt>
                    <dd className="mono">{zamanTR(g.alinma)}</dd>
                  </div>
                  <div>
                    <dt>Son başarılı koşu</dt>
                    <dd className={`mono${g.sonBasariliKosu ? '' : ' unk'}`}>
                      {g.sonBasariliKosu ? zamanTR(g.sonBasariliKosu) : 'koşu kaydı yok'}
                    </dd>
                  </div>
                  <div>
                    <dt>Güven</dt>
                    <dd className={`mono${g.guven === null ? ' unk' : ''}`}>
                      {g.guven === null ? 'ölçülmedi' : g.guven.toFixed(2)}
                    </dd>
                  </div>
                </dl>
                {g.sonHata && <p className="mono dipnot">Son hata · {g.sonHata}</p>}
              </div>
            );
          })}
        </>
      )}
    </Blok>
  );
}

/* ── OT-03 · Kimlik alanı envanteri ─────────────────────────────────── */

function KimlikEnvanteri({ v, yazilabilir }: { v: V; yazilabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState('');
  const alanlar = kimlikEnvanteri(v);
  const t = kimlikTamligi(v);

  function isaretle(alan: string) {
    calistir(
      () => alanUygulanamazIsaretle({ varlikId: v.id, alan, gerekce }),
      () => { setAcik(null); setGerekce(''); },
    );
  }
  function kaldir(alan: string) {
    calistir(
      () => alanUygulanabilirligiKaldir({ varlikId: v.id, alan, gerekce }),
      () => { setAcik(null); setGerekce(''); },
    );
  }

  return (
    <Blok
      ad="Kimlik alanları"
      rozet={(
        <span className="mono">
          {t.oran === null ? 'oran hesaplanamaz' : `%${t.oran} dolu`}
          {' · '}
          {t.olculmedi} ölçülmedi
          {t.uygulanamaz > 0 ? ` · ${t.uygulanamaz} uygulanamaz` : ''}
        </span>
      )}
    >
      <p className="mono dipnot">
        Uygulanamaz işaretli alanlar orana GİRMEZ; ölçüm borcu sayılmazlar.
      </p>
      <ul className="ab-durus-alanlar">
        {alanlar.map((a) => (
          <li key={a.anahtar} className={a.uygulanamaz !== null ? 'na' : undefined}>
            <span className="ad">{a.ad}</span>
            <span className={`mono deger${a.deger === null && a.uygulanamaz === null ? ' unk' : ''}`}>
              {a.uygulanamaz !== null
                ? 'uygulanamaz'
                : a.deger ?? 'ölçülmedi'}
            </span>
            {yazilabilir && a.anahtar !== 'etiket' && (
              <button type="button" className="ab-dugme mini"
                aria-expanded={acik === a.anahtar}
                onClick={() => { setAcik(acik === a.anahtar ? null : a.anahtar); setGerekce(''); }}>
                {a.uygulanamaz !== null ? 'geri al' : 'uygulanamaz'}
              </button>
            )}
            {a.uygulanamaz !== null && (
              <p className="mono gerekce">{a.uygulanamaz}</p>
            )}
            {acik === a.anahtar && (
              <div className="ab-durus-form">
                <Alan etiket="Gerekçe (en az 10 karakter)">
                  <textarea className="ab-gr" rows={2} value={gerekce}
                    onChange={(e) => setGerekce(e.target.value)} />
                </Alan>
                <Dugme tur="tam" disabled={bekliyor || gerekce.trim().length < 10}
                  onClick={() => (a.uygulanamaz !== null ? kaldir(a.anahtar) : isaretle(a.anahtar))}>
                  {a.uygulanamaz !== null ? 'Uygulanabilir yap' : 'Uygulanamaz işaretle'}
                </Dugme>
              </div>
            )}
          </li>
        ))}
      </ul>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
    </Blok>
  );
}

/* ── OT-22 · Firmware uyumu ─────────────────────────────────────────── */

function FirmwareBlogu({ v, onaylanabilir }: { v: V; onaylanabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [plan, setPlan] = useState('');
  const f = v.durus.firmware;

  return (
    <Blok
      ad="Firmware uyumu"
      rozet={f ? (
        <span className={`ab-glif g-${FIRMWARE_SINIF[f.durum] ?? 'yok'}`} aria-label={FIRMWARE_ETIKET[f.durum]} />
      ) : undefined}
    >
      {!f ? <KayitYok ne="Firmware uyumu" /> : (
        <>
          <dl className="ciftler">
            <div>
              <dt>Karar</dt>
              <dd className={f.durum === 'uyumlu' ? undefined : 'vurgu'}>
                {FIRMWARE_ETIKET[f.durum] ?? etiketle(f.durum)}
              </dd>
            </div>
            <div>
              <dt>Kurulu sürüm</dt>
              <dd className={`mono${f.kuruluSurum ? '' : ' unk'}`}>
                {f.kuruluSurum ?? 'okunmadı'}
              </dd>
            </div>
          </dl>
          <p className="cumle">{f.gerekce}</p>
          {f.istisnaGerekcesi && (
            <p className="mono dipnot">
              Onaylı istisna · {f.istisnaGerekcesi}
              {' — istisna kararı DEĞİŞTİRMEZ; cihaz hâlâ eski sürümdedir.'}
            </p>
          )}
          {f.sonDogrulama && (
            <p className="mono dipnot">son hesaplama {zamanTR(f.sonDogrulama)}</p>
          )}
          {onaylanabilir && !f.istisnaGerekcesi && f.durum !== 'uyumlu' && (
            <>
              <button type="button" className="ab-dugme mini" aria-expanded={acik}
                onClick={() => setAcik(!acik)}>İstisna onayla</button>
              {acik && (
                <div className="ab-durus-form">
                  <Alan etiket="Gerekçe (en az 10 karakter)">
                    <textarea className="ab-gr" rows={2} value={gerekce}
                      onChange={(e) => setGerekce(e.target.value)} />
                  </Alan>
                  <Alan etiket="Yükseltme planı">
                    <input className="ab-gr" value={plan}
                      onChange={(e) => setPlan(e.target.value)} />
                  </Alan>
                  <Dugme tur="tam" disabled={bekliyor || gerekce.trim().length < 10}
                    onClick={() => calistir(
                      () => firmwareIstisnasiKaydet({
                        varlikId: v.id, gerekce, yukseltmePlani: plan || null,
                      }),
                      () => { setAcik(false); setGerekce(''); setPlan(''); },
                    )}>
                    İstisnayı kaydet
                  </Dugme>
                </div>
              )}
            </>
          )}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
        </>
      )}
    </Blok>
  );
}

/* ── OT-21 · Yama duruşu ────────────────────────────────────────────── */

const YAMA_SIDDETLERI = ['bilinmiyor', 'kritik', 'yuksek', 'orta', 'dusuk'] as const;

type YamaFormu = {
  kaynakSistem: string; kaynakKayitId: string;
  mevcutSeviye: string; temelSeviye: string; eksikYama: string;
  siddet: string; yenidenBaslatma: string;
  yamalanamaz: boolean; istisnaGerekcesi: string; telafiEdiciKontrol: string;
};

const BOS_YAMA: YamaFormu = {
  kaynakSistem: '', kaynakKayitId: '', mevcutSeviye: '', temelSeviye: '',
  eksikYama: '', siddet: 'bilinmiyor', yenidenBaslatma: '',
  yamalanamaz: false, istisnaGerekcesi: '', telafiEdiciKontrol: '',
};

/** Elle yama kaydı — kaynağı bir sistem olmayan cihazlar için. */
function YamaKaydiFormu({ varlikId, kapat }: { varlikId: string; kapat: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [f, setF] = useState<YamaFormu>(BOS_YAMA);
  const gecerli = !!f.kaynakSistem.trim() && !!f.kaynakKayitId.trim();

  return (
    <div className="ab-durus-form">
      <p className="mono dipnot">
        Durum bu formdan SEÇİLMEZ, alanlardan türetilir: yamalanamaz →
        istisna → eksik yama → uyumlu; seviyelerden biri okunamıyorsa
        &quot;karar verilemedi&quot;.
      </p>
      <Alan etiket="Kaynak sistem">
        <input className="ab-gr" value={f.kaynakSistem}
          onChange={(e) => setF({ ...f, kaynakSistem: e.target.value })} />
      </Alan>
      <Alan etiket="Kaynak kayıt kimliği">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.kaynakKayitId}
          onChange={(e) => setF({ ...f, kaynakKayitId: e.target.value })} />
      </Alan>
      <Alan etiket="Mevcut yama seviyesi">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.mevcutSeviye}
          onChange={(e) => setF({ ...f, mevcutSeviye: e.target.value })} />
      </Alan>
      <Alan etiket="Taban yama seviyesi">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={f.temelSeviye}
          onChange={(e) => setF({ ...f, temelSeviye: e.target.value })} />
      </Alan>
      <Alan etiket="Eksik yama">
        <input className="ab-gr" value={f.eksikYama}
          onChange={(e) => setF({ ...f, eksikYama: e.target.value })} />
      </Alan>
      <Alan etiket="Şiddet">
        <select className="ab-gr" value={f.siddet}
          onChange={(e) => setF({ ...f, siddet: e.target.value })}>
          {YAMA_SIDDETLERI.map((s) => <option key={s} value={s}>{etiketle(s)}</option>)}
        </select>
      </Alan>
      <Alan etiket="Yeniden başlatma">
        <select className="ab-gr" value={f.yenidenBaslatma}
          onChange={(e) => setF({ ...f, yenidenBaslatma: e.target.value })}>
          <option value="">Bilinmiyor</option>
          <option value="evet">Gerekli</option>
          <option value="hayir">Gerekmiyor</option>
        </select>
      </Alan>
      <Alan etiket="Yamalanamaz">
        <select className="ab-gr" value={f.yamalanamaz ? 'evet' : 'hayir'}
          onChange={(e) => setF({ ...f, yamalanamaz: e.target.value === 'evet' })}>
          <option value="hayir">Hayır</option>
          <option value="evet">Evet — üretici yama yayımlamıyor</option>
        </select>
      </Alan>
      <Alan etiket="İstisna gerekçesi">
        <textarea className="ab-gr" rows={2} value={f.istisnaGerekcesi}
          onChange={(e) => setF({ ...f, istisnaGerekcesi: e.target.value })} />
      </Alan>
      <Alan etiket="Telafi edici kontrol">
        <input className="ab-gr" value={f.telafiEdiciKontrol}
          onChange={(e) => setF({ ...f, telafiEdiciKontrol: e.target.value })} />
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <Dugme tur="tam" disabled={bekliyor || !gecerli}
        onClick={() => calistir(() => yamaKaydiKaydet({
          varlikId,
          kaynakSistem: f.kaynakSistem, kaynakKayitId: f.kaynakKayitId,
          mevcutSeviye: f.mevcutSeviye || null, temelSeviye: f.temelSeviye || null,
          eksikYama: f.eksikYama || null, siddet: f.siddet,
          // Boş seçim null'a düşer: "gerekmiyor" ile "bilinmiyor" ayrıdır.
          yenidenBaslatmaGerekli: f.yenidenBaslatma === '' ? null : f.yenidenBaslatma === 'evet',
          yamalanamaz: f.yamalanamaz,
          istisnaGerekcesi: f.istisnaGerekcesi || null,
          telafiEdiciKontrol: f.telafiEdiciKontrol || null,
        }), () => { setF(BOS_YAMA); kapat(); })}>
        Yama kaydını kaydet
      </Dugme>
    </div>
  );
}

function YamaBlogu({ v }: { v: V }) {
  const yamalar = v.durus.yamalar;
  const [acik, setAcik] = useState(false);
  return (
    <Blok ad="Yama duruşu" rozet={<span className="mono">{yamalar.length} kaynak</span>}>
      {yamalar.length === 0 ? <KayitYok ne="Yama" /> : yamalar.map((y) => (
        <div key={y.kaynakSistem} className="ab-durus-satir">
          <span className={`ab-glif g-${YAMA_SINIF[y.durum] ?? 'yok'}`} aria-hidden />
          <span className="konu">{YAMA_ETIKET[y.durum] ?? etiketle(y.durum)}</span>
          <span className="mono son">{y.kaynakSistem}</span>
          <dl className="ciftler">
            <div>
              <dt>Mevcut seviye</dt>
              <dd className={`mono${y.mevcutSeviye ? '' : ' unk'}`}>{y.mevcutSeviye ?? 'ölçülmedi'}</dd>
            </div>
            <div>
              <dt>Taban seviye</dt>
              <dd className={`mono${y.temelSeviye ? '' : ' unk'}`}>{y.temelSeviye ?? 'tanımlı değil'}</dd>
            </div>
            <div>
              <dt>Eksik yama</dt>
              <dd className={`mono${y.eksikYama ? ' vurgu' : ' unk'}`}>{y.eksikYama ?? 'bildirilmedi'}</dd>
            </div>
            <div>
              <dt>Şiddet</dt>
              <dd className={y.siddet === 'bilinmiyor' ? 'unk' : undefined}>{etiketle(y.siddet)}</dd>
            </div>
            <div>
              <dt>Yeniden başlatma</dt>
              <dd className={y.yenidenBaslatmaGerekli === null ? 'unk' : undefined}>
                {y.yenidenBaslatmaGerekli === null ? 'bilinmiyor'
                  : y.yenidenBaslatmaGerekli ? 'gerekli' : 'gerekmiyor'}
              </dd>
            </div>
            <div>
              <dt>Son doğrulama</dt>
              <dd className={`mono${y.sonDogrulama ? '' : ' unk'}`}>
                {y.sonDogrulama ? tarihTR(y.sonDogrulama) : 'doğrulanmadı'}
              </dd>
            </div>
          </dl>
          {y.istisnaGerekcesi && <p className="mono dipnot">İstisna · {y.istisnaGerekcesi}</p>}
        </div>
      ))}
      {v.yazilabilir && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>
            {acik ? 'Formu kapat' : 'Yama kaydı ekle'}
          </button>
          {acik && <YamaKaydiFormu varlikId={v.id} kapat={() => setAcik(false)} />}
        </>
      )}
    </Blok>
  );
}

/* ── OT-25 · Zafiyet korelasyonu ────────────────────────────────────── */

function KorelasyonBlogu({ v, onaylanabilir }: { v: V; onaylanabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<string | null>(null);
  const [gerekce, setGerekce] = useState('');
  const [karar, setKarar] = useState<'etkilenen' | 'etkilenmeyen'>('etkilenmeyen');
  const liste = v.durus.korelasyonlar;

  return (
    <Blok ad="Zafiyet korelasyonu" rozet={<span className="mono">{liste.length} kayıt</span>}>
      {liste.length === 0 ? <KayitYok ne="Korelasyon" /> : liste.map((c) => {
        const gecerli = c.elleSonuc ?? c.sonuc;
        return (
          <div key={c.id} className="ab-durus-satir">
            <span className={`ab-glif g-${KORELASYON_SINIF[gecerli] ?? 'yok'}`} aria-hidden />
            <span className="konu">{c.ref ?? c.baslik}</span>
            <span className="mono son">
              {c.cvss === null ? '—' : c.cvss.toString().replace('.', ',')}
            </span>
            <p className="cumle">
              {KORELASYON_ETIKET[gecerli] ?? etiketle(gecerli)}
              {c.elleSonuc
                ? ` · elle karar (motor: ${KORELASYON_ETIKET[c.sonuc] ?? c.sonuc})`
                /* Güven ölçülmediyse "%0" YAZILMAZ: sıfır güven ile
                   ölçülmemiş güven aynı şey değildir. */
                : ` · motor kararı · güven ${c.guven === null ? 'ölçülmedi' : `%${Math.round(c.guven * 100)}`}`}
            </p>
            <p className="mono dipnot">{c.elleGerekce ?? c.gerekce}</p>
            {onaylanabilir && (
              <>
                <button type="button" className="ab-dugme mini" aria-expanded={acik === c.id}
                  onClick={() => { setAcik(acik === c.id ? null : c.id); setGerekce(''); }}>
                  {c.elleSonuc ? 'Kararı değiştir' : 'Elle karar ver'}
                </button>
                {acik === c.id && (
                  <div className="ab-durus-form">
                    <Alan etiket="Karar">
                      <select className="ab-gr" value={karar}
                        onChange={(e) => setKarar(e.target.value as 'etkilenen' | 'etkilenmeyen')}>
                        <option value="etkilenmeyen">Etkilenmiyor</option>
                        <option value="etkilenen">Etkilenen</option>
                      </select>
                    </Alan>
                    <Alan etiket="Gerekçe (en az 10 karakter)">
                      <textarea className="ab-gr" rows={2} value={gerekce}
                        onChange={(e) => setGerekce(e.target.value)} />
                    </Alan>
                    <Dugme tur="tam" disabled={bekliyor || gerekce.trim().length < 10}
                      onClick={() => calistir(
                        () => korelasyonElleKarar({ korelasyonId: c.id, sonuc: karar, gerekce }),
                        () => { setAcik(null); setGerekce(''); },
                      )}>
                      Kararı kaydet
                    </Dugme>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
    </Blok>
  );
}

/* ── OT-27 · Güvenlik kapsaması ─────────────────────────────────────── */

function KapsamBlogu({ v, yazilabilir }: { v: V; yazilabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState<string | null>(null);
  const [durum, setDurum] = useState<KapsamDurumu>('kapsanan');
  const [gerekce, setGerekce] = useState('');

  /* Kaydı olmayan tip listeden DÜŞMEZ: `bilinmiyor` olarak görünür,
     yoksa ölçülmemiş kapsam sessizce "sorun yok" sayılırdı. */
  const harita = new Map(v.durus.kapsamlar.map((c) => [c.tip, c]));
  const satirlar = KAPSAM_TIPLERI.map((tip) => ({
    tip,
    kayit: harita.get(tip) ?? null,
    durum: (harita.get(tip)?.durum ?? 'bilinmiyor') as KapsamDurumu,
  }));
  const olculen = satirlar.filter((s) => s.durum !== 'bilinmiyor' && s.durum !== 'uygulanamaz');
  const kapsanan = olculen.filter((s) => s.durum === 'kapsanan').length;

  return (
    <Blok
      ad="Güvenlik kapsaması"
      rozet={(
        <span className="mono">
          {olculen.length === 0
            ? 'ölçülmedi'
            : `${kapsanan}/${olculen.length} kapsanıyor`}
        </span>
      )}
    >
      <ul className="ab-durus-alanlar">
        {satirlar.map((s) => (
          <li key={s.tip}>
            <span className="ad">{KAPSAM_ADI[s.tip]}</span>
            <span className={`mono deger ${KAPSAM_DURUM_SINIFI[s.durum] === 'unk' ? 'unk' : ''}`}>
              {KAPSAM_ETIKETI[s.durum]}
            </span>
            {yazilabilir && (
              <button type="button" className="ab-dugme mini" aria-expanded={acik === s.tip}
                onClick={() => {
                  setAcik(acik === s.tip ? null : s.tip);
                  setDurum(s.durum === 'bilinmiyor' ? 'kapsanan' : s.durum);
                  setGerekce(s.kayit?.gerekce ?? '');
                }}>
                düzenle
              </button>
            )}
            {s.kayit?.sonDogrulama && (
              <p className="mono gerekce">doğrulama {tarihTR(s.kayit.sonDogrulama)}</p>
            )}
            {s.kayit?.gerekce && <p className="mono gerekce">{s.kayit.gerekce}</p>}
            {acik === s.tip && (
              <div className="ab-durus-form">
                <Alan etiket="Durum">
                  <select className="ab-gr" value={durum}
                    onChange={(e) => setDurum(e.target.value as KapsamDurumu)}>
                    {KAPSAM_DURUMLARI.map((d) => (
                      <option key={d} value={d}>{KAPSAM_ETIKETI[d]}</option>
                    ))}
                  </select>
                </Alan>
                <Alan etiket={durum === 'uygulanamaz'
                  ? 'Gerekçe (uygulanamaz için zorunlu, en az 10 karakter)'
                  : 'Gerekçe'}>
                  <textarea className="ab-gr" rows={2} value={gerekce}
                    onChange={(e) => setGerekce(e.target.value)} />
                </Alan>
                <Dugme tur="tam"
                  disabled={bekliyor || (durum === 'uygulanamaz' && gerekce.trim().length < 10)}
                  onClick={() => calistir(
                    () => kapsamKaydet({
                      varlikId: v.id, tip: s.tip, durum, gerekce: gerekce || null,
                    }),
                    () => setAcik(null),
                  )}>
                  Kapsamı kaydet
                </Dugme>
              </div>
            )}
          </li>
        ))}
      </ul>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
    </Blok>
  );
}

/* ── OT-11 · Ağ segmenti · OT-26 · SBOM ─────────────────────────────── */

function SegmentBlogu({ v, segmentler, yazilabilir }: {
  v: V; segmentler: Segment[]; yazilabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [secim, setSecim] = useState(v.durus.segment?.id ?? '');
  const s = v.durus.segment;

  return (
    <Blok ad="Ağ segmenti">
      {!s ? (
        <p className="bos">Segment atanmadı — adres tutarlılığı denetlenemez.</p>
      ) : (
        <dl className="ciftler">
          <div><dt>Segment</dt><dd className="mono">{s.kod} · {s.ad}</dd></div>
          <div><dt>CIDR</dt><dd className="mono">{s.cidr}</dd></div>
          <div>
            <dt>VLAN</dt>
            <dd className={`mono${s.vlanId === null ? ' unk' : ''}`}>
              {s.vlanId ?? 'tanımsız'}
            </dd>
          </div>
        </dl>
      )}
      {yazilabilir && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>Segment ata</button>
          {acik && (
            <div className="ab-durus-form">
              <Alan etiket="Segment">
                <select className="ab-gr" value={secim}
                  onChange={(e) => setSecim(e.target.value)}>
                  <option value="">— atama yok —</option>
                  {segmentler.map((o) => (
                    <option key={o.id} value={o.id}>{o.kod} · {o.cidr}</option>
                  ))}
                </select>
              </Alan>
              <Dugme tur="tam" disabled={bekliyor}
                onClick={() => calistir(
                  () => varligaSegmentAta({ varlikId: v.id, segmentId: secim || null }),
                  () => setAcik(false),
                )}>
                Atamayı kaydet
              </Dugme>
            </div>
          )}
        </>
      )}
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
    </Blok>
  );
}

/* SBOM yükleme — CycloneDX ya da SPDX belgesi.

   Yükleme YERİNE GEÇER, üstüne eklemez: yeni belge cihazın o andaki
   yazılım listesidir ve eski girdiler silinir. Ekleme semantiği olsaydı
   kaldırılan bir bileşen listede sonsuza kadar kalırdı.

   Ayrıştırıcı hiçbir koşulda throw etmez; okunamayan bileşenler REDDEDİLEN
   olarak sayılır ve sonuçta gösterilir — sessizce düşürülmez. */
function SbomBlogu({ v }: { v: V }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [icerik, setIcerik] = useState('');
  const [kaynak, setKaynak] = useState('');
  const [kayitId, setKayitId] = useState('');
  const s = v.durus.sbom;
  const gecerli = icerik.trim().length > 0 && !!kaynak.trim() && !!kayitId.trim();

  async function dosyadanOku(dosya: File) {
    setIcerik(await dosya.text());
    if (!kayitId.trim()) setKayitId(dosya.name);
  }

  return (
    <Blok ad="Yazılım listesi (SBOM)">
      {!s ? <KayitYok ne="SBOM" /> : (
        <dl className="ciftler">
          <div><dt>Biçim</dt><dd className="mono">{s.bicim}</dd></div>
          <div><dt>Bileşen</dt><dd className="mono">{s.bilesenSayisi}</dd></div>
          <div><dt>Yüklenme</dt><dd className="mono">{zamanTR(s.yuklendi)}</dd></div>
        </dl>
      )}
      {v.yazilabilir && (
        <>
          <button type="button" className="ab-dugme mini" aria-expanded={acik}
            onClick={() => setAcik(!acik)}>
            {acik ? 'Formu kapat' : s ? 'Yeni SBOM yükle' : 'SBOM yükle'}
          </button>
          {acik && (
            <div className="ab-durus-form">
              <p className="mono dipnot">
                Yeni belge eskisinin YERİNE GEÇER: cihazın güncel yazılım
                listesi budur, eski girdiler silinir.
              </p>
              <Alan etiket="Kaynak sistem">
                <input className="ab-gr" value={kaynak}
                  onChange={(e) => setKaynak(e.target.value)} />
              </Alan>
              <Alan etiket="Kaynak kayıt kimliği">
                <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }} value={kayitId}
                  onChange={(e) => setKayitId(e.target.value)} />
              </Alan>
              <Alan etiket="Belge dosyası (CycloneDX JSON · SPDX)">
                <input className="ab-gr" type="file" accept=".json,.spdx,.txt,application/json"
                  onChange={(e) => {
                    const d = e.target.files?.[0];
                    if (d) void dosyadanOku(d);
                  }} />
              </Alan>
              <Alan etiket="Belge içeriği">
                <textarea className="ab-gr" rows={4} value={icerik}
                  style={{ fontFamily: 'var(--veri)' }}
                  onChange={(e) => setIcerik(e.target.value)} />
              </Alan>
              {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
              <Dugme tur="tam" disabled={bekliyor || !gecerli}
                onClick={() => calistir(
                  () => sbomYukle({
                    varlikId: v.id, icerik, kaynakSistem: kaynak, kaynakKayitId: kayitId,
                  }),
                  () => { setAcik(false); setIcerik(''); },
                )}>
                Belgeyi yükle
              </Dugme>
            </div>
          )}
        </>
      )}
    </Blok>
  );
}

/* ── Sekme gövdesi ──────────────────────────────────────────────────── */

export function DurusPaneli({ v, segmentler, simdi, canliAyar }: {
  v: V; segmentler: Segment[]; simdi: number; canliAyar: CanliAyar;
}) {
  return (
    <div className="ab-durus">
      <CanliBlogu v={v} simdi={simdi} ayar={canliAyar} />
      <KimlikEnvanteri v={v} yazilabilir={v.yazilabilir} />
      <FirmwareBlogu v={v} onaylanabilir={v.onaylanabilir} />
      <YamaBlogu v={v} />
      <KorelasyonBlogu v={v} onaylanabilir={v.onaylanabilir} />
      <KapsamBlogu v={v} yazilabilir={v.yazilabilir} />
      <SegmentBlogu v={v} segmentler={segmentler} yazilabilir={v.yazilabilir} />
      <SbomBlogu v={v} />
    </div>
  );
}
