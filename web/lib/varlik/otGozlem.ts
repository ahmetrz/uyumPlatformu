/* ═══ OT-17 · Pasif OT keşfi — OUI ve protokol imzası ═════════════════

   Bu ürün OT ağında AKTİF TARAMA YAPMAZ (kök CLAUDE.md kuralı). Pasif
   keşif, başka bir yerde toplanmış gözlemin (firewall oturum kaydı, span
   port dışa aktarımı, switch ARP tablosu) ürüne getirilmesidir.

   Bu dosya o gözlemden İKİ şey çıkarır ve ikisini de uydurmaz:

     OUI       MAC'in ilk üç sekizlisi. Ön ek her zaman okunur; ÜRETİCİ
               adı ancak kurumun yüklediği IEEE OUI kütüğünde varsa
               bilinir. Kütük boşsa üretici `null`'dır — "bilinmiyor"
               demektir, "üreticisi yok" değil.

     PROTOKOL  Port/protokol imzası. Aşağıdaki liste IANA'da kayıtlı ve
               kamuya açık standart port atamalarıdır; kurum sistemi
               bilgisi DEĞİLDİR. Tanınmayan trafik `null` bırakılır —
               "OT değil" diye işaretlemek, bilinmeyen bir protokolü
               zararsız saymak olurdu.

   ── EŞLEŞME BİR KİMLİK DEĞİLDİR ───────────────────────────────────────
   502 numaralı portta konuşan her şey Modbus değildir; imza bir İPUCUDUR
   ve `guven` alanıyla birlikte taşınır. Ekran onu kesinlik gibi
   göstermez. */

/* ── OUI ────────────────────────────────────────────────────────────── */

const MAC_AYRAC = /[:.\-\s]/g;
const MAC_ONALTILIK = /^[0-9A-F]{12}$/;

/**
 * MAC adresini kanonik biçime getirir: büyük harf, ayraçsız, 12 hane.
 * Geçersizse `null` — "boş MAC" diye bir şey yoktur.
 */
export function macKanonik(ham: string | null | undefined): string | null {
  if (typeof ham !== 'string') return null;
  /* MAC bir KİMLİKTİR, Türkçe metin değil: `toLocaleUpperCase('tr')`
     burada `i` → `İ` yapar ve onaltılık hane bozulurdu. Sabit yerel. */
  const temiz = ham.replace(MAC_AYRAC, '').toLocaleUpperCase('en-US');
  return MAC_ONALTILIK.test(temiz) ? temiz : null;
}

/** İlk üç sekizli (OUI ön eki). Geçersiz MAC → `null`. */
export function ouiOnEki(ham: string | null | undefined): string | null {
  const k = macKanonik(ham);
  return k === null ? null : k.slice(0, 6);
}

/**
 * Yerel olarak yönetilen (locally administered) MAC mi?
 *
 * İlk sekizlinin ikinci biti 1 ise adres bir üreticiye ait DEĞİLDİR:
 * sanal makine, konteyner ya da elle atanmış bir adrestir. Böyle bir
 * adreste OUI araması yapmak, olmayan bir üretici aramaktır.
 */
export function yerelMacMi(ham: string | null | undefined): boolean | null {
  const k = macKanonik(ham);
  if (k === null) return null;
  const ilk = Number.parseInt(k.slice(0, 2), 16);
  return (ilk & 0b10) !== 0;
}

/** Çok noktaya yayın (multicast) MAC mi? İlk sekizlinin en düşük biti. */
export function multicastMacMi(ham: string | null | undefined): boolean | null {
  const k = macKanonik(ham);
  if (k === null) return null;
  return (Number.parseInt(k.slice(0, 2), 16) & 0b1) !== 0;
}

export type OuiSonucu = {
  onEk: string | null;
  /** Kütükte bulunduysa üretici; BULUNAMADIYSA null (uydurulmaz). */
  uretici: string | null;
  /** Yerel/multicast adreste OUI araması ANLAMSIZDIR; sebebi taşınır. */
  aranamaz: 'yerel_yonetilen' | 'multicast' | 'gecersiz_mac' | null;
};

export function ouiCoz(
  mac: string | null | undefined,
  kutuk: ReadonlyMap<string, string>,
): OuiSonucu {
  const onEk = ouiOnEki(mac);
  if (onEk === null) return { onEk: null, uretici: null, aranamaz: 'gecersiz_mac' };
  if (multicastMacMi(mac) === true) return { onEk, uretici: null, aranamaz: 'multicast' };
  if (yerelMacMi(mac) === true) return { onEk, uretici: null, aranamaz: 'yerel_yonetilen' };
  return { onEk, uretici: kutuk.get(onEk) ?? null, aranamaz: null };
}

/* ── OT protokol imzası ─────────────────────────────────────────────── */

export type ProtokolImzasi = {
  kod: string;
  ad: string;
  port: number;
  /** tcp | udp | her_ikisi */
  tasima: 'tcp' | 'udp' | 'her_ikisi';
  /**
   * İmzanın gücü.
   *   `yuksek` — port bu protokole ayrılmıştır ve başka yaygın kullanımı yok.
   *   `orta`   — port ayrılmış ama başka trafik de görülebilir.
   */
  guven: 'yuksek' | 'orta';
};

/**
 * IANA'da kayıtlı endüstriyel protokol portları.
 *
 * BU LİSTE KURUM BİLGİSİ DEĞİLDİR: hepsi kamuya açık standart
 * atamalardır. Listede olmayan port `null` döner — bilinmeyen trafiği
 * "OT değil" saymak, en tehlikeli varsayım olurdu.
 */
export const OT_PROTOKOLLERI: readonly ProtokolImzasi[] = [
  { kod: 'modbus', ad: 'Modbus/TCP', port: 502, tasima: 'tcp', guven: 'yuksek' },
  { kod: 'dnp3', ad: 'DNP3', port: 20000, tasima: 'her_ikisi', guven: 'yuksek' },
  { kod: 'ethernet_ip', ad: 'EtherNet/IP', port: 44818, tasima: 'tcp', guven: 'yuksek' },
  { kod: 'ethernet_ip_kesif', ad: 'EtherNet/IP (keşif)', port: 2222, tasima: 'udp', guven: 'orta' },
  { kod: 's7comm', ad: 'S7comm (ISO-TSAP)', port: 102, tasima: 'tcp', guven: 'yuksek' },
  { kod: 'iec104', ad: 'IEC 60870-5-104', port: 2404, tasima: 'tcp', guven: 'yuksek' },
  { kod: 'iec61850_mms', ad: 'IEC 61850 MMS', port: 102, tasima: 'tcp', guven: 'orta' },
  { kod: 'bacnet', ad: 'BACnet/IP', port: 47808, tasima: 'udp', guven: 'yuksek' },
  { kod: 'opcua', ad: 'OPC UA', port: 4840, tasima: 'tcp', guven: 'yuksek' },
  { kod: 'profinet_ctx', ad: 'PROFINET (bağlam)', port: 34962, tasima: 'udp', guven: 'yuksek' },
  { kod: 'profinet_rt', ad: 'PROFINET (gerçek zaman)', port: 34964, tasima: 'udp', guven: 'yuksek' },
  { kod: 'fl_net', ad: 'FL-net', port: 55000, tasima: 'udp', guven: 'orta' },
  { kod: 'cc_link_ie', ad: 'CC-Link IE', port: 45237, tasima: 'udp', guven: 'orta' },
  { kod: 'omron_fins', ad: 'OMRON FINS', port: 9600, tasima: 'her_ikisi', guven: 'orta' },
  { kod: 'melsec', ad: 'MELSEC (MC protokolü)', port: 5007, tasima: 'tcp', guven: 'orta' },
];

/**
 * Porttan protokol tahmini.
 *
 * Aynı porta birden çok protokol düşebilir (102: S7comm ve IEC 61850 MMS);
 * hepsi döner ve ekran "hangisi" sorusuna tek cevap uydurmaz.
 */
export function protokolAdaylari(
  port: number | null | undefined,
  tasima?: 'tcp' | 'udp' | null,
): ProtokolImzasi[] {
  if (typeof port !== 'number' || !Number.isInteger(port)) return [];
  return OT_PROTOKOLLERI.filter((p) => {
    if (p.port !== port) return false;
    if (!tasima) return true;
    return p.tasima === 'her_ikisi' || p.tasima === tasima;
  });
}

/**
 * Gözlemden tek bir protokol kodu türetir.
 *
 * Tek aday varsa onun kodu; birden çok aday varsa `null` (karar
 * verilemedi) — ikisinden birini seçmek, gözlemin söylemediği bir şeyi
 * söylemek olurdu. Çağıran adayların tamamını `protokolAdaylari` ile
 * görebilir.
 */
export function protokolKodu(
  port: number | null | undefined,
  tasima?: 'tcp' | 'udp' | null,
): string | null {
  const a = protokolAdaylari(port, tasima);
  return a.length === 1 ? a[0].kod : null;
}

/** Kod → insan okunur ad. Bilinmeyen kod için `null`. */
export function protokolAdi(kod: string | null | undefined): string | null {
  if (!kod) return null;
  return OT_PROTOKOLLERI.find((p) => p.kod === kod)?.ad ?? null;
}
