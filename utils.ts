import { VillageRaw, VillageProcessed } from './types';

// Algorithm to break down dimension scores into estimated indicator scores (1-5 scale)
// Added 'salt' parameter to vary distribution for identical scores
export const breakdownScore = (score: number, count: number, divisor: number, salt: number = 0): number[] => {
  const result = new Array(count).fill(1);
  
  const inputVal = score / divisor; 
  let remaining = Math.round(inputVal) - count;
  
  // Safety clamp
  if (remaining < 0) remaining = 0;
  
  // Distribute remaining
  // We use a pseudo-random generator with a seed based on score AND salt
  let seed = score + salt; 
  const random = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  for (let i = 0; i < remaining; i++) {
     let idx;
     let attempts = 0;
     do {
       idx = Math.floor(random() * count);
       attempts++;
     } while (result[idx] >= 5 && attempts < 20);
     
     if (result[idx] < 5) {
       result[idx]++;
     }
  }
  
  return result;
};

// Helper to safely parse numbers from mixed input (string/number)
const parseNumber = (val: any): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Handle comma as decimal separator (ID locale)
        const normalized = val.replace(',', '.');
        const parsed = parseFloat(normalized);
        return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
};

export const processVillageData = (data: any[]): VillageProcessed[] => {
  return data.map((d, index) => {
    // Expected format: [Kecamatan, Kode, Desa, DLD, DS, DE, DL, DA, DTKPD, Skor, Status]
    // We explicitly cast numbers to ensure runtime safety because some data might be strings (e.g. "62.36")
    const raw: VillageRaw = {
      kecamatan: d[0],
      kode: d[1],
      desa: d[2],
      dld: parseNumber(d[3]),
      ds: parseNumber(d[4]),
      de: parseNumber(d[5]),
      dl: parseNumber(d[6]),
      da: parseNumber(d[7]),
      dtkpd: parseNumber(d[8]),
      skor: parseNumber(d[9]),
      status: d[10]
    };

    // Use index as salt so two villages with identical dimension scores don't look exactly the same
    return {
      ...raw,
      id: index + 1,
      indikator: {
        dld: breakdownScore(raw.dld, 13, 2.6, index),
        ds: breakdownScore(raw.ds, 8, 2.2, index),
        de: breakdownScore(raw.de, 12, 2.7, index),
        dl: breakdownScore(raw.dl, 5, 3.6, index),
        da: breakdownScore(raw.da, 5, 2.0, index),
        dtkpd: breakdownScore(raw.dtkpd, 5, 3.2, index),
      }
    };
  });
};

export const formatNumber = (num: number) => {
  return (num || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const exportToCSV = (data: VillageProcessed[]) => {
    const headers = "No,Kecamatan,Kode Desa,Nama Desa,Status,Skor Total,DLD,DS,DE,DL,DA,DTKPD";
    const rows = data.map((row, i) => 
        `${i+1},"${row.kecamatan}","${row.kode}","${row.desa}",${row.status},${row.skor},${row.dld},${row.ds},${row.de},${row.dl},${row.da},${row.dtkpd}`
    ).join("\n");
    
    const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Data_Desa_Lamtim_2025.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};