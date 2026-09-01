'use client';
import { useState, useTransition } from 'react';
import { Alan, Dugme } from '@/components/abacus/temel';
import { Tablo, type Kolon } from '@/components/abacus/tablo';
import { useEylem } from '@/components/useEylem';
import { eslemeOnizle, eslemeProfilYayinla } from '@/lib/eylemler2/esleme';
import {
  GORUNUR_TAVAN, KAYNAGI_SOZU, guvenYazisi, onizlemeImi, onizlemeSayimi,
  onizlemePasifMi, yayinPasifMi,
} from './mantik';

/* Eşleme profilinin YAZMA yüzeyi — kural düzenleyici · önizleme · yayın.

   ÜÇ DEĞİŞMEZ BU DOSYADA GÖRÜNÜR:

   1. "KAYDET" DÜĞMESİ YOKTUR. Yalnız YAYINLA vardır ve her yayın yeni bir
      SÜRÜM açar (`lib/entegrasyon/esleme.ts → profilYayinla`). Var olan bir
      sürümün üstüne yazmak, onunla yorumlanmış içe aktarımların kuralını
      silmek olurdu; bir denetimde "bu alan neden böyle" sorusunun yanıtı
      kaybolurdu. Ekran bunu saklamaz: yayın düğmesinin yanında hangi
      sürümün açılacağı yazar.

   2. ÖNİZLEME HİÇBİR ŞEY YAZMAZ, HİÇBİR YERE BAĞLANMAZ. Girdi kullanıcının
      yapıştırdığı JSON'dur; çıktı "bu kural bu kayda ne yapardı" raporudur.
      Ekranda "bağlan", "çek", "senkronize et" diye bir düğme bilerek
      yoktur — bu tezgâh gerçek bir kurum sistemine dokunmaz.

   3. VARSAYILAN BİR ÖLÇÜM DEĞİLDİR. Önizleme her alanın değerini DEĞİL,
      değerin NEREDEN geldiğini de gösterir: kaynaktan mı geldi, kural mı
      doldurdu, yoksa hiç gelmedi mi. Üçü ayrı kovadır ve "gelmedi" boş
      hücre olarak değil, kelimeyle yazılır. */

/** Düzenleyicideki tek kural satırı. Sunucudaki `EslemeKurali`nın ekran
    ikizi: `server-only` modülün tipi istemci paketine giremez. */
export type KuralTaslagi = {
  kaynakAlan: string;
  hedefAlan: string;
  donusum: string;
  zorunlu: boolean;
  varsayilan: string;
};

export type Sozluk = {
  hedefAlanlar: {
    anahtar: string; etiket: string; tip: string;
    sozluk: string[] | null; ozel: string | null;
  }[];
  donusumler: string[];
};

export const bosKural = (): KuralTaslagi => ({
  kaynakAlan: '', hedefAlan: '', donusum: 'yok', zorunlu: false, varsayilan: '',
});

const pasifStil = (pasif: boolean) =>
  (pasif ? { opacity: 0.45, cursor: 'not-allowed' } : undefined);

type OnizlemeYaniti = Awaited<ReturnType<typeof eslemeOnizle>>;
type BasariliOnizleme = Extract<OnizlemeYaniti, { ok: true }>;

const ONIZLEME_KOLONLARI: Kolon[] = [
  { baslik: 'Kaynaktan', genislik: '90px', sag: true },
  { baslik: 'Varsayılan', genislik: '90px', sag: true },
  { baslik: 'Gelmedi', genislik: '90px', sag: true },
  { baslik: 'Güven', genislik: '90px', sag: true, ikincil: true },
];

export default function Duzenleyici({
  sozluk, tipler, yazabilir, baslangic, sozlukOkunamadi,
}: {
  sozluk: Sozluk;
  tipler: string[];
  yazabilir: boolean;
  /** çekmeceden "bu sürümü düzenleyiciye yükle" ile gelen taslak */
  baslangic: {
    kod: string; ad: string; connectorTipi: string;
    aciklama: string; kurallar: KuralTaslagi[]; kaynakSurum: number | null;
  } | null;
  /** sözlük eylemi boş döndüyse (demo yayını) — sessiz boş liste YOK */
  sozlukOkunamadi: boolean;
}) {
  const { bekliyor: yayinBekliyor, hata: yayinHatasi, calistir } = useEylem();
  const [onizlemeKosuyor, onizlemeBaslat] = useTransition();

  const [kod, setKod] = useState(baslangic?.kod ?? '');
  const [ad, setAd] = useState(baslangic?.ad ?? '');
  const [tip, setTip] = useState(baslangic?.connectorTipi ?? (tipler[0] ?? ''));
  const [aciklama, setAciklama] = useState(baslangic?.aciklama ?? '');
  const [etkinlestir, setEtkinlestir] = useState(true);
  const [kurallar, setKurallar] = useState<KuralTaslagi[]>(
    baslangic?.kurallar?.length ? baslangic.kurallar : [bosKural()]);
  const [ornek, setOrnek] = useState('');
  const [onizleme, setOnizleme] = useState<BasariliOnizleme | null>(null);
  const [onizlemeHatasi, setOnizlemeHatasi] = useState<string | null>(null);
  const [seciliKayit, setSeciliKayit] = useState(0);
  const [kuyrukAcik, setKuyrukAcik] = useState(false);

  const dolu = kurallar.filter((k) => k.kaynakAlan.trim() && k.hedefAlan);

  function kuralGuncelle(i: number, yama: Partial<KuralTaslagi>) {
    setKurallar((eski) => eski.map((k, j) => (j === i ? { ...k, ...yama } : k)));
    // Kural değişti: eski önizleme artık bu kuralların çıktısı DEĞİL.
    setOnizleme(null);
  }

  /** Sunucuya giden kural biçimi. Boş varsayılan `undefined` gider:
      boş string "varsayılan '' yaz" demektir, "varsayılan yok" değil. */
  const kurallariCevir = () => dolu.map((k) => ({
    kaynakAlan: k.kaynakAlan.trim(),
    hedefAlan: k.hedefAlan,
    donusum: k.donusum || 'yok',
    zorunlu: k.zorunlu,
    ...(k.varsayilan.trim() ? { varsayilan: k.varsayilan.trim() } : {}),
  }));

  const onizlemeEngeli = onizlemePasifMi({
    kuralSayisi: dolu.length, ornek, bekliyor: onizlemeKosuyor });
  const yayinEngeli = yayinPasifMi({
    yetkili: yazabilir, kod, ad, connectorTipi: tip,
    kuralSayisi: dolu.length, bekliyor: yayinBekliyor });

  function onizlemeCalistir() {
    setOnizlemeHatasi(null);
    onizlemeBaslat(async () => {
      const sonuc = await eslemeOnizle({
        // Tip zorlaması bilerek burada: `EslemeKurali` sunucu tarafında
        // `server-only` bir modülde tanımlı ve istemci paketine giremez.
        kurallar: kurallariCevir() as never,
        ornekJson: ornek,
      });
      if (sonuc.ok) { setOnizleme(sonuc); setSeciliKayit(0); }
      else { setOnizleme(null); setOnizlemeHatasi(sonuc.hata); }
    });
  }

  function yayinla() {
    calistir(
      () => eslemeProfilYayinla({
        kod: kod.trim(), ad: ad.trim(), connectorTipi: tip.trim(),
        aciklama: aciklama.trim() || null,
        kurallar: kurallariCevir() as never,
        etkinlestir,
      }),
      () => { setOnizleme(null); },
    );
  }

  const satirlar = onizleme?.satirlar ?? [];
  const gosterilen = kuyrukAcik ? satirlar : satirlar.slice(0, GORUNUR_TAVAN);
  const secim = satirlar[seciliKayit] ?? null;
  const secimAlanlari = secim ? Object.values(secim.uygulama.alanlar) : [];

  return (
    <section className="ab-ekran-govde" style={{ paddingTop: 'var(--s22)' }}>
      {/* ── kimlik ──────────────────────────────────────────────────── */}
      <div className="ab-blok" style={{ maxWidth: 'none' }}>
        <p className="etiket" style={{ margin: 0 }}>Profil kimliği</p>
        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>
          <Alan etiket="Kod" zorunlu>
            <input className="ab-gr" value={kod} placeholder="ör. CMDB-VARLIK"
              onChange={(e) => setKod(e.target.value.toUpperCase())} />
          </Alan>
          <Alan etiket="Ad" zorunlu>
            <input className="ab-gr" value={ad} placeholder="CMDB varlık eşlemesi"
              onChange={(e) => setAd(e.target.value)} />
          </Alan>
          <Alan etiket="Connector tipi" zorunlu>
            <input className="ab-gr" value={tip} list="esleme-tipleri"
              placeholder="ör. cmdb_rest"
              onChange={(e) => setTip(e.target.value)} />
            <datalist id="esleme-tipleri">
              {tipler.map((t) => <option key={t} value={t} />)}
            </datalist>
          </Alan>
          <Alan etiket="Açıklama">
            <input className="ab-gr" value={aciklama}
              placeholder="Bu sürümde ne değişti?"
              onChange={(e) => setAciklama(e.target.value)} />
          </Alan>
        </div>
        <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
          {baslangic?.kaynakSurum != null
            ? `${baslangic.kod} v${baslangic.kaynakSurum} kuralları yüklendi.`
              + ' Yayın o sürümü DEĞİŞTİRMEZ; aynı kod için yeni sürüm açar'
              + ' ve eskisi arşive geçer.'
            : 'Aynı kod daha önce yayımlandıysa yayın yeni SÜRÜM açar;'
              + ' var olan sürüm hiçbir koşulda güncellenmez.'}
        </p>
      </div>

      {/* ── kural düzenleyici ───────────────────────────────────────── */}
      <div className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s20)' }}>
        <p className="etiket" style={{ margin: 0 }}>
          Kurallar · {dolu.length} tanımlı
        </p>

        {sozlukOkunamadi && (
          <p className="ab-dip" style={{ marginTop: 'var(--s10)', color: 'var(--unk)' }}>
            Hedef alan sözlüğü okunamadı — bu ortamda eşleme tezgâhı çalışmaz.
            Aşağıdaki liste BOŞ olduğu için değil, OKUNAMADIĞI için boştur.
          </p>
        )}

        <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
          {kurallar.map((kural, i) => (
            <div key={i} style={{ display: 'grid', gap: 'var(--s10)',
              gridTemplateColumns: 'minmax(140px,1fr) minmax(160px,1fr)'
                + ' minmax(110px,140px) minmax(120px,1fr) 90px 34px',
              alignItems: 'end',
              paddingBottom: 'var(--s10)',
              borderBottom: '1px solid var(--hr2)' }}>
              <Alan etiket="Kaynak alan" zorunlu>
                <input className="ab-gr" value={kural.kaynakAlan}
                  placeholder="device.serial"
                  onChange={(e) => kuralGuncelle(i, { kaynakAlan: e.target.value })} />
              </Alan>
              <Alan etiket="Hedef alan" zorunlu>
                <select className="ab-gr" value={kural.hedefAlan}
                  onChange={(e) => kuralGuncelle(i, { hedefAlan: e.target.value })}>
                  <option value="">Seçin…</option>
                  {sozluk.hedefAlanlar.map((a) => (
                    <option key={a.anahtar} value={a.anahtar}>
                      {a.etiket}{a.ozel ? ` · ${a.ozel}` : ''}
                    </option>
                  ))}
                </select>
              </Alan>
              <Alan etiket="Dönüşüm">
                <select className="ab-gr" value={kural.donusum}
                  onChange={(e) => kuralGuncelle(i, { donusum: e.target.value })}>
                  {sozluk.donusumler.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Alan>
              <Alan etiket="Varsayılan">
                <input className="ab-gr" value={kural.varsayilan}
                  placeholder="boş = varsayılan yok"
                  disabled={kural.zorunlu}
                  onChange={(e) => kuralGuncelle(i, { varsayilan: e.target.value })} />
              </Alan>
              <Alan etiket="Zorunlu">
                <input type="checkbox" checked={kural.zorunlu}
                  onChange={(e) => kuralGuncelle(i, {
                    zorunlu: e.target.checked,
                    // Zorunlu + varsayılan çelişkilidir: kaynak vermezse
                    // kayıt düşecekse varsayılanın anlamı kalmaz.
                    ...(e.target.checked ? { varsayilan: '' } : {}),
                  })} />
              </Alan>
              <button type="button" className="ab-dugme satir" aria-label="Kuralı sil"
                onClick={() => {
                  setKurallar((eski) => eski.filter((_, j) => j !== i));
                  setOnizleme(null);
                }}>✕</button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 'var(--s12)' }}>
          <Dugme onClick={() => setKurallar((e) => [...e, bosKural()])}>
            Kural ekle
          </Dugme>
        </div>

        <p className="ab-dip" style={{ marginTop: 'var(--s10)' }}>
          Hedef alan sözlüğü varlık aktarımıyla AYNI kaynaktan gelir
          ({sozluk.hedefAlanlar.length} alan): kullanıcı iki ekranda iki
          farklı alan listesi görmez. Kuralların anlam doğrulaması
          (çift hedef, sözlükte olmayan enum, zorunlu+varsayılan çelişkisi)
          önizlemede ve yayında SUNUCUDA yapılır.
        </p>
      </div>

      {/* ── önizleme ────────────────────────────────────────────────── */}
      <div className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s20)' }}>
        <p className="etiket" style={{ margin: 0 }}>Önizleme · prova</p>
        <p className="ab-dip" style={{ marginTop: 'var(--s8)' }}>
          Bu prova hiçbir şey YAZMAZ ve hiçbir dış sisteme BAĞLANMAZ. Girdi
          sizin yapıştırdığınız örnek kayıttır; çıktı &ldquo;bu kural bu kayda
          ne yapardı&rdquo; raporudur. Tek nesne ya da nesne dizisi (en çok 50)
          verin.
        </p>
        <div style={{ marginTop: 'var(--s12)' }}>
          <Alan etiket="Örnek kayıt (JSON)">
            <textarea className="ab-gr" rows={5} value={ornek}
              placeholder={'{"device": {"serial": "SN-1"}, "site": "SNT-A"}'}
              onChange={(e) => { setOrnek(e.target.value); setOnizleme(null); }} />
          </Alan>
        </div>
        <div style={{ marginTop: 'var(--s12)', display: 'flex',
          gap: 'var(--s12)', alignItems: 'center' }}>
          <Dugme tur="birincil" disabled={onizlemeEngeli !== ''}
            style={pasifStil(onizlemeEngeli !== '')} onClick={onizlemeCalistir}>
            {onizlemeKosuyor ? 'Önizleniyor…' : 'Önizle'}
          </Dugme>
          {onizlemeEngeli && <span className="ab-dip">{onizlemeEngeli}</span>}
        </div>

        {onizlemeHatasi && (
          <p role="alert" style={{ margin: 'var(--s12) 0 0',
            fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{onizlemeHatasi}</p>
        )}

        {onizleme && onizleme.sorunlar.length > 0 && (
          <div style={{ marginTop: 'var(--s14)' }}>
            <p className="etiket" style={{ margin: 0, color: 'var(--bd)' }}>
              Kural sorunları · yayın bunları REDDEDER
            </p>
            <ul style={{ margin: 'var(--s8) 0 0', paddingLeft: 'var(--s18)',
              fontSize: 'var(--t-field)', color: 'var(--i2)' }}>
              {onizleme.sorunlar.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}

        {onizleme && satirlar.length > 0 && (
          <div style={{ marginTop: 'var(--s16)' }}>
            <Tablo
              konuBasligi="Örnek kayıt"
              kolonlar={ONIZLEME_KOLONLARI}
              secili={secim ? String(secim.sira) : null}
              sec={(id) => setSeciliKayit(satirlar.findIndex((s) => String(s.sira) === id))}
              kuyruk={satirlar.length > gosterilen.length
                ? { metin: `Kalan ${satirlar.length - gosterilen.length} örnek kayıt`,
                  ac: () => setKuyrukAcik(true) }
                : null}
              dipNot={'Güven yalnız KAYNAKTAN gelen alanlardan hesaplanır;'
                + ' ölçülemiyorsa "ölçülmedi" yazar — sıfır güven DEĞİLDİR.'}
              satirlar={gosterilen.map((s) => {
                const alanlar = Object.values(s.uygulama.alanlar);
                const sayim = onizlemeSayimi(alanlar);
                return {
                  id: String(s.sira),
                  durum: onizlemeImi({
                    reddedildi: s.uygulama.reddedildi, sayim,
                    sorunSayisi: s.uygulama.sorunlar.length }),
                  konu: `Kayıt ${s.sira}`,
                  alt: s.uygulama.reddedildi
                    ? 'kaydın tümü düşer'
                    : `${s.uygulama.sorunlar.length} sorun`,
                  hucreler: [
                    sayim.kaynaktan,
                    sayim.varsayilandan,
                    sayim.bilinmeyen,
                    guvenYazisi(s.uygulama.guven),
                  ],
                };
              })}
            />

            {secim && (
              <div style={{ marginTop: 'var(--s16)' }}>
                <p className="etiket" style={{ margin: 0 }}>
                  Kayıt {secim.sira} · alan alan
                </p>
                <ul style={{ listStyle: 'none', margin: 'var(--s10) 0 0', padding: 0,
                  display: 'grid', gap: 'var(--s6)' }}>
                  {secimAlanlari.map((a) => (
                    <li key={a.hedefAlan} style={{ display: 'flex', gap: 'var(--s10)',
                      alignItems: 'baseline', fontSize: 'var(--t-code-lg)' }}>
                      <span style={{ fontWeight: 600, minWidth: 140 }}>{a.hedefAlan}</span>
                      <span style={{ fontFamily: 'var(--veri)',
                        color: a.kaynagi === 'kaynak' ? 'var(--i2)' : 'var(--unk)' }}>
                        {a.kaynagi === 'yok' ? '—' : String(a.deger)}
                      </span>
                      <span className="ab-dip" style={{ margin: 0 }}>
                        {KAYNAGI_SOZU[a.kaynagi] ?? a.kaynagi}
                        {a.not ? ` · ${a.not}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                {secim.uygulama.sorunlar.length > 0 && (
                  <ul style={{ margin: 'var(--s10) 0 0', paddingLeft: 'var(--s18)',
                    fontSize: 'var(--t-field)', color: 'var(--bd)' }}>
                    {secim.uygulama.sorunlar.map((s, i) => (
                      <li key={i}>
                        {s.etki === 'kayit' ? 'Kayıt düşer' : 'Alan boş kalır'} ·{' '}
                        {s.sebep}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── yayın ───────────────────────────────────────────────────── */}
      <div className="ab-blok" style={{ maxWidth: 'none', marginTop: 'var(--s20)' }}>
        <p className="etiket" style={{ margin: 0 }}>Yayın · yeni sürüm</p>
        <div style={{ marginTop: 'var(--s12)', display: 'flex',
          gap: 'var(--s16)', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', gap: 'var(--s8)', alignItems: 'center',
            fontSize: 'var(--t-field)' }}>
            <input type="checkbox" checked={etkinlestir}
              onChange={(e) => setEtkinlestir(e.target.checked)} />
            Etkinleştir (işaretsiz = taslak, koşuda kullanılmaz)
          </label>
          <Dugme tur="birincil" disabled={yayinEngeli !== ''}
            style={pasifStil(yayinEngeli !== '')} onClick={yayinla}>
            {yayinBekliyor ? 'Yayımlanıyor…' : 'Yeni sürüm yayımla'}
          </Dugme>
          {yayinEngeli && <span className="ab-dip">{yayinEngeli}</span>}
        </div>
        {yayinHatasi && (
          <p role="alert" style={{ margin: 'var(--s12) 0 0',
            fontSize: 'var(--t-field)', color: 'var(--bd)' }}>{yayinHatasi}</p>
        )}
        <p className="ab-dip" style={{ marginTop: 'var(--s12)' }}>
          Yayın denetim izine yazılır. Etkinleştirilen sürüm aynı kodun eski
          etkin sürümünü ARŞİVE alır — silmez: o sürümle yorumlanmış içe
          aktarımların kuralı okunabilir kalır.
        </p>
      </div>
    </section>
  );
}
