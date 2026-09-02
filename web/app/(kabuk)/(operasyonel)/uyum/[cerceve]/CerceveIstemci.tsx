'use client';
import { an } from '@/lib/an';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BosIlk, Dugme, Hata, Im, Ipucu, Metrikler, type Durum,
} from '@/components/kabuk/temel';
import { GenisleyenSatir } from '@/components/kabuk/tablo';
import BaglamCubugu from '@/components/kabuk/BaglamCubugu';
import { useEylem } from '@/components/useEylem';
import { kapsamYenidenHesapla } from '@/lib/eylemler2/tesis360';
import { tarihTR } from '@/lib/sabitler';
import {
  aileDurumu, kisaTarih, type CerceveVerisi,
} from '../mantik';

/* O2 · Çerçeve detayı — "bu regülasyon bizde nerede duruyor?" (03-screens O2)

   İki kolon: kontrol ağacı + 420px sunken kapsam paneli. Sağ kolon bu ekranın
   TEK yan yüzeyidir; `Kapsamı çalıştır` yeni bir modal ya da ikinci panel
   açmaz, aynı panelin içeriğini kuru çalıştırma önizlemesiyle değiştirir. */

type Kip = 'kapsam' | 'kuru';

export default function CerceveIstemci({
  veri, kapsamYazabilir,
}: { veri: CerceveVerisi; kapsamYazabilir: boolean }) {
  const parametreler = useSearchParams();
  const aileParam = parametreler.get('aile');
  const kontrolParam = parametreler.get('kontrol');
  const [kip, setKip] = useState<Kip>('kapsam');

  /* ── aile ve alt madde durumları: matrisle AYNI kuraldan türer ────── */
  const aileler = useMemo(() => veri.aileler.map((a) => {
    const yapraklar = a.yapraklar.map((y) => {
      /* Alt maddenin kapsam notu: hangi santralde takip gerektiriyor. */
      const hucreler = veri.satirlar.flatMap((s) => {
        const k = s.kontroller.find((x) => x.maddeId === y.id);
        return k ? [{ tesisKodu: s.kod, ham: k.ham }] : [];
      });
      const sorunlu = hucreler.filter((h) => h.ham === 'uyumsuz' || h.ham === 'kismi');
      const disarida = hucreler.filter((h) => h.ham === 'kapsamdisi');
      return {
        ...y,
        durum: aileDurumu(hucreler.map((h) => h.ham)),
        kapsamNotu: sorunlu.length > 0
          ? sorunlu.map((h) => h.tesisKodu).join(' · ')
          : disarida.length > 0 ? `${disarida.length} tesiste kapsam dışı` : '',
        odak: kontrolParam === y.kod || kontrolParam === y.kisaKod,
      };
    });
    return {
      ...a,
      yapraklar,
      durum: aileDurumu(veri.satirlar.flatMap((s) =>
        s.kontroller.filter((k) => k.aileId === a.id).map((k) => k.ham))),
      acik: aileParam === a.kod || aileParam === a.kisaKod
        || yapraklar.some((y) => y.odak),
    };
  }), [veri, aileParam, kontrolParam]);

  const m = veri.metrikler;
  const kapsamda = veri.kapsam.filter((k) => k.durum === 'kapsamda');
  const disarida = veri.kapsam.filter((k) => k.durum === 'disarida');
  const kararsiz = veri.kapsam.filter((k) => k.durum === 'kararsiz');

  const eslestirmeMetni = veri.eslestirme.length > 0
    ? [
        ...veri.eslestirme.map((e) => `${e.hedef} · ${e.sayi} madde (${e.denklik})`),
        `Kaynak: ${veri.surumEtiketi ?? veri.surum ?? '—'}`,
      ].join(' · ')
    : 'Bu çerçeve için madde eşleştirmesi girilmedi.';

  return (
    <>
      <main data-yuzey="defter" style={{ minWidth: 0 }}>
        <BaglamCubugu
          kirintiler={[
            { ad: 'Uyum', yol: '/uyum' },
            { ad: 'Çerçeveler' },
            { ad: `${veri.gorunenAd} ${veri.surumEtiketi ?? ''}`.trim() },
          ]}
          sag={
            <>
              <Ipucu genis metin={eslestirmeMetni}>
                <span className="ab-dugme satir etiket">Eşleştirme ⓘ</span>
              </Ipucu>
              <Dugme tur="birincil" onClick={() => setKip(kip === 'kuru' ? 'kapsam' : 'kuru')}
                aria-pressed={kip === 'kuru'}>
                Kapsamı çalıştır
              </Dugme>
            </>
          }
        />

        <div style={{ padding: 'var(--s36) var(--gutter-op) var(--sec-pad-bot)' }}>
          <p className="etiket" style={{ margin: 0, color: 'var(--aksan)' }}>
            {veri.yururluk && new Date(veri.yururluk).getTime() <= an() ? 'Yürürlükte' : 'Yayımlandı'}
            {' · '}
            {veri.surumEtiketi ?? veri.surum ?? 'sürümsüz'}
            {veri.surec?.bitis && ` · ${veri.surec.kod} bitiş ${kisaTarih(veri.surec.bitis)}`}
          </p>
          <h1 className="ab-pano-basligi" style={{ margin: 'var(--s12) 0 0', maxWidth: 520 }}>
            {veri.ad}
          </h1>

          {veri.aileler.length === 0 ? (
            <div style={{ marginTop: 'var(--s34)' }}>
              <BosIlk
                cumle="Bu çerçeve henüz eşleştirilmedi — madde kataloğu boş."
                eylem={<Link className="ab-dugme birincil" href="/ice-aktarim">Katalog içe aktar</Link>}
              />
            </div>
          ) : (
            <>
              <div style={{ marginTop: 'var(--s28)', paddingTop: 'var(--s22)',
                borderTop: 'var(--bw-hair) solid var(--hr)' }}>
                <Metrikler
                  metrikler={[
                    {
                      deger: kapsamda.length, payda: veri.toplamAktifTesis,
                      yazi: 'Kapsamda',
                      durum: (kararsiz.length > 0 ? 'unk' : undefined) as Durum | undefined,
                    },
                    { deger: m.maddeSayisi, yazi: 'Kontrol' },
                    {
                      deger: m.uyumsuz, yazi: 'Uyumsuz',
                      durum: (m.uyumsuz > 0 ? 'bd' : undefined) as Durum | undefined,
                    },
                    {
                      deger: m.bilinmeyen, yazi: 'Bilinmeyen',
                      durum: (m.bilinmeyen > 0 ? 'unk' : undefined) as Durum | undefined,
                    },
                  ]}
                />
              </div>

              <div style={{ marginTop: 'var(--s34)',
                borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
                {aileler.map((a) => (
                  <GenisleyenSatir
                    key={a.id}
                    grup={`cerceve-${veri.kod}`}
                    ad={a.baslik}
                    adet={`${a.yapraklar.length}`}
                    durum={a.durum ?? 'unk'}
                    varsayilanAcik={a.acik}
                    cocuklar={
                      <>
                        {a.yapraklar.map((y) => (
                          <Link key={y.id} className="satir"
                            href={`/uyum?kontrol=${encodeURIComponent(y.kod)}`}>
                            <span className="kod"
                              style={y.odak ? { color: 'var(--aksan)', fontWeight: 500 } : undefined}>
                              {y.kisaKod}
                            </span>
                            <span className="ad"
                              style={y.odak ? { fontWeight: 600 } : { color: 'var(--i2)' }}>
                              {y.baslik}
                            </span>
                            <span className="kapsam">{y.kapsamNotu}</span>
                            {y.durum
                              ? <Im durum={y.durum} ad={`${y.kisaKod} ${y.baslik}`} />
                              : <span />}
                          </Link>
                        ))}
                      </>
                    }
                  />
                ))}
              </div>

              <p className="ab-dip">
                Alt maddeye tıklayınca kontrol odası o kontrolde açılır
                {m.bilinmeyen > 0 && ` · ${m.bilinmeyen} değerlendirme yapılmadı`}
                {m.kanitsiz > 0 && ` · ${m.kanitsiz} değerlendirmede kanıt yok`}
              </p>
            </>
          )}
        </div>
      </main>

      <aside className="ab-panel" aria-label={kip === 'kapsam' ? 'Kapsam paneli' : 'Kuru çalıştırma'}>
        <header>
          <span className="etiket vurgu">{kip === 'kapsam' ? 'Kapsam' : 'Kuru çalıştırma'}</span>
          {kip === 'kuru' && (
            <button type="button" className="ab-dugme sag" onClick={() => setKip('kapsam')}
              aria-label="Kapsama dön">✕</button>
          )}
        </header>
        <div className="govde">
          {kip === 'kapsam'
            ? <KapsamPaneli veri={veri} kapsamda={kapsamda} disarida={disarida} kararsiz={kararsiz} />
            : <KuruPanel veri={veri} yazabilir={kapsamYazabilir} bitti={() => setKip('kapsam')} />}
        </div>
      </aside>
    </>
  );
}

/* ═══ Kapsam paneli — kural kartı → uygulanabilirlik → tek not ═══════ */

function KapsamPaneli({
  veri, kapsamda, disarida, kararsiz,
}: {
  veri: CerceveVerisi;
  kapsamda: CerceveVerisi['kapsam'];
  disarida: CerceveVerisi['kapsam'];
  kararsiz: CerceveVerisi['kapsam'];
}) {
  return (
    <>
      <div className="ab-panel-blok">
        {veri.kural ? (
          <div style={{ background: 'var(--panel)', border: 'var(--bw-strong) solid var(--hr2)',
            padding: 'var(--s12) var(--s14)' }}>
            <Ipucu genis metin={`${veri.kural.tam} — ${veri.kural.aciklama ?? ''}`}>
              <span className="ab-dugme satir"
                style={{ fontFamily: 'var(--veri)', fontSize: 'var(--t-code-lg)', fontWeight: 500 }}>
                {veri.kural.ad} · v{veri.kural.surum} ⓘ
              </span>
            </Ipucu>
            <span style={{ display: 'block', marginTop: 'var(--s6)',
              fontSize: 'var(--t-code-lg)', lineHeight: 1.7, color: 'var(--i2)' }}>
              {veri.kural.satir}
            </span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
            Bu çerçeve için uygulanabilirlik kuralı tanımlı değil; kapsam yalnız
            uyum sürecinin tesis listesinden geliyor.
          </p>
        )}
      </div>

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s16)' }}>
        {kapsamda.map((k) => (
          <Link key={k.tesisId} href={k.yol} className="ab-panel-alan">
            <span className="etiket" style={{ color: 'var(--murekkep)' }}>
              {k.ad}
              {k.elIle && (
                <span style={{ marginLeft: 'var(--s8)', fontFamily: 'var(--veri)',
                  fontSize: 'var(--t-code)', color: 'var(--i3)' }}>el ile</span>
              )}
            </span>
            <span className="deger">{k.alt}</span>
          </Link>
        ))}

        {/* Kapsam dışı ve kararsız: ayrı ve sessiz — ikisi aynı şey DEĞİL. */}
        {disarida.length > 0 && (
          <div className="ab-panel-alan">
            <Ipucu genis
              metin={disarida.slice(0, 8).map((k) => `${k.ad}: ${k.gerekce}`).join(' · ')}>
              <span className="etiket ab-dugme satir">{disarida.length} tesis</span>
            </Ipucu>
            <span className="deger" style={{ fontWeight: 400, color: 'var(--i3)' }}>
              kapsam dışı
            </span>
          </div>
        )}
        {kararsiz.length > 0 && (
          <div className="ab-panel-alan">
            <Ipucu genis metin={kararsiz.map((k) => `${k.ad}: ${k.gerekce}`).join(' · ')}>
              <span className="etiket ab-dugme satir">{kararsiz.length} tesis</span>
            </Ipucu>
            <span className="deger" style={{ fontWeight: 400, color: 'var(--i3)' }}>
              {veri.kural ? 'karar yok' : 'süreç dışı'}
            </span>
          </div>
        )}
      </div>

      <p className="ab-panel-dip" style={{ marginTop: 'var(--s22)', paddingTop: 'var(--s18)',
        borderTop: 'var(--bw-strong) solid var(--hr2)' }}>
        {veri.kural?.sonHesap
          ? `Kapsam kararları ${tarihTR(veri.kural.sonHesap)} tarihinde hesaplandı`
          : 'Kapsam kararı hiç hesaplanmadı'}
        {veri.kural && veri.kural.elIleSayisi > 0
          && ` · ${veri.kural.elIleSayisi} karar el ile değiştirildi, motor bunlara dokunmaz`}
      </p>
    </>
  );
}

/* ═══ Kuru çalıştırma — ETKİ ÖNİZLEMESİ, kayıt değiştirmez ═══════════ */

function KuruPanel({
  veri, yazabilir, bitti,
}: { veri: CerceveVerisi; yazabilir: boolean; bitti: () => void }) {
  const { bekliyor, hata, calistir } = useEylem();

  if (!veri.kuru) {
    return (
      <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
        Bu çerçevede aktif uygulanabilirlik kuralı yok; çalıştırılacak bir motor
        bulunmuyor.
      </p>
    );
  }

  const etkilenen = veri.kuru.satirlar.filter(
    (s) => s.sonuc === 'yeni' || s.sonuc === 'degisir');
  const dikkat = veri.kuru.satirlar.filter((s) => s.sonuc === 'kararsiz');
  const korunan = veri.kuru.satirlar.filter((s) => s.sonuc === 'override');
  const ayni = veri.kuru.satirlar.filter((s) => s.sonuc === 'ayni');

  return (
    <>
      <div className="ab-panel-blok">
        <p style={{ margin: 0, fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
          {veri.kural?.ad} · {veri.kuru.satirlar.length} aktif tesise karşı
          çalıştırıldı. Bu bir <b>önizleme</b>: hiçbir karar yazılmadı.
        </p>
        <p className="ab-panel-dip" style={{ margin: 'var(--s10) 0 0' }}>{veri.kuru.ozet}</p>
      </div>

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s22)' }}>
        {[
          { baslik: 'Değişir', liste: etkilenen },
          { baslik: 'Karar üretilemez', liste: dikkat },
          { baslik: 'El ile değiştirilmiş — motor dokunmaz', liste: korunan },
        ].filter((g) => g.liste.length > 0).map((g) => (
          <div key={g.baslik} style={{ marginBottom: 'var(--s16)' }}>
            <p className="etiket" style={{ margin: '0 0 var(--s8)' }}>{g.baslik}</p>
            {g.liste.map((s) => (
              <div key={s.tesisId} className="ab-panel-alan">
                <Ipucu genis metin={s.gerekce}>
                  <span className="etiket ab-dugme satir" style={{ color: 'var(--murekkep)' }}>{s.ad}</span>
                </Ipucu>
                <span className="deger" style={{ fontWeight: 400, color: 'var(--i2)' }}>
                  {s.yazi}
                </span>
              </div>
            ))}
          </div>
        ))}
        {ayni.length > 0 && (
          <p className="ab-panel-dip" style={{ margin: 0 }}>
            {ayni.length} tesisin kararı değişmiyor.
          </p>
        )}
      </div>

      {hata && <div className="ab-panel-blok" style={{ marginTop: 'var(--s16)' }}>
        <Hata cumle={hata} />
      </div>}

      <div className="ab-panel-blok" style={{ marginTop: 'var(--s26)' }}>
        <Dugme tur="tam"
          disabled={!yazabilir || bekliyor || etkilenen.length === 0}
          onClick={() => calistir(async () => {
            for (const s of etkilenen) {
              const sonuc = await kapsamYenidenHesapla({ tesisId: s.tesisId });
              if (!sonuc.ok) return sonuc;
            }
            return { ok: true } as const;
          }, bitti)}>
          {bekliyor ? 'Hesaplanıyor…' : `Kararları hesapla (${etkilenen.length})`}
        </Dugme>
        <p className="ab-panel-dip" style={{ margin: 'var(--s16) 0 0' }}>
          {etkilenen.length === 0
            ? 'Motor bu çerçevede yeni ya da değişen karar üretmiyor.'
            : 'Hesaplama denetim izine yazılır; el ile değiştirilmiş kararlar korunur.'}
          {!yazabilir && ' · Kapsam hesaplaması için tanım yazma yetkisi gerekir.'}
          {dikkat.length > 0
            && ` · ${dikkat.length} tesiste santral profili eksik — karar Plant 360'tan tamamlanır.`}
        </p>
      </div>
    </>
  );
}
