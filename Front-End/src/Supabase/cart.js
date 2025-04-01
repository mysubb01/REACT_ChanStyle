import { supabase } from './index';

export const supabaseCart = {
  // 장바구니 조회
  getCart: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('carts')
        .select(`
          id,
          product_id,
          size_id,
          color_id,
          stock_id,
          count,
          products (
            id,
            name,
            price,
            files (
              id,
              url
            )
          ),
          sizes (
            id,
            size
          ),
          colors (
            id,
            color
          ),
          stocks (
            id,
            stock
          )
        `)
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // GraphQL 응답 형식과 호환되는 형태로 변환
      return {
        seeCart: data.map(item => ({
          id: item.id,
          product: [{
            id: item.products.id,
            name: item.products.name,
            price: item.products.price,
            files: item.products.files
          }],
          sizeId: [{
            id: item.sizes.id,
            size: item.sizes.size
          }],
          colorId: [{
            id: item.colors.id,
            color: item.colors.color
          }],
          stockId: [{
            id: item.stocks.id,
            stock: item.stocks.stock
          }],
          count: [{
            id: item.id,
            count: item.count
          }]
        }))
      };
    } catch (error) {
      console.error('장바구니 조회 오류:', error);
      return { seeCart: [] };
    }
  },
  
  // 장바구니 항목 삭제
  deleteCart: async (ids) => {
    try {
      const { error } = await supabase
        .from('carts')
        .delete()
        .in('id', Array.isArray(ids) ? ids : [ids]);
      
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('장바구니 삭제 오류:', error);
      return false;
    }
  },
  
  // 결제 추가 (장바구니에서 구매 목록으로 이동)
  addPayment: async (paymentData) => {
    try {
      const { 
        product: productIds, 
        size: sizeIds, 
        color: colorIds, 
        stock: stockIds, 
        count: counts, 
        cart: cartIds 
      } = paymentData;
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      const userId = session.user.id;
      
      // 1. 구매 목록에 항목 추가
      const buyItems = [];
      
      for (let i = 0; i < productIds.length; i++) {
        buyItems.push({
          user_id: userId,
          product_id: productIds[i],
          size_id: sizeIds[i],
          color_id: colorIds[i],
          stock_id: stockIds[i],
          quantity: counts[i],
          created_at: new Date()
        });
      }
      
      const { error: buyError } = await supabase
        .from('buy_lists')
        .insert(buyItems);
      
      if (buyError) throw buyError;
      
      // 2. 장바구니에서 항목 삭제
      const { error: cartError } = await supabase
        .from('carts')
        .delete()
        .in('id', cartIds);
      
      if (cartError) throw cartError;
      
      return true;
    } catch (error) {
      console.error('결제 추가 오류:', error);
      return false;
    }
  }
};

// 구매 목록 관련 함수
export const supabaseBuyList = {
  // 구매 목록 조회 (페이지네이션)
  getBuyList: async (first = 1, skip = 0) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('buy_lists')
        .select(`
          id,
          quantity,
          products (
            id,
            name,
            price
          ),
          sizes (
            id,
            size
          ),
          colors (
            id,
            color
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(skip, skip + first - 1);
      
      if (error) throw error;
      
      // GraphQL 응답 형식과 호환되는 형태로 변환
      return {
        seeBuyList2: data.map(item => ({
          id: item.id,
          product: {
            id: item.products.id,
            name: item.products.name,
            price: item.products.price
          },
          size: {
            id: item.sizes.id,
            size: item.sizes.size
          },
          color: {
            id: item.colors.id,
            color: item.colors.color
          },
          quantity: {
            id: item.id,
            quantity: item.quantity
          }
        }))
      };
    } catch (error) {
      console.error('구매 목록 조회 오류:', error);
      return { seeBuyList2: [] };
    }
  },
  
  // 전체 구매 목록 갯수 조회 (페이지네이션용)
  getTotalBuyList: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('buy_lists')
        .select('id')
        .eq('user_id', userId);
      
      if (error) throw error;
      
      // GraphQL 응답 형식과 호환되는 형태로 변환
      return {
        seeBuyList: data.map(item => ({
          id: item.id
        }))
      };
    } catch (error) {
      console.error('전체 구매 목록 조회 오류:', error);
      return { seeBuyList: [] };
    }
  }
};
