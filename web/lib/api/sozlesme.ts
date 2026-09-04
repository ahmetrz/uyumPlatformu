import { z } from 'zod';
import {
  UC_ETIKETI, UC_KIMLIKLERI, YAZMA_UCLARI, yazmaUcuMu, type UcKimligi,
} from './kapsam';
import {
  erisimKaydiSemasi, durusKaydiSemasi, varlikKaydiSemasi, yedekKaydiSemasi, zafiyetKaydiSemasi, zarf,
} from './semalar';
import { AZAMI_LIMIT, VARSAYILAN_LIMIT } from './sayfalama';
import { HATA_DURUMU } from './hatalar';

/* ═══════════════════════════════════════════════════════════════════════
   UY-52 · OpenAPI sözleşmesi — ÜRÜNDEN TÜRETİLİR

   ── ELLE YAZILAN SÖZLEŞME KAYAR ───────────────────────────────────────
   Ayrı bir dosyada tutulan bir OpenAPI belgesi, ilk uç değişikliğinde
   sessizce yanlışa döner ve entegrasyonu yazan taraf yanlış belgeye göre
   kod üretir. Bu belge uç kütüğünden (`kapsam.ts`), istek şemalarından
   (`semalar.ts`, zod) ve hata sözlüğünden (`hatalar.ts`) türetilir:
   üründe değişen şey belgede de değişir.

   ── `servers` ALANI YOKTUR ────────────────────────────────────────────
   Ürünün nerede koşacağı ürünle gelmez. Örnek bir taban adres yazmak,
   üretilen her istemciye YANLIŞ bir adres koymak olurdu; kimse
   değiştirmez ve ilk çağrı sessizce başka bir yere gider. Adresi
   entegrasyonu kuran taraf kendi kurulumundan yazar.

   Bu dosya veritabanı, React ve dosya sistemi bilmez. */

export const SOZLESME_SURUMU = '1.0.0';

/** Ucun HTTP yolu ve yöntemi — `app/api/v1/` ile birebir. */
export const UC_YOLU: Record<UcKimligi, string> = {
  plants: '/api/v1/plants',
  assets: '/api/v1/assets',
  'assets.upsert': '/api/v1/assets/upsert',
  'assets.observations': '/api/v1/assets/observations',
  evidence: '/api/v1/evidence',
  vulnerabilities: '/api/v1/vulnerabilities',
  'backup-results': '/api/v1/backup-results',
  'integration-runs': '/api/v1/integration-runs',
  'access-observations': '/api/v1/access-observations',
  'asset-state': '/api/v1/asset-state',
};

/** Yazma ucunun gövde şeması — `dogrula(...)` çağrısındaki şemanın AYNISI. */
const GOVDE_SEMASI: Partial<Record<UcKimligi, z.ZodTypeAny>> = {
  'assets.upsert': zarf(varlikKaydiSemasi),
  'assets.observations': zarf(varlikKaydiSemasi),
  vulnerabilities: zarf(zafiyetKaydiSemasi),
  'backup-results': zarf(yedekKaydiSemasi),
  'access-observations': zarf(erisimKaydiSemasi),
  'asset-state': zarf(durusKaydiSemasi),
};

/** Okuma ucunun kabul ettiği süzgeçler — uç dosyalarındaki `*Param` çağrıları. */
const SUZGECLER: Partial<Record<UcKimligi, { ad: string; tip: string; not: string }[]>> = {
  plants: [
    { ad: 'status', tip: 'string', not: 'aktif | kapali' },
  ],
  assets: [
    { ad: 'plantId', tip: 'string', not: 'santral kimliği — kapsam dışıysa 403' },
    { ad: 'plantCode', tip: 'string', not: 'santral kodu' },
    { ad: 'typeCode', tip: 'string', not: 'varlık türü kodu' },
    { ad: 'criticality', tip: 'string', not: 'dusuk | orta | yuksek | kritik | bilinmiyor' },
    { ad: 'lifecycle', tip: 'string', not: 'planlandi | aktif | bakim | emekli | imha' },
    { ad: 'updatedSince', tip: 'string', not: 'ISO 8601 zaman damgası' },
  ],
  evidence: [
    { ad: 'type', tip: 'string', not: 'kanıt tipi' },
    { ad: 'plantId', tip: 'string', not: 'santral kimliği' },
    { ad: 'collectedSince', tip: 'string', not: 'ISO 8601 zaman damgası' },
  ],
  'integration-runs': [
    { ad: 'status', tip: 'string', not: 'koşu durumu' },
    { ad: 'trigger', tip: 'string', not: 'tetikleyen' },
    { ad: 'source', tip: 'string', not: 'kaynak sistem' },
    { ad: 'connectorId', tip: 'string', not: 'connector kimliği' },
    { ad: 'startedSince', tip: 'string', not: 'ISO 8601 zaman damgası' },
  ],
};

const SAYFALAMA = [
  {
    name: 'limit',
    in: 'query',
    required: false,
    description: `Sayfa boyu (varsayılan ${VARSAYILAN_LIMIT}, tavan ${AZAMI_LIMIT}).`,
    schema: { type: 'integer', minimum: 1, maximum: AZAMI_LIMIT, default: VARSAYILAN_LIMIT },
  },
  {
    name: 'cursor',
    in: 'query',
    required: false,
    description: 'Bir önceki yanıtın `nextCursor` alanı. Boşsa baştan başlar.',
    schema: { type: 'string' },
  },
];

const HATA_SEMASI = {
  type: 'object',
  required: ['error'],
  properties: {
    error: {
      type: 'object',
      required: ['code', 'message'],
      properties: {
        code: { type: 'string', enum: Object.keys(HATA_DURUMU) },
        message: { type: 'string' },
        details: {},
      },
    },
  },
};

/* Bütün uçlarda ortak hata yanıtları. Uçtan uca aynı olmaları bir
   tesadüf değil `ucnokta.ts` sarmalayıcısının garantisidir; belge de bu
   yüzden onları tek yerde tanımlar. */
const ORTAK_HATALAR: Record<string, unknown> = {
  400: { description: 'Gövde ya da parametre doğrulaması başarısız' },
  401: { description: 'Kimlik yok, geçersiz, süresi dolmuş ya da iptal edilmiş' },
  403: {
    description: 'Anahtarın kapsamında bu uç yok, salt okunur anahtarla yazma '
      + 'denendi, ya da istenen santral kapsam dışı',
  },
  429: { description: 'İstek sınırı aşıldı — `Retry-After` başlığına bakın' },
  500: { description: 'Beklenmeyen sunucu hatası (iç ayrıntı gövdeye girmez)' },
};

function jsonSemasi(sema: z.ZodTypeAny): unknown {
  return z.toJSONSchema(sema, { io: 'input', unrepresentable: 'any' });
}

function okumaIslemi(uc: UcKimligi): Record<string, unknown> {
  const suzgecler = (SUZGECLER[uc] ?? []).map((s) => ({
    name: s.ad, in: 'query', required: false,
    description: s.not, schema: { type: s.tip },
  }));
  return {
    get: {
      operationId: uc.replace(/[.-]/g, '_'),
      summary: UC_ETIKETI[uc],
      security: [{ bearerAuth: [] }],
      parameters: [...SAYFALAMA, ...suzgecler],
      responses: {
        200: {
          description: 'İmleç sayfalamalı liste',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['data', 'nextCursor'],
                properties: {
                  data: { type: 'array', items: { type: 'object' } },
                  /* null = SON SAYFA. Boş dize değil: boş dize bir imleç
                     gibi geri gönderilebilir ve sonsuz döngü yapardı. */
                  nextCursor: { type: ['string', 'null'] },
                },
              },
            },
          },
        },
        ...ORTAK_HATALAR,
      },
    },
  };
}

function yazmaIslemi(uc: UcKimligi): Record<string, unknown> {
  const sema = GOVDE_SEMASI[uc];
  return {
    post: {
      operationId: uc.replace(/[.-]/g, '_'),
      summary: UC_ETIKETI[uc],
      security: [{ bearerAuth: [] }],
      parameters: [{
        name: 'Idempotency-Key',
        in: 'header',
        required: true,
        description: 'İstemcinin ürettiği benzersiz değer. Aynı anahtar+değer '
          + 'ikinci kez gelirse iş TEKRAR EDİLMEZ, ilk yanıt döner '
          + '(`Idempotent-Replay: true`).',
        schema: { type: 'string', maxLength: 200 },
      }],
      requestBody: sema
        ? { required: true, content: { 'application/json': { schema: jsonSemasi(sema) } } }
        : undefined,
      responses: {
        200: { description: 'Kayıtlar işlendi; sonuç özeti döner' },
        409: {
          description: 'Aynı Idempotency-Key hâlâ işleniyor ya da başka bir '
            + 'uç için kullanılmış',
        },
        ...ORTAK_HATALAR,
      },
    },
  };
}

/**
 * OpenAPI 3.1 belgesi.
 *
 * Uç kütüğünde ne varsa belgede o vardır: `UC_KIMLIKLERI` tek kaynaktır
 * ve buradan geçmeyen bir uç belgeye giremez.
 */
export function openapiBelgesi(): Record<string, unknown> {
  const paths: Record<string, unknown> = {};
  for (const uc of UC_KIMLIKLERI) {
    paths[UC_YOLU[uc]] = yazmaUcuMu(uc) ? yazmaIslemi(uc) : okumaIslemi(uc);
  }
  return {
    openapi: '3.1.0',
    info: {
      title: 'Zorlu Enerji Yönetişim Platformu · Dış API',
      version: SOZLESME_SURUMU,
      description: [
        'Kimlik: `Authorization: Bearer <token>`. Başka taşıyıcı kabul edilmez;',
        'sorgu parametresiyle token taşımak logları kirletir.',
        '',
        'Her anahtarın KENDİ kapsamı vardır ve erişebileceği uçlar sayılıdır.',
        'Kapsam anahtar sahibinin rolünü yalnız DARALTIR: sahibinde olmayan bir',
        'yetkiyi açmaz. Kapsam dışı bir uca istek 403 döner.',
        '',
        `Yazma uçları: ${YAZMA_UCLARI.join(', ')}. Hepsi zorunlu`,
        '`Idempotency-Key` başlığı ister. Salt okunur işaretli anahtarlar bu',
        'uçlara hiç giremez.',
        '',
        'Bu belge ürünün uç kütüğünden ve zod şemalarından üretilir; elle',
        'düzenlenmez.',
      ].join('\n'),
    },
    /* `servers` BİLEREK YOK — gerekçe dosya başında. */
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer' },
      },
      schemas: { Hata: HATA_SEMASI },
    },
    security: [{ bearerAuth: [] }],
    paths,
  };
}
