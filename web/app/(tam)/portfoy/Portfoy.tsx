'use client';
import { useTerim } from '@/lib/dil/SozlukSaglayici';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { heroGorseli, kucukGorsel, gorselAlt } from '@/lib/gorsel';
import { tipAdi, tipRengi } from '@/components/kabuk/tip';
import { etiketle } from '@/lib/sabitler';
import { olculenYazi } from '@/lib/alan/oznitelik';
import {
  HEPSI, SIRALAMALAR, enZayif, olcuYazisi, sirala, suz, tuzelKisiler,
  type PortfoyEndeksi, type PortfoySatiri, type SiralamaAnahtari,
} from './mantik';

export type { PortfoySatiri } from './mantik';

/* ═══════════════════════════════════════════════════════════════════════
   ENERJİ PORTFÖYÜ — B · ENERGY INTELLIGENCE

   Prototiplerde ayrı bir portföy ekranı yok; en yakın gramer
   `b-executive`in SAHA ŞERİDİDİR: fotoğraf + perde + üretim tipi + ad +
   kurulu güç + endeks + dört parçalı yığın. Bu ekran o şeridi tam sayfaya
   açar; solda 380px kimlik paneli seçili tesisi taşır.

   Sözleşme aynen korundu:
   · fotoğrafı olmayan tesis için başka tesisin fotoğrafı ASLA
     kullanılmaz — tipografik döşeme alır (harita §7 kusur 3);
   · yüzde gösterilen her yerde BİLİNMEYEN payı da yazılır;
   · kapsam yüzünden boşalan portföy "tesis yok" demez, "kapsamınızda
     tesis yok" der — ikisi farklı şeydir.

   Kimlik rengi ÜRETİM TİPİNİ söyler, durumu değil.

   ── SIRALAMA · TÜZEL KİŞİ · EN ZAYIF ─────────────────────────────────
   Liste eskiden kurulu güce göre sabitti; "en çok açık bulgusu olan
   tesis hangisi?" sorusu göz taramasıyla cevaplanıyordu. Sıralama
   anahtarı ve tüzel kişi süzgeci `mantik.ts`te saf fonksiyondur; burası
   yalnız durumu tutar ve sonucu çizer. En zayıf tesis SÖZCÜKLE
   işaretlenir ("en zayıf · 4 açık bulgu"), yalnız kenarlık rengiyle değil. */

export default function Portfoy({ satirlar, toplamKuruluGuc, endeks, kapsamli = false }: {
  satirlar: PortfoySatiri[]; toplamKuruluGuc: number;
  endeks: PortfoyEndeksi;
  kapsamli?: boolean;
}) {
  const { t: terim, tBas } = useTerim();
  const [tip, setTip] = useState(HEPSI);
  const [tuzel, setTuzel] = useState(HEPSI);
  const [anahtar, setAnahtar] = useState<SiralamaAnahtari>('guc');
  const [seciliId, setSeciliId] = useState(satirlar[0]?.id ?? null);

  const tipler = useMemo(() => {
    const m = new Map<string, { kod: string; ad: string; adet: number; guc: number }>();
    for (const s of satirlar) {
      const k = s.tipKod ?? 'DIGER';
      const v = m.get(k) ?? { kod: k, ad: s.tipAdi, adet: 0, guc: 0 };
      v.adet += 1; v.guc += s.kuruluGuc ?? 0; m.set(k, v);
    }
    return [...m.values()].sort((a, b) => b.adet - a.adet);
  }, [satirlar]);

  const tuzeller = useMemo(() => tuzelKisiler(satirlar), [satirlar]);

  const gorunen = useMemo(
    () => sirala(suz(satirlar, { tip, tuzelKisi: tuzel }), anahtar),
    [satirlar, tip, tuzel, anahtar],
  );
  /* En zayıf, GÖRÜNEN kümeden seçilir: "bu üretim tipinde en zayıf"
     sorusu da tüzel kişiye daraltılmış portföyde de aynı vurguyla
     cevaplanır. */
  const zayif = useMemo(() => enZayif(gorunen, anahtar), [gorunen, anahtar]);
  const secili = gorunen.find((s) => s.id === seciliId) ?? gorunen[0] ?? null;
  const gorunenGuc = Math.round(gorunen.reduce((a, s) => a + (s.kuruluGuc ?? 0), 0) * 10) / 10;
  /* TOPLAMIN BİRİMİ satırlardan gelir, koda gömülmez. Satırlar farklı
     birimler taşıyorsa toplam ANLAMSIZDIR ve birim yazılmaz — sayıyı
     tek bir birimle etiketlemek karışık bir toplamı tek birimmiş gibi
     gösterirdi. Bugün veride tek birim var (43 satırın 43'ünde dolu). */
  const birimler = new Set(satirlar.map((s) => s.gucBirim).filter(Boolean));
  const tekBirim = birimler.size === 1 ? [...birimler][0]! : null;
  const yaz = (x: number) => olculenYazi({ deger: x, birim: tekBirim });
  const toplamGucYazi = yaz(toplamKuruluGuc);
  const gorunenGucYazi = yaz(gorunenGuc);
  const suzgecli = tip !== HEPSI || tuzel !== HEPSI;
  const siralamaAdi = SIRALAMALAR.find((s) => s.anahtar === anahtar)?.ad ?? '';

  return (
    <main className="ab-b-portfoy">
      <header className="ab-b-portfoy-ust">
        {/* `h1` — görsel olarak aynı kaş, semantik olarak sayfanın adı.
            Ekran okuyucu kullanıcısı sayfaya girdiğinde nerede olduğunu
            buradan öğrenir; başlık atlama (H) bu ekranda çalışmıyordu. */}
        <h1 className="etiket">
          {tBas('portfoy')} · üretim · {satirlar.length} {terim('tesis')}
          {toplamGucYazi && ` · ${toplamGucYazi}`}
        </h1>
        {/* Portföy endeksi: kök ekranla aynı havuz, aynı formül. Yüzde
            yazılan her yerde bilinmeyen payı da yazılır. */}
        <span className="ab-portfoy-endeks" aria-label={`${tBas('portfoy')} uyum endeksi`}>
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
                ? `Hiçbir görünen ${terim('tesis')} değerlendirilmemiş — en zayıf seçilemiyor.`
                : `Görünen ${terim('tesis', 'cogul')}de`
                  + ` ${siralamaAdi.toLocaleLowerCase('tr-TR')} yok.`}
        </p>
      </div>

      <div className="ab-b-portfoy-govde">
        {/* ── Kimlik paneli ─────────────────────────────────────────── */}
        <aside className="kimlik" aria-label={`Seçili ${terim('tesis')}`}>
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
                  deger={olculenYazi({ deger: secili.kuruluGuc, birim: secili.gucBirim }) ?? '—'} />
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
              {/* Bağ KENDİ HEDEFİNİ adlandırır: "tesis dosyasını aç"
                  hangi tesis olduğunu söylemiyordu. */}
              <Link href={`/tesisler/${secili.id}`} className="ab-dugme tam">
                {secili.ad} dosyasını aç →
              </Link>
            </>
          ) : satirlar.length === 0 && kapsamli ? (
            <>
              <h2>Kapsamınızda {terim('tesis')} yok</h2>
              <p className="alt">
                Bu hesap bir {terim('tesis')} kapsamıyla sınırlı; portföyde gösterilecek
                kayıt bulunmuyor.
              </p>
            </>
          ) : (
            <>
              <h2>Bu süzgeçte {terim('tesis')} yok</h2>
              <button type="button" className="ab-dugme"
                onClick={() => { setTip(HEPSI); setTuzel(HEPSI); }}>
                Süzgeci temizle
              </button>
            </>
          )}
          <p className="mono dip">
            Gösterilen {gorunen.length} {terim('tesis')}
            {gorunenGucYazi && ` · ${gorunenGucYazi}`}
            {suzgecli && ' · süzgeçli'} · {siralamaAdi.toLocaleLowerCase('tr-TR')} sırası
          </p>
        </aside>

        {/* ── Plakalar ──────────────────────────────────────────────────
            KOLON KAŞI BİR KEZ. Bu üç etiket ("Uyum · Bulgu · Risk") her
            plakanın içinde yeniden yazılıyordu: on altı tesis × üç
            etiket = kırk sekiz görünür etiket, hepsi aynı üç sözcük.
            Ölçüm (`arac/bilissel-yuk.mjs`) ekranda 53 etiket saydı ve
            48'i buydu. Kaş yukarı çıktı; sayılar `aria-label` ile kendi
            adını taşımaya devam ediyor, yani ekran okuyucu hiçbir şey
            kaybetmedi. */}
        <div className="plakalar">
          <div className="plaka-kas" aria-hidden>
            <span className="etiket">Uyum</span>
            <span className="etiket">Bulgu</span>
            <span className="etiket">Risk</span>
          </div>
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
                /* İMLEÇLE SEÇİM YOK — bilinçli. Seçim sol paneli ve oradaki
                   birincil bağın hedefini belirliyor; imleç panele giderken
                   aradaki plakaların üzerinden geçtiği için hedef tek tık
                   olmadan değişiyordu (ölçüldü: iki komşu plaka arasında).
                   Klavye odağı kalır: orada odak görünür ve kullanıcı nereye
                   gittiğini bilir. Plakanın kendisi zaten tesis dosyasına
                   giden bağdır; keşif oradan yürür. */
                onFocus={() => setSeciliId(s.id)}>
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- statik dışa aktarım
                  <img src={foto} alt={gorselAlt(s.ad, s.tipAdi, s.konum)}
                    loading={ilkSira ? 'eager' : 'lazy'} decoding="async"
                    fetchPriority={i === 0 ? 'high' : undefined} />
                ) : (
                  /* Fotoğrafı olmayan tesise BAŞKA tesisin fotoğrafı
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
                      {[s.tuzelKisi,
                        olculenYazi({ deger: s.kuruluGuc, birim: s.gucBirim }) ?? 'kurulu güç kayıtsız']
                        .filter(Boolean).join(' · ')}
                      {/* Güç dışı bir anahtarla sıralanırken ölçü satırda da yazılır;
                          "ölçülmedi" sözcüğü sıfırla karışmaz. */}
                      {anahtar !== 'guc' && ` · ${siralamaAdi.toLocaleLowerCase('tr-TR')} ${olcuYazisi(s, anahtar)}`}
                    </span>
                  </span>
                </span>
                <span className="sayilar">
                  <span className="deger"
                    aria-label={s.uyumYuzde === null
                      ? 'Uyum endeksi ölçülmedi'
                      : `Uyum endeksi yüzde ${s.uyumYuzde}`}>
                    {s.uyumYuzde === null ? '—' : `%${s.uyumYuzde}`}
                  </span>
                  <span className={`deger${s.acikBulgu > 0 ? ' vurgu' : ''}`}
                    aria-label={`${s.acikBulgu} açık bulgu`}>
                    {s.acikBulgu}
                  </span>
                  <span className={`deger${s.acikRisk > 0 ? ' vurgu' : ''}`}
                    aria-label={`${s.acikRisk} açık risk`}>
                    {s.acikRisk}
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
