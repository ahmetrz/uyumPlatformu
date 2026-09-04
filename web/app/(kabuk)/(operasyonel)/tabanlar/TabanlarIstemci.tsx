'use client';
import { useMemo, useState } from 'react';
import { useUrlDurumu, useUrlDurumuBos } from '@/components/kabuk/urlDurumu';
import Link from 'next/link';
import { Alan, BosIlk, BosFiltre, Dugme } from '@/components/kabuk/temel';
import { Tablo, type Kolon } from '@/components/kabuk/tablo';
import { EkranBasligi, Filtreler } from '@/components/kabuk/ekran';
import {
  Cekmece, CekmeceAlanlar, CekmeceKimlik,
} from '@/components/kabuk/panel';
import { useEylem } from '@/components/useEylem';
import { advisoryIceAktar, firmwareTemeliKaydet } from '@/lib/eylemler2/varlikDurusu';
import { surumCozumle } from '@/lib/alan/surum';
import { tarihTR } from '@/lib/sabitler';
import {
  bagliCihaz, kapsamSozu, kotuListesi, tabanImi, tabanSozu,
  type DuyuruOzeti, type TabanSatiri,
} from './mantik';

/* ═══ O13b · Firmware tabanları ════════════════════════════════════════

   Ekranın sorduğu soru: "hangi sürüm onaylı ve kaç cihaz o sürümde
   değil?" Cevabı ekran değil motor verir; burada yalnız TABAN tanımlanır.

   ── ÜÇ SAYAÇ, ÜÇ AYRI ANLAM ──────────────────────────────────────────
   `uyumlu` bir başarıdır, `eski`/`bilinen kötü` bir açıktır,
   `karar verilemedi` bir ÖLÇÜM BORCUDUR. Üçünü tek bir "sorunlu" sayacına
   toplamak, çözümü birbirinden tamamen farklı iki durumu aynı kutuya
   koyardı: biri yükseltme işi, öteki veri işi.

   Tabana hiç bağlanmayan cihaz sayısı ekranın başlığındadır: taban yoksa
   firmware kararı da yoktur ve bu sessizce "sorunsuz" görünemez. */

const KOLONLAR: Kolon[] = [
  { baslik: 'Onaylı sürüm', genislik: '130px' },
  { baslik: 'Uyumlu', genislik: '78px', sag: true },
  { baslik: 'Eski', genislik: '68px', sag: true },
  { baslik: 'Bilinen kötü', genislik: '104px', sag: true },
  { baslik: 'Karar yok', genislik: '92px', sag: true, ikincil: true },
];

const MERCEKLER = [
  { id: 'hepsi', ad: 'Tümü' },
  { id: 'acik', ad: 'Açığı olan' },
  { id: 'borc', ad: 'Karar verilemeyen' },
  { id: 'uygulanmamis', ad: 'Hiç uygulanmamış' },
  { id: 'pasif', ad: 'Pasif' },
];

type Form = {
  id?: string; turId: string; uretici: string; model: string;
  onayliSurum: string; asgariSurum: string; hedefSurum: string;
  bilinenKotuSurumler: string; advisoryReferansi: string;
  aciklama: string; aktif: boolean;
};

const BOS: Form = {
  turId: '', uretici: '', model: '', onayliSurum: '', asgariSurum: '',
  hedefSurum: '', bilinenKotuSurumler: '', advisoryReferansi: '',
  aciklama: '', aktif: true,
};

function formdan(t: TabanSatiri): Form {
  return {
    id: t.id, turId: t.turId ?? '', uretici: t.uretici ?? '', model: t.model ?? '',
    onayliSurum: t.onayliSurum, asgariSurum: t.asgariSurum ?? '',
    hedefSurum: t.hedefSurum ?? '', bilinenKotuSurumler: t.bilenenKotu ?? '',
    advisoryReferansi: t.advisoryReferansi ?? '', aciklama: t.aciklama ?? '',
    aktif: t.aktif,
  };
}

function mercekten(t: TabanSatiri, m: string): boolean {
  if (m === 'acik') return t.eski > 0 || t.bilinenKotu > 0;
  if (m === 'borc') return t.kararVerilemedi > 0;
  if (m === 'uygulanmamis') return bagliCihaz(t) === 0;
  if (m === 'pasif') return !t.aktif;
  return true;
}

function TabanFormu({ f, setF, turler, kapat }: {
  f: Form; setF: (f: Form) => void;
  turler: { id: string; ad: string }[];
  kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();

  /* Sürüm ön izlemesi: sunucu da aynı denetimi yapar ve son sözü o söyler
     (`firmwareTemeliKaydet` çözümlenemeyen sürümü yazmaz). Buradaki uyarı
     formu erken kapatmak için, kapı olmak için değil. */
  const cozulmez = ([
    ['Onaylı sürüm', f.onayliSurum],
    ['Asgari sürüm', f.asgariSurum],
    ['Hedef sürüm', f.hedefSurum],
  ] as const).filter(([, d]) => d.trim() && !surumCozumle(d)).map(([ad]) => ad);

  const boyutVar = !!f.turId || !!f.uretici.trim() || !!f.model.trim();
  const gecerli = !!f.onayliSurum.trim() && cozulmez.length === 0 && boyutVar;

  return (
    <div style={{ display: 'grid', gap: 'var(--s16)' }}>
      <p className="ab-dip" style={{ margin: 0 }}>
        Taban en az bir boyuta bağlanmalı: tür, üretici ya da model. Boyutu
        olmayan taban her cihaza uyar ve hiçbir şey söylemez.
      </p>
      <Alan etiket="Varlık türü">
        <select className="ab-gr" value={f.turId}
          onChange={(e) => setF({ ...f, turId: e.target.value })}>
          <option value="">— tür bağlama —</option>
          {turler.map((t) => <option key={t.id} value={t.id}>{t.ad}</option>)}
        </select>
      </Alan>
      <Alan etiket="Üretici">
        <input className="ab-gr" value={f.uretici}
          onChange={(e) => setF({ ...f, uretici: e.target.value })} />
      </Alan>
      <Alan etiket="Model">
        <input className="ab-gr" value={f.model}
          onChange={(e) => setF({ ...f, model: e.target.value })} />
      </Alan>
      <Alan etiket="Onaylı sürüm" zorunlu
        hata={cozulmez.includes('Onaylı sürüm') ? 'Sürüm çözümlenemedi.' : null}>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          value={f.onayliSurum} onChange={(e) => setF({ ...f, onayliSurum: e.target.value })} />
      </Alan>
      <Alan etiket="Asgari kabul edilebilir sürüm (boş = yalnız onaylı sürüm)"
        hata={cozulmez.includes('Asgari sürüm') ? 'Sürüm çözümlenemedi.' : null}>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          value={f.asgariSurum} onChange={(e) => setF({ ...f, asgariSurum: e.target.value })} />
      </Alan>
      <Alan etiket="Hedef sürüm (bilgi; karara girmez)"
        hata={cozulmez.includes('Hedef sürüm') ? 'Sürüm çözümlenemedi.' : null}>
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          value={f.hedefSurum} onChange={(e) => setF({ ...f, hedefSurum: e.target.value })} />
      </Alan>
      <Alan etiket="Bilinen kötü sürümler (virgülle ayırın)">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          placeholder="2.8.1, 2.8.2" value={f.bilinenKotuSurumler}
          onChange={(e) => setF({ ...f, bilinenKotuSurumler: e.target.value })} />
      </Alan>
      <Alan etiket="Advisory referansı">
        <input className="ab-gr" style={{ fontFamily: 'var(--veri)' }}
          value={f.advisoryReferansi}
          onChange={(e) => setF({ ...f, advisoryReferansi: e.target.value })} />
      </Alan>
      <Alan etiket="Açıklama">
        <textarea className="ab-gr" rows={2} value={f.aciklama}
          onChange={(e) => setF({ ...f, aciklama: e.target.value })} />
      </Alan>
      <Alan etiket="Durum">
        <select className="ab-gr" value={f.aktif ? 'aktif' : 'pasif'}
          onChange={(e) => setF({ ...f, aktif: e.target.value === 'aktif' })}>
          <option value="aktif">Aktif — motor bu tabanı kullanır</option>
          <option value="pasif">Pasif — kayıt durur, karar üretmez</option>
        </select>
      </Alan>
      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
      <div style={{ display: 'flex', gap: 'var(--s12)' }}>
        <Dugme tur="birincil" disabled={bekliyor || !gecerli}
          onClick={() => calistir(() => firmwareTemeliKaydet({
            id: f.id,
            turId: f.turId || null,
            uretici: f.uretici || null, model: f.model || null,
            onayliSurum: f.onayliSurum,
            asgariSurum: f.asgariSurum || null, hedefSurum: f.hedefSurum || null,
            bilinenKotuSurumler: f.bilinenKotuSurumler || null,
            advisoryReferansi: f.advisoryReferansi || null,
            aciklama: f.aciklama || null, aktif: f.aktif,
          }), kapat)}>
          {f.id ? 'Kaydet' : 'Taban oluştur'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
      </div>
      <p className="ab-dip" style={{ margin: 0 }}>
        Kaydetmek kararı ANINDA değiştirmez: uyum sonuçları firmware
        motorunun bir sonraki koşusunda güncellenir.
      </p>
    </div>
  );
}

/* ── OT-25 · Duyuru içe aktarımı ──────────────────────────────────────
   Ürün HİÇBİR duyuru akışına bağlanmaz ve bağlanmış gibi de yapmaz:
   ICS-CERT / üretici PSIRT / NVD bağlantısı bir dış bağımlılıktır.
   Buradan insanın indirdiği belge yüklenir, kaynağı da kayda geçer.

   Korelasyonu bu form HESAPLAMAZ; duyuru yazılır ve zafiyet korelasyon
   motoru bir sonraki koşusunda hangi cihazın etkilendiğini bulur. */
function DuyuruPaneli({ duyuru, yazabilir }: {
  duyuru: DuyuruOzeti; yazabilir: boolean;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [acik, setAcik] = useState(false);
  const [icerik, setIcerik] = useState('');
  const [kaynak, setKaynak] = useState('');
  const [ozet, setOzet] = useState<string | null>(null);
  const gecerli = icerik.trim().length > 0 && !!kaynak.trim();

  async function dosyadanOku(d: File) { setIcerik(await d.text()); }

  return (
    <section className="ab-blok">
      <p className="etiket">Güvenlik duyuruları (OT-25)</p>
      <dl className="ab-panel-ciftler">
        <div><dt>Duyuru</dt><dd>{duyuru.toplam}</dd></div>
        <div><dt>Ürün / sürüm aralığı</dt><dd>{duyuru.urun}</dd></div>
        <div>
          <dt>Etkilenen bulunan</dt>
          <dd className={duyuru.etkilenen > 0 ? 'd-bd' : undefined}>{duyuru.etkilenen}</dd>
        </div>
        <div>
          <dt>Karar verilemeyen</dt>
          <dd className={duyuru.kararVerilemedi > 0 ? 'd-unk' : undefined}>
            {duyuru.kararVerilemedi}
          </dd>
        </div>
        <div>
          <dt>Son yüklenen</dt>
          <dd className={duyuru.sonReferans ? undefined : 'd-unk'}>
            {duyuru.sonReferans
              ? `${duyuru.sonReferans}${duyuru.sonZaman ? ` · ${tarihTR(duyuru.sonZaman)}` : ''}`
              : 'hiç duyuru yüklenmedi'}
          </dd>
        </div>
      </dl>
      <p className="ab-dip">
        Bu ürün ICS-CERT, üretici PSIRT ya da NVD akışına BAĞLANMAZ.
        Duyurular elle indirilip buradan yüklenir; korelasyonu zafiyet
        korelasyon motoru hesaplar.
      </p>

      {yazabilir && (
        <>
          <Dugme onClick={() => { setAcik(!acik); setOzet(null); }}>
            {acik ? 'Formu kapat' : 'Duyuru belgesi yükle'}
          </Dugme>
          {acik && (
            <div style={{ display: 'grid', gap: 'var(--s12)', marginTop: 'var(--s12)' }}>
              <Alan etiket="Kaynak sistem / belge kaynağı">
                <input className="ab-gr" value={kaynak}
                  onChange={(e) => setKaynak(e.target.value)} />
              </Alan>
              <Alan etiket="Belge dosyası (JSON)">
                <input className="ab-gr" type="file" accept=".json,application/json"
                  onChange={(e) => {
                    const d = e.target.files?.[0];
                    if (d) void dosyadanOku(d);
                  }} />
              </Alan>
              <Alan etiket="Belge içeriği">
                <textarea className="ab-gr" rows={4} value={icerik}
                  style={{ fontFamily: 'var(--veri)' }}
                  onChange={(e) => setIcerik(e.target.value)} />
              </Alan>
              {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}
              {ozet && <p className="ab-dip" style={{ margin: 0 }}>{ozet}</p>}
              <Dugme tur="birincil" disabled={bekliyor || !gecerli}
                onClick={() => calistir(async () => {
                  const s = await advisoryIceAktar({ icerik, kaynakSistem: kaynak });
                  if (s.ok && s.ozet) {
                    /* Reddedilen satır ve eşleşmeyen CVE SESSİZCE
                       düşürülmez: yükleme "başarılı" görünürken kaç
                       kaydın alınamadığı gizli kalırdı. */
                    setOzet(
                      `${s.ozet.duyuru} duyuru · ${s.ozet.urun} ürün satırı · `
                      + `${s.ozet.cve} CVE bağlandı · `
                      + `${s.ozet.eslesmeyenCve} CVE envanterde yok · `
                      + `${s.ozet.red} satır okunamadı.`,
                    );
                  }
                  return s;
                }, () => setIcerik(''))}>
                Duyuruları yükle
              </Dugme>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function TabanlarIstemci({
  tabanlar, turler, tabansizCihaz, yazabilir, duyuru,
}: {
  tabanlar: TabanSatiri[];
  turler: { id: string; ad: string }[];
  /** hiçbir tabana bağlanamayan, kararı verilememiş cihaz sayısı */
  tabansizCihaz: number;
  /** taban tanımı ve duyuru içe aktarımı `tanimlar/onay` ister */
  yazabilir: boolean;
  duyuru: DuyuruOzeti;
}) {
  const [mercek, setMercek] = useUrlDurumu<string>('mercek', 'hepsi');
  const [secili, setSecili] = useUrlDurumuBos('taban');
  const [yeni, setYeni] = useState<Form | null>(null);
  const [duzenle, setDuzenle] = useState<Form | null>(null);

  const suzulmus = useMemo(
    () => tabanlar.filter((t) => mercekten(t, mercek)), [tabanlar, mercek],
  );
  const taban = tabanlar.find((t) => t.id === secili) ?? null;

  const acik = tabanlar.reduce((s, t) => s + t.eski + t.bilinenKotu, 0);
  const borc = tabanlar.reduce((s, t) => s + t.kararVerilemedi, 0);
  const aktifSayisi = tabanlar.filter((t) => t.aktif).length;

  return (
    <>
      <main className="ab-icerik">
        <EkranBasligi
          eyebrow="Varlık · Yaşam döngüsü · firmware tabanı"
          vurgu={String(acik)}
          vurguDurumu={acik > 0 ? 'bd' : 'ok'}
          baslik="cihaz onaylı firmware sürümünde değil"
          metrikler={[
            { deger: aktifSayisi, payda: tabanlar.length, yazi: 'aktif taban' },
            {
              deger: borc, yazi: 'karar verilemedi',
              durum: borc > 0 ? 'unk' : undefined,
            },
            {
              deger: tabansizCihaz, yazi: 'cihaz tabansız',
              durum: tabansizCihaz > 0 ? 'unk' : undefined,
            },
          ]}
          sag={yazabilir
            ? (
              <Dugme onClick={() => setYeni(yeni ? null : { ...BOS })}>
                {yeni ? 'Formu kapat' : 'Yeni taban'}
              </Dugme>
            )
            : <span className="etiket">Taban tanımı tanımlar onay yetkisi ister</span>}
        />

        <section className="ab-blok">
          <p className="ab-dip" style={{ marginTop: 0 }}>
            Taban bir KARARDIR, bir ölçüm değil: cihazdaki sürümü keşif
            getirir, onaylı sürümü insan belirler. Uyum sonucunu firmware
            motoru hesaplar ve <Link href="/saglik">Sağlık</Link> ekranından
            tetiklenir; cihaz bazlı sonuç{' '}
            <Link href="/envanter">Envanter</Link> çekmecesinin Duruş
            sekmesindedir.
          </p>

          {yeni && (
            <div style={{ marginBottom: 'var(--s18)' }}>
              <TabanFormu f={yeni} setF={setYeni} turler={turler}
                kapat={() => setYeni(null)} />
            </div>
          )}

          {tabanlar.length === 0 ? (
            <BosIlk cumle={'Hiç firmware tabanı tanımlanmamış. Taban olmadan '
              + 'hiçbir cihazın firmware kararı verilemez; ekran bunu "uyumlu" '
              + 'değil "karar verilemedi" sayar.'} />
          ) : suzulmus.length === 0 ? (
            <BosFiltre temizle={() => setMercek('hepsi')} />
          ) : (
            <>
              <Filtreler secenekler={MERCEKLER} aktif={mercek} sec={setMercek} />
              <Tablo
                konuBasligi="Taban"
                kolonlar={KOLONLAR}
                secili={secili}
                sec={(id) => setSecili(id === secili ? null : id)}
                dipNot={`${suzulmus.length} taban gösteriliyor.`
                  + ' "Karar yok" bir açık değil, bir ölçüm borcudur.'}
                satirlar={suzulmus.map((t) => ({
                  id: t.id,
                  durum: tabanImi(t),
                  kenar: tabanImi(t),
                  konu: kapsamSozu(t),
                  alt: tabanSozu(t),
                  hucreler: [
                    <span key="s" style={{ fontFamily: 'var(--veri)' }}>{t.onayliSurum}</span>,
                    t.uyumlu,
                    <span key="e" style={t.eski > 0 ? { color: 'var(--md)' } : undefined}>
                      {t.eski}
                    </span>,
                    <span key="k" style={t.bilinenKotu > 0 ? { color: 'var(--bd)' } : undefined}>
                      {t.bilinenKotu}
                    </span>,
                    <span key="b" style={t.kararVerilemedi > 0 ? { color: 'var(--unk)' } : undefined}>
                      {t.kararVerilemedi}
                    </span>,
                  ],
                }))}
              />
            </>
          )}
        </section>

        <DuyuruPaneli duyuru={duyuru} yazabilir={yazabilir} />
      </main>

      {taban && (
        <Cekmece kod={taban.onayliSurum} ad="Firmware tabanı"
          kapat={() => { setSecili(null); setDuzenle(null); }}>
          <CekmeceKimlik
            durum={tabanImi(taban)}
            soz={tabanSozu(taban)}
            baslik={kapsamSozu(taban)}
            cumle={taban.aciklama ?? undefined}
          />
          <CekmeceAlanlar alanlar={[
            { etiket: 'Onaylı sürüm', deger: <span className="mono">{taban.onayliSurum}</span> },
            {
              etiket: 'Asgari sürüm',
              deger: taban.asgariSurum ?? 'yalnız onaylı sürüm',
              durum: taban.asgariSurum ? undefined : 'unk',
            },
            {
              etiket: 'Hedef sürüm', deger: taban.hedefSurum ?? 'planlanmadı',
              durum: taban.hedefSurum ? undefined : 'unk',
            },
            {
              etiket: 'Advisory', deger: taban.advisoryReferansi ?? 'bağlanmadı',
              durum: taban.advisoryReferansi ? undefined : 'unk',
            },
            { etiket: 'Bağlı cihaz', deger: String(bagliCihaz(taban)) },
            { etiket: 'Son güncelleme', deger: tarihTR(taban.guncellendi) },
          ]} />

          {kotuListesi(taban.bilenenKotu).length > 0 ? (
            <div className="ab-panel-blok">
              <p className="etiket">Bilinen kötü sürümler</p>
              <p className="mono">{kotuListesi(taban.bilenenKotu).join(' · ')}</p>
              <p className="ab-panel-dip">
                Bu sürümler asgari sürüm testinden GEÇSE BİLE uyumsuz sayılır;
                motor bilinen kötü listesini önce sorar.
              </p>
            </div>
          ) : (
            <div className="ab-panel-blok">
              <p className="ab-panel-dip" style={{ margin: 0 }}>
                Bilinen kötü sürüm bildirilmedi — bu &quot;kötü sürüm yok&quot;
                demek değildir, bildirilmedi demektir.
              </p>
            </div>
          )}

          {taban.kararVerilemedi > 0 && (
            <div className="ab-panel-blok">
              <p className="ab-panel-dip" style={{ margin: 0 }}>
                {taban.kararVerilemedi} cihazda karar verilemedi: cihazın
                firmware sürümü okunmamış ya da çözümlenemeyen bir biçimde.
                Bu bir uyumsuzluk değil, bir ölçüm borcudur.
              </p>
            </div>
          )}

          {yazabilir && (
            duzenle ? (
              <TabanFormu f={duzenle} setF={setDuzenle} turler={turler}
                kapat={() => setDuzenle(null)} />
            ) : (
              <Dugme tur="tam" onClick={() => setDuzenle(formdan(taban))}>
                Tabanı düzenle
              </Dugme>
            )
          )}
        </Cekmece>
      )}
    </>
  );
}
