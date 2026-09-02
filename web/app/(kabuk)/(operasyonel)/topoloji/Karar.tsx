'use client';
import { useState } from 'react';
import { Alan, Dugme } from '@/components/kabuk/temel';
import { CekmeceEylemler } from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import {
  anligiKarsilastirEylem, kayittanAnlikAl, sapmaKararVer, sapmadanBulguAc,
  sapmadanRiskAc, sapmayiIncelemeyeAl, temelOlarakOnayla,
} from '@/lib/eylemler2/topoloji';
import { zamanTR } from '@/lib/sabitler';
import {
  GEREKCE_ASGARI, KAYNAK_SOZU, SIDDET_ETIKETI, acikMi, kararPasifMi,
  type AnlikSatiri, type SapmaSatiri,
} from './mantik';

/* Topoloji tezgâhının YAZMA yüzeyi. MODAL YOK: karar çekmecede verilir.

   Ekranın dört değişmezi burada görünür hâle gelir:
   1. Gerekçe ZORUNLU ve en az on karakter — girilmeden hiçbir karar
      düğmesi etkin olmaz (kararPasifMi, sunucudaki eşikle aynı).
   2. "Hepsini kabul et" YOKTUR. Toplu karar yüzeyi bilerek yazılmadı:
      her sapma tek tek açılıp farkın iki yakası görülmeden kapatılamaz.
   3. Kritik sapmanın risk/bulgu ADAYI hazır durur ama kaydı düğmeye
      insan basınca açılır; motor bu eylemleri çağırmaz.
   4. Hiçbir düğme ağa, geçide, PLC'ye ya da varlığa dokunmaz — kabul
      edilen sapma yalnız TEMELİ taşır. */

const RET_SINIFI = 'dg dg-ikincil dg-ret';
const pasifStil = (pasif: boolean) =>
  (pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined);

export type Tesis = { id: string; kod: string; ad: string };
export type MaddeSecenegi = { id: string; tesisId: string; etiket: string };

/* ═══ Sapma kararı ════════════════════════════════════════════════════ */

export function SapmaKararlari({
  satir, onaylayabilir, riskYazabilir, uyumYazabilir, maddeDurumlari,
}: {
  satir: SapmaSatiri;
  onaylayabilir: boolean;
  riskYazabilir: boolean;
  uyumYazabilir: boolean;
  maddeDurumlari: MaddeSecenegi[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const [kayitAcik, setKayitAcik] = useState<'yok' | 'risk' | 'bulgu'>('yok');
  const [riskKodu, setRiskKodu] = useState('');
  const [riskBasligi, setRiskBasligi] = useState('');
  const [maddeDurumuId, setMaddeDurumuId] = useState('');

  const acik = acikMi(satir);
  const yetkili = onaylayabilir && satir.kararVerilebilir;
  const engel = kararPasifMi({ acik, yetkili, gerekce, bekliyor });
  const kararPasif = engel !== '';

  function karar(tip: 'kabul' | 'ret') {
    calistir(
      () => sapmaKararVer({ sapmaId: satir.id, karar: tip, gerekce: gerekce.trim() }),
      () => setGerekce(''),
    );
  }

  const dipNot = [
    acik
      ? 'Karar denetim izine gerekçesiyle yazılır. Kabul yalnız TEMELİ taşır;'
        + ' ağ, geçit, PLC ya da varlık kaydı değişmez.'
      : `${satir.kararVeren ?? 'Bilinmeyen karar veren'}`
        + ` · ${satir.kararZamani ? zamanTR(satir.kararZamani) : 'zaman yok'}`
        + (satir.kararGerekcesi ? ` · ${satir.kararGerekcesi}` : ''),
    satir.uretilenRiskKodu ? `Risk kaydı: ${satir.uretilenRiskKodu}` : null,
    satir.uretilenBulguId ? 'Bulgu kaydı açıldı' : null,
  ].filter(Boolean).join(' · ');

  /* Kayıt açma, karardan BAĞIMSIZ bir yetkidir: kapanmış bir sapmadan da
     risk açılabilir, açık bir sapma da kayıt açılmadan reddedilebilir. */
  const kayitFormu = (
    <>
      {kayitAcik === 'risk' && (
        <div style={{ width: '100%', marginTop: 'var(--s12)', display: 'grid', gap: 'var(--s10)' }}>
          <Alan etiket="Risk kodu" zorunlu>
            <input className="ab-gr" value={riskKodu} onChange={(e) => setRiskKodu(e.target.value)}
              placeholder="ör. RSK-2026-014" />
          </Alan>
          <Alan etiket="Başlık">
            <input className="ab-gr" value={riskBasligi}
              onChange={(e) => setRiskBasligi(e.target.value)}
              placeholder="Boş bırakılırsa sapmanın başlığı kullanılır" />
          </Alan>
          <p className="ab-dip" style={{ margin: 0 }}>
            Risk kaydı skorsuz açılır: olasılık ve etki ÖLÇÜLMEDİ, otomatik
            sayı uydurulmaz. Skoru risk kütüğünde insan verir.
          </p>
          <div>
            <Dugme tur="tam"
              disabled={!riskYazabilir || bekliyor || !riskKodu.trim()
                || gerekce.trim().length < GEREKCE_ASGARI}
              style={pasifStil(!riskYazabilir || bekliyor || !riskKodu.trim()
                || gerekce.trim().length < GEREKCE_ASGARI)}
              onClick={() => calistir(
                () => sapmadanRiskAc({
                  sapmaId: satir.id, kod: riskKodu.trim(),
                  baslik: riskBasligi.trim() || undefined, gerekce: gerekce.trim(),
                }),
                () => { setRiskKodu(''); setRiskBasligi(''); setKayitAcik('yok'); },
              )}>
              Risk kaydını aç
            </Dugme>
          </div>
        </div>
      )}

      {kayitAcik === 'bulgu' && (
        <div style={{ width: '100%', marginTop: 'var(--s12)', display: 'grid', gap: 'var(--s10)' }}>
          <Alan etiket="Bağlanacak madde durumu" zorunlu>
            <select className="ab-gr" value={maddeDurumuId}
              onChange={(e) => setMaddeDurumuId(e.target.value)}>
              <option value="">Seçin…</option>
              {maddeDurumlari
                .filter((m) => !satir.tesisId || m.tesisId === satir.tesisId)
                .map((m) => <option key={m.id} value={m.id}>{m.etiket}</option>)}
            </select>
          </Alan>
          <p className="ab-dip" style={{ margin: 0 }}>
            Bulgu bir madde durumuna bağlıdır; hangi maddeye bağlanacağını
            motor bilemez — seçimi insan yapar.
          </p>
          <div>
            <Dugme tur="tam"
              disabled={!uyumYazabilir || bekliyor || !maddeDurumuId
                || gerekce.trim().length < GEREKCE_ASGARI}
              style={pasifStil(!uyumYazabilir || bekliyor || !maddeDurumuId
                || gerekce.trim().length < GEREKCE_ASGARI)}
              onClick={() => calistir(
                () => sapmadanBulguAc({
                  sapmaId: satir.id, maddeDurumuId, gerekce: gerekce.trim(),
                }),
                () => { setMaddeDurumuId(''); setKayitAcik('yok'); },
              )}>
              Bulgu kaydını aç
            </Dugme>
          </div>
        </div>
      )}
    </>
  );

  return (
    <CekmeceEylemler
      birincil={
        <>
          <Alan etiket="Gerekçe" zorunlu>
            <textarea
              className="ab-gr" rows={3} value={gerekce}
              onChange={(e) => setGerekce(e.target.value)}
              placeholder={`Kararın dayanağı — en az ${GEREKCE_ASGARI} karakter,`
                + ' denetim izine bu metin yazılır'}
              style={{ resize: 'vertical' }}
            />
          </Alan>
          {acik && (
            <div style={{ marginTop: 'var(--s12)', display: 'flex', gap: 'var(--s10)',
              flexWrap: 'wrap' }}>
              <Dugme tur="tam" disabled={kararPasif} style={pasifStil(kararPasif)}
                onClick={() => karar('kabul')}>
                Sapmayı kabul et
              </Dugme>
              <Dugme className={RET_SINIFI} disabled={kararPasif} style={pasifStil(kararPasif)}
                onClick={() => karar('ret')}>
                Reddet · temel korunsun
              </Dugme>
              {satir.durum === 'gozlendi' && (
                <Dugme disabled={!satir.kararVerilebilir || bekliyor}
                  style={pasifStil(!satir.kararVerilebilir || bekliyor)}
                  onClick={() => calistir(() => sapmayiIncelemeyeAl({ sapmaId: satir.id }))}>
                  İncelemeye al
                </Dugme>
              )}
            </div>
          )}
          {acik && engel && (
            <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>{engel}</p>
          )}
        </>
      }
      ikincil={
        <div style={{ display: 'flex', gap: 'var(--s10)', flexWrap: 'wrap' }}>
          {satir.adayVar && !satir.uretilenRiskId && (
            <Dugme disabled={!riskYazabilir} style={pasifStil(!riskYazabilir)}
              onClick={() => setKayitAcik((v) => (v === 'risk' ? 'yok' : 'risk'))}>
              {kayitAcik === 'risk' ? 'Risk formunu kapat' : 'Risk kaydı aç'}
            </Dugme>
          )}
          {satir.adayVar && !satir.uretilenBulguId && (
            <Dugme disabled={!uyumYazabilir} style={pasifStil(!uyumYazabilir)}
              onClick={() => setKayitAcik((v) => (v === 'bulgu' ? 'yok' : 'bulgu'))}>
              {kayitAcik === 'bulgu' ? 'Bulgu formunu kapat' : 'Bulgu kaydı aç'}
            </Dugme>
          )}
          {satir.adayVar && (satir.uretilenRiskId || satir.uretilenBulguId) && (
            <p className="ab-dip" style={{ width: '100%', margin: 0 }}>
              Bu sapmadan kayıt açılmış; ikinci kez açılamaz.
            </p>
          )}
          {!satir.adayVar && (
            <p className="ab-dip" style={{ width: '100%', margin: 0 }}>
              Risk/bulgu adayı yalnız KRİTİK sapmada doğar — bu sapmanın
              şiddeti {SIDDET_ETIKETI[satir.siddet] ?? satir.siddet}. Kayıt
              gerekiyorsa risk kütüğünden elle açılır.
            </p>
          )}
          {kayitFormu}
          {hata && <p className="ab-gr-hata" role="alert" style={{ width: '100%' }}>{hata}</p>}
        </div>
      }
      dipNot={dipNot}
    />
  );
}

/* ═══ Anlık eylemleri ═════════════════════════════════════════════════ */

export function AnlikEylemleri({ anlik }: { anlik: AnlikSatiri }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');
  const [ozet, setOzet] = useState<string | null>(null);

  const onayPasif = !anlik.temelOnaylanabilir || bekliyor
    || gerekce.trim().length < GEREKCE_ASGARI;
  const karsilastirPasif = !anlik.karsilastirilabilir || bekliyor || anlik.temelMi;

  const dipNot = [
    anlik.temelMi
      ? `Yürürlükteki temel · ${anlik.onaylayan ?? 'onaylayan kaydı yok'}`
        + ` · ${anlik.onayZamani ? zamanTR(anlik.onayZamani) : 'onay zamanı yok'}`
      : anlik.temelVar
        ? 'Bu anlık temel değil; temele göre karşılaştırılır.'
        : 'Kapsamın onaylı temeli yok — karşılaştırma yapılamaz, sapma HESAPLANMAZ.',
    'Anlık almak ya da temeli taşımak ağa hiçbir paket göndermez.',
  ].join(' ');

  return (
    <CekmeceEylemler
      birincil={
        anlik.temelMi ? null : (
          <>
            <Alan etiket="Gerekçe" zorunlu>
              <textarea className="ab-gr" rows={2} value={gerekce}
                onChange={(e) => setGerekce(e.target.value)}
                placeholder={'Bu anlığın temel olarak onaylanma dayanağı'
                  + ` — en az ${GEREKCE_ASGARI} karakter`}
                style={{ resize: 'vertical' }} />
            </Alan>
            <div style={{ marginTop: 'var(--s12)', display: 'flex', gap: 'var(--s10)',
              flexWrap: 'wrap' }}>
              <Dugme tur="tam" disabled={onayPasif} style={pasifStil(onayPasif)}
                onClick={() => calistir(
                  () => temelOlarakOnayla({ anlikId: anlik.id, gerekce: gerekce.trim() }),
                  () => setGerekce(''),
                )}>
                Temel olarak onayla
              </Dugme>
              <Dugme disabled={karsilastirPasif} style={pasifStil(karsilastirPasif)}
                onClick={() => calistir(async () => {
                  const s = await anligiKarsilastirEylem({ anlikId: anlik.id });
                  setOzet(!s.ok ? null
                    : s.durum === 'sapma_var'
                      ? `${s.yazilan} sapma yazıldı — karar sizin.`
                      : 'Karşılaştırıldı, fark bulunmadı.');
                  return s;
                })}>
                Temelle karşılaştır
              </Dugme>
            </div>
            {!anlik.temelOnaylanabilir && (
              <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
                Temel onayı için envanter onay yetkisi gerekiyor.
              </p>
            )}
          </>
        )
      }
      ikincil={
        <>
          {ozet && <p className="ab-dip" style={{ margin: 0 }}>{ozet}</p>}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
        </>
      }
      dipNot={dipNot}
    />
  );
}

/* ═══ Kayıttan anlık alma ═════════════════════════════════════════════ */

/**
 * Onaylı iç kayıttan (CMDB) anlık dondurur. DIŞ SİSTEME BAĞLANMAZ ve ağa
 * paket göndermez — kaynağı açıkça `cmdb_kayit`tır. İlk temeli kurmanın
 * dürüst yolu budur; "tara" düğmesi bu üründe yoktur.
 */
export function AnlikAlmaFormu({
  tesisler, yazabilir,
}: { tesisler: Tesis[]; yazabilir: boolean }) {
  const { bekliyor, hata, calistir } = useEylem();
  const [tesisId, setTesisId] = useState(tesisler[0]?.id ?? '');
  const [not, setNot] = useState('');

  const pasif = !yazabilir || bekliyor;

  return (
    <details style={{ marginBottom: 'var(--s20)' }}>
      <summary className="ab-filtre" style={{ listStyle: 'none', cursor: 'pointer' }}>
        Kayıttan anlık al ▾
      </summary>
      <div className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s12)',
        display: 'grid', gap: 'var(--s12)' }}>
        <p className="ab-dip" style={{ margin: 0 }}>
          Anlık, onaylı ağ kaydından (bölge, geçit, varlık ilişkisi) dondurulur.
          Alınan anlık TEMEL OLMAZ; temel yalnız ayrı bir insan onayıyla kurulur.
        </p>
        <Alan etiket="Kapsam">
          <select className="ab-gr" value={tesisId} onChange={(e) => setTesisId(e.target.value)}>
            {tesisler.map((t) => <option key={t.id} value={t.id}>{t.kod} · {t.ad}</option>)}
            <option value="">Tesissiz (tüm kayıt)</option>
          </select>
        </Alan>
        <Alan etiket="Not">
          <input className="ab-gr" value={not} onChange={(e) => setNot(e.target.value)}
            placeholder="ör. bakım duruşu sonrası referans anlık" />
        </Alan>
        <div>
          <Dugme tur="birincil" disabled={pasif} style={pasifStil(pasif)}
            onClick={() => calistir(
              () => kayittanAnlikAl({ tesisId: tesisId || null, not: not.trim() || null }),
              () => setNot(''),
            )}>
            {bekliyor ? 'Anlık alınıyor…' : 'Anlığı dondur'}
          </Dugme>
          {!yazabilir && (
            <p className="ab-dip">Anlık almak için envanter yazma yetkisi gerekiyor.</p>
          )}
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
        </div>
      </div>
    </details>
  );
}

/** Anlığın kaynağını insan sözüne çevirir; bilinmeyen kod olduğu gibi kalır. */
export const kaynakSozu = (kaynak: string): string => KAYNAK_SOZU[kaynak] ?? kaynak;
