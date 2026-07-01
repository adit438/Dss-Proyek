import { createClient } from '@supabase/supabase-js';

// Mengambil URL dan Key dari file .env.local
// Tambahan 'as string' memastikan TypeScript mengenali nilai ini sebagai teks murni
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Peringatan jika file .env.local lupa dibuat atau isinya kosong
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Kunci API Supabase belum terpasang di .env.local!");
}

// Mengekspor objek 'supabase' agar bisa digunakan di file/komponen lain
export const supabase = createClient(supabaseUrl, supabaseAnonKey);