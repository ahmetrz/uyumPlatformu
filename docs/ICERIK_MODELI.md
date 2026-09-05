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
- **Sektor** → **TesisTipi** → **Tesis**: iş kolu > kırılım > santral hiyerarşisi.
  Tesis yaşam döngüsü: `durum` (`aktif`/`kapali`) + `kapanisTarihi` + `kapanisNedeni`.
- **Regulasyon**: kod, ad, sürüm, resmî kaynak URL (otomatik çekim adaptörünün adresi), aktiflik.
- **KapsamAlani**: BT, OT… Maddelerle **MaddeAlan** üzerinden çoktan-çoğa eşleştirilir.

### Uyum izleme
- **UyumSureci** (denetim dönemi): regülasyonun belirli tesis kapsamında yürütülen çalışması.
  `durum`: planlandi | aktif | pasif | tamamlandi. Kapsamı **SurecKapsami** taşır; kapsama tesis
  eklenince o tesise tüm yaprak maddeler için durum kaydı açılır.
- **Madde**: regülasyona bağlı, kendine referanslı hiyerarşi (bölüm > madde > alt madde).
- **MaddeDurumu**: `(surec × madde × tesis)` — sistemin en sık okunan tablosu.
  `durum`: uyumlu | kismi | uyumsuz | incelemede | kapsamdisi.
- **Bulgu** → **Aksiyon**: önem (kritik/yüksek/orta/düşük), bulgu durumu, hedef/kapanma tarihleri.
- **Kanit** + **KanitBaglantisi**: çoktan-çoğa — tek kanıt birden çok regülasyonun maddesini
  karşılar (crosswalk). Tazelik türetilir: <90 gün taze, 90–180 yenilenmeli, >180 süresi doldu.
- **MaddeEslestirmesi**: regülasyonlar arası denklik (tam | kismi | ilgili) — eşleştirme matrisi.
- **Proje** + **ProjeBaglantisi**: uyum projeleri ↔ madde/bulgu.

### Yetki ve iz
- **Kullanici** + **Yetki**: kapsam `(kullanici × surec × tesis)`; boş alan "tümü" demektir.
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
