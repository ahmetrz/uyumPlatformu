'use client';
import Link from 'next/link';
import { useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { BosGenel } from '@/components/sahneler';
import { useEylem } from '@/components/useEylem';
import { exceleAktar, pdfYazdir } from '@/components/disaAktar';
import { tumIsleriCalistir, tekIsCalistir } from '@/lib/eylemler2/isler';
import { zamanTR, tarihTR, type Durum } from '@/lib/sabitler';

type Kosu = {
  id: string; isAdi: string; durum: string; baslangic: string; bitis: string | null;
  sureMs: number | null; islenen: number; uretilen: number; hata: string | null;
};
type Is = { ad: string; etiket: string; aciklama: string; son: Kosu | null };
type KaliteBulgusu = {
  id: string; kural: string; aciklama: string; kaynakTipi: string;
  olusturuldu: string; kayitEtiket: string | null; href: string | null;
};

const KOSU_DURUM: Record<string, { renk: Durum; etiket: string }> = {
  basarili: { renk: 'uyumlu', etiket: 'Başarılı' },
  basarisiz: { renk: 'uyumsuz', etiket: 'Başarısız' },
  calisiyor: { renk: 'incelemede', etiket: 'Çalışıyor' },
};

const KURAL_ETIKET: Record<string, string> = {
  sahipsiz_varlik: 'Sahipsiz varlık', kritikligi_bilinmeyen: 'Kritikliği bilinmeyen',
  eksik_profil: 'Eksik profil', envanteri_bos_tesis: 'Boş envanter',
  sahipsiz_kanit: 'Sahipsiz kanıt', bayat_kayit: 'Bayat kayıt',
};

function sureFmt(ms: number | null): string {
  if (ms === null) return '—';
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** Koşu durumu pill'i — çalışıyorsa nabız animasyonu. */
function KosuPill({ durum }: { durum: string }) {
  const d = KOSU_DURUM[durum] ?? { renk: 'degerlendirilmedi' as Durum, etiket: durum };
  const pill = <Pill durum={d.renk} etiket={d.etiket} />;
  return durum === 'calisiyor'
    ? <span className="nabiz" style={{ display: 'inline-flex', borderRadius: 'var(--r-full)' }}>{pill}</span>
    : pill;
}

export default function SaglikIstemci({ isler, gecmis, kalite, yazabilir }: {
  isler: Is[]; gecmis: Kosu[]; kalite: KaliteBulgusu[]; yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [secilen, setSecilen] = useState<Kosu | null>(null);
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
            ...gecmis.map((ko) => [etiketi(ko.isAdi), KOSU_DURUM[ko.durum]?.etiket ?? ko.durum,
              zamanTR(ko.baslangic), sureFmt(ko.sureMs), ko.islenen, ko.uretilen, ko.hata]) ] },
          { ad: 'Veri kalitesi', satirlar: [
            ['Kural', 'Açıklama', 'İlgili kayıt', 'Tespit'],
            ...kalite.map((b) => [KURAL_ETIKET[b.kural] ?? b.kural, b.aciklama,
              b.kayitEtiket, tarihTR(b.olusturuldu)]) ] },
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
                  {yazabilir && (
                    <button className="btn kucuk yazdirmada-gizle"
                      disabled={bekliyor || is.son?.durum === 'calisiyor'}
                      onClick={() => calistir(() => tekIsCalistir(is.ad))}>▸ Çalıştır</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
                      <span className="chip">{KURAL_ETIKET[b.kural] ?? b.kural}</span>
                    </td>
                    <td>
                      {b.aciklama}
                      <div className="mikro-etiket sirada-gizli">
                        {b.kaynakTipi} · tespit: {tarihTR(b.olusturuldu)}
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
    </>
  );
}
