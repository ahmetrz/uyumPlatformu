import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { GRUP_DERINLIGI, OSCAL_NS, OSCAL_SURUMU, oscalOku, oscalYabanciMetinler, oscalYaz, sabitUuid, type OscalControl, type OscalGroup, type OscalKatalog } from '@/lib/paket/oscal';
import type { MaddeSatiri } from '@/lib/paket/bicim';
import { hataSatiri, paketiDogrula } from '@/lib/paket/dogrula';
import { SOZLUK_SATIRI, cerceve, paketYaz, type PaketDosyalari } from './yardim/paket';

/* ═══════════════════════════════════════════════════════════════════════
   P4 · 2.7 — OSCAL KATALOG OKUYUCU · GİDİŞ-DÖNÜŞ (URN-PKT-017)

   Çerçeve madde ağacı CSV yerine OSCAL 1.1 katalog JSON'u olarak da
   taşınabilir. Kanıt: (1) iskelet çerçeveleri satır → OSCAL → satır
   BİREBİR döner (Türkçe kod dâhil), ikinci yazım birincisiyle aynıdır;
   (2) OSCAL paketi doğrulayıcıdan CSV ile AYNI kurallardan geçer —
   telifli metin `prose` içinden sızamaz; (3) yabancı katalog (kod prop'u
   yok, gruplu) grup → üst madde, id → kod olarak okunur; (4) yazar aracı
   `--oscal <dizin>` her çerçevenin kataloğunu yazar.
   ═══════════════════════════════════════════════════════════════════════ */

const KOK = process.cwd();
const sirala = (m: MaddeSatiri[]) => [...m].sort((a, b) => a.kod.localeCompare(b.kod));
const iskelet = (kod: string) => {
  const s = paketiDogrula(path.join(KOK, 'paketler', kod));
  expect(s.hatalar.map(hataSatiri), kod).toEqual([]);
  return s.icerik!;
};
const manifest = { kod: 'OSCAL-PAKET', sektor: { kod: 'OSCAL-SEKTOR', ad: 'OSCAL' } };
/** Kimliği OSCAL dosyasına bağlayan geçici paket; satırlar doğrulayıcının kendi yolundan okunur. */
function oscalPaketi(kimlik: Record<string, unknown> & { kod: string }, katalog: unknown, m: Record<string, unknown> = manifest) {
  const dosyalar: PaketDosyalari = {
    'sozluk.json': [SOZLUK_SATIRI('tesis', 'şube')],
    [`cerceve/${kimlik.kod}.json`]: { ...kimlik, maddeDosyasi: `${kimlik.kod}.oscal.json` },
    [`cerceve/${kimlik.kod}.oscal.json`]: katalog as object,
  };
  return paketiDogrula(paketYaz(dosyalar, m));
}
const tumKontroller = (k: OscalKatalog): OscalControl[] => {
  const sonuc: OscalControl[] = [];
  const gez = (c: OscalControl) => { sonuc.push(c); c.controls?.forEach(gez); };
  k.catalog.controls?.forEach(gez);
  return sonuc;
};

describe('OSCAL gidiş-dönüş · iskelet çerçeveleri [URN-PKT-017]', () => {
  const cerceveler = [...iskelet('TR-BANKACILIK').cerceveler, ...iskelet('TR-ENERJI').cerceveler];

  it('ölçüm tabanı: üç çerçeve, 659 madde', () => {
    expect(cerceveler.map((c) => [c.kimlik.kod, c.maddeler.length])).toEqual([['BDDK-BS', 58], ['EPDK-SGYM-EK3', 578], ['EPDK-SGYM', 23]]);
  });

  it('satırlar → OSCAL → satırlar birebir; belirteçler ASCII, Türkçe kod prop\'ta korunur; uuid deterministik [URN-PKT-017]', () => {
    for (const c of cerceveler) {
      const katalog = oscalYaz(c.kimlik, c.maddeler);
      expect(katalog.catalog.metadata).toMatchObject({ title: c.kimlik.ad, version: c.kimlik.surumEtiketi, 'oscal-version': OSCAL_SURUMU });
      expect(katalog.catalog.uuid).toBe(sabitUuid(`${c.kimlik.kod}@${c.kimlik.surumEtiketi}`));
      expect(oscalYaz(c.kimlik, c.maddeler).catalog.uuid).toBe(katalog.catalog.uuid);
      const kontroller = tumKontroller(katalog);
      expect(kontroller).toHaveLength(c.maddeler.length);
      expect(new Set(kontroller.map((k) => k.id)).size).toBe(kontroller.length);
      for (const k of kontroller) {
        expect(k.id, `${c.kimlik.kod} ${k.id}`).toMatch(/^[_a-z][-._a-z0-9]*$/);
        expect(k.props?.find((p) => p.name === 'kod')?.ns).toBe(OSCAL_NS);
      }
      /* Yapay paket sözlükten ibarettir: beyandaki öznitelik ve tür kodları
         orada YOK, doğrulayıcı haklı olarak reddederdi. Gidiş-dönüş MADDE
         AĞACINI ölçer; uygulanabilirlik beyanı ayrı testte (paket-uygulanabilirlik). */
      const kimlikSade: Record<string, unknown> & { kod: string } = { ...c.kimlik };
      delete kimlikSade.uygulanabilirlik;
      const geri = oscalPaketi(kimlikSade, katalog);
      expect(geri.hatalar.map(hataSatiri), c.kimlik.kod).toEqual([]);
      expect(sirala(geri.icerik!.cerceveler[0].maddeler)).toEqual(sirala(c.maddeler));
      // ikinci yazım birincisiyle aynı (kanonik gidiş-dönüş)
      expect(oscalYaz(c.kimlik, geri.icerik!.cerceveler[0].maddeler)).toEqual(katalog);
    }
    const ek3 = oscalYaz(cerceveler[1].kimlik, cerceveler[1].maddeler);
    const isg = tumKontroller(ek3).find((k) => k.props?.some((p) => p.name === 'kod' && p.value === 'İSG-1'))!;
    expect(isg).toBeDefined();
    expect(isg.id).not.toMatch(/İ/);
  });

  it('bilinmeyen değer prop olarak yazılmaz; tarih bilinmiyorsa last-modified uydurulmaz [URN-PKT-017]', () => {
    const k = oscalYaz(cerceve('X-REG', { tur: 'kamuya_acik', metinDahil: false }) as never, [
      { kod: '1', ustKod: null, baslik: 'Amaç', metin: null, sira: 0, seviye: null, zorunlulukTipi: null, kanitBeklentisi: null, disKontrolId: null, kanitTipi: null,
        kaynakUrl: null, kaynakYeri: null, erisimTarihi: null, yururlukTarihi: null, gereksinimTipi: null },
    ]);
    expect(k.catalog.metadata['last-modified']).toBeUndefined();
    expect(k.catalog.controls![0].props!.map((p) => p.name)).toEqual(['kod', 'sira']);
    expect(k.catalog.controls![0].parts).toBeUndefined();
  });
});

describe('OSCAL paketi doğrulayıcıdan CSV ile aynı kurallardan geçer [URN-PKT-017]', () => {
  /* Metin taşıyan kamuya açık çerçeve kaynağını ya da temsilîliğini beyan etmek
     zorundadır (KAYNAK, tur 2); bu kümedeki kataloglar kurgusaldır → `temsili`. */
  const kimlik = (lisans: { tur: string; metinDahil: boolean }) => cerceve('OSC-REG', lisans) as Record<string, unknown> & { kod: string };
  const katalog = (controls: OscalControl[], ekMeta: Record<string, unknown> = {}): OscalKatalog => ({
    catalog: { uuid: sabitUuid('t'), metadata: { title: 'OSC-REG çerçevesi', version: 'test-1', 'oscal-version': OSCAL_SURUMU, ...ekMeta }, controls },
  });
  const kontrol = (kod: string, ek: Partial<OscalControl> = {}): OscalControl => ({ id: `osc-reg-${kod.toLowerCase()}`, title: `Madde ${kod}`, props: [{ name: 'kod', value: kod, ns: OSCAL_NS }], ...ek });
  const siniflar = (s: ReturnType<typeof paketiDogrula>) => s.hatalar.filter((h) => h.dosya.endsWith('.oscal.json')).map((h) => `${h.sinif}|${h.konum ?? ''}|${h.mesaj}`);

  it('telifli çerçevede statement/guidance prose LİSANS, uzun başlık LİSANS; kamuya açık metinsiz kimlikte prose LİSANS; temiz katalog geçer ve sayılır [URN-PKT-017]', () => {
    const telifli = { ...manifest, lisans: { tur: 'telifli', metinDahil: false } };
    const s = oscalPaketi(kimlik({ tur: 'telifli', metinDahil: false }), katalog([
      kontrol('1', { parts: [{ name: 'statement', prose: 'Telifli tam metin' }] }),
      kontrol('2', { parts: [{ name: 'guidance', prose: 'Kanıt beklentisi metni' }] }),
      kontrol('3', { title: 'x'.repeat(121) }),
    ]), telifli);
    expect(siniflar(s)).toEqual([
      'LİSANS|2|lisans sınırı: OSC-REG telifli, metin girilemez (1)',
      'LİSANS|3|lisans sınırı: OSC-REG telifli, kanit_beklentisi serbest metindir, girilemez (2)',
      'LİSANS|4|telifli çerçevede başlık 121 karakter > 120 (3)',
    ]);
    const acikMetinsiz = oscalPaketi(kimlik({ tur: 'kamuya_acik', metinDahil: false }), katalog([kontrol('1', { parts: [{ name: 'statement', prose: 'metin' }] })]));
    expect(siniflar(acikMetinsiz)).toEqual(['LİSANS|2|metinDahil=false ama 1 metin taşıyor']);
    const temiz = oscalPaketi(kimlik({ tur: 'kamuya_acik', metinDahil: true }), katalog([
      kontrol('1', { parts: [{ name: 'statement', prose: 'Amaç metni' }], controls: [kontrol('1.1', { props: [{ name: 'kod', value: '1.1', ns: OSCAL_NS }, { name: 'seviye', value: '3', ns: OSCAL_NS }, { name: 'kanit_tipi', value: 'kayit', ns: OSCAL_NS }] })] }),
    ]));
    expect(temiz.hatalar.map(hataSatiri)).toEqual([]);
    expect(temiz.sayilar).toMatchObject({ cerceveler: 1, maddeler: 2 });
    expect(temiz.icerik!.cerceveler[0].maddeler[1]).toMatchObject({ kod: '1.1', ustKod: '1', seviye: 3, kanitTipi: 'kayit', metin: null, sira: 1 });
  });

  it('tekrar kod KİMLİK, katalog kodu kimlikle uyuşmazsa KİMLİK, bozuk katalog BIÇIM, seviye aralık dışı BIÇIM [URN-PKT-017]', () => {
    const k = kimlik({ tur: 'kamuya_acik', metinDahil: false });
    expect(siniflar(oscalPaketi(k, katalog([kontrol('1'), kontrol('1')])))).toEqual(['KİMLİK|3|kod tekrar ediyor: 1']);
    expect(siniflar(oscalPaketi(k, katalog([kontrol('1')], { props: [{ name: 'kod', value: 'BASKA', ns: OSCAL_NS }] })))[0]).toMatch(/^KİMLİK\|catalog\.metadata\|katalog kodu "BASKA" kimlikle uyuşmuyor/);
    expect(siniflar(oscalPaketi(k, { catalog: { metadata: { title: 'x' } } }))[0]).toMatch(/^BIÇIM\|/);
    expect(siniflar(oscalPaketi(k, { degil: true }))[0]).toMatch(/^BIÇIM\|catalog\|OSCAL katalog yapısı/);
    expect(siniflar(oscalPaketi(k, katalog([kontrol('1', { props: [{ name: 'kod', value: '1', ns: OSCAL_NS }, { name: 'seviye', value: '9', ns: OSCAL_NS }] })])))).toEqual(['BIÇIM|2|seviye 0–5 aralığında olmalı: 9 (1)']);
  });

  it('İÇ İÇE grup okunur: alt aile ve maddeleri sessizce düşmez [URN-PKT-017]', () => {
    /* Bağımsız inceleme bulgusu (PR #43): şema iç içe `groups` tanımıyordu,
       `passthrough` onu yutuyordu — alt aile ve altındaki bütün maddeler
       kaybolur, tek hata satırı çıkmaz, paket "GEÇERLİ" derdi. */
    const o = oscalOku({ catalog: { uuid: 'u', metadata: { title: 'Y', version: '1', 'oscal-version': '1.1.2' },
      groups: [{ id: 'ac', title: 'Aile', groups: [{ id: 'ac-alt', title: 'Alt aile', controls: [{ id: 'gizli-1', title: 'Gizli' }] }], controls: [{ id: 'ac-1', title: 'Görünür' }] }] } });
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    /* Grubun KENDİ kontrolleri önce okunur; alt gruplar sonra (derinlik sınırı
       ilk hâlde `return` ile kendi kontrollerini de düşürüyordu — tur 2). */
    expect(o.satirlar.map((s) => [s[0], s[1]])).toEqual([['ac', ''], ['ac-1', 'ac'], ['ac-alt', 'ac'], ['gizli-1', 'ac-alt']]);
    expect(o.uyarilar).toEqual([]);
  });

  it('telifli çerçevede OKUNMAYAN metin alanı (yabancı prose/prop) LİSANS ile reddedilir [URN-PKT-017] [URN-PKT-002]', () => {
    /* Metin veritabanına inmiyor ama PAKETE (ve public depoya) giriyordu:
       CSV'deki "başlığı aşan dolu hücre" kuralının OSCAL karşılığı yoktu. */
    const katalog = { catalog: { uuid: 'u', metadata: { title: 'T', version: 'test-1', 'oscal-version': '1.1.2', props: [{ name: 'kod', value: 'OSC-REG', ns: OSCAL_NS }] },
      controls: [{ id: 'a', title: 'Başlık', props: [{ name: 'kod', value: '1', ns: OSCAL_NS }, { name: 'tam_metin', value: 'TELİFLİ TAM METİN' }],
        parts: [{ name: 'objective', prose: 'TELİFLİ TAM METİN' }] }] } };
    const t = oscalPaketi({ ...kimlik({ tur: 'telifli', metinDahil: false }) }, katalog);
    const lisans = t.hatalar.filter((h) => h.sinif === 'LİSANS');
    expect(lisans.length, hataSatiri(t.hatalar[0] ?? { sinif: 'BIÇIM', dosya: '-', mesaj: 'hata yok', duzeltme: '-' })).toBeGreaterThanOrEqual(2);
    expect(lisans.map((h) => h.mesaj).join('\n')).toMatch(/okunmayan metin alanı dolu/);
    // kamuya açık çerçevede aynı katalog geçer: kural LİSANS kuralıdır, biçim kuralı değil
    expect(oscalPaketi({ ...kimlik({ tur: 'kamuya_acik', metinDahil: true }) }, katalog).hatalar.filter((h) => h.sinif === 'LİSANS')).toEqual([]);
  });

  it('telifli metin GRUP part\'ında ya da İÇ İÇE part\'ta saklanamaz — muafiyet ada değil YOLA bağlı [URN-PKT-002]', () => {
    /* Bağımsız inceleme (PR #43 tur 2): muafiyet `name === 'statement'` diye ADA
       bakıyordu; `groups[i].parts[statement]` ve `parts[item].parts[statement]`
       okunmaz ama pakete (ve public depoya) girerdi. */
    const grupta = { catalog: { uuid: 'u', metadata: { title: 'T', version: 'test-1', 'oscal-version': OSCAL_SURUMU },
      groups: [{ id: 'g1', title: 'Aile', parts: [{ name: 'statement', prose: 'TELİFLİ TAM METİN' }], controls: [kontrol('1')] }] } };
    const icice = { catalog: { uuid: 'u', metadata: { title: 'T', version: 'test-1', 'oscal-version': OSCAL_SURUMU },
      controls: [{ ...kontrol('1'), parts: [{ name: 'item', parts: [{ name: 'statement', prose: 'TELİFLİ TAM METİN' }] }] }] } };
    for (const [ad, katalogVerisi] of [['grup', grupta], ['iç içe part', icice]] as const) {
      const bulunan = oscalYabanciMetinler(katalogVerisi);
      expect(bulunan.join('\n'), `${ad}: kaçak görülmedi`).toMatch(/TELİFLİ TAM METİN/);
      const s = oscalPaketi({ ...kimlik({ tur: 'telifli', metinDahil: false }) }, katalogVerisi);
      expect(s.hatalar.filter((h) => h.sinif === 'LİSANS').length, `${ad}: LİSANS hatası yok`).toBeGreaterThan(0);
    }
    /* Okunan yer muaf kalır: control'ün DOĞRUDAN parts çocuğundaki statement. */
    expect(oscalYabanciMetinler({ catalog: { uuid: 'u', metadata: { title: 'T', version: 'test-1', 'oscal-version': OSCAL_SURUMU },
      controls: [{ ...kontrol('1'), parts: [{ name: 'statement', prose: 'okunan metin' }] }] } })).toEqual([]);
  });

  it('grup derinlik sınırı SESSİZ KAYIP üretmez: kendi kontrolleri okunur, aşan grup uyarıya düşer [URN-PKT-017]', () => {
    /* İlk hâl `return` ile sınırın İÇİNDEKİ grubun kontrollerini de düşürüyordu
       ve okuma `ok:true` dönüyordu (inceleme, PR #43 tur 2). */
    const derin = (n: number): OscalGroup => (n === 0
      ? { id: 'g0', title: 'En derin', controls: [{ id: 'c0', title: 'Kontrol 0' }] }
      : { id: `g${n}`, title: `Grup ${n}`, controls: [{ id: `c${n}`, title: `Kontrol ${n}` }], groups: [derin(n - 1)] });
    const oku = (n: number) => oscalOku({ catalog: { uuid: 'u', metadata: { title: 'T', version: '1', 'oscal-version': OSCAL_SURUMU }, groups: [derin(n)] } });
    const sig = oku(3);
    expect(sig.ok && sig.uyarilar).toEqual([]);
    expect(sig.ok && sig.satirlar.filter((r) => r[0].startsWith('c')).length).toBe(4);
    const cok = oku(GRUP_DERINLIGI + 2);
    expect(cok.ok).toBe(true);
    if (!cok.ok) return;
    expect(cok.uyarilar.length, 'derinlik sınırı sessizce yutuyor').toBeGreaterThan(0);
    /* Sınırın içindeki her grubun KENDİ kontrolü okunmuş olmalı. */
    expect(cok.satirlar.filter((r) => r[0].startsWith('c')).length).toBe(GRUP_DERINLIGI);
  });

  it('katalog SÜRÜMÜ kimlikle uyuşmalı; ns\'siz yabancı prop bizim sanılmaz [URN-PKT-017]', () => {
    const katalog = (version: string, props: unknown[]) => ({ catalog: { uuid: 'u', metadata: { title: 'T', version, 'oscal-version': '1.1.2' },
      controls: [{ id: 'yabanci-1', title: 'Başlık', props }] } });
    const s = oscalPaketi({ ...kimlik({ tur: 'kamuya_acik', metinDahil: false }) }, katalog('2019', []));
    expect(s.hatalar.map((h) => `${h.sinif}: ${h.mesaj}`).join('\n')).toMatch(/KİMLİK: katalog sürümü "2019" kimlikle uyuşmuyor/);
    const yabanci = oscalOku(katalog('test-1', [{ name: 'kod', value: 'YABANCI' }, { name: 'sira', value: '99' }]));
    expect(yabanci.ok).toBe(true);
    if (!yabanci.ok) return;
    expect(yabanci.satirlar[0][0], 'ns\'siz yabancı prop kod diye okundu').toBe('yabanci-1');
    expect(yabanci.satirlar[0][4], 'ns\'siz yabancı prop sıra diye okundu').toBe('0');
  });

  it('yabancı katalog: kod prop\'u yok, gruplu — grup üst madde, id kod, sıra gezinti sırası [URN-PKT-017]', () => {
    const o = oscalOku({ catalog: { uuid: 'u', metadata: { title: 'Yabancı', version: '1', 'oscal-version': '1.1.2' },
      groups: [{ id: 'ac', title: 'Access Control', controls: [{ id: 'ac-1', title: 'Policy', parts: [{ name: 'statement', prose: 'x' }], controls: [{ id: 'ac-1.1', title: 'Review' }] }] }] } });
    expect(o.ok).toBe(true);
    if (!o.ok) return;
    expect(o.kod).toBeNull();
    expect(o.satirlar).toEqual([
      ['ac', '', 'Access Control', '', '0', '', '', '', '', '', '', '', '', '', ''],
      ['ac-1', 'ac', 'Policy', 'x', '1', '', '', '', '', '', '', '', '', '', ''],
      ['ac-1.1', 'ac-1', 'Review', '', '2', '', '', '', '', '', '', '', '', '', ''],
    ]);
  });
});

describe('yazar aracı · --oscal <dizin> [URN-PKT-017]', () => {
  it('TR-BANKACILIK için BDDK-BS.oscal.json yazar ve yazılan dosya geri okununca 58 madde verir', () => {
    const cikti = mkdtempSync(path.join(tmpdir(), 'uyum-oscal-'));
    const log = execFileSync('npx', ['tsx', 'arac/paket-dogrula.ts', 'paketler/TR-BANKACILIK', '--oscal', cikti], { cwd: KOK, encoding: 'utf8' });
    expect(log).toMatch(/OSCAL yazıldı: 1 çerçeve/);
    expect(readdirSync(cikti)).toEqual(['BDDK-BS.oscal.json']);
    const o = oscalOku(JSON.parse(readFileSync(path.join(cikti, 'BDDK-BS.oscal.json'), 'utf8')));
    expect(o.ok && o.satirlar.length).toBe(58);
  });
});
