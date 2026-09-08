'use client';
import { useSektorSecimi } from '@/lib/dil/SozlukSaglayici';

/* ═══════════════════════════════════════════════════════════════════════
   SEKTÖR MERCEĞİ — kabuk hangi sektörün sözcüğünü konuşsun

   ── NİÇİN BİR SEÇİCİ ──────────────────────────────────────────────────
   Kapsamda birden çok sektör varsa sunucu sözlük SEÇEMEZ: birini seçmek
   portföyün öbür yarısı için yalan olur, o yüzden çekirdek sözcüğe
   düşülür ("tesis"). Bu doğru ama EKSİK bir cevaptır — kullanıcı hangi
   merceğe baktığını söyleyebilir. Karar ürünün değil kullanıcınındır;
   bu bileşen o kararı görünür kılar.

   ── NİÇİN DÜĞME ŞERİDİ, AÇILIR LİSTE DEĞİL ────────────────────────────
   İki-üç seçenekte açılır liste bir tıklamayı ikiye çıkarır ve seçenekleri
   GİZLER. Şeritte kaç mercek olduğu ve hangisinin etkin olduğu tek
   bakışta okunur. Seçenek sayısı artarsa (dört ve üstü) bu karar yeniden
   verilmeli.

   ── DURUM YALNIZ RENKLE ANLATILMAZ ────────────────────────────────────
   Etkin seçenek `aria-pressed` taşır ve altında bir çizgi kazanır; renk
   körü bir kullanıcı için renk tek başına ayırt edici değildir (WCAG
   1.4.1).

   ── "ÇEKİRDEK" NEDEN BİR SEÇENEK ──────────────────────────────────────
   Mercek kaldırılabilir olmalı: ürünün sektörsüz hâli — hiçbir sektör
   paketi kurulu olmayan kiracının gördüğü ekran — satışta gösterilmeye
   değer bir durumdur ve ürünün çekirdeğinin gerçekten sektörsüz olduğunu
   kanıtlar. Seçenek "sektör yok" demez, ÇEKİRDEK der: bu bir eksiklik
   değil, bir katmandır.
   ═══════════════════════════════════════════════════════════════════════ */

export default function SektorMercegi() {
  const { secenekler, etkinId, sec } = useSektorSecimi();

  /* Tek sektörlü kurulumda seçilecek bir şey YOKTUR: tek seçenekli bir
     şerit, kullanıcıya karar veriyormuş hissi veren ölü bir kontroldür. */
  if (secenekler.length < 2) return null;

  return (
    <>
      {/* GENİŞ BANT — şerit. */}
      <div className="ab-mercek" role="group" aria-label="Sektör merceği">
        <span className="etiket" aria-hidden>Sektör</span>
        <button type="button" aria-pressed={etkinId === null}
          onClick={() => sec(null)}
          title="Sektör paketi kurulu olmayan kiracının gördüğü sözcükler">
          Çekirdek
        </button>
        {secenekler.map((s) => (
          <button key={s.id} type="button" aria-pressed={etkinId === s.id}
            onClick={() => sec(s.id)}>
            {s.ad}
          </button>
        ))}
      </div>

      {/* ── DAR BANT — AYNI KARAR, DAHA DAR KONTROL ─────────────────────
          ÖLÇÜLDÜ (8 Eyl 2026): şerit üst çubuğa eklendiğinde sağ küme
          757px'e çıktı ve çubuk 1366'da 1395px, 1280'de 1367px oldu —
          hesap düğmesi ekran dışında kaldı. `kabuk.css` bu sınıfı zaten
          yazılı olarak uyarıyordu ("sağ küme hiçbir genişlikte düşmez";
          eski A çubuğunda 1366'da 181px taşımıştı) ve kural yeniden
          çiğnendi.

          Mercek GİZLENMEZ, DARALIR: seçenekleri gizlemek dar ekranı
          kullanan birinin ürünün en ayırt edici yeteneğini hiç
          görmemesi demekti. `<select>` bir tıklama daha ister ama
          kontrolü erişilebilir ve dokunulabilir tutar.

          İkiz DOM'un maliyeti yok: `display:none` öğeyi erişilebilirlik
          ağacından da çıkarır, iki etiket aynı anda okunmaz. */}
      <div className="ab-mercek-dar">
        <label htmlFor="sektor-mercegi" className="etiket">Sektör</label>
        <select id="sektor-mercegi" value={etkinId ?? ''}
          onChange={(e) => sec(e.target.value === '' ? null : e.target.value)}>
          <option value="">Çekirdek</option>
          {secenekler.map((s) => <option key={s.id} value={s.id}>{s.ad}</option>)}
        </select>
      </div>
    </>
  );
}
