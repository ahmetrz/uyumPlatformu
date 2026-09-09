/* ═══ P4 · PAKET DOĞRULAYICI ═════════════════════════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §3: tarayıcısız, saniyeler içinde,
   çıktı Türkçe — dosya + konum + ne yanlış + nasıl düzeltilir. "Hata var"
   demez; nerede, ne, nasıl der. Kural, kapıların kendi kuralıdır: gerekçe
   kusuru anlatır.

   Hata sınıfları (§3): BIÇIM · KİMLİK · SÖZLÜK · ÖZNİTELİK · LİSANS · SÜRÜM ·
   KAPSAM TÜRÜ. Doğrulayıcı OKUR, yazmaz; kurucu (`kur.ts`) ancak `ok`
   olan paketi yazar — tek hata bile paketi reddeder (kısmi yazma yok).

   Özet kuralı: `manifest.icerikOzetleri` her içerik dosyasının sha256'sını
   taşır. Listede olmayan dosya, eksik dosya ve uyuşmayan özet üçü de
   KIRMIZI — paket "elle bir satır değiştirildi" hâliyle kurulamaz. */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ZodError } from 'zod';
import * as XLSX from 'xlsx';
import { OLGUNLUK_ASGARI, OLGUNLUK_AZAMI } from '../uyum/olgunluk';
import {
  BASLIK_SINIRI, CEKIRDEK_ROLLER, CerceveKimligiSemasi, DIS_KIMLIK_SINIRI, DOSYALAR, FormSablonuSemasi, ISLEM_ONKOSULU,
  KapsamTuruSatiriSemasi, MADDE_SUTUNLARI, MADDE_ZORUNLU_SUTUNLAR, ManifestSemasi, OLCU_ALANI, OZET_DISI, OZNITELIK_ROLLERI,
  OznitelikSatiriSemasi, RaporSablonuSemasi, RolSatiriSemasi, SozlukSatiriSemasi, YukumlulukSatiriSemasi, ZORUNLULUK_TIPLERI,
  csvAyristir, sha256,
  type CerceveKimligi, type FormSablonu, type KapsamTuruSatiri, type MaddeSatiri, type Manifest, type OznitelikSatiri,
  type RaporSablonu, type RolSatiri, type SozlukSatiri, type YukumlulukSatiri,
} from './bicim';

export type HataSinifi = 'BIÇIM' | 'KİMLİK' | 'SÖZLÜK' | 'ÖZNİTELİK' | 'LİSANS' | 'SÜRÜM' | 'KAPSAM TÜRÜ';
export type DogrulamaHatasi = {
  sinif: HataSinifi; dosya: string; konum?: string; mesaj: string; duzeltme: string;
};

export type Cerceve = { dosya: string; kimlik: CerceveKimligi; maddeler: MaddeSatiri[] };
export type PaketIcerigi = {
  dizin: string;
  manifest: Manifest;
  sozluk: SozlukSatiri[];
  kapsamTurleri: KapsamTuruSatiri[];
  oznitelikler: OznitelikSatiri[];
  cerceveler: Cerceve[];
  yukumlulukler: YukumlulukSatiri[];
  formlar: FormSablonu[];
  raporlar: RaporSablonu[];
  roller: RolSatiri[];
};
export type Sayilar = {
  sozluk: number; kapsamTurleri: number; oznitelikler: number; cerceveler: number; maddeler: number; yukumlulukler: number;
  formlar: number; raporlar: number; roller: number;
};
export type DogrulamaSonucu = {
  ok: boolean;
  hatalar: DogrulamaHatasi[];
  icerik: PaketIcerigi | null;
  sayilar: Sayilar;
};

/** Tek satır: `dosya:konum — SINIF: mesaj → düzeltme` */
export function hataSatiri(h: DogrulamaHatasi): string {
  return `${h.dosya}${h.konum ? ':' + h.konum : ''} — ${h.sinif}: ${h.mesaj} → ${h.duzeltme}`;
}

function zodHatalari(e: ZodError, dosya: string, sinif: HataSinifi, duzeltme: string): DogrulamaHatasi[] {
  return e.issues.map((i) => ({
    sinif, dosya, konum: i.path.join('.') || undefined,
    mesaj: i.code === 'unrecognized_keys'
      ? `bilinmeyen alan: ${(i as { keys?: string[] }).keys?.join(', ') ?? '?'}`
      : i.message,
    duzeltme,
  }));
}

function jsonOku(yol: string): { deger: unknown } | { hata: string } {
  try {
    return { deger: JSON.parse(readFileSync(yol, 'utf8').replace(/^﻿/, '')) };
  } catch (e) {
    return { hata: e instanceof Error ? e.message : String(e) };
  }
}

/** Paketteki içerik dosyaları (manifest ve belge hariç), dizine göreli, `/` ayraçlı. */
export function icerikDosyalari(dizin: string): string[] {
  const sonuc: string[] = [];
  const gez = (alt: string) => {
    for (const e of readdirSync(path.join(dizin, alt), { withFileTypes: true })) {
      const goreli = alt ? `${alt}/${e.name}` : e.name;
      if (e.isDirectory()) { gez(goreli); continue; }
      if (OZET_DISI.has(goreli) || e.name.startsWith('.')) continue;
      sonuc.push(goreli);
    }
  };
  gez('');
  return sonuc.sort();
}

/** Dosyaların sha256 özetleri — manifest yazarken de kullanılır (`--ozet-yaz`). */
export function ozetleriHesapla(dizin: string): Record<string, string> {
  const ozetler: Record<string, string> = {};
  for (const d of icerikDosyalari(dizin)) ozetler[d] = sha256(readFileSync(path.join(dizin, d)));
  return ozetler;
}

const bos: Sayilar = { sozluk: 0, kapsamTurleri: 0, oznitelikler: 0, cerceveler: 0, maddeler: 0, yukumlulukler: 0, formlar: 0, raporlar: 0, roller: 0 };

export function paketiDogrula(dizin: string): DogrulamaSonucu {
  const hatalar: DogrulamaHatasi[] = [];
  const red = (): DogrulamaSonucu => ({ ok: false, hatalar, icerik: null, sayilar: { ...bos } });

  if (!existsSync(dizin) || !statSync(dizin).isDirectory()) {
    hatalar.push({ sinif: 'BIÇIM', dosya: dizin, mesaj: 'paket dizini yok', duzeltme: 'dizin yolunu kontrol edin' });
    return red();
  }

  /* ── manifest ─────────────────────────────────────────────────────── */
  const manifestYolu = path.join(dizin, DOSYALAR.manifest);
  if (!existsSync(manifestYolu)) {
    hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.manifest, mesaj: 'manifest.json yok',
      duzeltme: 'paketler/BENIOKU.md şablonuyla manifest.json oluşturun' });
    return red();
  }
  const ham = jsonOku(manifestYolu);
  if ('hata' in ham) {
    hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.manifest, mesaj: `JSON okunamadı: ${ham.hata}`,
      duzeltme: 'JSON sözdizimini düzeltin (virgül, tırnak)' });
    return red();
  }
  const mp = ManifestSemasi.safeParse(ham.deger);
  if (!mp.success) {
    for (const h of zodHatalari(mp.error, DOSYALAR.manifest, 'BIÇIM', 'alanı manifest şemasına göre doldurun (BENIOKU.md §manifest)')) {
      // sınıf inceltme: sürüm ve lisans kendi sınıfında
      if (h.konum === 'surum') h.sinif = 'SÜRÜM';
      if (h.konum?.startsWith('lisans')) h.sinif = 'LİSANS';
      if (h.mesaj.includes('Required') || h.mesaj.includes('expected')) h.mesaj = `eksik ya da yanlış tipte alan: ${h.konum}`;
      hatalar.push(h);
    }
    return red();
  }
  const manifest = mp.data;

  /* Dizin adı = paket kodu. Kopyalanmış ya da yanlış adlı bir dizin
     (`paketler/TR-YENI` içinde `manifest.kod = TR-ESKI`) istenen kod
     yerine BAŞKA bir paketi kurar ve onun satırlarını ezerdi; kimlik
     manifestten okunur ama dizin adıyla uyuşmak ZORUNDADIR (inceleme
     bulgusu, PR #41). */
  const dizinAdi = path.basename(path.resolve(dizin));
  if (manifest.kod !== dizinAdi) {
    hatalar.push({ sinif: 'KİMLİK', dosya: DOSYALAR.manifest, konum: 'kod',
      mesaj: `manifest kodu "${manifest.kod}" dizin adıyla uyuşmuyor: "${dizinAdi}"`,
      duzeltme: `paket dizininin adı manifest.kod ile aynı olmalı (paketler/${manifest.kod})` });
  }

  // çapraz alan kuralları
  if ((manifest.tur === 'sektor' || manifest.tur === 'demo') && !manifest.sektor) {
    hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.manifest, konum: 'sektor',
      mesaj: `tur=${manifest.tur} paketi sektör beyan etmeli`, duzeltme: '`sektor: { kod, ad }` yazın' });
  }
  if (manifest.tur === 'yatay' && manifest.sektor) {
    hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.manifest, konum: 'sektor',
      mesaj: 'yatay paket sektör taşıyamaz', duzeltme: '`sektor: null` yazın ya da tur=sektor yapın' });
  }
  if (manifest.tur !== 'uluslararasi' && !manifest.ulke) {
    hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.manifest, konum: 'ulke',
      mesaj: 'ülke boş — yalnız uluslararası paket ülkesizdir', duzeltme: '`ulke: "TR"` yazın' });
  }
  if (manifest.lisans.tur === 'telifli' && manifest.lisans.metinDahil) {
    hatalar.push({ sinif: 'LİSANS', dosya: DOSYALAR.manifest, konum: 'lisans.metinDahil',
      mesaj: 'telifli paket metin dâhil edemez', duzeltme: '`metinDahil: false` yapın; telifli çerçevede yalnız yapı ve kimlik girer' });
  }

  /* ── özetler: eksik · uyuşmaz · listede yok ───────────────────────── */
  const mevcut = icerikDosyalari(dizin);
  for (const [d, beklenen] of Object.entries(manifest.icerikOzetleri)) {
    const yol = path.join(dizin, d);
    if (!existsSync(yol)) {
      hatalar.push({ sinif: 'BIÇIM', dosya: d, mesaj: 'manifest bu dosyayı listeliyor ama dosya yok',
        duzeltme: 'dosyayı ekleyin ya da icerikOzetleri satırını silin' });
      continue;
    }
    const olculen = sha256(readFileSync(yol));
    if (olculen !== beklenen) {
      hatalar.push({ sinif: 'BIÇIM', dosya: d, mesaj: `özet uyuşmazlığı: manifest ${beklenen.slice(0, 12)}…, dosya ${olculen.slice(0, 12)}…`,
        duzeltme: 'dosya değiştiyse `npm run paket:dogrula -- <dizin> --ozet-yaz` ile özetleri yeniden yazın' });
    }
  }
  for (const d of mevcut) {
    if (!(d in manifest.icerikOzetleri)) {
      hatalar.push({ sinif: 'BIÇIM', dosya: d, mesaj: 'dosya pakette ama icerikOzetleri listesinde yok',
        duzeltme: '`--ozet-yaz` ile listeye alın ya da dosyayı paketten çıkarın' });
    }
  }

  /* ── JSON listeleri ───────────────────────────────────────────────── */
  function liste<T>(dosya: string, sema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false; error: ZodError } },
    sinif: HataSinifi, duzeltme: string): T[] {
    const yol = path.join(dizin, dosya);
    if (!existsSync(yol)) return [];
    const j = jsonOku(yol);
    if ('hata' in j) {
      hatalar.push({ sinif: 'BIÇIM', dosya, mesaj: `JSON okunamadı: ${j.hata}`, duzeltme: 'JSON sözdizimini düzeltin' });
      return [];
    }
    if (!Array.isArray(j.deger)) {
      hatalar.push({ sinif: 'BIÇIM', dosya, mesaj: 'dosya bir dizi (`[...]`) olmalı', duzeltme: 'kök öğeyi diziye çevirin' });
      return [];
    }
    const sonuc: T[] = [];
    j.deger.forEach((satir, i) => {
      const p = sema.safeParse(satir);
      if (p.success) sonuc.push(p.data);
      else for (const h of zodHatalari(p.error, dosya, sinif, duzeltme)) hatalar.push({ ...h, konum: `[${i}]${h.konum ? '.' + h.konum : ''}` });
    });
    return sonuc;
  }
  const tekil = (dosya: string, sinif: HataSinifi, anahtarlar: string[], etiket: string) => {
    const gorulen = new Set<string>();
    anahtarlar.forEach((k, i) => {
      if (gorulen.has(k)) hatalar.push({ sinif, dosya, konum: `[${i}]`, mesaj: `${etiket} tekrar ediyor: ${k}`, duzeltme: 'satırlardan birini silin ya da kodu değiştirin' });
      gorulen.add(k);
    });
  };

  const sozluk = liste<SozlukSatiri>(DOSYALAR.sozluk, SozlukSatiriSemasi, 'SÖZLÜK', 'altı hâlin hepsini yazın: tekil · çoğul · iyelik · belirtme · bulunma · yönelme');
  tekil(DOSYALAR.sozluk, 'KİMLİK', sozluk.map((s) => `${s.anahtar}@${s.dil}`), 'sözlük anahtarı (anahtar@dil)');

  const kapsamTurleri = liste<KapsamTuruSatiri>(DOSYALAR.kapsamTurleri, KapsamTuruSatiriSemasi, 'KAPSAM TÜRÜ', 'tür satırı: kod (küçük harf) · ad · tesiseBagli · sira');
  tekil(DOSYALAR.kapsamTurleri, 'KİMLİK', kapsamTurleri.map((t) => t.kod), 'tür kodu');

  const oznitelikler = liste<OznitelikSatiri>(DOSYALAR.oznitelikler, OznitelikSatiriSemasi, 'ÖZNİTELİK', 'öznitelik satırı: anahtar · tip (sayi|metin|mantik|tarih) · etiketAnahtari · rol? · grup? · secenekler? · sira');
  tekil(DOSYALAR.oznitelikler, 'KİMLİK', oznitelikler.map((o) => o.anahtar), 'öznitelik anahtarı');
  oznitelikler.forEach((o, i) => {
    const konum = `[${i}] ${o.anahtar}`;
    /* Mesajlar JSON alan YOLUNU (`.birim`) anar, çekirdek sözcüğü değil —
       çekirdek sözcük taraması sözlükten geçmeyen sabit metni kırmızı yakar. */
    const olcu = `\`.${OLCU_ALANI}\``;
    if (o.birim && o.tip !== 'sayi') hatalar.push({ sinif: 'ÖZNİTELİK', dosya: DOSYALAR.oznitelikler, konum, mesaj: `${olcu} yalnız sayi tipinde dolar (tip=${o.tip})`, duzeltme: `${olcu} alanını kaldırın ya da tipi sayi yapın` });
    if (o.secenekler && o.tip !== 'metin') hatalar.push({ sinif: 'ÖZNİTELİK', dosya: DOSYALAR.oznitelikler, konum, mesaj: `seçenek listesi yalnız metin tipinde olur (tip=${o.tip})`, duzeltme: 'seçenekleri kaldırın ya da tipi metin yapın' });
    if (o.rol === OZNITELIK_ROLLERI[0] && o.tip !== 'sayi') hatalar.push({ sinif: 'ÖZNİTELİK', dosya: DOSYALAR.oznitelikler, konum, mesaj: `rol=${o.rol} sayi tipinde olmalı (kimlik kartında ${olcu} ile yazılır)`, duzeltme: `tipi sayi yapın ve ${olcu} verin` });
  });
  /* Ölçüt paket türü değil SEKTÖRÜN YOKLUĞUDUR: sektörsüz bir
     `uluslararasi` paket sözlük/öznitelik beyan edip geçiyor, kurucu
     `sektorId` boş diye döngüyü kırıp içeriği SESSİZCE düşürüyordu
     (inceleme bulgusu, PR #41). */
  if (!manifest.sektor && oznitelikler.length > 0) {
    hatalar.push({ sinif: 'ÖZNİTELİK', dosya: DOSYALAR.oznitelikler, mesaj: `sektörsüz paket (tur=${manifest.tur}) sektör özniteliği beyan edemez (şema sektöre bağlı)`,
      duzeltme: 'öznitelikleri sektör paketine taşıyın ya da manifestte sektör beyan edin' });
  }
  if (!manifest.sektor && sozluk.length > 0) {
    hatalar.push({ sinif: 'SÖZLÜK', dosya: DOSYALAR.sozluk, mesaj: `sektörsüz paket (tur=${manifest.tur}) sektör sözlüğü beyan edemez (sözlük sektöre bağlı)`,
      duzeltme: 'sözlüğü sektör paketine taşıyın ya da manifestte sektör beyan edin' });
  }
  const rolSayisi = new Map<string, number>();
  for (const o of oznitelikler) if (o.rol) rolSayisi.set(o.rol, (rolSayisi.get(o.rol) ?? 0) + 1);
  for (const [rol, n] of rolSayisi) if (n > 1) hatalar.push({ sinif: 'ÖZNİTELİK', dosya: DOSYALAR.oznitelikler, mesaj: `rol=${rol} ${n} öznitelikte — çekirdek rolü tek satırdan okur`, duzeltme: 'rolü tek özniteliğe verin' });

  /* ── çerçeveler ───────────────────────────────────────────────────── */
  const cerceveler: Cerceve[] = [];
  const cerceveDizini = path.join(dizin, DOSYALAR.cerceveDizini);
  if (existsSync(cerceveDizini)) {
    for (const dosyaAdi of readdirSync(cerceveDizini).filter((d) => d.endsWith('.json')).sort()) {
      const dosya = `${DOSYALAR.cerceveDizini}/${dosyaAdi}`;
      const j = jsonOku(path.join(cerceveDizini, dosyaAdi));
      if ('hata' in j) { hatalar.push({ sinif: 'BIÇIM', dosya, mesaj: `JSON okunamadı: ${j.hata}`, duzeltme: 'JSON sözdizimini düzeltin' }); continue; }
      const p = CerceveKimligiSemasi.safeParse(j.deger);
      if (!p.success) {
        for (const h of zodHatalari(p.error, dosya, 'BIÇIM', 'çerçeve kimliği: kod · ad · surumEtiketi · lisans · maddeDosyasi')) {
          if (h.konum?.startsWith('lisans')) h.sinif = 'LİSANS';
          hatalar.push(h);
        }
        continue;
      }
      const kimlik = p.data;
      if (kimlik.lisans.tur === 'telifli' && kimlik.lisans.metinDahil) {
        hatalar.push({ sinif: 'LİSANS', dosya, konum: 'lisans.metinDahil', mesaj: `lisans sınırı: ${kimlik.kod} telifli, metin girilemez`, duzeltme: '`metinDahil: false` yapın' });
      }
      const maddeYolu = path.join(cerceveDizini, kimlik.maddeDosyasi);
      const maddeDosya = `${DOSYALAR.cerceveDizini}/${kimlik.maddeDosyasi}`;
      if (!existsSync(maddeYolu)) {
        hatalar.push({ sinif: 'BIÇIM', dosya, konum: 'maddeDosyasi', mesaj: `madde dosyası yok: ${kimlik.maddeDosyasi}`, duzeltme: 'CSV dosyasını cerceve/ altına koyun' });
        continue;
      }
      const { basliklar, satirlar, hata: csvHatasi } = csvAyristir(readFileSync(maddeYolu, 'utf8'));
      if (csvHatasi) {
        hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: '1', mesaj: csvHatasi, duzeltme: 'tırnağı kapatın; hücre içindeki tırnak `""` ile yazılır' });
        continue;
      }
      const eksik = MADDE_ZORUNLU_SUTUNLAR.filter((s) => !basliklar.includes(s));
      if (eksik.length) {
        hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: '1', mesaj: `başlık satırında zorunlu sütun eksik: ${eksik.join(', ')}`, duzeltme: `ilk satır: ${MADDE_SUTUNLARI.join(';')}` });
        continue;
      }
      const bilinmeyen = basliklar.filter((b) => !(MADDE_SUTUNLARI as readonly string[]).includes(b));
      if (bilinmeyen.length) {
        hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: '1', mesaj: `bilinmeyen sütun: ${bilinmeyen.join(', ')}`, duzeltme: `yalnız şu sütunlar: ${MADDE_SUTUNLARI.join(';')}` });
        continue;
      }
      /* Tekrar eden başlık ve başlığı aşan dolu hücre: okunmaz ama pakette
         TAŞINIRDI — telifli çerçevede ilk `metin` boş bırakılıp tam metin
         ikinci `metin` sütununa ya da satır sonuna konabiliyordu (inceleme
         bulgusu, PR #41). Lisans kontrolünden ÖNCE reddedilir. */
      const tekrarBaslik = [...new Set(basliklar.filter((b, i) => basliklar.indexOf(b) !== i))];
      if (tekrarBaslik.length) {
        hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: '1', mesaj: `sütun başlığı tekrar ediyor: ${tekrarBaslik.join(', ')} — ikinci kopya okunmaz ama içerik taşır`,
          duzeltme: 'her sütun başlığı bir kez yazılır; fazla kopyayı silin' });
        continue;
      }
      const sutun = (satir: string[], ad: string) => { const i = basliklar.indexOf(ad); return i === -1 ? '' : (satir[i] ?? '').trim(); };
      const gorulen = new Set<string>();
      const maddeler: MaddeSatiri[] = [];
      satirlar.forEach((satir, i) => {
        const no = String(i + 2);
        const fazla = satir.slice(basliklar.length).filter((h) => h.trim() !== '');
        if (fazla.length) {
          hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `satırda başlığı aşan ${fazla.length} dolu hücre var (${basliklar.length} sütun) — fazla hücre okunmaz ama içerik taşır`,
            duzeltme: 'fazla hücreyi silin; her satır en fazla başlık kadar hücre taşır' });
          return;
        }
        const kod = sutun(satir, 'kod'); const ustKod = sutun(satir, 'ust_kod') || null; const baslik = sutun(satir, 'baslik');
        if (!kod) { hatalar.push({ sinif: 'KİMLİK', dosya: maddeDosya, konum: no, mesaj: 'kod boş', duzeltme: 'her satır tekil bir kod taşır' }); return; }
        if (gorulen.has(kod)) { hatalar.push({ sinif: 'KİMLİK', dosya: maddeDosya, konum: no, mesaj: `kod tekrar ediyor: ${kod}`, duzeltme: 'kodu değiştirin ya da satırı silin' }); return; }
        /* Üst madde, bu satırdan ÖNCEKİ satırlar arasında aranır — kendisi
           dâhil değil: `ust_kod = kod` öz-referansı kabul edilip kurulumda
           sessizce köke düşüyordu (inceleme bulgusu, PR #41). Hatalı satırın
           kodu da görülmüş sayılır: sonraki tekrar yine yakalanır. */
        const ustGecerli = !ustKod || (ustKod !== kod && gorulen.has(ustKod));
        gorulen.add(kod);
        if (!ustGecerli) {
          hatalar.push({ sinif: 'KİMLİK', dosya: maddeDosya, konum: no, mesaj: `"ust_kod" değeri "${ustKod}" bulunamadı`, duzeltme: 'üst madde satırı bu satırdan ÖNCE gelmeli' });
          return;
        }
        if (!baslik) { hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `başlık boş (${kod})`, duzeltme: 'başlık yazın; telifli çerçevede en fazla 120 karakter' }); return; }
        const metin = sutun(satir, 'metin') || null;
        const kanitBeklentisi = sutun(satir, 'kanit_beklentisi') || null;
        const disKontrolId = sutun(satir, 'dis_kontrol_id') || null;
        if (kimlik.lisans.tur === 'telifli') {
          /* Telifli çerçeve yalnız YAPI taşır: kod · kısa başlık · hiyerarşi ·
             seviye · kısa dış kimlik. Metin dışındaki serbest metin alanı
             (`kanit_beklentisi`) da madde metnini taşıyabilirdi (inceleme
             bulgusu, PR #41) — o da reddedilir; dış kimlik sınırlıdır. */
          if (metin) hatalar.push({ sinif: 'LİSANS', dosya: maddeDosya, konum: no, mesaj: `lisans sınırı: ${kimlik.kod} telifli, metin girilemez (${kod})`, duzeltme: 'metin sütununu boş bırakın; kurulumda "lisans nedeniyle girilmedi" yazılır' });
          if (baslik.length > BASLIK_SINIRI) hatalar.push({ sinif: 'LİSANS', dosya: maddeDosya, konum: no, mesaj: `telifli çerçevede başlık ${baslik.length} karakter > ${BASLIK_SINIRI} (${kod})`, duzeltme: 'başlığı kısaltın' });
          if (kanitBeklentisi) hatalar.push({ sinif: 'LİSANS', dosya: maddeDosya, konum: no, mesaj: `lisans sınırı: ${kimlik.kod} telifli, kanit_beklentisi serbest metindir, girilemez (${kod})`, duzeltme: 'kanit_beklentisi sütununu boş bırakın; telifli çerçeve yalnız yapı taşır' });
          if (disKontrolId && disKontrolId.length > DIS_KIMLIK_SINIRI) hatalar.push({ sinif: 'LİSANS', dosya: maddeDosya, konum: no, mesaj: `telifli çerçevede dis_kontrol_id ${disKontrolId.length} karakter > ${DIS_KIMLIK_SINIRI} (${kod}) — kimlik, metin değil`, duzeltme: 'dış kimliği kısa yazın' });
        } else if (!kimlik.lisans.metinDahil && metin) {
          hatalar.push({ sinif: 'LİSANS', dosya: maddeDosya, konum: no, mesaj: `metinDahil=false ama ${kod} metin taşıyor`, duzeltme: 'ya kimlikte metinDahil=true yapın ya metni kaldırın' });
        }
        const siraHam = sutun(satir, 'sira'); const seviyeHam = sutun(satir, 'seviye'); const zt = sutun(satir, 'zorunluluk_tipi') || null;
        const sira = siraHam ? Number(siraHam) : i;
        if (!Number.isInteger(sira)) { hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `sira tam sayı değil: ${siraHam}`, duzeltme: 'tam sayı yazın ya da boş bırakın' }); return; }
        const seviye = seviyeHam ? Number(seviyeHam) : null;
        if (seviye !== null && !Number.isInteger(seviye)) { hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `seviye tam sayı değil: ${seviyeHam}`, duzeltme: 'tam sayı yazın ya da boş bırakın' }); return; }
        /* Ürünün olgunluk ölçeği 0–5'tir (`lib/uyum/olgunluk.ts`); dışındaki
           tam sayı ekranda tanımsız etiket ve dağılımda kayıp üretirdi. */
        if (seviye !== null && (seviye < OLGUNLUK_ASGARI || seviye > OLGUNLUK_AZAMI)) { hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `seviye ${OLGUNLUK_ASGARI}–${OLGUNLUK_AZAMI} aralığında olmalı: ${seviyeHam} (${kod})`, duzeltme: `olgunluk seviyesini ${OLGUNLUK_ASGARI}–${OLGUNLUK_AZAMI} arası yazın ya da boş bırakın` }); return; }
        if (zt && !(ZORUNLULUK_TIPLERI as readonly string[]).includes(zt)) { hatalar.push({ sinif: 'BIÇIM', dosya: maddeDosya, konum: no, mesaj: `zorunluluk_tipi bilinmiyor: ${zt}`, duzeltme: `şunlardan biri: ${ZORUNLULUK_TIPLERI.join(', ')}` }); return; }
        maddeler.push({ kod, ustKod, baslik, metin, sira, seviye, zorunlulukTipi: zt, kanitBeklentisi, disKontrolId });
      });
      cerceveler.push({ dosya, kimlik, maddeler });
    }
  }
  tekil(DOSYALAR.cerceveDizini, 'KİMLİK', cerceveler.map((c) => c.kimlik.kod), 'çerçeve kodu');

  /* ── form şablonları (2.2) ─────────────────────────────────────────
     `form/<KOD>.json`; isteğe bağlı XLSX aynı dizinde: sayfa ve her alanın
     hücresi DOSYAYA KARŞI okunur (var mı, aralığın içinde mi). Telifli
     pakette XLSX yasak — hücre metni denetlenemez, tam metin kaçağı olur. */
  const formlar: FormSablonu[] = [];
  const formDizini = path.join(dizin, DOSYALAR.formDizini);
  const formJsonlari = existsSync(formDizini) ? readdirSync(formDizini).filter((d) => d.endsWith('.json')).sort() : [];
  const formDosyalari = new Set<string>();
  let formOkunamadi = false;
  for (const dosyaAdi of formJsonlari) {
    const dosya = `${DOSYALAR.formDizini}/${dosyaAdi}`;
    formDosyalari.add(dosya);
    const j = jsonOku(path.join(formDizini, dosyaAdi));
    if ('hata' in j) { formOkunamadi = true; hatalar.push({ sinif: 'BIÇIM', dosya, mesaj: `JSON okunamadı: ${j.hata}`, duzeltme: 'JSON sözdizimini düzeltin' }); continue; }
    const p = FormSablonuSemasi.safeParse(j.deger);
    if (!p.success) {
      formOkunamadi = true;
      for (const h of zodHatalari(p.error, dosya, 'BIÇIM', 'form şablonu: kod · ad · tur · bolumler[{kod, baslik, alanlar[{anahtar, etiket, tip}]}]')) hatalar.push(h);
      continue;
    }
    const f = p.data;
    if (`${f.kod}.json` !== dosyaAdi) {
      hatalar.push({ sinif: 'KİMLİK', dosya, konum: 'kod', mesaj: `form kodu "${f.kod}" dosya adıyla uyuşmuyor`, duzeltme: `dosyayı ${f.kod}.json diye adlandırın` });
    }
    const gorulenAnahtar = new Set<string>();
    for (const b of f.bolumler) for (const a of b.alanlar) {
      const konum = `${b.kod}.${a.anahtar}`;
      if (gorulenAnahtar.has(a.anahtar)) hatalar.push({ sinif: 'KİMLİK', dosya, konum, mesaj: `alan anahtarı tekrar ediyor: ${a.anahtar}`, duzeltme: 'anahtar form içinde tekil olmalı' });
      gorulenAnahtar.add(a.anahtar);
      if (a.tip === 'secim' && !(a.secenekler && a.secenekler.length)) hatalar.push({ sinif: 'BIÇIM', dosya, konum, mesaj: 'secim tipi seçenek listesi ister', duzeltme: '`secenekler: [{deger, ad}]` yazın' });
      if (a.secenekler && a.tip !== 'secim') hatalar.push({ sinif: 'BIÇIM', dosya, konum, mesaj: `seçenek listesi yalnız secim tipinde olur (tip=${a.tip})`, duzeltme: 'seçenekleri kaldırın ya da tipi secim yapın' });
      if (a.hucre && !f.dosya) hatalar.push({ sinif: 'BIÇIM', dosya, konum, mesaj: 'hücre var ama form XLSX dosyası beyan etmiyor', duzeltme: '`dosya` yazın ya da hücreyi kaldırın' });
    }
    if (f.dosya) {
      if (manifest.lisans.tur === 'telifli') {
        hatalar.push({ sinif: 'LİSANS', dosya, konum: 'dosya', mesaj: `lisans sınırı: telifli paket XLSX form taşıyamaz (${f.dosya}) — hücre metni denetlenemez`, duzeltme: 'formu JSON yapı olarak verin (dosya alanını kaldırın)' });
      } else {
        const xlsxGoreli = `${DOSYALAR.formDizini}/${f.dosya}`;
        formDosyalari.add(xlsxGoreli);
        const xlsxYolu = path.join(formDizini, f.dosya);
        if (!existsSync(xlsxYolu)) {
          hatalar.push({ sinif: 'BIÇIM', dosya, konum: 'dosya', mesaj: `XLSX dosyası yok: ${f.dosya}`, duzeltme: 'dosyayı form/ altına koyun' });
        } else if (!f.sayfa) {
          hatalar.push({ sinif: 'BIÇIM', dosya, konum: 'sayfa', mesaj: 'XLSX varsa sayfa adı zorunlu', duzeltme: '`sayfa: "Form"` gibi sayfa adını yazın' });
        } else {
          let sayfaAdlari: string[] = [];
          let sayfa: XLSX.WorkSheet | undefined;
          try {
            const wb = XLSX.read(readFileSync(xlsxYolu), { type: 'buffer' });
            sayfaAdlari = wb.SheetNames;
            sayfa = wb.Sheets[f.sayfa];
          } catch (e) {
            hatalar.push({ sinif: 'BIÇIM', dosya: xlsxGoreli, mesaj: `XLSX okunamadı: ${e instanceof Error ? e.message : String(e)}`, duzeltme: 'dosyayı yeniden kaydedin (.xlsx)' });
          }
          if (sayfaAdlari.length && !sayfa) {
            hatalar.push({ sinif: 'BIÇIM', dosya, konum: 'sayfa', mesaj: `sayfa yok: ${f.sayfa} (dosyadaki sayfalar: ${sayfaAdlari.join(', ')})`, duzeltme: 'sayfa adını dosyadaki gibi yazın' });
          } else if (sayfa) {
            const aralik = sayfa['!ref'] ? XLSX.utils.decode_range(sayfa['!ref']) : null;
            for (const b of f.bolumler) for (const a of b.alanlar) {
              const konum = `${b.kod}.${a.anahtar}.hucre`;
              if (!a.hucre) { hatalar.push({ sinif: 'BIÇIM', dosya, konum, mesaj: 'XLSX form alanının hücresi yok', duzeltme: 'her alana `hucre` (B4 gibi) yazın' }); continue; }
              const h = XLSX.utils.decode_cell(a.hucre);
              if (!aralik || h.r > aralik.e.r || h.c > aralik.e.c) {
                hatalar.push({ sinif: 'BIÇIM', dosya, konum, mesaj: `hücre ${a.hucre} "${f.sayfa}" sayfasının aralığı dışında (${sayfa['!ref'] ?? 'boş sayfa'})`, duzeltme: 'hücreyi dosyadaki bir hücreye işaret ettirin' });
              }
            }
          }
        }
      }
    }
    formlar.push(f);
  }
  tekil(DOSYALAR.formDizini, 'KİMLİK', formlar.map((f) => f.kod), 'form kodu');

  /* ── rapor şablonları (2.2) — `rapor/<KOD>.json` ───────────────────── */
  const raporlar: RaporSablonu[] = [];
  const raporDizini = path.join(dizin, DOSYALAR.raporDizini);
  const raporJsonlari = existsSync(raporDizini) ? readdirSync(raporDizini).filter((d) => d.endsWith('.json')).sort() : [];
  const raporDosyalari = new Set<string>(raporJsonlari.map((d) => `${DOSYALAR.raporDizini}/${d}`));
  for (const dosyaAdi of raporJsonlari) {
    const dosya = `${DOSYALAR.raporDizini}/${dosyaAdi}`;
    const j = jsonOku(path.join(raporDizini, dosyaAdi));
    if ('hata' in j) { hatalar.push({ sinif: 'BIÇIM', dosya, mesaj: `JSON okunamadı: ${j.hata}`, duzeltme: 'JSON sözdizimini düzeltin' }); continue; }
    const p = RaporSablonuSemasi.safeParse(j.deger);
    if (!p.success) {
      for (const h of zodHatalari(p.error, dosya, 'BIÇIM', 'rapor şablonu: kod · ad · alanlar[{anahtar, etiket, kaynak}] · siralama · kunye · sayfa')) hatalar.push(h);
      continue;
    }
    const r = p.data;
    if (`${r.kod}.json` !== dosyaAdi) {
      hatalar.push({ sinif: 'KİMLİK', dosya, konum: 'kod', mesaj: `rapor kodu "${r.kod}" dosya adıyla uyuşmuyor`, duzeltme: `dosyayı ${r.kod}.json diye adlandırın` });
    }
    const alanAnahtarlari = r.alanlar.map((a) => a.anahtar);
    const tekrar = alanAnahtarlari.filter((a, i) => alanAnahtarlari.indexOf(a) !== i);
    if (tekrar.length) hatalar.push({ sinif: 'KİMLİK', dosya, konum: 'alanlar', mesaj: `alan anahtarı tekrar ediyor: ${[...new Set(tekrar)].join(', ')}`, duzeltme: 'anahtar rapor içinde tekil olmalı' });
    const siralamaKumesi = new Set(r.siralama);
    const bilinmeyen = r.siralama.filter((s) => !alanAnahtarlari.includes(s));
    const eksik = alanAnahtarlari.filter((a) => !siralamaKumesi.has(a));
    if (bilinmeyen.length || eksik.length || siralamaKumesi.size !== r.siralama.length) {
      hatalar.push({ sinif: 'BIÇIM', dosya, konum: 'siralama', mesaj: `sıralama alanların bir permütasyonu olmalı — bilinmeyen: ${bilinmeyen.join(', ') || '-'}; eksik: ${eksik.join(', ') || '-'}`,
        duzeltme: 'her alan anahtarını sıralamada bir kez yazın' });
    }
    raporlar.push(r);
  }
  tekil(DOSYALAR.raporDizini, 'KİMLİK', raporlar.map((r) => r.kod), 'rapor kodu');

  /* ── paket yapısında yeri olmayan dosya ─────────────────────────────
     Özeti doğru olan ama hiçbir tanımlayıcının okumadığı dosya (örn.
     `cerceve/tam-metin.csv`) lisans kontrolünden geçmeden pakette
     TAŞINIRDI (inceleme bulgusu, PR #41). Tanınan yapı: sabit JSON
     dosyaları, `cerceve/*.json` kimlikleri ve onların `maddeDosyasi`.
     Bir kimlik JSON'u okunamadıysa paket zaten kırmızıdır; CSV'si
     ayrıca "tanınmıyor" diye suçlanmaz. */
  const cerceveJsonlari = existsSync(cerceveDizini) ? readdirSync(cerceveDizini).filter((d) => d.endsWith('.json')) : [];
  const kimlikOkunamadi = cerceveJsonlari.length !== cerceveler.length;
  if (!kimlikOkunamadi) {
    const taninan = new Set<string>([
      DOSYALAR.sozluk, DOSYALAR.kapsamTurleri, DOSYALAR.oznitelikler, DOSYALAR.yukumlulukler, DOSYALAR.roller,
      ...cerceveJsonlari.map((d) => `${DOSYALAR.cerceveDizini}/${d}`),
      ...cerceveler.map((c) => `${DOSYALAR.cerceveDizini}/${c.kimlik.maddeDosyasi}`),
      ...formDosyalari, ...raporDosyalari,
    ]);
    for (const d of mevcut) {
      // form JSON'u okunamadıysa XLSX'i referanssız kalır; paket zaten kırmızı, ayrıca suçlanmaz
      if (formOkunamadi && d.startsWith(`${DOSYALAR.formDizini}/`)) continue;
      if (!taninan.has(d)) {
        hatalar.push({ sinif: 'BIÇIM', dosya: d, mesaj: 'paket yapısında yeri olmayan dosya — hiçbir tanımlayıcı okumuyor, ama pakette taşınır',
          duzeltme: 'dosyayı paketten çıkarın; çerçeve CSV\'si kimlik JSON\'unun maddeDosyasi alanından referanslanmalı' });
      }
    }
  }

  const yukumlulukler = liste<YukumlulukSatiri>(DOSYALAR.yukumlulukler, YukumlulukSatiriSemasi, 'BIÇIM', 'yükümlülük satırı: kod · ad · regulasyonKod? · asgariSiddet · sureSaat · dayanak · merci');
  tekil(DOSYALAR.yukumlulukler, 'KİMLİK', yukumlulukler.map((y) => y.kod), 'yükümlülük kodu');

  /* ── rol önerileri (2.3) — `roller.json` ──────────────────────────────
     Paket rol ÖNERİR; çalışma zamanı yetkisi koddan okunur (bicim.ts).
     Çekirdek rol kodu paketle yeniden tanımlanamaz: katalog "denetim
     sorumlusu şunu yapar" derken kod başka şey yapardı — KİMLİK. İzin
     merdiveni (onay → yazma → okuma) BIÇIM. Sektörsüz (yatay) paket de rol
     önerebilir: rol sektöre bağlı değildir. */
  const roller = liste<RolSatiri>(DOSYALAR.roller, RolSatiriSemasi, 'BIÇIM', 'rol satırı: kod (küçük harf) · ad · izinler {modül: [okuma|yazma|onay]} · kapsamEkseni (global|kapsamOgesi)');
  tekil(DOSYALAR.roller, 'KİMLİK', roller.map((r) => r.kod), 'rol kodu');
  roller.forEach((r, i) => {
    const konum = `[${i}] ${r.kod}`;
    if ((CEKIRDEK_ROLLER as readonly string[]).includes(r.kod)) {
      hatalar.push({ sinif: 'KİMLİK', dosya: DOSYALAR.roller, konum, mesaj: `çekirdek rol kodu paketle yeniden tanımlanamaz: ${r.kod}`,
        duzeltme: 'paket yeni bir rol önerir; çekirdek rolün izinleri koddadır (lib/erisim.ts)' });
    }
    const girdiler = Object.entries(r.izinler) as [string, readonly string[]][];
    if (girdiler.length === 0) {
      hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.roller, konum: `${konum}.izinler`, mesaj: 'izin yok — rol en az bir modülde bir işlem tanımlar',
        duzeltme: '`izinler: { uyum: ["okuma"] }` gibi en az bir modül yazın' });
    }
    for (const [modul, islemler] of girdiler) {
      const k = `${konum}.izinler.${modul}`;
      const tekrar = [...new Set(islemler.filter((x, j) => islemler.indexOf(x) !== j))];
      if (tekrar.length) hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.roller, konum: k, mesaj: `işlem tekrar ediyor: ${tekrar.join(', ')}`, duzeltme: 'her işlemi bir kez yazın' });
      for (const [islem, onkosul] of Object.entries(ISLEM_ONKOSULU)) {
        if (onkosul && islemler.includes(islem) && !islemler.includes(onkosul)) {
          hatalar.push({ sinif: 'BIÇIM', dosya: DOSYALAR.roller, konum: k, mesaj: `${islem} ${onkosul} ister (izin merdiveni: okuma → yazma → onay)`,
            duzeltme: `"${onkosul}" ekleyin ya da "${islem}" işlemini kaldırın` });
        }
      }
    }
  });

  const sayilar: Sayilar = {
    sozluk: sozluk.length, kapsamTurleri: kapsamTurleri.length, oznitelikler: oznitelikler.length,
    cerceveler: cerceveler.length, maddeler: cerceveler.reduce((a, c) => a + c.maddeler.length, 0), yukumlulukler: yukumlulukler.length,
    formlar: formlar.length, raporlar: raporlar.length, roller: roller.length,
  };
  const icerik: PaketIcerigi = { dizin, manifest, sozluk, kapsamTurleri, oznitelikler, cerceveler, yukumlulukler, formlar, raporlar, roller };
  return { ok: hatalar.length === 0, hatalar, icerik: hatalar.length === 0 ? icerik : null, sayilar };
}
