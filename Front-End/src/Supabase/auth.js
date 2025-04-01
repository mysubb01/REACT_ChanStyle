import { supabase } from './index';

export const supabaseAuth = {
  // 회원가입
  signUp: async (email, password, userData) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData // 추가 사용자 데이터
      }
    });
    
    if (error) throw error;
    return data;
  },
  
  // 로그인
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // 토큰을 localStorage에 저장 (기존 방식과 호환성 유지)
    if (data?.session?.access_token) {
      localStorage.setItem("token", data.session.access_token);
    }
    
    return data;
  },
  
  // 로그아웃
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // localStorage에서 토큰 제거 (기존 방식과 호환성 유지)
    localStorage.removeItem("token");
  },
  
  // 현재 사용자 정보 가져오기
  getCurrentUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data?.user;
  },
  
  // 세션 정보 가져오기
  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data?.session;
  }
};
