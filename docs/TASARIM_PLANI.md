# Enerji Sektörü BT Uyum Platformu — Tasarım Planı (Awwwards Araştırmalı)

## Bağlam

Şirket içi kullanılacak (ileride ürünleşebilecek) bir platform: enerji üretimi sektöründe BT departmanının uyum sağlaması gereken tüm regülasyonları (EPDK Siber Yetkinlik Modeli, SPK, CBDDÖ denetimi, ISO 27001 vb.) madde bazında barındıracak; her madde için bulgular, aksiyonlar, güncel durum ve tam değişiklik geçmişi (kim, ne, hangi dosya) izlenecek. Anlık durum dashboard'ları, rapor ekranları, denetim bazında kullanıcı yetkilendirme ve regülasyon/uyum projeleri ↔ bulgu eşleştirme ekranları olacak.

Bu aşamanın çıktısı **tasarım planlaması**dır (uygulama değil): Awwwards üzerinden ilham alınacak tasarımların listesi + hangi tasarımdan hangi detayın alınacağı + platformun ekran/komponent envanteriyle eşleştirilmesi.

Kullanıcı tercihleri (netleştirildi):
- Görsel karakter: **Kurumsal + modern** (Linear/Stripe tarzı SaaS estetiği)
- Tema: **Açık + koyu mod**
- Renk paleti: serbest (kurumsal kimlik dayatması yok)
- Cihaz: **Tam responsive** (mobil birinci sınıf)

## Ekran Envanteri (tasarımın kapsayacağı sayfalar)

1. **Ana Dashboard** — tüm denetimlerin anlık uyum durumu (denetim başına % uyum, açık bulgu sayısı, yaklaşan tarihler, son aktivite akışı)
2. **Denetim/Regülasyon Detayı** — madde listesi (hiyerarşik: bölüm > madde > alt madde), madde başına durum rozeti, filtre/arama
3. **Madde Detayı** — madde metni, bulgular, kanıt dokümanları, sorumlu, durum
4. **Bulgu Detayı** — bulgu açıklaması, aksiyon listesi, tam zaman çizelgesi (audit trail: kim/ne/ne zaman/hangi dosya), dosya ekleri
5. **Proje Yönetimi** — regülasyon & uyum projeleri listesi + proje detayı
6. **Eşleştirme Ekranı** — proje ↔ denetim maddesi/bulgu eşleştirme (matris veya çift panel), eşleşmelerin okunabilir görünümü
7. **Raporlar** — anlık alınabilir rapor ekranları, export (PDF/Excel)
8. **Kullanıcı & Yetki Yönetimi** — denetim (proje) bazında rol/yetki atama
9. **Aktivite / Geçmiş** — global audit log görünümü
10. Yardımcılar: giriş ekranı, bildirimler, boş durumlar (empty states), ayarlar

## Awwwards Araştırma Bulguları

Doğrulama: [V] = Awwwards sayfası doğrudan çekilerek doğrulandı · [S] = ikincil kaynak/arama özeti · [K] = genel ürün bilgisi.

### A. Tasarım dili referansları (Awwwards)

1. **Sharplink (Studio Freight)** — sharplink.com · awwwards.com/sites/sharplink [V] — SOTD Ağu 2026 + Developer Award. Kurumsal fintech tonu; uyum platformuna en yakın karakter. **Alınacak:** iki renk disiplini (canlı mavi `#0E76FF` + açık gri `#F3F3F3` nötr zemin), animasyonlu footer, ölçülü GSAP scroll geçişleri.
2. **Finseo** — finseo.ai · awwwards.com/sites/finseo [V] — Gerçek SaaS analitik ürünü (Next.js + Tailwind). **Alınacak:** kart grid düzeni, KPI kartlarındaki amaçlı mikro-etkileşimler, güçlü tipografi.
3. **HOBRO DIGITAL** — hobro.digital [V] — SOTD + Developer Award; corporate/clean/design-systems kategorilerinin üçünde birden. **Alınacak:** navigasyon ve bölüm geçiş cilası.
4. **TBWA\HAKUHODO (SHIFTBRAIN)** — tbwahakuhodo.co.jp [V] — **Alınacak:** çok dilli tipografik hiyerarşi disiplini (Türkçe uzun bileşik kelimeler ve diakritikler için iyi emsal).
5. **Nodenza (DD.NYC)** — nodenza.com [V] — **Alınacak:** kurumsal kart/grid kompozisyonu, muhafazakâr palet.
6. **AI in Design Report 2026 (++hellohello)** — stateofaidesign.com [V] — Rapor olarak tasarlanmış web sitesi. **Alınacak:** yoğun bulguları taranabilir bölümlere + veri-viz anlarına dönüştürme yaklaşımı (rapor ekranlarımızın modeli).
7. **Evensix** — evensix.com [V, resmi Dark Mode koleksiyonu] — **Alınacak:** açık↔koyu mod geçiş etkileşimi.
8. **Federico Pian** — federicopian.com [V] ve **Perpetuum** — perpetuum.inc [V] — **Alınacak:** tema geçişi mikro-animasyonu (radyal açılım; iş aracı için ~300ms altı).
9. **Isabel Moranta** portfolyosu [S] — **Alınacak:** çift tipografi fikri — madde kodları/hash/timestamp için monospace (örn. "EPDK-BGYS-4.2.1"), geri kalan için grotesk (Inter/Geist sınıfı).
10. **Linear.app** [S/K] — Koyu SaaS UI ölçütü. **Alınacak:** neredeyse-siyah yüzeyler, soluk 1px kenarlıklar, tek aksan rengi, kontrasla hiyerarşi.

### A2. Awwwards ödüllü site referansları (dashboard / SaaS / veri-ağır)

Not: Awwwards çoğunlukla pazarlama/landing sitelerini ödüllendiriyor; login-arkası dashboard örneği az. Bu yüzden alınacaklar ağırlıkla görsel dil (palet, tipografi, hareket, kart/tablo işçiliği).

11. **Superlist** — awwwards.com/sites/superlist [V] — SOTD + Site of the Month (Nis 2021), animasyon 9.00/10. Palet: `#000` + mercan `#D14836` + beyaz. **Alınacak:** 3 renkle sınırlı disiplinli palet, cilalı mikro-etkileşimler (bildirim butonu), akıcı yükleme geçişleri.
12. **Attio** — awwwards.com/sites/attio [V] — Veri-ağır B2B CRM; listedeki işlevsel olarak en alakalı örnek. **Alınacak:** kayıt tabloları, filtre chip'leri, satır içi durum pill'leri, özelleştirilebilir liste/board görünümleri → madde ve bulgu tablolarımızın modeli.
13. **Reflect** — awwwards.com/sites/reflect [V] — **Alınacak:** koyu mod referansı — `#030014` yüzey + `#9382FF` parlak aksan, ince glow gradyanları.
14. **Vercel — Workflow** — awwwards.com/sites/vercel-workflow [V] — `#050505`/`#fff` monokrom. **Alınacak:** rengin yalnızca durum/veri için ayrıldığı monokrom sistem, 1px keskin kenarlıklar, grid disiplini, durum noktaları (status dots).
15. **Stripe Sessions 2024** — awwwards.com/sites/stripe-sessions-2024 [S] — **Alınacak:** disiplinli nötr UI üzerinde gradyan aksanlar; dashboard ana ekranındaki "hero" özet bandı için.
16. **Viture Dashboard** [V] — Awwwards'ın ödüllendirdiği nadir gerçek dashboard. **Alınacak:** kart kompozisyonu, ürün kalitesinde koyu UI.
17. **Pulsetic** — awwwards.com/inspiration/dashboard-stats-design-pulsetic [V] — **Alınacak:** stat blokları (sparkline + büyük sayı + durum rengi) ve yeşil/kırmızı segmentli durum-zaman şeritleri → madde uyum kutucukları ve denetim geçmişi çubukları.
18. **People's Audit (Devoco Studio)** — audit.devoco.studio/en [V, ödül seviyesi doğrulanmadı] — Tematik olarak en yakın örnek (denetim takibi). **Alınacak:** checklist/bulgu sunumu ve ilerleme göstergeleri.
19. **11sight (Lazarev)** [V] ve **Catalyze AI (Halo Lab)** [V] — **Alınacak:** B2B SaaS kart sistemi, yumuşak gölgeler, cömert boşluk; iç "genel bakış" sayfaları için yaklaşılabilir kurumsal ton.
20. **Fintech NerdCon (L+R)** [V] — **Alınacak:** ajanda/liste tipografisi → dikey aktivite akışı (activity feed) düzeni.

Doğrulanmış boşluk: Matris/eşleştirme ekranı için doğrudan Awwwards örneği yok; en yakın vekiller Attio'nun ilişkisel tabloları + Linear/Airtable kalıpları.

### B. GRC ürün UI kalıpları (fonksiyonel emsaller)

- **Vanta** [S/K]: framework başına uyum-yüzdesi halkası + pass/fail/dikkat durumlu otomatik test satırları; bir kontrolün birden çok framework'ü karşılamasını satır üzerinde chip'lerle gösterme → bizim madde ↔ EPDK/ISO/SPK eşleştirmemizin modeli.
- **Drata** [S/K]: "zaman içinde uyum" trend çizgisi; kaynak + tazelik tarihi + bağlı kontroller taşıyan yeniden kullanılabilir kanıt kütüphanesi.
- **Secureframe** [S/K]: sihirbaz tarzı yönlendirmeli akışlar, "sırada ne var" görev rayı → denetim hazırlık akışları için.
- **Hyperproof** [V]: framework'ler arası kontrol crosswalk'ları, kanıtın örtüşen framework'lerde yeniden kullanımı, kanıt-tazeliği göstergeleri.
- **ServiceNow GRC** [S/K]: rol bazlı görünümlü tek raporlama çalışma alanı; gösterge başarısızlığının otomatik bulgu+iş akışı oluşturması. Anti-pattern: form-ağır kayıt ekranları — kopyalanmayacak.
- **AuditBoard** [S/K]: denetim başına tek zaman çizelgesinde talep/sorumlu/durum/yorum akışı → bulgu + audit-trail ekranımızın en iyi modeli.

**Benimsenecek çapraz kalıplar:** framework halkaları + trend çizgisi (ana dashboard); durum chip'li + sorumlu avatarlı + eşleştirme chip'li madde tablosu; çoktan-çoğa bağlı kanıt kütüphanesi; aktör/zaman/önce→sonra diff'li dikey timeline; çapraz eşleştirme için matris/chip UI; denetim hazırlık checklist rayı; "X denetimi görünümündesiniz" bağlam çubuğuyla görünür yetki kapsamı.

## Tasarım Kararları — "x tasarımının y detayı" eşleştirmesi

### Tasarım sistemi (temel)
- **Renk stratejisi:** Sharplink'in iki-renk disiplini (tek güçlü mavi aksan + nötr gri zemin, açık modda `#0E76FF` / `#F3F3F3` benzeri) + Superlist'in "en fazla 3 renk" kuralı. Yeşil/amber/kırmızı **yalnızca** uyum durumu semantiği için (Vercel'in "renk = durum" ilkesi).
- **Koyu mod:** Vercel Workflow'un monokrom stratejisi varsayılan (`#050505` sınıfı yüzey, 1px soluk kenarlıklar, kontrasla hiyerarşi — Linear reçetesi); grafik/chart'larda Reflect tarzı parlak aksan.
- **Tema geçişi:** Evensix / Federico Pian'ın açık↔koyu geçiş mikro-animasyonu (radyal açılım, ~250-300ms).
- **Tipografi:** Inter/Geist sınıfı grotesk gövde + Isabel Moranta kalıbıyla monospace ikincil yazı (madde kodları "EPDK-BGYS-4.2.1", hash'ler, timestamp'ler). TBWA\HAKUHODO'nun hiyerarşi disipliniyle Türkçe uzun kelimelere dayanıklı tip ölçeği.
- **Hareket dili:** Superlist kalitesinde ama Finseo ölçülülüğünde mikro-etkileşimler: hover durumları, KPI sayaç animasyonları (count-up), liste giriş geçişleri. Sharplink'in ölçülü scroll geçişleri sadece rapor/genel bakış sayfalarında.
- **Footer:** Sharplink'in animasyonlu footer yaklaşımı — sadeleştirilmiş hâliyle (hızlı erişim linkleri + son senkronizasyon/versiyon bilgisi).

### Ekran bazında
1. **Ana Dashboard:** Vanta'nın framework başına uyum-yüzdesi halkaları + Drata'nın "zaman içinde uyum" trend çizgisi + Pulsetic'in stat kutucukları (sparkline + büyük sayı + durum rengi) + Stripe Sessions tarzı gradyan aksanlı özet bandı. Altta Fintech NerdCon düzeninde son aktivite akışı.
2. **Denetim/Madde Listesi:** Attio'nun tablo dili — filtre chip'leri, satır içi durum pill'leri, sorumlu avatarları, özelleştirilebilir kolonlar; satırda framework-eşleştirme chip'leri (Vanta kalıbı). Hiyerarşik bölüm > madde açılır yapısı.
3. **Madde/Bulgu Detayı + Audit Trail:** AuditBoard'un tek-zaman-çizelgesi modeli — dikey timeline'da aktör, zaman, önce→sonra diff, yüklenen dosya; Pulsetic'in segmentli durum-zaman şeridiyle bulgunun yaşam döngüsü özeti. Kanıtlar Drata/Hyperproof kalıbıyla yeniden kullanılabilir "kanıt kütüphanesi" nesneleri (kaynak + tazelik rozeti).
4. **Proje ↔ Bulgu Eşleştirme:** Awwwards'ta doğrudan emsal yok (doğrulanmış boşluk) → Attio ilişkisel tablo + Hyperproof crosswalk kalıbı: çift panel (solda proje, sağda denetim maddeleri) + chip tabanlı çoktan-çoğa bağlama; alternatif kompakt matris görünümü. Eşleşmelerin okunması: her iki yönden de chip listesi (projede "kapattığı bulgular", bulguda "kapatan projeler").
5. **Raporlar:** stateofaidesign.com'un scroll-bağlı, baskı kalitesinde rapor kalıbı; PDF/Excel export.
6. **Denetim Hazırlığı:** Secureframe'in "sırada ne var" checklist rayı; People's Audit'in ilerleme göstergeleri.
7. **Yetki Yönetimi:** denetim bazlı kapsam + ServiceNow'un rol bazlı görünüm fikri; UI'da görünür "X denetimi kapsamında görüntülüyorsunuz" bağlam çubuğu. Anti-pattern: ServiceNow'un form-ağır ekranları kopyalanmayacak.
8. **Genel bakış / boş durumlar:** 11sight + Catalyze AI'ın yumuşak gölgeli, cömert boşluklu kart sistemi; HOBRO DIGITAL'in navigasyon cilası.

## Sonraki Adımlar (bu plan onaylanınca)
1. Bu kararlardan tasarım token'ları (renk, tip ölçeği, spacing, radius, hareket süreleri) çıkarılması — açık + koyu mod.
2. Öncelikli 3 ekranın (Ana Dashboard, Madde Listesi, Bulgu Detayı/Timeline) yüksek doğruluklu mockup'ları.
3. Kullanıcının ileteceği şirket/santral/regülasyon detaylarıyla içerik modelinin netleştirilmesi; ardından kalan ekranlar ve eşleştirme UI prototipi.

## Doğrulama

Bu bir planlama görevi; kod doğrulaması yok. Çıktı: kullanıcının onaylayacağı ilham listesi + ekran-detay eşleştirmesi. Sonraki adım (ayrı görev): seçilen yönde tasarım sisteminin (renk token'ları, tipografi, komponentler) ve mockup'ların üretilmesi.
