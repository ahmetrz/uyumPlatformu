# Tesis-dışı sektör uyum testi — model kâğıt üstünde bankacılığa oturuyor mu?

**Soru.** Ürün, bankacılık gibi regüle ama **tesis merkezli olmayan** sektörlere
açılacak. Bugünkü alan modeli `Tesis → OperasyonelBirim → Varlık` üzerine
kurulu. Bu varsayım kırılıyor mu, nerede kırılıyor?

**Yöntem.** Kod değiştirilmedi, göç açılmadı. Şema ve kod **ölçüldü** (komutlar
her tablonun altında), dört aday çerçevenin **yapısı** kamuya açık kaynaktan
çıkarıldı (madde metni kopyalanmadı, madde yazılmadı), her yapısal öğe bugünkü
modele tek satırla oturtuldu. Erişilemeyen kaynak "erişilemedi" diye yazıldı;
bellekten tamamlanan her sayı ayrıca işaretlidir.

**Ölçüm tabanı.** `origin/main` @ `c6242f6` (8 Eylül 2026) · `web/prisma/schema.prisma`
150 model · 45 göç · `lib app components` altında 673 `.ts/.tsx`.

---

## 1 · Mevcut model — taşıyıcı eksen

### 1.1 Kapsam ağacı

Vizyon (`docs/URUN_VIZYONU.md` §çekirdek): *Kiracı → Grup → Tüzel Kişi →
Tesis → Birim → Sistem → Varlık*. Şemada bugün:

```
Grup ─┐
      ├─ TuzelKisi ─┐
                    ├─ Tesis ─┬─ OperasyonelBirim ─┬─ SistemServis ─┬─ Varlik
                    │         │                    └─ Varlik        │
                    │         ├─ SistemServis ──────────────────────┘
                    │         ├─ IsSureci ── IsSureciSistemi ── SistemServis
                    │         ├─ TesisTipi (← Sektor)   TesisOzellik (← SektorOznitelikSemasi)
                    │         └─ TesisProfili (enerji kolonları)
```

`Kiraci` **yok** (P2). `Sektor → TesisTipi → Tesis` hiyerarşisi ve sektör
öznitelikleri (`SektorOznitelikSemasi` → `TesisOzellik`) tesise asılıdır.

### 1.2 Uyum zinciri

```
Regulasyon ── Madde (kendine referanslı hiyerarşi · FrameworkSurumu · zorunlulukTipi)
     │
     ├─ UyumSureci (regülasyon × dönem)
     │      ├─ SurecKapsami  = süreç × TESİS            tesisId ZORUNLU
     │      └─ MaddeDurumu   = süreç × madde × TESİS    tesisId ZORUNLU · @@unique
     │             ├─ Bulgu → Aksiyon
     │             ├─ KanitBaglantisi ← Kanit (+ KanitTesis: tesis ZORUNLU)
     │             ├─ KontrolTesti · DegerlendirmeTarihcesi
     │             └─ olgunlukSeviyesi (tesiste ÖLÇÜLEN; hedef Madde'de)
     ├─ UygulanabilirlikKurali (koşul = ÖZNİTELİK ANAHTARI)
     │      └─ UygulanabilirlikKarari = TESİS × regülasyon   tesisId ZORUNLU
     ├─ Istisna = madde × TESİS                              tesisId ZORUNLU
     ├─ UyumAnlik = süreç × tesis?                           opsiyonel
     └─ Denetim (süreç?) → DenetimKapsami (tesis? · madde?)  opsiyonel
```

**`MaddeDurumu` hangi eksende tutuluyor:** `(surecId × maddeId × tesisId)`,
üçü zorunlu, tekil kısıt. Sistemin en sık okunan tablosu budur ve uyum
yüzdesi, karne, portföy endeksi bu tablodan tesis başına toplanır.

**Kapsam / uygulanabilirlik neye asılı:** süreç kapsamı bir **tesis
kümesidir** (`SurecKapsami`); uygulanabilirlik kararı **tesis × regülasyon**dur
ve motor (`lib/motorlar/uygulanabilirlik.ts`) bağlamı **tesis profili +
`TesisOzellik`** özniteliklerinden üretir. Kural JSON'u bir öznitelik anahtarı
okur (`kuruluGuc >= 100`, `blackStart = true`, `teiasScadaEmsSeriOlmayan = true`
— `prisma/seed.ts:544`).

**Yetki (RBAC):** `Yetki = kullanıcı × süreç? × tesis? × tüzelKişi? ×
regülasyon? × modül?`; `lib/erisim.ts:34` `Kapsam = { tesisId, surecId,
regulasyonId }`; satır 38: *"tesise kısıtlı rol, kapsamsız (global) işlem
yapamaz"*; `izinliTesisIdleri()` boş dönerse "tümü" demektir.

### 1.3 Ölçüm — tesis ekseni ne kadar derin

| Ölçü | Sayı | Komut |
| --- | ---: | --- |
| `tesisId` **zorunlu** olan model | **12** | `awk '/^model /{m=$2} /^[[:space:]]+tesisId[[:space:]]+String([[:space:]]\|$)/{print m}' prisma/schema.prisma` |
| `tesisId` opsiyonel olan model | 22 | `awk '/^[[:space:]]+tesisId[[:space:]]+String\?/' … \| wc -l` |
| `Tesis` modelindeki ters bağ (ilişki) | 54 | `awk '/^model Tesis \{/{f=1} f&&/^\}/{f=0} f' … \| grep -cE …` |
| `birimId` / `sistemId` zorunlu model | **0** | aynı awk, `birimId\|sistemId` |
| Kodda `tesisId` geçen dosya | **203 / 673** | `grep -rlE tesisId lib app components --include=*.ts --include=*.tsx \| wc -l` |
| `maddeDurumu` okuyan/yazan dosya | 60 | `grep -rlE maddeDurumu …` |
| Kapsam kapısı (`kapsamKosulu\|izinliTesisIdleri`) | 68 | `grep -rlE 'kapsamKosulu\|izinliTesisIdleri' …` |
| `yetki` geçen dosya | 115 | `grep -rlE 'yetki\b' …` (prisma-client hariç) |
| `uygulanabilirlik` | 31 | `grep -rlE uygulanabilirlik …` |
| `surecKapsami` | 6 | |
| `TesisProfili` | 16 (8'i üretilmiş prisma-client) | |
| Profil alanına **adıyla** dokunan (`teiasScadaEms\|blackStart\|lisansTipi\|kritiklikSinifi`) | 15 | |
| `OperasyonelBirim` / `birimId` | 19 / 12 | |
| `sozlesme` · `sistemServis` · `agBolgesi` · `ekip` · `isSureci` · `tuzelKisi` | 48 · 11 · 19 · 18 · 6 · 15 | prisma-client hariç |

`tesisId` zorunlu 12 model: `TesisOzellik · SurecKapsami · MaddeDurumu ·
OperasyonelBirim · TesisProfili · DegerlendirmeAktarimi · DenetciKapsami ·
UygulanabilirlikKarari · Istisna · DokumanTesis · KanitTesis · EnvanterSayimi`.
Bunların **altısı uyum zincirinin kendisidir** (kapsam, durum, karar, istisna,
kanıt bağı, denetçi kapsamı).

### 1.4 Varsayımlar — açıkça

| # | Varsayım | Nerede çakılı |
| --- | --- | --- |
| V1 | **Her uyum durumu kaydının bir tesisi vardır.** | `MaddeDurumu.tesisId` zorunlu, tekil kısıtın parçası |
| V2 | Süreç kapsamı bir **tesis kümesidir**. | `SurecKapsami` = süreç × tesis; kapsama tesis eklenince o tesise bütün yaprak maddeler açılır (`ICERIK_MODELI.md`) |
| V3 | Uygulanabilirlik **tesis × regülasyon** kararıdır ve **tesis özniteliklerinden** hesaplanır. | `UygulanabilirlikKarari`, motor bağlamı `TesisProfili + TesisOzellik` |
| V4 | İstisna **tesise** verilir. | `Istisna.tesisId` zorunlu |
| V5 | Yetki kapsamı **tesis eksenlidir**; tesissiz yetki "tümü"dür. | `Yetki.tesisId?`, `erisim.ts:38,111` |
| V6 | Varlık, sistem ve iş süreci **tesisin altındadır**; ekranlar tesis üzerinden gezer. | `Varlik.tesisId?` ama `/tesisler/[id]` → varlık/uyum/risk/olay; portföy = tesis listesi |
| V7 | Tesisin bir **sektör tipi** ve **sektör öznitelikleri** vardır. | `TesisTipi.sektorId`, `TesisOzellik` |
| V8 | Tesisin **enerjiye özgü profili** vardır. | `TesisProfili`: `teiasScadaEms`, `blackStart`, `lisansTipi`, `kritiklikSinifi` (EPDK) — **çekirdekte sektör sabiti, §0.5 ihlali bugün** |
| V9 | Uyum anlık görüntüsü ve karne **tesis başına** toplanır. | `UyumAnlik(surec, tesis?)`, `raporlar/karne` "en zayıf beş tesis" |
| V10 | Kanıt tesise bağlanabilir; denetçi kapsamı tesistir. | `KanitTesis`, `DenetciKapsami` tesis zorunlu |
| V11 | İş sürecinin etkisi **"üretim etkisi"**dir. | `IsSureci.uretimEtkisi` — sözlükte değil, enum çekirdekte (`grep uretimEtkisi lib/dil/terimler.ts` → 0) |

Kurumun kendisi bugün **bir tesis olarak** modellenmiştir: enerji seed'inde
`MERKEZ-BT`, su seed'inde `SU-MERKEZ-BT` (yayın çıktısı: portföyde "Merkez BT
1" iki sektörde de; karne başlığı "DEMOENERJİ GENEL MÜDÜRLÜK" / "DEMOSU GENEL
MÜDÜRLÜK"). Yani **"kurum = tesis" zorlaması bugün, tesis-merkezli
sektörlerde bile yapılıyor** — 25 tesisin 2'si tesis değil, kurum.

---

## 2 · Aday çerçeveler — yalnız yapı

Kaynak erişimi 8 Eylül 2026, oturumun ağ vekili üzerinden. Metin
kopyalanmadı; madde yazılmadı.

| Çerçeve | Kaynak · erişim | Yükümlülük neye asılı | Zorunlu nesneler | Kanıt türleri |
| --- | --- | --- | --- | --- |
| **BDDK — Bankaların Bilgi Sistemleri ve Elektronik Bankacılık Hizmetleri Hakkında Yönetmelik (2020)** | **Birincil erişilemedi:** mevzuat.gov.tr (No 34211 ve 34360) ve resmigazete.gov.tr → HTTP 503 (3 deneme); TBB PDF bağı → gezinme sayfası döndü. **Yapı ikincil kaynaklardan** (TBB duyurusu, Erdem&Erdem, Güner, ProCompliance notları — bkz. kaynaklar). | Banka (kurum) · yönetim kurulu ve **komiteler** (BS strateji komitesi, BS yönlendirme komitesi) · bilgi sistemi/varlık · **dış hizmet sağlayıcı** · veri (sınıflandırma; birincil/ikincil sistem ayrımı ikincil kaynaklarda anılır — **doğrulanamadı**) · süreç (geliştirme/değişiklik) | 7 bölüm: BS yönetişimi · BS risklerinin yönetilmesi · bilgi güvenliği yönetimi · sistem geliştirme ve değişiklik yönetimi · süreklilik ve erişilebilirlik · dış hizmet alımı · iç kontrol ve iç denetim (+ elektronik bankacılık kısmı). Nesneler: BS strateji planı, komiteler, varlık/sistem envanteri, risk değerlendirmesi, süreklilik planı, dış hizmet sözleşmesi ve denetim hakkı, denetim izleri; sızma testi ikincil kaynaklarda anılıyor — **doğrulanamadı** | Politika/plan belgeleri, komite kararları, risk değerlendirme raporu, test ve denetim raporları, sözleşmeler, denetim izi kayıtları |
| **DORA — (EU) 2022/2554** | **Birincil erişildi** (EUR-Lex CELEX:32022R2554) | **Finansal kuruluş** · BİT sistemi/varlığı · **kritik veya önemli iş fonksiyonu** · **BİT üçüncü taraf hizmet sağlayıcı** (kritik olanlar ayrı gözetim) · yönetim organı · veri (erişilebilirlik/bütünlük/gizlilik) | BİT risk yönetimi çerçevesi · **sözleşme kayıt defteri** (register of information) · olay sınıflandırma ve raporlama · dayanıklılık test programı (TLPT) · süreklilik/kurtarma planı (RTO/RPO) · kritik fonksiyon → destekleyen BİT hizmeti haritası · SLA · çıkış stratejisi | Politika belgeleri · standart veri setli olay raporları · test sonuçları ve attestation · denetim raporları · sözleşmeler (zorunlu hükümlerle) · kayıt defteri · süreklilik planı · olay sonrası inceleme · yönetim organı kararları · zafiyet analizleri |
| **PCI DSS v4.x** | **Birincil erişilemedi:** pcisecuritystandards.org PDF → HTTP 403. **Yapı ikincil kaynaktan** (Wikipedia). | **Sistem bileşeni** · **kart verisi ortamı (CDE)** ve ağ segmenti · üye işyeri / hizmet sağlayıcı (seviyeli) · üçüncü taraf işleyici · süreç ve personel | 12 gereksinim / 6 hedef grubu · **kapsam tanımı** · sistem bileşeni envanteri · ağ ve veri akış diyagramları · telafi edici kontroller (hedefli risk analizi v4'te var — **bellekten, ikincil kaynakta yok**) | SAQ · ROC (QSA) · AOC · ASV taraması · sızma testi |
| **COBIT 2019** | Birincil (ISACA sayfası) yapı ayrıntısı vermiyor; ikincil kaynaklar: 5 alan · 40 hedef (EDM 5 · APO 14 · BAI 11 teyit; **DSS/MEA sayıları teyit edilemedi** — 6 ve 4 bellekten) · 7 bileşen | **Kurum** (yönetişim sistemi) · **süreç** · organizasyon yapısı · bilgi öğesi · kişi/beceri · politika · kültür · hizmet/altyapı/uygulama (7 bileşen). Mevzuat değil, çerçeve: yükümlülük değil hedef | 40 yönetişim/yönetim hedefi (EDM/APO/BAI/DSS/MEA) · tasarım faktörleri · hedef kaskadı | **Yetenek seviyeleri** (0–5) · metrikler · değerlendirme |

Ortak nokta: **dördü de yükümlülüğü tesise asmaz.** Özne kurum, sistem/bileşen,
iş fonksiyonu/süreç, dış hizmet sağlayıcı ve organizasyon birimidir. "Tesis"
(lokasyon) hiçbirinde birincil eksen değildir; PCI'da bile eksen fiziksel yer
değil, veri ortamı ve bileşendir.

---

## 3 · Oturtma testi

OTURUYOR = kavram ve yapı karşılıklı · ZORLAMA = teknik olarak yapılabilir,
kavramsal olarak yanlış · OTURMUYOR = karşılığı yok ya da yapı tersine.

| # | Çerçeve öğesi | Bugünkü modelde karşılığı | Karar | Gerekçe |
| --- | --- | --- | --- | --- |
| 1 | **Kurum düzeyinde yükümlülük** (BDDK banka; DORA finansal kuruluş; COBIT enterprise) | `MaddeDurumu` tesis ister → kurumu temsil eden bir "merkez tesisi" | **ZORLAMA** | Bugün enerji/su seed'i de bunu yapıyor (`MERKEZ-BT`). Bankada portföy tek düğüme çöker; karne "en zayıf beş tesis" anlamsızlaşır |
| 2 | **Bilgi sistemi / BİT varlığı / sistem bileşeni** | `SistemServis`, `Varlik` (tesisId? · birimId? · sistemId?) | **OTURUYOR** (envanter) / **ZORLAMA** (uyum öznesi olarak) | Varlık envanteri sistemsiz-tesissiz yaşayabilir; ama uyum durumu **sisteme asılamaz** — `MaddeDurumu` yalnız tesis bilir |
| 3 | **Kritik/önemli iş fonksiyonu** (DORA) | `IsSureci(tesisId?, uretimEtkisi)` + `IsSureciSistemi` | **ZORLAMA** | Fonksiyon → BİT hizmeti haritası var; ama "üretim etkisi" enerji semantiği (V11) ve fonksiyon uyum öznesi değil |
| 4 | **Dış hizmet sağlayıcı / sözleşme kayıt defteri** (DORA register; BDDK dış hizmet alımı) | `Tedarikci`, `Sozlesme(baslangic, bitis, slaOzeti, guvenlikSartlariVar)`, `TedarikciErisimOturumu` | **ZORLAMA** | Kayıt defteri alanları yok: desteklenen kritik fonksiyon, ikame edilebilirlik, alt yüklenici zinciri, veri konumu, çıkış stratejisi; tedarikçiye uyum durumu asılamaz |
| 5 | **Veri kapsamı / CDE / veri sınıflandırması** (PCI; BDDK; DORA) | `Varlik.gizlilik/butunluk/erisilebilirlik`, `AgBolgesi(tesisId?)` | **ZORLAMA** | CDE = ağ segmenti + veri akışı kapsamı; `AgBolgesi` tesise asılı, veri akış diyagramı/akış nesnesi yok |
| 6 | **Komite / organizasyon birimi** (BDDK komiteler; COBIT organizasyon yapıları) | `Ekip(tesisId?)`, `TuzelKisi`, `Grup` | **ZORLAMA** | `Ekip` operasyoneldir; komite/rol sahipliği (BS strateji komitesi kararı) için nesne yok |
| 7 | **Süreç uyum öznesi olarak** (COBIT süreç; BDDK geliştirme/değişiklik süreci) | `IsSureci`, `ProsesAdimi` (tesisin altında) | **OTURMUYOR** | COBIT'te APO12 gibi bir süreç değerlendirilen öznedir; modelde süreç tesisin alt öğesi, `MaddeDurumu` ona bağlanamaz |
| 8 | **Kapsam tanımı** (PCI scope; DORA kapsam; BDDK BS kapsamı) | `SurecKapsami` = tesis kümesi | **OTURMUYOR** | Kapsam bileşen/segment/fonksiyon kümesidir; tesis kümesi değil (V2) |
| 9 | **Uygulanabilirlik / orantılılık** (DORA basitleştirilmiş çerçeve; BDDK ölçek) | `UygulanabilirlikKarari(tesis × regülasyon)`, kural öznitelik anahtarı okur | **ZORLAMA** | Motor öznitelik-anahtarı tabanlı → kurum özniteliği (çalışan sayısı, aktif büyüklüğü) `TesisOzellik`e yazılırsa çalışır; ama özne "tesis" değil kurum olur (madde 1) |
| 10 | **Olay sınıflandırma ve raporlama** (DORA; BDDK bildirim) | `Olay`, `BildirimYukumlulugu(regülasyon)`, `OlaySistem/OlayVarlik` | **OTURUYOR** | Eşik/taksonomi paket verisi; olay tesissiz yaşayabilir (`Olay.tesisId?`) |
| 11 | **Dayanıklılık / sızma testi / TLPT** (DORA; PCI 11) | `KontrolTesti(maddeDurumu)`, `Zafiyet`, `VarlikZafiyeti` | **OTURUYOR** (kayıt) / **ZORLAMA** (asıldığı yer) | Test kaydı `MaddeDurumu`'na → tesis eksenli |
| 12 | **Süreklilik planı, RTO/RPO** (DORA; BDDK) | `YedeklemePolitikasi(tesis)`, `GeriYuklemeTesti` | **ZORLAMA** | Sistem/fonksiyon başına RTO/RPO alanı yok; politika tesis başına |
| 13 | **Kanıt türleri** (politika · rapor · sözleşme · test sonucu · attestation) | `Kanit.tip` (politika \| kayit \| konfigurasyon \| … \| sozlesme \| test_sonucu), tazelik, hash, sürüm | **OTURUYOR** | Sektörsüz |
| 14 | **Denetim / attestation** (ROC/AOC/SAQ; DORA denetim raporu) | `Denetim(tip)`, `DenetimKapsami(tesis? · madde?)`, `KanitTalebi`, `DenetciErisimi` | **OTURUYOR** | Kapsam ekseni opsiyonel — tek esnek yer |
| 15 | **Yönetim organı kararları** (DORA management body; BDDK YK; COBIT EDM) | `YonetimGozdenGecirme`, `GozdenGecirmeKarari` | **OTURUYOR** | |
| 16 | **Yetenek / olgunluk seviyesi** (COBIT) | `MaddeDurumu.olgunlukSeviyesi` (ölçülen), `Madde.olgunlukSeviyesi` (hedef) | **OTURUYOR** / **ZORLAMA** | Ölçüm tesis başına; kurumda tek tesis → tek ölçüm, çalışır ama eksen yanlış |
| 17 | **Regülasyon iç hiyerarşisi, sürüm, fark** | `Madde` hiyerarşi, `FrameworkSurumu`, `SurumFarki`, `zorunlulukTipi` | **OTURUYOR** | PCI = CONTRACT, COBIT = BEST_PRACTICE zaten enumda |
| 18 | **Çerçeveler arası eşleme** (COBIT↔ISO↔DORA↔BDDK) | `MaddeEslestirmesi(tam \| kismi \| ilgili)` | **OTURUYOR** | |
| 19 | **Sektör tipi / öznitelik** | `TesisTipi`, `SektorOznitelikSemasi`, `TesisOzellik` | **ZORLAMA** | Bankada "tesis tipi" şube / veri merkezi / genel müdürlük olur — hiçbiri uyum öznesi değil |
| 20 | **Enerji profili** | `TesisProfili` (TEİAŞ SCADA/EMS, black start, EPDK kritiklik, lisans) | **OTURMUYOR** | Çekirdekte sektör sabiti (V8); bankada anlamsız, su için de büyük ölçüde anlamsız |
| 21 | **Yetki kapsamı** | `Yetki(tesis? · süreç? · regülasyon? · tüzelKişi?)` | **ZORLAMA** | Bankada kapsam sistem / iş birimi / hizmet olur; tesissiz yetki "tümü" sayılır → aşırı yetki (`erisim.ts:111`) |
| 22 | **Tüzel kişi / grup** | `TuzelKisi`, `Grup` | **OTURUYOR** | Banka grubu / iştirak |
| 23 | **Yükümlülük tipi ve bildirim** | `Madde.zorunlulukTipi`, `BildirimYukumlulugu` | **OTURUYOR** | |

**Sayım:** 23 öğe → **OTURUYOR 10 · ZORLAMA 10 · OTURMUYOR 3** (iki öğe çift
işaretli; ilk işaret sayıldı). Oturanların tamamı **uyum zincirinin
çevresindedir** (kanıt, denetim, olay, karar, eşleme, hiyerarşi);
**zincirin omurgası** — kapsam, durum, uygulanabilirlik, istisna, yetki —
ya zorlama ya oturmuyor.

---

## 4 · Boşluk listesi

Her satır: ne eksik · en küçük değişiklik · **ölçülen** dosya sayısı · göç.
Dosya sayıları `grep -rlE … lib app components --include=*.ts --include=*.tsx`
ile alındı (üretilmiş `lib/prisma-client` hariç tutulduğu yerde belirtildi).

| # | Boşluk | En küçük değişiklik | Dosya (ölçüm) | Göç |
| --- | --- | --- | --- | --- |
| B1 | **Uyum öznesi tesise çakılı** (V1–V4, oturtma 1·7·8·9) | Kapsam öznesi soyutlaması: `KapsamOgesi { id, tur: tesis \| sistem \| is_fonksiyonu \| dis_hizmet \| organizasyon_birimi \| veri_kapsami \| kurum, ad, ustId? }`; `MaddeDurumu.tesisId → kapsamOgesiId`, aynı değişiklik `SurecKapsami · Istisna · UygulanabilirlikKarari · KanitTesis · DenetciKapsami · DegerlendirmeAktarimi`; tekil kısıtlar yeniden | `maddeDurumu` **60** + kapsam kapısı **68** + `uygulanabilirlik` **31** + `surecKapsami` 6 — birleşim `tesisId` geçen **203** dosyanın altında; üst sınır 203 | **1 şema göçü** (yeni tablo + 7 modelde FK ve tekil kısıt) + **1 veri göçü** (her `Tesis` → `KapsamOgesi(tur=tesis)`; mevcut kayıtlar yeniden bağlanır). Geri dönülemez sınıf: **ürün kararı ister** |
| B1' | *Alternatif, en ucuz:* "kurum" tesisi | Hiç değişiklik yok; banka tek `Tesis` ile açılır | **0** | 0 — ama oturtma 1: kavramsal yanlış, portföy/karne/harita anlamsız; enerji seed'i bile bunu yapıyor ve o yüzden `MERKEZ-BT` bir "tesis" olarak sayılıyor |
| B2 | **`TesisProfili` enerji kolonları çekirdekte** (V8, oturtma 20) | Profil kolonları → `TesisOzellik` satırları + `SektorOznitelikSemasi` girdisi (enerji paketi); kural motoru zaten anahtar okuyor (`blackStart`, `teiasScadaEms` kuralı `seed.ts:544`) | `TesisProfili` **16** (8 el yazımı: `yonetim/moduller`, `eylemler2/tesis360`, `sabitler`, `motorlar/olayEtki`, `entegrasyon/zincir`, `tesisler/[id]/{mantik,OtProfili,Tesis360}`); alan adıyla **15** | 1 şema göçü (tablo düşer) + 1 veri göçü (kolon → satır). **B1'den bağımsız; §0.5 borcudur, bankadan önce enerji için de gerekli** |
| B3 | **Dış hizmet kayıt defteri** (oturtma 4) | `Sozlesme`'ye alanlar: `kritikFonksiyonDestegi`, `ikameEdilebilirlik`, `altYuklenici`, `veriKonumu`, `cikisStratejisi`; `SozlesmeFonksiyon(sozlesme × isSureci)` bağı | `sozlesme` **48** (prisma-client hariç) | 1 şema göçü, veri göçü yok (yeni alanlar null = ölçülmedi) |
| B4 | **İş fonksiyonu kritikliği ve sektörsüz etki** (V11, oturtma 3) | `IsSureci.uretimEtkisi` → `etki` (sözlük anahtarı `etki`; enerji "üretim etkisi", banka "hizmet kesintisi etkisi") + `kritik: Boolean?` | `isSureci` **6** | 1 şema göçü (kolon yeniden adlandırma) |
| B5 | **Sistem/fonksiyon başına RTO/RPO** (oturtma 12) | `SistemServis.rtoDk?`, `rpoDk?` (null = ölçülmedi) | `sistemServis` **11** | 1 şema göçü, veri yok |
| B6 | **Komite / organizasyon birimi** (oturtma 6) | `Ekip.tur: operasyonel \| komite \| birim` + `Ekip.tesisId` opsiyonel kalır; komite kararı `GozdenGecirmeKarari`'na `ekipId` | `ekip` **18** | 1 şema göçü |
| B7 | **Veri kapsamı / akış** (oturtma 5) | `AgBolgesi.tesisId` opsiyonel (zaten) + `VeriAkisi(kaynakSistem, hedefSistem, veriSinifi)` yeni tablo; CDE = `AgBolgesi` alt kümesi | `agBolgesi` **19** | 1 şema göçü (yeni tablo) |
| B8 | **Yetki kapsam ekseni** (V5, oturtma 21) | `Yetki.kapsamOgesiId` (B1 ile birlikte); `erisim.ts` Kapsam tipine `kapsamOgesiId` | `yetki` **115**, kapsam kapısı **68** | B1'in parçası; ayrı göç yok |

**Toplam en küçük yol (B1+B2+B8 omurga, B3–B7 çevre):** üst sınır ≈ 203 + 48 +
19 + 18 + 11 + 6 dosya (kesişimler var; üst sınır **305**, alt sınır 203) ·
**6–7 şema göçü · 2 veri göçü**. Bugünkü göç sayısı 45; artış ≈ %15.

**Ölçülemeyen:** B1'in ekran etkisi (portföy, karne, harita, tesis 360'ın
"kapsam öğesi 360"a dönüşmesi) dosya sayısıyla değil tasarımla ölçülür — bu
raporun kapsamı dışıdır.

---

## 5 · Önkoşul bağımlılığı — P4 ve P2 olmadan

"Yapılamaz" = teknik/lisans/ilke engeli; "yapılır ama pahalı" = seed'e gömerek
ya da elle çalışır, §0.5'i ihlal eder ya da tekrarlanır.

### P4 (içerik paketi) olmadan

| Parça | Durum | Neden |
| --- | --- | --- |
| BDDK yönetmeliğinin madde ağacı | **yapılır ama pahalı** | Bugün `Regulasyon · Madde` seed'de; içe aktarım (`/ice-aktarim`, admin onay kuyruğu) var. Seed'e yazmak mevzuat metnini depoya gömer (§0.5 + "kamuya açık resmî kaynak" kuralı; Türkçe resmî metin lisans engeli taşımaz) |
| **PCI DSS ve COBIT madde ağacı** | **YAPILAMAZ** | İkisi de telifli (PCI SSC lisansı; ISACA telifi). Metin depoya giremez; **imzalı, kiracıya kurulan paket** dağıtımı şart — P4'ün tam tanımı (`manifest.imza`, `lisansNotu`) |
| DORA madde ağacı + RTS eşikleri | yapılır ama pahalı | EUR-Lex metni açık; teknik standartlar (RTS/ITS) ayrı belgeler, sürümlenir → fark motoru (`SurumFarki`) paket olmadan elle beslenir |
| Bankacılık sözlüğü ("tesis" → ?) | yapılır ama pahalı | `SektorSozlugu` DB'de; seed'le kurulur (su sözlüğü böyle kuruldu). Ama bankacılık için "tesis"in karşılığı **yoktur** — sözlük sorunu değil, B1 sorunu |
| Kurum öznitelik şeması (çalışan sayısı, aktif büyüklüğü, ödeme kuruluşu türü) | yapılır | `SektorOznitelikSemasi` var; `TesisOzellik`e yazılır — ama tesis olmayan bir kurum için (B1) |
| Uygulanabilirlik kuralları (orantılılık) | yapılır ama pahalı | Kural JSON öznitelik okur; paket olmadan seed'e yazılır |
| Bildirim yükümlülükleri ve eşikleri | yapılır ama pahalı | `BildirimYukumlulugu(regülasyon)` var; eşikler seed'e |
| Demo verisi (kurgusal banka) | yapılır ama pahalı | P8 deseni; kurgusal ad bekçisi (`prisma/kurgusal-adlar.ts`) kapsamı otomatik büyür |

### P2 (çok kiracılılık) olmadan

| Parça | Durum | Neden |
| --- | --- | --- |
| Tek bankaya tek kurulum | **yapılır** | Bugünkü referans-kiracı modeli; enerji de böyle |
| Aynı kurulumda birden çok banka | **YAPILAMAZ** | `Kiraci` yok, `kiraciId` hiçbir tabloda yok, RLS yok; veri ayrımı imkânsız |
| Kiracı yapılandırması (ülke, para birimi, dil, saat dilimi) | **YAPILAMAZ** (kiracı başına) / yapılır (kurulum başına `Yapilandirma`) | DORA (AB, EUR) ile BDDK (TR, TRY) aynı kurulumda farklı kiracıya → P2 |
| Hub'dan paket dağıtımı ve güncelleme | **YAPILAMAZ** | `KiraciPaketi` P2+P4'ün kesişimi |
| Kiracı başına sektör paketi (banka + enerji aynı kurulumda) | **YAPILAMAZ** | `Kiraci.sektorPaketiKodu` P2 |

### Sıra bağımlılığı (ölçümden çıkan)

B1 (kapsam öznesi) P2 ve P4'ten **bağımsızdır** ama P2 her kiracıya ait
tabloya `kiraciId` ekleyecek: B1'in dokunduğu 7 model P2'nin de dokunacağı
modellerdir. **B1'i P2'den önce yapmak aynı tablolara iki göç yerine bir göç
demektir.** B2 (`TesisProfili`) ise P1/§0.5 borcudur ve bankadan bağımsız
olarak enerji için de gereklidir.

---

## 6 · Karşılaştırma — enerji ve su için aynı test

Aynı 23 öğenin özet sonucu (yalnız karar değişenler):

| Öğe | Enerji (EPDK-SYM · CBDDÖ · ISO 27001) | Su (CBDDÖ · ISO 27001) | Banka |
| --- | --- | --- | --- |
| 1 · Kurum düzeyi yükümlülük | **ZORLAMA** — `MERKEZ-BT` bir "tesis" (CBDDÖ/ISO 27001 kurum düzeyi) | **ZORLAMA** — `SU-MERKEZ-BT` aynı | ZORLAMA (tek tesis) |
| 2 · Sistem/varlık uyum öznesi | OTURUYOR — santral fiziksel özne, sistem altında | OTURUYOR — arıtma/terfi/depo fiziksel | ZORLAMA |
| 7 · Süreç uyum öznesi | oturuyor (gerek yok) | oturuyor (gerek yok) | OTURMUYOR |
| 8 · Kapsam = tesis kümesi | **OTURUYOR** — EPDK-SYM santral bazlı (lisans, kritiklik sınıfı); kapsam santral listesidir | **OTURUYOR** — CBDDÖ tesis bazlı denetim yapar; ISO 27001 BGYS kapsamı ise **kurum** → süreç 3 tesisi kapsıyor (zorlama gizli) | OTURMUYOR |
| 9 · Uygulanabilirlik | **OTURUYOR** — kural `kuruluGuc >= 100` tesis özniteliği | OTURUYOR — `gunlukDebi` tesis özniteliği | ZORLAMA |
| 19 · Tesis tipi | OTURUYOR — JES/RES/HES/GES (yayın: 7 hidro · 4 jeo · 3 rüzgâr · 1 güneş) | OTURUYOR — içme suyu · atıksu · terfi · depo (2·2·2·1) | ZORLAMA |
| 20 · `TesisProfili` | anlamlı ama **yanlış yerde** (§0.5) | **anlamsız** (TEİAŞ, black start, lisans tipi su için yok) | anlamsız |
| 21 · Yetki kapsamı | OTURUYOR — tesis yöneticisi rolü gerçek | OTURUYOR | ZORLAMA |

**Sayım:** enerji 20 OTURUYOR · 2 ZORLAMA · 1 OTURMUYOR (20. satır) · su 19 · 3 · 1
· banka 10 · 10 · 3. Tesis-merkezli varsayım **enerjide ve suda işe yarıyor
çünkü düzenleyici de tesise bakıyor** (EPDK lisans/kritiklik sınıfı santral
başına; CBDDÖ yerinde denetim tesis başına). Ama iki sektörde de **kurum
düzeyi çerçeveler** (ISO 27001, CBDDÖ'nün kurumsal maddeleri) bugün "merkez
tesisi" zorlamasıyla taşınıyor — yani B1 boşluğu bankaya özgü değil, bankada
**istisna olmaktan çıkıp kural** oluyor.

---

## Sonuç

**Model tesis-dışı sektörü bugünkü hâliyle taşımaz:** uyum zincirinin omurgası
(`SurecKapsami · MaddeDurumu · UygulanabilirlikKarari · Istisna · KanitTesis ·
Yetki`) tesise çakılıdır ve bankacılık yükümlülüğü kurum, sistem, iş fonksiyonu,
dış hizmet ve organizasyon birimine asılır; "kurum = tek tesis" zorlamasıyla
**çalıştırılabilir** ama kavramsal olarak yanlıştır — ve enerji/su seed'inin
bile bugün `MERKEZ-BT` ile yaptığı bu zorlama, kapsam öznesi soyutlamasının
(B1: 7 model · ≤203 dosya · 1 şema + 1 veri göçü) bankadan önce, P2'den
**önce** yapılması gerektiğini söyler.

---

## Kaynaklar ve erişim durumu (8 Eylül 2026)

| Kaynak | Durum |
| --- | --- |
| mevzuat.gov.tr — Bankaların BS ve EBH Hk. Yönetmelik (MevzuatNo 34211, 34360) | **erişilemedi** — HTTP 503 (2 deneme) |
| resmigazete.gov.tr/eskiler/2020/03/20200315-11.htm | **erişilemedi** — HTTP 503 |
| tbb.org.tr … /pdf/1300 | **erişilemedi** — gezinme sayfası döndü, belge yok |
| [TBB — yönetmelik duyurusu](https://www.tbb.org.tr/faaliyetler/teknoloji-ve-odeme-sistemleri/ilgili-duzenlemeler/pdf/1300) · [Erdem&Erdem notu](https://www.erdem-erdem.av.tr/tr/bankalarin-bilgi-sistemleri-ve-elektronik-bankacilik-hizmetleri-hakkinda-yonetmelik) · [Güner bilgi notu](https://www.guner.av.tr/articles/25-mart-2020) · [ProCompliance](https://www.procompliance.net/bankalarin-bilgi-sistemleri-ve-elektronik-bankacilik-hizmetleri-hakkinda-yonetmeligi-yayimlandi/) | ikincil — 7 bölüm yapısı ve komiteler buradan |
| [EUR-Lex CELEX:32022R2554 (DORA)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022R2554) | **birincil, erişildi** |
| pcisecuritystandards.org PCI-DSS-v4_0_1.pdf | **erişilemedi** — HTTP 403 |
| [Wikipedia — PCI DSS](https://en.wikipedia.org/wiki/Payment_Card_Industry_Data_Security_Standard) | ikincil — 12 gereksinim / 6 grup, doğrulama türleri |
| [ISACA — COBIT](https://www.isaca.org/resources/cobit) | birincil, erişildi ama alan başına sayı yok |
| [CyberArrow — 40 hedef](https://www.cyberarrow.io/blog/cobit-objectives-a-guide-to-the-40-cobit-2019/) (arama özeti; sayfa 403) · [Standarity](https://standarity.com/blog/cobit-2019-framework-explained) · [ManageEngine](https://www.manageengine.com/products/service-desk/itsm/what-is-cobit-2019.html) | ikincil — EDM 5 · APO 14 · BAI 11 · 7 bileşen; DSS/MEA sayısı **teyit edilemedi** |
| `web/prisma/schema.prisma` @ `c6242f6` · `lib/erisim.ts` · `lib/motorlar/uygulanabilirlik.ts` · `prisma/seed*.ts` · yayın çıktısı (`gh-pages` @ `Yayın: c6242f6`) | birincil ölçüm |
