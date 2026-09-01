# Entegrasyon ve Otomasyon — Kabiliyet Boşluk Matrisi

<!-- TARİHSEL ANLIK GÖRÜNTÜ -->
> **TARİHSEL ANLIK GÖRÜNTÜ — GÜNCEL DURUM DEĞİLDİR.**
>
> Bu belge bir denetimin ÖNCE/SONRA kaydıdır ve amacı gereği o anki
> sayılarla dondurulmuştur (doğrulama çıktıları, test sayıları, o gün
> kapatılan kusurlar). Sonradan düzeltilirse bir denetim kaydı olmaktan
> çıkar.
>
> **Güncel durum için tek kaynak:** [`PRE_INTERNAL_INTEGRATION_READINESS.md`](PRE_INTERNAL_INTEGRATION_READINESS.md).

**Tarih:** 01.09.2026 · **Kapsam:** `ahmetrz/uyumplatformu` · dal `main`

Bu belge, platformun dış sistemlerle bütünleşme ve otomasyon kabiliyetlerinin
**denetim öncesi** durumunu, verilen kararı ve **denetim sonrası** durumu
kanıtla birlikte kaydeder.

---

## 0 · Denetim yöntemi

Uygulamaya başlamadan önce 13 alan paralel denetlendi (23 ajan, 0 hata).
Her "VAR" ve "KISMİ" iddiası ayrı bir ajan tarafından **çürütülmeye
çalışıldı** — amaç, zaten çalışan bir kabiliyeti yeniden yazmamak ve
olmayan bir kabiliyeti var sanmamaktı.

Sonuç: **hiçbir iddia abartılmamış çıktı** (10 doğrulama turunun tamamında
`abartilmis: false`). Denetim kendi kendini yalanlamadı.

Denetimin en sert bulgusu: `EntegrasyonKosusu` modeli **8 alan, 0 satır,
kaynak ağacında 0 referans** — model tamamen ölüydü. Adı bir entegrasyon
çatısı olduğunu düşündürüyordu; değildi.

---

## 1 · GAP MATRIX

| # | Kabiliyet | Önce | Karar | Uygulandı | Kanıt | Kalan dış bağımlılık |
|---|---|---|---|---|---|---|
| 1 | Connector / integration framework | **YOK** | CORE_NOW | ✅ | `Connector` modeli · `lib/entegrasyon/cekirdek.ts` · adaptör sözleşmesi · **14 test + mutasyon doğrulaması** | Gerçek vendor credential (aşağıda tip tip listeli) |
| 2 | OT asset discovery | KISMİ (CMDB var, keşif yok) | INTEGRATION_READY | ✅ çatı | `KesifKaydi` staging (+ `tesisId` kapsamı) · `lib/entegrasyon/kesif.ts` · 8 adaptör iskeleti · passive-first · eşleştirme geçişi senkronizasyondan otomatik koşar | OT keşif ürünü / firewall / SNMP salt-okur erişim |
| 3 | Topology drift | KISMİ (model var, sapma yok) | INTEGRATION_READY | ✅ çatı | `TopolojiAnlik/Gozlemi/Sapmasi` · **21 test** | Topoloji gözlem kaynağı (ot_discovery / firewall connector) |
| 4 | CMDB toplu import | **YOK** | CORE_NOW | ✅ | `VarlikAktarimi` · kolon eşleme UI · tek transaction · **26 test** | Yok |
| 5 | Secure external API | **YOK** | CORE_NOW | ✅ | `app/api/v1/**` · `lib/api/**` · API anahtarı + **yönetim yüzeyi** (yönetim tezgâhı 3. kip) · idempotency | Yok |
| 6 | Vendor remote access | KISMİ (tedarikçi bayrağı var, oturum yok) | INTEGRATION_READY | ✅ çatı | `TedarikciErisimOturumu` · üç değerli alanlar · **8 test** | PAM/VPN oturum kaynağı (CyberArk, BeyondTrust, FortiGate…) |
| 7 | PLC/DCS/SCADA config backup | KISMİ (santral seviyesi var, varlık yok) | INTEGRATION_READY | ✅ çatı | `KonfigurasyonYedegi` · `yedekDogrulama` motoru · **15 test** | Yedekleme ürünü API'si; **`icerikHash` kritik alan** |
| 8 | Incident → impact chain | KISMİ (`Olay` ilişkisiz) | CORE_NOW | ✅ | 6 bağ tablosu · `olayEtki` motoru · `/olaylar` · **14 test** | Yok |
| 9 | Data provenance | KISMİ (dağınık) | CORE_NOW | ✅ | `VeriKokeni` · `lib/entegrasyon/koken.ts` · **23 test** | Yok |
| 10 | Automation safety | — | CORE_NOW | ✅ | Öneri/karar ayrımı her katmanda testli | Yok |
| 11 | Motor zinciri | — | CORE_NOW | ✅ | `lib/entegrasyon/zincir.ts` · 8 motor · **11 test + 4 negatif kontrol** · dört yazma ucu + iki onay yolundan tetiklenir | Yok |
| 12 | Observability | KISMİ (motor var, entegrasyon yok) | CORE_NOW | ✅ | `/saglik` entegrasyon bölümü · **28 test** | Yok |
| 13 | Secret yönetimi | KISMİ (soyutlama yok) | CORE_NOW | ✅ kısmen | `lib/entegrasyon/sir.ts` — `env:` + `dosya:` | **`vault:` bağlı değil** — HashiCorp Vault / AWS KMS |

---

## 2 · Sınıflandırma

### FULLY IMPLEMENTED — dış sistem gerektirmez
- **CMDB toplu import** — dosya girdisiyle uçtan uca çalışır
- **Secure external API** — kimlik, yetki, kapsam, idempotency, sayfalama
- **Incident → impact chain** — zincirin her halkası üründe mevcut
- **Data provenance** — mevcut şema ve veri üstünde çalışır
- **Motor zinciri** — yalnız mevcut motorları sıralar
- **Observability** — mevcut veriyi dürüst gösterir
- **Connector çekirdeği** — sözleşmeye karşı çalışır, adaptörden bağımsız

### INTEGRATION READY — mimari hazır, gerçek sistem bekliyor
| Kabiliyet | Ne hazır | Ne eksik |
|---|---|---|
| OT discovery | Staging, eşleme, güven skoru, onay akışı, 8 adaptör iskeleti | Credential + erişim |
| Topology drift | Anlık, temel, 10 sapma tipi, karar akışı | Gözlem kaynağı |
| Config backup | Varlık seviyesi model, üç değerli kontroller, motor | Yedekleme API'si + **`icerikHash`** |
| Vendor access | Oturum modeli, üç değerli uyum mantığı | PAM/VPN oturum akışı |

### REQUIRES EXTERNAL SYSTEM / CREDENTIAL
Yedi connector tanımlı, **hiçbiri etkin değil**, hiçbirinin sırrı tanımlı değil:

| Connector | Gereken |
|---|---|
| `AD-01` Entra ID | Uygulama kaydı + `Directory.Read.All`, `AuditLog.Read.All` → `env:ENTRA_ISTEMCI_SIRRI` |
| `EDR-01` CrowdStrike | OAuth2 client credentials, `Hosts:read`, `Detections:read` → `env:FALCON_ISTEMCI_SIRRI` |
| `VULN-01` Tenable | API anahtarı → `env:NESSUS_API_ANAHTARI`. **OT segmentinde aktif tarama yok** |
| `OT-01` OT keşif | API anahtarı → `env:OT_KESIF_API_ANAHTARI`. Yalnız pasif kaynaklar |
| `BACKUP-01` Veeam | API anahtarı → `env:YEDEKLEME_API_ANAHTARI` |
| `FW-01` FortiManager | API anahtarı → `env:FORTIMANAGER_API_ANAHTARI`. **Salt okunur** |
| `IMP-01` Dosya aktarımı | **Yok** — kimlik bilgisi olmadan çalışan tek tip |

Ayrıca: `vault:` sır sağlayıcısı bağlı değil; şu an yalnız `env:` ve `dosya:`.

### DEFERRED BY DESIGN
| Ne | Neden |
|---|---|
| PAM / VPN / oturum kaydı ürünü olmak | Platform oturumu **yönetmez**; metadata ve uyum sonucunu gösterir. `Tedarikci` modelinin şema yorumunda zaten yazılı ilke. |
| Yedekleme / geri yükleme yürütmek | Platform yedek almaz, geri yüklemez. Yedeğin varlığını, tazeliğini ve doğrulanmışlığını izler ve uyum kanıtına bağlar. |
| Aktif ağ/OT taraması | OT'de üretim kontrol sistemleri beklenmedik tepki verebilir. Passive-first ilke; kodda tarayıcı yok. |
| Otomatik düzeltme (yama, firewall kuralı, PLC config) | `detect → correlate → propose → human approve`. Otomasyon önerir, karar vermez. |

---

## 3 · Otomasyon güvenliği — testle sabitlenen sınırlar

| Yasak | Nerede sabitlendi |
|---|---|
| Otomatik risk kabulü / bulgu kapatma | `motor-zinciri.test.ts` — koşu öncesi/sonrası sayımlar karşılaştırılıyor, sapma varsa `zincir_guvenlik_ihlali` koşusu yazılıyor |
| Uygulanabilirlik override'ının ezilmesi | `uygulanabilirlik.ts:84` — ölçüldü: el ile `false` yapılmış karar, her tesisi kapsama sokan kural eklendiğinde **aynen kaldı** |
| Sapmanın topolojiyi değiştirmesi | `topoloji-sapma.test.ts` — tespit, koşu ve **hem kabul hem ret** sonrası dört tablonun parmak izi birebir aynı |
| Motorun etki alanına yazması | `olay-etki.test.ts` — öneri yalnız `etkiOnerisiJson`'a; dört etki alanı ve doğrulayan damgası null kalıyor |
| Keşfin doğrudan CMDB'ye yazması | `kesif.test.ts` — yüksek güvenli eşleşme bile onay bekliyor |
| Motorun kendi verisini doğrulaması | `koken.test.ts` — `dogrulayanId` gerçek ve **aktif** bir kullanıcı olmak zorunda |

---

## 4 · "Bilinmeyen ≠ sıfır ≠ yanlış" — testle sabitlenen ayrımlar

| Ayrım | Kanıt |
|---|---|
| `guven: null` (ölçülmedi) ≠ `guven: 0` | `koken.test.ts` — biri "ölçülmedi", diğeri "%0" |
| Zincir kopuksa `bilinmiyor`, `yok` değil | `olay-etki.test.ts` — varlığın kendi kaydında "yok" yazsa **bile** |
| Yedek kaydı yok = `bilinmiyor`; hepsi başarısız = `yok` | `konfig-yedek.test.ts` |
| `onayli: null` (bilinmiyor) ≠ `false` (onaysız) | `tedarikci-oturum.test.ts` |
| Boş hücre `bilinmiyor`/null, `0`/`false` değil | `varlik-aktarim.test.ts` — `not.toBe(false)` |
| `pollAralikDk` yoksa tazelik `bilinmiyor`, "gecikmiş" değil | `entegrasyon-saglik.test.ts` — 30 gün geçmiş olsa bile |
| Yorumlanamayan koşu durumu `bilinmiyor` | `entegrasyon-saglik.test.ts` — başarılı da başarısız da değil |
| `KesifKaydi.tesisId: null` (santral bilinmiyor) ≠ "hiçbir santralde" | `entegrasyon-cekirdek.test.ts` — tanımsız tesis kodu kaydı düşürmez, santralsiz bırakır |
| `ayricalikli: null` (ölçülmedi) ≠ `false` (ayrıcalıksız) | `api.test.ts` — dizin bilgi vermezse hesap ayrıcalıksız SAYILMAZ; ekran `unk` gösterir |
| Ölçülmüş değer, kaynak bildirmeyi bırakınca silinmez | `api.test.ts` (ayrıcalık) · `entegrasyon-cekirdek.test.ts` (santral) |

---

## 4b · Faz 6 sonrası bulunan kusurlar

Ekranların tamamı Atlas gramerine taşınınca üç işlev kaybı ve iki
"iki doğruluk kaynağı" kusuru ortaya çıktı. Hiçbiri yeni özellikten
kaynaklanmıyordu; göç onları GÖRÜNÜR yaptı.

| # | Kusur | Etki | Kanıt |
|---|---|---|---|
| 14 | **Çıkış düğmesi hiç yoktu** | `CikisDugmesi` yalnız `UstCubuk` içinde yaşıyordu ve `UstCubuk` Atlas'a hiç taşınmadı: oturum açmış kullanıcının **oturumu kapatmasının hiçbir yolu kalmamıştı** | Ray oturum bloğu; çıkış düğmesi 1000px ve 800px görüntü alanında ölçüldü |
| 15 | Komut paleti (Ctrl+K) hiçbir ekranda çalışmıyordu | Yalnız boşalan (ozalit) kabuğunda monte edilmişti | Atlas kök yerleşimine alındı, Özalit sınıflarından Atlas gramerine geçirildi |
| 16 | `/giris` uygulama kabuğunun içindeydi | Oturum açmamış ziyaretçi 244px'lik rayı, yani bilgi mimarisinin tamamını görüyordu; rayın bağlantıları klavye sırasına giriyordu | Kendi rota grubuna alındı; giriş sayfasında ray ölçüldü: **yok** |
| 17 | **Zamanlayıcı sekiz motorun beşini koşturuyordu** | Motor listesi iki yerde ayrı yazılıydı; `yedek_dogrulama`, `olay_etki`, `topoloji_sapma` zamanlayıcıya hiç girmemişti — kimse düğmeye basmazsa o üç motor **hiç koşmuyordu** | `lib/motorlar/kayit.ts` tek kaynak · `motor-defteri.test.ts` (mutasyonla doğrulandı) |
| 18 | İki adaptör çözücüsü (Faz 5) | Defterle kaydedileni statik harita göremez, silineni hâlâ döndürürdü | `adaptorGetir` kaldırıldı |
| 19 | API anahtarı yönetiminin ekranı yoktu | `apiAnahtariUret`/`apiAnahtariIptal` yazılmıştı ama hiçbir yerden çağrılmıyordu; anahtar çıkarmak için sunucu eylemini elle çağırmak gerekiyordu | Yönetim tezgâhı 3. kip; token'ın DOM/RSC/depo/çerezde ikinci kez görünmediği tarayıcıyla doğrulandı |
| 20 | Zaman çizelgesi kart matematiği üç ekranda kopyaydı | Üçü de "kaç kart sığar"ı tahmin ediyordu; çekmece açılınca kartlar üst üste biniyordu | Primitif ekseni `ResizeObserver` ile ÖLÇÜYOR |
| 21 | `EPDK-SYM-4.1` bölüm başlığı bir ISO kontrolüne 'tam' denk yazılmıştı | Bölüm (4.1.1 + 4.1.2) bir kontrole denk sayılamaz; çapraz eşleme matrisi yaprak olmayan satırı çizemediği için kayıt ekranda **sessizce düşüyordu** | Denklik doğru yaprağa taşındı, 'kismi' oldu |

---

## 5 · Bu çalışmada bulunan ve düzeltilen MEVCUT ürün kusurları

Hiçbiri yeni özellikten kaynaklanmıyordu; hepsi zaten oradaydı.

| # | Kusur | Etki | Kanıt |
|---|---|---|---|
| 1 | `tests/sahte/db.ts` fallback'i gerçek `dev.db`'ye yazıyordu | `TEST_DB` ayarlamayı unutan bir test geliştiricinin veritabanını **sessizce bozardı** | Denetim işaretledi; fallback kaldırıldı (tembel koruma) |
| 2 | `isKos` kira süresi yoktu | Süreç koşu ortasında ölerse `calisiyor` satırı asılı kalıyor, motor **bir daha hiç koşmuyordu** | 30 dk kira eklendi |
| 3 | `isKos` hatayı yutuyordu | Beş motor birden patlasa `tamam()` dönüyordu | `KosuSonucu` döndürülüyor; geriye dönük uyumlu |
| 4 | `uygulanabilirlik.ts` sınırsız bulgu üretiyordu | Üç ardışık koşuda **4 → 6 → 8**; zincir her veride tetikleyecekti | Regresyon testi + **mutasyon doğrulaması** |
| 5 | `aktarimOnayla` transaction dışındaydı | Yarım regülasyon aktarımı mümkündü | Atomik hâle getirildi, davranış değişmedi |
| 6 | 8 eylem modülünün demo alias'ı yoktu | Bir ekran import ettiği an **gh-pages yayını kırılacaktı** | 5 ikiz yazıldı, 8 alias kaydedildi, demo derlemesi ölçüldü |
| 7 | **Motor zinciri hiçbir üretim yolundan çağrılmıyordu** | `zincir.ts` yazılmıştı ama tek çağıranı testlerdi: dış sistemden veri gelse bile motorlar onu görmüyordu. Kâğıt üstünde bir orkestrasyon | Dört yazma ucu + keşif onayı + toplu aktarım onayı bağlandı; `api.test.ts` tetiği mutasyonla doğruladı |
| 8 | Eşleştirme geçişi yalnız DÜĞMEDEN koşuyordu | Connector saatte bir koşsa da kimse "Eşleştir"e basmazsa keşif kuyruğu `normalize`da asılı kalıyordu — "detect → correlate" halkası kopuk | Senkronizasyon ve gözlem ucu geçişi `isKos` üzerinden koşturuyor; mutasyonla doğrulandı |
| 9 | Eşleşmemiş keşif kaydı kapsam filtresinden muaftı | Kapsamı daraltılmış kullanıcı **başka santralin** keşif kuyruğunu görebiliyordu | `KesifKaydi.tesisId` + sorguda kapsam koşulu · 5 test |
| 10 | `ayricalikli` NOT NULL DEFAULT false | Ayrıcalık bilgisi vermeyen dizinden gelen hesap sessizce "ayrıcalıklı değil" kaydediliyor, ayrıcalıklı hesap sayımı düşük görünüyordu | Alan üç değerli oldu; ekran `unk` gösteriyor, dip not sayıyı söylüyor |
| 11 | İki ayrı adaptör çözücüsü vardı | `adaptorGetir` statik haritayı, `adaptorCoz` çalışma zamanı defterini okuyordu: defterle kaydedileni biri göremez, silineni diğeri hâlâ döndürürdü | `adaptorGetir` kaldırıldı, tek çözücü kaldı |
| 12 | Yedek/oturum idempotency'si yalnız kodda duruyordu | Aynılık `VeriKokeni`nde arama yaparak kuruluyordu; eşzamanlı iki içe aktarım ikisi de "köken yok" görüp aynı kaydı iki kez yazabilirdi | `(kaynakSistem, kaynakKayitId)` veritabanında TEKİL · 2 test |
| 13 | `prisma migrate diff` kalıcı yalancı sapma veriyordu | İki tablonun kolon SIRASI şemadan farklıydı (elle yazılmış `ADD COLUMN`'lar). Kalıcı yalancı pozitif, gerçek sapmayı görmeyi engeller | Normalizasyon migration'ı; diff artık boş |

---

## 6 · Doğrulama (gerçek çıktı)

```
npx tsc --noEmit -p tsconfig.json   → 0 hata
npx eslint                          → temiz
npx vitest run                      → 24 dosya / 428 test yeşil
NEXT_PUBLIC_DEMO=1 next build       → ÇIKIŞ=0, out/api oluşmadı
npx next build                      → ƒ /api/v1/* dinamik route olarak listeleniyor
prisma migrate status               → Database schema is up to date
prisma migrate diff (db ↔ şema)     → boş (sapma yok)
dev.db sıfırdan kuruldu             → 12 migration boş şemadan temiz koştu
arac/denetim.mjs (28 ekran)         → toplam kusur: 0
arac/rota-duman.mjs                 → 29 rota, başarısız 0, sayfa hatası 0
```

Denetim öncesi taban: 7 dosya / 29 test. Mevcut testlerden hiçbiri **sessizce**
bozulmadı; davranış bilinçli değiştiği için güncellenen üç test şunlardır ve
üçü de artık DAHA GÜÇLÜ bir şeyi sabitliyor:

| Test | Eski iddia | Yeni iddia |
|---|---|---|
| `api.test.ts` — keşif kaydı | `durum === 'kesfedildi'` | kayıt inceleme kuyruğuna indi, **CMDB'ye hâlâ yazılmadı** |
| `api.test.ts` — privileged null | `ayricalikli === false` (şema varsayılanı) | `ayricalikli === null` (ölçülmedi) |
| `motor-zinciri.test.ts` — motorsuz bayrak | üç bayrak da motorsuz | yedek/topoloji artık motorlu; yalnız `erisim` motorsuz |

---

## 7 · Kabul kriterlerine karşı durum

| Kriter | Durum |
|---|---|
| build başarılı | ✅ iki modda da |
| typecheck başarılı | ✅ |
| lint başarılı | ✅ |
| testler başarılı | ✅ 428/428 |
| mevcut fonksiyonlar bozulmamış | ✅ 29 taban testi yeşil |
| mevcut tasarım/density bozulmamış | ✅ yeni ekranlar Atlas sözleşmesinde |
| RBAC/scope korunmuş | ✅ `izinVar`/`izinliTesisIdleri` yeniden yazılmadı, API'de de aynısı |
| audit trail korunmuş | ✅ değişmezlik tetikleyicisi yerinde |
| fake connector yok | ✅ 7 tipin 6'sı `BaglanmamisAdaptor` |
| fake success yok | ✅ `/saglik` "başarılı" çipi göstermiyor |
| dış bağımlılıklar açık | ✅ bölüm 2 |

---

## 8 · Açık kalan riskler

1. **RBAC OR tabanlı.** `izinVar` `k.yetkiler.some(...)` ile çalışıyor; bir
   kullanıcıya global yetki verildiği anda tüm tesis kısıtları anlamsızlaşıyor.
   Mevcut veride 5 yetkinin 4'ü global. API kapsam izolasyonu bu davranışın
   üstüne kuruluyor — yani API'nin kapsam güvencesi, yetki atamalarının
   disiplinine bağlı. Bu bir kod kusuru değil, bir **işletim riski**.
2. **SQLite tek yazıcı.** Uzun toplu aktarımlar motor koşularıyla aynı
   bağlantıyı paylaşır. Üretim yükünde PostgreSQL'e geçiş gerekir.
3. **Zamanlayıcı süreç içi.** `instrumentation.ts` `setInterval` kullanıyor;
   çok örnekli dağıtımda çift koşu riski var. Tek fren `isKos`'un DB tabanlı
   kilidi ve yeni eklenen 30 dk kirası.
4. **`vault:` bağlı değil.** Sırlar bugün `env:` ile geliyor.
5. **Zincir istek içinde koşuyor.** Yazma ucu ve onay eylemi motor zincirini
   `await` ediyor: 347 varlıklık veride hızlı, ama veri büyüdükçe yazma
   isteğinin gecikmesi zincirin tam taramasına bağlı kalır. Arka plana
   almak bilinçli olarak SEÇİLMEDİ — süreç sonlanırsa iş sessizce kaybolur
   ve "sessiz hata yasak" ilkesi çiğnenirdi. Kuyruklu bir işçiye geçiş,
   PostgreSQL geçişiyle birlikte ele alınmalı.
6. **`erisim` bayrağının motoru yok.** Tedarikçi erişim oturumu kaydediliyor
   ve ekranda görünüyor, ama ondan kural işleten bir motor bulunmuyor.
   Zincir bunu sessizce yutmuyor, sonuçta `kapsanmayanDegisiklikler` olarak
   bildiriyor.
