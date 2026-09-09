# Ürün Vizyonu — Sektör ve Ülke Bağımsız Yönetişim, Uyum ve OT Envanter Platformu

**Tarih:** 5 Eylül 2026 · **Durum:** karar verildi, uygulama başlıyor ·
**Kaynak:** pazar kıyası çalışması + ürünleştirme kararı (ürün sahibi, 5 Eylül 2026)

> Bu belge ürünün **ne olduğunu** ve **ne olmadığını** yazar. Nasıl
> yapılacağı `docs/GELISTIRME_PAKETLERI.md`'de (Dalga 0 ve sonrası).
> `web/PRODUCT.md` bu belgeye göre yeniden yazılır; çelişkide bu belge
> kazanır.

---

## 1. Tek cümle

Ürün (görünen adı yapılandırmadan gelir — §10), düzenlemeye tabi kuruluşların BT ve OT varlıklarını tek
kapsam ağacında tutup her regülasyon maddesine hangi tesiste hangi
kanıtla, hangi güvenle uyduğunu — bilinmeyeni sıfır saymadan — kayıt altına
alan; regülasyon değişikliğini yakalayıp etkilenen değerlendirmelere
indiren; kurum içinde ya da bulutta, hangi ülkede ve sektörde olursa
olsun aynı çekirdekle çalışan bir yönetişim platformudur.

## 2. Nereden geliyor, nereye gidiyor

Ürün, Demo Enerji BT/OT ekibi için kurum içi geliştirilen "Demo Enerji
Yönetişim Platformu"ndan doğar. 5 Eylül 2026 pazar kıyası şunu gösterdi:
BT+OT tek ağaç, madde bazlı uygulanabilirlik, regülasyon sürüm/fark
motoru, "bilinmeyen ≠ sıfır", yedek ve tedarikçi erişimini uyum kaydına
bağlama — bu özellikler taranan 98 ürünün hiçbirinde bir arada yok;
kurumsal GRC OT'yi tanımıyor, OT güvenlik platformları uyum yaşam
döngüsü sunmuyor, regülasyon istihbaratı araçları Türkiye'yi kapsamıyor.

Karar: bu çekirdek **ürünleştirilir**. Demo Enerji ilk ve **referans
kiracı** olur; ürün adı, markası, dili ve içeriği ondan bağımsızlaşır.

## 3. Ürünün üç katmanı

| Katman | Ne taşır | Kim üretir | Değişkenlik |
|---|---|---|---|
| **Çekirdek** | Kapsam ağacı (Kiracı → Grup → Tüzel Kişi → Tesis → Birim → Sistem → Varlık), kontrol/değerlendirme/kanıt/bulgu/risk/aksiyon/proje zinciri, sürüm-fark motoru, motorlar, bağlayıcı çatısı, denetim izi, RBAC × kapsam, dışa aktarım, çoklu dil | Ürün ekibi | Sektör ve ülke **bilmez**; hiçbir sektör terimi, ülke adresi, para birimi çekirdekte sabit değildir |
| **İçerik paketleri** | Çerçeve/regülasyon maddeleri (sürümlü), çapraz eşlemeler (STRM), bildirim yükümlülükleri, denetim form şablonları, mevzuat kaynak katalogları, sektör terim sözlükleri, demo verisi | Ürün ekibi + ortaklar + kiracı | Ülke × sektör × dil etiketli; imzalı; kiracıya kurulur; güncellemesi fark motorunu besler |
| **Modüller** | OT derinliği (pasif keşif, topoloji sapması, güvenlik duvarı kural analizi, IEC 62443 seviye, firmware/EOL), kişisel veri koruma, süreklilik/BIA, parasal risk, öneri (YZ) yardımcısı | Ürün ekibi | Kiracı başına açılır/kapanır; OT modülleri OT'si olmayan kiracıda görünmez |

Demo Enerji'nin bugünkü kurulumu = çekirdek + `TR-ENERJI` içerik paketi
(EPDK Yetkinlik Modeli, BİG Rehberi, SPK VII-128.9, KVKK) + uluslararası
paketler (ISO 27001, IEC 62443, SCF) + OT modülleri + enerji sektör
sözlüğü ("tesis" yerine "santral", "birim" yerine "üretim ünitesi", MWe
özniteliği).

## 4. Kimin için

**Birincil pazar (ilk 12 ay):** Türkiye'de EPDK Yetkinlik Modeli
kapsamındaki lisans sahipleri — ≥100 MWe üretim, iletim, dağıtım, doğal gaz
iletim/dağıtım/depolama, rafineri — ve bu kuruluşları denetleyen EPDK
yetkili denetim firmaları. Pazar kıyası: bu içeriği taşıyan ürün yok,
süreç sahada Excel'le yürüyor.

**İkinci halka:** Türkiye'de 7545 sayılı Kanun'la belirlenen 15 kritik
altyapı sektöründeki işletmeciler (su, ulaştırma, sağlık, imalat, finans…)
— aynı BİG Rehberi / 7545 yükümlülükleri, farklı sektör düzenleyicisi.

**Üçüncü halka:** AB NIS2 kapsamındaki enerji ve kritik altyapı
işletmecileri (özellikle OT ağırlıklı orta ölçek; Almanya KRITIS), ABD
NERC CIP kapsamı için içerik paketi ortaklığıyla.

**Kullanıcı tipleri (kiracı içinde):** merkezde uyum sorumlusu, tesiste
BT/OT sorumlusu, iç denetim, yönetim özeti okuyucusu — mevcut dört tip
korunur; eklenenler: **kiracı yöneticisi** (kullanıcı, paket, bağlayıcı,
kimlik sağlayıcı) ve **dış denetçi** (süreli, kapsamlı, salt okunur —
mevcut). Hub tarafında **ürün yöneticisi** (kiracı açar, paket yayınlar,
kiracı verisini görmez) ve **destek** (kiracının süreli onayıyla, izli).

## 5. Konumlandırma — beş mekanizma, sektörden bağımsız ifadeyle

1. **BT ve OT tek kapsam ağacında;** uyum ağaçtan yukarı toplanır, tesis
   ve birim seviyesinde uygulanabilirlik gerekçesiyle saklanır.
2. **Kanıt zinciri ve değişmez denetim izi:** kontrol → uygulanabilirlik →
   değerlendirme → kanıt → bulgu → risk → aksiyon → proje → bütçe →
   doğrulama → kapanış; iz veritabanı seviyesinde değiştirilemez.
3. **Regülasyon değişikliği yakalanır ve indirilir:** kaynak kataloğu
   değişikliği yakalar, paket güncellemesi madde bazında fark çıkarır,
   etkilenen değerlendirmeler işaretlenir.
4. **Bilinmeyen sıfır sayılmaz:** değerlendirilmemiş, bağlanmamış,
   ölçülmemiş her şey kendi adıyla ve kendi diliminde durur.
5. **OT gerçekleri uyum kaydında:** pasif keşif, topoloji sapması, yedek
   ve geri yükleme testi, tedarikçi uzaktan erişim oturumu, firmware/EOL
   — hepsi kontrol kanıtına bağlanır; OT ağına paket gönderilmez.

Ve iki dağıtım ilkesi: **veri kiracıda kalır** (kurum içi ya da kiracının
seçtiği bölgede bulut) ve **motor önerir, insan karar verir** (yapay zekâ
dâhil).

**v1 konumlandırması (8 Eylül 2026): mevzuatın adıyla.** Ürün v1'de
"GRC platformu" olarak değil, Türkiye'de düzenlemeye tabi kuruluşların
kendi mevzuatının adıyla konumlanır: EPDK Enerji Sektöründe Siber
Güvenlik Yetkinlik Modeli Yönetmeliği'ne uyum, BDDK Bankaların Bilgi
Sistemleri Yönetmeliği'ne uyum, SPK VII-128.10 Tebliği, TCMB ödeme
kuruluşları tebliği, BTK Şebeke ve Bilgi Güvenliği Yönetmeliği, 7545
sayılı Siber Güvenlik Kanunu ve KVKK yükümlülükleri — her biri bir
sektör paketidir ve müşteri ürünü kendi denetçisinin sorduğu soruyla
tanır. Ülke boyutu paket formatında durur; v1'de yalnız TR paketleri
yazılır, EU/US içeriği ve ikinci dil ertelenir. Bu bir daralma değil
sıralamadır: çekirdek sektör ve ülke bilmez, TR paketleri onun ilk
içeriğidir (`docs/TR_SEKTOR_PAKETLERI.md`, `docs/GELISTIRME_PAKETLERI.md`
§2).

## 6. Neyin değiştiği, neyin değişmediği

**Değişmeyen kurallar** (CLAUDE.md'den taşınır): uydurma veri yok ·
bilinmeyen ≠ sıfır · pasif-önce, aktif tarama yok · motor önerir insan
karar verir · değişmez denetim izi · dört göz · sır değeri saklanmaz ·
bağlı olmayan sağlayıcı "bağlı değil" der · değişiklikler PR ile · sayılar
koddan · dosyayı değiştirmeden önce oku.

**Değişen kurallar:**

| Eski (kurum içi) | Yeni (ürün) |
|---|---|
| Ürün adı koda gömülü, tek ad | Görünen ad `MARKA_AD` yapılandırmasından gelir (`web/lib/marka.ts`); bugünkü değer geçici ve tanımlayıcıdır. `Regula` **iç çalışma adıdır** ve arayüzde, sitede, dış iletişimde kullanılmaz (§10). Kiracı görünen adı `KIRACI_AD`'dan; Demo adı yalnız referans kiracı verisinde |
| Dil yalnız Türkçe | **Çok dilli**, Türkçe birinci dil; İngilizce ikinci; içerik paketleri kendi dilinde; terimler sektör sözlüğünden |
| "Santral, ünite, MWe" alan dili | Çekirdek: "tesis, birim, öznitelik"; enerji sözlüğü "santral, üretim ünitesi, MWe" der |
| Demo santral fotoğrafları, gerçek portföy seed'de | Demo kiracısı **tamamen kurgusal**; gerçek santral adı/fotoğrafı depoda yok; Demo verisi Demo kurulumunda |
| "Gerçek kurum sistemine bağlanılmaz" | "Gerçek **müşteri** sistemine bağlanılmaz" — kural aynı; kamuya açık resmî kaynaklar belgelenmiş sabit, kapalı gelir |
| Tek kurum, SQLite | Çok kiracı, PostgreSQL (RLS), nesne deposu, kuyruk, sır kasası — sağlayıcılar gerçekten bağlanabilir; kimlik kurulumda |
| Pazarlama dili yok | Ürün sitesi/pazarlama **bu depoda yok**; ürün içi metin yine olgu dili ("12 gün gecikmiş", "kritik!" değil) |
| Koyu tema, tek | Koyu tema kalır (karar); açık tema ileride tema paketi |

## 7. Ne değildir (kapsam dışı)

- DPI motoru / OT keşif ürünü **değildir** — Claroty, Nozomi, Dragos vb.
  ürünlerin çıktısını okur; onlarla rekabet etmez, onları tamamlar.
- SIEM/SOAR/EDR **değildir**; olay yönetimi yalnız uyum ve etki zinciri
  içindir.
- Doküman yönetim sistemi **değildir**; politika kütüğü tutar, DYS'yi okur.
- Düzenleyici portalına **otomatik bildirim göndermez**; taslak hazırlar,
  insan gönderir.
- Hukuk görüşü **vermez**; mevzuat değişikliğini yakalar, eşlemeyi insan
  onaylar.
- Regülasyon metnini **kendisi yazmaz**; lisanslı metin (ISO) yalnız
  kimlik+başlık; kamu metni paketle gelir.

## 8. Başarı ölçüleri (ilk 12 ay, ürün için)

- Referans kiracı (Demo Enerji) gerçek sistemlere bağlı, EPDK sektörel
  denetimini platformdan verdi.
- `TR-ENERJI` içerik paketi tam (EPDK Yetkinlik Modeli tüm sektör ekleri,
  BİGR, SPK, KVKK) ve en az bir dış kuruluşta kuruldu.
- En az bir enerji dışı sektör kiracısı (demo değil) çekirdek + kendi
  sözlüğüyle çalıştı — sektör bağımsızlığın kanıtı.
- Mevzuat değişikliği → platformda aday: aynı gün (ölçülür).
- Otomatik kökenli kayıt oranı referans kiracıda ≥ %50 (pazar eşiği).
- Kiracı izolasyonu: negatif test seti yeşil, dış sızma testinde kiracı
  sınırı aşılmadı.

## 9. Kullanıcının vereceği kararlar (bu belge yer tutucu bırakır)

| Karar | Seçenekler | Etkisi |
|---|---|---|
| **Ürün adı** | ~~Karar bekliyor~~ → görünen ad geçici ve tanımlayıcı, `MARKA_AD`'dan gelir (6 Eylül 2026). `Regula` iç çalışma adı, arayüzde geçmez | P0 marka yapılandırması **uygulandı** (`web/lib/marka.ts`). Kalıcı ad §10 uyarısı ve seçim ölçütü nedeniyle sonra verilecek |
| **İlk enerji dışı sektör** | su/atıksu · imalat · ulaştırma · sağlık | P8 ikinci demo kiracısı ve sözlük |
| **İlk Türkiye dışı ülke paketi** | EU-NIS2 (genel) · DE-KRITIS · US-NERC-CIP | P4 ikinci kaynak kataloğu ve çerçeve |
| **Dağıtım önceliği** | on-prem önce · SaaS önce · ikisi birden | P7 sırası |
| **İkinci dil** | İngilizce (varsayılan) · Almanca | P3 |
| **Kiracı adaptörü politikası** | yalnız imzalı ürün adaptörleri · kiracı kendi yazar (sandbox) | P9 |
| **Marka/tema** | koyu tek tema kalır (varsayılan) · kiracı teması | P0/DESIGN |

Karar verilmeyen her satırda **varsayılan** uygulanır ve PR açıklamasına
yazılır.

---

## 10. Ad hakkında — "Regula" geçicidir

**Karar (6 Eylül 2026):** **Regula** bir *iç çalışma adıdır*: depo içi
konuşmada ve iç belgelerde geçebilir, ancak **arayüzde, sitede ve dış
iletişimde kullanılmaz**. Arayüzde görünen ad `MARKA_AD`'dan gelir ve o
da geçicidir. Regula'nın kalıcı marka olarak kullanılması
**önerilmez**.

**Neden geçici.** [Regula Forensics](https://regulaforensics.com/) adlı
faal bir şirket var: kimlik doğrulama ve adli belge inceleme ürünleri
üretiyor ve Gartner Peer Insights'ta **Identity Verification** pazarında
listeleniyor. Aynı geniş sektörde (güvenlik yazılımı), analist kapsamında
ve uluslararası. Ayrıca `regula.com` ve türevlerinin durumu taranmadı.
Kalıcı ada geçilirken bu çakışma tek başına eleme sebebidir.

**Neden yine de sorun değil.** Ad hiçbir yere gömülmez. P0 paketi adı
`MARKA_AD` yapılandırmasına koyar; sekme başlığı, sözcük markası,
monogram ve belge başlıkları oradan türer. Adı değiştirmek tek satırlık
bir iştir ve kod ya da belge taraması gerektirmez. Bu, P0'ın kabul
kriterlerinden biridir.

**Yapılmayacaklar (ad kalıcı olana kadar).** Domain satın alınmaz, marka
başvurusu yapılmaz, logo çizdirilmez, dış iletişimde (sunum, teklif,
web) kullanılmaz. Ad yalnız depo içinde, arayüzde ve iç belgelerde
çalışma adı olarak geçer.

**Seçim ölçütü — ad kod tabanında çakışmamalı.** Aday ad, kod tabanında
ve Türkçe alan sözlüğünde **başka bir anlamda geçmemelidir**. Ölçüm:
adayı `git grep -i` ile depoda ara — ürün adı dışındaki her eşleşme
elemedir. Bugün bilinen elenenler: **Regula** (regülasyon), **Kayda**
(kayıt/kayda). Sebep: ada dayanan her kapı, arama ve günlük filtresi
çakışan bir adla kullanılamaz hâle gelir.

Bu ölçüt **gerekli ama yeterli değildir**: geçmesi adın uygun olduğunu
değil, yalnız kod tabanıyla çakışmadığını gösterir. Marka uygunluğu ayrı
bir sorudur ve aşağıdaki tescil taramasını bekler.

Bu ölçüt 6 Eylül 2026'da ölçülerek eklendi: `MARKA_AD` varsayılanı
denemek için "Kayda" yapıldığında ad sızıntısını arayan kapı dört
dosyada yanlış alarm verdi — "Kayda git" düğmesi ve üç yorumdaki
"Kayda dönüşmemiş…" / "Kayda PAROLA ASLA GİRMEZ" cümleleri. Üçü yorum,
biri gerçek arayüz metniydi; hiçbir düzenli ifade onları marka
kullanımından ayıramaz.

**Kalıcı ad seçilirken.** 5 Eylül 2026 taramasında en temiz çıkan aday
**Kayda** idi (yazılım/güvenlik/GRC sektöründe hiçbir marka çakışması
yok; `kayda.com` yatırımcı elinde, satın alınabilir). İkinci sırada
**Tutanak** (dünyada sıfır tescil; `.com` 4.495 USD ile satılık; ama AB
pazarında telaffuz sürtünmesi). **Uyarı:** yukarıdaki ölçüte göre
"Kayda" **elenir** — Türkçe alan sözlüğünde "kayıt" sözcüğünün yönelme
hâlidir ve depoda o anlamda geçer. "Tutanak" aynı ölçütten **geçer**:
6 Eylül 2026'da ölçüldü, `git grep -i tutanak` bu belge dışında sıfır
eşleşme verdi. Karar öncesi **TÜRKPATENT sınıf 9 + 42** ve **EUIPO**
taraması bir marka vekiline yaptırılmalıdır — bu tarama henüz hiçbir
aday için yapılmamıştır.
