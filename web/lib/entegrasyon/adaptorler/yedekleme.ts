import 'server-only';
import { z } from 'zod';
import { BaglanmamisAdaptor } from '../sozlesme';
import { AKTIF_ISLEM_YASAK, ORTAK_YAPILANDIRMA } from './ortak';

/* ═══════════════════════════════════════════════════════════════════════
   Yedekleme sistemi (Veeam · Commvault · NetBackup · Acronis) — BAĞLI DEĞİL.

   ── PASSIVE-FIRST NOTU ───────────────────────────────────────────────
   Yalnız yedekleme işlerinin SONUÇLARI okunur. YASAK: yedek işi
   başlatmak, geri yükleme tetiklemek, saklama politikası değiştirmek.
   Geri yükleme testi bir DEĞİŞİKLİK'tir ve insan onayına tabidir; bu
   adaptörden tetiklenmez.

   ── BAĞLARKEN NEREYE NE YAZILACAK ────────────────────────────────────
   Veeam Backup Enterprise Manager / VBR REST:
     POST /api/oauth2/token
     GET  /api/v1/sessions?createdAfterFilter={imlec}&typeFilter=BackupJob
     GET  /api/v1/backupObjects
     GET  /api/v1/restorePoints?createdAfterFilter={imlec}
   Commvault:  GET /SearchSvc/CVWebService.svc/Job?jobFilter=…
   NetBackup:  GET /netbackup/admin/jobs?filter=…

   `fetchChanges` imleci: en son işlenen oturumun `creationTime` değeri.

   YedekGozlemi eşlemesi (Veeam alan adlarıyla):
     session.id                         → koken.kaynakKayitId  (KARARLI)
     backupObject.name / vmName         → varlikAnahtari  (hostname ya da etiket)
     session.endTime                    → yedekZamani
     session.result ('Success')         → basarili
     restorePoint.id / backupFile       → surum
     restorePoint.checksum / hash       → icerikHash
     repository.name / path             → depolamaKonumu
     session.result.message             → hata   (başarısızsa; boş bırakılmaz)
     tüm oturum nesnesi                 → ham

   Kısmi başarı (`Warning`) `basarili = false` YAZILMAZ — kısmi başarı
   ile başarısızlık aynı şey değildir. Bu durumda `basarili = false`
   yerine `hata` alanına uyarı metni yazılır ve ekran kısmi olarak gösterir;
   modelde üç durum gerekiyorsa şema sahibine BİLDİRİLİR, alan uydurulmaz.

   VarlikGozlemi eşlemesi (yedeklenen nesne envanteri):
     backupObject.name       → hostname
     backupObject.platform   → isletimSistemi
     `yedek:${objectId}`     → koken.kaynakKayitId

   CMDB anlamı: onaylanan kayıt `Varlik.yedekDurumu = 'var'` yazabilir.
   Tersi ÇIKARILMAZ — yedekleme konsolunda görünmeyen varlık için
   'bilinmiyor' kalır, 'yok' değil.

   koken.guven: yedekleme kataloğu kendi nesnesini kesin bilir ama CMDB
   varlığıyla bağı isim üzerindendir. Öneri: hostname + UUID birlikte
   geliyorsa 0.8, yalnız görünen ad geliyorsa 0.4, bilgi yoksa null. */

export class YedeklemeAdaptoru extends BaglanmamisAdaptor {
  readonly tip = 'backup';
  readonly yapilandirmaSemasi = z.looseObject({
    ...ORTAK_YAPILANDIRMA,
    isKapsami: z.array(z.string().min(1)).min(1).optional(),
    /* Geri yükleme bir DEĞİŞİKLİK'tir ve insan onayına tabidir. */
    geriYuklemeIzni: AKTIF_ISLEM_YASAK,
  });
  readonly gerekenSirlar = ['env:YEDEK_API_SIRRI'];
  readonly gereken =
    'Yedekleme konsolunda salt okunur (Backup Viewer / Restore Operator ' +
    'DEĞİL) hesap ve API erişimi: Veeam için Enterprise Manager taban URL\'i ' +
    '+ kullanıcı/parola ya da OAuth istemcisi (env:YEDEK_API_SIRRI); ' +
    'Commvault için webconsole URL + token; NetBackup için API key. Ayrıca ' +
    'hangi iş/politika kapsamının okunacağı. Yedek başlatma ve geri yükleme ' +
    'izni İSTENMEZ.';
}

export const yedeklemeAdaptoru = new YedeklemeAdaptoru();
