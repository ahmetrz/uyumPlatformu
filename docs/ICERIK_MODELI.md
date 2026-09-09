# İçerik Modeli — Karar Kaydı ve Veri Şeması

Uygulama şeması (`web/prisma/schema.prisma`) bu dokümanı birebir izler.
Kararlar kullanıcıyla yapılan netleştirmelere dayanır.

## 1. Alınan kararlar

| Konu | Karar |
|---|---|
| Tanımlar | **Hiçbir tanım koda gömülü değildir.** Sektörler, tesis kırılımları (doğalgaz, jeotermal, HES, RES…), tesisler, regülasyonlar, kapsam alanları (BT/OT…) ve uyum süreçleri panelden tanımlanır, düzenlenir, eşleştirilir. |
| Başlangıç seti | EPDK-SYM, CBDDÖ, ISO 27001, SPK-BS + 6 tesis + BT/OT alanları **seed verisidir**, sınır değildir. |
| Organizasyon | **Tesis bazlı kapsam** — uyum durumu (süreç × madde × tesis) kesişiminde izlenir. |
| Yaşam döngüsü | Santral açılır/kapanır (satış, devir); süreç başlar, kapsamı değişir, pasifleşir, tamamlanır. Kapanan tesisin kayıtları tarihçe olarak kalır. |
| Madde kaynağı | 1. aşama Excel içe aktarımı; 2. aşama resmî kaynaklardan otomatik çekim. **Her iki yol da admin onay kuyruğundan geçer** — onaysız hiçbir madde yayına girmez. |
| Madde filtresi | Tanımlı kapsam alanlarıyla (BT/OT…) eşleşmeyen satırlar elenir ve sebepleriyle raporlanır. |

## 2. Varlıklar

### Tanımlar (panelden yönetilir)
- **Sektor** → **TesisTipi** → **Tesis**: iş kolu > kırılım > tesis hiyerarşisi.
  Tesis yaşam döngüsü: `durum` (`aktif`/`kapali`) + `kapanisTarihi` + `kapanisNedeni`.
- **KapsamOgesiTuru** → **KapsamOgesi** (B1): uyum zincirinin ÖZNESİ. Tür bir KATALOGDUR
  (çekirdek `tesis` ve `kurum`; paket ekler), enum değil. Tesise bağlı öğe `tesisId` köprüsü
  taşır (`ko-<tesisId>`, tesis açılınca kendiliğinden); kurum düzeyi öğe köprüsüzdür. Omurga
  tabloları (`SurecKapsami · MaddeDurumu · UygulanabilirlikKarari · Istisna · KanitKapsami ·
  DenetciKapsami · DegerlendirmeAktarimi · UyumAnlik · Yetki`) doğrudan `tesisId` taşımaz.
- **SektorOznitelikSemasi** + **TesisOzellik** (P1/B2): paketin beyan ettiği öznitelik — anahtar,
  tip (`sayi · metin · mantik · tarih`), `rol` (`kapasite · kritiklik`; çekirdeğin bildiği tek
  şey), `grup`, `secenekler`. Sektöre özgü alan çekirdek kolonu OLMAZ; enerjinin sekiz profil
  alanı (lisans, kabul, black start, TEİAŞ, seri haberleşme, kritiklik sınıfı) buradadır.
- **Regulasyon**: kod, ad, sürüm, resmî kaynak URL (otomatik çekim adaptörünün adresi), aktiflik.
- **KapsamAlani**: BT, OT… Maddelerle **MaddeAlan** üzerinden çoktan-çoğa eşleştirilir.

### Uyum izleme
- **UyumSureci** (denetim dönemi): regülasyonun belirli tesis kapsamında yürütülen çalışması.
  `durum`: planlandi | aktif | pasif | tamamlandi. Kapsamı **SurecKapsami** taşır; kapsama bir
  kapsam öğesi eklenince o öğeye tüm yaprak maddeler için durum kaydı açılır.
- **Madde**: regülasyona bağlı, kendine referanslı hiyerarşi (bölüm > madde > alt madde).
- **MaddeDurumu**: `(surec × madde × kapsam öğesi)` — sistemin en sık okunan tablosu. Tesis
  ekranları köprüden sorar (`kapsamOgesi: { tesisId }`).
  `durum`: uyumlu | kismi | uyumsuz | incelemede | kapsamdisi.
- **Bulgu** → **Aksiyon**: önem (kritik/yüksek/orta/düşük), bulgu durumu, hedef/kapanma tarihleri.
- **Kanit** + **KanitBaglantisi**: çoktan-çoğa — tek kanıt birden çok regülasyonun maddesini
  karşılar (crosswalk). Tazelik türetilir: <90 gün taze, 90–180 yenilenmeli, >180 süresi doldu.
- **MaddeEslestirmesi**: regülasyonlar arası denklik (tam | kismi | ilgili) — eşleştirme matrisi.
- **Proje** + **ProjeBaglantisi**: uyum projeleri ↔ madde/bulgu.

### Yetki ve iz
- **Kullanici** + **Yetki**: kapsam `(kullanici × surec × kapsam öğesi)`; boş alan "tümü" demektir.
  Tesise kısıtlı rol, tesisin öğesine kısıtlıdır (`izinliKapsamOgesiIdleri` / köprü
  `izinliTesisIdleri`).
  Rol: okuyucu | katkici | denetim_sorumlusu | yonetici.
- **AktiviteKaydi**: değişmez denetim izi (aktör, varlık, eylem, önce→sonra, dosya, zaman).
  Bulgu zaman çizelgesi ve global aktivite ekranı doğrudan bu tablodur.

### İçe aktarım
- **IceAktarim**: parti kaydı — kaynak (excel | otomatik), sayaçlar (okunan/eklenen/güncellenen/elenen),
  `durum`: dogrulama_bekliyor | onaylandi | reddedildi | hata, `raporJson` (satır önizleme + elenme sebepleri).

## 3. Excel şablonu

Zorunlu kolonlar: `madde_kodu`, `baslik`, `metin`, `alan` (tanımlı alan kodları; `;`/`,`/`+` ile çoklu).
İsteğe bağlı: `ust_madde_kodu`, `kanit_tipi`. Kurallar: kod regülasyon içinde tekildir ve tekrar
aktarım **günceller, çoğaltmaz**; alan eşleşmeyen satır elenir ve raporda sebep gösterilir.
Şablon, İçe aktarım ekranından indirilir.

## 4. Otomatik çekim (2. aşama)

Regülasyonun `kaynakUrl`'i izlenir; yeni/değişen doküman `denetim-analisti` ajanıyla maddelere
bölünür ve **aynı onay kuyruğuna** düşer — Excel ile aynı hat, yeni bir akış yazılmaz. Adaptör
kırıldığında sistem sessizce eskimemeli: son başarılı çekim tarihi izlenir, eşik aşımında uyarılır.
