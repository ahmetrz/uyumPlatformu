# Orijinal Tasarım — Uygulama Haritası

**Görsel source of truth:** orijinal tasarım kaynağındaki (`ORIGINAL_DESIGN_SOURCE.zip`) on iki
yüksek sadakatli HTML prototipi. Bu belgedeki her ölçü, o prototipler 1440×1000
görüntü alanında tarayıcıda **render edilip hesaplanmış** değerlerdir — repo'daki
mevcut arayüzden, Atlas'tan, Atlas 2'den ya da canlı demodan türetilmemiştir.

> **Atlas 2 (`saha` / `defter` / `tezgah` yüzey kipleri) bu göçte DEPRECATED bir
> ara tasarımdır.** Görsel referans değildir. `main` dalı şu anda onu taşıyor;
> Faz C'de presentation izi sıfırlanacak.

Ölçüm aracı: prototipler `cdn.tailwindcss.com` ve Google Fonts'a çalışma anında
bağlı geldiği için yerel bir kopyaya Tailwind gömülüp fontlar self-host edildi;
aksi hâlde üçü de tamamen stilsiz düşüyor (`ERR_CONNECTION_RESET`).

---

## 0 · Üç yönün ölçülmüş kimliği

| | **A · Industrial Precision** | **B · Energy Intelligence** | **C · Operational Luxury** |
|---|---|---|---|
| Prototip | `a-*.html` | `b-*.html` | `c-*.html` |
| Sayfa zemini | `#0D1012` | `#0A0C0D` | `#F7F6F3` |
| Gövde mürekkebi | `#E7EAEA` | `#EDEEEC` | `#1A1A18` |
| Panel / şerit | `#101416` · `#181D1F` | `#0A0C0D` · `rgba(10,12,13,.7)` | `#FFFFFF` |
| Saç çizgisi | `#262C2E` | `#1C2123` | `#E4E1DB` · `#D6D2CA` (kalın) |
| Arayüz ailesi | Inter Tight | Inter | Inter |
| Veri ailesi | IBM Plex Mono | JetBrains Mono | IBM Plex Mono |
| Görüntü ailesi | Archivo | **Barlow Condensed** | **Newsreader** (serif) |
| En büyük tipografi | 58px Archivo | **86px Barlow Condensed** | **76px Newsreader** |
| Baskın gövde boyutu | **10px** (mono etiket) | 11–13px | 9,5–11px |
| Sayfa yüksekliği (yönetici özeti) | 1208px | 1145px | 1640px |
| Fotoğraf | **yok** (0 img) | **var** (7 img + harita) | dipnot ölçeğinde (0–1 img) |
| Yarıçap ≠ 0 | 0 | 0–2 (yalnız daire) | 0–1 (yalnız daire) |
| Karakter | enstrüman · kontrol odası | saha · coğrafya · fotoğraf | defter · editoryal · basılı |

Üçü de **radius 0**, **saç çizgisi ile kompozisyon**, **mono/tabular sayı** ve
**kart-içinde-kart yok** disiplinini paylaşır. Ayrıştıkları yer zemin sıcaklığı,
görüntü ailesi, fotoğraf rolü ve **navigasyon felsefesidir**.

---

## 1 · Kabuk / navigasyon — üç ayrı felsefe

Bu, üç yön arasındaki **en maddi fark**. Tek bir kabuğa indirgenemez; her yön
kendi kabuğunu taşır.

### A — 52px kapsam çubuğu + 60px ikon rayı
```
header  h=52  bg #101416  border-b #262C2E
  [60px boş blok — rayla hizalanır] │ KAPSAM grubu │ ÇERÇEVE grubu │ arama │ kullanıcı
nav     w=60  bg #101416  border-r #262C2E
  öğe h=40 · monogram üstte · 8px mono etiket altta
  aktif: bg #181D1F + kehribar sol kenar
  6. öğeden sonra 33px boşluk → yönetim ayracı
main    flex-1
foot    h=30  sayaçlar solda · klavye ipucu sağda
```
Ray **daralmaz, genişlemez** — sabit bir donanım paneli gibi davranır.
Kapsam çubuğu `KAPSAM · <tüzel kişi> · <santral>` kırılımını, çerçeveyi ve
veri kesiti damgasını taşır.

### B — 56px yatay sekme çubuğu, ray YOK
```
header h=56  bg #0A0C0D  border-b #1C2123
  marka (Barlow Condensed 19px/700) │ 5 yatay sekme │ arama │ zaman damgası │ avatar
main
  hero  h=648  <img absolute inset-0> + .veil gradyan + sol aside 430px + sağ aside 320px
  şerit h=203  34px başlık satırı + grid-cols-6 (fotoğrafik santral seçici)
  alt   h=238  430px | flex-1
```
Gezinme **kısmen mekânsaldır**: kullanıcı menüden değil haritadan ve fotoğraf
şeridinden seçer. `.veil` yatay bir gradyandır (`#0A0C0D` → %26 `.94` → %52
`.35` → `.8`) ve fotoğrafın üstündeki metnin okunabilirliğini fotoğrafa
dokunmadan sağlar.

### C — künye + serif sekmeler + editoryal dizin sütunu
```
header px-14 pt-7 pb-4  (zemin sayfanın kendisi)
  marka "Zorlu Enerji Yönetişim Platformu" (Newsreader 26px) + mono alt başlık │ tarih · arama · avatar
rule   border-top 2px #1A1A18          ← künye kuralı (kalın)
nav    px-14 py-3 · Newsreader 15px sekmeler · aktif = altı çizili
rule   1px #D6D2CA
main   px-14 pt-9 pb-16
  aside w=212  DİZİN: bölüm + sağa hizalı sayaç + ince kural
                OKUMA ANAHTARI (glif efsanesi) burada yaşar
  içerik flex-1
```
Dizin sütunu aynı anda **içindekiler tablosu ve kaynakçadır**: kapsam ve veri
kesiti bilgisini de taşır.

---

## 2 · Tablo grameri

| | A | B | C |
|---|---|---|---|
| Satır yüksekliği | ~28px (sıkı) | ~34px | ~38px |
| Kolon başlığı | 8,5px mono, harf aralığı 0.18em | 9px mono | 9,5px mono `.lbl` |
| Sayı hizası | sağ, tabular | sağ, tabular | sağ, tabular |
| Satır ayracı | 1px `#262C2E` | 1px `#1C2123` | 1px `#E4E1DB` |
| Zebra | **yok** | yok | yok |
| Seçili satır | kehribar sol kenar | bakır sol kenar | oxblood sol kenar |

`a-assets` alt tablosu ölçülen kolon düzeni:
`ETİKET(mono) · VARLIK · TİP · BÖLGE · KRİTİKLİK · ZAFİYET · DESTEK SONU · UYUM`.
Kritiklik ve uyum **sözcükle** yazılır (renk tek kanal değil).

---

## 3 · Matris grameri — iki ayrı kodlama

### A · şekil-tabanlı (kare ailesi)
`a-compliance` ölçümü — satır = kontrol, sütun = santral:

| Durum | Glif |
|---|---|
| uygun | **dolu kare** (yeşil) |
| kısmi | **içi boş kare** |
| uygunsuz | **dolu kare** (kırmızı) |
| değerlendirilmedi | **noktalı kare** |
| kapsam dışı | **tire** |

Seçili hücre kehribar halka alır. Satır sonunda **AKS YOĞUNLUĞU** mini yığılmış
çubuk. Aile başlıkları (`A.5 · ORGANİZASYONEL KONTROLLER`) mono büyük harf.
Matrisin altında **santral endeksi** satırı (81 / 64 / 85 / 91 / 55 / 79).

### C · glif ağırlığı (daire ailesi)
`c-compliance` ölçümü:

| Durum | Glif |
|---|---|
| uygun · kanıt güncel | **●** dolu daire |
| kısmen uygun | **○** içi boş daire |
| uygunsuz | **⊖** üzeri çizili |
| değerlendirilmedi | **◌** noktalı |
| kapsam dışı | **–** tire |

Efsane sol dizin sütununda **OKUMA ANAHTARI** olarak yaşar — arayüzün parçası,
dipnot değil.

**Her iki kodlama da renk-bağımsızdır.** Bu, orijinal tasarımın kendi kararıdır
ve §3'teki "status yalnız renkle verilmez" düzeltmesi zaten karşılanmıştır.

---

## 4 · Detay davranışı — üç ayrı model

| Yön | Model | Ölçülen genişlik |
|---|---|---|
| **A** | sağ **bağlam paneli** (kalıcı, kapanmaz) | 420px |
| **B** | alt **levha** | tam genişlik |
| **C** | **satır içi genişleme** — defteri terk etmeden | satırın kendisi |

C'nin satır içi genişlemesi dört sütun taşır:
`NEDEN UYGUNSUZ · KANIT DOSYASI · YÖNETİŞİM ZİNCİRİ · SORUMLULUK VE SÜRE`
ve iki eylem düğmesi. Bu, ürünün bugünkü 420px çekmecesinden **farklı bir
etkileşim modelidir** ve C rotalarında çekmece yerine bu uygulanır.

---

## 5 · İlişki / graf grameri

| Yön | Model |
|---|---|
| **A** | **katmanlı sütunlar** — SANTRAL → SİSTEM/SERVİS → VARLIK → ZAFİYET → RİSK → KONTROL → PROJE/CAPA. Aktif zincir kehribar, kesikli bağlayıcılarla; zincir dışı kartlar sönümlenir. Serbest force-directed **değil**. |
| **B** | **akış kurdelesi** (Sankey) — varlık → zafiyet → risk → CAPA → proje |
| **C** | **yay diyagramı** — tek taban çizgisi; üstteki yaylar yönetişim zinciri, alttakiler yapısal bağlam |

A'nın sağ paneli ayrıca **BAĞIMLILIK ETKİ YARIÇAPI** taşır: 1./2./3. derece
komşuluk sayıları yatay çubuklarla (4 / 17 / 61).

---

## 6 · Rota → prototip eşlemesi

### B — Energy Intelligence
| Rota | Kanonik prototip |
|---|---|
| `/` | `b-executive.html` |
| `/tesisler` | `b-executive.html` (fotoğrafik şerit bölümü) |
| `/tesisler/[id]` | `b-plant360.html` |
| `/portfoy` | `b-executive.html` (harita + strata) |
| `/giris` | `b-*` dili, sadeleştirilmiş tek sahne |

### A — Industrial Precision
`/envanter` → `a-assets.html` · `/topoloji` `/omur` `/yedekleme` `/kimlik`
`/yetkiler` `/tedarikciler` `/olaylar` `/operasyon` `/saglik`
`/saglik/reddedilenler` `/ice-aktarim` `/varlik-aktarim` `/kesif` `/esleme`
`/bildirimler` → `a-executive.html` + `a-assets.html` grameri

### C — Operational Luxury
`/uyum` `/uyum/[cerceve]` → `c-compliance.html` ·
`/riskler` `/riskler/[id]` `/denetimler` `/denetimler/[id]` `/bulgular`
`/bulgular/[id]` `/projeler` `/surecler` `/surecler/[id]` `/regulasyonlar`
`/raporlar` `/raporlar/kanit-paketi` `/eslestirme` `/aktivite` →
`c-executive.html` + `c-compliance.html` grameri ·
`/yonetim-tezgahi` → C künyesi + A işlem yoğunluğu

---

## 7 · Prototipte DÜZELTİLECEK kusurlar

Orijinal görsel karakter korunur; aşağıdakiler körü körüne kopyalanmaz.

| # | Prototipteki durum | Düzeltme |
|---|---|---|
| 1 | `a-assets` sağ panelinde uzun düğüm adları üst üste biniyor (ölçüldü: `RTU-` metni "A.8.24 Kriptografi" kartının altında kalıyor) | Gerçek veri uzunluklarında taşma testi; panel içeriği kırpma yerine sarma |
| 2 | Prototipler tek ekran genişliğinde (1440) tasarlandı | 1366 / 1280 / tablet davranışı eklenir; hiçbir rota erişilemez olamaz |
| 3 | Fotoğraflar kurgusal santrallere ait | Fotoğrafı olmayan santral için **tanımlı fallback** — sahte "canlı tesis görseli" uydurulmaz |
| 4 | Klavye gezinme yalnız ipucu metninde ("ALT+OK tuşları ile hücreler arasında gezin") | Gerçekten uygulanır: matris hücreleri odaklanabilir, `aria-current` tekil, Esc geri verir |
| 5 | `focus-visible` tanımsız | Her etkileşimli öğeye görünür odak halkası |
| 6 | Hareket koşulsuz (`.scan`, `.ring`, `.fadein`) | `prefers-reduced-motion: reduce` altında durur |
| 7 | Kontrast ölçülmemiş | `arac/kontrast.mjs` ile WCAG AA kapısı; metin 4,5:1 |
| 8 | Kurgusal veri hep dolu | `UNKNOWN ≠ FALSE ≠ ZERO`: ölçülmemiş alan "—", sıfır değil |
| 9 | Bağlantı durumu kurguda hep sağlıklı | `kimlik_bekleniyor` / `yapılandırılmamış` / `bilinmiyor` / `hatalı` ayrımı korunur; bağlanmamış kaynak asla "canlı" gösterilmez |
| 10 | 6 santral × 14 kontrol | Gerçek yoğunluk: 40+ satır, yüzlerce hücre; gerekirse erişilebilir sticky başlık |

---

## 8 · Değişmeyecek katmanlar

Prisma şeması ve göçler · `lib/eylemler2` · `lib/motorlar` · `lib/entegrasyon` ·
`lib/api` · auth · RBAC · santral/süreç kapsamı · denetim izi ·
zamanlayıcı/kuyruk/kilit · connector sözleşmeleri · uygulanabilirlik, risk,
denetim ve CAPA iş kuralları · `page.tsx → veri.ts → Istemci.tsx` veri
sözleşmesinin **davranışı**.

Presentation bileşenleri gerekirse tümüyle yeniden yazılır; iş mantığı aynı
kalır. Davranış taşıyan bir bileşen doğrudan silinmez — davranış önce yeni
presentation bileşenine taşınır.

---

## 9 · Yazı tipi tedariki

Tasarım altı aile istiyor ve ürün fontları **self-host** ediyor (statik dışa
aktarım + CSP; çalışma anında Google Fonts'a çıkış yok). Altı aile latin ve
latin-ext alt kümeleriyle indirildi — Türkçe (`ş ğ İ ı`) latin-ext'te:

`Inter Tight` · `Inter` · `IBM Plex Mono` · `JetBrains Mono` ·
`Barlow Condensed` · `Newsreader` — toplam 784 KB, `public/fontlar/`.

`Archivo` zaten depoda. Değişken eksen istendi (`wght@300..700`) ki tasarımın
kullandığı 400/500/600/700 ağırlıkları tek dosyadan çıksın; değişken sürümü
olmayan aileler (IBM Plex Mono, Barlow Condensed) ağırlık başına indirildi.

---

## 10 · Uygulama sonucu — ne yapıldı, nasıl ölçüldü

Bu bölüm haritanın PLAN kısmını değil, GERÇEKLEŞENİ kaydeder.

### 10.1 · Dört kanonik ekran (Faz A)

| Rota | Prototip | Yönü belirleyen materyal fark |
| --- | --- | --- |
| `/uyum` | `c-compliance.html` | Matris **devrik**: satır = kontrol, sütun = santral. Detay **çekmecede değil satır içinde** açılır (neden · kanıt · yönetişim zinciri · sorumluluk). Durum **glif ağırlığıyla** kodlanır; okuma anahtarı dizin sütununda arayüzün parçası. |
| `/` | `b-executive.html` | 648px fotoğrafik alan; solda 430px dikkat paneli, sağda 320px katman paneli; 168px kartlı saha şeridi; 430px takvim + akış bandı. |
| `/tesisler/[id]` | `b-plant360.html` | 560px hero plakası; solda künye + ölçü şeridi, sağda 420px veri paneli; sistem bandı; 560px üniteler + açık bulgular. |
| `/envanter` | `a-assets.html` | 42px kip çubuğu; **yedi halkalı yönetişim zinciri** (santral → sistem → varlık → zafiyet → risk → kontrol → proje); 400px düğüm paneli; 30px envanter kaynağı ayağı. |

Görsel parity, prototip ve uygulama 1440px ekran görüntülerinin yan yana
karşılaştırmasıyla doğrulandı: aynı kompozisyon dili, aynı yoğunluk, aynı
tipografi kademesi, aynı yüzey karakteri, aynı gezinme felsefesi, aynı
veri görselleştirme grameri.

### 10.2 · Prototipten AYRILAN noktalar ve nedenleri

Hepsi **veri dürüstlüğü** gerekçesiyle; hiçbiri estetik tercih değil.

1. **`b-executive` merkezindeki Türkiye haritası çizilmedi.** Şemada
   koordinat yok (`Tesis.konum` serbest metin). İşaretçileri göz kararı
   yerleştirmek, ekranda gerçek olmayan bir coğrafya çizmek olurdu. Aynı
   işaretçi grameri (45° kare, kritikte halka, iki satırlık künye) gerçek
   iki eksene oturtuldu: **uyum endeksi × kurulu güç**. Ölçülmemiş
   santral eksene konmaz, altta adıyla listelenir.
2. **`b-plant360`'ın "anlık üretim" ve "kullanılabilirlik" ölçüleri
   uydurulmadı** — gerçek üretim sistemine bağlanmadık. Yerlerine gerçek
   alanlar kondu: kayıtlı varlık, üretim ünitesi, ağ bölgesi.
3. **"Katmanlı durum" `Madde.alanAdi`ndan değil kontrol AİLESİNDEN
   kuruldu**: alan adı maddelerin çoğunda boş; `/uyum` ile aynı kırılım.
4. **Üretim zinciri kritiklik sırasına kondu**, prototipteki gibi
   soldan sağa akış olarak değil: şemada sistemler arası sıra yok ve
   uydurma bir akış, olmayan bir varlık ilişkisi iddia etmek olurdu.
   Sıralamanın ne olduğu başlıkta yazıyor.
5. **`a-assets`'in "CMDB SENKRON 04:12 · BAŞARILI" künyesi uydurulmadı**:
   ayak gerçek keşif kayıtlarının kaynaklarını ve son görülme zamanını
   yazar; kayıt yoksa "bağlı kaynak yok" der.
6. **Ünite tik şeridi çizilmedi**: `MaddeDurumu` ünite kırılımı taşımıyor.

### 10.3 · Prototipin ON kusuru — ne yapıldı

| # | Kusur | Çözüm |
| --- | --- | --- |
| 1 | Kritik bilgi yalnız hover'da | İpucu sözleşmesi korundu; devre dışı düğmenin NEDENİ yazılıyor, hata detayı açılır blokta, kesilen ad yerine sarma |
| 2 | Durum yalnız renkte | Glif ailesi (A kare, C daire); `Im` `role="img"` + erişilebilir ad; boş yığın "değerlendirilmemiş" yazar |
| 3 | Bilinmeyen = yanlış = sıfır | `uyumOzeti` tek formül; ölçülmemiş sütun "—", yığında taramalı dördüncü parça; risk ızgarasına olasılık/etki bilinmeyen risk GİRMEZ, ayrıca sayılır |
| 4 | Klavye gezinmesi yok | Hücre ve satır gerçek `<button>`; 68×31px hedef; Esc satırı kapatır; `arac/erisim.mjs` kapısı |
| 5 | `:focus-visible` tanımsız | `.ab :focus-visible { outline: 2px solid var(--aksan) }`; gerçek Tab tuşuyla ölçülüyor |
| 6 | Azaltılmış hareket yok | `prefers-reduced-motion` bloğu; kapı azaltılmış kipte çalışan animasyon arar |
| 7 | WCAG kontrastı ölçülmemiş | `arac/kontrast.mjs` — 3 kip × 14 mürekkep × 4 zemin + 1 ters çift; 12 kusur ölçülüp tonaliteyi koruyarak düzeltildi |
| 8 | Tek genişlik | 1440 · 1366 · 1280 · 1024 px'te 33/33 rota temiz |
| 9 | Uzun metin taşması | Başlık kesilmez sarar; `overflow-wrap: anywhere`; kırpılan halka "+N kayıt daha" der |
| 10 | 40+ satır yoğunluğu | `.ab-tablo.sik` satır dolgusunu daraltır, tipografiyi değil; matris yatay kayar |

### 10.4 · Kapılar

| Araç | Ne ölçer | Sonuç |
| --- | --- | --- |
| `arac/kontrast.mjs` | WCAG 2.1 oranları, kaynaktan okunan token'larla | 0 kusur |
| `arac/font-kontrol.mjs` | Her `/fontlar` başvurusu diskte var mı · her token ailesi `@font-face` ile bildirilmiş mi | 0 eksik / 0 bildirilmeyen |
| `arac/iz-tarama.mjs` | Ölü yol · eski sınıf · tanımsız token · ölü CSS kuralı | **ESKİ TASARIM İZİ: 0** |
| `arac/tarama.mjs` | 33 rota: HTTP · yatay taşma · kabuk · boş gövde · sayfa hatası · DOM'da eski sınıf | 0 kusurlu rota (4 genişlikte) |
| `arac/erisim.mjs` | Odak halkası (gerçek Tab) · klavyeyle ulaşılamayan hedef · azaltılmış harekette animasyon · adsız glif | 0 kusur |

`npm run tasarim:kapi` üçünü (kontrast · font · iz) tek komutta koşturur.

### 10.5 · Legacy purge (Faz C)

Silinen: `app/atlas.css` (978 satır), `app/tokens.css` (397 satır),
`components/atlas/` (12 dosya), Manrope ve Azeret yazı aileleri.
Taşınan (sunum değil, veri/varlık): `durumAyagiVerisi.ts`,
`lib/atlas/gorsel.ts → lib/gorsel.ts`, `lib/atlas/kontrast.ts → lib/kontrast.ts`.
Yeniden yazılan: `app/globals.css` (yalnız belge sıfırlaması), `/giris`
(`.ab[data-yon='b']`), `/sistem` (Atlas referansıydı; artık `kabuk.css`
dosyasını OKUYAN token referansı — değerleri iddia etmiyor).
