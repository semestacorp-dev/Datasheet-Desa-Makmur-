import React, { useState, useEffect } from 'react';
import { VillageProcessed, INDICATOR_NAMES, RpjmdProgram } from '../types';
import { RPJMD_MATRIX } from '../constants';
import { XIcon, ListCheckIcon, GoogleMapsIcon } from './Icons';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { VillageMap } from './VillageMap';

interface DetailModalProps {
  village: VillageProcessed | null;
  onClose: () => void;
}

// Helper for exponential backoff retry
const fetchWithRetry = async <T,>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    if (
      retries > 0 && 
      (error?.status === 429 || error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('quota'))
    ) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const DetailModal: React.FC<DetailModalProps> = ({ village, onClose }) => {
  const [aiState, setAiState] = useState<{
    loading: boolean;
    data: { text: string; sources: any[] } | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const [strategyState, setStrategyState] = useState<{
    loading: boolean;
    data: string | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  useEffect(() => {
    if (village) {
      setAiState({ loading: false, data: null, error: null });
      setStrategyState({ loading: false, data: null, error: null });
    }
  }, [village]);

  if (!village) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'MANDIRI': return 'text-green-600 bg-green-50 border-green-200';
      case 'MAJU': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };

  const statusStyle = getStatusColor(village.status);

  const getWeakIndicators = () => {
    const weak: { name: string; score: number; dimension: string; programs: RpjmdProgram[] }[] = [];
    const dimKeys = ['dld', 'ds', 'de', 'dl', 'da', 'dtkpd'];
    dimKeys.forEach(dim => {
      // @ts-ignore
      village.indikator[dim].forEach((score: number, idx: number) => {
        if (score <= 3) {
          // @ts-ignore
          const name = INDICATOR_NAMES[dim][idx];
          const mappingKey = `${dim}-${idx}`;
          const programs = RPJMD_MATRIX[mappingKey] || [];
          weak.push({ name, score, dimension: dim.toUpperCase(), programs });
        }
      });
    });
    return weak;
  };

  const weakIndicators = getWeakIndicators();

  const fetchMapsInfo = async () => {
    if (aiState.data) return;
    setAiState({ loading: true, data: null, error: null });
    
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Tampilkan informasi lokasi dan fasilitas penting (sekolah, tempat ibadah, kantor desa, atau pasar) yang ada di Desa ${village.desa}, Kecamatan ${village.kecamatan}, Kabupaten Lampung Timur. Berikan ringkasan singkat tentang aksesibilitas ke lokasi tersebut.`;
        
        const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleMaps: {} }]
            }
        }));
        
        const text = response.text || "Tidak ada informasi yang tersedia.";
        const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        setAiState({ loading: false, data: { text, sources }, error: null });
    } catch (err: any) {
        console.error(err);
        const isQuota = err?.status === 429 || err?.message?.includes('429');
        setAiState({ 
          loading: false, 
          data: null, 
          error: isQuota 
            ? "Batas kuota API tercapai. Silakan tunggu beberapa saat sebelum mencoba lagi." 
            : "Gagal mengambil data Google Maps. Periksa koneksi atau API Key." 
        });
    }
  };

  const generateStrategicAnalysis = async () => {
    if (strategyState.data) return;
    setStrategyState({ loading: true, data: null, error: null });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const weakList = weakIndicators.map(w => 
        `- ${w.name} (Skor: ${w.score}, Dimensi: ${w.dimension}). Program Intervensi: ${w.programs.map(p => p.program).join(', ')}`
      ).join('\n');

      const prompt = `Anda adalah Konsultan Perencana Pembangunan Daerah yang ahli. Analisis data berikut untuk Desa ${village.desa}, Kecamatan ${village.kecamatan}, Kabupaten Lampung Timur (Status: ${village.status}, Skor IDM: ${village.skor}).

Daftar Indikator Lemah (Prioritas Penanganan) dan Program RPJMD Terkait:
${weakList}

Tugas:
1. Buat Ringkasan Eksekutif tentang kondisi desa berdasarkan kelemahannya.
2. Berikan Rekomendasi Strategis yang konkret, mengintegrasikan program RPJMD yang tersedia.
3. Identifikasi potensi sinergi antar OPD untuk menangani masalah lintas sektor.

Gunakan gaya bahasa formal, lugas, dan solutif.`;

      const response = await fetchWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingBudget: 32768 }
        }
      }));

      setStrategyState({ loading: false, data: response.text || "Tidak ada respon.", error: null });

    } catch (err: any) {
      console.error(err);
      const isQuota = err?.status === 429 || err?.message?.includes('429');
      setStrategyState({ 
        loading: false, 
        data: null, 
        error: isQuota 
          ? "Batas kuota API Thinking Mode tercapai. Silakan coba lagi nanti."
          : "Gagal menghasilkan analisis. Pastikan API Key valid dan mendukung model Gemini 3 Pro." 
      });
    }
  };

  const renderIndicators = (
      title: string, 
      scores: number[], 
      names: string[], 
      colorClass: string
  ) => {
    return (
      <div className="mb-6">
        <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 border-l-4 pl-2 ${colorClass.replace('bg-', 'border-')}`}>
          {title}
        </h4>
        <div className="grid grid-cols-1 gap-2">
          {scores.map((val, idx) => {
            let width = Math.min(100, val * 20);
            let barColor = val >= 4 ? 'bg-green-500' : (val >= 3 ? 'bg-blue-500' : 'bg-yellow-500');
            
            return (
              <div key={idx} className="flex items-center text-xs">
                <span className="w-8 text-slate-400 font-mono text-[10px]">I-{idx + 1}</span>
                <span className="flex-1 truncate text-slate-600 mr-2" title={names[idx]}>
                    {names[idx] || `Indikator ${idx + 1}`}
                </span>
                <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor}`} style={{ width: `${width}%` }}></div>
                </div>
                <span className="w-4 text-right font-bold ml-2 text-slate-700">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{village.desa}</h2>
            <div className="flex gap-2 text-xs text-slate-500 mt-1">
              <span>{village.kecamatan}</span> • <span className="font-mono">{village.kode}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-200 rounded-full">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Status IDM</p>
              <div className={`inline-block px-2 py-0.5 rounded text-sm font-bold mt-1 border ${statusStyle}`}>
                {village.status}
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Total Skor</p>
              <p className="text-2xl font-bold text-blue-600 font-mono">{village.skor}</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm col-span-2">
               <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Komposisi Dimensi</p>
               <div className="flex w-full h-3 rounded-full overflow-hidden">
                  <div style={{ flex: village.dld }} className="bg-blue-500 h-full" title={`DLD: ${village.dld}`}></div>
                  <div style={{ flex: village.ds }} className="bg-purple-500 h-full" title={`DS: ${village.ds}`}></div>
                  <div style={{ flex: village.de }} className="bg-green-500 h-full" title={`DE: ${village.de}`}></div>
                  <div style={{ flex: village.dl }} className="bg-teal-500 h-full" title={`DL: ${village.dl}`}></div>
                  <div style={{ flex: village.da }} className="bg-orange-500 h-full" title={`DA: ${village.da}`}></div>
                  <div style={{ flex: village.dtkpd }} className="bg-pink-500 h-full" title={`TK: ${village.dtkpd}`}></div>
               </div>
               <div className="flex justify-between text-[9px] text-slate-400 mt-1 px-1">
                  <span>Layanan</span><span>Sosial</span><span>Ekon</span><span>Ling</span><span>Akses</span><span>Tata Kelola</span>
               </div>
            </div>
          </div>

          {/* Maps Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
             {/* Google Maps Grounding (Info) */}
             <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-blue-800 flex items-center gap-2">
                    <div className="p-1 bg-blue-100 rounded">
                      <GoogleMapsIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    Wawasan Wilayah (AI)
                  </h4>
                  {!aiState.data && !aiState.loading && (
                    <button 
                      onClick={fetchMapsInfo} 
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700 transition flex items-center gap-1 shadow-sm"
                    >
                      Tampilkan Info
                    </button>
                  )}
                </div>

                {aiState.loading && (
                  <div className="text-xs text-slate-500 flex items-center gap-2 py-2 animate-pulse">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    Sedang mengambil data dari Google Maps...
                  </div>
                )}

                {aiState.error && (
                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 flex items-center gap-2">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    {aiState.error}
                  </div>
                )}

                {aiState.data && (
                  <div className="text-xs text-slate-700 space-y-3">
                    <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed">
                      {aiState.data.text}
                    </div>
                    
                    {aiState.data.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-100">
                        <p className="font-bold text-[10px] text-slate-400 uppercase mb-2">Sumber Google Maps:</p>
                        <div className="flex flex-wrap gap-2">
                          {aiState.data.sources.map((source, idx) => {
                            if (source.maps) {
                              return (
                                <a 
                                  key={idx} 
                                  href={source.maps.uri} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded border border-blue-100 text-blue-700 hover:bg-blue-100 hover:underline transition"
                                >
                                  <GoogleMapsIcon className="w-3 h-3" />
                                  {source.maps.title}
                                </a>
                              )
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
             </div>

             {/* BIG Map Visualization */}
             <div>
                 <VillageMap desa={village.desa} kecamatan={village.kecamatan} />
             </div>
          </div>

          {/* RPJMD Intervention Matrix & AI Strategy */}
          <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm mb-6">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                 <div className="p-1 bg-purple-100 rounded text-purple-600">
                   <ListCheckIcon className="w-4 h-4" />
                 </div>
                 Analisis & Intervensi RPJMD
               </h3>
               
               {!strategyState.data && !strategyState.loading && (
                 <button 
                   onClick={generateStrategicAnalysis}
                   className="bg-purple-600 text-white px-4 py-2 rounded-md text-xs font-bold hover:bg-purple-700 transition shadow-sm flex items-center gap-2"
                 >
                   <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                   Analisis Strategis (Gemini 3.0)
                 </button>
               )}
             </div>

             {/* Weak Indicators Table */}
             {weakIndicators.length > 0 ? (
               <div className="overflow-x-auto mb-4">
                 <table className="w-full text-xs text-left">
                   <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                     <tr>
                       <th className="p-2 font-bold">Indikator Lemah (Skor &le; 3)</th>
                       <th className="p-2 font-bold">Dimensi</th>
                       <th className="p-2 font-bold">OPD Pengampu</th>
                       <th className="p-2 font-bold">Program RPJMD</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {weakIndicators.map((w, i) => (
                       <tr key={i} className="hover:bg-slate-50">
                         <td className="p-2 font-medium text-red-600">{w.name} <span className="text-slate-400">({w.score})</span></td>
                         <td className="p-2 text-slate-500">{w.dimension}</td>
                         <td className="p-2 text-slate-700">
                           {w.programs.length > 0 ? w.programs.map(p => p.opd).join(', ') : '-'}
                         </td>
                         <td className="p-2 text-slate-700">
                           {w.programs.length > 0 ? (
                             <ul className="list-disc list-inside">
                               {w.programs.map((p, idx) => <li key={idx}>{p.program}</li>)}
                             </ul>
                           ) : <span className="text-slate-400 italic">Belum ada mapping program</span>}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             ) : (
               <div className="p-4 bg-green-50 text-green-700 text-xs rounded border border-green-200 mb-4 text-center">
                 Tidak ada indikator dengan skor rendah (&le; 3). Desa ini memiliki performa yang baik.
               </div>
             )}

             {/* AI Strategy Output */}
             {strategyState.loading && (
               <div className="p-4 bg-purple-50 rounded border border-purple-100 text-center">
                 <div className="flex justify-center mb-2">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                 </div>
                 <p className="text-xs font-bold text-purple-700">Gemini 3.0 sedang berpikir...</p>
                 <p className="text-[10px] text-purple-500">Menggunakan kapasitas berpikir tinggi (Thinking Mode) untuk analisis mendalam.</p>
               </div>
             )}

             {strategyState.error && (
                <div className="mt-4 text-xs text-red-600 bg-red-50 p-3 rounded border border-red-100 flex items-center gap-2">
                    <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-500"></div>
                    {strategyState.error}
                </div>
             )}

             {strategyState.data && (
               <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                 <h4 className="text-xs font-bold text-purple-800 mb-2 uppercase tracking-wide">Rekomendasi Strategis Eksekutif</h4>
                 <div className="prose prose-sm max-w-none text-xs text-slate-700 whitespace-pre-line">
                   {strategyState.data}
                 </div>
               </div>
             )}
          </div>


          <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
            <ListCheckIcon className="w-4 h-4 text-blue-600" />
            Rincian 48 Indikator (Estimasi)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {renderIndicators("Layanan Dasar", village.indikator.dld, INDICATOR_NAMES.dld, "border-blue-500")}
             {renderIndicators("Sosial", village.indikator.ds, INDICATOR_NAMES.ds, "border-purple-500")}
             {renderIndicators("Ekonomi", village.indikator.de, INDICATOR_NAMES.de, "border-green-500")}
             {renderIndicators("Lingkungan", village.indikator.dl, INDICATOR_NAMES.dl, "border-teal-500")}
             {renderIndicators("Aksesibilitas", village.indikator.da, INDICATOR_NAMES.da, "border-orange-500")}
             {renderIndicators("Tata Kelola", village.indikator.dtkpd, INDICATOR_NAMES.dtkpd, "border-pink-500")}
          </div>

        </div>
        
        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition shadow-sm">
            Tutup Detail
          </button>
        </div>
      </div>
    </div>
  );
};