import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { izinVar, type Islem, type Modul } from '@/lib/erisim';
import { modulYazabilir, kapsamdaYetkili } from '@/app/kapsam';
import type { AktifKullanici } from '@/lib/auth';

/* ═══════════════════════════════════════════════════════════════════════
   EKRANIN YAZMA KAPISI — sunucuyla aynı soru

   `lib/erisim.ts` iki aşamalı kapıyı sunucuda kurdu; ekranlar o kapının
   ÖN aşamasını kapsamsız soruyordu:

     const yazabilir = izinVar(k, 'envanter', 'yazma');   ← GLOBAL soru

   `kapsamUyar` gereği bu çağrı tesise KISITLI her rolü reddeder. Sonuç,
   sunucu düzeltildikten sonra bile kullanıcıya görünen kusurdur: santral
   yöneticisi KENDİ santralinin kaydını sunucu artık yazdırır ama ekran
   düğmeyi hiç göstermez. Sunucu tarafı kapatılıp ekran açık bırakılırsa
   düzeltme kullanıcıya HİÇ ulaşmaz.

   Ölçülen üç şey:
     1. yüklemlerin kendisi (kaba kapı gevşer, satır kararı gevşemez),
     2. EKRAN SUNUCUDAN DAR DEĞİLDİR — sunucunun izin verdiği bir işlemi
        ekran gizlemez,
     3. EKRAN SUNUCUDAN GEVŞEK DEĞİLDİR — satır kararı santralsiz kaydı
        kısıtlı role açmaz,
   ve dördüncüsü nöbetçi: kapsamsız yazma kapısı geri gelemez.
   ═══════════════════════════════════════════════════════════════════════ */

type Yetki = AktifKullanici['yetkiler'][number];
const yetki = (rol: string, tesisId: string | null = null): Yetki => ({
  rol, surecId: null, tesisId, tuzelKisiId: null, regulasyonId: null, modul: null,
});
const kisi = (...yetkiler: Yetki[]): AktifKullanici => ({
  id: 'k1', adSoyad: 'Test', eposta: 't@x', unvan: null, yetkiler,
});

const TESIS_A = 'tesis-a';
const TESIS_B = 'tesis-b';

describe('modulYazabilir — kaba kapı', () => {
  it('tesise KISITLI rol için doğrudur — kusurun kendisi buydu', () => {
    const k = kisi(yetki('tesis_yoneticisi', TESIS_A));
    expect(izinVar(k, 'envanter', 'yazma')).toBe(false);   // eski soru: yanlış
    expect(modulYazabilir(k, 'envanter', 'yazma')).toBe(true);
  });

  it('kapsamsız rol için de doğrudur', () => {
    expect(modulYazabilir(kisi(yetki('yonetici')), 'envanter', 'yazma')).toBe(true);
  });

  it('rolde OLMAYAN işlemi açmaz — kapı gevşetilmiş değil, doğru sorulmuş', () => {
    const k = kisi(yetki('tesis_yoneticisi', TESIS_A));
    expect(modulYazabilir(k, 'envanter', 'onay')).toBe(false);   // tesis_yoneticisi: onay yok
    expect(modulYazabilir(k, 'yonetim', 'yazma')).toBe(false);
    expect(modulYazabilir(kisi(yetki('okuyucu')), 'envanter', 'yazma')).toBe(false);
  });
});

describe('kapsamdaYetkili — satır kararı', () => {
  const k = kisi(yetki('tesis_yoneticisi', TESIS_A));

  it('KENDİ santraline evet, BAŞKA santrale hayır', () => {
    expect(kapsamdaYetkili(k, 'envanter', 'yazma', TESIS_A)).toBe(true);
    expect(kapsamdaYetkili(k, 'envanter', 'yazma', TESIS_B)).toBe(false);
  });

  it('SANTRALSİZ kayda hayır — sunucudaki kapsamZorunlu ile aynı yanıt', () => {
    /* `!kayit.tesisId || izinVar(...)` biçimi burada `true` derdi; sunucu
       ise reddeder. Ekranın gevşek olması, kaydedilmeyecek düğme demektir. */
    expect(kapsamdaYetkili(k, 'envanter', 'yazma', null)).toBe(false);
    expect(kapsamdaYetkili(k, 'envanter', 'yazma', undefined)).toBe(false);
    expect(kapsamdaYetkili(kisi(yetki('yonetici')), 'envanter', 'yazma', null)).toBe(true);
  });
});

describe('Ekran ile sunucu ayrışmaz', () => {
  const ROLLER = ['yonetici', 'denetim_sorumlusu', 'tesis_yoneticisi', 'bt_yoneticisi',
    'ot_yoneticisi', 'risk_sahibi', 'katkici', 'dis_denetci', 'okuyucu'];
  const MODULLER: Modul[] = ['uyum', 'envanter', 'risk', 'denetim', 'proje', 'tanimlar', 'yonetim'];
  const ISLEMLER: Islem[] = ['yazma', 'onay'];

  it('EKRAN DAR DEĞİLDİR: satır yazılabiliyorsa kaba kapı da açıktır', () => {
    /* Bu, kusurun tam tersidir ve asıl ölçülmesi gereken şeydir: ekranın
       gizlediği ama sunucunun yazdırdığı tek bir (rol · modül · işlem)
       üçlüsü kalmamalı. */
    const gizlenen: string[] = [];
    for (const rol of ROLLER) for (const modul of MODULLER) for (const islem of ISLEMLER) {
      const k = kisi(yetki(rol, TESIS_A));
      if (kapsamdaYetkili(k, modul, islem, TESIS_A) && !modulYazabilir(k, modul, islem))
        gizlenen.push(`${rol} · ${modul}/${islem}`);
    }
    expect(gizlenen, 'sunucu yazdırır, ekran gizler').toEqual([]);
  });

  it('KABA KAPI TEK BAŞINA YETMEZ: açık kapı yabancı santrali yazdırmaz', () => {
    const k = kisi(yetki('tesis_yoneticisi', TESIS_A));
    expect(modulYazabilir(k, 'envanter', 'yazma')).toBe(true);
    expect(kapsamdaYetkili(k, 'envanter', 'yazma', TESIS_B)).toBe(false);
  });
});

/* ── NÖBETÇİ ────────────────────────────────────────────────────────────
   Tesise kısıtlı bir rolün SAHİP OLABİLECEĞİ modüllerde kapsamsız yazma
   kapısı kusurdur. `yonetim` ve `tanimlar` hariçtir ve bu bilinçlidir:
   API anahtarı, kullanıcı yetkisi, regülasyon tanımı KURUMSAL kararlardır
   — santrale kısıtlı bir yöneticinin bunlara uzanmaması doğru davranıştır,
   kusur değil. Dışlama modül adıyla yapılır, dosya adıyla değil. */
const KAPSAMLI_MODULLER = new Set(['uyum', 'envanter', 'risk', 'denetim', 'proje']);

/* Modül santral kapsamlı olsa da KAYDIN KENDİSİ kurumsal olabilir:
   `Tedarikci`, `Denetim`, `Proje`, `Surec` ve aktarım partisi şemada
   `tesisId` TAŞIMAZ — birçok santrale birden bağlanırlar — ve sunucu
   eylemleri de kapsamsız `yetkiZorunlu` ile korunur. Bu ekranlarda
   kapsamsız soru DOĞRU sorudur.

   Kural şudur ve iki yönlüdür: EKRAN SUNUCUDAN NE DAR NE GEVŞEK OLUR.
   Dar olursa düzeltme kullanıcıya ulaşmaz; gevşek olursa kullanıcıya
   kaydedilmeyecek bir düğme gösterilir — ikincisi daha kötüdür, çünkü
   kusur ancak veri kaybedildikten sonra görünür. Bu yüzden bir ekran
   ancak sunucu kapısı da açıldığında gevşetilir, önce değil.

   Bu liste bir muafiyet defteridir, bir kaçış deliği değil: her satır
   GEREKÇESİYLE yazılır ve aşağıdaki ikinci test, gerekçesi kalmamış
   satırın listede unutulmasını engeller. `kanitlar/veri.ts` satırı bir
   muafiyet DEĞİL açık borçtur ve gerekçesinde öyle yazar: `MaddeDurumu`
   tesisId taşır, yani orada asıl düzeltilecek yer SUNUCUDUR. */
const KURUMSAL_KAYITLAR = new Map<string, string>([
  ['app/(kabuk)/(operasyonel)/tedarikciler/veri.ts · envanter/yazma',
    'Tedarikci tesisId taşımaz; tedarikciKaydet kapsamsız'],
  ['app/(kabuk)/(operasyonel)/kesif/page.tsx · envanter/yazma',
    'elleAktarimCalistir + kesifEslestir kurumsal kuyruk işleri'],
  ['app/(kabuk)/(operasyonel)/denetimler/page.tsx · denetim/yazma',
    'Denetim tesisId taşımaz (kapsam DenetimKapsami ilişkisi)'],
  ['app/(kabuk)/(operasyonel)/denetimler/[id]/veri.ts · denetim/yazma',
    'Denetim tesisId taşımaz; asama eylemleri kapsamsız'],
  ['app/(kabuk)/(operasyonel)/denetimler/[id]/veri.ts · denetim/onay',
    'Denetim tesisId taşımaz; asamaGeriAl kapsamsız'],
  ['app/(kabuk)/(operasyonel)/projeler/page.tsx · proje/yazma',
    'Proje tesisId taşımaz; projeKaydet kapsamsız'],
  ['app/(kabuk)/(operasyonel)/uyum/page.tsx · denetim/yazma',
    'denetimKaydet kurumsal kapı'],
  ['app/(kabuk)/(operasyonel)/varlik-aktarim/veri.ts · envanter/yazma',
    'Aktarım partisi kurumsal kayıt; varlikAktarim* kapsamsız'],
  ['app/(kabuk)/(operasyonel)/varlik-aktarim/veri.ts · envanter/onay',
    'Aktarım partisi kurumsal kayıt; varlikAktarimOnayla kapsamsız'],
  ['app/(kabuk)/(operasyonel)/surecler/page.tsx · uyum/yazma',
    'Surec tesisId taşımaz; surecKaydet kapsamsız'],
  ['app/(kabuk)/(operasyonel)/surecler/page.tsx · uyum/onay',
    'surecDurumDegistir kapsamsız'],
  ['app/(kabuk)/(operasyonel)/surecler/[id]/page.tsx · uyum/yazma',
    'Surec tesisId taşımaz; surecKaydet kapsamsız'],
  ['app/(kabuk)/(operasyonel)/kanitlar/veri.ts · uyum/yazma',
    'AÇIK BORÇ — MaddeDurumu tesisId TAŞIR; kanitEkle iki aşamalı yazılınca kalkar'],
]);

function tsDosyalari(kok: string): string[] {
  const cikti: string[] = [];
  for (const ad of readdirSync(kok)) {
    const tam = path.join(kok, ad);
    if (statSync(tam).isDirectory()) cikti.push(...tsDosyalari(tam));
    else if (/\.tsx?$/.test(ad)) cikti.push(tam);
  }
  return cikti;
}

const KAPSAMSIZ = /izinVar\(\s*\w+\s*,\s*'(\w+)'\s*,\s*'(yazma|onay)'\s*\)/g;
const kapsamsizKapilar: string[] = [];
const muaflar = new Set<string>();
for (const dosya of tsDosyalari(path.join(process.cwd(), 'app'))) {
  const metin = readFileSync(dosya, 'utf8');
  for (const m of metin.matchAll(KAPSAMSIZ)) {
    if (!KAPSAMLI_MODULLER.has(m[1])) continue;
    const yol = path.relative(process.cwd(), dosya);
    const anahtar = `${yol} · ${m[1]}/${m[2]}`;
    if (KURUMSAL_KAYITLAR.has(anahtar)) { muaflar.add(anahtar); continue; }
    const satir = metin.slice(0, m.index).split('\n').length;
    kapsamsizKapilar.push(`${yol}:${satir} · ${m[1]}/${m[2]}`);
  }
}

describe('Nöbetçi — kapsamsız yazma kapısı geri gelemez', () => {
  it('santral kapsamlı modüllerde kapsamsız izinVar yazma/onay çağrısı yoktur', () => {
    expect(kapsamsizKapilar.sort(), [
      'Bu çağrı "tüm santrallerde yazabilir misin" diye soruyor; tesise kısıtlı',
      'her rol reddedilir ve düğme gizlenir. Kaba kapı için `modulYazabilir`,',
      'satır kararı için `kapsamdaYetkili` kullanın (app/kapsam.ts).',
    ].join('\n')).toEqual([]);
  });

  it('MUAFİYET DEFTERİ bayat değildir', () => {
    /* Muaf satır dosyadan kalkarsa listede unutulur ve bir sonraki kusuru
       sessizce yutardı. Defter yalnız gerçekten var olan satırları taşır. */
    const bayat = [...KURUMSAL_KAYITLAR.keys()].filter((a) => !muaflar.has(a)).sort();
    expect(bayat, 'bu çağrı yeri artık yok; KURUMSAL_KAYITLAR listesinden silin')
      .toEqual([]);
  });
});
