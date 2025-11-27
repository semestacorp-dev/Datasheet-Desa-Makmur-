import React, { useState, useMemo } from 'react';
import { VillageProcessed, INDICATOR_NAMES } from '../types';
import { XIcon, BarChartIcon, RadarIcon } from './Icons';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis 
} from 'recharts';

interface ComparisonModalProps {
  villages: VillageProcessed[];
  allVillages: VillageProcessed[];
  onClose: () => void;
}

export const ComparisonModal: React.FC<ComparisonModalProps> = ({ villages, onClose }) => {
  const [radarCategory, setRadarCategory] = useState<string>('summary');

  // Dimensions metadata for charts and tables
  const dimensions = [
    { key: 'dld', name: 'Layanan Dasar', full: 'Layanan Dasar (DLD)', max: 170 },
    { key: 'ds', name: 'Sosial', full: 'Sosial (DS)', max: 90 },
    { key: 'de', name: 'Ekonomi', full: 'Ekonomi (DE)', max: 160 },
    { key: 'dl', name: 'Lingkungan', full: 'Lingkungan (DL)', max: 90 },
    { key: 'da', name: 'Akses', full: 'Aksesibilitas (DA)', max: 50 },
    { key: 'dtkpd', name: 'Tata Kelola', full: 'Tata Kelola (DTKPD)', max: 80 },
  ];

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  // Data for Bar Chart (Side by Side Comparison)
  const barChartData = dimensions.map(dim => {
    const entry: any = { name: dim.name, full: dim.full };
    villages.forEach((v, idx) => {
      entry[`v${idx}`] = v[dim.key as keyof VillageProcessed] as number;
    });
    return entry;
  });

  // Dynamic Data for Radar Chart
  const radarChartData = useMemo(() => {
    if (radarCategory === 'summary') {
      // Normalized Dimensions (0-100%)
      return dimensions.map(dim => {
        const entry: any = { subject: dim.name };
        villages.forEach((v, idx) => {
          const val = v[dim.key as keyof VillageProcessed] as number;
          entry[`v${idx}`] = (val / dim.max) * 100;
        });
        return entry;
      });
    } else {
      // Specific Indicators (1-5 scale normalized to 0-100%)
      const dimKey = radarCategory as keyof typeof INDICATOR_NAMES;
      const names = INDICATOR_NAMES[dimKey];
      
      // Fallback if invalid key
      if (!names) return [];

      return names.map((name, i) => {
         // Truncate long names for radar axis
         const shortName = name.length > 15 ? name.substring(0, 15) + '...' : name;
         const entry: any = { subject: shortName, full: name };
         
         villages.forEach((v, idx) => {
            // @ts-ignore - accessing dynamic property of indikator
            const val = v.indikator[dimKey][i];
            entry[`v${idx}`] = val * 20; // Convert 1-5 to 0-100%
         });
         return entry;
      });
    }
  }, [radarCategory, villages, dimensions]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChartIcon className="w-5 h-5 text-blue-600" />
            Perbandingan Desa
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition p-2 hover:bg-slate-200 rounded-full">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* Table Comparison */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 text-xs uppercase font-bold text-slate-500">
                  <tr>
                    <th className="px-4 py-3 border-b">Indikator</th>
                    {villages.map((v, i) => (
                      <th key={v.id} className="px-4 py-3 border-b border-l min-w-[150px]">
                        <div className="text-slate-800 text-base">{v.desa}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{v.kecamatan}</div>
                        <div className="mt-1 w-full h-1 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-700">Status IDM</td>
                    {villages.map(v => (
                      <td key={v.id} className="px-4 py-3 border-l font-bold text-xs">
                        <span className={`px-2 py-1 rounded border ${
                            v.status === 'MANDIRI' ? 'bg-green-50 text-green-700 border-green-200' :
                            v.status === 'MAJU' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                            {v.status}
                        </span>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-800">TOTAL SKOR</td>
                    {villages.map(v => (
                      <td key={v.id} className="px-4 py-3 border-l font-mono text-lg font-bold text-slate-800">
                        {v.skor.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                  {dimensions.map(dim => (
                    <tr key={dim.key} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-600 font-medium">
                        {dim.full} 
                        <span className="text-[10px] text-slate-400 ml-1">(Max {dim.max})</span>
                      </td>
                      {villages.map(v => (
                         <td key={v.id} className="px-4 py-2 border-l font-mono text-slate-700">
                            {Number(v[dim.key as keyof VillageProcessed]).toFixed(2)}
                         </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Bar Chart Section */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
                <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <BarChartIcon className="w-4 h-4 text-slate-400" />
                    Grafik Perbandingan (Skor Asli)
                </h3>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#64748b'}} />
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                          {villages.map((v, i) => (
                              <Bar 
                                  key={v.id} 
                                  dataKey={`v${i}`} 
                                  name={v.desa} 
                                  fill={colors[i % colors.length]} 
                                  radius={[4, 4, 0, 0]} 
                              />
                          ))}
                      </BarChart>
                  </ResponsiveContainer>
                </div>
             </div>

             {/* Radar Chart Section */}
             <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-96 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                      <RadarIcon className="w-4 h-4 text-slate-400" />
                      Peta Kekuatan
                  </h3>
                  <select 
                    className="text-xs border border-slate-300 rounded px-2 py-1 outline-none focus:border-blue-500 text-slate-600 bg-slate-50"
                    value={radarCategory}
                    onChange={(e) => setRadarCategory(e.target.value)}
                  >
                    <option value="summary">Ringkasan Dimensi</option>
                    <optgroup label="Indikator Spesifik">
                      {dimensions.map(d => (
                        <option key={d.key} value={d.key}>{d.name}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarChartData}>
                          <PolarGrid stroke="#e2e8f0" />
                          <PolarAngleAxis dataKey="subject" tick={{fontSize: 10, fill: '#64748b'}} />
                          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{fontSize: 9, fill: '#94a3b8'}} tickFormatter={(val) => `${val}%`} />
                          {villages.map((v, i) => (
                              <Radar
                                  key={v.id}
                                  name={v.desa}
                                  dataKey={`v${i}`}
                                  stroke={colors[i % colors.length]}
                                  fill={colors[i % colors.length]}
                                  fillOpacity={0.2}
                              />
                          ))}
                          <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
                          <Tooltip contentStyle={{fontSize: '12px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                      </RadarChart>
                  </ResponsiveContainer>
                </div>
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right shrink-0">
          <button onClick={onClose} className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-md text-sm font-medium transition shadow-sm">
            Tutup Perbandingan
          </button>
        </div>
      </div>
    </div>
  );
};
