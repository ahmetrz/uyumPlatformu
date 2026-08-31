import { z } from 'zod';
import type {
  ErisimGozlemi, Koken, VarlikGozlemi, YedekGozlemi, ZafiyetGozlemi,
} from '../entegrasyon/sozlesme';

/* Tel biçimi (wire format) → lib/entegrasyon/sozlesme.ts `Gozlem` tipleri.

   Dış istemciler İngilizce alan adları gönderir; çekirdek Türkçe `Gozlem`
   tiplerini görür. Bu dosya YALNIZCA çeviri yapar — connector çekirdeğiyle
   API aynı normalize biçimi paylaşır, ikinci bir veri modeli yoktur.

   Köken alanları (source, sourceRecordId, collectedAt, confidence) HER
   kayıtta ZORUNLUDUR. `confidence: null` = ÖLÇÜLMEDİ; alanı hiç göndermemek
   ise hatadır — "bilinmiyor" ile "söylemedim" ayırt edilir. */

const metin = (ad: string, azami = 500) =>
  z.string({ error: `${ad} zorunlu` }).trim().min(1, `${ad} boş olamaz`).max(azami);

const metinOpsiyonel = (azami = 500) =>
  z.string().trim().max(azami).nullable().optional();

const tarih = z
  .string({ error: 'ISO-8601 tarih bekleniyor' })
  .refine((s) => !Number.isNaN(Date.parse(s)), 'ISO-8601 tarih bekleniyor')
  .transform((s) => new Date(s));

const tarihOpsiyonel = tarih.nullable().optional();

/** Köken zarfı — dört alanın dördü de istekte bulunmak ZORUNDA. */
const kokenAlanlari = {
  source: metin('source', 120),
  sourceRecordId: metin('sourceRecordId', 200),
  collectedAt: tarih,
  confidence: z
    .number({ error: 'confidence zorunlu (ölçülmediyse null gönderin)' })
    .min(0, 'confidence 0–1 aralığında olmalı')
    .max(1, 'confidence 0–1 aralığında olmalı')
    .nullable(),
};

type KokenTel = { source: string; sourceRecordId: string; collectedAt: Date; confidence: number | null };

export const kokene = (t: KokenTel): Koken => ({
  kaynakSistem: t.source,
  kaynakKayitId: t.sourceRecordId,
  toplanma: t.collectedAt,
  guven: t.confidence,
});

/* ── varlık gözlemi ────────────────────────────────────────────────── */

export const varlikKaydiSemasi = z.object({
  ...kokenAlanlari,
  assetTag: metinOpsiyonel(120),
  hostname: metinOpsiyonel(255),
  serialNumber: metinOpsiyonel(120),
  macAddress: metinOpsiyonel(64),
  ipAddress: metinOpsiyonel(64),
  vendor: metinOpsiyonel(160),
  model: metinOpsiyonel(160),
  operatingSystem: metinOpsiyonel(160),
  firmware: metinOpsiyonel(160),
  plantCode: metinOpsiyonel(64),
  zoneCode: metinOpsiyonel(64),
  typeCode: metinOpsiyonel(64),
});
export type VarlikKaydiTel = z.infer<typeof varlikKaydiSemasi>;

export const varlikGozlemine = (t: VarlikKaydiTel, ham: unknown): VarlikGozlemi => ({
  tip: 'varlik',
  koken: kokene(t),
  etiket: t.assetTag ?? null,
  hostname: t.hostname ?? null,
  seriNo: t.serialNumber ?? null,
  macAdresi: t.macAddress ?? null,
  ipAdresi: t.ipAddress ?? null,
  uretici: t.vendor ?? null,
  model: t.model ?? null,
  isletimSistemi: t.operatingSystem ?? null,
  firmware: t.firmware ?? null,
  tesisKodu: t.plantCode ?? null,
  bolgeKodu: t.zoneCode ?? null,
  turKodu: t.typeCode ?? null,
  ham,
});

/* ── zafiyet gözlemi ───────────────────────────────────────────────── */

export const zafiyetKaydiSemasi = z.object({
  ...kokenAlanlari,
  sourceRef: metin('sourceRef', 64),
  title: metin('title', 400),
  cvss: z.number().min(0, 'cvss 0–10 aralığında olmalı').max(10, 'cvss 0–10 aralığında olmalı').nullable().optional(),
  assetKey: metin('assetKey', 255),
  dueDate: tarihOpsiyonel,
});
export type ZafiyetKaydiTel = z.infer<typeof zafiyetKaydiSemasi>;

export const zafiyetGozlemine = (t: ZafiyetKaydiTel, ham: unknown): ZafiyetGozlemi => ({
  tip: 'zafiyet',
  koken: kokene(t),
  kaynakRef: t.sourceRef,
  baslik: t.title,
  cvss: t.cvss ?? null,
  varlikAnahtari: t.assetKey,
  sonTarih: t.dueDate ?? null,
  ham,
});

/* ── yedek gözlemi ─────────────────────────────────────────────────── */

export const yedekKaydiSemasi = z.object({
  ...kokenAlanlari,
  assetKey: metin('assetKey', 255),
  backupAt: tarih,
  success: z.boolean({ error: 'success zorunlu (true/false)' }),
  version: metinOpsiyonel(120),
  contentHash: metinOpsiyonel(200),
  storageLocation: metinOpsiyonel(400),
  error: metinOpsiyonel(1000),
});
export type YedekKaydiTel = z.infer<typeof yedekKaydiSemasi>;

export const yedekGozlemine = (t: YedekKaydiTel, ham: unknown): YedekGozlemi => ({
  tip: 'yedek',
  koken: kokene(t),
  varlikAnahtari: t.assetKey,
  yedekZamani: t.backupAt,
  basarili: t.success,
  surum: t.version ?? null,
  icerikHash: t.contentHash ?? null,
  depolamaKonumu: t.storageLocation ?? null,
  hata: t.error ?? null,
  ham,
});

/* ── erişim gözlemi ────────────────────────────────────────────────── */

export const erisimKaydiSemasi = z.object({
  ...kokenAlanlari,
  accountName: metin('accountName', 200),
  accountType: z.enum(['kisi', 'servis', 'paylasimli', 'acil_durum']).nullable().optional(),
  privileged: z.boolean().nullable().optional(),
  lastUsedAt: tarihOpsiyonel,
  passwordRotatedAt: tarihOpsiyonel,
  scope: metinOpsiyonel(400),
  assetKey: metinOpsiyonel(255),
  /** API düzeyinde kapsam alanı: hesabın hangi santrale ait olduğu. */
  plantCode: metinOpsiyonel(64),
});
export type ErisimKaydiTel = z.infer<typeof erisimKaydiSemasi>;

export const erisimGozlemine = (t: ErisimKaydiTel, ham: unknown): ErisimGozlemi => ({
  tip: 'erisim',
  koken: kokene(t),
  hesapAdi: t.accountName,
  hesapTipi: t.accountType ?? null,
  ayricalikli: t.privileged ?? null,
  sonKullanim: t.lastUsedAt ?? null,
  parolaRotasyon: t.passwordRotatedAt ?? null,
  kapsam: t.scope ?? null,
  varlikAnahtari: t.assetKey ?? null,
  ham,
});

/* ── zarf ──────────────────────────────────────────────────────────── */

export const AZAMI_KAYIT = 1000;

export const zarf = <T extends z.ZodTypeAny>(kayit: T) =>
  z.object({
    records: z
      .array(kayit, { error: 'records dizisi zorunlu' })
      .min(1, 'records boş olamaz')
      .max(AZAMI_KAYIT, `tek istekte en fazla ${AZAMI_KAYIT} kayıt`),
  });

/** zod'a girmeden önceki ham dizi — `ham` alanı dokunulmamış gövdeden gelir. */
export function hamKayitlar(govde: unknown): unknown[] {
  if (typeof govde === 'object' && govde !== null && Array.isArray((govde as { records?: unknown }).records)) {
    return (govde as { records: unknown[] }).records;
  }
  return [];
}
