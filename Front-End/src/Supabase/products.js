import { supabase } from './index';

export const supabaseProducts = {
  // 상품 목록 조회 (ID로 특정 상품 조회 또는 전체 상품 조회)
  getProducts: async (options = {}) => {
    const { id, sort = 'created_at', first = 10, skip = 0 } = options;
    
    let query = supabase
      .from('products')
      .select(`
        id, 
        name, 
        price, 
        main_category, 
        sub_category, 
        files (id, url), 
        colors (id, color), 
        sizes (id, size), 
        stocks (id, stock),
        created_at
      `);
      
    // ID가 제공된 경우 특정 상품만 조회
    if (id) {
      query = query.eq('id', id);
    }
    
    // 정렬 적용
    query = query.order(sort.replace('createdAt', 'created_at'), { ascending: false });
    
    // 페이지네이션 적용
    query = query.range(skip, skip + first - 1);
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
  },
  
  // 메인 페이지용 상품 조회 (BEST, NEW 등)
  getMainProducts: async (sortType) => {
    try {
      let query = supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          files (id, url)
        `);

      // 정렬 기준에 따라 쿼리 조건 변경
      if (sortType === 'best') {
        // BEST 상품은 판매량이 높은 순으로 정렬
        // stocks 테이블을 활용하여 판매량이 높은 상품 조회
        // 현재 샘플 데이터에서는 임의로 상품을 선택
        query = query.order('price', { ascending: false }).limit(8);
      } else if (sortType === 'new') {
        // NEW 상품은 등록일이 최신인 순으로 정렬
        query = query.order('created_at', { ascending: false }).limit(8);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // 기존 GraphQL 응답 형식과 호환되도록 변환
      return { 
        seeproduct: data.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          files: product.files
        }))
      };
    } catch (error) {
      console.error('메인 페이지 상품 조회 오류:', error);
      return { seeproduct: [] };
    }
  },
  
  // 스토어 페이지용 베스트 상품 조회
  getStoreBestProducts: async (sortType, mainCategory, subCategory) => {
    try {
      let query = supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          files (id, url)
        `);
      
      // 카테고리 필터링 적용
      if (mainCategory) {
        query = query.eq('main_category', mainCategory);
      }
      
      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }
      
      // BEST 상품은 판매량이나 가격이 높은 순으로 정렬 (샘플 데이터에서는 가격순)
      query = query.order('price', { ascending: false }).limit(4);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // GraphQL 응답 형식과 호환되도록 변환
      return { 
        seeProductBest: data.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          files: product.files
        }))
      };
    } catch (error) {
      console.error('스토어 베스트 상품 조회 오류:', error);
      return { seeProductBest: [] };
    }
  },
  
  // 스토어 페이지용 전체 상품 조회 (카테고리별, 페이지네이션)
  getStoreProducts: async (sortType, mainCategory, subCategory, first = 8, skip = 0) => {
    try {
      let query = supabase
        .from('products')
        .select(`
          id, 
          name, 
          price, 
          files (id, url)
        `);
      
      // 카테고리 필터링 적용
      if (mainCategory) {
        query = query.eq('main_category', mainCategory);
      }
      
      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }
      
      // 정렬 적용
      if (sortType === 'all') {
        query = query.order('created_at', { ascending: false });
      } else if (sortType === 'highPrice') {
        query = query.order('price', { ascending: false });
      } else if (sortType === 'lowPrice') {
        query = query.order('price', { ascending: true });
      }
      
      // 페이지네이션 적용
      query = query.range(skip, skip + first - 1);
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      // GraphQL 응답 형식과 호환되도록 변환
      return { 
        seeProductAll: data.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          files: product.files
        }))
      };
    } catch (error) {
      console.error('스토어 상품 조회 오류:', error);
      return { seeProductAll: [] };
    }
  },
  
  // 상품 삭제
  deleteProduct: async (id) => {
    try {
      // 연관된 이미지 파일 참조 가져오기
      const { data: product } = await supabase
        .from('products')
        .select('files(id, url)')
        .eq('id', id)
        .single();
      
      if (product?.files) {
        // 스토리지에서 파일 삭제
        for (const file of product.files) {
          const fileName = file.url.split('/').pop();
          await supabase.storage
            .from('images')
            .remove([`public/${fileName}`]);
        }
      }
      
      // 관련된 테이블에서 데이터 삭제 (CASCADE 옵션이 없는 경우 직접 삭제 필요)
      // 순서: stocks -> sizes -> colors -> files -> product
      await supabase.from('stocks').delete().eq('product_id', id);
      await supabase.from('sizes').delete().eq('product_id', id);
      await supabase.from('colors').delete().eq('product_id', id);
      await supabase.from('files').delete().eq('product_id', id);
      
      // 최종적으로 상품 삭제
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('상품 삭제 오류:', error);
      return false;
    }
  },
  
  // 상품 등록
  createProduct: async (productData) => {
    try {
      const { 
        name, price, mainCategory, subCategory, 
        fileUrls, sizes, colors, stocks
      } = productData;
      
      // 1. 상품 기본 정보 등록
      const { data: product, error: productError } = await supabase
        .from('products')
        .insert({
          name,
          price,
          main_category: mainCategory,
          sub_category: subCategory
        })
        .select()
        .single();
      
      if (productError) throw productError;
      
      // 2. 파일 등록
      if (fileUrls && fileUrls.length > 0) {
        const filesData = fileUrls.map(url => ({
          product_id: product.id,
          url
        }));
        
        const { error: filesError } = await supabase
          .from('files')
          .insert(filesData);
        
        if (filesError) throw filesError;
      }
      
      // 3. 색상 등록
      if (colors && colors.length > 0) {
        const colorsData = colors.map(color => ({
          product_id: product.id,
          color
        }));
        
        const { data: colorEntries, error: colorsError } = await supabase
          .from('colors')
          .insert(colorsData)
          .select();
        
        if (colorsError) throw colorsError;
        
        // 4. 사이즈 등록
        if (sizes && sizes.length > 0) {
          const sizesData = sizes.map(size => ({
            product_id: product.id,
            size
          }));
          
          const { data: sizeEntries, error: sizesError } = await supabase
            .from('sizes')
            .insert(sizesData)
            .select();
          
          if (sizesError) throw sizesError;
          
          // 5. 재고 등록 (색상과 사이즈의 조합으로)
          if (stocks && stocks.length > 0 && colorEntries && sizeEntries) {
            // 색상과 사이즈 조합에 맞게 재고 데이터 구성
            const stocksData = [];
            
            for (let i = 0; i < Math.min(colorEntries.length, sizeEntries.length, stocks.length); i++) {
              stocksData.push({
                product_id: product.id,
                color_id: colorEntries[i].id,
                size_id: sizeEntries[i].id,
                stock: stocks[i]
              });
            }
            
            const { error: stocksError } = await supabase
              .from('stocks')
              .insert(stocksData);
            
            if (stocksError) throw stocksError;
          }
        }
      }
      
      return { success: true, productId: product.id };
    } catch (error) {
      console.error('상품 등록 오류:', error);
      return { success: false, error };
    }
  },
  
  // 상품 수정
  updateProduct: async (productData) => {
    try {
      const { 
        id, name, price, mainCategory, subCategory,
        fileId, fileUrls, sizeIds, sizeValues, 
        colorIds, colorValues, stockIds, stockValues
      } = productData;
      
      // 1. 상품 기본 정보 수정
      if (name || price || mainCategory || subCategory) {
        const updateData = {};
        if (name) updateData.name = name;
        if (price) updateData.price = price;
        if (mainCategory) updateData.main_category = mainCategory;
        if (subCategory) updateData.sub_category = subCategory;
        
        const { error: productError } = await supabase
          .from('products')
          .update(updateData)
          .eq('id', id);
        
        if (productError) throw productError;
      }
      
      // 2. 파일 수정
      if (fileId && fileUrls && fileUrls.length > 0) {
        const { error: fileError } = await supabase
          .from('files')
          .update({ url: fileUrls[0] })
          .eq('id', fileId);
        
        if (fileError) throw fileError;
      }
      
      // 3. 색상 수정
      if (colorIds && colorValues && colorIds.length > 0 && colorValues.length > 0) {
        for (let i = 0; i < Math.min(colorIds.length, colorValues.length); i++) {
          const { error: colorError } = await supabase
            .from('colors')
            .update({ color: colorValues[i] })
            .eq('id', colorIds[i]);
          
          if (colorError) throw colorError;
        }
      }
      
      // 4. 사이즈 수정
      if (sizeIds && sizeValues && sizeIds.length > 0 && sizeValues.length > 0) {
        for (let i = 0; i < Math.min(sizeIds.length, sizeValues.length); i++) {
          const { error: sizeError } = await supabase
            .from('sizes')
            .update({ size: sizeValues[i] })
            .eq('id', sizeIds[i]);
          
          if (sizeError) throw sizeError;
        }
      }
      
      // 5. 재고 수정
      if (stockIds && stockValues && stockIds.length > 0 && stockValues.length > 0) {
        for (let i = 0; i < Math.min(stockIds.length, stockValues.length); i++) {
          const { error: stockError } = await supabase
            .from('stocks')
            .update({ stock: stockValues[i] })
            .eq('id', stockIds[i]);
          
          if (stockError) throw stockError;
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('상품 수정 오류:', error);
      return { success: false, error };
    }
  }
};
