'use client';
import { useMemo } from 'react';
import { useSektorSecimi, useTerim } from '@/lib/dil/SozlukSaglayici';
import { olculenYazi } from '@/lib/alan/oznitelik';
import type { PortfoyEndeksi, PortfoySatiri } from '@/app/(tam)/portfoy/mantik';
import { enZayif as enZayifSec, karneOzeti, mercekle } from './mantik';

/* ═══════════════════════════════════════════════════════════════════════
   UYUM KARNESİ — tek sayfa, yazdırılabilir

   ── BİRİNCİL GÖREV ────────────────────────────────────────────────────
   "Denetime / yönetime ne göstereceğim?" Ekran bu soruyu üç saniyede
   cevaplamalı: kapsamın endeksi, hangi kayıt zayıf, kaç iş açık.

   ── NEDEN TABLO, NEDEN GRAFİK DEĞİL ───────────────────────────────────
   Karne kâğıda basılıyor ve satır satır okunuyor; bir halka grafiği
   yüzdeyi tekrar eder ama hangi kaydın zayıf olduğunu söylemez.
   Yoğunluk burada erdemdir.

   ── MERCEK ────────────────────────────────────────────────────────────
   Sözcük de ÖLÇÜ de mercekten gelir: karne her sektörde o sektörün
   kendi sözcüğünü ve kendi ölçüsünü yazar; ikisi de koda gömülü değil.
   Endeks de mercekten: daraltılmış bir listenin başında kapsam geneli
   bir yüzde göstermek iki kümeyi tek cümlede birleştirmek olurdu.

   ── BİLİNMEYEN ≠ SIFIR ────────────────────────────────────────────────
   Ölçülmemiş yüzde "—" yazar, %0 değil. Toplam kapasite karışık birimde
   ÜRETİLMEZ. Bilinmeyen payı yüzdenin yanında durur — bir denetim
   çıktısında "%75" tek başına, neyin ölçülmediğini saklar.
   ═══════════════════════════════════════════════════════════════════════ */

const TARIH = new Intl.DateTimeFormat('tr-TR', {
  day: '2-digit', month: 'long', year: 'numeric',
});

export default function Karne({ satirlar: ham, endeks: genel, endeksSektor = {}, kapsamli }: {
  satirlar: PortfoySatiri[];
  endeks: PortfoyEndeksi;
  endeksSektor?: Record<string, PortfoyEndeksi>;
  kapsamli: boolean;
}) {
  const { t: terim, tBas } = useTerim();
  const { etkinId: mercek, secenekler } = useSektorSecimi();

  const satirlar = useMemo(() => mercekle(ham, mercek), [ham, mercek]);
  const ozet = useMemo(() => karneOzeti(satirlar), [satirlar]);
  const endeks = mercek === null ? genel
    : endeksSektor[mercek] ?? { yuzde: null, bilinmeyenOran: null, degerlendirilen: 0, kapsam: 0 };
  const kapasite = ozet.kapasite;
  const kapasiteYazi = olculenYazi({
    deger: kapasite.toplam === null ? null : Math.round(kapasite.toplam * 10) / 10,
    birim: kapasite.birim,
  });
  const mercekAdi = secenekler.find((s) => s.id === mercek)?.ad ?? null;

  const { acikBulgu, acikRisk } = ozet;
  /* Ölçülmemiş yüzdeler ortalamaya KATILMAZ ve sayıları ayrı yazılır:
     "17'sinin 14'ü ölçüldü" cümlesi, eksik olanı sıfır saymaktan
     farklıdır. */
  const enZayif = useMemo(() => enZayifSec(satirlar), [satirlar]);

  return (
    <main className="ab-karne">
      <header>
        <h1>{tBas('portfoy')} uyum karnesi</h1>
        <p className="mono kunye">
          {TARIH.format(new Date())}
          {mercekAdi && <> · sektör: {mercekAdi}</>}
          {kapsamli && <> · yetki kapsamınızla sınırlı</>}
        </p>
      </header>

      <section className="ozet" aria-label="Özet">
        <div>
          <span className="etiket">Uyum endeksi</span>
          <strong className="mono">{endeks.yuzde === null ? '—' : `%${endeks.yuzde}`}</strong>
          <span className="alt mono">
            {endeks.yuzde === null
              ? 'ölçülmedi'
              : `${endeks.degerlendirilen} kontrol · %${endeks.bilinmeyenOran ?? 0} bilinmeyen`}
          </span>
        </div>
        <div>
          <span className="etiket">{tBas('tesis', 'cogul')}</span>
          <strong className="mono">{satirlar.length}</strong>
          <span className="alt mono">
            {ozet.olculen} {terim('tesis')} ölçüldü
          </span>
        </div>
        <div>
          <span className="etiket">Toplam {terim('kapasite')}</span>
          <strong className="mono">{kapasiteYazi ?? '—'}</strong>
          <span className="alt mono">
            {/* Karışık birim bir kusur değil, ölçünün dürüstlüğü: iki
                sektörün birimi toplanmaz. Sebep YAZILIR, yoksa "—"
                ölçüm eksikliği sanılır. */}
            {kapasite.karisikBirim ? 'ortak ölçü yok — toplanmaz'
              : `${kapasite.olculen}/${kapasite.toplamKayit} ölçüldü`}
          </span>
        </div>
        <div>
          <span className="etiket">Açık bulgu</span>
          <strong className="mono">{acikBulgu}</strong>
          <span className="alt mono">açık risk {acikRisk}</span>
        </div>
      </section>

      <section aria-label="En zayıf kayıtlar">
        <h2>En zayıf beş {terim('tesis')}</h2>
        {enZayif.length === 0 ? (
          <p className="bos">
            Hiçbir {terim('tesis')} için uyum yüzdesi ölçülmedi; yüzde,
            değerlendirilmiş kontrollerden hesaplanır.
          </p>
        ) : (
          /* Dar bantta tablo KENDİ kabında kaydırılır, sayfa kaymaz.
             Ölçüldü: 375px'te tablo 413px genişliğinde ve sayfayı 86px
             kaydırıyordu. Kolon atmak bilgi kaybıdır — karne bir denetim
             çıktısıdır ve satırın hangi sütunu eksikse o soru
             cevapsızdır; kaydırılabilen içerik ise kayıp sayılmaz.

             ÖLÇÜLDÜ (8 Eyl 2026): kap `tabIndex` olmadan eklenmişti ve
             axe kapısı 375px'te `scrollable-region-focusable` yaktı —
             fareyle kaydırılabilen bir kap, klavyeyle kaydırılamıyorsa
             içeriğin bir bölümü klavye kullanıcısına ULAŞMAZ. Kaydırma
             kabı odaklanabilir olmalı ve odaklandığında NEYE
             odaklanıldığı söylenmeli; ad olmadan odak, boş bir kutuya
             düşer. */
          <div className="ab-karne-kaydir" tabIndex={0} role="group"
            aria-label="En zayıf kayıtlar tablosu — yatay kaydırılabilir">
          <table className="ab-karne-tablo">
            <thead>
              <tr>
                <th scope="col">{tBas('tesis')}</th>
                <th scope="col">{tBas('kapasite')}</th>
                <th scope="col" className="say">Uyum</th>
                <th scope="col" className="say">Bilinmeyen</th>
                <th scope="col" className="say">Bulgu</th>
                <th scope="col" className="say">Risk</th>
              </tr>
            </thead>
            <tbody>
              {enZayif.map((s) => (
                <tr key={s.id}>
                  <td>{s.ad}<span className="ikincil mono"> {s.tipAdi}</span></td>
                  <td className="mono">
                    {olculenYazi({ deger: s.guc, birim: s.gucBirim }) ?? 'ölçülmedi'}
                  </td>
                  <td className="say mono">%{s.uyumYuzde}</td>
                  <td className="say mono">
                    {s.bilinmeyenOran === null ? '—' : `%${s.bilinmeyenOran}`}
                  </td>
                  <td className="say mono">{s.acikBulgu}</td>
                  <td className="say mono">{s.acikRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </section>

      <footer className="ab-karne-ayak">
        <p>
          Her satır kaydına kadar izlenebilir; yüzdeler madde durumu
          havuzundan aynı formülle hesaplanır. Ölçülmemiş değer sıfır
          sayılmaz — “—” işareti ölçümün yapılmadığını söyler.
        </p>
      </footer>
    </main>
  );
}
