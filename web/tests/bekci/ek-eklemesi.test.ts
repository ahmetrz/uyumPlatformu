import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { taranacakDosyalar } from './terimler';

/* ═══════════════════════════════════════════════════════════════════════
   EK EKLEME BEKÇİSİ — sözlük terimine Türkçe eki EL İLE eklenemez

   ── ÖLÇÜLMÜŞ KUSUR ────────────────────────────────────────────────────
   P1 · Aşama E'nin son partisinde ÜÇ yer bulundu. İlk ikisi elle:

     lib/varlik/pasifKesif.ts   `${tBas(sozluk, 'tesis')}siz kayıt …`
     app/…/envanter/…Istemci    `${tesissiz} ${terim('tesis')}siz`

   Üçüncüsünü bu bekçinin kendisi buldu — ilk koşusunda:

     app/(tam)/portfoy/Portfoy.tsx   `${terim('tesis', 'cogul')}de`

   Üçüncüsü kuralın niçin kalıcı olduğunu gösteriyor: elle bakan gözün
   iki örneği bulup üçüncüsünü kaçırdığı ilk turda ölçüldü.

   Hepsi çekirdek sözlükte `tesis` olduğu için DOĞRU görünüyordu. Sektör
   paketi başka bir sözcük verdiği anda cümle bozulur, çünkü EKLER ÜNLÜ
   UYUMUNA GÖRE DEĞİŞİR ve son sesin ünlü olup olmamasına bakar:

     terim      elle eklenen   doğru
     tesis      tesissiz       tesissiz     ✓ (tesadüf)
     saha       sahasiz        sahasız      ✗
     ünite      ünitesiz       ünitesiz     ✓ (tesadüf)
     ocak       ocaksiz        ocaksız      ✗
     şube       şubesiz        şubesiz      ✓ (tesadüf)
     istasyon   istasyonsiz    istasyonsuz  ✗

   Doğru olduğu üç satır tesadüftür: `i`/`e` ile biten sözcükler `-siz`
   alır. Bu yüzden kusur ekranda "çoğu zaman doğru" görünür ve gözden
   kaçar — tam da bekçilik gereken sınıf.

   ── KURAL ─────────────────────────────────────────────────────────────
   Sözlük ALTI hâl verir (`tekil · çoğul · iyelik · belirtme · bulunma ·
   yönelme`). Sözlükte OLMAYAN bir hâl gerekiyorsa (`-siz` yoksunluk,
   `-den` ayrılma) cümle VAR OLAN hâllerle YENİDEN YAZILIR; ek elle
   eklenmez. `lib/dil/terimler.ts` başlığı bu kuralı anlatır; bu dosya
   onu ölçer.

   ── NİÇİN TAVAN SIFIR ─────────────────────────────────────────────────
   Bu bir borç kütüğü değil: bugün depoda sıfır örnek var ve bir tanesi
   bile doğru olamaz. Sözlükte bir hâl eksikse çözüm eki eklemek değil,
   `Bicim`e o hâli eklemek ya da cümleyi yeniden yazmaktır.
   ═══════════════════════════════════════════════════════════════════════ */

/* Sözlükten gelen bir değeri üreten ifadeler. `t(` yalnız başına çok
   geniş olurdu (`t(x)` herhangi bir işlev olabilir) — sözlük çağrıları
   her zaman bir terim anahtarı dizesi taşıdığı için kalıp anahtarı da
   arar. Alan erişimleri (`.tekil` …) `Terim` tipinden başka yerde
   geçmez, onlar tek başına yeterlidir. */
const SOZLUK_IFADESI = new RegExp(
  '(?:'
  + '\\b(?:t|tBas|terim)\\s*\\([^{}]*?\'(?:tesis|birim|sistem|varlik|portfoy|tesis360)\''
  + '|\\.(?:tekil|cogul|iyelik|belirtme|bulunma|yonelme)\\b'
  + ')',
);

/** `${ … sözlük … }` hemen ardından KÜÇÜK harf geliyorsa ek eklenmiştir.
    Büyük harf ya da boşluk/noktalama sorun değil: `${terim(…)} Bağı`
    ayrı bir sözcüktür, `${terim(…)}siz` ekleme. */
const EK_KALIBI = /\$\{([^{}]*)\}(?=\p{Ll})/gu;

function ekEklemeleri(metin: string): string[] {
  const bulunan: string[] = [];
  for (const m of metin.matchAll(EK_KALIBI)) {
    if (SOZLUK_IFADESI.test(m[1])) bulunan.push(m[0]);
  }
  return bulunan;
}

describe('Ek ekleme bekçisi · sözlük hâlleri [URN-ALN-008]', () => {
  it('hiçbir kaynak dosyada sözlük terimine elle ek eklenmiyor [URN-ALN-008]', () => {
    const bulgular: string[] = [];
    for (const dosya of taranacakDosyalar()) {
      for (const parca of ekEklemeleri(readFileSync(dosya, 'utf8'))) {
        bulgular.push(`${dosya}  ${parca}`);
      }
    }
    expect(bulgular, 'Sözlük terimine elle Türkçe eki eklenmiş. Ek ünlü '
      + 'uyumuna göre değişir; cümleyi sözlükteki hâllerle yeniden yazın '
      + '(`lib/dil/terimler.ts` başlığı).').toEqual([]);
  });

  /* ── Kalıbın gerçekten gördüğü kanıtı ────────────────────────────────
     Yalnız "bugün sıfır" demek kalıbın hiç çalışmadığı ihtimalini
     dışarıda bırakmaz. Aşağıdakiler DEPODAN ÇIKARILMIŞ üç gerçek
     yazımdır; kalıp onları görmezse bekçi boş yere yeşil yanıyor
     demektir. */
  it('düzeltilen gerçek yazımları görür [URN-ALN-008]', () => {
    expect(ekEklemeleri("`${tBas(sozluk, 'tesis')}siz kayıt gizlenmez`"))
      .toHaveLength(1);
    expect(ekEklemeleri("` · ${tesissiz} ${terim('tesis')}siz`"))
      .toHaveLength(1);
    /* Yoksunluk eki tek sınıf değil: çoğulun BULUNMA hâli de sözlükte
       yok ve "-de" aynı uyuma tabi ("ocaklarda", "şubelerde"). */
    expect(ekEklemeleri("`Görünen ${terim('tesis', 'cogul')}de yok`"))
      .toHaveLength(1);
  });

  it('ayrı sözcüğü ve büyük harfi ekleme saymaz [URN-ALN-008]', () => {
    expect(ekEklemeleri("`${terim('tesis')} bağı olmayan kayıt`")).toEqual([]);
    expect(ekEklemeleri("`${tBas(sozluk, 'tesis')} profili`")).toEqual([]);
    /* Sözlükten gelmeyen bir değere bitişik harf bu bekçinin konusu
       değildir: `${sayi}x` bir çarpan yazımıdır, çekim değil. */
    expect(ekEklemeleri('`${sayi}x`')).toEqual([]);
  });

  it('alan erişimiyle yazılan eki de görür [URN-ALN-008]', () => {
    expect(ekEklemeleri('`${tesis.tekil}siz`')).toHaveLength(1);
    expect(ekEklemeleri('`${tesis.tekil} yok`')).toEqual([]);
  });
});
