# Performans tabanı — sentetik ölçüm

Bu belge **ölçüm** raporudur. Yazan sayıların hepsi bu makinede koşturuldu;
ölçülemeyenler §7'de ayrıca sayılıdır ve tahminler `TAHMİN` diye
işaretlenmiştir.

`web/prisma/dev.db` **değiştirilmedi**. Tüm ölçüm dosya kopyaları üzerinde
yapıldı. Gerçek kurum verisi kullanılmadı; veri tamamen sentetiktir.

---

## 1. Ölçüm düzeneği

**Veri kümeleri** (hepsi `dev.db` kopyasından türetildi):

| Küme | Varlık | KesifKaydi | VarlikZafiyeti | Zafiyet | Dosya |
|---|---|---|---|---|---|
| taban | 347 | 0 | 30 | 10 | 1,8 MB |
| 1k | 1.347 | 10.000 | 10.030 | 60 | 12,4 MB |
| 10k | 10.347 | 100.000 | 100.030 | 60 | 93,1 MB |

Her kümede ayrıca: 10.000 satırlık içe aktarım raporu (`IceAktarim.raporJson`,
0,93 MB tek JSON hücresi) ve 400 connector koşusu (koşu başına 25.000 kayıt
sayacı, `EntegrasyonKosusu`).

**Nasıl ölçüldü.** Sayfa `page.tsx`'in varsayılan dışa aktarımı (sunucu
bileşeni) **doğrudan çağrılarak**; tarayıcı yok, React render'ı yok — ölçülen
şey sunucu veri toplama maliyetidir. `NEXT_PUBLIC_DEMO=1` ile salt-okur demo
kullanıcısı devrededir (tüm santral kapsamı). Her ekran bir ısıtma koşusundan
sonra 5-7 kez koşturulur, **medyan** raporlanır (tek koşu ±%30 oynuyor).
Sorgu günlüğü Prisma `log: [{ emit:'event', level:'query' }]` ile açıldı.
Bellek `process.memoryUsage().heapUsed` farkının tepe değeridir
(`--expose-gc` ile her tekrardan önce GC).

**Uyarı — gürültü.** Ölçüm boyunca aynı ağaçta başka ajanlar çalışıyordu
(yük ortalaması 2,5-5,9). 30 ms altındaki sayılar gürültünün içindedir ve
karşılaştırma için kullanılmamalıdır. Aşağıdaki sonuçlarda yalnız
**büyük ve tekrarlanabilir** farklar yorumlanmıştır; indeks A/B ölçümleri
gürültüyü dengelemek için **dönüşümlü** (iki veritabanı sırayla, aynı süreçte)
koşturulmuştur.

---

## 2. En büyük bulgu: envanter ekranı 998. varlıkta ÇÖKÜYORDU

Bu bir yavaşlama değildi. `app/(kabuk)/(operasyonel)/envanter/page.tsx`
varlık sayısı 997'yi geçtiği anda **500 döndürüyordu**:

```
Invalid `db.varlik.findMany()` invocation in
app/(kabuk)/(operasyonel)/envanter/page.tsx:43:17
The query parameter limit supported by your database is exceeded.
```

**Kök neden.** İlişki seviyesinde `take` (ebeveyn başına LIMIT):

```ts
konfigYedekleri: { select: {...}, orderBy: { yedekZamani: 'desc' }, take: 1 },
kesifler:        { select: {...}, orderBy: { sonGorulme:  'desc' }, take: 1 },
```

Prisma bunu ebeveyn başına **bir bağlı parametre** taşıyan TEK bir sorguya
çevirir ve parçalayamaz — LIMIT tüm ebeveyn kümesine birden uygulandığı için
sorgu bölünemez. SQLite'ın sınırı 999'dur (`SQLITE_MAX_VARIABLE_NUMBER`).

**Eşik ikili aramayla ölçüldü:**

```
take=997 → ÇALIŞIR (en çok 999 parametre)
take=998 → HATA
```

Aynı sorgudaki diğer altı ilişki (`kaynakIliskiler`, `hedefIliskiler`,
`riskler`, `kanitlar`, `zafiyetler`, ve `take`siz hâlleriyle
`konfigYedekleri`/`kesifler`) 10.347 varlıkta **sorunsuz** çalışıyor —
Prisma onları 999'luk parçalara bölüyor. Kıran, yalnız ve yalnız `take`tir.
Bunu tek tek ölçerek doğruladım:

```
OK   kaynakIliskiler            1336 satır   5 sorgu · maxParam=999
OK   zafiyetler                 1336 satır   4 sorgu · maxParam=999
OK   kesifler (take YOK)        1336 satır   4 sorgu · maxParam=999
HATA konfigYedekleri (take: 1)  parameter limit exceeded
HATA kesifler (take: 1)         parameter limit exceeded
```

**Aynı kalıbın bulunduğu diğer yerler** (üst seviye `take` ile sınırlanmamış
ebeveyn kümesi):

| Yer | Ebeveyn | Bugünkü satır | Durum |
|---|---|---|---|
| `envanter/page.tsx:43` (ilişki-take 97,101) | `Varlik` | 347 | **DÜZELTİLDİ** |
| `kimlik/page.tsx:22` (ilişki-take 29) | `ErisimAtamasi` | 121 | **DÜZELTİLDİ** — 998. atamada aynı şekilde çökerdi |
| `uyum/veri.ts:110` (ilişki-take 121) | `Regulasyon` (aktif) | 4 | **DOKUNULMADI** — ebeveyn sayısı regülasyon sayısıyla sınırlı, pratikte 997'ye ulaşmaz |

Tarama tekrarlandığında `app/` + `lib/` altında **ilişki seviyesinde `take`
kullanan tek bir nokta kaldı**: `uyum/veri.ts:121`. Ebeveyni aktif regülasyon
kümesidir (bugün 4) ve 997'ye ulaşması için 998 ayrı regülasyon tanımlanması
gerekir — bu yüzden dokunulmadı, ama kalıp aynı kalıptır ve regülasyon sayısı
büyürse aynı biçimde çöker.

Karıştırılmaması gereken ayrım: ekranların çoğunda görülen `take` **üst
seviyededir** (ör. ana sayfada `take: 12`, aramada `take: 4-6`) — o, ebeveyn
sayısını sınırlar ve tamamen güvenlidir. Kıran, yalnız **ilişki içindeki**
`take`tir.

---

## 3. Ekran bazında sunucu sorgu süresi

Medyan, ms. `HATA` = 500 (parametre sınırı).

| Ekran | 347 varlık | 1.347 | 10.347 | sorgu@10k | bellek@10k |
|---|---|---|---|---|---|
| **envanter (O10)** | 54,8 | 236,5 | **1990,3** | 75 | **177,7 MB** |
| **omur** | 29,9 | 98,2 | **422,7** | 48 | 33,7 MB |
| **kesif** | 2,5 | 36,0 | **76,5** | 6 | 3,6 MB |
| **yedekleme** | 15,7 | 11,1 | **58,4** | 7 | 11,8 MB |
| uyum | 25,2 | 22,5 | 23,8 | 23 | 3,3 MB |
| kimlik | 19,0 | 19,7 | 22,0 | 14 | 5,3 MB |
| ice-aktarim | 2,4 | 14,7 | 21,7 | 5 | 3,9 MB |
| ana-sayfa (F1) | 15,7 | 10,8 | 16,2 | 14 | 1,2 MB |
| tesis-360 (detay) | 10,7 | 7,8 | 14,4 | 21 | 1,5 MB |
| saglik | 14,7 | 16,7 | 14,2 | 26 | 1,4 MB |
| riskler | 15,0 | 7,9 | 15,2 | 19 | 1,4 MB |
| bulgular | 16,4 | 7,8 | 13,8 | 13 | 1,3 MB |
| yonetim-tezgahi | 13,2 | 10,1 | 13,1 | 17 | 0,9 MB |
| tedarikciler | 25,9 | 9,7 | 14,7 | 12 | 1,6 MB |
| raporlar / regulasyonlar / projeler / surecler / olaylar / denetimler / yetkiler / operasyon / eslestirme / aktivite / varlik-aktarim / portfoy | 2-19 | 2-8 | 2-10 | 2-15 | <1 MB |
| topoloji | 0,3 | 0,2 | 0,2 | **0** | 0 |

**Ölçek duyarlılığı yalnız dört ekranda var**: envanter, ömür, keşif,
yedekleme. Geri kalan 23 ekran veri hacminden bağımsızdır — hepsi sabit
sayıda satır çekiyor ya da yalnız boyut tablolarına dokunuyor.

**`topoloji` sıfır sorgu üretti.** Sayfa hiçbir veri toplamıyor (veri
istemci tarafında ya da alt bileşende çekiliyor). Bu yöntemle **ölçülemedi**,
"hızlı" demek değildir.

---

## 4. Tespitler

### 4.1 N+1 ve tekrar eden sorgu kalıpları

Sorgu günlüğü kalıba indirgenip sayıldı (parametreler `IN (…)` olarak
normalize edildi). **Klasik "satır başına bir sorgu" N+1'i okuma yolunda
BULUNAMADI** — Prisma ilişkileri toplu çekiyor. Bulunan şey farklı ve daha
sinsi: **parça sayısı satır sayısıyla doğrusal büyüyor.**

10.347 varlıkta `omur` ekranı (düzeltme öncesi), her biri 11 kez:

```
x11  SELECT VarlikTuru.id, ad     FROM VarlikTuru     WHERE id IN (…)
x11  SELECT Tesis.id, ad          FROM Tesis          WHERE id IN (…)
x11  SELECT Tedarikci.id, ad      FROM Tedarikci      WHERE id IN (…)
x11  SELECT VarlikYazilimi …      WHERE varlikId IN (…)
x11  SELECT RiskVarlik …          WHERE varlikId IN (…)
x11  SELECT ProjeBaglantisi …     WHERE varlikId IN (…)
```

11 = `ceil(10347 / 999)`. **İlk üçü boyut tablosudur**: `VarlikTuru` 11
satır, `Tesis` 17, `Tedarikci` 18. 46 satırlık üç tabloyu okumak için 33
sorgu ve 10.347 parametre harcanıyordu. 100.000 varlıkta bu 300 sorgu olurdu.

Aynı kalıp envanterde dokuz boyut ilişkisi için (99 sorgu) ve yedeklemede
bir ilişki için (10 sorgu) vardı.

### 4.2 Tam tablo taraması yapan sorgular

`EXPLAIN QUERY PLAN` ile doğrulanan iki gerçek tarama:

```
SELECT * FROM KesifKaydi ORDER BY sonGorulme DESC LIMIT 500
  → SCAN KesifKaydi | USE TEMP B-TREE FOR ORDER BY        (100.000 satır)

SELECT … FROM KesifKaydi WHERE eslesenVarlikId IN (…) ORDER BY sonGorulme DESC
  → SCAN KesifKaydi | USE TEMP B-TREE FOR ORDER BY        (parça başına)
```

ve bir verimsiz atlamalı arama:

```
SELECT … FROM VarlikZafiyeti WHERE varlikId IN (…)
  → SEARCH USING INDEX VarlikZafiyeti_zafiyetId_varlikId_key
    (ANY(zafiyetId) AND varlikId=?)
```

`VarlikZafiyeti`'nin tek indeksi `@@unique([zafiyetId, varlikId])`;
`varlikId` **ikinci** kolon olduğu için SQLite tüm `zafiyetId` değerlerini
dolaşmak zorunda kalıyor.

Statik tarama ayrıca **135 üretim sorgusunun** hiçbir indeksin ilk kolonuna
dokunmadığını gösterdi; bunların büyük çoğunluğu boyut tablolarındadır
(`Tesis.durum` 17 satır, `Kullanici.aktif` 5 satır) ve indeks gerektirmez.
`WHERE` içermeyen (tam tablo) 12 üretim sorgusu var; hepsi bugün küçük
tablolar üzerinde (`Olay`, `VeriKokeni`, `TopolojiSapmasi`,
`TedarikciErisimOturumu`, `KonfigurasyonYedegi`, `EntegrasyonKosusu`) —
bunlar **büyüdükçe** sorun olacak, bugün değil.

### 4.3 Bellek sıçraması

| Ekran | 347 | 10.347 |
|---|---|---|
| envanter | 9,3 MB | **177,7 MB** |
| omur | 6,0 MB | 33,7 MB |
| yedekleme | 1,4 MB | 11,8 MB |

Envanter 10.347 varlıkta istek başına **~178 MB** heap istiyor. İki eşzamanlı
istek 350 MB'tır; varsayılan Node heap sınırında (~1,5-2 GB) beş-altı
eşzamanlı envanter isteği süreci düşürür. Bu, ekranın hiçbir sayfalama
yapmamasının doğrudan sonucudur: 10.347 varlık, ilişkileriyle birlikte,
tek seferde belleğe alınıp istemciye seri hâlde gönderiliyor.

**Bu düzeltilmedi**: sayfalama eklemek ekranın anlamını değiştirir
(grafik kipi ve tüm filtreler tam kümeye dayanıyor) ve görev "sorgu
iyileştirmesi" ile sınırlı. §6'da öneri olarak duruyor.

### 4.4 Aşırı büyük transaction — ölçüldü

| İşlem | Süre | Sorgu | Bellek |
|---|---|---|---|
| **İçe aktarım onayı, 10.000 madde** (`lib/eylemler.ts:654`) | **10,9 s** | **30.010** | 132 MB |
| **Connector koşusu, 1.000 gözlem** (`POST /api/v1/assets/observations`, API tavanı) | **6,9 s** | **5.018** | 38,8 MB |
| Connector koşusu, 100 gözlem | 1,34 s | 518 | 26,3 MB |

İkisi de **tek `$transaction` içindedir**. SQLite tek yazıcı olduğu için bu,
"11 saniye boyunca uygulamada başka hiçbir yazma olamaz" demektir — oturum
açma dâhil.

Sorgu/kayıt oranları: madde başına **3 sorgu**, gözlem başına **5 sorgu**.
Bu bir **yazma tarafı N+1**'idir. Ölçek doğrusaldır (100 gözlem 1,34 s →
1.000 gözlem 6,9 s).

Bu iki yol **iyileştirilmedi**: parti parti commit'e geçirmek atomiklik
sözleşmesini değiştirir (`lib/entegrasyon/varlikAktarim.ts:15` "Yarım import
YOK" değişmezi) ve bu, ölçüm görevinin değil bir tasarım kararının konusudur.

---

## 5. Uygulanan iyileştirmeler — ÖNCE/SONRA

Yöntem: değişiklikten önceki dosyalar `git HEAD`'ten alınıp **aynı harness,
aynı tekrar sayısı (7), aynı veritabanı kopyaları** ile ölçüldü. Ölçüm
yöntemi sabit tutulmadan karşılaştırma yapılamaz.

`prisma/schema.prisma`'ya **dokunulmadı**.

### İ1 — envanter: ilişki `take`'i yerine ayrı sorgu · `envanter/page.tsx`

`konfigYedekleri`/`kesifler` ilişki `take: 1`'leri kaldırıldı; son yedek ve
son keşif, ebeveynle **aynı kapsam koşulunu** kullanan iki ayrı sorgu ile
okunuyor ve `ilkiniEsle` (yeni: `lib/sorguParcala.ts`) ile ebeveyn başına
ilk satır seçiliyor.

Kimlik listesi (`id IN (10.000 değer)`) **kullanılmadı**: hem aynı 999
sınırına takılır hem de yalnız parametre bağlamak için ölçülebilir zaman
harcar. Boş bir tabloda ölçüldü:

```
parçalı IN (12 parça × 900 param)          34 ms
ilişki filtresi (IN yok)                    0 ms
```

### İ2 — envanter/ömür/yedekleme: boyut ilişkileri → tek okuma + bellek eşlemesi

Dokuz (envanter), üç (ömür), bir (yedekleme) boyut ilişkisi (`tur`, `tesis`,
`unite`, `sistem`, `bolge`, `sahip`, `emanetci`, `tedarikci`, `sozlesme`)
ilişki olarak çekilmeyi bıraktı; yabancı anahtar okunup tablo bir kez
tam çekiliyor ve JS'te `Map` ile eşleniyor.

**Kapsam korundu:** açılır listeler eskisi gibi yalnız aktif kayıtları
gösteriyor, satır eşlemesi ise TÜM kayıtları görüyor — pasifleştirilmiş bir
türe ya da kapatılmış bir santrale bağlı varlık ekrandan düşmüyor. (Eski kod
ilişki üzerinden okuduğu için zaten böyleydi; filtreli listeyi eşleme için
kullanmak sessiz bir veri kaybı olurdu.)

### İ3 — kimlik: iç içe `take: 1` → ayrı sorgu · `kimlik/page.tsx`

`atamalar.incelemeler take: 1` kaldırıldı; son inceleme ayrı sorgudan
eşleniyor. 998. erişim atamasında oluşacak 500 hatası kaldırıldı.

### Sonuçlar

| Ekran | Ölçek | ÖNCE | SONRA | Fark |
|---|---|---|---|---|
| **envanter** | 347 | 82,4 ms · 27 sorgu | **54,8 ms · 20 sorgu** | **−33 %**, −7 sorgu |
| | 1.347 | **HATA** (parametre sınırı) | **236,5 ms · 30 sorgu** | çöküyordu → çalışıyor |
| | 10.347 | **HATA** | **1990,3 ms · 75 sorgu** | çöküyordu → çalışıyor |
| | 10.347 + §6 indeksleri | **HATA** | **1500,5 ms · 75 sorgu** | |
| **omur** | 347 | 38,6 ms · 15 sorgu | 29,9 ms · 15 sorgu | −23 % |
| | 1.347 | 104,3 ms · 27 sorgu | 98,2 ms · **21** sorgu | −6 %, −6 sorgu |
| | 10.347 | 426,0 ms · **81** sorgu | 422,7 ms · **48** sorgu | süre ≈ aynı, **−33 sorgu** |
| | 10.347 + indeks | 574,9 ms · 81 sorgu | **358,7 ms · 48 sorgu** | **−38 %** |
| **yedekleme** | 347 | 13,9 ms · 7 sorgu | 15,7 ms · 7 sorgu | gürültü içinde |
| | 1.347 | 32,8 ms · 9 sorgu | **11,1 ms · 7 sorgu** | **−66 %** |
| | 10.347 | 105,9 ms · **17** sorgu | **58,4 ms · 7 sorgu** | **−45 %**, −10 sorgu |
| **kimlik** | 347 | 46,4 ms · 14 sorgu | 19,0 ms · 14 sorgu | gürültü (sorgu sayısı aynı) |
| | 10.347 | 24,8 ms · 14 sorgu | 22,0 ms · 14 sorgu | gürültü |

**Dürüst okuma:**

- Envanterdeki kazanç **süre değil, çalışabilirliktir.** 1.347 ve 10.347'de
  ekran daha önce hiç açılmıyordu.
- Ömür'de **süre neredeyse değişmedi** (426 → 423 ms). Sorgu sayısı üçte bir
  azaldı ama SQL zaten toplam sürenin yalnız %30'uydu; kalan %70 Prisma
  seri açma + 10.347 satırın JS'te dönüştürülmesi. Bu kısım sorgu
  iyileştirmesiyle çözülmez (bkz. §6, sayfalama).
- Ömür'de indekslerle birlikte ölçüldüğünde fark açılıyor (575 → 359 ms):
  indeksler eklendiğinde iyileştirmenin değeri artıyor.
- Kimlik'te süre farkı gürültüdür; sorgu sayısı değişmedi. Değişen tek şey,
  998. atamada oluşacak çöküşün kalkmasıdır.

---

## 6. İstenen şema indeksleri

`prisma/schema.prisma` dosyasına **dokunulmadı**. Aşağıdakiler ölçümle
gerekçelendirilmiştir; A/B, aynı süreçte iki veritabanını **dönüşümlü**
ölçerek (15 tekrar, medyan) yapıldı.

### Ölçülmüş kazanç

| Sorgu | İndekssiz | İndeksli | Kazanç |
|---|---|---|---|
| keşif kuyruğu: `KesifKaydi ORDER BY sonGorulme DESC LIMIT 500` | 58,5 ms | **1,9 ms** | **%97** |
| envanter: `KesifKaydi WHERE eslesenVarlikId IN (900) ORDER BY sonGorulme DESC` | 45,1 ms | **3,9 ms** | **%91** |
| envanter: `VarlikZafiyeti WHERE varlikId IN (900)` | 21,4 ms | **6,6 ms** | **%69** |
| `Varlik WHERE silindi IS NULL ORDER BY etiket` | 7,5 ms | 6,8 ms | %9 (marjinal) |
| `AktiviteKaydi ORDER BY zaman DESC LIMIT 100` | 0,1 ms | 0,0 ms | tablo bugün 22 satır |

Sayfa seviyesinde: envanter 1990 → 1500 ms (**−%25**), keşif 76,5 → 18,7 ms
(**−%76**).

### Eklenmesini istediğim satırlar

```prisma
model VarlikZafiyeti {
  // … mevcut alanlar değişmiyor …

  @@unique([zafiyetId, varlikId])
  /// Varlıktan zafiyete gidiş: `varlikId` yukarıdaki tekil indeksin İKİNCİ
  /// kolonu olduğu için SQLite tüm zafiyetleri atlayarak dolaşıyordu
  /// (EXPLAIN: ANY(zafiyetId) AND varlikId=?). Ölçüldü: 100.030 satırda
  /// 900 varlık için 21,4 ms → 6,6 ms.
  @@index([varlikId])
}

model KesifKaydi {
  // … mevcut alanlar değişmiyor …

  @@unique([kaynak, kaynakKayitId])
  @@index([durum, sonGorulme])
  @@index([tesisId, durum])
  /// Keşif kuyruğu ekranı (app/(kabuk)/(operasyonel)/kesif/page.tsx:67)
  /// durum filtresi OLMADAN `sonGorulme desc` sıralar; yukarıdaki
  /// [durum, sonGorulme] indeksi bu sorguya yaramaz. Ölçüldü: 100.000
  /// satırda tam tarama + geçici B-ağacı sıralaması 58,5 ms → 1,9 ms.
  @@index([sonGorulme])
  /// Varlığın SON keşif kaydı (envanter ekranı). Eşleşen kayıt üzerinden
  /// gidiş bugün tam tarama yapıyor. Ölçüldü: 45,1 ms → 3,9 ms.
  @@index([eslesenVarlikId, sonGorulme])
}
```

### Ölçülmedi ama tablo büyüdüğünde gerekecek (öneri, TAHMİN)

```prisma
model AktiviteKaydi {
  /// Aktivite ekranı (app/(kabuk)/(operasyonel)/aktivite/page.tsx:31)
  /// filtresiz `zaman desc` okur. Tablo bugün 22 satır — ÖLÇÜLECEK bir şey
  /// yok. Denetim izi asla silinmediği için bu tablo tek yönlü büyür ve
  /// ilk darboğaz adayı budur.
  @@index([zaman])
}

model KonfigurasyonYedegi {
  /// lib/entegrasyon/konfigYedek.ts:143,176,241 `basarili` / `sonBilinenIyi`
  /// ile filtreliyor; tablo bugün 0 satır (ölçülemedi).
  @@index([varlikId, basarili, yedekZamani])
}
```

### İSTEMEDİĞİM indeksler (ölçüm gerekçesiyle)

- **`Varlik(silindi)` / `Varlik(silindi, etiket)`** — ölçüldü, kazanç %9 ve
  gürültünün içinde. `silindi IS NULL` satırların ~%99'unu seçer; düşük
  seçicilikte indeks taraması tablo taramasından hızlı değildir. PostgreSQL'de
  doğru araç **kısmi indekstir** (`WHERE silindi IS NULL`) ve onu Prisma
  şeması ifade edemez — ham migration konusu.
- **Boyut tablolarında hiçbir şey** (`Tesis.durum`, `Kullanici.aktif`,
  `Regulasyon.aktif`, `VarlikTuru.aktif`, `KapsamAlani.aktif`). Bu tablolar
  4-17 satırdır; indeks yalnız yazma maliyeti ekler.

---

## 7. Ölçülemeyenler

- **`topoloji` ekranı**: sayfa fonksiyonu sıfır sorgu üretiyor; bu yöntemle
  ölçülemedi. Veri alt bileşende/istemcide toplanıyor olabilir.
- **`sistem`, `sistem/bilesenler`, `tesisler` (liste)**: senkron sayfalar,
  veri toplamıyorlar.
- **Parametreli detay ekranlarının çoğu** (`bulgular/[id]`, `denetimler/[id]`,
  `riskler/[id]`, `surecler/[id]`, `uyum/[cerceve]`): yalnız
  `tesisler/[id]` ölçüldü. Diğerleri sabit sayıda satır çektikleri için
  ölçek duyarlı değildir (TAHMİN, ölçülmedi).
- **`lib/entegrasyon/varlikAktarim.ts:708` — 10.000 satırlık varlık
  aktarımı.** Uçtan uca çalıştırmak geçerli bir yüklenmiş aktarım kaydı ve
  kolon eşlemesi gerektiriyor; kurulamadı. Kod şekli
  `lib/eylemler.ts:654`'ten ağırdır (satır başına ~4 yazma) →
  **TAHMİN: 10.000 satırda 10 s üzeri.**
- **`lib/api/uclar/{erisimler,varlikYazma,zafiyetler,yedekler}.ts`
  transaction süreleri**: yalnız `varlikGozlemleri` ucu ölçüldü. Diğer dördü
  aynı şekildedir, benzer mertebe beklenir (TAHMİN).
- **`KonfigurasyonYedegi` ve `AktiviteKaydi` yükünün etkisi**: görev bu iki
  tabloyu şişirmeyi istemedi; ikisi de bugün boş/çok küçük. Envanterdeki
  "son yedek" sorgusu bu yüzden **gerçek yükle ölçülemedi** — ölçülen sayı
  yalnız sorgu kurulum maliyetidir.
- **Eşzamanlılık altında hiçbir şey ölçülmedi.** Tüm ölçümler tek istek,
  seri. SQLite'ın tek yazıcı davranışının kullanıcı deneyimine etkisi
  (kuyruk süreleri) ölçülmedi.
- **PostgreSQL üzerinde hiçbir şey ölçülmedi** — ortamda PostgreSQL yok.
  Bkz. `POSTGRES_READINESS.md`.
- **Tarayıcı tarafı hiçbir şey ölçülmedi**: React render, seri hâle getirme
  (RSC payload) ve ağ süresi kapsam dışıdır. Envanterin 10.347 varlığı
  istemciye taşıma maliyeti muhtemelen sunucu sorgu süresinden büyüktür
  (TAHMİN).
- Makine ölçüm boyunca başka ajanların testleriyle paylaşıldı (yük 2,5-5,9);
  30 ms altındaki tüm sayılar gürültü seviyesindedir.
