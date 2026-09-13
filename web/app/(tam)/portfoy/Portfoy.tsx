'use client';
import { useSektorSecimi, useTerim } from '@/lib/dil/SozlukSaglayici';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { heroGorseli, kucukGorsel, gorselAlt } from '@/lib/gorsel';
import { tipAdi, tipRengi } from '@/components/kabuk/tip';
import { etiketle } from '@/lib/sabitler';
import { birimliToplam, olculenYazi } from '@/lib/alan/oznitelik';
import {
  HEPSI, SIRALAMALAR, enZayif, olcuYazisi, sirala, siralamaEtiketi, suz, tuzelKisiler,
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

export default function Portfoy({
  satirlar: hamSatirlar, toplamGuc: hamToplam, endeks: genelEndeks,
  endeksSektor = {}, kapsamli = false,
}: {
  satirlar: PortfoySatiri[];
  toplamGuc: { toplam: number | null; birim: string | null; karisikBirim: boolean };
  endeks: PortfoyEndeksi;
  /** Sektör başına endeks; mercek uygulandığında bu kullanılır. */
  endeksSektor?: Record<string, PortfoyEndeksi>;
  kapsamli?: boolean;
}) {
  /* ── SEKTÖR MERCEĞİ ────────────────────────────────────────────────
     Mercek YALNIZ sözcüğü değiştirseydi ekran YALAN söylerdi: başlık
     bir sektörün sözcükleriyle yazılırken liste ÖBÜR sektörün
     kayıtlarını gösterir, toplam da onların biriminden okunurdu.
     Ölçüldü (8 Eyl 2026, ekran görüntüsüyle) ve düzeltildi — mercek
     sözcüğü de VERİYİ de kapsar.

     Süzme burada, `suz()`den ÖNCE yapılır ki toplam, endeks, en zayıf
     ve tip süzgeçleri hepsi aynı kümeden türesin. İki ayrı küme
     üzerinden hesaplanan iki sayı aynı başlıkta yan yana durursa,
     hangisinin neyi saydığı okunamaz. */
  const { etkinId: mercek } = useSektorSecimi();
  const satirlar = useMemo(
    () => (mercek === null ? hamSatirlar : hamSatirlar.filter((s) => s.sektorId === mercek)),
    [hamSatirlar, mercek],
  );
  /* Toplam da mercekten geçer: kapsam geneli toplamı daraltılmış bir
     listenin başlığına yazmak, iki kümeyi tek cümlede birleştirmekti. */
  const toplamGuc = useMemo(
    () => (mercek === null ? hamToplam
      : birimliToplam(satirlar.map((s) => ({ deger: s.guc, birim: s.gucBirim })))),
    [mercek, hamToplam, satirlar],
  );
  /* Endeks sunucuda sektör başına hesaplandı: madde durumu havuzu
     istemcide yok, ortalamayla türetilemez. Mercek altında o sektörün
     endeksi YOKSA "ölçülmedi" gösterilir — sıfır değil. */
  const endeks = mercek === null ? genelEndeks
    : endeksSektor[mercek]
      ?? { yuzde: null, bilinmeyenOran: null, degerlendirilen: 0, kapsam: 0 };
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
      v.adet += 1; v.guc += s.guc ?? 0; m.set(k, v);
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
  /* TOPLAMIN BİRİMİ satırlardan gelir, koda gömülmez; farklı birimler
     TOPLANMAZ (`birimliToplam`). Karışıkta sayı da yazılmaz — karışık
     bir toplamı tek birimle etiketlemek yanlış sayıyı doğru gösterirdi.
     Süzgeçten geçen alt küme AYRI hesaplanır: süzgeç tek birime indirmiş
     olabilir ve o zaman görünen toplam anlamlıdır. */
  const gorunenToplam = useMemo(
    () => birimliToplam(gorunen.map((s) => ({ deger: s.guc, birim: s.gucBirim }))),
    [gorunen]);
  const yaz = (x: { toplam: number | null; birim: string | null }) => olculenYazi({
    deger: x.toplam === null ? null : Math.round(x.toplam * 10) / 10, birim: x.birim });
  const toplamGucYazi = yaz(toplamGuc);
  const gorunenGucYazi = yaz(gorunenToplam);
  const suzgecli = tip !== HEPSI || tuzel !== HEPSI;
  /* Etiket sözlükten: `sozlukten` işaretli sıralama sektörün sözcüğünü
     alır ("kurulu güç" · "günlük debi" · "kapasite"). ÖLÇÜLDÜ (8 Eyl
     2026, yayında): su merceğinde de "Kurulu güç" yazıyordu. */
  const kapasiteSozcugu = tBas('kapasite');
  const etiket = (s: { ad: string; sozlukten?: true }) => siralamaEtiketi(s, kapasiteSozcugu);
  const siralamaAdi = etiket(SIRALAMALAR.find((s) => s.anahtar === anahtar) ?? { ad: '' });

  return (
    <main className="ab-b-portfoy">
      <header className="ab-b-portfoy-ust">
        {/* `h1` — görsel olarak aynı kaş, semantik olarak sayfanın adı.
            Ekran okuyucu kullanıcısı sayfaya girdiğinde nerede olduğunu
            buradan öğrenir; başlık atlama (H) bu ekranda çalışmıyordu. */}
        <h1 className="etiket">
          {/* "üretim" SABİTİ KALDIRILDI: bir enerji sözcüğüydü ve su
              merceğinde "su portföyü · üretim · 8 arıtma tesisi" diye
              yanlış okunuyordu (§0.5 — çekirdek sektör terimi taşımaz).
              Ölçüldü ve ekran görüntüsüyle görüldü. Yerine bir şey
              KONMADI: sözcük bilgi taşımıyordu, portföyün ne olduğunu
              zaten `portfoy` terimi söylüyor. */}
          {tBas('portfoy')} · {satirlar.length} {terim('tesis')}
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
              <option key={s.anahtar} value={s.anahtar}>{etiket(s)}</option>
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
              ? `${tBas('kapasite')} bir zayıflık ölçüsü değil — en zayıf işareti bu sıralamada yok.`
              : anahtar === 'uyum'
                ? `Hiçbir görünen ${terim('tesis')} değerlendirilmemiş — en zayıf seçilemiyor.`
                /* Çoğulun BULUNMA hâli sözlükte yok ("-de" ünlü uyumuna
                   göre değişir); cümle var olan hâlle yazılır. */
                : `Görünen ${terim('tesis', 'cogul')} arasında`
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
                <Olgu ad={tBas('kapasite')}
                  deger={olculenYazi({ deger: secili.guc, birim: secili.gucBirim }) ?? '—'} />
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
                  <img src={foto} alt={gorselAlt(s.ad, s.tipAdi, s.konum, terim('tesis'))}
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
                        olculenYazi({ deger: s.guc, birim: s.gucBirim }) ?? 'kurulu güç kayıtsız']
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
