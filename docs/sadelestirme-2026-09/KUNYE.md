# Önce / sonra kare seti — sadeleştirme programı

Bu klasördeki kareler `docs/UX_SADELESTIRME_RAPORU.md` ve
`docs/UX_SIMPLIFICATION_AUDIT.md` belgelerinin görsel kanıtıdır.

## Nasıl alındı

İki çalışan sunucu yan yana koşturuldu:

| | Kaynak | Kapı |
| --- | --- | --- |
| **önce** | `4cde36f` — dalın tabanı, ayrı bir çalışma ağacında | 3211 |
| **sonra** | `design/end-user-simplification-v2` HEAD | 3210 |

İkisi de **aynı tohum veritabanının kopyasıyla**, aynı tohum
kullanıcısıyla (`prisma/seed.ts`) ve `reducedMotion: 'reduce'` ile
koştu; tek değişken kodun kendisidir. Gerçek kurum sistemine
bağlanılmadı, gerçek kimlik bilgisi kullanılmadı.

Kareler `deviceScaleFactor: 1` ile ve **katlamayı** gösterecek şekilde
alındı (`fullPage: false`): sorun katlamanın altında ne olduğu değil,
kullanıcının ilk ekranda ne gördüğüdür.

## Bantlar

Beş bant §30'un istediğidir: `1440×900 · 1366×768 · 1024×800 ·
768×900 · 375×812`.

## Dosya adı

`<ekran>-<bant>-<once|sonra>.png`

| Ekran | Bantlar | Niçin bu ekran |
| --- | --- | --- |
| `bulgu-detay` | beşi de | Programın tek P0'ı; kapanış yolu burada kuruldu |
| `topoloji` | 1440 · 375 | Temel şeridi katlanır özete indi |
| `portfoy` | 1440 · 375 | Satır başına tekrarlanan 48 etiket kaş kolona indi |
| `dokumanlar` | 1440 · 375 | Yarım kontrol listesi dörtte kesildi |
| `sayim` | 1440 · 375 | Boş durum artık "ne yapabilirim" diyor |

`bulgu-detay` kaydı tohumdan seçildi: **kritik · aksiyonda**, yani
kapanış yolunun analiz ve aksiyon adımları dolu, doğrulama ve kapanış
adımları boş. Kapanış şeridini en çok konuşturan hâl budur.

## Ölçülen fark (`bulgu-detay`)

Karelerin yanında duran sayı; ikisi de tarayıcıda ölçüldü.

| Bant | Gövde metni önce → sonra | Sayfa boyu önce → sonra |
| --- | --- | --- |
| 1440×900 | 2 990 → **2 381** | 999px → **900px** |
| 1366×768 | 2 948 → **2 339** | 999px → **825px** |
| 1024×800 | 2 870 → **2 294** | 1 164px → **946px** |
| 768×900 | 2 903 → **2 294** | 1 035px → **907px** |
| 375×812 | 2 795 → **2 287** | 1 272px → **1 332px** |

375'te sayfa boyu ARTTI ve bu bilinçlidir: kapanış şeridi telefonda alt
alta dizilir. Karşılığında kullanıcı, kaydı kapatmak için ne gerektiğini
tek bakışta görür — eskiden bu cevabı dört ayrı yerden kendisi
topluyordu. Metin her bantta azaldı.
