'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { BosFiltre, BosIlk, Dugme } from '@/components/atlas/temel';
import { EkranBasligi, Filtreler } from '@/components/atlas/ekran';
import { Tablo, type Kolon } from '@/components/atlas/tablo';
import {
  Cekmece, CekmeceAlanlar, CekmeceEylemler, CekmeceKimlik,
} from '@/components/atlas/cekmece';
import { useEylem } from '@/components/useEylem';
import { bildirimOkundu } from '@/lib/eylemler2/bildirim';
import { tarihTR, zamanTR } from '@/lib/sabitler';
import {
  GORUNUR_TAVAN, KAYNAK_HAL_SOZU, KAYNAK_SOZU, MERCEKLER, TIP_SOZU,
  bekleyenGun, bildirimImi, bildirimKenari, ekranHali, mercekten, okunmamisMi,
  sayimHesapla, sirala, toplanabilir,
  type BildirimSatiri, type Mercek,
} from './mantik';

/* O25 · Bildirim kutusu.

   Yoğunluk sözleşmesi: 4 metrik, 5–9 görünür satır + katlanmış kuyruk,
   durum kelimesi canvas'ta YAZILMAZ (yalnız çekmece kimlik bloğunda),
   kart ızgarası/zebra/rozet yok, detay modalda değil ÇEKMECEDE açılır,
   snackbar onayı yok — okundu işareti satırın kendisinde görünür.

   ÜÇ AYRI SIFIR birbirine karıştırılmaz:
     · hiç bildirim yok      → motor size hiç uyarı yazmadı
     · hepsi okunmuş         → ÖLÇÜLMÜŞ sıfır, "okunmamış yok" denir
     · kaynağı bilinmeyen    → kaydın santrali BİLİNMİYOR, kapsam dışı DEĞİL */

const KOLONLAR: Kolon[] = [
  { baslik: 'Tip', genislik: '110px' },
  { baslik: 'Kaynak', genislik: '150px', ikincil: true },
  { baslik: 'Bekleyen gün', genislik: '100px', sag: true },
  { baslik: 'Yazıldı', genislik: '120px', sag: true, ikincil: true },
];

/** Kaynak hücresi: tür + (çözülebildiyse) santral kodu. Çözülemeyen kaynak
    boş bırakılmaz — boşluk "santrali yok" diye okunurdu. */
function kaynakHucresi(b: BildirimSatiri): string {
  const tur = b.kaynakTipi ? KAYNAK_SOZU[b.kaynakTipi] ?? b.kaynakTipi : 'kaynak yok';
  if (b.kaynakHali === 'kapsamda') return b.tesisKodu ? `${tur} · ${b.tesisKodu}` : tur;
  if (b.kaynakHali === 'kapsamDisi') return `${tur} · kapsam dışı`;
  return `${tur} · bilinmiyor`;
}

export default function BildirimlerIstemci({
  satirlar, tavan, simdi,
}: {
  satirlar: BildirimSatiri[];
  tavan: number;
  /** sunucu saati — "kaç gündür okunmadı" tek yerden ölçülür */
  simdi: number;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [mercek, setMercek] = useState<Mercek>('okunmamis');
  const [secili, setSecili] = useState<string | null>(null);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  /* Metrikler filtreden BAĞIMSIZ: kutunun tamamını anlatır. */
  const sayim = useMemo(() => sayimHesapla(satirlar, simdi), [satirlar, simdi]);

  const suzulmus = useMemo(
    () => sirala(satirlar.filter((b) => mercekten(b, mercek))), [satirlar, mercek]);

  /* Okunmamış bildirim kuyruğa İNMEZ; tavan yalnız okunmuşları keser.
     Onuncu okunmamış eskalasyonu katlanmış bir satırın altına saklamak,
     bu ekranın yapabileceği en kötü hata olurdu. */
  const okunmamisSayisi = suzulmus.filter((b) => !toplanabilir(b)).length;
  const gorunurTavan = Math.max(GORUNUR_TAVAN, okunmamisSayisi);
  const gosterilen = kuyrukAcik ? suzulmus : suzulmus.slice(0, gorunurTavan);
  const toplanan = suzulmus.length - gosterilen.length;

  const secim = satirlar.find((b) => b.id === secili) ?? null;
  const hal = ekranHali(sayim, satirlar.length);

  const dipNot = [
    `Kutunuzda ${satirlar.length} bildirim · ${sayim.okunmamis} okunmadı`,
    sayim.kaynagiKapsamDisi > 0
      && `${sayim.kaynagiKapsamDisi} bildirimin kaydı santral kapsamınız dışında`,
    sayim.kaynagiBilinmeyen > 0
      && `${sayim.kaynagiBilinmeyen} bildirimin kaynağı çözülemedi`,
    satirlar.length >= tavan && `en yeni ${tavan} bildirim gösteriliyor`,
  ].filter(Boolean).join(' · ');

  /* ── kutu hiç dolmadıysa: boş DEĞİL, "size yazılmadı" ─────────────── */
  if (satirlar.length === 0) {
    return (
      <main style={{ minWidth: 0 }}>
        <EkranBasligi eyebrow="Bildirim kutusu · kişisel"
          baslik="Size hiç bildirim yazılmadı" />
        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          <BosIlk cumle={'Bu kutu yalnız SİZE yazılan bildirimleri gösterir.'
            + ' Boş olması "sistemde uyarı yok" demek değildir: son tarih motoru'
            + ' bildirimi yalnız kaydın SORUMLUSUNA yazar, sorumlusu olmayan'
            + ' kayıt için görev açar ama bildirim üretmez.'} />
        </section>
      </main>
    );
  }

  return (
    <>
      <main style={{ minWidth: 0 }}>
        <EkranBasligi
          eyebrow={`Bildirim kutusu · kişisel · ${satirlar.length} kayıt`}
          vurgu={hal.vurgu}
          vurguDurumu={hal.durum}
          baslik={hal.metin}
          metrikler={[
            { deger: sayim.okunmamis, yazi: 'Okunmamış',
              durum: sayim.okunmamis > 0 ? 'md' : undefined },
            { deger: sayim.okunmamisUyari, yazi: 'Uyarı & eskalasyon · okunmamış',
              durum: sayim.okunmamisUyari > 0 ? 'bd' : undefined },
            // Okunmamış yoksa "0 gün" yazılmaz: ölçülecek bir şey yok.
            { deger: sayim.enEskiGun === null ? 'yok' : `${sayim.enEskiGun} gün`,
              yazi: 'En eski okunmamış',
              durum: sayim.enEskiGun === null ? undefined
                : sayim.enEskiGun >= 7 ? 'bd' : undefined },
            { deger: sayim.kaynagiBilinmeyen, yazi: 'Kaynağı çözülemeyen',
              durum: sayim.kaynagiBilinmeyen > 0 ? 'unk' : undefined },
          ]}
          sag={sayim.okunmamis > 0 ? (
            <Dugme tur="birincil" disabled={bekliyor}
              style={bekliyor ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
              onClick={() => calistir(() => bildirimOkundu({ hepsi: true }))}>
              {bekliyor ? 'İşaretleniyor…' : `${sayim.okunmamis} bildirimi okundu işaretle`}
            </Dugme>
          ) : undefined}
        />

        <section className="ekran-govde" style={{ paddingTop: 'var(--s26)' }}>
          {hata && (
            <p role="alert" style={{ margin: '0 0 var(--s14)',
              fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{hata}</p>
          )}

          <Filtreler secenekler={MERCEKLER} aktif={mercek}
            sec={(id) => { setMercek(id as Mercek); setSecili(null); }} />

          {gosterilen.length === 0 ? (
            mercek === 'okunmamis' ? (
              <p className="dip-not" style={{ marginTop: 'var(--s18)' }}>
                Okunmamış bildirim yok — kutunuzdaki {satirlar.length} bildirimin
                hepsi okundu. Bu ÖLÇÜLMÜŞ bir sıfırdır.
              </p>
            ) : <BosFiltre temizle={() => setMercek('hepsi')} />
          ) : (
            <Tablo
              konuBasligi="Bildirim"
              kolonlar={KOLONLAR}
              secili={secili}
              sec={(id) => setSecili(id === secili ? null : id)}
              kuyruk={toplanan > 0
                ? { metin: `Okunmuş ${toplanan} bildirim`, ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={dipNot}
              satirlar={gosterilen.map((b) => {
                const gun = bekleyenGun(b, simdi);
                return {
                  id: b.id,
                  durum: bildirimImi(b),
                  kenar: bildirimKenari(b),
                  konu: b.baslik,
                  alt: b.govde ?? 'gövde yok',
                  hucreler: [
                    TIP_SOZU[b.tip] ?? b.tip,
                    <span key="k" style={b.kaynakHali === 'kapsamda'
                      ? undefined : { color: 'var(--unk)' }}>
                      {kaynakHucresi(b)}
                    </span>,
                    /* Okunmuşta bekleme YOKTUR: "0 gün" yazmak yanlış olurdu.
                       Hücre "okundu" da yazmaz — o, işaretçinin taşıdığı
                       durum sözünün tekrarı olurdu (Atlas §A2). */
                    gun === null ? '—' : gun,
                    tarihTR(b.olusturuldu),
                  ],
                };
              })}
            />
          )}
        </section>
      </main>

      {secim && (
        <Cekmece kod={`bildirim/${secim.id.slice(-8)}`} kapat={() => setSecili(null)}>
          <CekmeceKimlik
            durum={bildirimImi(secim)}
            soz={okunmamisMi(secim) ? 'Okunmadı' : 'Okundu'}
            baslik={secim.baslik}
            cumle={secim.govde ?? undefined}
          />

          <CekmeceAlanlar
            alanlar={[
              { etiket: 'Tip', deger: TIP_SOZU[secim.tip] ?? secim.tip,
                durum: secim.tip === 'eskalasyon' ? 'bd' : undefined },
              { etiket: 'Kaynak kayıt',
                deger: secim.kaynakTipi
                  ? KAYNAK_SOZU[secim.kaynakTipi] ?? secim.kaynakTipi
                  : 'kaynak bildirilmedi',
                durum: secim.kaynakTipi ? undefined : 'unk' },
              { etiket: 'Kaynağın santrali',
                deger: secim.kaynakHali === 'kapsamda'
                  ? secim.tesisKodu ?? 'santral taşımıyor'
                  : KAYNAK_HAL_SOZU[secim.kaynakHali],
                durum: secim.kaynakHali === 'kapsamda' ? undefined : 'unk' },
              { etiket: 'Yazıldı', deger: zamanTR(secim.olusturuldu) },
              { etiket: 'Okundu',
                deger: secim.okundu ? zamanTR(secim.okundu) : 'okunmadı',
                durum: secim.okundu ? undefined : 'unk' },
            ]}
          />

          {/* Kayda giden bağ YALNIZ kapsamdaysa verilir; kapsam dışı ya da
              çözülemeyen kaynak için düğme yerine sebep yazılır — çalışmayan
              bir bağlantı koymuyoruz. */}
          <CekmeceEylemler
            birincil={okunmamisMi(secim) ? (
              <Dugme tur="cekmece" disabled={bekliyor}
                style={bekliyor ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                onClick={() => calistir(() => bildirimOkundu({ id: secim.id }))}>
                {bekliyor ? 'İşaretleniyor…' : 'Okundu işaretle'}
              </Dugme>
            ) : undefined}
            ikincil={secim.kaynakYolu ? (
              <Link href={secim.kaynakYolu} className="dg dg-ikincil">
                Kayda git
              </Link>
            ) : (
              <p className="dip-not" style={{ margin: 0 }}>
                {KAYNAK_HAL_SOZU[secim.kaynakHali]} — bildirim size yazıldığı için
                listede kalır, kayda giden bağ verilmez.
              </p>
            )}
            dipNot={okunmamisMi(secim)
              ? 'Okundu işareti yalnız SİZİN kutunuzda geçerlidir; kaydın'
                + ' kendisini ya da görevini kapatmaz.'
              : `Okundu: ${zamanTR(secim.okundu)}`}
          />
        </Cekmece>
      )}
    </>
  );
}
