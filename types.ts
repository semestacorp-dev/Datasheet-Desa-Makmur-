export interface VillageRaw {
  kecamatan: string;
  kode: string;
  desa: string;
  dld: number;
  ds: number;
  de: number;
  dl: number;
  da: number;
  dtkpd: number;
  skor: number;
  status: string;
}

export interface VillageProcessed extends VillageRaw {
  id: number;
  indikator: {
    dld: number[];
    ds: number[];
    de: number[];
    dl: number[];
    da: number[];
    dtkpd: number[];
  };
}

export enum StatusIDM {
  MANDIRI = "MANDIRI",
  MAJU = "MAJU",
  BERKEMBANG = "BERKEMBANG",
}

export interface RpjmdProgram {
  opd: string;
  program: string;
  kegiatan?: string;
}

export const INDICATOR_NAMES = {
  dld: ["Akses Pendidikan", "Partisipasi Sekolah", "Kualitas Sekolah", "Akses Kesehatan", "Posyandu", "Nakes Desa", "BPJS", "Air Bersih", "Sanitasi", "RTLH", "Listrik", "Internet", "Info Publik"],
  ds: ["Gotong Royong", "Ruang Publik", "Keamanan", "Konflik", "Ormas", "Olahraga", "Budaya", "Toleransi"],
  de: ["Produksi", "Akses Pasar", "Toko/Warung", "BUMDes", "Kinerja BUMDes", "Kredit", "Logistik", "Jalan Desa", "Digital", "Produk Unggulan", "Pasar Desa", "Kerjasama Ekonomi"],
  dl: ["Air Sungai", "Sampah", "Pencemaran", "Bencana", "Tanggap Bencana"],
  da: ["Angkutan", "Jalan Poros", "Jembatan", "Waktu Kec", "Waktu Kab"],
  dtkpd: ["Musyawarah", "Transparansi", "Kinerja", "Aset", "Regulasi"]
};