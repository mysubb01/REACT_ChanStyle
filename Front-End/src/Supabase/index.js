import { createClient } from "@supabase/supabase-js";

// Supabase 설정
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Supabase 클라이언트 초기화
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };
