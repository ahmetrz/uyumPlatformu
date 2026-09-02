'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { heroGorseli, kucukGorsel, gorselAlt } from '@/lib/gorsel';
import { tipAdi, tipRengi } from '@/components/kabuk/tip';
import { etiketle } from '@/lib/sabitler';
import {
  HEPSI, SIRALAMALAR, enZayif, olcuYazisi, sirala, suz, tuzelKisiler,
  type PortfoyEndeksi, type PortfoySatiri, type SiralamaAnahtari,
} from './mantik';

export type { PortfoySatiri } from './mantik';

/* ═══════════════════════════════════════════════════════════════════════
   ENERJİ PORTFÖYÜ — B · ENERGY INTELLIGENCE

   Prototiplerde ayrı bir portföy ekranı yok; en yakın gramer
   `b-executive`in SAHA ŞERİDİDİR: fotoğraf + perde + üretim tipi + ad +
   MW + endeks + dört parçalı yığın. Bu ekran o şeridi tam sayfaya
   açar; solda 380px kimlik paneli seçili santrali taşır.

   Sözleşme aynen korundu:
   · fotoğrafı olmayan santral için başka santralin fotoğrafı ASLA
     kullanılmaz — tipografik döşeme alır (harita §7 kusur 3);
   · yüzde gösterilen her yerde BİLİNMEYEN payı da yazılır;
   · kapsam yüzünden boşalan portföy "santral yok" demez, "kapsamınızda
     santral yok" der — ikisi farklı şeydir.

   Kimlik rengi ÜRETİM TİPİNİ söyler, durumu değil.

   ── SIRALAMA · TÜZEL KİŞİ · EN ZAYIF ─────────────────────────────────
   Liste eskiden kurulu güce göre sabitti; "en çok açık bulgusu olan
   santral hangisi?" sorusu göz taramasıyla cevaplanıyordu. Sıralama
   anahtarı ve tüzel kişi süzgeci `mantik.ts`te saf fonksiyondur; burası
   yalnız durumu tutar ve sonucu çizer. En zayıf santral SÖZCÜKLE
   işaretlenir ("en zayıf · 4 açık bulgu"), yalnız kenarlık rengiyle değil. */

export default function Portfoy({ satirlar, toplamGucMw, endeks, kapsamli = false }: {
  satirlar: PortfoySatiri[]; toplamGucMw: number;
  endeks: PortfoyEndeksi;
  kapsamli?: boolean;
}) {
  const [tip, setTip] = useState(HEPSI);
  const [tuzel, setTuzel] = useState(HEPSI);
  const [anahtar, setAnahtar] = useState<SiralamaAnahtari>('guc');
  const [seciliId, setSeciliId] = useState(satirlar[0]?.id ?? null);

  const tipler = useMemo(() => {
    const m = new Map<string, { kod: string; ad: string; adet: number; guc: number }>();
    for (const s of satirlar) {
      const k = s.tipKod ?? 'DIGER';
      const v = m.get(k) ?? { kod: k, ad: s.tipAdi, adet: 0, guc: 0 };
      v.adet += 1; v.guc += s.gucMw ?? 0; m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.adet - a.adet);
  }, [satirlar]);

  const tuzeller = useMemo(() => tuzelKisiler(satirlar), [satirlar]);

  const gorunen = useMemo(
    () => sirala(suz(satirlar, { tip, tuzelKisi: tuzel }), anahtar),
    [satirlar, tip, tuzel, anahtar],
  );
  /* En zayıf, GÖRÜNEN kümeden seçilir: "HES'lerde en zayıf" sorusu da
     tüzel kişiye daraltılmış portföyde de aynı vurguyla cevaplanır. */
  const zayif = useMemo(() => enZayif(gorunen, anahtar), [gorunen, anahtar]);
  const secili = gorunen.find((s) => s.id === seciliId) ?? gorunen[0] ?? null;
  const gorunenGuc = Math.round(gorunen.reduce((a, s) => a + (s.gucMw ?? 0), 0) * 10) / 10;
  const suzgecli = tip !== HEPSI || tuzel !== HEPSI;
  const siralamaAdi = SIRALAMALAR.find((s) => s.anahtar === anahtar)?.ad ?? '';

  return (
    <main className="ab-b-portfoy">
      <header className="ab-b-portfoy-ust">
        <span className="etiket">
          Enerji portföyü · üretim · {satirlar.length} santral · {toplamGucMw} MWe
        </span>
        {/* Portföy endeksi: kök ekranla aynı havuz, aynı formül. Yüzde
            yazılan her yerde bilinmeyen payı da yazılır. */}
        <span className="ab-portfoy-endeks" aria-label="Portföy uyum endeksi">
          <span className="etiket">Uyum endeksi</span>
          <span className="mono deger">{endeks.yuzde === null ? '—' : `%${endeks.yuzde}`}</span>
          <span className="mono cumle">
            {endeks.yuzde === null
              ? 'hiç değerlendirme yok'
              : `${endeks.degerlendirilen} kontrol · %${endeks.bilinmeyenOran ?? 0} bilinmeyen`}
          </span>
        </span>
        <nav aria-label="Üretim tipi">
          <button type="button" aria-pressed={tip === HEPSI} onClick={() => setTip(HEPSI)}>
            Tümü <span className="mono">{satirlar.length}</span>
          </button>
          {tipler.map((t) => (
            <button key={t.kod} type="button" aria-pressed={tip === t.kod}
              onClick={() => setTip(t.kod)}>
              {tipAdi(t.kod, t.ad)} <span className="mono">{t.adet}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* ── Sıralama + tüzel kişi ─────────────────────────────────────── */}
      <div className="ab-portfoy-denetim">
        <label className="secim">
          <span className="etiket">Sırala</span>
          <select value={anahtar}
            onChange={(e) => setAnahtar(e.target.value as SiralamaAnahtari)}>
            {SIRALAMALAR.map((s) => (
              <option key={s.anahtar} value={s.anahtar}>{s.ad}</option>
            ))}
          </select>
        </label>
        <label className="secim">
          <span className="etiket">Tüzel kişi</span>
          <select value={tuzel} onChange={(e) => setTuzel(e.target.value)}>
            <option value={HEPSI}>Tümü · {satirlar.length}</option>
            {tuzeller.map((t) => (
              <option key={t.anahtar} value={t.anahtar}>{t.ad} · {t.adet}</option>
            ))}
          </select>
        </label>
        {/* Harita portföyün ikinci okumasıdır: aynı kapsam, aynı sayılar,
            coğrafi düzen. Bağ burada durur ki iki ekran kardeş okunsun. */}
        <Link href="/harita" className="ab-dugme">Haritada göster</Link>
        <p className="mono cumle" aria-live="polite">
          {zayif
            ? <>En zayıf · {siralamaAdi.toLocaleLowerCase('tr-TR')}: <b>{gorunen.find((s) => s.id === zayif.id)?.ad}</b> · {zayif.neden}</>
            : anahtar === 'guc'
              ? 'Kurulu güç bir zayıflık ölçüsü değil — en zayıf işareti bu sıralamada yok.'
              : anahtar === 'uyum'
                ? 'Hiçbir görünen santral değerlendirilmemiş — en zayıf seçilemiyor.'
                : `Görünen santrallerde ${siralamaAdi.toLocaleLowerCase('tr-TR')} yok.`}
        </p>
      </div>

      <div className="ab-b-portfoy-govde">
        {/* ── Kimlik paneli ─────────────────────────────────────────── */}
        <aside className="kimlik" aria-label="Seçili santral">
          {secili ? (
            <>
              <p className="etiket" style={{ color: tipRengi(secili.tipKod) }}>
                Seçili · {tipAdi(secili.tipKod, secili.tipAdi)}
              </p>
              <h2>{secili.ad}</h2>
              <span className="cizgi" style={{ background: tipRengi(secili.tipKod) }} />
              <p className="alt">
                {[secili.tuzelKisi, secili.konum,
                  secili.kritiklik ? `kritiklik ${etiketle(secili.kritiklik)}` : null]
                  .filter(Boolean).join(' · ')}
              </p>
              <dl className="olgular">
                <Olgu ad="Kurulu güç"
                  deger={secili.gucMw != null ? `${secili.gucMw} MWe` : '—'} />
                <Olgu ad="Uyum endeksi"
                  deger={secili.uyumYuzde === null ? '—' : `%${secili.uyumYuzde}`}
                  not={secili.bilinmeyenOran != null && secili.bilinmeyenOran > 0
                    ? `%${secili.bilinmeyenOran} bilinmeyen`
                    : secili.uyumYuzde === null ? 'değerlendirme yok' : undefined} />
                <Olgu ad="Açık bulgu" deger={String(secili.acikBulgu)}
                  vurgu={secili.acikBulgu > 0} />
                <Olgu ad="Açık risk" deger={String(secili.acikRisk)}
                  vurgu={secili.acikRisk > 0} />
              </dl>
              <Link href={`/tesisler/${secili.id}`} className="ab-dugme tam">
                Santral dosyasını aç →
              </Link>
            </>
          ) : satirlar.length === 0 && kapsamli ? (
            <>
              <h2>Kapsamınızda santral yok</h2>
              <p className="alt">
                Bu hesap bir santral kapsamıyla sınırlı; portföyde gösterilecek
                kayıt bulunmuyor.
              </p>
            </>
          ) : (
            <>
              <h2>Bu süzgeçte santral yok</h2>
              <button type="button" className="ab-dugme"
                onClick={() => { setTip(HEPSI); setTuzel(HEPSI); }}>
                Süzgeci temizle
              </button>
            </>
          )}
          <p className="mono dip">
            Gösterilen {gorunen.length} santral · {gorunenGuc} MWe
            {suzgecli && ' · süzgeçli'} · {siralamaAdi.toLocaleLowerCase('tr-TR')} sırası
          </p>
        </aside>

        {/* ── Plakalar ──────────────────────────────────────────────── */}
        <div className="plakalar">
          {gorunen.map((s, i) => {
            const foto = heroGorseli(s.gorselAnahtari) ?? kucukGorsel(s.gorselAnahtari);
            /* İlk sıra görüntü alanındadır: tembel yüklenirse LCP gecikir
               (Lighthouse /portfoy). İlk dört plaka hevesli, ilki öncelikli;
               gerisi ekrana girince. */
            const ilkSira = i < 4;
            const renk = tipRengi(s.tipKod);
            const enZayifMi = zayif?.id === s.id;
            return (
              <Link key={s.id} href={`/tesisler/${s.id}`}
                className={`plaka${s.id === secili?.id ? ' secili' : ''}${enZayifMi ? ' ab-portfoy-zayif' : ''}`}
                style={{ borderLeftColor: renk }}
                onMouseEnter={() => setSeciliId(s.id)}
                onFocus={() => setSeciliId(s.id)}>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
                  <img src={foto} alt={gorselAlt(s.ad, s.tipAdi, s.konum)}
                    loading={ilkSira ? 'eager' : 'lazy'} decoding="async"
                    fetchPriority={i === 0 ? 'high' : undefined} />
                ) : (
                  /* Fotoğrafı olmayan santrale BAŞKA santralin fotoğrafı
                     konmaz; tipografik döşeme (harita §7 kusur 3). */
                  <span className="fotoyok" aria-hidden />
                )}
                <span className="perde" aria-hidden />
                <span className="icerik">
                  <span className="mono tip" style={{ color: renk }}>
                    {tipAdi(s.tipKod, s.tipAdi)}{s.konum && ` · ${s.konum}`}
                  </span>
                  {/* Vurgu SÖZCÜKLE: kenarlık rengi görmeyen de okur. */}
                  {enZayifMi && zayif && (
                    <span className="mono zayif">en zayıf · {zayif.neden}</span>
                  )}
                  <span className="ad">{s.ad}</span>
                  <span className="olcu">
                    <span className="mono guc">
                      {[s.tuzelKisi, s.gucMw != null ? `${s.gucMw} MWe` : 'kurulu güç kayıtsız']
                        .filter(Boolean).join(' · ')}
                      {/* Güç dışı bir anahtarla sıralanırken ölçü satırda da yazılır;
                          "ölçülmedi" sözcüğü sıfırla karışmaz. */}
                      {anahtar !== 'guc' && ` · ${siralamaAdi.toLocaleLowerCase('tr-TR')} ${olcuYazisi(s, anahtar)}`}
                    </span>
                  </span>
                </span>
                <span className="sayilar">
                  <span>
                    <span className="deger">
                      {s.uyumYuzde === null ? '—' : `%${s.uyumYuzde}`}
                    </span>
                    <span className="etiket">Uyum</span>
                  </span>
                  <span>
                    <span className={`deger${s.acikBulgu > 0 ? ' vurgu' : ''}`}>
                      {s.acikBulgu}
                    </span>
                    <span className="etiket">Bulgu</span>
                  </span>
                  <span>
                    <span className={`deger${s.acikRisk > 0 ? ' vurgu' : ''}`}>
                      {s.acikRisk}
                    </span>
                    <span className="etiket">Risk</span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function Olgu({ ad, deger, not, vurgu }: {
  ad: string; deger: string; not?: string; vurgu?: boolean;
}) {
  return (
    <div>
      <dt>{ad}</dt>
      <dd className={vurgu ? 'vurgu' : undefined}>
        {deger}
        {not && <span className="mono not">{not}</span>}
      </dd>
    </div>
  );
}
