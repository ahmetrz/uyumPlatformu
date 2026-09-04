'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Alan, BosIlk, Dugme, Im } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import {
  degerlendirmeAktarimiReddet, degerlendirmeAktarimiUygula,
  degerlendirmeKuruKosu,
} from '@/lib/eylemler2/degerlendirmeAktarimi';
import {
  AKTARILABILIR_DURUMLAR, aktarimCumlesi, aktarimSayimlari,
  type OnizlemeSatiri,
} from '@/lib/uyum/degerlendirmeAktarimi';
import { tarihTR } from '@/lib/sabitler';
import {
  AKTARIM_IM, AKTARIM_SOZU, SUTUNLAR, aktarimOzeti, metniAyristir,
  ozetCumlesi, satirAlti, type AktarimSatiri,
} from './mantik';

/* ═══ UY-43 · Değerlendirme aktarımı ekranı ═══════════════════════════

   İki adım tek ekranda ama ARDIŞIK: önce kuru koşu, sonra uygulama.
   Uygulama düğmesi kuru koşu koşmadan HİÇ görünmez — önizlemesiz
   uygulama bir seçenek değildir.

   Ham metin sunucuya GÖNDERİLMEZ: `metniAyristir` istemcide çalışır ve
   sunucuya yapısal satırlar gider. Sunucu yine kendi doğrulamasını
   yapar; ayrıştırma bir kolaylıktır, kapı değildir. */

const KOLONLAR = [
  { baslik: 'Kaynak', genislik: '1fr' },
  { baslik: 'Kapsam', genislik: '190px' },
  { baslik: 'Sonuç', genislik: '250px' },
  { baslik: 'Tarih', genislik: '104px', sag: true, ikincil: true },
];

export default function DegerlendirmeAktarimIstemci({
  satirlar, regulasyonlar, tesisler, kosabilir, uygulayabilir,
}: {
  satirlar: AktarimSatiri[];
  regulasyonlar: { id: string; kod: string; ad: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
  kosabilir: boolean;
  uygulayabilir: boolean;
}) {
  const [secili, setSecili] = useState<string | null>(null);
  const [formAcik, setFormAcik] = useState(false);
  const ozet = aktarimOzeti(satirlar);
  const kayit = secili ? satirlar.find((a) => a.id === secili) ?? null : null;

  const tabloSatirlari: Satir[] = satirlar.map((a) => ({
    id: a.id,
    durum: AKTARIM_IM[a.durum],
    konu: a.kaynakAdi,
    alt: `${AKTARIM_SOZU[a.durum]}${a.yukleyen ? ` · ${a.yukleyen}` : ''}`,
    hucreler: [
      `${a.regulasyonKod} · ${a.tesisKod}${a.surecKod ? ` · ${a.surecKod}` : ''}`,
      satirAlti(a),
      tarihTR(a.olusturuldu),
    ],
  }));

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow="Uyum"
          baslik="Değerlendirme aktarımı"
          vurgu={ozet.bekleyen > 0
            ? `${ozet.bekleyen} kuru koşu karar bekliyor` : undefined}
          vurguDurumu={ozet.kokensizUygulama > 0 ? 'bd'
            : ozet.bekleyen > 0 ? 'pl' : undefined}
          metrikler={[
            { deger: ozet.bekleyen, payda: ozet.toplam, yazi: 'kuru koşu bekliyor',
              durum: ozet.bekleyen > 0 ? 'pl' : undefined },
            { deger: ozet.uygulanan, payda: ozet.toplam, yazi: 'uygulandı' },
            /* Değişen kontrol bir ORAN değildir: paydası yok, çünkü
               "kaç kontrolden kaçı" sorusunun bu bağlamda anlamı yok. */
            { deger: ozet.degisenToplam, yazi: 'kontrol durumu değişti' },
            { deger: ozet.reddedilen, payda: ozet.toplam, yazi: 'reddedildi' },
          ]}
        />

        <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
          <p style={{ margin: '0 0 var(--s18)', fontSize: 'var(--t-field)',
            color: ozet.kokensizUygulama > 0 ? 'var(--bd)' : 'var(--i2)' }}>
            {ozetCumlesi(ozet)}
          </p>

          {kosabilir && (
            <div style={{ marginBottom: 'var(--s20)' }}>
              {formAcik
                ? (
                  <KuruKosuFormu
                    regulasyonlar={regulasyonlar}
                    tesisler={tesisler}
                    kapat={() => setFormAcik(false)}
                  />
                )
                : (
                  <Dugme tur="birincil" onClick={() => setFormAcik(true)}>
                    Yeni kuru koşu
                  </Dugme>
                )}
            </div>
          )}

          {satirlar.length > 0 ? (
            <Tablo
              konuBasligi="Aktarım"
              kolonlar={KOLONLAR}
              satirlar={tabloSatirlari}
              secili={secili}
              sec={(id) => setSecili(secili === id ? null : id)}
            />
          ) : (
            <BosIlk cumle={
              'Değerlendirme aktarımı kaydı yok. Bir kuru koşu, hiçbir '
              + 'değerlendirmeye dokunmadan ne olacağını hesaplar.'
            } />
          )}
        </section>
      </main>

      <aside className="ab-panel" aria-label="Aktarım ayrıntısı">
        <header className="baslik">
          <span className="kod">{kayit ? kayit.kaynakAdi : 'Aktarım'}</span>
        </header>
        <div className="govde">
          {kayit
            ? <AktarimPaneli kayit={kayit} uygulayabilir={uygulayabilir} />
            : (
              <p className="ab-panel-dip" style={{ margin: 0 }}>
                Bir aktarım seçin. Kuru koşu kayıtları hiçbir değerlendirmeye
                dokunmaz; uygulama kaydı kendi kuru koşusuna kökenle bağlıdır.
              </p>
            )}
        </div>
      </aside>
    </>
  );
}

/* ── Kuru koşu formu ──────────────────────────────────────────────── */

function KuruKosuFormu({ regulasyonlar, tesisler, kapat }: {
  regulasyonlar: { id: string; kod: string; ad: string }[];
  tesisler: { id: string; kod: string; ad: string }[];
  kapat: () => void;
}) {
  const yenile = useRouter().refresh;
  const [bekliyor, basla] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [regulasyonId, setRegulasyonId] = useState(regulasyonlar[0]?.id ?? '');
  const [tesisId, setTesisId] = useState(tesisler[0]?.id ?? '');
  const [kaynakAdi, setKaynakAdi] = useState('');
  const [metin, setMetin] = useState('');
  /* Kuru koşunun SONUCU ekranda kalır: "hesapladım" demek yetmez,
     kullanıcı satır satır ne olacağını görmelidir. */
  const [sonuc, setSonuc] = useState<OnizlemeSatiri[] | null>(null);

  const ayristirma = metniAyristir(metin);

  function kos() {
    setHata(null);
    basla(async () => {
      const c = await degerlendirmeKuruKosu({
        regulasyonId, tesisId, kaynakAdi, satirlar: ayristirma.satirlar,
      });
      if (!c.ok) { setHata(c.hata); return; }
      setSonuc(c.satirlar ?? []);
      yenile();
    });
  }

  return (
    <div className="ab-blok" style={{ display: 'grid', gap: 'var(--s12)' }}>
      <p className="etiket" style={{ margin: 0 }}>Yeni kuru koşu</p>
      <p className="ab-dip" style={{ margin: 0 }}>
        Kuru koşu HİÇBİR değerlendirmeye dokunmaz: ne olacağını hesaplar ve
        kaydeder. Uygulama ayrı bir adımdır ve bu kayda bağlanır.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'var(--s12)' }}>
        <Alan etiket="Regülasyon" zorunlu>
          <select className="ab-gr" value={regulasyonId} disabled={bekliyor}
            onChange={(e) => setRegulasyonId(e.target.value)}>
            {regulasyonlar.map((r) => (
              <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>
            ))}
          </select>
        </Alan>
        <Alan etiket="Santral" zorunlu>
          <select className="ab-gr" value={tesisId} disabled={bekliyor}
            onChange={(e) => setTesisId(e.target.value)}>
            {tesisler.map((t) => (
              <option key={t.id} value={t.id}>{t.kod} — {t.ad}</option>
            ))}
          </select>
        </Alan>
      </div>

      <Alan etiket="Kaynak adı" zorunlu>
        <input className="ab-gr" value={kaynakAdi} disabled={bekliyor}
          onChange={(e) => setKaynakAdi(e.target.value)}
          placeholder="Örn. 2026 iç değerlendirme çalışması" />
      </Alan>

      <Alan etiket={`Satırlar — sütunlar: ${SUTUNLAR.join(' · ')}`}>
        <textarea className="ab-gr" rows={8} value={metin} disabled={bekliyor}
          onChange={(e) => setMetin(e.target.value)}
          placeholder={'Elektronik tablodan yapıştırın (sekmeyle ayrılmış).\n'
            + 'EPDK-SYM-4.1\tuyumlu\n'
            + 'EPDK-SYM-4.2\tuyumsuz\t\tSaha erişim kontrolü kurulmadı'} />
      </Alan>

      {/* Ayrıştırma sonucu ANINDA görünür: bozuk satır sessizce
          atılmaz, sayılır ve satır numarasıyla yazılır. */}
      {metin.trim().length > 0 && (
        <p className="ab-dip" style={{ margin: 0,
          color: ayristirma.bozuk.length > 0 ? 'var(--md)' : 'var(--i3)' }}>
          {ayristirma.satirlar.length} satır okundu
          {ayristirma.bozuk.length > 0
            && ` · ${ayristirma.bozuk.length} satır ayrıştırılamadı `
              + `(satır ${ayristirma.bozuk.map((b) => b.satirNo).slice(0, 5).join(', ')}`
              + `${ayristirma.bozuk.length > 5 ? '…' : ''}) — bu satırlar gönderilmez`}
          {' · '}virgül ayraç DEĞİLDİR (gerekçe metinleri virgül taşır)
        </p>
      )}

      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}

      <div style={{ display: 'flex', gap: 'var(--s8)' }}>
        <Dugme tur="birincil"
          disabled={bekliyor || !kaynakAdi.trim() || ayristirma.satirlar.length === 0}
          onClick={kos}>
          {bekliyor ? 'Hesaplanıyor…' : 'Kuru koşu yap'}
        </Dugme>
        <Dugme tur="ikincil" onClick={kapat} disabled={bekliyor}>
          {sonuc ? 'Kapat' : 'Vazgeç'}
        </Dugme>
      </div>

      {/* Kuru koşu SONUCU: satır satır ne olacağı. Hiçbir şey yazılmadı;
          uygulama ayrı bir adımdır ve kütükteki kayıttan yapılır. */}
      {sonuc && (
        <div style={{ marginTop: 'var(--s10)' }}>
          <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>
            Kuru koşu sonucu — hiçbir değerlendirmeye dokunulmadı
          </p>
          <OnizlemeListesi satirlar={sonuc} />
          <p className="ab-dip" style={{ margin: 'var(--s10) 0 0' }}>
            Uygulamak için aşağıdaki kütükten bu kaydı seçin: uygulama
            ayrı bir yetki (`uyum/onay`) ve ayrı bir gerekçe ister.
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Aktarım paneli ───────────────────────────────────────────────── */

function AktarimPaneli({ kayit, uygulayabilir }: {
  kayit: AktarimSatiri; uygulayabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [gerekce, setGerekce] = useState('');

  return (
    <>
      <div className="ab-panel-blok">
        <div style={{ display: 'grid', gridTemplateColumns: '22px 1fr',
          gap: 'var(--s8)', alignItems: 'start', marginBottom: 'var(--s14)' }}>
          <span style={{ paddingTop: 3 }}>
            <Im durum={AKTARIM_IM[kayit.durum]} ad={AKTARIM_SOZU[kayit.durum]} />
          </span>
          <span style={{ fontSize: 'var(--t-field)' }}>
            {AKTARIM_SOZU[kayit.durum]}
          </span>
        </div>

        <div className="ab-panel-alan">
          <span className="etiket">Kapsam</span>
          <span className="deger">
            {kayit.regulasyonKod} · {kayit.tesisKod}
            {kayit.surecKod ? ` · ${kayit.surecKod}` : ''}
          </span>
        </div>
        <div className="ab-panel-alan">
          <span className="etiket">Okunan</span>
          <span className="deger">{kayit.okunan} satır</span>
        </div>
        <div className="ab-panel-alan">
          <span className="etiket">Eşleşen</span>
          <span className="deger">{kayit.eslesen}</span>
        </div>
        <div className="ab-panel-alan">
          <span className="etiket">Elenen</span>
          <span className="deger" style={{
            color: kayit.elenen > 0 ? 'var(--md)' : undefined }}>
            {kayit.elenen}
          </span>
        </div>
        {/* Eşleşen ≠ değişen: aynı durumu yeniden yazmak bir değişiklik
            değildir ve iki sayı ayrı gösterilir. */}
        <div className="ab-panel-alan">
          <span className="etiket">
            {kayit.durum === 'uygulandi' ? 'Değişen' : 'Değişecek'}
          </span>
          <span className="deger">{kayit.degisen} kontrol</span>
        </div>
        {kayit.uygulandi && (
          <div className="ab-panel-alan">
            <span className="etiket">Uygulama</span>
            <span className="deger">{tarihTR(kayit.uygulandi)}</span>
          </div>
        )}
        <div className="ab-panel-alan">
          <span className="etiket">Köken</span>
          <span className="deger" style={{
            color: kayit.durum === 'uygulandi' && kayit.kuruKosuId === null
              ? 'var(--bd)' : undefined }}>
            {kayit.durum === 'uygulandi'
              ? (kayit.kuruKosuId
                ? 'bir kuru koşuya bağlı'
                : 'KÖKENSİZ — sunucu bunu yazmaz')
              : 'kuru koşunun kendisi'}
          </span>
        </div>
      </div>

      {kayit.durum === 'kuru_kosu' && kayit.uygulandiMi && (
        <p className="ab-panel-dip" style={{ margin: 'var(--s16) 0 0' }}>
          Bu kuru koşu zaten uygulandı; yeniden uygulanamaz.
        </p>
      )}

      {kayit.durum === 'kuru_kosu' && !kayit.uygulandiMi && (
        <div className="ab-panel-blok" style={{ marginTop: 'var(--s20)',
          display: 'grid', gap: 'var(--s10)' }}>
          <p className="etiket" style={{ margin: 0 }}>Karar</p>
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            Uygulama anında kuru koşu YENİDEN hesaplanır: arada biri bu
            kontrollerin durumunu elle değiştirmiş olabilir ve kaydedilen
            rapora körü körüne yazmak o kararı sessizce ezerdi.
          </p>
          <Alan etiket="Gerekçe (en az 10 karakter)" zorunlu>
            <textarea className="ab-gr" rows={3} value={gerekce} disabled={bekliyor}
              onChange={(e) => setGerekce(e.target.value)} />
          </Alan>
          {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s8)', flexWrap: 'wrap' }}>
            {uygulayabilir && (
              <Dugme tur="birincil"
                disabled={bekliyor || gerekce.trim().length < 10 || kayit.degisen === 0}
                onClick={() => calistir(() => degerlendirmeAktarimiUygula({
                  kuruKosuId: kayit.id, gerekce,
                }))}>
                {kayit.degisen === 0 ? 'Uygulanacak değişiklik yok' : 'Uygula'}
              </Dugme>
            )}
            <Dugme tur="ikincil" disabled={bekliyor || gerekce.trim().length < 10}
              onClick={() => calistir(() => degerlendirmeAktarimiReddet({
                kuruKosuId: kayit.id, gerekce,
              }))}>
              Reddet
            </Dugme>
          </div>
          {!uygulayabilir && (
            <p className="ab-panel-dip" style={{ margin: 0 }}>
              Uygulama `uyum/onay` yetkisi ister; sizde yazma yetkisi var,
              onay yetkisi yok.
            </p>
          )}
        </div>
      )}
    </>
  );
}

/* Kuru koşu sonucunun satır satır dökümü — sunucudan dönen önizleme.
   Ekranda ayrı bir bileşen olarak durur ki kuru koşu formundan sonra
   aynı hesabın çıktısı görünsün. */
function OnizlemeListesi({ satirlar }: { satirlar: OnizlemeSatiri[] }) {
  const sayimlar = aktarimSayimlari(satirlar);
  const [hepsi, setHepsi] = useState(false);
  const [, basla] = useTransition();
  const gorunur = hepsi ? satirlar : satirlar.slice(0, 20);

  return (
    <div style={{ display: 'grid', gap: 'var(--s8)' }}>
      <p className="ab-dip" style={{ margin: 0 }}>{aktarimCumlesi(sayimlar)}</p>
      {gorunur.map((s) => (
        <div key={`${s.satirNo}:${s.maddeKodu}`} style={{ display: 'grid',
          gridTemplateColumns: '22px 1fr', gap: 'var(--s8)' }}>
          <span style={{ paddingTop: 3 }}>
            <Im durum={s.kabul ? (s.degisiyor ? 'md' : 'ok') : 'bd'}
              ad={s.kabul ? (s.degisiyor ? 'değişecek' : 'aynı') : 'elendi'} />
          </span>
          <span style={{ fontSize: 'var(--t-label)' }}>
            <span className="mono">{s.maddeKodu}</span>{' — '}
            {s.kabul
              ? (s.degisiyor
                ? `${s.eskiDurum} → ${s.yeniDurum}`
                : `${s.yeniDurum} (değişmiyor)`)
              : s.aciklama}
          </span>
        </div>
      ))}
      {!hepsi && satirlar.length > 20 && (
        <button type="button" className="ab-dugme satir"
          onClick={() => basla(() => setHepsi(true))}>
          +{satirlar.length - 20} satır daha
        </button>
      )}
      {/* Sözlük ekranda görünür: kabul edilen durumlar sayılıdır. */}
      <p className="ab-dip" style={{ margin: 0 }}>
        Kabul edilen durumlar: {AKTARILABILIR_DURUMLAR.join(' · ')}
      </p>
    </div>
  );
}
