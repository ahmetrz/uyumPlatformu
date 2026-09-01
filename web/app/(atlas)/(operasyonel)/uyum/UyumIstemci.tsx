'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEylem } from '@/components/useEylem';
import { kanitTalebiEkle } from '@/lib/eylemler2/denetim';
import { DURUM_ETIKET, etiketle, uyumOzeti } from '@/lib/sabitler';
import {
  acikMi, kisaTarih,
  type CerceveVerisi, type Kontrol, type TesisSatiri,
} from './mantik';

/* ═══════════════════════════════════════════════════════════════════════
   UYUM KONTROL ODASI — C · OPERATIONAL LUXURY

   Görsel source of truth: `c-compliance.html`
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §3 ve §4).

   Bu bir yeniden STİLLENDİRME değil. Orijinal tasarım ürünün eski
   ekranından üç noktada MADDİ olarak ayrılıyor ve üçü de burada uygulandı:

   1 · MATRİS DEVRİKTİR. Eskiden satır = santral, sütun = kontrol ailesiydi
       ve hücre bir AİLEYİ temsil ettiği için "hangi kontrol?" sorusu
       hücreden okunamıyordu. Prototipte satır = KONTROL, sütun = SANTRAL:
       defterin sorusu "bu kontrolde kim uygunsuz" hâline gelir.

   2 · DETAY ÇEKMECEDE DEĞİL SATIR İÇİNDE AÇILIR. 420px çekmece defteri
       terk ettirir; prototip gerekçeyi satırın altında, aynı sayfada dört
       sütun hâlinde açar: NEDEN · KANIT · YÖNETİŞİM ZİNCİRİ · SORUMLULUK.
       Okuyucu bağlamı kaybetmez.

   3 · DURUM GLİF AĞIRLIĞIYLA KODLANIR (daire ailesi), renkle değil:
       ● uygun · ○ kısmi · ⊖ uygunsuz · ◌ değerlendirilmedi · – kapsam dışı.
       Efsane sol dizin sütununda OKUMA ANAHTARI olarak yaşar — arayüzün
       parçası, dipnot değil.

   PROTOTİPTE OLMAYAN, BURADA EKLENEN (harita §7):
   · gerçek klavye gezinmesi (satır bir <button>, Enter/Space açar,
     Esc kapatır) — prototipte yalnız ipucu metni vardı;
   · `aria-expanded` / `aria-controls` sözleşmesi;
   · ölçülmemiş hücre "—" gösterir, SIFIR DEĞİL (UNKNOWN ≠ ZERO);
   · kapsam dışı ve kararsız santraller matrisin altında sessiz satırda —
     gizlenmez, çünkü "kapsam dışı" bir KARARDIR.

   İŞ MANTIĞI DEĞİŞMEDİ: veri sözleşmesi (`CerceveVerisi`), `mantik.ts`
   yüklemleri, `?cerceve=&kontrol=` derin bağlantısı, kapsam kuralları ve
   yazma eylemleri aynı.
   ═══════════════════════════════════════════════════════════════════════ */

type Odak = { cerceve: string; madde: string | null };

/** Defterde aynı anda AÇIK tek satır olur — okuma sırası korunur. */
type Acik = { maddeId: string; tesisId: string } | null;

/* Kapsam URL'de yaşar: çerçeve değiştirici paylaşılabilir bir bağlantı
   üretmeli ama tarayıcı geçmişini kirletmemeli. Statik dışa aktarımda
   sunucu `searchParams` okuyamadığı için History API köprüsü kullanılır. */
function kapsamiYaz(cerceveKodu: string) {
  if (typeof window === 'undefined') return;
  const p = new URLSearchParams(window.location.search);
  p.set('cerceve', cerceveKodu);
  p.delete('kontrol');
  window.history.replaceState(null, '', `?${p.toString()}`);
}

function acilisOdagi(
  cerceveler: CerceveVerisi[], kontrolParam: string | null, cerceveParam: string | null,
): Odak {
  if (kontrolParam) {
    for (const c of cerceveler) {
      for (const a of c.aileler) {
        const y = a.yapraklar.find((x) => x.kod === kontrolParam || x.kisaKod === kontrolParam);
        if (y) return { cerceve: c.kod, madde: y.id };
      }
    }
  }
  const c = cerceveler.find((x) => x.kod === cerceveParam)
    ?? cerceveler.find((x) => x.satirlar.length > 0)
    ?? cerceveler[0];
  return { cerceve: c?.kod ?? '', madde: null };
}

/* ── Devrik matris ────────────────────────────────────────────────────
   Veri santral başına gelir (`satirlar[].kontroller[]`); defter kontrol
   başına okur. Çevrim burada, TEK YERDE yapılır ve veri sözleşmesine
   dokunmaz. */
type MaddeSatiri = {
  maddeId: string;
  kod: string;
  kisaKod: string;
  baslik: string;
  aileId: string;
  aileKod: string;
  /** tesisId → o santraldeki kontrol; santral kapsam dışıysa yok. */
  hucreler: Map<string, Kontrol>;
  /** kapsam içi hücre sayısı — "6 / 6" kapsam sütunu */
  kapsamda: number;
};

function devir(cerceve: CerceveVerisi): MaddeSatiri[] {
  const harita = new Map<string, MaddeSatiri>();
  const aileKodu = new Map(cerceve.aileler.map((a) => [a.id, a.kisaKod || a.kod]));
  for (const t of cerceve.satirlar) {
    for (const k of t.kontroller) {
      let m = harita.get(k.maddeId);
      if (!m) {
        m = {
          maddeId: k.maddeId, kod: k.kod, kisaKod: k.kisaKod, baslik: k.baslik,
          aileId: k.aileId, aileKod: aileKodu.get(k.aileId) ?? '',
          hucreler: new Map(), kapsamda: 0,
        };
        harita.set(k.maddeId, m);
      }
      m.hucreler.set(t.id, k);
      if (k.im !== null) m.kapsamda += 1;
    }
  }
  /* Sıra kontrol koduna göre: defter bir kütüktür, kod sırası okunur. */
  return [...harita.values()].sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));
}

/* Glif sınıfı — durum yalnız renkle anlatılmaz (harita §7 kusur 2).
   Eşleme HAM dizeye değil `mantik.ts`in ürettiği `im` işaretçisine bakar:
   ham → im çevrimi tek yerde (DURUM_IM) yaşar ve bu ekran onu YENİDEN
   TANIMLAMAZ; aksi hâlde matris ile çerçeve detayı birbirini yalanlar. */
const GLIF_SINIF: Record<string, string> = {
  ok: 'g-uygun', tamam: 'g-uygun', md: 'g-kismi',
  bd: 'g-uygunsuz', unk: 'g-yok', pl: 'g-yok',
};

function durumSozu(ham: string): string {
  return DURUM_ETIKET[ham as keyof typeof DURUM_ETIKET] ?? etiketle(ham);
}

function glif(k: Kontrol | undefined): { sinif: string; soz: string } {
  if (!k || k.im === null) return { sinif: 'g-disi', soz: 'Kapsam dışı' };
  return { sinif: GLIF_SINIF[k.im] ?? 'g-yok', soz: durumSozu(k.ham) };
}

/* Efsane ürünün SÖZLÜĞÜNDEN türer, elle yazılmaz: durum sözcükleri tek
   kaynaktan gelir (`DURUM_ETIKET`), efsane ile hücre ipucu ayrışamaz. */
const OKUMA_ANAHTARI: { sinif: string; yazi: string }[] = [
  { sinif: 'g-uygun', yazi: DURUM_ETIKET.uyumlu },
  { sinif: 'g-kismi', yazi: DURUM_ETIKET.kismi },
  { sinif: 'g-uygunsuz', yazi: DURUM_ETIKET.uyumsuz },
  { sinif: 'g-yok', yazi: `${DURUM_ETIKET.degerlendirilmedi} · ${DURUM_ETIKET.incelemede}` },
  { sinif: 'g-disi', yazi: DURUM_ETIKET.kapsamdisi },
];

export default function UyumIstemci({
  cerceveler, yazabilir,
}: { cerceveler: CerceveVerisi[]; yazabilir: boolean }) {
  const parametreler = useSearchParams();
  const kontrolParam = parametreler.get('kontrol');
  const cerceveParam = parametreler.get('cerceve');

  const [odak, setOdak] = useState<Odak>(
    () => acilisOdagi(cerceveler, kontrolParam, cerceveParam));
  const [acik, setAcik] = useState<Acik>(null);
  const [aile, setAile] = useState<string | null>(null);

  const cerceve = cerceveler.find((c) => c.kod === odak.cerceve) ?? cerceveler[0];
  const satirlar = useMemo(() => (cerceve ? devir(cerceve) : []), [cerceve]);
  const gorunur = useMemo(
    () => (aile ? satirlar.filter((s) => s.aileId === aile) : satirlar),
    [satirlar, aile],
  );

  /* Metrikler KESİLMEMİŞ kümeden sayılır: aile süzgeci listeyi daraltır,
     defterin toplamını değiştirmez (06 §A2 ile aynı kural). */
  const m = useMemo(() => {
    const sayilar = sayHam(satirlar);
    /* Endeks `uyumOzeti` ile hesaplanır — ürünün TEK uyum formülü odur
       (lib/sabitler.ts): payda değerlendirilmiş kayıtlardır, bilinmeyen
       ne 0 ne 1 sayılır ve ayrıca raporlanır (UNKNOWN ≠ ZERO). Bu ekran
       kendi yüzdesini icat ederse defter ile çerçeve detayı çelişir. */
    const o = uyumOzeti(sayilar);
    return {
      uygun: sayilar.uyumlu ?? 0,
      kismi: sayilar.kismi ?? 0,
      uygunsuz: sayilar.uyumsuz ?? 0,
      olculmemis: o.bilinmeyen,
      toplam: o.kapsam,
      endeks: o.yuzde,
    };
  }, [satirlar]);

  const santraller: TesisSatiri[] = cerceve?.satirlar ?? [];

  if (!cerceve) {
    return (
      <div className="ab-c-ekrandizin" data-dizin="ekran">
        <aside className="ab-c-dizin" />
        <div><p style={{ color: 'var(--i3)' }}>Yürürlükte çerçeve yok.</p></div>
      </div>
    );
  }

  /* Bu ekran KENDİ dizinini verir; kabuğun varsayılan defter dizini
     `data-dizin="ekran"` görünce gizlenir (bkz. Kabuk.tsx · KabukC). */
  return (
    <div className="ab-c-ekrandizin" data-dizin="ekran">
      {/* ── Dizin sütunu: çerçeve · kontrol ailesi · OKUMA ANAHTARI ──── */}
      <aside className="ab-c-dizin" aria-label="Defter dizini">
        <div className="bolum">
          <span className="etiket">Çerçeve</span>
          {cerceveler.map((c) => (
            <button
              key={c.kod}
              type="button"
              className="satir"
              aria-current={c.kod === cerceve.kod ? 'true' : undefined}
              onClick={() => { setOdak({ cerceve: c.kod, madde: null }); setAile(null); setAcik(null); kapsamiYaz(c.kod); }}
            >
              <span>{c.ad}</span>
              <span className="sayi">{c.aileler.reduce((t, a) => t + a.yapraklar.length, 0)}</span>
            </button>
          ))}
        </div>

        <div className="bolum">
          <span className="etiket">Kontrol ailesi</span>
          <button type="button" className="satir"
            aria-current={aile === null ? 'true' : undefined}
            onClick={() => { setAile(null); setAcik(null); }}>
            <span>Tümü</span>
            <span className="sayi">{satirlar.length}</span>
          </button>
          {cerceve.aileler.map((a) => (
            <button key={a.id} type="button" className="satir"
              aria-current={aile === a.id ? 'true' : undefined}
              onClick={() => { setAile(a.id); setAcik(null); }}>
              <span>{a.kisa || a.baslik}</span>
              <span className="sayi">{a.yapraklar.length}</span>
            </button>
          ))}
        </div>

        {/* Efsane ARAYÜZÜN PARÇASI — dipnot değil (prototip sol kolonu). */}
        <div className="bolum">
          <span className="etiket">Okuma anahtarı</span>
          {OKUMA_ANAHTARI.map((o) => (
            <span key={o.sinif} className="anahtar">
              <span className={`ab-glif ${o.sinif}`} aria-hidden />
              {o.yazi}
            </span>
          ))}
        </div>
      </aside>

      {/* ── Defter gövdesi ───────────────────────────────────────────── */}
      <div style={{ minWidth: 0 }}>
        <header style={{ display: 'flex', alignItems: 'flex-end', gap: 32, marginBottom: 30 }}>
          <div style={{ minWidth: 0 }}>
            <h1 className="ab-c-baslik" style={{ margin: 0 }}>Nerede uygunsuz, ve neden?</h1>
            <p className="etiket" style={{ margin: '10px 0 0', textTransform: 'none', letterSpacing: '.02em', fontFamily: 'var(--ui)', fontSize: 12 }}>
              Satır = kontrol · sütun = santral · satıra tıklayınca gerekçe aynı defterde açılır
            </p>
          </div>
          <div className="ab-c-olcut" style={{ marginLeft: 'auto' }}>
            <Metrik etiket="Uygun" deger={m.uygun} />
            <Metrik etiket="Kısmi" deger={m.kismi} />
            <Metrik etiket="Uygunsuz" deger={m.uygunsuz} vurgu />
            <Metrik etiket="Endeks" oran
              deger={m.endeks === null ? '—' : `%${m.endeks}`} />
          </div>
        </header>

        {/* Prototipte lede ile matris arasında ince bir kural var — defter
            "giriş" ile "kütük"ü ayırır. */}
        <div className="ab-c-kural" style={{ margin: '0 0 20px' }} />

        {gorunur.length === 0 ? (
          <p style={{ color: 'var(--i3)', fontSize: 13 }}>
            Bu çerçevede uygulanabilir kontrol bulunmuyor.
          </p>
        ) : (
          <UyumMatrisi
            cerceve={cerceve}
            satirlar={gorunur}
            santraller={santraller}
            acik={acik}
            setAcik={setAcik}
            yazabilir={yazabilir}
          />
        )}

        <p className="etiket" style={{ marginTop: 26, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <span>{m.toplam} kapsam içi hücre</span>
          {m.olculmemis > 0 && <span>{m.olculmemis} hücre değerlendirilmedi — sıfır değil, bilinmeyen</span>}
          <span>Gösterilen {gorunur.length} kontrol / {satirlar.length}</span>
          {cerceve.surumEtiketi && <span>Sürüm {cerceve.surumEtiketi}</span>}
          {cerceve.yururluk && <span>Yürürlük {kisaTarih(cerceve.yururluk)}</span>}
        </p>

        <KapsamDisi cerceve={cerceve} />
      </div>
    </div>
  );
}

function Metrik({ etiket, deger, vurgu, oran }: {
  etiket: string; deger: number | string; vurgu?: boolean; oran?: boolean;
}) {
  return (
    <div>
      <div className="etiket">{etiket}</div>
      <div className={`deger${vurgu ? ' vurgu' : ''}${oran ? ' oran' : ''}`}>{deger}</div>
    </div>
  );
}

/* ── Matris + satır içi genişleme ────────────────────────────────────── */

function UyumMatrisi({ cerceve, satirlar, santraller, acik, setAcik, yazabilir }: {
  cerceve: CerceveVerisi;
  satirlar: MaddeSatiri[];
  santraller: TesisSatiri[];
  acik: Acik;
  setAcik: (a: Acik) => void;
  yazabilir: boolean;
}) {
  const kolonlar = `92px minmax(220px, 1fr) repeat(${santraller.length}, 68px) 78px`;
  const genel = uyumOzeti(sayHam(satirlar)).yuzde;
  return (
    <div
      className="ab-mtx"
      style={{ ['--mtx-kolon' as string]: kolonlar }}
      onKeyDown={(e) => { if (e.key === 'Escape' && acik) { e.stopPropagation(); setAcik(null); } }}
    >
      <div className="bas">
        <span className="kolonbas">Kontrol</span>
        <span className="kolonbas">Başlık</span>
        {santraller.map((t) => (
          <span key={t.id} className="santral">
            {t.ad}
            <span className="mono">{t.kod}</span>
          </span>
        ))}
        <span className="kolonbas" style={{ textAlign: 'right' }}>Kapsam</span>
      </div>

      {satirlar.map((s) => {
        const satirAcik = acik?.maddeId === s.maddeId;
        return (
          <div key={s.maddeId}>
            <div className={`satir${satirAcik ? ' acik' : ''}`}>
              <span className="mono kod">{s.kisaKod || s.kod}</span>
              <span className="baslik">{s.baslik}</span>
              {santraller.map((t) => {
                const k = s.hucreler.get(t.id);
                const g = glif(k);
                const bu = satirAcik && acik?.tesisId === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`hucre${bu ? ' secili' : ''}`}
                    aria-expanded={bu}
                    aria-label={`${s.kisaKod || s.kod} · ${t.ad} · ${g.soz}`}
                    onClick={() => setAcik(bu ? null : (k ? { maddeId: s.maddeId, tesisId: t.id } : null))}
                    disabled={!k || k.im === null}
                  >
                    <span className={`ab-glif ${g.sinif}`} aria-hidden />
                  </button>
                );
              })}
              <span className="mono kapsam">{s.kapsamda} / {santraller.length}</span>
            </div>

            {satirAcik && acik && (
              <Gerekce
                cerceve={cerceve}
                satir={s}
                tesis={santraller.find((t) => t.id === acik.tesisId)!}
                kontrol={s.hucreler.get(acik.tesisId)!}
                kapat={() => setAcik(null)}
                yazabilir={yazabilir}
              />
            )}
          </div>
        );
      })}

      {/* Santral endeksi — matrisin altında, prototipteki gibi */}
      {/* Sütun özeti — prototipteki gibi matrisin ALTINDA, kalın kuralla.
          Ölçülmemiş sütun "—" gösterir: 0 uyum ile hiç değerlendirilmemiş
          aynı şey değildir (UNKNOWN ≠ ZERO). */}
      <div className="satir endeks">
        <span className="etiket">Endeks</span>
        <span style={{ fontSize: 11.5, color: 'var(--i3)' }}>
          Santral bazında ağırlıklı uyum
        </span>
        {santraller.map((t) => {
          const e = santralEndeksi(satirlar, t.id);
          return (
            <span key={t.id} className="mono num deger"
              style={e === null ? { color: 'var(--i3)' } : undefined}>
              {e === null ? '—' : `%${e}`}
            </span>
          );
        })}
        <span className="mono num" style={{ textAlign: 'right', fontSize: 12 }}>
          {genel === null ? '—' : `%${genel}`}
        </span>
      </div>
    </div>
  );
}

/** Kapsam içi hücrelerin HAM durum sayımı — `uyumOzeti` girdisi. */
function sayHam(satirlar: MaddeSatiri[], tesisId?: string): Record<string, number> {
  const sayilar: Record<string, number> = {};
  for (const s of satirlar) {
    const hucreler = tesisId
      ? [s.hucreler.get(tesisId)].filter(Boolean) as Kontrol[]
      : [...s.hucreler.values()];
    for (const k of hucreler) {
      if (k.im === null) continue;          // kapsam dışı: iki paydanın da dışında
      sayilar[k.ham] = (sayilar[k.ham] ?? 0) + 1;
    }
  }
  return sayilar;
}

/** Santral sütununun endeksi. Hiç DEĞERLENDİRİLMEMİŞSE null — sıfır değil. */
function santralEndeksi(satirlar: MaddeSatiri[], tesisId: string): number | null {
  return uyumOzeti(sayHam(satirlar, tesisId)).yuzde;
}

/* ── Satır içi gerekçe — çekmece DEĞİL ───────────────────────────────
   Prototipin materyal farkı: 420px çekmece defteri terk ettirir, gerekçe
   SATIRIN ALTINDA dört sütun hâlinde açılır ve okuyucu matrisi görmeye
   devam eder. Yazma eylemi (kanıt talebi) İÇERİK OLARAK AYNIDIR: aynı
   sunucu eylemi, aynı denetim bağı, aynı yetki kapısı — yalnız çekmece
   yerine bu blokta yaşar. */

function Gerekce({ cerceve, satir, tesis, kontrol, kapat, yazabilir }: {
  cerceve: CerceveVerisi;
  satir: MaddeSatiri;
  tesis: TesisSatiri;
  kontrol: Kontrol;
  kapat: () => void;
  yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [form, setForm] = useState(false);
  const [gonderildi, setGonderildi] = useState(false);
  const [talep, setTalep] = useState({
    baslik: `${kontrol.kisaKod} ${kontrol.baslik} — ${tesis.ad}`,
    sonTarih: '',
  });

  /* Aile sayacı çekmeceden devralındı: "bu ailede kaç kontrol takipte".
     Sayım o SANTRALİN satırından gelir — matris devrildi, veri değil. */
  const aile = cerceve.aileler.find((a) => a.id === kontrol.aileId);
  const aileKontrolleri = tesis.kontroller.filter((k) => k.aileId === kontrol.aileId);
  const aileAcik = aileKontrolleri.filter((k) => acikMi(k.ham)).length;

  const denetimYok = !cerceve.denetim;
  const kapali = !yazabilir || denetimYok;

  return (
    <section
      className="ab-mtx-acilan"
      aria-label={`${satir.kisaKod || satir.kod} · ${tesis.ad} gerekçesi`}
    >
      <header>
        <span className="etiket">Açılan hücre</span>
        <span className="etiket sag">
          Son değerlendirme {kisaTarih(kontrol.sonDegerlendirme)}
        </span>
        <button type="button" className="ab-dugme" onClick={kapat}>
          Satırı kapat
        </button>
      </header>

      <h2 className="ab-c-baslik acilan-baslik">
        {satir.kisaKod || satir.kod} · {tesis.ad} — {durumSozu(kontrol.ham).toLocaleLowerCase('tr-TR')}
      </h2>
      {/* Prototipte kontrol adı yalnız matris satırında vardı; ISO kodu
          kendini anlatıyordu. Bizim kodlarımız (4.2.1) anlatmıyor, o
          yüzden başlık burada da yazılır. */}
      <p className="acilan-ust">
        {kontrol.kod} · {kontrol.baslik}
        {aile && ` · ${aile.baslik}`}
      </p>

      <div className="dortlu">
        {/* 1 · NEDEN */}
        <div>
          <span className="etiket">Neden bu durumda</span>
          <p className="acilan-metin">
            {kontrol.gerekce || 'Gerekçe kaydı yok — değerlendirme notu girilmemiş.'}
          </p>
          <dl className="acilan-dl">
            <Satirci ad="Takipte" deger={acikMi(kontrol.ham) ? 'evet' : 'hayır'} />
            <Satirci ad={`${aile?.kisa ?? 'Aile'} · takipte`}
              deger={`${aileAcik} / ${aileKontrolleri.length}`} mono />
            <Satirci ad="Bu santralde kapsam"
              deger={`${satir.kapsamda} / ${cerceve.satirlar.length}`} mono />
          </dl>
        </div>

        {/* 2 · KANIT — ve tek yazma eylemi */}
        <div>
          <span className="etiket">Kanıt dosyası</span>
          <p className="acilan-metin mono kucuk kanit">
            <span className={`ab-glif ${GLIF_SINIF[kontrol.kanitIm] ?? 'g-yok'}`} aria-hidden />
            {kanitSozu(kontrol)}
          </p>
          <dl className="acilan-dl">
            <Satirci ad="Güven" deger={etiketle(kontrol.guven)} />
          </dl>

          {form ? (
            <div className="acilan-form">
              <label>
                <span className="etiket">Talep başlığı</span>
                <input value={talep.baslik} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, baslik: e.target.value })} />
              </label>
              <label>
                <span className="etiket">Son tarih</span>
                <input type="date" value={talep.sonTarih} disabled={bekliyor}
                  onChange={(e) => setTalep({ ...talep, sonTarih: e.target.value })} />
              </label>
              {hata && <p className="acilan-hata" role="alert">{hata}</p>}
              <div className="acilan-dugmeler">
                <button type="button" className="ab-dugme birincil"
                  disabled={bekliyor || kapali || !talep.baslik.trim()}
                  onClick={() => calistir(
                    () => kanitTalebiEkle({
                      denetimId: cerceve.denetim!.id,
                      baslik: talep.baslik,
                      aciklama: `${kontrol.kod} · ${tesis.ad} · ${kontrol.gerekce}`,
                      sonTarih: talep.sonTarih || null,
                    }),
                    () => { setForm(false); setGonderildi(true); },
                  )}>
                  {bekliyor ? 'Açılıyor…' : 'Talebi aç'}
                </button>
                <button type="button" className="ab-dugme" onClick={() => setForm(false)}>
                  Vazgeç
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="ab-dugme" disabled={kapali}
              onClick={() => setForm(true)}>
              Kanıt talep et
            </button>
          )}

          {/* Kapalı düğmenin NEDENİ yazılır — prototipte gri düğmenin
              gerekçesi yoktu (harita §7 kusur 1: kritik bilgi salt görsel). */}
          <p className="acilan-dip">
            {[
              gonderildi && 'Kanıt talebi açıldı; denetim izine yazıldı.',
              denetimYok && 'Bu çerçevede açık denetim yok — talep denetime bağlanır.',
              !yazabilir && !denetimYok && 'Kanıt talebi için denetim yazma yetkisi gerekir.',
            ].filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* 3 · YÖNETİŞİM ZİNCİRİ */}
        <div>
          <span className="etiket">Yönetişim zinciri</span>
          {kontrol.zincir.length > 0 ? (
            <div className="acilan-zincir">
              {kontrol.zincir.map((z) => {
                const [tur, ...kalan] = z.alt.split(' · ');
                return (
                  <Link key={z.id} href={z.yol}>
                    <span className="ust">
                      <span className="tur">{tur}</span>
                      {z.suren && <span className="ab-glif g-kismi" aria-hidden />}
                    </span>
                    <span className="mono kod">{z.kod}</span>
                    {kalan.length > 0 && <span className="alt">{kalan.join(' · ')}</span>}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="acilan-metin kucuk">
              Bu kontrole bağlı risk, bulgu veya proje kaydı yok.
            </p>
          )}
          <Link className="ab-dugme bagli"
            href={`/uyum/${cerceve.kod}?aile=${encodeURIComponent(aile?.kod ?? '')}`
              + `&kontrol=${encodeURIComponent(kontrol.kod)}`}>
            Kontrol ağacında aç →
          </Link>
        </div>

        {/* 4 · SORUMLULUK VE SÜRE */}
        <div>
          <span className="etiket">Sorumluluk ve süre</span>
          <dl className="acilan-dl">
            <Satirci ad="Kontrol sahibi" deger={kontrol.sahip ?? 'atanmadı'} />
            <Satirci ad="Son tarih" deger={kontrol.termin || '—'} />
            <Satirci ad="Santral" deger={tesis.kod} mono />
          </dl>
          <p className="acilan-dip">{tesis.ad} · {tesis.alt}</p>
        </div>
      </div>
    </section>
  );
}

/** Kanıt dizesi ham sayaç olabiliyor ("1"); tek başına ne olduğu
    okunmuyor. Sözcük `veri.ts`teki ipucu kalıbıyla aynıdır. */
function kanitSozu(k: Kontrol): string {
  if (!k.kanitYazi || k.kanitYazi === 'yok') return 'kanıt yok';
  return `kanıt ${k.kanitYazi}`;
}

function Satirci({ ad, deger, mono, im }: {
  ad: string; deger: string; mono?: boolean; im?: string;
}) {
  return (
    <div className="cift">
      <dt>{ad}</dt>
      <dd className={mono ? 'mono' : undefined}>
        {im && <span className={`ab-glif ${GLIF_SINIF[im] ?? 'g-yok'}`} aria-hidden />}
        {deger}
      </dd>
    </div>
  );
}

/* ── Kapsam dışı ve kararsız santraller ──────────────────────────────
   GİZLENMEZ: "kapsam dışı" bir karardır ve gerekçesi okunabilir olmalı. */
function KapsamDisi({ cerceve }: { cerceve: CerceveVerisi }) {
  const disarida = cerceve.kapsam?.filter((k) => k.durum !== 'kapsamda') ?? [];
  if (disarida.length === 0) return null;
  return (
    <div style={{ marginTop: 30, borderTop: '1px solid var(--hr)', paddingTop: 16 }}>
      <span className="etiket">Kapsam kararı</span>
      <ul style={{ margin: '10px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>
        {disarida.map((k) => (
          <li key={k.tesisId} style={{ fontSize: 12, color: 'var(--i2)', display: 'flex', gap: 12 }}>
            <span className="mono" style={{ color: 'var(--i3)', minWidth: 96 }}>{k.kod}</span>
            <span style={{ minWidth: 120 }}>{k.durum === 'disarida' ? 'kapsam dışı' : 'karar verilmedi'}</span>
            <span style={{ color: 'var(--i3)' }}>{k.gerekce}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
