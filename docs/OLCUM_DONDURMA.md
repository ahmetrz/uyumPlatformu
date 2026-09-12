# Ölçüm dondurma kaydı

**12 Eylül 2026 · Brief M — ölçüm tarafındaki SON planlı PR.**

Bu belge, ölçüm ve alet tarafında bugün NE ölçüldüğünü, NEyin bilerek
ölçülmediğini ve buradan sonra yeni işin hangi koşulla açılacağını yazar.
İçindeki her sayı bir araçtan TÜRETİLMİŞTİR; hiçbiri elle yazılmadı.

Neden bir dondurma kaydı: bu depo beş turda payda körlüğünü beş kez
ölçtü (politika evreni 131 → 184 → 213 → 215 → 216 → 220) ve her tur
aleti biraz daha büyüttü. Alet büyümesinin kendisi bir başarı ölçüsü
değildir; bir noktada ürün yerine ölçüm aleti geliştirilmeye başlanır.
Sınır burada çizildi.

---

## (a) ÖLÇÜLEN

| Kütük | Satır | Mekanizma | İkinci tanık |
| --- | --- | --- | --- |
| `web/arac/politika-cumleleri.json` | **220** · POLITIKA **213** (S1 82 · S2 63 · S3 68) · `IDDIA_DEGIL` 7 · **ölçülmeyen 0** | kaynak türetici (`politika-kutugu.mjs`) — dize tarayıcısı + JSX metni | DOM tanığı: kütüğün **35/220**'ini (%15,9) render edilmiş ekranda görüyor |
| `web/arac/bos-durumlar.json` | **125** · iki ölçütü karşılayan **124** · nedensiz **1** (beyanlı hesaplanan cümle) · **eylemsiz 0** · iyi haber 17 | kaynak türetici (`bos-durum-kutugu.mjs`) — üç yüzey, **dal başına** ölçüm | DOM tanığı: tohumlu koşumda 16, **boş kurulumda 51** boş durum |
| `web/arac/dom-tanik.json` (tohumlu) | 65 rota · atlanan **0** · 43 cümle · 16 boş durum · taranan veri yüzeyi **56** · cümlesiz **0** | gerçek tarayıcı, kaynağı HİÇ OKUMAZ | kaynak türeticisinin kendisi |
| `web/arac/dom-tanik-bos.json` (boş kurulum) | 65 rota · atlanan **6** · 37 cümle · 51 boş durum · taranan veri yüzeyi **17** · cümlesiz **0** | aynı tanık, KENDİ kurduğu boş veritabanı + kendi kurucu hesabı + kendi sunucusu | — |
| `web/arac/dom-tanik-kutugu.json` | **8** satır (çalışma anında birleşen cümleler) · ölçümsüz tavanı **0** | elle sınıflanmış, ölçümü adıyla beyanlı | kütükte olmayan cümle kırmızı, kodda olmayan satır da kırmızı |

**Ölçüm tabanları** (`web/arac/olcum-tabani.json`) — her biri yalnız
`--taban-yaz --sebep="…"` ile ve gerekçesi DOSYAYA işlenerek iner:

```
duman.rota 58 · gezinme.bant 7 · tasma.olcum 144 · axe.tarama 216
bos.durum 125 · politika.cumle 220
tanik.rota 65 · tanik.cumle 43 · tanik.bosDurum 16
tanik.veriYuzeyi 17 · tanik.kapsam 35
```

İki mekanizmanın AYRIŞMASI kırmızıdır ve iki yönde de ölçülür: tanığın
ekranda görüp kütükte bulamadığı cümle de, kütükte olup kodda karşılığı
kalmayan satır da (`web/tests/bekci/dom-tanik.test.ts`, URN-TNK-001).

---

## (b) BEYANLI ÖLÇÜLMEYEN

Aşağıdakiler ölçülmüyor ve bu bir eksiklik değil, **yazılı bir karardır**.
Her birinin sahibi, gerekçesi ve BÜYÜYEMEYEN bir tavanı var.

### 1 · R0-23 · çekimli özne sınırı

| | |
| --- | --- |
| **Ne ölçülmüyor** | Özneleri çekim ekiyle yazan politika cümleleri ("kütüğün…", "kaydı…", "ürünün…"). `OZNE` kalıbı özneyi YALIN hâliyle arar. |
| **Ölçülen büyüklük** | **51** cümle (`korGovdeSayisi()`) |
| **Neden kapatılmadı** | Kalıbı gövdeye çevirmek 51 satırlık yeni bir borç açar; bu kütüğün yedinci dişi SIFIRDA KİLİTLİ, yani her satır gerçek yol ölçümüyle gelmek zorunda. Yüz satırı bir turda aceleyle ölçmek, bu deponun kaçındığı şeyin ta kendisidir. |
| **Tavan** | `politika-cumleleri.json` → `tavanlar.korGovde = 51`. **Büyüyemez**: çekimli özneli yeni bir cümle kapıyı kırmızı yakar. |
| **İkinci bekçi** | DOM tanığı — çekimli özneli bir cümle gerçekten ekrana çıkıyorsa tanık onu görür ve kütükte bulamayınca kırmızı yanar. |
| **Sahip / kapanış** | KODLAYAN / P3 · mesaj kataloğu (arayüz metni sözlük anahtarına geçtiğinde tarama metinden ANAHTARA döner ve gövde sorunu ortadan kalkar) |

### 2 · Tanığın ulaşamadığı kütük satırları

Tanık kütüğün **35/220**'ini görüyor. Kalan **185** satır kategorilere
ayrılmıştır ve kategori KODDAN türetilir (`erisimKategorisi`) — elle
işaretlenmez. Üçü birlikte ulaşılamayanların TAMAMINI kaplamak zorundadır;
dördüncü bir hâl doğarsa toplam tutmaz ve kapı kırmızı yanar.

| Kategori | Satır | Ne demek |
| --- | --- | --- |
| `acilista-yok` | **151** | Rota gezildi ama cümle AÇILIŞ hâlinde yok: çekmece, sekme, form ya da koşullu bir durumun arkasında. Tanık etkileşim sürmüyor. |
| `sunucu-eylemi` | **32** | Sunucu eyleminin ret gerekçesi (`lib/eylemler2/**`): ilk DOM'da hiç bulunmaz, ancak kullanıcı bir işlem denediğinde görünür. |
| `rota-gezilmedi` | **2** | Dinamik segmentin tohum değeri çözülemedi ya da HTTP hata döndü. Tanığın `atlanan` listesi sebebi adıyla yazar. |

**Tavan:** kapsama ORANI taban dala göre **düşemez**. Salt sayıya bakan
bir taban yetmez — kütük büyürken tanık sabit kalırsa sayı korunur, oran
düşer ve "ayrışma 0" giderek daha az şey söyler.
**Sahip:** KODLAYAN. **Kapanış:** bir müşteri ihtiyacı doğurursa.

### 3 · `kapi-compose` yerel ölçümü

| | |
| --- | --- |
| **Ne ölçülmüyor** | Compose kurulumunun rota duman testi, geliştirme kum havuzunda. |
| **Sebep** | Kum havuzunda `dockerd` koşmuyor (`Cannot connect to the Docker daemon`). Ortam engeli; etrafından DOLAŞILMADI. |
| **Otorite** | **CI.** Kapı `pr-kapisi.yml` içinde koşar ve orada yeşildir. |
| **Tavan** | Yerel parti bunu "geçti" diye YAZMAZ, "ÖLÇÜLMEDİ" diye yazar ve parti kapanışı kırmızı olur. |
| **Sahip / kapanış** | Gözden geçirenin kararı — `dockerd` kapsam dışı. |

### 4 · Kapının ölçtüğü şeyin sınırı (R-D · R-F · R-G ile aynı, kabul edilmiş)

Kapılar **beyanın VARLIĞINI** ölçer, **DOĞRULUĞUNU** değil:

- paket alan eşlemesi bir beyan taşıyor mu (anlamı doğru mu — değil),
- politika cümlesinin bir ölçümü var mı (ölçüm iddiayı gerçekten sınıyor
  mu — değil),
- boş durum bir şey söylüyor mu (söylediği doğru mu — değil).

Doğruluk **bağımsız incelemenin** işidir; "kapı yeşil" onu doğrulanmış
saymaz. Sınır `docs/SEKTOR_PAKETI_SOZLESMESI.md` §1.10'da da yazılıdır.

---

## (c) DONDURMA KURALI

**Ölçüm ve alet tarafında yeni iş, bir MÜŞTERİ ihtiyacı ya da bir ÜRÜN
kusuru göstermeden açılmaz.**

1. **Yeni bekçi, yeni kütük, yeni tanık İCAT EDİLMEZ.** Var olanlar
   (`politika-cumleleri` · `bos-durumlar` · `dom-tanik` · `dom-tanik-bos`
   · `dom-tanik-kutugu` · `olcum-tabani` · `kalite-borcu`) yeter.
2. **İnceleme turlarının ALETİ ölçen bulguları R0 kütüğüne kaydedilir, o
   turda eritilmez.** Bir bulgunun "gerçek" olması, onu şimdi kapatmayı
   gerektirmez; gerektiren şey bir müşteri yolunun tıkanmasıdır.
3. **Bir ürün kusuru gösteren bulgu bu kuralın dışındadır** ve normal
   yoldan düzeltilir — Brief M'de `/envanter`'in sebepsiz boş durumu
   böyle kapandı.
4. **Tavanlar ve tabanlar yalnız bu belgedeki koşullarla değişir:**
   taban ancak ölçümle ve dosyaya yazılan gerekçeyle iner, tavan
   `tavanGerekceleri` altında `eski → yeni` adıyla anlatılan bir
   gerekçeyle yükselir. Commit mesajı yetmez.
5. **Bu belge bir muafiyet defteri değildir.** (b)'deki her kalem bir
   kapıya bağlıdır; hiçbiri "bakmıyoruz" demez, hepsi "şu kadarını
   görmüyoruz ve o sayı büyüyemez" der.

---

## Sınırın kendisi de ölçülür

Dondurma kaydının en kolay bozulma biçimi, (b) listesinin sessizce
uzamasıdır. Bu yüzden listedeki üç sayısal kalemin üçü de bir kapıya
bağlı ve üçü de sabotajla kanıtlandı:

| Kalem | Kapı | Sabotaj |
| --- | --- | --- |
| R0-23 · 51 kör cümle | `tests/bekci/politika-olcumu.test.ts` | çekimli özneli cümle eklendi → 51 → 52 → kırmızı |
| Tanık kapsamı %15,9 | `tests/bekci/dom-tanik.test.ts` | tanık cümlelerinin yarısı düşürüldü → dört diş birden kırmızı |
| Cümlesiz boş yüzey 0 | `tests/bekci/dom-tanik.test.ts` | bir ekranın boş durumu kaldırıldı → tanık yüzeyi gördü → kırmızı |

Dördüncü kalem (`kapi-compose`) yerelde ölçülemediği için sabotajı da
yerelde koşulamaz; otoritesi CI'dır ve orada yeşildir.
