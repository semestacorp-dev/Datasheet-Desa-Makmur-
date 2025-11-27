import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    L: any;
  }
}

interface VillageMapProps {
  desa: string;
  kecamatan: string;
}

export const VillageMap: React.FC<VillageMapProps> = ({ desa, kecamatan }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState('Menginisialisasi Peta...');

  useEffect(() => {
    if (!mapContainer.current || !window.L) return;

    // Helper to clean up map instance if it already exists
    // We store the map instance on the DOM element for this demo approach
    const container = mapContainer.current as any;
    if (container._leaflet_id) {
        return; // Already initialized
    }

    const L = window.L;
    const map = L.map(mapContainer.current).setView([-5.1, 105.6], 10); // Centered on East Lampung

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const urlBIG = 'https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer';

    // Add the dynamic layer for visual context
    L.esri.dynamicMapLayer({
      url: urlBIG,
      opacity: 0.7,
      f: 'image',
      useCors: false
    }).addTo(map);

    // Perform Query to find the specific village polygon
    setStatus(`Mencari batas wilayah: ${desa}...`);
    
    // Convert village name to Title Case for better matching chance if needed, 
    // but SQL 'LIKE' is usually case insensitive or we can use UPPER
    
    L.esri.query({ url: urlBIG })
      .layer(0) // Assuming layer 0 is the polygon layer
      .where(`NAMOBJ LIKE '%${desa}%'`)
      .run((error: any, featureCollection: any) => {
        if (error) {
          console.error("BIG Map Query Error:", error);
          setStatus('Gagal memuat data dari server BIG.');
          return;
        }

        if (featureCollection && featureCollection.features.length > 0) {
          // Filter by kecamatan if possible to avoid ambiguous names
          // Note: Field names in BIG data can vary, typically WADMKC is Kecamatan
          const bestMatch = featureCollection.features.find((f: any) => 
             f.properties.WADMKC && 
             f.properties.WADMKC.toString().toUpperCase().includes(kecamatan.toUpperCase())
          ) || featureCollection.features[0];

          const geoJson = L.geoJSON(bestMatch, {
            style: { 
                color: '#2563eb', // Blue-600
                weight: 3, 
                fillOpacity: 0.2,
                dashArray: '5, 5'
            }
          }).addTo(map);

          // Zoom to the village
          const bounds = geoJson.getBounds();
          map.fitBounds(bounds);
          
          const props = bestMatch.properties;
          setStatus(`Batas Wilayah: ${props.NAMOBJ} (${props.WADMKC})`);
          
          geoJson.bindPopup(`
            <div class="font-sans text-xs">
                <div class="font-bold text-sm mb-1">${props.NAMOBJ}</div>
                <table class="w-full">
                    <tr><td class="text-slate-500 pr-2">Kecamatan:</td><td>${props.WADMKC}</td></tr>
                    <tr><td class="text-slate-500 pr-2">Kabupaten:</td><td>${props.WADMKK}</td></tr>
                    <tr><td class="text-slate-500 pr-2">Sumber:</td><td>BIG</td></tr>
                </table>
            </div>
          `).openPopup();

        } else {
          setStatus(`Data spasial untuk "${desa}" tidak ditemukan.`);
        }
      });

    // Cleanup function
    return () => {
        if (map) {
            map.remove();
            container._leaflet_id = null;
        }
    };
  }, [desa, kecamatan]);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm mt-4">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                Peta Batas Wilayah (BIG 1:10K)
            </h4>
            <span className="text-[10px] text-slate-500 truncate max-w-[200px]">{status}</span>
        </div>
        <div className="relative h-64 w-full bg-slate-100">
             <div ref={mapContainer} className="absolute inset-0 z-0" />
        </div>
        <div className="bg-slate-50 px-3 py-1 text-[9px] text-slate-400 text-right">
            Sumber: Badan Informasi Geospasial (Geoservices)
        </div>
    </div>
  );
};
