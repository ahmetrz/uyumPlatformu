# Açılış ekranı — devir notu

Bu belge, **sinematik açılış ekranını sürdüren oturum** içindir. İki şey
söyler: karşılanması gereken ürün şartı, ve o dosyada durup **silinmemesi
gereken** bağlantı.

## 1 · Ürün şartı — sektör bağımsızlığı açılışta da geçerli

> **Açılışta, hiçbir mercekte, o sektöre ait olmayan bir sözcük ya da
> görsel bulunmamalı. Hero metni ve alt başlık sözlükten gelmeli;
> sektöre bağlı görsel ya mercekle değişmeli ya sektörsüz olmalı.**

### Bugün karşılanmıyor — ölçüldü

`main` (8 Eylül 2026) açılışı dört kareli bir kamera yolculuğuna taşıdı
ve kareler **jeotermal**; hero metni de sektöre özgü. Yani bir su
işletmesi ziyaretçisi, ürünün ilk saniyesinde kendi işini görmüyor —
demonun ölçütü tam olarak bunun tersi ("bu bizim sektörümüz için
yapılmış").

Bu **bilerek düzeltilmedi**: hero metni ve görsel seçimi bir ürün
kararıdır ve o dosya bu turda başka bir oturumun elindeydi. Bir merge,
başkasının bilerek verdiği kararı sessizce geri alma yeri değildir.

### Şartın karşılandığı nasıl anlaşılır

Kabuğun geri kalanı bu şartı zaten karşılıyor ve ölçüsü şudur: mercek
değiştirildiğinde **sözcük, ölçü birimi, kayıt listesi ve mevzuat
çerçevesi** birlikte değişir. Açılış için aynı ölçüt:

- [ ] Hero metni ve alt başlık `useTerim()` / sözlük anahtarından geliyor
      (sabit dize değil).
- [ ] Kareler ya sektörsüz (soyut/endüstriyel, tanınabilir bir üretim
      tipi taşımayan) ya da mercekle değişiyor.
- [ ] Aşama etiketleri ("01 / …") sektör sözcüğü taşımıyor.
- [ ] `npx vitest run tests/bekci/sektor-terimi.test.ts` yeşil ve
      **tavan yükseltilmemiş** (cırcır yalnız küçülür).

Görsel mercekle değişecekse: sektör kimliği `SektorSecenegi.kod`
(`ELEKTRIK-URETIM` · `SU-ARITMA`) üstünden çözülür; kod adına göre dosya
seçmek **çekirdeğe sektör gömmek olur** — eşleme kiracı
yapılandırmasından ya da sektör paketinden gelmelidir (§0.5).

## 2 · SİLİNMEMESİ GEREKEN BAĞLANTI

Açılış ekranında iki ekleme var. İkisi de görünen metne dokunmaz;
ikisini de silmek **kapıları kırar** ya da demonun kalbini kaldırır.

| Ne | Nerede | Neden duruyor |
| --- | --- | --- |
| **Sektör seçici** | `web/components/giris/SinematikGiris.tsx` → `styles.sektor` bloğu, `mercegiSec()` çağrıları | Ziyaretçinin ilk on beş saniyede alması gereken cevap "bu ürün benim işim için mi". Seçim `mercegiSec()` ile ortak anahtara yazılır (`lib/dil/SozlukSaglayici.tsx`); açılış kabuğu SARDIĞI için `useSektorSecimi()` oradan görünmez, yazma yolu bu yüzden ayrı bir işlevdir ama **tek nüshadır**. |
| **`data-cta="platforma-gir"`** | Aynı dosya, CTA bağının üstünde | Kapılar CTA'yı **görünen adıyla değil bu kancayla** bulur (`web/arac/kosu-ortak.mjs` → `perdeyiAc`). ÖLÇÜLDÜ (8 Eyl 2026): metin "Platforma Gir"den "Demoyu Başlat"a değişince rota duman kapısı **58 rotanın hepsinde** düştü; gezinme ve taşma kapıları da aynı anda kırmızı yandı. Depo bu sınıfı #28'de zaten yaşamıştı. |

**Metni istediğiniz gibi değiştirin — kancayı bırakın.** Kanca tam da
metnin değişebilmesi için var.

Seçiciyi taşımak isterseniz: `sektorler` propu
`app/(kabuk)/(flagship)/layout.tsx`ten geliyor ve `kabukVerisi()` tek
kez okunuyor (iki kez okunsaydı açılışın gördüğü liste kabuğunkinden
ayrışabilirdi).

## 3 · Sınama

Açılışa dokunan her değişiklikten sonra bu üçü koşulmalı; üçü de bu
turda o dosya yüzünden kırmızı yandı:

```sh
cd web && npm run build && npx next start -p 3210 &   # taze derleme şart
PORT=3210 npm run rota:duman
PORT=3210 npm run gezinme:test
PORT=3210 KALITE_TABAN_DAL=origin/main node arac/yatay-tasma.mjs
```
