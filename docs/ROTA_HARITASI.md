# Rota haritası

`web/app` altındaki her `page.tsx` için: rota · kabuk yönü · oturum gereksinimi
· okunan modül(ler) · kısa amaç. Kaynak koddan türetilmiştir; yeni bir
`page.tsx` eklendiğinde bu tablo ve `web/arac/rotalar.json` birlikte güncellenir.

**Kabuk yönü** `components/kabuk/yonler.ts → yonSec(patika)` ile rotadan
seçilir: `/`, `/tesisler/*`, `/portfoy`, `/giris` → **B · saha**; `/uyum`,
`/regulasyonlar`, `/riskler`, `/denetimler`, `/bulgular`, `/projeler`,
`/surecler`, `/raporlar`, `/eslestirme`, `/aktivite`, `/kanitlar` (ve alt
rotaları) → **C · defter**; eşleşmeyen her rota → **A · tezgâh**. Üç kabuk
da koyu temadır; ayrım zemin sıcaklığı ve tipografidir (`web/DESIGN.md`).

**Oturum** sütunu: `girisZorunlu()` çağıran sayfa oturumsuz istekte `/giris`e
yönlendirir. Statik demoda (`NEXT_PUBLIC_DEMO=1`) oturum yerine demo
kullanıcısı geçer ve yazma işlemleri kapalıdır. **Modül** sütunu ekranın
veri katmanında kapsam daralttığı modül(ler)dir (`izinliTesisIdleri`,
`izinVar`); yazma eylemleri kendi `yetkiZorunlu` kapısını ayrıca uygular.

## B · saha — fotoğrafik hero, yatay sekme, ray yok

| Rota | Oturum | Modül | Amaç |
| --- | --- | --- | --- |
| `/` | zorunlu | uyum · risk · tanımlar | Bugün — yönetim dikkatine ne gerekiyor: odak kartı, dikkat paneli, saha şeridi, takvim |
| `/tesisler` | — | — | `/portfoy`a yönlendirir; iki santral listesi tutulmaz |
| `/tesisler/[id]` | zorunlu | uyum · tanımlar | Santral 360 — bu santral kontrol altında mı: künye, OT profili, üretim zinciri, üniteler, açık bulgular. Kapsam dışı santral `notFound()` |
| `/portfoy` | zorunlu | uyum | Enerji portföyü — hangi santral beni istiyor: uyum endeksi × kurulu güç düzlemi, santral seçici |
| `/giris` | yok | — | Giriş — kabuk dışı tek ekran; B paleti, 400px form kolonu, oran sınırı ve denetim izi |

## A · tezgâh — 52px kapsam çubuğu + ikon rayı + 30px durum ayağı

| Rota | Oturum | Modül | Amaç |
| --- | --- | --- | --- |
| `/envanter` | zorunlu | envanter | Varlık zekâsı — ilişki grafiği ve tablo kipi; yedi halkalı yönetişim zinciri, düğüm paneli, envanter kaynağı ayağı |
| `/kesif` | zorunlu | envanter | Varlık keşfi — inceleme kuyruğu; hiçbir kayıt otomatik onaylanmaz |
| `/topoloji` | zorunlu | envanter · risk · uyum | Ağ / OT topolojisi — sapma tezgâhı: anlık görüntü, temel durum, sapma kararı |
| `/omur` | zorunlu | envanter | Ömür yönetimi — EOL/EOS kuyruğu, telafi edici kontrol ve bağlı proje |
| `/yedekleme` | zorunlu | envanter · uyum · yönetim | Yedekleme & kurtarma — kurtarabilir miyiz: koşu, geri yükleme testi, konfigürasyon yedeği |
| `/kimlik` | zorunlu | envanter · risk | Erişim incelemesi — kimin fazla yetkisi var: hesap, atama, inceleme |
| `/tedarikciler` | zorunlu | envanter | Tedarikçiler — sözleşme, sertifika, uzaktan erişim oturumları |
| `/olaylar` | zorunlu | envanter · yönetim | Olaylar — olay → etki zinciri, onay ve öneri |
| `/operasyon` | zorunlu | envanter | Değişiklik yönetimi — OT emniyet kapılı değişiklik kayıtları |
| `/saglik` | zorunlu | envanter · yönetim | Platform sağlığı — motor, connector, veri kalitesi ve veri kökeni |
| `/saglik/reddedilenler` | zorunlu | yönetim | Reddedilen kayıtlar — dead-letter kuyruğu; kapatmak yazma ister |
| `/bildirimler` | zorunlu | uyum | Bildirim kutusu — motorların ürettiği uyarılar, okunma hâli |
| `/yetkiler` | zorunlu | yönetim | Kullanıcı ve yetki — kim neye erişiyor; onay olmadan yetki değişmez |
| `/esleme` | zorunlu | yönetim | Eşleme profilleri — connector alan eşlemesi, sürüm ve yayın |
| `/varlik-aktarim` | zorunlu | envanter | Varlık aktarımı — CMDB toplu içe aktarım: önizleme, hata listesi, onay |
| `/ice-aktarim` | zorunlu | tanımlar | Madde içe aktarımı — regülasyon maddesi dosyası; onay olmadan yayına girmez |
| `/yonetim-tezgahi` | zorunlu | tanımlar · uyum · yönetim | Yönetim tezgâhı — tanım katalogları, görev/onay merkezi, dış API anahtarları |
| `/ayarlar` | zorunlu | yönetim | Ayarlar — ben kimim, nereye girebiliyorum, oturumum ne durumda (yalnız oturum kapısı) |
| `/yardim` | var | — | Yardım — okuma anahtarı, kısayollar, sık sorulanlar; kayıt okumaz, içerik koddan türer |
| `/sistem` | zorunlu | — | Tasarım sistemi — `kabuk.css` token'larını okur, kontrastı hesaplar; değer iddia etmez |
| `/sistem/bilesenler` | zorunlu | — | Bileşen galerisi — paylaşılan primitifler her durumda |

## C · defter — künye + serif sekme + 212px editoryal dizin

| Rota | Oturum | Modül | Amaç |
| --- | --- | --- | --- |
| `/uyum` | zorunlu | uyum · denetim · tanımlar | Uyum kontrol odası — nerede uyumsuzuz: devrik matris (satır = kontrol, sütun = santral), satır içi gerekçe |
| `/uyum/[cerceve]` | zorunlu | uyum | Çerçeve detayı — bu regülasyon bizde nerede duruyor; parametre regülasyon kodudur |
| `/regulasyonlar` | zorunlu | tanımlar | Regülasyon kütüphanesi — çerçeve, sürüm ve madde kataloğu (tanım, değerlendirme değil) |
| `/riskler` | zorunlu | risk | Risk kütüğü — skor iki kanal (rakam + tik şeridi), süreli/onaylı kabul |
| `/riskler/[id]` | zorunlu | risk | Risk detayı — kapanma zinciri ve skor eğilimi gerçek veriden; olmayan halka uydurulmaz |
| `/denetimler` | zorunlu | denetim | Denetim programı — hangi denetim takvimini tutmuyor |
| `/denetimler/[id]` | zorunlu | denetim | Denetim detayı — yaşam döngüsü rayı, kanıt talebi, kapanış engeli |
| `/bulgular` | zorunlu | uyum | Bulgu & CAPA — bulgu · aksiyon · sahip · son tarih · doğrulama |
| `/bulgular/[id]` | zorunlu | uyum | Bulgu kaydı — aksiyonlar, kanıt, denetim izi zaman çizelgesi |
| `/projeler` | zorunlu | proje | Dönüşüm portföyü — hangi proje taahhüdünü tutmuyor: ilerleme, gecikme, bütçe sapması |
| `/surecler` | zorunlu | uyum | Uyum süreçleri — kampanya kütüğü, denetim tarihine yetişme |
| `/surecler/[id]` | zorunlu | uyum | Uyum kampanyası — kampanya × madde × santral değerlendirmeleri |
| `/raporlar` | zorunlu | uyum · denetim | Portföy raporu — santral × süreç matrisi, rapor hedefi |
| `/raporlar/kanit-paketi` | zorunlu | uyum · denetim | Kanıt paketi — paketlenebilir kapsamlar; üretim sunucu eylemine devredilir |
| `/eslestirme` | zorunlu | tanımlar | Çapraz eşleme — hangi madde hangi maddeyi karşılıyor; yalnız yaprak maddeler |
| `/aktivite` | zorunlu | denetim | Denetim izi — kim neyi ne zaman değiştirdi; salt okunur |
| `/kanitlar` | zorunlu | uyum | Kanıt kütüphanesi — kanıt · tip · tarih · bağlı kayıt · yükleyen; dosya yükleme bu sürümde yok |

## Sistem sayfaları

Kabuğun dışında da aynı dilde konuşur: `.ab[data-yon='a']` sarmalayıcısı
paleti getirir, `components/kabuk/SistemSayfasi.tsx` iskeleti çizer.

| Sayfa | Dosya | Ne zaman |
| --- | --- | --- |
| 404 · Sayfa yok | `app/not-found.tsx` | Eşleşmeyen adres ve `notFound()` çağrıları (kapsam dışı kayıt dahil). Çıkış: ana ekran, uyum defteri, varlık envanteri; genel arama Ctrl / ⌘ + K |
| 500 · Sunucu hatası | `app/error.tsx` | Kök hata sınırı; üretimde yalnız `digest` gösterilir, `reset` segmenti yeniden dener |
| 500 · Uygulama hatası | `app/global-error.tsx` | Kök yerleşim bile çökerse; `<html>/<body>` ve stil yaprakları burada tekrar edilir |
| 503 · Bakım | `app/(giris)/bakim/page.tsx` → `/bakim` | Yük dengeleyicinin bakım sırasında yönlendirdiği rota; kabuk yok, oturum şartı yok |
| Bakım anahtarı | `app/layout.tsx` | `BAKIM_MODU=1` ile sunucu **her** ekranın yerine bakım ekranını çizer (API rotaları etkilenmez); metin `BAKIM_NOTU` ile verilir, bitiş saati uydurulmaz. Statik yayında ortam değişkeni yoktur |

## Dış API uçları (`app/api/v1`)

Ekran değil, anahtarla kimliklenen HTTP uçlarıdır; dosya adı `route.api.ts`
olduğu için statik demo derlemesine girmezler (`next.config.ts`). Kimlik,
yetki, oran sınırı ve şema `lib/api` altındadır ([MIMARI.md](MIMARI.md)).

| Uç | Kaynak |
| --- | --- |
| `/api/v1/plants` | `lib/api/uclar/santraller.ts` |
| `/api/v1/assets` · `/api/v1/assets/upsert` · `/api/v1/assets/observations` | `lib/api/uclar/varliklar.ts` · `varlikYazma.ts` · `varlikGozlemleri.ts` |
| `/api/v1/vulnerabilities` | `lib/api/uclar/zafiyetler.ts` |
| `/api/v1/backup-results` | `lib/api/uclar/yedekler.ts` |
| `/api/v1/access-observations` | `lib/api/uclar/erisimler.ts` |
| `/api/v1/evidence` | `lib/api/uclar/kanitlar.ts` |
| `/api/v1/integration-runs` | `lib/api/uclar/kosular.ts` |

## Notlar

- Dinamik segmentler (`/tesisler/[id]`, `/uyum/[cerceve]`, `/bulgular/[id]`,
  `/riskler/[id]`, `/denetimler/[id]`, `/surecler/[id]`) statik demoda
  `generateStaticParams` ile önceden üretilir.
- Rota duman testi (`arac/rota-duman.mjs`) ve erişilebilirlik taramaları
  `arac/rotalar.json` listesini okur; `/giris` ve `/bakim` oturumsuz olduğu
  için listede değildir ve ayrı ölçülür.
- Kod adları arayüzde görünmez: rota grubu adları (`(kabuk)`, `(flagship)`,
  `(operasyonel)`, `(tam)`) yalnız yerleşimi seçer, URL'e yansımaz.
