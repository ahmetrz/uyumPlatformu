'use client';
import { useRef, useState } from 'react';
import Kip from '@/components/Kip';
import { Pill, Bos } from '@/components/ui';
import { useEylem } from '@/components/useEylem';
import { aktarimYukle, aktarimOnayla, aktarimReddet } from '@/lib/eylemler';
import { AKTARIM_ETIKET, AKTARIM_DURUM_RENGI, zamanTR } from '@/lib/sabitler';

type A = {
  id: string; kaynakTipi: string; kaynakAdi: string; durum: string;
  okunan: number; eklenen: number; guncellenen: number; elenen: number;
  raporJson: string | null; regKod: string; yukleyen: string | null; zaman: string;
};
type Rapor = {
  satirlar?: { kod: string; baslik: string; islem: string; alanlar: string[] }[];
  elenenler?: { satir: number; sebep: string }[];
};

export default function IceAktarimIstemci({ aktarimlar, regulasyonlar, alanKodlari }: {
  aktarimlar: A[]; regulasyonlar: { id: string; kod: string; ad: string }[];
  alanKodlari: string[];
}) {
  const { bekliyor, hata, calistir } = useEylem();
  const [regId, setRegId] = useState('');
  const [incelenen, setIncelenen] = useState<A | null>(null);
  const dosyaRef = useRef<HTMLInputElement>(null);

  const bekleyenler = aktarimlar.filter((a) => a.durum === 'dogrulama_bekliyor');
  const rapor: Rapor = incelenen?.raporJson ? JSON.parse(incelenen.raporJson) : {};

  function sablonIndir() {
    const csv = ['madde_kodu;ust_madde_kodu;baslik;metin;alan;kanit_tipi',
      `4;;Varlık Yönetimi;Bölüm başlığı;${alanKodlari.join('/')};`,
      `4.1;4;Varlık Envanteri;Tüm varlıklar envanterde izlenir.;${alanKodlari[0] ?? 'BT'};kayit`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'madde-sablonu.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="kart">
        <div className="kart-baslik">
          <div>
            <span className="mikro-etiket">OTOMASYON-ÖNCELİKLİ AKIŞ</span>
            <h3 style={{ marginTop: 2 }}>Yeni maddeler önce onay kuyruğuna düşer</h3>
          </div>
          <button className="btn kucuk" onClick={sablonIndir}>⤓ Excel/CSV şablonu</button>
        </div>
        <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <p style={{ margin: 0, color: 'var(--text-2)', maxWidth: '80ch', fontSize: 'var(--fs-sm)' }}>
            Excel/CSV dosyası yüklenir veya kurum kaynağından otomatik çekilir; satırlar doğrulanır,
            tanımlı kapsam alanlarıyla (şu an: {alanKodlari.join(', ')}) eşleşmeyenler elenir ve
            sonuç <strong>admin onayına</strong> sunulur. Onaylanmadan hiçbir madde yayına girmez.
            Tekrar aktarım aynı kodu <em>çoğaltmaz, günceller</em>.
          </p>
          <div className="filtreler">
            <select className="sec" value={regId} onChange={(e) => setRegId(e.target.value)}>
              <option value="">Regülasyon seçin…</option>
              {regulasyonlar.map((r) => <option key={r.id} value={r.id}>{r.kod} — {r.ad}</option>)}
            </select>
            <input ref={dosyaRef} type="file" accept=".xlsx,.xls,.csv" className="inp"
              style={{ maxWidth: 280 }} />
            <button className="btn birincil" disabled={bekliyor || !regId}
              onClick={() => {
                const dosya = dosyaRef.current?.files?.[0];
                if (!dosya) return;
                const form = new FormData();
                form.set('dosya', dosya); form.set('regulasyonId', regId);
                calistir(() => aktarimYukle(form), () => { if (dosyaRef.current) dosyaRef.current.value = ''; });
              }}>
              {bekliyor ? 'Yükleniyor…' : '⤒ Yükle ve doğrula'}
            </button>
          </div>
          {hata && <p className="pill durum-uyumsuz" role="alert">{hata}</p>}
        </div>
      </div>

      {bekleyenler.length > 0 && (
        <section>
          <div className="sahne-baslik">
            <span className="no">01</span><h2>Onay kuyruğu</h2><span className="cizgi" />
            <span className="pill durum-kismi"><span className="dot nabiz" />{bekleyenler.length} bekliyor</span>
          </div>
          <div className="kpi-grid" style={{ marginTop: 'var(--sp-4)' }}>
            {bekleyenler.map((a) => (
              <div key={a.id} className="kart tikla">
                <div className="kart-icerik" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  <div className="filtreler">
                    <span className="chip mono">{a.regKod}</span>
                    <span className="chip">{a.kaynakTipi === 'excel' ? '⤓ Excel' : '⚙ Otomatik'}</span>
                    <span className="mikro-etiket">{zamanTR(a.zaman)}</span>
                  </div>
                  <strong className="mono" style={{ fontSize: 'var(--fs-sm)' }}>{a.kaynakAdi}</strong>
                  <span className="mikro-etiket">
                    {a.okunan} SATIR OKUNDU · {a.elenen} ELENDİ{a.yukleyen && ` · ${a.yukleyen.toLocaleUpperCase('tr-TR')}`}
                  </span>
                  <div className="filtreler">
                    <button className="btn kucuk" onClick={() => setIncelenen(a)}>İncele</button>
                    <button className="btn kucuk birincil" disabled={bekliyor}
                      onClick={() => calistir(() => aktarimOnayla({ id: a.id }))}>✓ Onayla</button>
                    <button className="btn kucuk tehlike" disabled={bekliyor}
                      onClick={() => calistir(() => aktarimReddet({ id: a.id }))}>✕ Reddet</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="sahne-baslik">
          <span className="no">{bekleyenler.length > 0 ? '02' : '01'}</span>
          <h2>Aktarım geçmişi</h2><span className="cizgi" />
        </div>
        <div className="kart" style={{ marginTop: 'var(--sp-4)' }}>
          <div className="tablo-sar"><table className="tablo">
            <thead><tr>
              <th>Kaynak</th><th>Regülasyon</th><th>Okunan</th><th>Eklenen</th>
              <th>Güncellenen</th><th>Elenen</th><th>Durum</th><th>Zaman</th>
            </tr></thead>
            <tbody>
              {aktarimlar.map((a) => (
                <tr key={a.id} onClick={() => setIncelenen(a)} style={{ cursor: 'pointer' }}>
                  <td className="mono" style={{ fontSize: 'var(--fs-xs)' }}>{a.kaynakAdi}</td>
                  <td><span className="chip mono">{a.regKod}</span></td>
                  <td className="mono">{a.okunan}</td>
                  <td className="mono" style={{ color: 'var(--uyumlu-fg)' }}>
                    {a.durum === 'onaylandi' ? `+${a.eklenen}` : '—'}</td>
                  <td className="mono">{a.durum === 'onaylandi' ? `~${a.guncellenen}` : '—'}</td>
                  <td className="mono" style={{ color: a.elenen ? 'var(--kismi-fg)' : undefined }}>{a.elenen}</td>
                  <td><Pill durum={AKTARIM_DURUM_RENGI[a.durum as keyof typeof AKTARIM_DURUM_RENGI]}
                    etiket={AKTARIM_ETIKET[a.durum as keyof typeof AKTARIM_ETIKET]} /></td>
                  <td className="mono" style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3)' }}>
                    {zamanTR(a.zaman)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {aktarimlar.length === 0 && <Bos baslik="Aktarım yok" />}
          </div>
        </div>
      </section>

      <Kip acik={!!incelenen} kapat={() => setIncelenen(null)} genis
        baslik={incelenen?.kaynakAdi ?? ''}
        ust={<span className="mikro-etiket">{incelenen?.regKod} ·{' '}
          {AKTARIM_ETIKET[incelenen?.durum as keyof typeof AKTARIM_ETIKET]}</span>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {(rapor.satirlar?.length ?? 0) > 0 && (
            <div>
              <div className="mikro-etiket" style={{ marginBottom: 'var(--sp-2)' }}>İŞLENECEK SATIRLAR</div>
              {rapor.satirlar!.map((s) => (
                <div key={s.kod} className="satir" style={{ padding: 'var(--sp-2) 0' }}>
                  <Pill durum={s.islem === 'yeni' ? 'uyumlu' : 'incelemede'}
                    etiket={s.islem === 'yeni' ? 'yeni' : 'güncelleme'} />
                  <span className="chip mono">{s.kod}</span>
                  <span style={{ flex: 1 }}>{s.baslik}</span>
                  {s.alanlar.map((a) => <span key={a} className="chip">{a}</span>)}
                </div>
              ))}
            </div>
          )}
          {(rapor.elenenler?.length ?? 0) > 0 && (
            <div>
              <div className="mikro-etiket" style={{ marginBottom: 'var(--sp-2)' }}>ELENEN SATIRLAR VE SEBEPLERİ</div>
              {rapor.elenenler!.map((e) => (
                <div key={e.satir} className="satir" style={{ padding: 'var(--sp-2) 0' }}>
                  <span className="chip mono">satır {e.satir}</span>
                  <span style={{ flex: 1, color: 'var(--uyumsuz-fg)', fontSize: 'var(--fs-sm)' }}>{e.sebep}</span>
                </div>
              ))}
            </div>
          )}
          {!rapor.satirlar?.length && !rapor.elenenler?.length && <Bos baslik="Rapor detayı yok" />}
          {incelenen?.durum === 'dogrulama_bekliyor' && (
            <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
              <button className="btn tehlike" disabled={bekliyor}
                onClick={() => calistir(() => aktarimReddet({ id: incelenen.id }), () => setIncelenen(null))}>
                ✕ Reddet
              </button>
              <button className="btn birincil" disabled={bekliyor}
                onClick={() => calistir(() => aktarimOnayla({ id: incelenen.id }), () => setIncelenen(null))}>
                ✓ Onayla ve yayınla
              </button>
            </div>
          )}
        </div>
      </Kip>
    </>
  );
}
