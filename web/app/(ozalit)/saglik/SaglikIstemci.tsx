'use client';
import Link from 'next/link';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { BosGenel } from '@/components/sahneler';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { tumIsleriCalistir, tekIsCalistir } from '@/lib/eylemler2/isler';
import { etiketle, zamanTR, tarihTR, type Durum } from '@/lib/sabitler';
// Yalnız TİP: `saglikOzeti` server-only bir modül, `import type` derlemede silinir.
import type {
  ConnectorSagligi, EntegrasyonOzeti, KosuSatiri, SaglikDurumu,
} from '@/lib/entegrasyon/saglikOzeti';

type Kosu = {
  id: string; isAdi: string; durum: string; baslangic: string; bitis: string | null;
  sureMs: number | null; islenen: number; uretilen: number; hata: string | null;
};
type Is = { ad: string; etiket: string; aciklama: string; elleCalisir: boolean; son: Kosu | null };
type KaliteBulgusu = {
  id: string; kural: string; aciklama: string; kaynakTipi: string;
  olusturuldu: string; kayitEtiket: string | null; href: string | null;
};

/* Entegrasyon durumları AYRI kovalar: `kimlik_bekleniyor` bir hata değil,
   bekleyen kurulum adımıdır; `hic_kosmadi` de "sağlıklı" değildir. Hiçbiri
   `basarili` ile aynı renge boyanmaz. */
const ENTEGRASYON_DURUM: Record<SaglikDurumu,
  { renk: Durum; etiket: string; hollow?: boolean; aciklama: string }> = {
  basarili: { renk: 'uyumlu', etiket: 'Başarılı',
    aciklama: 'Son koşu başarıyla tamamlandı' },
  basarisiz: { renk: 'uyumsuz', etiket: 'Başarısız',
    aciklama: 'Kimlik bilgisi yerinde ama son koşu hata ile bitti' },
  kimlik_bekleniyor: { renk: 'incelemede', etiket: 'Kimlik bekleniyor', hollow: true,
    aciklama: 'Dış sistem henüz bağlı değil — hata değil, bekleyen kurulum adımı' },
  calisiyor: { renk: 'incelemede', etiket: 'Çalışıyor',
    aciklama: 'Koşu şu an sürüyor' },
  bayat_kosu: { renk: 'uyumsuz', etiket: 'Bayat koşu',
    aciklama: '“Çalışıyor” görünen koşunun başlangıcı çok eski — süreç ölmüş olabilir' },
  hic_kosmadi: { renk: 'degerlendirilmedi', etiket: 'Hiç koşmadı', hollow: true,
    aciklama: 'Hiç koşu kaydı yok — sağlıklı olduğu anlamına GELMEZ' },
  bilinmiyor: { renk: 'degerlendirilmedi', etiket: 'Bilinmiyor', hollow: true,
    aciklama: 'Koşu kaydı yorumlanamayan bir durum taşıyor' },
};

const DURUM_SIRASI: SaglikDurumu[] = [
  'basarisiz', 'bayat_kosu', 'kimlik_bekleniyor', 'hic_kosmadi',
  'bilinmiyor', 'calisiyor', 'basarili',
];

const CONNECTOR_TIP: Record<string, string> = {
  ad_entra: 'Dizin (AD/Entra)', vuln_scanner: 'Zafiyet tarayıcı', edr: 'EDR',
  siem: 'SIEM', backup: 'Yedekleme', network_firewall: 'Güvenlik duvarı',
  ot_discovery: 'OT keşfi', manual_import: 'Elle içe aktarım',
};
const KIMLIK_TIP: Record<string, string> = {
  none: 'Kimlik gerekmiyor', api_key: 'API anahtarı', basic: 'Kullanıcı adı / parola',
  oauth2_client_credentials: 'OAuth2 (client credentials)', certificate: 'İstemci sertifikası',
};
const TETIKLEYEN: Record<string, string> = {
  manuel: 'elle', zamanlanmis: 'zamanlanmış', api: 'API',
};

const KOSU_DURUM: Record<string, { renk: Durum; etiket: string }> = {
  basarili: { renk: 'uyumlu', etiket: 'Başarılı' },
  basarisiz: { renk: 'uyumsuz', etiket: 'Başarısız' },
  calisiyor: { renk: 'incelemede', etiket: 'Çalışıyor' },
};

function sureFmt(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Cümle biçimli küçük not: `mikro-etiket` büyük harfe çevirdiği için
    açıklama metinlerinde kullanılamıyor. */
const NOT_STIL: React.CSSProperties = {
  fontSize: 'var(--fs-xs)', color: 'var(--text-2)',
  whiteSpace: 'normal', maxWidth: 220, marginBlockStart: 'var(--sp-1)',
};

function kisalt(metin: string, uzunluk: number): string {
  return metin.length > uzunluk ? `${metin.slice(0, uzunluk)}…` : metin;
}

/** Dakikayı okunur süreye çevirir (tazelik ve bayatlık için). */
function dkFmt(dk: number): string {
  if (dk < 60) return `${dk} dk`;
  if (dk < 1440) return `${Math.floor(dk / 60)} sa`;
  return `${Math.floor(dk / 1440)} g`;
}

function ConnectorPill({ durum }: { durum: SaglikDurumu }) {
  const d = ENTEGRASYON_DURUM[durum];
  const pill = <Pill durum={d.renk} etiket={d.etiket} hollow={d.hollow} />;
  return durum === 'calisiyor'
    ? <span className="nabiz" style={{ display: 'inline-flex', borderRadius: 'var(--r-full)' }}
        title={d.aciklama}>{pill}</span>
    : <span title={d.aciklama} style={{ display: 'inline-flex' }}>{pill}</span>;
}

/** Veri tazeliği hücresi. Poll aralığı yoksa `bilinmiyor` — "gecikmiş" DEĞİL,
    "0 gecikme" de DEĞİL: ölçülemeyeni ölçülmüş gibi göstermiyoruz. */
function TazelikHucresi({ t }: { t: ConnectorSagligi['tazelik'] }) {
  if (t.durum === 'bilinmiyor') {
    return (
      <span className="mikro-etiket" title={t.aciklama}>
        bilinmiyor{t.gecenDk !== null ? ` · ${dkFmt(t.gecenDk)}` : ''}
      </span>
    );
  }
  const kat = t.gecikmeOrani !== null ? `${t.gecikmeOrani.toFixed(1)}×` : '';
  return t.durum === 'gecikmis'
    ? <span className="pill durum-uyumsuz" title={t.aciklama}>{dkFmt(t.gecenDk!)} · {kat}</span>
    : <span className="chip" title={t.aciklama}>{dkFmt(t.gecenDk!)} · {kat}</span>;
}

/** Koşu satırlarının ortak tablosu — çekmecede connector geçmişi için. */
function KosuGecmisi({ satirlar }: { satirlar: KosuSatiri[] }) {
  return (
    <div className="tablo-sar">
      <table className="tablo">
        <thead><tr>
          <th>Başlangıç</th><th>Durum</th><th>Tetikleyen</th>
          <th className="sag">Alınan</th><th className="sag">Kabul</th>
          <th className="sag">Red</th><th className="sag">Yinelenen</th>
          <th className="sag">Süre</th><th className="sag">Deneme</th>
        </tr></thead>
        <tbody>
          {satirlar.map((g) => (
            <tr key={g.id}>
              <td className="mono" style={{ fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap' }}>
                {zamanTR(g.baslangic)}
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <KosuPill durum={g.durum} />
                {g.bayat && <span className="pill durum-uyumsuz" style={{ marginInlineStart: 'var(--sp-1)' }}
                  title="Başlangıcı çok eski — süreç yanıt vermiyor">bayat</span>}
              </td>
              <td className="mikro-etiket">{TETIKLEYEN[g.tetikleyen] ?? etiketle(g.tetikleyen)}</td>
              <td className="sag">{g.alinan}</td>
              <td className="sag">{g.kabulEdilen}</td>
              <td className="sag" style={g.reddedilen > 0 ? { color: 'var(--uyumsuz-fg)', fontWeight: 600 } : undefined}>
                {g.reddedilen}
              </td>
              <td className="sag">{g.yinelenen}</td>
              <td className="sag mono" style={{ fontSize: 'var(--fs-xs)' }}>{sureFmt(g.sureMs)}</td>
              <td className="sag">{g.denemeNo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Koşu durumu pill'i — çalışıyorsa nabız animasyonu. */
function KosuPill({ durum }: { durum: string }) {
  const d = KOSU_DURUM[durum] ?? { renk: 'degerlendirilmedi' as Durum, etiket: etiketle(durum) };
  const pill = <Pill durum={d.renk} etiket={d.etiket} />;
  return durum === 'calisiyor'
    ? <span className="nabiz" style={{ display: 'inline-flex', borderRadius: 'var(--r-full)' }}>{pill}</span>
    : pill;
}

export default function SaglikIstemci({ isler, gecmis, kalite, yazabilir, entegrasyon }: {
  isler: Is[]; gecmis: Kosu[]; kalite: KaliteBulgusu[]; yazabilir: boolean;
  entegrasyon: EntegrasyonOzeti;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [secilen, setSecilen] = useState<Kosu | null>(null);
  const [secilenC, setSecilenC] = useState<ConnectorSagligi | null>(null);
  const etiketi = (isAdi: string) => isler.find((i) => i.ad === isAdi)?.etiket ?? isAdi;
  const hicKosuYok = gecmis.length === 0;

  const tumunuCalistir = () => calistir(() => tumIsleriCalistir());

  return (
    <>
      <div className="filtreler">
        <button className="btn birincil yazdirmada-gizle" disabled={bekliyor || !yazabilir}
          onClick={tumunuCalistir}
          title={yazabilir ? undefined : 'Motor çalıştırmak yönetim yetkisi ister'}>
          {bekliyor ? 'Çalışıyor…' : '▸ Tümünü çalıştır'}
        </button>
        {hata && <span className="pill durum-uyumsuz" role="alert">{hata}</span>}
        <span style={{ flex: 1 }} />
        <button className="btn yazdirmada-gizle" onClick={pdfYazdir}>🖨 PDF</button>
        <button className="btn yazdirmada-gizle" onClick={() => exceleAktar('platform-sagligi', [
          { ad: 'Motor koşuları', satirlar: [
            ['İş', 'Durum', 'Başlangıç', 'Süre', 'İşlenen', 'Üretilen', 'Hata'],
            ...gecmis.map((ko) => [etiketi(ko.isAdi), KOSU_DURUM[ko.durum]?.etiket ?? etiketle(ko.durum),
              zamanTR(ko.baslangic), sureFmt(ko.sureMs), ko.islenen, ko.uretilen, ko.hata]) ] },
          { ad: 'Veri kalitesi', satirlar: [
            ['Kural', 'Açıklama', 'İlgili kayıt', 'Tespit'],
            ...kalite.map((b) => [etiketle(b.kural), b.aciklama,
              b.kayitEtiket, tarihTR(b.olusturuldu)]) ] },
          // Sır referansı MASKELİ dışa aktarılır; sır değeri hiçbir sütunda yok.
          ...(entegrasyon.yetkili ? [{ ad: 'Entegrasyonlar', satirlar: [
            ['Connector', 'Kod', 'Tip', 'Kaynak sistem', 'Durum', 'Son koşu',
              'Son başarı', 'Alınan', 'Kabul', 'Red', 'Yinelenen', 'Süre',
              'Deneme', 'Tazelik', 'Gecikme (×)', 'Hata', 'Ayrıntı (hata değil)',
              'Sır referansı (maskeli)'],
            ...entegrasyon.connectorlar.map((c) => [
              c.ad, c.kod, CONNECTOR_TIP[c.tip] ?? etiketle(c.tip), c.kaynakSistem,
              ENTEGRASYON_DURUM[c.durum].etiket,
              c.sonKosu ? zamanTR(c.sonKosu.baslangic) : 'hiç koşmadı',
              c.sonBasariliKosu ? zamanTR(c.sonBasariliKosu) : 'hiç',
              c.sonKosu?.alinan ?? null, c.sonKosu?.kabulEdilen ?? null,
              c.sonKosu?.reddedilen ?? null, c.sonKosu?.yinelenen ?? null,
              sureFmt(c.sonKosu?.sureMs ?? null), c.sonKosu?.denemeNo ?? null,
              c.tazelik.durum, c.tazelik.gecikmeOrani,
              c.sonKosu?.hata ?? c.sonHata, c.sonKosu?.ayrinti ?? c.kimlikGerekce,
              c.sirMaskeli]) ] }] : []),
        ])}>⤓ Excel</button>
      </div>

      {hicKosuYok ? (
        <div className="kart">
          <Bos gorsel={<BosGenel />} baslik="Henüz koşu yok"
            altMetin="Otomasyon motorları hiç çalışmamış — görev, bildirim ve öneriler üretilmedi."
            eylem={yazabilir && (
              <button className="btn birincil" disabled={bekliyor} onClick={tumunuCalistir}>
                {bekliyor ? 'Çalışıyor…' : 'Tümünü çalıştır'}
              </button>
            )} />
        </div>
      ) : (
        <div className="kpi-grid">
          {isler.map((is) => (
            <div key={is.ad} className="kart">
              <div className="kart-baslik">
                <h3 style={{ fontSize: 'var(--fs-h3)' }}>{is.etiket}</h3>
                {is.son ? <KosuPill durum={is.son.durum} />
                  : <Pill durum="degerlendirilmedi" etiket="Hiç koşmadı" hollow />}
              </div>
              <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                <div style={{ display: 'flex', gap: 'var(--sp-6)' }}>
                  <div>
                    <span className="mikro-etiket">İşlenen → üretilen</span>
                    <div className="metrik-dev" style={{ fontSize: 'var(--fs-h2)' }}>
                      {is.son ? <>{is.son.islenen} <span className="birim">→ {is.son.uretilen}</span></> : '—'}
                    </div>
                  </div>
                  <div>
                    <span className="mikro-etiket">Süre</span>
                    <div className="metrik-dev" style={{ fontSize: 'var(--fs-h2)' }}>
                      {is.son ? sureFmt(is.son.sureMs) : '—'}
                    </div>
                  </div>
                </div>
                {is.son?.durum === 'basarisiz' && is.son.hata && (
                  <button className="pill durum-uyumsuz" onClick={() => setSecilen(is.son)}
                    style={{ cursor: 'pointer', maxWidth: '100%', overflow: 'hidden',
                      textOverflow: 'ellipsis', border: '1px solid var(--uyumsuz-bd)' }}
                    title="Hata detayını aç">
                    ⚠ {is.son.hata.length > 60 ? `${is.son.hata.slice(0, 60)}…` : is.son.hata}
                  </button>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                  <span className="mikro-etiket" title={is.aciklama}>
                    {is.son ? `Son: ${zamanTR(is.son.baslangic)}` : is.aciklama}
                  </span>
                  <span style={{ flex: 1 }} />
                  {yazabilir && is.elleCalisir && (
                    <button className="btn kucuk yazdirmada-gizle"
                      disabled={bekliyor || is.son?.durum === 'calisiyor'}
                      onClick={() => calistir(() => tekIsCalistir(is.ad))}>▸ Çalıştır</button>
                  )}
                  {!is.elleCalisir && (
                    <span className="mikro-etiket" title="Bu motor entegrasyon zincirinden koşar">
                      zincirden koşar
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══ Entegrasyonlar ═══════════════════════════════════════════
          Dış sistem bağlantılarının sağlığı. Üç durum ayrı kovada durur:
          basarili · basarisiz · kimlik_bekleniyor. Hiç koşmamış connector
          "sağlıklı" görünmez; bayat koşu sessizce "çalışıyor" kalamaz. */}
      <div className="kart">
        <div className="kart-baslik">
          <h3>Entegrasyonlar</h3>
          {entegrasyon.yetkili && entegrasyon.connectorlar.length > 0 && (
            <span style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {DURUM_SIRASI.filter((d) => entegrasyon.sayilar[d] > 0).map((d) => (
                <span key={d} className="chip" title={ENTEGRASYON_DURUM[d].aciklama}>
                  {entegrasyon.sayilar[d]} {ENTEGRASYON_DURUM[d].etiket.toLocaleLowerCase('tr-TR')}
                </span>
              ))}
            </span>
          )}
        </div>

        {!entegrasyon.yetkili ? (
          <Bos baslik="Bu bölüm yönetim yetkisi ister"
            altMetin="Connector sağlığı, koşu sayaçları ve maskeli sır referansları yalnız yönetim okuma yetkisi olan kullanıcılara gösterilir." />
        ) : entegrasyon.connectorlar.length === 0 ? (
          <Bos gorsel={<BosGenel />} baslik="Tanımlı connector yok"
            altMetin="Hiçbir dış sistem bağlantısı kurulmamış. Connector tanımlandığında son koşusu, alınan/kabul/red/yinelenen sayaçları ve veri tazeliği burada görünür." />
        ) : (
          <div className="tablo-sar">
            <table className="tablo">
              <thead><tr>
                <th>Connector</th><th>Durum</th><th>Son koşu</th><th>Son başarı</th>
                <th className="sag">Alınan → kabul</th><th className="sag">Süre</th>
                <th>Veri tazeliği</th><th></th>
              </tr></thead>
              <tbody>
                {entegrasyon.connectorlar.map((c) => {
                  const s = c.sonKosu;
                  const hataMetni = s?.hata ?? c.sonHata;
                  /* Renk `durum`dan gelir, `hata` alanının doluluğundan DEĞİL:
                     başarılı bir koşu da geçmiş bir hata metni taşıyabilir. */
                  const hataliMi = c.durum === 'basarisiz' || c.durum === 'bayat_kosu';
                  return (
                    <tr key={c.id}>
                      <td style={{ minWidth: 190 }}>
                        <div style={{ fontWeight: 500 }}>{c.ad}</div>
                        <div className="mikro-etiket">
                          <span className="mono">{c.kod}</span>
                          {' · '}{CONNECTOR_TIP[c.tip] ?? etiketle(c.tip)}
                          {c.etkin ? '' : ' · pasif'}
                        </div>
                        <div style={NOT_STIL}>{c.kaynakSistem}</div>
                      </td>
                      <td style={{ minWidth: 200 }}>
                        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexWrap: 'wrap', alignItems: 'center' }}>
                          <ConnectorPill durum={c.durum} />
                          {/* Hiç koşmamış connector, durumu başka bir sebeple
                              gölgelense bile bunu saklamaz. */}
                          {c.hicKosmadi && c.durum !== 'hic_kosmadi' && (
                            <span className="chip" title="Hiç koşu kaydı yok">hiç koşmadı</span>
                          )}
                        </div>
                        {c.kimlikGerekce && (
                          <div style={{ ...NOT_STIL, maxWidth: 300 }}>{c.kimlikGerekce}</div>
                        )}
                        {hataMetni && (hataliMi ? (
                          <button className="pill durum-uyumsuz" onClick={() => setSecilenC(c)}
                            style={{ cursor: 'pointer', display: 'block', marginBlockStart: 'var(--sp-1)',
                              maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap', border: '1px solid var(--uyumsuz-bd)' }}
                            title="Hata detayını aç">
                            ⚠ {kisalt(hataMetni, 34)}
                          </button>
                        ) : (
                          // Hata metni duruyor ama connector artık hatalı değil:
                          // kaybolmaz, ama kırmızıya da boyanmaz.
                          <div style={NOT_STIL}>önceki hata: {kisalt(hataMetni, 60)}</div>
                        ))}
                        {/* `ayrinti` bir başarısızlık değildir — bilgi notu. */}
                        {s?.ayrinti && s.ayrinti !== hataMetni && (
                          <div style={NOT_STIL}>{kisalt(s.ayrinti, 90)}</div>
                        )}
                        {s?.reddSebebiEksik && (
                          <div style={NOT_STIL}>{s.reddedilen} kayıt reddedildi, sebep kaydedilmemiş</div>
                        )}
                        {s?.sayacTutarsiz && (
                          <div style={NOT_STIL}>sayaçlar tutmuyor: alınan ≠ kabul + red + yinelenen</div>
                        )}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>
                          {s ? zamanTR(s.baslangic) : '—'}
                        </span>
                        <div className="mikro-etiket">
                          {s ? (TETIKLEYEN[s.tetikleyen] ?? etiketle(s.tetikleyen)) : 'koşu kaydı yok'}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {c.sonBasariliKosu
                          ? <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{zamanTR(c.sonBasariliKosu)}</span>
                          : <span className="mikro-etiket">hiç</span>}
                      </td>
                      <td className="sag" style={{ whiteSpace: 'nowrap' }}>
                        {s ? <>{s.alinan} <span className="birim">→ {s.kabulEdilen}</span></> : '—'}
                        {s && (
                          <div style={{ ...NOT_STIL, textAlign: 'right', whiteSpace: 'nowrap' }}>
                            <span style={s.reddedilen > 0
                              ? { color: 'var(--uyumsuz-fg)', fontWeight: 600 } : undefined}>
                              {s.reddedilen} red
                            </span>
                            {' · '}{s.yinelenen} yinelenen
                          </div>
                        )}
                      </td>
                      <td className="sag" style={{ whiteSpace: 'nowrap' }}>
                        <span className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{sureFmt(s?.sureMs ?? null)}</span>
                        {s && <div style={{ ...NOT_STIL, textAlign: 'right', whiteSpace: 'nowrap' }}>{s.denemeNo}. deneme</div>}
                      </td>
                      <td><TazelikHucresi t={c.tazelik} /></td>
                      <td className="sag">
                        <button className="btn kucuk sirada-gizli yazdirmada-gizle"
                          onClick={() => setSecilenC(c)}>Detay</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Connector'a bağlı olmayan koşular da gizlenmez. */}
        {entegrasyon.yetkili && entegrasyon.bagimsizKosular.length > 0 && (
          <div className="mikro-etiket" style={{ padding: 'var(--sp-3)' }}>
            Connector kaydına bağlı olmayan koşular:{' '}
            {entegrasyon.bagimsizKosular.map((b) => `${b.toplam} ${TETIKLEYEN[b.tetikleyen] ?? etiketle(b.tetikleyen)}`
              + (b.basarisiz > 0 ? ` (${b.basarisiz} başarısız)` : '')
              + (b.bayat > 0 ? ` (${b.bayat} bayat)` : '')).join(' · ')}
          </div>
        )}
        {entegrasyon.yetkili && entegrasyon.arsivKosuSayisi > 0 && (
          <div className="mikro-etiket" style={{ padding: '0 var(--sp-3) var(--sp-3)' }}>
            {entegrasyon.arsivKosuSayisi} koşu, artık listelenmeyen (silinmiş) bir connector kaydına ait.
          </div>
        )}
      </div>

      <div className="kart">
        <div className="kart-baslik">
          <h3>Veri kalitesi</h3>
          <span className="chip">{kalite.length} açık bulgu</span>
        </div>
        {kalite.length === 0 ? (
          <Bos baslik="Açık veri kalitesi bulgusu yok"
            altMetin="Veri kalitesi motoru koştuğunda bulduğu boşluklar burada listelenir." />
        ) : (
          <div className="tablo-sar">
            <table className="tablo">
              <thead><tr>
                <th>Kural</th><th>Açıklama</th><th>İlgili kayıt</th>
              </tr></thead>
              <tbody>
                {kalite.map((b) => (
                  <tr key={b.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <span className="chip">{etiketle(b.kural)}</span>
                    </td>
                    <td>
                      {b.aciklama}
                      <div className="mikro-etiket sirada-gizli">
                        {etiketle(b.kaynakTipi)} · tespit: {tarihTR(b.olusturuldu)}
                      </div>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {b.kayitEtiket
                        ? (b.href
                          ? <Link href={b.href} className="chip mono">{b.kayitEtiket}</Link>
                          : <span className="chip mono">{b.kayitEtiket}</span>)
                        : <span className="mikro-etiket">kayıt silinmiş</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!hicKosuYok && (
        <div className="kart">
          <div className="kart-baslik">
            <h3>Geçmiş koşular</h3>
            <span className="mikro-etiket">son {gecmis.length}</span>
          </div>
          <div className="tablo-sar">
            <table className="tablo">
              <thead><tr>
                <th>İş</th><th>Durum</th><th>Başlangıç</th><th className="sag">Süre</th>
                <th className="sag">İşlenen</th><th className="sag">Üretilen</th><th></th>
              </tr></thead>
              <tbody>
                {gecmis.map((ko) => (
                  <tr key={ko.id}>
                    <td style={{ fontWeight: 500 }}>{etiketi(ko.isAdi)}</td>
                    <td><KosuPill durum={ko.durum} /></td>
                    <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{zamanTR(ko.baslangic)}</td>
                    <td className="sag mono" style={{ fontSize: 'var(--fs-xs)' }}>{sureFmt(ko.sureMs)}</td>
                    <td className="sag">{ko.islenen}</td>
                    <td className="sag">{ko.uretilen}</td>
                    <td className="sag">
                      <button className="btn kucuk sirada-gizli yazdirmada-gizle"
                        onClick={() => setSecilen(ko)}>Detay</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Kip acik={!!secilen} kapat={() => setSecilen(null)}
        baslik={secilen ? etiketi(secilen.isAdi) : ''}
        ust={secilen && <KosuPill durum={secilen.durum} />}>
        {secilen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="band" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div className="band-hucre">
                <span className="mikro-etiket">Başlangıç</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{zamanTR(secilen.baslangic)}</div>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Bitiş · süre</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>
                  {secilen.bitis ? zamanTR(secilen.bitis) : '—'} · {sureFmt(secilen.sureMs)}
                </div>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">İşlenen → üretilen</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>
                  {secilen.islenen} → {secilen.uretilen}
                </div>
              </div>
            </div>
            {secilen.hata && (
              <div>
                <span className="mikro-etiket">Hata</span>
                <pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 'var(--sp-2) 0 0',
                  padding: 'var(--sp-3)', background: 'var(--uyumsuz-bg)',
                  color: 'var(--uyumsuz-fg)', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--uyumsuz-bd)', fontSize: 'var(--fs-xs)' }}>
                  {secilen.hata}
                </pre>
              </div>
            )}
          </div>
        )}
      </Kip>

      {/* Connector detayı — sır DEĞERİ değil, yalnız maskeli referans. */}
      <Kip acik={!!secilenC} kapat={() => setSecilenC(null)} genis
        baslik={secilenC ? secilenC.ad : ''}
        ust={secilenC && <ConnectorPill durum={secilenC.durum} />}>
        {secilenC && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="band" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)' }}>
              <div className="band-hucre">
                <span className="mikro-etiket">Kod · tip</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>
                  {secilenC.kod} · {CONNECTOR_TIP[secilenC.tip] ?? etiketle(secilenC.tip)}
                </div>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Kaynak sistem</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{secilenC.kaynakSistem}</div>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Kayıt durumu</span>
                <div style={{ fontSize: 'var(--fs-sm)' }}>{etiketle(secilenC.kayitDurumu)}</div>
                <div style={{ ...NOT_STIL, maxWidth: 'none' }}>
                  {secilenC.etkin ? 'otomatik koşuya açık' : 'otomatik koşuya kapalı'}
                </div>
              </div>
              <div className="band-hucre">
                <span className="mikro-etiket">Son başarılı koşu</span>
                <div className="mono" style={{ fontSize: 'var(--fs-sm)' }}>
                  {secilenC.sonBasariliKosu ? zamanTR(secilenC.sonBasariliKosu) : 'hiç'}
                </div>
              </div>
            </div>

            <div>
              <span className="mikro-etiket">Sağlık · veri tazeliği</span>
              <div style={{ fontSize: 'var(--fs-sm)', marginBlockStart: 'var(--sp-1)' }}>
                {ENTEGRASYON_DURUM[secilenC.durum].aciklama}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
                marginBlockStart: 'var(--sp-2)' }}>
                <TazelikHucresi t={secilenC.tazelik} />
                <span style={{ ...NOT_STIL, maxWidth: 'none', marginBlockStart: 0 }}>
                  {secilenC.tazelik.aciklama}
                </span>
              </div>
            </div>

            <div>
              <span className="mikro-etiket">Kimlik · sır referansı</span>
              <div className="mono" style={{ fontSize: 'var(--fs-sm)', marginBlockStart: 'var(--sp-1)' }}>
                {KIMLIK_TIP[secilenC.kimlikTipi] ?? etiketle(secilenC.kimlikTipi)}
                {secilenC.kimlikTipi === 'none' ? '' : ` · ${secilenC.sirMaskeli}`}
              </div>
              <div style={{ ...NOT_STIL, maxWidth: 'none' }}>
                Yalnız sırra giden adres gösterilir. Kimlik bilgisinin kendisi veritabanında
                tutulmaz, loglanmaz ve bu ekrana hiçbir koşulda gelmez.
              </div>
              {secilenC.kimlikGerekce && (
                <div className="pill durum-incelemede" style={{ marginBlockStart: 'var(--sp-2)' }}>
                  {secilenC.kimlikGerekce}
                </div>
              )}
            </div>

            {secilenC.imlec && (
              <div>
                <span className="mikro-etiket">Senkronizasyon imleci</span>
                <div className="mono" style={{ fontSize: 'var(--fs-xs)', wordBreak: 'break-all' }}>
                  {secilenC.imlec}
                </div>
              </div>
            )}

            {secilenC.sonKosu?.ayrinti
              && secilenC.sonKosu.ayrinti !== secilenC.sonKosu.reddSebebi && (
              <div>
                <span className="mikro-etiket">Ayrıntı (hata değil)</span>
                <div style={{ ...NOT_STIL, maxWidth: 'none' }}>{secilenC.sonKosu.ayrinti}</div>
              </div>
            )}

            {secilenC.sonKosu?.reddedilen ? (
              <div>
                <span className="mikro-etiket">Reddedilen kayıtlar</span>
                <div style={{ fontSize: 'var(--fs-sm)', marginBlockStart: 'var(--sp-1)' }}>
                  Son koşuda {secilenC.sonKosu.reddedilen} kayıt reddedildi
                  {secilenC.sonKosu.yinelenen > 0 && `, ${secilenC.sonKosu.yinelenen} kayıt yinelenen olarak atlandı`}.
                </div>
                <div style={{ ...NOT_STIL, maxWidth: 'none' }}>
                  {secilenC.sonKosu.reddSebebi
                    ?? 'Sebep koşu kaydına yazılmamış — bu bir kayıt boşluğudur, reddedilen kayıtlar sessizce yok sayılmış olabilir.'}
                </div>
              </div>
            ) : null}

            {/* Ret sebebi zaten yukarıda gösterildiyse aynı metni ikinci kez basma. */}
            {(() => {
              const metin = secilenC.sonKosu?.hata ?? secilenC.sonHata;
              return metin !== null && metin !== undefined && metin !== secilenC.sonKosu?.reddSebebi;
            })() && (
              <div>
                <span className="mikro-etiket">Hata</span>
                <pre className="mono" style={{ whiteSpace: 'pre-wrap', margin: 'var(--sp-2) 0 0',
                  padding: 'var(--sp-3)', background: 'var(--uyumsuz-bg)',
                  color: 'var(--uyumsuz-fg)', borderRadius: 'var(--r-md)',
                  border: '1px solid var(--uyumsuz-bd)', fontSize: 'var(--fs-xs)' }}>
                  {secilenC.sonKosu?.hata ?? secilenC.sonHata}
                </pre>
              </div>
            )}

            <div>
              <span className="mikro-etiket">Son koşular</span>
              {secilenC.gecmis.length === 0 ? (
                <div style={{ fontSize: 'var(--fs-sm)', marginBlockStart: 'var(--sp-1)' }}>
                  Bu connector hiç koşmadı — sağlıklı olduğu anlamına gelmez.
                </div>
              ) : <KosuGecmisi satirlar={secilenC.gecmis} />}
            </div>
          </div>
        )}
      </Kip>
    </>
  );
}
