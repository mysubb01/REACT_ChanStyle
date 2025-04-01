import { supabase } from './index';

export const supabaseProfile = {
  // 사용자 프로필 조회
  getMyProfile: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      // 사용자 메타데이터 가져오기
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (userError) throw userError;
      
      // GraphQL 응답 형식과 호환되는 형태로 변환
      return {
        me: {
          id: userData.id,
          name: userData.name,
          email: session.user.email,
          zipCode: userData.zip_code || '',
          address: userData.address || '',
          addressDetail: userData.address_detail || '',
          phone: userData.phone || ''
        }
      };
    } catch (error) {
      console.error('프로필 조회 오류:', error);
      return { me: null };
    }
  },
  
  // 사용자 프로필 수정
  updateProfile: async (profileData) => {
    try {
      const { 
        name, 
        zipCode, 
        address, 
        addressDetail, 
        phone,
        password,
        confirmPassword
      } = profileData;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      // 비밀번호 변경 요청이 있는 경우
      if (password && confirmPassword) {
        if (password !== confirmPassword) {
          throw new Error('비밀번호가 일치하지 않습니다.');
        }
        
        // Supabase 인증을 통해 비밀번호 업데이트
        const { error: passwordError } = await supabase.auth.updateUser({
          password
        });
        
        if (passwordError) throw passwordError;
      }
      
      // 프로필 정보 업데이트
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          name,
          zip_code: zipCode,
          address,
          address_detail: addressDetail,
          phone
        })
        .eq('id', session.user.id);
      
      if (profileError) throw profileError;
      
      return true;
    } catch (error) {
      console.error('프로필 수정 오류:', error);
      throw error;
    }
  },
  
  // 로그아웃
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('로그아웃 오류:', error);
      return false;
    }
  }
};
