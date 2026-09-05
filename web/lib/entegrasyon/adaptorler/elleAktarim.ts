import 'server-only';
import type {
  Adaptor, AdaptorBaglami, BaglantiSonucu, CekmeSonucu, DogrulamaSonucu,
  Gozlem, SaglikSonucu, VarlikGozlemi,
} from '../sozlesme';
import { z } from 'zod';
import { temelDogrula, type Yetenek } from '../sozlesme';
import { ORTAK_YAPILANDIRMA, bosNull, icerikOzeti, kararliKimlik } from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   ELLE AKTARIM — bu klasördeki TEK GERÇEKTEN ÇALIŞAN adaptör.

   Neden çalışıyor: dış sistem gerektirmiyor. Girdisi bir CSV/XLSX/JSON
   dışa aktarımı — yani OT ortamında zaten var olan bir çıktı (SCADA
   envanter raporu, switch ARP dökümü, tedarikçi teslim listesi, mevcut
   keşif ürününün export'u). Ne credential ister ne de ağa paket yollar.

   PASSIVE-FIRST: burada tarama YOKTUR. Dosya okunur, ayrıştırılır,
   normalize edilir. Ağa tek bir paket bile çıkmaz.

   Yapılandırma (`AdaptorBaglami.yapilandirma`) — SIR İÇERMEZ:
     bicim?        : 'csv' | 'json'   (verilmezse dosya uzantısından/içerikten sezilir)
     dosyaYolu?    : sunucu üzerinde okunacak dosya (csv | xlsx | json)
     icerik?       : doğrudan içerik (ekrandan yapıştırılan CSV/JSON metni)
     kimlikKolonu? : kaynak kayıt kimliğini taşıyan kolon adı
     esleme?       : { hamKolonAdi: normalizeAlanAdi } — kolon adları
                     tanınmıyorsa elle eşleme
     kaynakSistem  : `AdaptorBaglami.kaynakSistem` alanından gelir
                     (ör. "SCADA envanter dışa aktarımı — Kızıldere II")

   `dosyaYolu` ve `icerik` ikisi de yoksa FIRLATIR. Boş dizi döndürmek
   "kaynakta hiç kayıt yok" demektir; kaynağın hiç tanımlanmamış olması o
   değildir (BRIEF §1 · sahte entegrasyon yasağı). */

/* ── kolon eşlemesi ─────────────────────────────────────────────────────
   Kolon adları normalleştirilerek (küçük harf, ayraçlar silinerek)
   karşılaştırılır: "Serial Number", "serial_number", "SERİ NO" aynı
   kolondur. Tanınmayan kolon SESSİZCE ATILMAZ — `ham` alanında satırın
   tamamı saklanır ve denetim izinin girdisi olur. */

const KOLON_ADAYLARI: Record<string, string[]> = {
  etiket: ['etiket', 'assettag', 'assetetiketi', 'tag', 'varlisetiketi', 'varliketiketi', 'envanterno'],
  hostname: ['hostname', 'host', 'bilgisayaradi', 'computername', 'devicename', 'cihazadi', 'nodename'],
  seriNo: ['serino', 'seri', 'serial', 'serialnumber', 'sn', 'serialno'],
  macAdresi: ['mac', 'macadresi', 'macaddress', 'physicaladdress', 'ethernetaddress', 'hwaddr'],
  ipAdresi: ['ip', 'ipadresi', 'ipaddress', 'ipv4', 'ipv4address', 'adres'],
  uretici: ['uretici', 'vendor', 'manufacturer', 'marka', 'make', 'oem'],
  model: ['model', 'modelno', 'modelnumber', 'urun', 'product', 'producttype'],
  isletimSistemi: ['isletimsistemi', 'os', 'operatingsystem', 'osname', 'osversion', 'platform'],
  firmware: ['firmware', 'firmwareversion', 'fw', 'fwversion', 'yazilimsurumu'],
  tesisKodu: ['tesis', 'tesiskodu', 'site', 'sitecode', 'lokasyon', 'location', 'plant', 'santral'],
  bolgeKodu: ['bolge', 'bolgekodu', 'zone', 'networkzone', 'agbolgesi', 'vlan', 'segment'],
  turKodu: ['tur', 'turkodu', 'tip', 'type', 'assettype', 'kategori', 'category', 'devicetype'],
  kaynakKayitId: ['kaynakkayitid', 'kayitid', 'recordid', 'assetid', 'uuid', 'guid', 'objectid'],
};

/**
 * "Serial Number" → "serialnumber", "Bölge Kodu" → "bolgekodu".
 *
 * NEDEN iki aşama: yalnız `toLocaleLowerCase('tr-TR')` kullanılıyordu ve
 * bu, İngilizce başlıklardaki `I` harfini `ı` yapıyordu — "IP Address"
 * "ıpaddress", "Record ID" "recordıd" oluyordu ve KOLON_ADAYLARI'ndaki
 * ASCII karşılıklarıyla HİÇ eşleşmiyordu (kolon sessizce tanınmıyor,
 * alan boş kalıyordu). Aynı sebeple "Üretici"/"Tür" gibi Türkçe başlıklar
 * da 'uretici'/'tur' adaylarıyla eşleşemiyordu.
 *
 * Türkçe küçültme yine şart ('İ' → 'i'); ardından aday listesiyle aynı
 * alfabeye inmek için Türkçe harfler ASCII karşılıklarına katlanır.
 * Katlama YALNIZ karşılaştırma anahtarına uygulanır — kolon adının
 * kendisi ham veride olduğu gibi durur.
 */
function kolonAnahtari(ad: string): string {
  return ad
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıî]/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/[üû]/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[\s_\-./()]+/g, '');
}

/** Ham başlıklardan normalize alan haritası çıkarır. */
function eslemeCikar(
  basliklar: string[],
  elle: Record<string, string> | null,
): Map<string, string> {
  const harita = new Map<string, string>(); // hamKolon → normalizeAlan
  for (const b of basliklar) {
    const a = kolonAnahtari(b);
    if (elle && elle[b]) { harita.set(b, elle[b]); continue; }
    for (const [alan, adaylar] of Object.entries(KOLON_ADAYLARI)) {
      if (adaylar.includes(a)) { harita.set(b, alan); break; }
    }
  }
  return harita;
}

type Satir = Record<string, unknown>;

/* ── girdi okuma ───────────────────────────────────────────────────────── */

type Kaynak = { satirlar: Satir[]; parmakIzi: string; ayrinti: string; tazelikDk: number | null };

function ayarlar(b: AdaptorBaglami) {
  const y = b.yapilandirma ?? {};
  return {
    bicim: bosNull(y.bicim)?.toLowerCase() as 'csv' | 'json' | undefined,
    dosyaYolu: bosNull(y.dosyaYolu),
    icerik: typeof y.icerik === 'string' ? y.icerik : null,
    kimlikKolonu: bosNull(y.kimlikKolonu),
    esleme: (y.esleme && typeof y.esleme === 'object'
      ? y.esleme as Record<string, string> : null),
  };
}

function jsonAyristir(metin: string): Satir[] {
  const veri: unknown = JSON.parse(metin);
  const dizi = Array.isArray(veri)
    ? veri
    : (veri && typeof veri === 'object' && Array.isArray((veri as { kayitlar?: unknown }).kayitlar))
      ? (veri as { kayitlar: unknown[] }).kayitlar
      : null;
  if (!dizi) {
    throw new Error('JSON kaynağı bir dizi ya da { kayitlar: [...] } nesnesi olmalı');
  }
  return dizi.map((s, i) => {
    if (!s || typeof s !== 'object' || Array.isArray(s)) {
      throw new Error(`JSON kaydı ${i + 1} bir nesne değil`);
    }
    return s as Satir;
  });
}

async function csvAyristirMetin(metin: string): Promise<Satir[]> {
  const XLSX = await import('xlsx');
  const kitap = XLSX.read(metin, { type: 'string', raw: true });
  const sayfa = kitap.Sheets[kitap.SheetNames[0]];
  if (!sayfa) throw new Error('CSV içeriğinde okunabilir sayfa yok');
  return XLSX.utils.sheet_to_json<Satir>(sayfa, { defval: '' });
}

async function kaynagiOku(b: AdaptorBaglami): Promise<Kaynak> {
  const a = ayarlar(b);

  if (a.icerik !== null) {
    const bicim = a.bicim ?? (a.icerik.trimStart().startsWith('[') || a.icerik.trimStart().startsWith('{') ? 'json' : 'csv');
    const satirlar = bicim === 'json' ? jsonAyristir(a.icerik) : await csvAyristirMetin(a.icerik);
    return {
      satirlar,
      parmakIzi: icerikOzeti(a.icerik),
      ayrinti: `Yapıştırılan ${bicim.toUpperCase()} içeriği · ${satirlar.length} satır`,
      // Yapıştırılan içeriğin yaşı ölçülemez — 0 değil, BİLİNMİYOR.
      tazelikDk: null,
    };
  }

  if (a.dosyaYolu) {
    const { readFile, stat } = await import('node:fs/promises');
    const bilgi = await stat(a.dosyaYolu);
    const bicim = a.bicim ?? (/\.json$/i.test(a.dosyaYolu) ? 'json' : 'csv');
    let satirlar: Satir[];
    let parmakIzi: string;
    if (bicim === 'json') {
      const metin = await readFile(a.dosyaYolu, 'utf8');
      satirlar = jsonAyristir(metin);
      parmakIzi = icerikOzeti(metin);
    } else {
      // xlsx paketi CSV'yi de XLSX'i de aynı okuyucudan geçirir.
      const XLSX = await import('xlsx');
      const tampon = await readFile(a.dosyaYolu);
      const kitap = XLSX.read(tampon, { type: 'buffer' });
      const sayfa = kitap.Sheets[kitap.SheetNames[0]];
      if (!sayfa) throw new Error(`Dosyada okunabilir sayfa yok: ${a.dosyaYolu}`);
      satirlar = XLSX.utils.sheet_to_json<Satir>(sayfa, { defval: '' });
      parmakIzi = icerikOzeti(`${a.dosyaYolu}|${bilgi.mtimeMs}|${bilgi.size}`);
    }
    return {
      satirlar,
      parmakIzi,
      ayrinti: `${a.dosyaYolu} · ${satirlar.length} satır`,
      tazelikDk: Math.max(0, Math.round((Date.now() - bilgi.mtimeMs) / 60_000)),
    };
  }

  throw new Error(
    'Elle aktarım kaynağı tanımlı değil: yapilandirma.dosyaYolu ya da yapilandirma.icerik gerekli',
  );
}

/* ── adaptör ────────────────────────────────────────────────────────────── */

export class ElleAktarimAdaptoru implements Adaptor {
  readonly tip = 'manual_import';
  /** Dış sistem gerektirmiyor: gerçekten bağlanabilir. */
  readonly baglanabilir = true;
  /* Dosya ne taşıyorsa onu üretir. `asset_state` LİSTEDE DEĞİL ve bu
     bilinçli: bir dışa aktarım dosyası bir AKIŞ değildir; canlı duruş
     iddiası ancak periyodik bir kaynaktan doğar. Dosyayla gelen sürüm
     bilgisi envanter kaydını besler, "canlı" etiketi almaz. */
  readonly yetenekler: Yetenek[] = ['asset_inventory', 'passive_asset_discovery'];

  /* Kaynağı olmayan bir elle aktarım connector'ı, ilk koşusunda
     "kaynağı tanımlı değil" diye patlıyordu — yani yapılandırma hatası
     kurulumdan saatler sonra, bir başarısız koşu olarak görünüyordu.
     Şema onu kayıt anına çeker: `dosyaYolu` ya da `icerik`ten en az biri
     ZORUNLU. */
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    bicim: z.enum(['csv', 'json']).optional(),
    dosyaYolu: z.string().min(1).optional(),
    icerik: z.string().optional(),
    kimlikKolonu: z.string().min(1).optional(),
    esleme: z.record(z.string(), z.string()).optional(),
  }).refine(
    (y) => typeof y.dosyaYolu === 'string' || typeof y.icerik === 'string',
    'Kaynak tanımlı değil: `dosyaYolu` ya da `icerik` gerekli',
  );

  /** Dosya/metin okur; hiçbir kimlik bilgisi gerektirmez. */
  readonly gerekenSirlar: string[] = [];

  async testConnection(b: AdaptorBaglami): Promise<BaglantiSonucu> {
    try {
      const k = await kaynagiOku(b);
      return { ok: true, ayrinti: k.ayrinti };
    } catch (e) {
      return { ok: false, hata: (e as Error).message };
    }
  }

  async discover(b: AdaptorBaglami): Promise<{ ozet: string; tahminiKayit: number | null }> {
    const k = await kaynagiOku(b);
    const basliklar = k.satirlar.length > 0 ? Object.keys(k.satirlar[0]) : [];
    const esleme = eslemeCikar(basliklar, ayarlar(b).esleme);
    const taninmayan = basliklar.filter((x) => !esleme.has(x));
    const ozet = [
      k.ayrinti,
      `tanınan kolon: ${[...esleme.values()].join(', ') || 'yok'}`,
      taninmayan.length > 0 ? `eşlenmemiş kolon: ${taninmayan.join(', ')}` : null,
    ].filter(Boolean).join(' · ');
    return { ozet, tahminiKayit: k.satirlar.length };
  }

  async fetchChanges(b: AdaptorBaglami): Promise<CekmeSonucu> {
    const k = await kaynagiOku(b);
    /* İmleç = içerik parmak izi. Aynı dosya ikinci kez çekilirse imleç
       değişmez; çağıran isterse koşuyu atlar. Kayıtlar yine de idempotent
       işlenir (kaynakKayitId birincil anahtardır), imleç yalnız hızlandırma. */
    return {
      gozlemler: this.normalize(k.satirlar, b),
      yeniImlec: k.parmakIzi,
      devamVar: false,
    };
  }

  normalize(ham: unknown[], b: AdaptorBaglami): Gozlem[] {
    const a = ayarlar(b);
    const satirlar = ham.filter(
      (s): s is Satir => !!s && typeof s === 'object' && !Array.isArray(s),
    );
    if (satirlar.length === 0) return [];
    const basliklar = [...new Set(satirlar.flatMap((s) => Object.keys(s)))];
    const esleme = eslemeCikar(basliklar, a.esleme);
    const toplanma = new Date();

    const gozlemler: VarlikGozlemi[] = [];
    for (const satir of satirlar) {
      const alan: Record<string, string | null> = {};
      for (const [hamKolon, normalAlan] of esleme) {
        if (alan[normalAlan] == null) alan[normalAlan] = bosNull(satir[hamKolon]);
      }
      // Elle belirtilen kimlik kolonu, tanınan kolonlardan önceliklidir.
      const acikKimlik = a.kimlikKolonu ? bosNull(satir[a.kimlikKolonu]) : null;
      const kaynakKayitId = acikKimlik
        ?? alan.kaynakKayitId
        /* Kaynağın kararlı kimliği yoksa kimlik ALANLARINDAN deterministik
           özet üretilir (BRIEF §1 · provenance). Rastgele kimlik yasak. */
        ?? kararliKimlik('ozet', [
          alan.seriNo, alan.macAdresi, alan.etiket, alan.hostname, alan.ipAdresi,
        ]);

      /* Kimlik üretilemiyorsa gözlem ÜRETİLMEZ. Bu satır sessizce yok
         sayılmaz: `validate` aşamasında değil, burada düşer ve reddedilen
         sayısına `temelDogrula` üzerinden yansıması için köken alanı boş
         bırakılmış bir gözlem üretiriz — böylece reddedilenler listesinde
         sebebiyle görünür. */
      const koken = {
        kaynakSistem: b.kaynakSistem,
        kaynakKayitId: kaynakKayitId ?? '',
        toplanma,
        /* Bir dosya kendi doğruluğunu ölçemez. null = ÖLÇÜLMEDİ.
           Eşleşme güveni ayrı bir şeydir ve lib/entegrasyon/kesif.ts
           tarafından hesaplanır. */
        guven: null as number | null,
      };

      gozlemler.push({
        tip: 'varlik',
        koken,
        etiket: alan.etiket ?? null,
        hostname: alan.hostname ?? null,
        seriNo: alan.seriNo ?? null,
        macAdresi: alan.macAdresi ?? null,
        ipAdresi: alan.ipAdresi ?? null,
        uretici: alan.uretici ?? null,
        model: alan.model ?? null,
        isletimSistemi: alan.isletimSistemi ?? null,
        firmware: alan.firmware ?? null,
        tesisKodu: alan.tesisKodu ?? null,
        bolgeKodu: alan.bolgeKodu ?? null,
        turKodu: alan.turKodu ?? null,
        // Ham satır DOKUNULMADAN saklanır — denetim izinin girdisi.
        ham: satir,
      });
    }
    return gozlemler;
  }

  validate(gozlemler: Gozlem[]): DogrulamaSonucu {
    return temelDogrula(gozlemler);
  }

  async health(b: AdaptorBaglami): Promise<SaglikSonucu> {
    try {
      const k = await kaynagiOku(b);
      return { durum: 'saglikli', ayrinti: k.ayrinti, tazelikDk: k.tazelikDk };
    } catch (e) {
      return { durum: 'bozuk', ayrinti: (e as Error).message, tazelikDk: null };
    }
  }
}

export const elleAktarimAdaptoru = new ElleAktarimAdaptoru();
