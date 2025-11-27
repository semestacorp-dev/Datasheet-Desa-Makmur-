import React, { useMemo, useState } from 'react';
import { RAW_VILLAGE_DATA } from './constants';
import { processVillageData, formatNumber, exportToCSV } from './utils';
import { VillageProcessed, StatusIDM } from './types';
import { TableListIcon, FileSpreadsheetIcon, SearchIcon, EyeIcon, SquareIcon, CheckSquareIcon, SplitIcon } from './components/Icons';
import { DetailModal } from './components/DetailModal';
import { ComparisonModal } from './components/ComparisonModal';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const PROCESSED_DATA = processVillageData(RAW_VILLAGE_DATA);

const STATUS_COLORS = {
  [StatusIDM.MANDIRI]: '#10B981', // green-500
  [StatusIDM.MAJU]: '#3B82F6', // blue-500
  [StatusIDM.BERKEMBANG]: '#F59E0B', // yellow-500
};

const App: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [kecamatanFilter, setKecamatanFilter] = useState('ALL');
  
  const [selectedVillage, setSelectedVillage] = useState<VillageProcessed | null>(null);
  
  // Multi-select for Comparison
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showComparison, setShowComparison] = useState(false);

  // Extract Unique Kecamatans for Filter
  const uniqueKecamatan = useMemo(() => {
    const kecs = PROCESSED_DATA.map(d => d.kecamatan);
    return Array.from(new Set(kecs)).sort();
  }, []);

  // Filter Data Logic
  const filteredData = useMemo(() => {
    return PROCESSED_DATA.filter(item => {
      const matchSearch = item.desa.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.kecamatan.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchKec = kecamatanFilter === 'ALL' || item.kecamatan === kecamatanFilter;
      return matchSearch && matchStatus && matchKec;
    });
  }, [searchTerm, statusFilter, kecamatanFilter]);

  // Statistics
  const stats = useMemo(() => {
    const counts = {
      [StatusIDM.MANDIRI]: 0,
      [StatusIDM.MAJU]: 0,
      [StatusIDM.BERKEMBANG]: 0,
    };
    let totalScore = 0;

    filteredData.forEach(d => {
      if (d.status in counts) counts[d.status as StatusIDM]++;
      totalScore += d.skor;
    });

    const avg = filteredData.length > 0 ? totalScore / filteredData.length : 0;
    
    return { counts, avg };
  }, [filteredData]);

  const pieData = [
    { name: 'Mandiri', value: stats.counts[StatusIDM.MANDIRI], color: STATUS_COLORS[StatusIDM.MANDIRI] },
    { name: 'Maju', value: stats.counts[StatusIDM.MAJU], color: STATUS_COLORS[StatusIDM.MAJU] },
    { name: 'Berkembang', value: stats.counts[StatusIDM.BERKEMBANG], color: STATUS_COLORS[StatusIDM.BERKEMBANG] },
  ].filter(d => d.value > 0);

  // Selection Logic
  const toggleSelection = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getComparisonVillages = () => {
    return PROCESSED_DATA.filter(v => selectedIds.has(v.id));
  };

  return (
    <div className="flex flex-col h-screen text-sm relative">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 shadow-sm z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-lg shadow-lg shadow-blue-500/30">
            <TableListIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-slate-900">DATA SHEET INDEKS DESA</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Sumber: Masterplan LMD & RPJMD 2025-2029</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           {/* Top Stats Pills */}
           <div className="flex gap-3 text-xs font-medium text-slate-600 bg-slate-50 px-4 py-2 rounded-full border border-slate-200">
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500"></span> Mandiri: <b>{stats.counts.MANDIRI}</b></span>
             <span className="w-px h-4 bg-slate-300"></span>
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Maju: <b>{stats.counts.MAJU}</b></span>
             <span className="w-px h-4 bg-slate-300"></span>
             <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Berkembang: <b>{stats.counts.BERKEMBANG}</b></span>
           </div>

           <button 
             onClick={() => exportToCSV(filteredData)}
             className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium transition shadow-sm flex items-center gap-2"
           >
             <FileSpreadsheetIcon className="w-4 h-4" />
             Export Excel
           </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Filters */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shrink-0">
           <div className="p-5 border-b border-slate-100">
             <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Filter Data</h3>
             <div className="space-y-4">
               <div>
                 <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Pencarian</label>
                 <div className="relative">
                   <input 
                     type="text" 
                     placeholder="Cari Desa / Kecamatan..." 
                     className="w-full border border-slate-300 rounded-md py-2 pl-8 pr-3 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                   />
                   <SearchIcon className="absolute left-2.5 top-2 text-slate-400 w-4 h-4" />
                 </div>
               </div>

               <div>
                 <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Status IDM</label>
                 <select 
                   className="w-full border border-slate-300 rounded-md py-2 px-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value)}
                 >
                   <option value="ALL">Semua Status</option>
                   <option value={StatusIDM.MANDIRI}>Mandiri</option>
                   <option value={StatusIDM.MAJU}>Maju</option>
                   <option value={StatusIDM.BERKEMBANG}>Berkembang</option>
                 </select>
               </div>

               <div>
                 <label className="text-[11px] font-semibold text-slate-600 mb-1.5 block">Kecamatan</label>
                 <select 
                   className="w-full border border-slate-300 rounded-md py-2 px-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                   value={kecamatanFilter}
                   onChange={(e) => setKecamatanFilter(e.target.value)}
                 >
                   <option value="ALL">Semua Kecamatan</option>
                   {uniqueKecamatan.map(kec => (
                     <option key={kec} value={kec}>{kec}</option>
                   ))}
                 </select>
               </div>
             </div>
           </div>

           <div className="p-5 flex-1 overflow-y-auto">
             <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 shadow-sm">
                <h4 className="text-xs font-bold text-blue-900 mb-3">Statistik Ringkas</h4>
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Total Desa:</span> <span className="font-mono font-bold">{filteredData.length}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Rata-rata Skor:</span> <span className="font-mono font-bold">{formatNumber(stats.avg)}</span>
                  </div>
                </div>
                
                {/* Pie Chart */}
                <div className="h-40 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={55}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ fontSize: '12px', borderRadius: '4px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {pieData.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-400">No Data</div>
                  )}
                </div>
             </div>
           </div>
           
           <div className="p-4 border-t border-slate-200 text-[10px] text-slate-400 text-center">
             Lampiran Keputusan Menteri Desa PDTT<br/>No. 343 Tahun 2025
           </div>
        </aside>

        {/* Data Grid */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-50 relative">
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-xs uppercase text-slate-500 sticky top-0 z-10 font-bold shadow-sm">
                <tr>
                  <th className="px-2 py-3 border-b border-slate-200 bg-slate-100 text-center w-10">Pilih</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-slate-100 w-12 text-center">No</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100">Kecamatan</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100">Desa</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100">Kode Wilayah</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100 text-center">Status</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100 text-center font-bold text-slate-700 border-l border-r border-slate-200">SKOR ID</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-blue-50 text-blue-700 text-center w-12" title="Layanan Dasar (Max 170)">DLD</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-purple-50 text-purple-700 text-center w-12" title="Sosial (Max 85)">DS</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-green-50 text-green-700 text-center w-12" title="Ekonomi (Max 160)">DE</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-teal-50 text-teal-700 text-center w-12" title="Lingkungan (Max 90)">DL</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-orange-50 text-orange-700 text-center w-12" title="Aksesibilitas (Max 50)">DA</th>
                  <th className="px-2 py-3 border-b border-slate-200 bg-pink-50 text-pink-700 text-center w-12" title="Tata Kelola (Max 80)">TK</th>
                  <th className="px-4 py-3 border-b border-slate-200 bg-slate-100 text-center">Detail</th>
                </tr>
              </thead>
              <tbody className="text-xs divide-y divide-slate-200 bg-white">
                {filteredData.map((village, idx) => {
                   const statusColor = 
                    village.status === 'MANDIRI' ? 'bg-green-100 text-green-800 border-green-200' :
                    village.status === 'MAJU' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                    'bg-yellow-100 text-yellow-800 border-yellow-200';
                   
                   const isSelected = selectedIds.has(village.id);

                   return (
                    <tr key={village.id} className={`hover:bg-slate-50 transition-colors group ${isSelected ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-2 py-3 text-center cursor-pointer" onClick={() => toggleSelection(village.id)}>
                        <button className={`transition ${isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-400'}`}>
                           {isSelected ? <CheckSquareIcon className="w-5 h-5" /> : <SquareIcon className="w-5 h-5" />}
                        </button>
                      </td>
                      <td className="px-2 py-3 text-center text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-600">{village.kecamatan}</td>
                      <td className="px-4 py-3 font-bold text-slate-800">{village.desa}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{village.kode}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${statusColor}`}>
                          {village.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold text-white bg-slate-800 border-x border-slate-700">
                        {village.skor.toFixed(2)}
                      </td>
                      <td className="px-2 py-3 text-center text-blue-600 font-medium bg-slate-50 group-hover:bg-blue-50/30">{village.dld}</td>
                      <td className="px-2 py-3 text-center text-purple-600 font-medium bg-slate-50 group-hover:bg-purple-50/30">{village.ds}</td>
                      <td className="px-2 py-3 text-center text-green-600 font-medium bg-slate-50 group-hover:bg-green-50/30">{village.de}</td>
                      <td className="px-2 py-3 text-center text-teal-600 font-medium bg-slate-50 group-hover:bg-teal-50/30">{village.dl}</td>
                      <td className="px-2 py-3 text-center text-orange-600 font-medium bg-slate-50 group-hover:bg-orange-50/30">{village.da}</td>
                      <td className="px-2 py-3 text-center text-pink-600 font-medium bg-slate-50 group-hover:bg-pink-50/30">{village.dtkpd}</td>
                      <td className="px-4 py-3 text-center">
                        <button 
                          onClick={() => setSelectedVillage(village)}
                          className="text-slate-400 hover:text-blue-600 transition p-1 rounded hover:bg-slate-100"
                          title="Lihat Detail"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                   );
                })}
              </tbody>
            </table>
            
            {filteredData.length === 0 && (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <SearchIcon className="w-8 h-8 mb-2 opacity-50" />
                <p>Data tidak ditemukan</p>
              </div>
            )}
          </div>
          
          <div className="h-10 bg-white border-t border-slate-200 flex items-center px-6 justify-between text-xs text-slate-500 shrink-0">
             <span>Menampilkan {filteredData.length} dari {PROCESSED_DATA.length} Desa</span>
             <span className="font-mono text-[10px]">VER: 2025.1.0</span>
          </div>
        </main>
      </div>

      {/* Floating Comparison Action */}
      {selectedIds.size >= 2 && (
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <button 
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-3 bg-slate-800 text-white pl-4 pr-5 py-3 rounded-full shadow-xl hover:bg-slate-700 hover:scale-105 transition active:scale-95 ring-4 ring-white"
          >
            <div className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
              {selectedIds.size}
            </div>
            <span className="font-bold flex items-center gap-2">
              <SplitIcon className="w-4 h-4" />
              Bandingkan Desa
            </span>
          </button>
        </div>
      )}

      {/* Modals */}
      <DetailModal village={selectedVillage} onClose={() => setSelectedVillage(null)} />
      {showComparison && (
        <ComparisonModal 
          villages={getComparisonVillages()} 
          allVillages={PROCESSED_DATA}
          onClose={() => setShowComparison(false)} 
        />
      )}
    </div>
  );
};

export default App;