'use client';
import { useState } from 'react';
import { Alan, Dugme, Im } from '@/components/kabuk/temel';
import { useEylem } from '@/components/useEylem';
import { profilKaydet } from '@/lib/eylemler2/tesis360';
import { tarihTR } from '@/lib/sabitler';
import {
  PROFIL_GRUPLARI, formVarsayilani, formdanGirdi, profilSatirlari, tanimsizSayisi,
  type OtProfili as OtProfilKaydi, type ProfilAlani, type ProfilFormu,
} from './mantik';

/* F3 · Plant 360 — OT MİMARİ PROFİLİ bloğu (B6/B9).

   `TesisProfili` uygulanabilirlik motorunun girdisidir; /uyum ekranı
   "santral profili eksik — karar Plant 360'tan tamamlanır" diyordu ama
   Plant 360'ta form YOKTU ve yalnız kritiklik sınıfı okunuyordu. Bu blok
   profilin tamamını satır satır gösterir, yetkisi olana düzenletir.

   Sözleşme:
     · boş alan BOŞ BIRAKILMAZ, "tanımsız" sözcüğüyle ve unk işaretiyle
       yazılır — bilinmeyen ≠ yok;
     · üç durumlu alan üç seçenektir (bilinmiyor / var / yok); formda
       "bilinmiyor" seçmek null yazar, "yok" false yazar;
     · kayıt `profilKaydet` (yetkiZorunlu tanimlar/yazma, iz, revalidate).
       Uygulanabilirlik kapsamı KENDİLİĞİNDEN yeniden hesaplanmaz; bunu
       `kapsamYenidenHesapla` ile insan tetikler (bu blokta düğme yok:
       hangi santralde motorun koşacağına o karar süreci karar verir). */

export default function OtProfili({ tesisId, profil, duzenlenebilir }: {
  tesisId: string;
  /** null = profil kaydı hiç açılmamış — tüm alanlar tanımsız */
  profil: OtProfilKaydi | null;
  duzenlenebilir: boolean;
}) {
  const [acik, setAcik] = useState(false);
  const gruplar = profilSatirlari(profil);
  const sayim = tanimsizSayisi(profil);

  return (
    <section className="ab-otprofil-blok" aria-labelledby="otprofil-baslik">
      <header>
        <span id="otprofil-baslik" className="etiket">OT mimari profili · uygulanabilirlik girdisi</span>
        <span className="mono etiket sag">
          {sayim.tanimsiz === 0
            ? `${sayim.toplam} alanın tamamı tanımlı`
            : `${sayim.tanimsiz}/${sayim.toplam} alan tanımsız`}
          {' · '}
          {profil?.guncellendi
            ? `güncellendi ${tarihTR(profil.guncellendi)}`
            : 'profil kaydı hiç açılmadı'}
        </span>
      </header>

      {acik && duzenlenebilir ? (
        <ProfilFormu tesisId={tesisId} profil={profil} kapat={() => setAcik(false)} />
      ) : (
        <>
          {/* Grup adı <dl>'nin DIŞINDA: dl yalnız dt/dd grupları içerir
              (axe definition-list, 5 ihlal ölçüldü 2026-09). */}
          <div className="ab-otprofil-gruplar">
            {gruplar.map((g) => (
              <section key={g.ad} className="ab-otprofil-grup" aria-label={g.ad}>
                <span className="mono grupad" aria-hidden>{g.ad}</span>
                <dl className="liste">
                  {g.satirlar.map((s) => (
                    <div key={s.anahtar} className={`satir${s.tanimsiz ? ' tanimsiz' : ''}`}>
                      <dt>{s.etiket}</dt>
                      <dd className="mono">
                        {s.tanimsiz && <Im durum="unk" ad="Tanımsız" />}
                        {s.deger}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
          <p className="ab-otprofil-dip">
            {duzenlenebilir
              ? 'Tanımsız alan motorun o kuralı "bilinmiyor" olarak bırakması demektir;'
                + ' tamamlanınca kapsam yeniden hesaplanabilir.'
              : 'Profili tanımlar yazma yetkisi olan kullanıcı düzenler.'}
            {duzenlenebilir && (
              <Dugme tur="satir" onClick={() => setAcik(true)}
                style={{ marginLeft: 'var(--s12)' }}>
                Profili düzenle
              </Dugme>
            )}
          </p>
        </>
      )}
    </section>
  );
}

/* ═══ Form ═══════════════════════════════════════════════════════════ */

function ProfilFormu({ tesisId, profil, kapat }: {
  tesisId: string; profil: OtProfilKaydi | null; kapat: () => void;
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [form, setForm] = useState<ProfilFormu>(() => formVarsayilani(profil));
  const yaz = (anahtar: ProfilAlani['anahtar'], deger: string) =>
    setForm((f) => ({ ...f, [anahtar]: deger }));

  return (
    <form className="ab-otprofil-form"
      onSubmit={(e) => {
        e.preventDefault();
        calistir(() => profilKaydet(formdanGirdi(tesisId, form)), kapat);
      }}>
      <div className="ab-otprofil-gruplar">
        {PROFIL_GRUPLARI.map((g) => (
          <fieldset key={g.ad} className="ab-otprofil-grup">
            <legend className="mono grupad">{g.ad}</legend>
            {g.alanlar.map((a) => (
              <Alan key={a.anahtar} etiket={a.etiket}>
                <Girdi alan={a} deger={form[a.anahtar]} yaz={(v) => yaz(a.anahtar, v)} />
              </Alan>
            ))}
          </fieldset>
        ))}
      </div>

      {hata && <p className="ab-gr-hata" role="alert">{hata}</p>}

      <div className="ab-otprofil-eylem">
        <Dugme tur="birincil" type="submit" disabled={bekliyor}>
          {bekliyor ? 'Kaydediliyor…' : 'Profili kaydet'}
        </Dugme>
        <Dugme onClick={kapat} disabled={bekliyor}>Vazgeç</Dugme>
        <span className="mono dip">
          Boş bırakılan alan &quot;bilinmiyor&quot; olarak saklanır; kayıt denetim izine düşer.
        </span>
      </div>
    </form>
  );
}

/** Alan türüne göre giriş. Üç durumlu alan ÜÇ seçenektir — iki değil. */
function Girdi({ alan, deger, yaz }: {
  alan: ProfilAlani; deger: string; yaz: (v: string) => void;
}) {
  switch (alan.tur) {
    case 'ucDurum':
      return (
        <select className="ab-gr" value={deger} onChange={(e) => yaz(e.target.value)}>
          <option value="">bilinmiyor</option>
          <option value="evet">var</option>
          <option value="hayir">yok</option>
        </select>
      );
    case 'secim':
      return (
        <select className="ab-gr" value={deger} onChange={(e) => yaz(e.target.value)}>
          <option value="">bilinmiyor</option>
          {alan.secenekler?.map((s) => <option key={s.deger} value={s.deger}>{s.ad}</option>)}
        </select>
      );
    case 'tarih':
      return <input className="ab-gr" type="date" value={deger} onChange={(e) => yaz(e.target.value)} />;
    case 'liste':
      return (
        <input className="ab-gr" value={deger} onChange={(e) => yaz(e.target.value)}
          placeholder="virgülle ayırın — ör. Siemens S7, ABB AC800M" />
      );
    default:
      return <input className="ab-gr" value={deger} onChange={(e) => yaz(e.target.value)} />;
  }
}
