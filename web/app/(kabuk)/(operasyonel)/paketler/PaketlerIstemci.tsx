'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import { Alan, BosIlk, Dugme, Hata, Im } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Kolon, type Satir } from '@/components/kabuk/tablo';
import { paketKaldir, paketKur } from '@/lib/eylemler2/paket';
import { tarihTR } from '@/lib/sabitler';
import { HAL_IMI, HAL_SOZU, eylemler, halCumlesi } from './mantik';
import type { PaketEkranVerisi, PaketSatiri } from './veri';

/* ═══ P4 · 2.6 · İçerik paketleri ═══════════════════════════════════════

   Birincil iş: "Kurulu paketleri ve bekleyen güncellemeyi gör; kur /
   güncelle / kaldır kararını gerekçesiyle ver."

   Üç saniye: başlık kurulu sayısını, ölçüt satırı dikkat isteyeni
   (güncelleme · doğrulanamadı · aktifleştirme bekleyen taslak) söyler;
   satır sırası karar sırasıdır. Okuma hâli ile düzenleme hâli ayrıdır:
   kaldırma gerekçesi yalnız Kaldır seçilince açılır. Kurulum raporu ve
   disk hataları (L3) seçili satırın panelinde durur, tabloda değil.

   Ekran HİÇBİR çerçeveyi aktifleştirmez — cümle kalıcıdır (lede altı),
   çünkü paket "kurdum" demek "yürürlükte" demek değildir. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Tür', genislik: '150px' },
  { baslik: 'Kurulu', genislik: '84px' },
  { baslik: 'Diskte', genislik: '84px' },
  { baslik: 'Durum', genislik: '170px' },
  { baslik: 'Çerçeve', genislik: '150px', ikincil: true },
];

const KURULUM_OZETI = (r: NonNullable<PaketSatiri['kurulu']>['rapor']) => r
  ? `sözlük ${r.sayilar.sozluk} · öznitelik ${r.sayilar.oznitelikler} · çerçeve ${r.sayilar.cerceveler} (${r.sayilar.maddeler} madde) · eşleme ${r.sayilar.eslemeler} · form ${r.sayilar.formlar} · rapor ${r.sayilar.raporlar} · rol ${r.sayilar.roller}`
    + (r.celiskiler.length ? ` · çelişki ${r.celiskiler.length} (kiracı satırı korundu)` : '')
  : 'kurulum raporu yok';

export default function PaketlerIstemci({ veri, yazabilir }: { veri: PaketEkranVerisi; yazabilir: boolean }) {
  const router = useRouter();
  const [secili, setSecili] = useUrlDurumuBos('paket');
  const [kaldirAcik, setKaldirAcik] = useState(false);
  const [gerekce, setGerekce] = useState('');
  const [bekliyor, baslat] = useTransition();
  const [hata, setHata] = useState<string | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);

  const satir = veri.satirlar.find((s) => s.kod === secili) ?? null;

  function kur(kod: string) {
    setHata(null); setMesaj(null);
    baslat(async () => {
      const sonuc = await paketKur({ kod });
      if (!sonuc.ok) { setHata(sonuc.hata); return; }
      const r = sonuc.rapor;
      setMesaj(`${r.kod} ${r.surum} kuruldu — ${KURULUM_OZETI(r)}. Çerçeve sürümleri TASLAK: aktifleştirme Regülasyonlar ekranında.`);
      router.refresh();
    });
  }
  function kaldir(kod: string) {
    setHata(null); setMesaj(null);
    baslat(async () => {
      const sonuc = await paketKaldir({ kod, gerekce });
      if (!sonuc.ok) { setHata(sonuc.hata); return; }
      setMesaj(`${kod} kaldırıldı (arşiv): satırları pasifleşti, hiçbiri silinmedi.`);
      setKaldirAcik(false); setGerekce('');
      router.refresh();
    });
  }

  const satirlar: Satir[] = veri.satirlar.map((s) => ({
    id: s.kod,
    durum: HAL_IMI[s.hal],
    konu: s.kod,
    alt: s.ad,
    hucreler: [
      s.sektor ? `${s.tur} · ${s.sektor}` : s.tur,
      s.kurulu?.surum ?? '—',
      s.disk?.surum ?? '—',
      HAL_SOZU[s.hal],
      s.kurulu ? `${s.cerceve.aktif} aktif · ${s.cerceve.taslak} taslak` : '—',
    ],
  }));

  return (
    /* Kabuk `<main>` BASMAZ: ana bölgeyi ekranın kendisi çizer. */
    <main data-yuzey="operasyonel" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="Uyum · içerik paketleri"
        baslik="paket kurulu"
        vurgu={String(veri.ozet.kurulu)}
        vurguDurumu={veri.ozet.dogrulanamadi > 0 ? 'bd' : veri.ozet.guncellemeVar > 0 ? 'md' : 'ok'}
        metrikler={[
          { deger: String(veri.ozet.guncellemeVar), yazi: 'güncelleme var', durum: veri.ozet.guncellemeVar > 0 ? 'md' : undefined },
          { deger: String(veri.ozet.dogrulanamadi), yazi: 'doğrulanamadı', durum: veri.ozet.dogrulanamadi > 0 ? 'bd' : undefined },
          { deger: String(veri.ozet.taslakCerceve), yazi: 'taslak çerçeve · aktifleştirme bekliyor', durum: veri.ozet.taslakCerceve > 0 ? 'md' : undefined },
        ]}
      />

      {/* Kalıcı kural: ekran çerçeve aktifleştirmez. Sözcük rengin YANINDA. */}
      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s16)', paddingLeft: 'var(--s12)', borderLeft: '3px solid var(--md)' }}>
        <b>Aktifleştirme insan kararıdır.</b> Paket çerçeveyi <b>TASLAK</b> getirir; bu ekran hiçbir çerçeveyi
        aktifleştirmez. Aktifleştirme <Link href="/regulasyonlar">Regülasyonlar</Link> ekranında, sürümün farkı görülerek
        verilir. Kaldırma arşivdir: hiçbir satır silinmez.
      </p>

      {veri.kokHatasi && (
        <Hata cumle="Paket dizini okunamadı — diskteki paketler ölçülmedi, yalnız kurulu olanlar listelendi." teknik={veri.kokHatasi} />
      )}

      {satirlar.length === 0
        ? (
          <BosIlk
            cumle="Kurulu ya da diskte hazır paket yok. Paket bir dizindir (paketler/KOD-ADI, bkz. paketler/BENIOKU.md); paket gelene kadar çerçeve elle içe aktarılır."
            eylem={<Link href="/ice-aktarim" className="ab-dugme">Regülasyonu elle içe aktar</Link>} />
        )
        : (
          <Tablo
            kolonlar={KOLONLAR}
            satirlar={satirlar}
            konuBasligi="Paket"
            etiket="İçerik paketleri kütüğü"
            secili={secili}
            sec={(id) => { setSecili(id === secili ? null : id); setKaldirAcik(false); setHata(null); setMesaj(null); }}
          />
        )}

      {mesaj && <p className="ab-panel-dip" role="status" style={{ marginTop: 'var(--s12)' }}>{mesaj}</p>}
      {hata && <Hata cumle="İşlem yapılmadı." teknik={hata} />}

      {satir && <PaketPaneli satir={satir} yazabilir={yazabilir} bekliyor={bekliyor}
        kaldirAcik={kaldirAcik} setKaldirAcik={setKaldirAcik} gerekce={gerekce} setGerekce={setGerekce}
        kur={() => kur(satir.kod)} kaldir={() => kaldir(satir.kod)} />}
    </main>
  );
}

function PaketPaneli({ satir, yazabilir, bekliyor, kaldirAcik, setKaldirAcik, gerekce, setGerekce, kur, kaldir }: {
  satir: PaketSatiri; yazabilir: boolean; bekliyor: boolean;
  kaldirAcik: boolean; setKaldirAcik: (v: boolean) => void; gerekce: string; setGerekce: (v: string) => void;
  kur: () => void; kaldir: () => void;
}) {
  const e = eylemler(satir.hal, { yazabilir, kurulu: satir.kurulu?.durum === 'kurulu', bagimlilar: satir.bagimlilar, aktifCerceve: satir.cerceve.aktif });
  const gerekceGecerli = gerekce.trim().length >= 10;
  const disk = satir.disk;
  return (
    <section className="ab-panel-blok" aria-label={`${satir.kod} paketi`} style={{ marginTop: 'var(--s24)' }}>
      <p className="etiket" style={{ margin: '0 0 var(--s10)' }}>
        <Im durum={HAL_IMI[satir.hal]} ad={HAL_SOZU[satir.hal]} /> {satir.kod} · {satir.ad} — {HAL_SOZU[satir.hal]}
      </p>
      <p className="ab-panel-dip" style={{ margin: '0 0 var(--s12)' }}>
        {halCumlesi(satir.hal, { diskSurum: disk?.surum ?? null, kuruluSurum: satir.kurulu?.surum ?? null, diskHatalari: disk?.hatalar.length ?? 0 })}
      </p>

      <dl className="ab-panel-ciftler" style={{ margin: '0 0 var(--s12)' }}>
        <dt>Tür · sektör</dt><dd>{satir.sektor ? `${satir.tur} · ${satir.sektor}` : satir.tur}</dd>
        <dt>Kurulu</dt>
        <dd>{satir.kurulu
          ? `${satir.kurulu.surum} · ${tarihTR(satir.kurulu.zaman)} · ${satir.kurulu.kuran ?? 'kuran bilinmiyor'}${satir.kurulu.durum === 'arsiv' ? ' · arşiv' : ''}`
          : 'kurulu değil'}</dd>
        <dt>Diskte</dt>
        <dd>{disk
          ? (disk.sayilar
            ? `${disk.surum} · sözlük ${disk.sayilar.sozluk} · öznitelik ${disk.sayilar.oznitelikler} · çerçeve ${disk.sayilar.cerceveler} (${disk.sayilar.maddeler} madde) · eşleme ${disk.sayilar.eslemeler} · form ${disk.sayilar.formlar} · rapor ${disk.sayilar.raporlar} · rol ${disk.sayilar.roller}`
            : `${disk.surum} · doğrulanamadı (${disk.hatalar.length} hata)`)
          : 'diskte yok'}</dd>
        <dt>Bağımlılık</dt>
        <dd>{(satir.kurulu?.bagimliliklar ?? disk?.bagimliliklar ?? []).join(', ') || 'yok'}</dd>
        <dt>Bağımlı kurulu paket</dt>
        <dd>{satir.bagimlilar.join(', ') || 'yok'}</dd>
        <dt>Çerçeve sürümleri</dt>
        <dd>{satir.kurulu
          ? <>{satir.cerceve.aktif} aktif · {satir.cerceve.taslak} taslak · {satir.cerceve.arsiv} arşiv{satir.cerceve.taslak > 0 && <> — <Link href="/regulasyonlar">aktifleştirme Regülasyonlar ekranında</Link></>}</>
          : '—'}</dd>
        <dt>Son kurulum raporu</dt>
        <dd>{satir.kurulu ? KURULUM_OZETI(satir.kurulu.rapor) : '—'}</dd>
      </dl>

      {disk && disk.hatalar.length > 0 && (
        <details className="ab-teknik" style={{ marginBottom: 'var(--s12)' }}>
          <summary>Doğrulayıcı hataları ({disk.hatalar.length})</summary>
          {disk.hatalar.map((h) => <p key={h} className="mono">{h}</p>)}
        </details>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--s10)', alignItems: 'center' }}>
        <Dugme tur="birincil" onClick={kur} disabled={bekliyor || e.kur.engel !== null}>{e.kur.etiket}</Dugme>
        {e.kur.engel && <span className="ab-panel-dip">{e.kur.engel}</span>}
        <Dugme tur="ret" onClick={() => setKaldirAcik(!kaldirAcik)} disabled={bekliyor || e.kaldir.engel !== null} aria-expanded={kaldirAcik}>
          {e.kaldir.etiket}
        </Dugme>
        {e.kaldir.engel && <span className="ab-panel-dip">{e.kaldir.engel}</span>}
      </div>

      {kaldirAcik && e.kaldir.engel === null && (
        <div style={{ marginTop: 'var(--s12)', maxWidth: 620 }}>
          <Alan etiket="Kaldırma gerekçesi (denetim izine yazılır)" zorunlu
            hata={gerekce && !gerekceGecerli ? 'Gerekçe en az 10 karakter' : undefined}>
            <textarea value={gerekce} onChange={(ev) => setGerekce(ev.target.value)} aria-invalid={!!gerekce && !gerekceGecerli}
              placeholder="Neden kaldırılıyor? Satırlar silinmez, pasifleşir." />
          </Alan>
          <div style={{ display: 'flex', gap: 'var(--s10)' }}>
            <Dugme tur="ret" onClick={kaldir} disabled={bekliyor || !gerekceGecerli}>Kaldırmayı onayla</Dugme>
            <Dugme onClick={() => { setKaldirAcik(false); setGerekce(''); }} disabled={bekliyor}>Vazgeç</Dugme>
          </div>
        </div>
      )}
    </section>
  );
}
