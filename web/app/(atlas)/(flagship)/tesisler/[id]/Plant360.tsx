'use client';
import Link from 'next/link';
import { heroGorseli, gorselAlt } from '@/lib/gorsel';
import { tipAdi, tipRengi } from '@/components/abacus/tip';
import { etiketle } from '@/lib/sabitler';

/* ═══════════════════════════════════════════════════════════════════════
   SANTRAL 360 — B · ENERGY INTELLIGENCE

   Görsel source of truth: `b-plant360.html`
   (ORIGINAL_DESIGN_IMPLEMENTATION_MAP.md §2).

   Prototipin grameri: 560px hero plakası — solda üstte künye ve 92px dar
   başlıklı santral adı, solda altta beş sayılık ölçü şeridi, sağda 420px
   veri paneli (uyum endeksi · katmanlı durum · başlıca risk · dört sayaç);
   altında üretim zinciri bandı; en altta 560px üretim üniteleri + açık
   bulgular.

   ── PROTOTİPTEN AYRILAN NOKTALAR VE NEDENLERİ ─────────────────────────
   1 · "ANLIK ÜRETİM" ve "KULLANILABİLİRLİK" ölçüleri prototipte vardı;
       ŞEMADA YOK ve gerçek üretim sistemine BAĞLANMADIK. Uydurulmuş bir
       "148,3 MW" ekranın en inandırıcı yalanı olurdu. Yerlerine gerçek
       alanlar kondu: kayıtlı varlık ve ünite sayısı.
   2 · Prototipin "KATMANLI DURUM" satırları (YÖNETİŞİM · BT · OT ·
       FİZİKSEL · TEDARİK) `Madde.alanAdi`ya benziyor ama o alan
       maddelerin çoğunda BOŞ. Katmanlar kontrol AİLESİNDEN kuruldu —
       /uyum ekranıyla aynı kırılım, dolu ve tutarlı.
   3 · Üretim zinciri prototipte altı durak ve soldan sağa akıyor. Şemada
       sistemler arası SIRA YOK; uydurma bir akış çizmek, olmayan bir
       varlık ilişkisi iddia etmek olurdu. Duraklar kritiklik sırasına
       konuldu ve bunun ne olduğu başlıkta yazıyor.
   4 · Ünite satırının tik şeridi prototipte uyum durumuydu; `MaddeDurumu`
       ünite kırılımı TAŞIMIYOR. Şerit üniteye bağlı SİSTEMLERİN risk
       durumundan çizilir; sistemi olmayan ünitede şerit yok, "—" var.
   ═══════════════════════════════════════════════════════════════════════ */

export type Katman = {
  kod: string; ad: string; sira: number; endeks: number | null;
  uygun: number; kismi: number; uygunsuz: number; bilinmeyen: number;
};

export type ZincirDuragi = {
  id: string; kod: string; ad: string; tip: string; kritiklik: string;
  varlik: number; risk: number;
};

export type Unite = {
  id: string; kod: string; ad: string; gucMw: number | null; durum: string;
  sistemSayisi: number; varlikSayisi: number;
};

export type AcikBulgu = {
  id: string; kod: string; baslik: string; onem: string; durum: string;
  hedefTarih: string | null; gecikmis: boolean;
};

export type Plant360Veri = {
  id: string; kod: string; ad: string;
  tipKod: string | null; tipAdi: string; tuzelKisi: string | null;
  konum: string | null; gucMw: number | null; gorselAnahtari: string | null;
  kritiklik: string | null; uniteSayisi: number | null;
  uyumYuzde: number | null; bilinmeyenOran: number | null; cerceveKodu: string | null;
  enYuksekRisk: { kod: string; baslik: string; skor: number | null } | null;
  acikBulgu: number; gecikmisBulgu: number;
  yaklasanDenetim: { kod: string; ad: string; kalanGun: number } | null;
  eosVarlik: number; varlikSayisi: number; bolgeSayisi: number; surecSayisi: number;
  odak: {
    id: string; kod: string; baslik: string; aciklama: string | null;
    onem: string; durum: string; sorumlu: string | null; hedefTarih: string | null;
    aksiyonTamam: number; aksiyonToplam: number;
  } | null;
  digerEksikler: { id: string; baslik: string; alt: string }[];
  katmanlar: Katman[];
  zincir: ZincirDuragi[];
  uniteler: Unite[];
  sistemSayisi: number;
  bulguSayilari: { acik: number; aksiyonda: number; kapali: number; kabulEdildi: number };
  acikBulgular: AcikBulgu[];
};

export type Santral = {
  id: string; kod: string; ad: string; alt: string; tip: string;
  gorselAnahtari: string | null;
};

const KISA = new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit' });
function kisa(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : KISA.format(d);
}

/** Kritiklik → durum sınıfı. `bilinmiyor` NÖTR kalır, "düşük" olmaz. */
const KRITIKLIK_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'ok', bilinmiyor: 'unk',
};
const ONEM_SINIF: Record<string, string> = {
  kritik: 'bd', yuksek: 'bd', orta: 'md', dusuk: 'pl',
};
const UNITE_DURUM: Record<string, string> = {
  aktif: 'ok', bakim: 'md', devre_disi: 'unk',
};

export default function Plant360({ veri, santraller }: {
  veri: Plant360Veri; santraller: Santral[];
}) {
  const foto = heroGorseli(veri.gorselAnahtari);
  const renk = tipRengi(veri.tipKod);
  const [ilkKelime, ...kalanKelimeler] = veri.ad.split(' ');

  return (
    <main className="ab-b-saha">
      {/* ═══ Hero plakası · 560px ══════════════════════════════════════ */}
      <section className={`ab-b-plaka${foto ? '' : ' fotosuz'}`}>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
          <img src={foto} alt={gorselAlt(veri.ad, veri.tipAdi, veri.konum)}
            decoding="async" fetchPriority="high" />
        )}
        <span className="perde" aria-hidden />
        <span className="sagperde" aria-hidden />

        <div className="kimlik">
          <p className="mono ust" style={{ color: renk }}>
            {[veri.tuzelKisi, veri.konum, veri.kod].filter(Boolean).join(' · ')}
          </p>
          <h1>
            {ilkKelime.toLocaleUpperCase('tr-TR')}
            {kalanKelimeler.length > 0 && (
              <><br /><span style={{ color: renk }}>
                {kalanKelimeler.join(' ').toLocaleUpperCase('tr-TR')}
              </span></>
            )}
          </h1>
          <p className="mono tur">{tipAdi(veri.tipKod, veri.tipAdi)}</p>
        </div>

        {/* Prototipte beş ölçü vardı; ikisi (anlık üretim, kullanılabilirlik)
            gerçek üretim sistemine bağlanmadığı için UYDURULMADI. */}
        <div className="olcuolar">
          <Olcu etiket="Kurulu güç" deger={veri.gucMw ?? '—'} birim="MWe" />
          <Olcu etiket="Üretim ünitesi" deger={veri.uniteSayisi ?? 0} />
          <Olcu etiket="Kayıtlı varlık" deger={veri.varlikSayisi} />
          <Olcu etiket="Kritiklik sınıfı"
            deger={veri.kritiklik ? etiketle(veri.kritiklik) : '—'}
            vurgu={Boolean(veri.kritiklik)} />
          <Olcu etiket="Ağ bölgesi" deger={veri.bolgeSayisi} />
        </div>

        {/* ── Veri paneli · 420px ────────────────────────────────────── */}
        <aside className="ab-b-panel" aria-label="Santral uyum özeti">
          <div className="tepe">
            <div>
              <p className="etiket">Uyum endeksi</p>
              <p className="dev">{veri.uyumYuzde === null ? '—' : `%${veri.uyumYuzde}`}</p>
            </div>
            <div className="sag">
              <p className="mono">
                {veri.cerceveKodu ?? 'çerçeve atanmamış'}
              </p>
              <p className="mono alt">
                {veri.bilinmeyenOran === null
                  ? 'değerlendirme yok'
                  : `%${veri.bilinmeyenOran} bilinmeyen`}
              </p>
            </div>
          </div>

          <div className="bolum">
            <p className="etiket">Katmanlı durum · kontrol ailesi</p>
            {veri.katmanlar.length === 0 ? (
              <p className="bos">Bu santralde değerlendirilmiş kontrol yok.</p>
            ) : veri.katmanlar.slice(0, 6).map((kt) => (
              <div key={kt.kod} className="katman">
                <span className="mono ad">{kt.ad}</span>
                <span className="cubuk"><Yigin k={kt} /></span>
                <span className="mono deger">
                  {kt.endeks === null ? '—' : kt.endeks}
                </span>
              </div>
            ))}
          </div>

          <div className="bolum">
            <p className="etiket">Başlıca risk</p>
            {veri.enYuksekRisk ? (
              <>
                <p className="konu">{veri.enYuksekRisk.baslik}</p>
                <p className="mono kirmizi">
                  {veri.enYuksekRisk.kod} ·{' '}
                  {veri.enYuksekRisk.skor === null
                    ? 'skor ölçülmedi'
                    : `artık risk ${veri.enYuksekRisk.skor}`}
                </p>
              </>
            ) : (
              <p className="bos">Bu santralde açık risk kaydı yok.</p>
            )}
          </div>

          <div className="bolum sayaclar">
            <Sayac etiket="Açık bulgu" deger={veri.bulguSayilari.acik} sinif="md" />
            <Sayac etiket="Aksiyonda" deger={veri.bulguSayilari.aksiyonda} />
            <Sayac etiket="Desteği bitmiş varlık" deger={veri.eosVarlik}
              sinif={veri.eosVarlik > 0 ? 'bd' : undefined} />
            <div>
              <p className="etiket">Sonraki denetim</p>
              <p className="mono tarih">
                {veri.yaklasanDenetim
                  ? `${veri.yaklasanDenetim.kod} · ${veri.yaklasanDenetim.kalanGun} g`
                  : 'planlı denetim yok'}
              </p>
            </div>
          </div>
        </aside>
      </section>

      {/* ═══ Üretim zinciri ════════════════════════════════════════════ */}
      <section className="ab-b-zincir">
        <header>
          <span className="etiket">
            Sistem ve servisler · kritiklik sırasıyla
          </span>
          <span className="mono etiket sag">
            {veri.sistemSayisi} sistem · {veri.varlikSayisi} varlık ·{' '}
            {veri.uniteSayisi ?? 0} üretim ünitesi
          </span>
        </header>
        {veri.zincir.length === 0 ? (
          <p className="bos">Bu santral için kayıtlı sistem yok.</p>
        ) : (
          <div className="duraklar">
            {veri.zincir.map((z) => (
              <div key={z.id} className="durak">
                <span className={`bant ${KRITIKLIK_SINIF[z.kritiklik] ?? 'unk'}`} aria-hidden />
                <p className="ad">{z.ad}</p>
                <p className="mono alt">{z.kod} · {etiketle(z.tip)}</p>
                <dl className="mono sayilar">
                  <div><dt>Varlık</dt><dd>{z.varlik}</dd></div>
                  <div>
                    <dt>Açık risk</dt>
                    <dd className={z.risk > 0 ? 'kirmizi' : undefined}>{z.risk}</dd>
                  </div>
                  <div><dt>Kritiklik</dt><dd>{etiketle(z.kritiklik)}</dd></div>
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ═══ Üniteler + açık bulgular ══════════════════════════════════ */}
      <section className="ab-b-ikili">
        <div className="uniteler">
          <p className="etiket">Üretim üniteleri</p>
          {veri.uniteler.length === 0 ? (
            <p className="bos">Kayıtlı üretim ünitesi yok.</p>
          ) : veri.uniteler.map((u) => (
            <div key={u.id} className="unite">
              <span className="kod">{u.kod}</span>
              <span className="ad">
                <span className="baslik">{u.ad}</span>
                <span className="mono guc">{u.gucMw ?? '—'} MW</span>
              </span>
              <span className="mono kayit">
                {u.sistemSayisi} sistem · {u.varlikSayisi} varlık
              </span>
              <span className="durum">
                <span className={`ab-glif g-${GLIF[UNITE_DURUM[u.durum] ?? 'unk']}`} aria-hidden />
                <span className="mono">{etiketle(u.durum)}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="bulgular">
          <header>
            <span className="etiket">Açık bulgular</span>
            <span className="mono etiket sag">
              {veri.bulguSayilari.acik} açık · {veri.bulguSayilari.aksiyonda} aksiyonda ·{' '}
              {veri.bulguSayilari.kapali} kapandı
            </span>
          </header>
          {veri.acikBulgular.length === 0 ? (
            <p className="bos">Açık bulgu yok.</p>
          ) : veri.acikBulgular.map((b) => (
            <Link key={b.id} href={`/bulgular/${b.id}`} className="satir">
              <span className={`mono onem ${ONEM_SINIF[b.onem] ?? 'pl'}`}>
                {etiketle(b.onem)}
              </span>
              <span className="konu">{b.baslik}</span>
              <span className="mono kontrol">{b.kod}</span>
              <span className={`mono termin${b.gecikmis ? ' gecikmis' : ''}`}>
                {b.gecikmis ? `${kisa(b.hedefTarih)} geçti` : kisa(b.hedefTarih)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ═══ Saha şeridi — kapsamdaki diğer santraller ═════════════════ */}
      <section className="ab-b-serit" aria-label="Diğer santraller">
        <header>
          <span className="etiket">Kapsamındaki santraller · {santraller.length}</span>
          <span className="etiket sag">Kapsam tüm uygulamada korunur</span>
        </header>
        <div className="kartlar">
          {santraller.map((s) => (
            <Link key={s.id} href={`/tesisler/${s.id}`}
              className={`kart yalin${s.id === veri.id ? ' secili' : ''}`}
              aria-current={s.id === veri.id ? 'page' : undefined}>
              <span className="icerik">
                <span className="mono tip">{s.tip}</span>
                <span className="ad">{s.ad}</span>
                <span className="olcu"><span className="mono guc">{s.alt}</span></span>
              </span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

const GLIF: Record<string, string> = {
  ok: 'uygun', md: 'kismi', bd: 'uygunsuz', unk: 'yok',
};

function Olcu({ etiket, deger, birim, vurgu }: {
  etiket: string; deger: number | string; birim?: string; vurgu?: boolean;
}) {
  return (
    <div>
      <p className="mono etiket">{etiket}</p>
      <p className={`deger${vurgu ? ' vurgu' : ''}`}>
        {deger}{birim && <span className="birim">{birim}</span>}
      </p>
    </div>
  );
}

function Sayac({ etiket, deger, sinif }: {
  etiket: string; deger: number; sinif?: string;
}) {
  return (
    <div>
      <p className="etiket">{etiket}</p>
      <p className={`sayi${sinif && deger > 0 ? ` ${sinif}` : ''}`}>{deger}</p>
    </div>
  );
}

/** Katman çubuğu — dört parça; bilinmeyen taramalı ve DÜŞÜRÜLMEZ. */
function Yigin({ k }: { k: Katman }) {
  const toplam = k.uygun + k.kismi + k.uygunsuz + k.bilinmeyen;
  if (toplam === 0) return <span className="ab-b-yigin bos" />;
  const p = (n: number) => `${(n / toplam) * 100}%`;
  return (
    <span className="ab-b-yigin" role="img"
      aria-label={`${k.uygun} uygun, ${k.kismi} kısmi, ${k.uygunsuz} uygunsuz, ${k.bilinmeyen} değerlendirilmedi`}>
      {k.uygun > 0 && <span className="uygun" style={{ width: p(k.uygun) }} />}
      {k.kismi > 0 && <span className="kismi" style={{ width: p(k.kismi) }} />}
      {k.uygunsuz > 0 && <span className="uygunsuz" style={{ width: p(k.uygunsuz) }} />}
      {k.bilinmeyen > 0 && <span className="bilinmeyen" style={{ width: p(k.bilinmeyen) }} />}
    </span>
  );
}
