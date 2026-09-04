'use client';
import { useState } from 'react';
import { Alan, BosIlk, Dugme } from '@/components/kabuk/temel';
import { EkranBasligi } from '@/components/kabuk/ekran';
import { Tablo, type Satir } from '@/components/kabuk/tablo';
import { useEylem } from '@/components/useEylem';
import { zimmetCevapla } from '@/lib/eylemler2/zimmet';
import {
  ZIMMET_SINIFI, ZIMMET_SOZU, kalanGun, zimmetCumlesi,
  type SureDurumu, type ZimmetDurumu, type ZimmetOzeti,
} from '@/lib/varlik/zimmet';
import { an } from '@/lib/an';
import { tarihTR } from '@/lib/sabitler';

/* ═══ OT-09b · Bana atanan varlıklar ══════════════════════════════════

   ── BU EKRAN BİR İMZA EKRANIDIR ───────────────────────────────────────
   Bir varlığın size atanması ile o varlığın sorumluluğunu üstlenmeniz
   aynı şey değildir. Burada kabul ya da red verirsiniz ve ikisi de
   denetim izine düşer.

   Red GEREKÇE ister. Gerekçesiz bir red, atayan kişiye ne yapacağını
   söylemez ve aynı talep ertesi gün yeniden açılır. */

const KOLONLAR = [
  { baslik: 'Santral', genislik: '120px' },
  { baslik: 'Tür', genislik: '130px' },
  { baslik: 'Atayan', genislik: '150px' },
  { baslik: 'Son tarih', genislik: '112px', sag: true, ikincil: true },
];

const SEKMELER = [
  { id: 'bekleyen', ad: 'Bekleyen' },
  { id: 'kabul', ad: 'Kabul edilen' },
  { id: 'red', ad: 'Reddedilen' },
  { id: 'gecmis', ad: 'Geçmiş' },
] as const;
type Sekme = (typeof SEKMELER)[number]['id'];

export type ZimmetSatiri = {
  id: string; durum: string;
  varlikEtiket: string; varlikAd: string; tur: string;
  tesisKod: string | null; mevcutSahip: string | null;
  atayan: string; oncekiSahip: string | null;
  not: string | null;
  olusturuldu: string; sonTarih: string;
  cevapZamani: string | null; cevapNotu: string | null;
  sure: SureDurumu;
};

function sekmeye(s: ZimmetSatiri): Sekme {
  if (s.durum === 'bekliyor') return 'bekleyen';
  if (s.durum === 'kabul_edildi') return 'kabul';
  if (s.durum === 'reddedildi') return 'red';
  return 'gecmis';
}

export default function ZimmetlerimIstemci({
  satirlar, ozet,
}: { satirlar: ZimmetSatiri[]; ozet: ZimmetOzeti }) {
  const [sekme, setSekme] = useState<Sekme>(
    satirlar.some((s) => s.durum === 'bekliyor') ? 'bekleyen' : 'kabul');
  const [acikId, setAcikId] = useState<string | null>(null);

  const gorunen = satirlar.filter((s) => sekmeye(s) === sekme);

  const tablo: Satir[] = gorunen.map((s) => {
    const kalan = kalanGun({ sonTarih: Date.parse(s.sonTarih), simdi: an() });
    return {
      id: s.id,
      durum: s.durum === 'bekliyor' && s.sure === 'gecti'
        ? 'bd'
        : ZIMMET_SINIFI[s.durum as ZimmetDurumu] ?? 'unk',
      konu: s.varlikEtiket,
      alt: `${s.varlikAd} · ${ZIMMET_SOZU[s.durum as ZimmetDurumu] ?? s.durum}`
        + (s.durum === 'bekliyor'
          ? kalan < 0 ? ` · ${-kalan} gün GECİKTİ` : ` · ${kalan} gün kaldı`
          : '')
        + (s.not ? ` · ${s.not.slice(0, 100)}` : ''),
      hucreler: [
        s.tesisKod ?? 'santralsiz',
        s.tur,
        s.atayan,
        tarihTR(s.sonTarih),
      ],
      secili: acikId === s.id,
      tiklandi: () => setAcikId(acikId === s.id ? null : s.id),
    };
  });

  const acik = gorunen.find((s) => s.id === acikId) ?? null;

  return (
    <main data-yuzey="defter" style={{ minWidth: 0 }}>
      <EkranBasligi
        eyebrow="Zimmet · bana atanan varlıklar"
        baslik={ozet.bekleyen === 0
          ? 'Cevap bekleyen zimmet yok'
          : 'zimmet cevabımı bekliyor'}
        vurgu={ozet.bekleyen === 0 ? undefined : `${ozet.bekleyen}`}
        vurguDurumu={ozet.gecikmis > 0 ? 'bd' : ozet.bekleyen > 0 ? 'md' : 'ok'}
        metrikler={[
          { deger: ozet.bekleyen, yazi: 'Cevap bekliyor',
            durum: ozet.bekleyen > 0 ? 'md' : undefined },
          { deger: ozet.gecikmis, yazi: 'Süresi geçti',
            durum: ozet.gecikmis > 0 ? 'bd' : undefined },
          { deger: ozet.kabul, yazi: 'Kabul ettim' },
          { deger: ozet.red, yazi: 'Reddettim' },
        ]}
      />

      <p className="ab-dip" style={{ margin: '0 0 var(--s16)' }}>
        {zimmetCumlesi(ozet)}
      </p>

      {/* ── ÖLÇÜLDÜ: SEKME DEĞİL SÜZGEÇ ────────────────────────────────
          `role="tablist"`/`role="tab"` bir SÖZDÜR: "her sekmenin bir
          `tabpanel`i vardır, aralarında ok tuşlarıyla gezilir". Burada
          ne tabpanel vardı ne de gezinen odak; düğmelerin hiçbiri
          `tabindex="0"` taşımıyordu ve `aria-selected` düz bir düğmede
          geçerli bile değildir. Bunlar sekme değil SÜZGEÇtir — ürünün
          her yerindeki mercek şeridiyle aynı şey. O yüzden aynı
          gramere alındı: `role="group"` + `aria-pressed`. */}
      <div role="group" aria-label="Zimmet durumu"
        style={{ display: 'flex', gap: 'var(--s8)', marginBottom: 'var(--s16)' }}>
        {SEKMELER.map((sk) => (
          <button key={sk.id} type="button" className="ab-filtre"
            aria-pressed={sekme === sk.id}
            onClick={() => { setSekme(sk.id); setAcikId(null); }}>
            {sk.ad} ({satirlar.filter((s) => sekmeye(s) === sk.id).length})
          </button>
        ))}
      </div>

      {gorunen.length === 0 ? (
        <BosIlk cumle={sekme === 'bekleyen'
          ? 'Cevap bekleyen zimmetiniz yok. Size bir varlık atandığında burada görünür.'
          : 'Bu bölümde kayıt yok.'} />
      ) : (
        <Tablo kolonlar={KOLONLAR} satirlar={tablo} />
      )}

      {acik && <Cekmece satir={acik} kapat={() => setAcikId(null)} />}
    </main>
  );
}

/* ── Çekmece: künye + kabul/red ─────────────────────────────────────── */

function Cekmece({ satir, kapat }: { satir: ZimmetSatiri; kapat: () => void }) {
  const [not, setNot] = useState('');
  const { calistir, bekliyor, hata } = useEylem();
  const acikMi = satir.durum === 'bekliyor';
  const suresiGecti = acikMi && satir.sure === 'gecti';

  const cevapla = (kabul: boolean) => calistir(
    () => zimmetCevapla({ talepId: satir.id, kabul, not: not.trim() || null }),
    kapat,
  );

  return (
    <section className="ab-panel" style={{ marginTop: 'var(--s20)' }}>
      <h2 className="ab-bolum-basligi">{satir.varlikEtiket}</h2>
      <dl className="ab-ciftler">
        <div><dt>Varlık</dt><dd>{satir.varlikAd} · {satir.tur}</dd></div>
        <div><dt>Santral</dt><dd>{satir.tesisKod ?? 'santralsiz'}</dd></div>
        <div><dt>Atayan</dt><dd>{satir.atayan}</dd></div>
        <div><dt>Talep tarihi</dt><dd>{tarihTR(satir.olusturuldu)}</dd></div>
        <div><dt>Cevap için son tarih</dt><dd>{tarihTR(satir.sonTarih)}</dd></div>
        <div>
          <dt>Şu anki sahip</dt>
          <dd>{satir.mevcutSahip ?? 'sahipsiz'}</dd>
        </div>
        {satir.not && <div><dt>Atama notu</dt><dd>{satir.not}</dd></div>}
        {satir.cevapZamani && (
          <div><dt>Cevap</dt><dd>{tarihTR(satir.cevapZamani)}</dd></div>
        )}
        {satir.cevapNotu && (
          <div><dt>Cevap notu</dt><dd>{satir.cevapNotu}</dd></div>
        )}
      </dl>

      {acikMi && suresiGecti && (
        <p className="ab-dip">
          Cevap süresi geçmiş. Bu talep bir sonraki koşuda kapanacak; yeni
          talebi atayan kişi açar.
        </p>
      )}

      {acikMi && !suresiGecti && (
        <>
          <Alan etiket="Not (redde ZORUNLU)">
            <textarea className="ab-gr" rows={3} value={not}
              onChange={(e) => setNot(e.target.value)}
              placeholder="Kabul ediyorsanız isteğe bağlı; reddediyorsanız sebebini yazın" />
          </Alan>
          {hata && <p className="ab-hata">{hata}</p>}
          <div style={{ display: 'flex', gap: 'var(--s10)', marginTop: 'var(--s12)' }}>
            <Dugme tur="birincil" disabled={bekliyor} onClick={() => cevapla(true)}>
              Kabul et
            </Dugme>
            <Dugme tur="tam" disabled={bekliyor || not.trim().length === 0}
              onClick={() => cevapla(false)}>
              Reddet
            </Dugme>
            <Dugme onClick={kapat} disabled={bekliyor}>Kapat</Dugme>
          </div>
        </>
      )}

      {!acikMi && <Dugme onClick={kapat}>Kapat</Dugme>}
    </section>
  );
}
