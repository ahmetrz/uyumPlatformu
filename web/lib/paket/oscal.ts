/* ═══ P4 · 2.7 · OSCAL KATALOG OKUYUCU / YAZICI ═══════════════════════════
   `docs/SEKTOR_PAKETI_SOZLESMESI.md` §3: "OSCAL JSON kabul edilir ama
   zorunlu değildir". Bir çerçevenin madde ağacı iki biçimde taşınabilir:
   CSV (`cerceve/<KOD>.csv`, yazar biçimi) ya da OSCAL 1.1 katalog JSON'u
   (`cerceve/<KOD>.oscal.json`, makine biçimi — SCF, NIST ve öbür
   yayıncıların dağıttığı biçim). İkisi AYNI tabloya iner
   (`MaddeSatiri`): doğrulayıcı OSCAL'ı satırlara çevirir ve CSV ile
   birebir aynı kuralları (tekrar kod, üst madde, lisans sınırı, seviye
   aralığı) uygular — OSCAL'a ayrı bir kapı yoktur, telifli metin OSCAL
   `prose` içinden de sızamaz.

   ── EŞLEME ────────────────────────────────────────────────────────────
   OSCAL `control` = madde. `id` OSCAL belirtecidir (küçük harf, ASCII);
   maddenin asıl kodu `props[kod]` içinde taşınır — Türkçe karakterli
   kod (`İSG-1`) belirteç olamaz, kaybolmaz. Hiyerarşi iç içe
   `controls`; `title` başlık; `parts[statement].prose` metin;
   `parts[guidance].prose` kanıt beklentisi. OSCAL dışı alanlar
   (`sira · seviye · zorunluluk_tipi · dis_kontrol_id · kanit_tipi`)
   `props` ile ve ürünün ad alanında (`urn:…`, P4 kararı). Bilinmeyen
   değer prop olarak YAZILMAZ (boş ≠ sıfır); tarih bilinmiyorsa
   `last-modified` uydurulmaz.

   ── GİDİŞ-DÖNÜŞ ───────────────────────────────────────────────────────
   satırlar → OSCAL → satırlar birebir (kod · üst · başlık · metin · sıra
   · seviye · zorunluluk · kanıt beklentisi · dış kimlik · kanıt tipi);
   ölçülür: `tests/paket-oscal.test.ts` (URN-PKT-017). Bu modül dosya
   sistemi ve veritabanı bilmez. */
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { MADDE_SUTUNLARI, type CerceveKimligi, type MaddeSatiri } from './bicim';

export const OSCAL_SURUMU = '1.1.2';
/** OSCAL dışı alanların ad alanı — P4 kararı `urn:<urun>:…`; ürün adı değil, kimliktir. */
export const OSCAL_NS = 'urn:uyum-platformu:paket';

type Prop = { name: string; value: string; ns?: string };
type Part = { name: string; prose?: string };
export type OscalControl = { id: string; title: string; props?: Prop[]; parts?: Part[]; controls?: OscalControl[] };
export type OscalKatalog = {
  catalog: {
    uuid: string;
    metadata: { title: string; version: string; 'oscal-version': string; 'last-modified'?: string; links?: { href: string; rel: string }[]; props?: Prop[] };
    controls?: OscalControl[];
  };
};

/* Okuma şeması: yalnız kullandığımız alt küme, kalanı serbest (OSCAL
   geniştir; SCF kataloğu bilmediğimiz alanlar taşır). */
const PropSemasi = z.object({ name: z.string(), value: z.string(), ns: z.string().optional() }).passthrough();
const PartSemasi = z.object({ name: z.string(), prose: z.string().optional() }).passthrough();
const ControlSemasi: z.ZodType<OscalControl> = z.lazy(() => z.object({
  id: z.string().min(1), title: z.string(),
  props: z.array(PropSemasi).optional(), parts: z.array(PartSemasi).optional(), controls: z.array(ControlSemasi).optional(),
}).passthrough()) as z.ZodType<OscalControl>;
const KatalogSemasi = z.object({
  catalog: z.object({
    uuid: z.string(),
    metadata: z.object({ title: z.string(), version: z.string(), 'oscal-version': z.string(), 'last-modified': z.string().optional(),
      links: z.array(z.object({ href: z.string(), rel: z.string() }).passthrough()).optional(), props: z.array(PropSemasi).optional() }).passthrough(),
    /* OSCAL katalog kökünde `groups` de olabilir (SCF: grup → aile). Grup
       başlık taşıyan bir üst madde gibi okunur (R6 kararı: grup → üst madde). */
    groups: z.array(z.object({ id: z.string(), title: z.string(), props: z.array(PropSemasi).optional(), controls: z.array(ControlSemasi).optional() }).passthrough()).optional(),
    controls: z.array(ControlSemasi).optional(),
  }).passthrough(),
}).passthrough();

/** Deterministik UUID (sürüm 4 biçimi, sha256'dan): aynı çerçeve + etiket aynı uuid. */
export function sabitUuid(anahtar: string): string {
  const h = createHash('sha256').update(anahtar).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** OSCAL belirteci: `^[_A-Za-z][-._A-Za-z0-9]*$`; Türkçe ve öbür karakterler `_` olur, tekillik ekle sağlanır. */
function belirtec(cerceveKod: string, kod: string, kullanilan: Set<string>): string {
  let id = `${cerceveKod}-${kod}`.toLowerCase().replace(/[^-._a-z0-9]/g, '_');
  if (!/^[_a-z]/.test(id)) id = `_${id}`;
  let aday = id; let n = 2;
  while (kullanilan.has(aday)) aday = `${id}-${n++}`;
  kullanilan.add(aday);
  return aday;
}

const prop = (name: string, value: string): Prop => ({ name, value, ns: OSCAL_NS });

/** Satırlar → OSCAL katalog. Üst madde alt maddeden önce gelmelidir (doğrulayıcı garanti eder). */
export function oscalYaz(kimlik: CerceveKimligi, satirlar: MaddeSatiri[]): OscalKatalog {
  const cocuklar = new Map<string | null, MaddeSatiri[]>();
  for (const s of satirlar) cocuklar.set(s.ustKod, [...(cocuklar.get(s.ustKod) ?? []), s]);
  const kullanilan = new Set<string>();
  const kontrol = (s: MaddeSatiri): OscalControl => {
    const props: Prop[] = [prop('kod', s.kod), prop('sira', String(s.sira))];
    if (s.seviye !== null) props.push(prop('seviye', String(s.seviye)));
    if (s.zorunlulukTipi) props.push(prop('zorunluluk_tipi', s.zorunlulukTipi));
    if (s.disKontrolId) props.push(prop('dis_kontrol_id', s.disKontrolId));
    if (s.kanitTipi) props.push(prop('kanit_tipi', s.kanitTipi));
    const parts: Part[] = [];
    if (s.metin) parts.push({ name: 'statement', prose: s.metin });
    if (s.kanitBeklentisi) parts.push({ name: 'guidance', prose: s.kanitBeklentisi });
    const alt = (cocuklar.get(s.kod) ?? []).map(kontrol);
    return { id: belirtec(kimlik.kod, s.kod, kullanilan), title: s.baslik, props, ...(parts.length ? { parts } : {}), ...(alt.length ? { controls: alt } : {}) };
  };
  const metaProps: Prop[] = [prop('kod', kimlik.kod), prop('lisans_tur', kimlik.lisans.tur), prop('metin_dahil', String(kimlik.lisans.metinDahil)), prop('zorunluluk_tipi', kimlik.zorunlulukTipi)];
  if (kimlik.yururlukTarih) metaProps.push(prop('yururluk_tarihi', kimlik.yururlukTarih));
  const metadata: OscalKatalog['catalog']['metadata'] = { title: kimlik.ad, version: kimlik.surumEtiketi, 'oscal-version': OSCAL_SURUMU, props: metaProps };
  if (kimlik.yayimTarihi) metadata['last-modified'] = `${kimlik.yayimTarihi}T00:00:00Z`;
  if (kimlik.kaynakUrl) metadata.links = [{ href: kimlik.kaynakUrl, rel: 'canonical' }];
  return { catalog: { uuid: sabitUuid(`${kimlik.kod}@${kimlik.surumEtiketi}`), metadata, controls: (cocuklar.get(null) ?? []).map(kontrol) } };
}

export type OscalOkuma =
  | { ok: true; basliklar: string[]; satirlar: string[][]; baslik: string; surumEtiketi: string; kod: string | null }
  | { ok: false; hata: string; konum?: string };

/** OSCAL katalog → CSV ile aynı sütun düzeninde satırlar (`MADDE_SUTUNLARI`).
    Doğrulayıcı bu satırları CSV satırıyla AYNI yoldan geçirir: kural iki
    biçime de tek yerden uygulanır. `props[kod]` yoksa `id` kod olur (yabancı
    katalog); `sira` yoksa gezinti sırası. */
export function oscalOku(ham: unknown): OscalOkuma {
  const p = KatalogSemasi.safeParse(ham);
  if (!p.success) {
    const i = p.error.issues[0];
    return { ok: false, hata: `OSCAL katalog yapısı: ${i.path.join('.') || 'kök'} — ${i.message}`, konum: i.path.join('.') || undefined };
  }
  const { catalog } = p.data;
  const bizim = (props: Prop[] | undefined, ad: string): string | null => props?.find((x) => x.name === ad && (x.ns === OSCAL_NS || x.ns === undefined))?.value ?? null;
  const satirlar: string[][] = [];
  let sira = 0;
  const gez = (c: OscalControl, ustKod: string | null) => {
    const kod = bizim(c.props, 'kod') ?? c.id;
    const s = bizim(c.props, 'sira');
    satirlar.push([
      kod, ustKod ?? '', c.title,
      c.parts?.find((x) => x.name === 'statement')?.prose ?? '',
      s ?? String(sira++),
      bizim(c.props, 'seviye') ?? '',
      bizim(c.props, 'zorunluluk_tipi') ?? '',
      c.parts?.find((x) => x.name === 'guidance')?.prose ?? '',
      bizim(c.props, 'dis_kontrol_id') ?? '',
      bizim(c.props, 'kanit_tipi') ?? '',
    ]);
    for (const alt of c.controls ?? []) gez(alt, kod);
  };
  for (const g of catalog.groups ?? []) {
    const gKod = bizim(g.props, 'kod') ?? g.id;
    satirlar.push([gKod, '', g.title, '', String(sira++), '', '', '', '', '']);
    for (const c of g.controls ?? []) gez(c, gKod);
  }
  for (const c of catalog.controls ?? []) gez(c, null);
  return { ok: true, basliklar: [...MADDE_SUTUNLARI], satirlar, baslik: catalog.metadata.title, surumEtiketi: catalog.metadata.version, kod: bizim(catalog.metadata.props, 'kod') };
}
