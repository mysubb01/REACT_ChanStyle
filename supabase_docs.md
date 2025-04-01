# Firebase에서 Supabase로 마이그레이션 가이드

## 프로젝트 개요
이 문서는 ChanStyle 프로젝트를 Firebase에서 Supabase로 마이그레이션하는 과정을 설명합니다.

## 이미 완료된 작업

### 1. 초기 설정
- [x] Supabase 패키지 설치
  ```bash
  npm install @supabase/supabase-js
  ```
- [x] Supabase 클라이언트 설정 파일 생성 (`src/Supabase/index.js`)
  ```javascript
  import { createClient } from "@supabase/supabase-js";

  // Supabase 설정
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
  const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

  // Supabase 클라이언트 초기화
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  export { supabase };
  ```
- [x] 환경 변수 파일 생성 (`.env`)
  ```
  # Supabase 환경 변수 (실제 값으로 교체 필요)
  REACT_APP_SUPABASE_URL=your-supabase-url
  REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```

### 2. 인증 시스템 마이그레이션
- [x] Supabase 인증 유틸리티 생성 (`src/Supabase/auth.js`)
  ```javascript
  import { supabase } from './index';

  export const supabaseAuth = {
    // 회원가입
    signUp: async (email, password, userData) => {
      const { data, error } = await supabase.auth.signUp({
        email, password, options: { data: userData }
      });
      
      if (error) throw error;
      return data;
    },
    
    // 로그인
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password
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
  ```

- [x] 로그인 기능 마이그레이션 (`src/Routes/Auth/AuthContainer.js`)
  ```javascript
  // Supabase 인증 사용
  const { session } = await supabaseAuth.signIn(email.value, password.value);
  
  if (session?.access_token) {
    // token 값을 얻어와서 Apollo Client의 LocalState에 저장
    localLogInMutation({ variables: { token: session.access_token } });
    window.location ="/";
  }
  ```

- [x] 회원가입 기능 마이그레이션 (`src/Routes/Auth/AuthContainer.js`)
  ```javascript
  // 사용자 추가 정보
  const userData = {
    name: name.value,
    zipCode: zipCode.value,
    address: address.value,
    addressDetail: addressDetail.value,
    phone: phone1.value + "-" + phone2.value + "-" + phone3.value
  };
  
  // Supabase로 회원가입
  await supabaseAuth.signUp(email.value, password.value, userData);
  ```

### 3. 스토리지 마이그레이션
- [x] Firebase Storage에서 Supabase Storage로 이미지 업로드 기능 마이그레이션 (`src/Routes/Admin/AdminContainer.js`)
  ```javascript
  // 파일 업로드
  const { data, error } = await supabase.storage
    .from('images')
    .upload(`public/${file.name}`, file);
  
  if (error) {
    console.error('업로드 오류:', error);
    return;
  }
  
  // 업로드된 파일의 공개 URL 가져오기
  const { data: urlData } = supabase
    .storage
    .from('images')
    .getPublicUrl(`public/${file.name}`);
  
  let urlArray = [];
  urlArray.push(urlData.publicUrl);
  setFileUrl(urlArray);
  ```

### 4. Apollo Client 업데이트
- [x] Apollo Client 설정 업데이트 (`src/Apollo/Client.js`)
  ```javascript
  import ApolloClient from "apollo-boost"; 
  import { defaults, resolvers } from "./LocalState"; 
  import { supabase } from "../Supabase";

  // Supabase 세션에서 토큰을 가져오는 비동기 함수
  const getSupabaseToken = async () => {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token || localStorage.getItem("token") || '';
  };

  export default new ApolloClient({
      uri: process.env.REACT_APP_GRAPHQL_ENDPOINT || "http://localhost:4000/", 
      clientState: {
          defaults, 
          resolvers
      },
      request: async (operation) => {
          const token = await getSupabaseToken();
          operation.setContext({
              headers: {
                  Authorization: `Bearer ${token}`
              }
          });
      }
  });
  ```

### 5. 상품 관리 기능 마이그레이션
- [x] 상품 관리 유틸리티 생성 (`src/Supabase/products.js`)
  ```javascript
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
    }
  };
  ```

- [x] 상품 삭제 기능 마이그레이션 (`src/Routes/Admin/AdminContainer.js`)
  ```javascript
  const deleteClick = async (id) => {
      let result = window.confirm("해당 상품을 삭제하시겠습니까?");

      if (result) {
          try {
              // Supabase API를 사용하여 상품 삭제
              const isDeleted = await supabaseProducts.deleteProduct(id);
              
              if (isDeleted) {
                  // 삭제 성공 시 목록 새로고침
                  seeProductFunction();
                  toast.success("상품이 성공적으로 삭제되었습니다.");
              } else {
                  toast.error("상품 삭제 중 오류가 발생했습니다.");
              }
          } catch (error) {
              console.error("상품 삭제 오류:", error);
              toast.error("상품 삭제 중 오류가 발생했습니다.");
          }
      }
  }
  ```

- [x] 상품 조회 기능 마이그레이션 (`src/Routes/Admin/AdminContainer.js`)
  ```javascript
  const seeProductFunction = async () => {
      try {
          // Supabase API를 사용하여 상품 목록 조회
          const products = await supabaseProducts.getProducts({ sort: 'created_at' });
          
          if (products) {
              // 기존 GraphQL 응답 형식과 호환되도록 데이터 형식 변환
              const formattedData = {
                  seeProductAll: products.map(product => ({
                      ...product,
                      mainCategory: product.main_category,
                      subCategory: product.sub_category
                  }))
              };
              
              setEditData({ seeProductAll: formattedData.seeProductAll });
          } else {
              toast.error("상품 목록을 불러오는데 실패했습니다.");
          }
      } catch (error) {
          console.error("상품 목록 조회 오류:", error);
          toast.error("상품 목록을 불러오는데 실패했습니다.");
      }
  }
  ```

### 6. 상품 등록/수정 기능 마이그레이션

- [x] 상품 등록 기능 마이그레이션 (`src/Routes/Admin/AdminContainer.js`)
  ```javascript
  const uploadFunction = async () => {
      try {
          // Supabase API를 사용하여 상품 등록
          const productData = {
              name,
              price: parseInt(price),
              mainCategory,
              subCategory,
              fileUrls: fileUrl,
              colors: color,
              sizes: size,
              stocks: stock.map(s => parseInt(s))
          };
          
          const { success, productId, error } = await supabaseProducts.createProduct(productData);
          
          if (success) {
              // state 초기화 및 UI 업데이트
              toast.success("상품이 성공적으로 등록되었습니다");
          } else {
              toast.error("상품 등록에 실패했습니다");
          }
      } catch (error) {
          console.error("상품 등록 오류:", error);
      }
  }
  ```

- [x] 상품 수정 기능 마이그레이션 (`src/Routes/Admin/AdminContainer.js`)
  ```javascript
  const editFunction = async() => {
      try {
          // Supabase API를 사용하여 상품 수정
          const productData = {
              id: editData2.seeProductAll[0].id,
              name,
              price: parseInt(price),
              mainCategory, 
              subCategory,
              fileId: editData2.seeProductAll[0].files[0].id, 
              fileUrls: fileUrl, 
              sizeIds: sizeId, 
              sizeValues: size, 
              colorIds: colorId, 
              colorValues: color, 
              stockIds: stockId, 
              stockValues: stock.map(s => parseInt(s))
          };
          
          const { success, error } = await supabaseProducts.updateProduct(productData);
          
          if (success) {
              // state 초기화 및 UI 업데이트
              toast.success("상품이 성공적으로 수정되었습니다");
              seeProductFunction();
          } else {
              toast.error("상품 수정에 실패했습니다");
          }
      } catch (error) {
          console.error("상품 수정 오류:", error);
      }
  }
  ```

### 7. 메인 페이지 API 마이그레이션
- [x] 베스트 상품 및 신상품 조회 기능 마이그레이션
  ```javascript
  // src/Supabase/products.js에 메인 페이지 상품 조회 기능 추가
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
        query = query.order('price', { ascending: false }).limit(8);
      } else if (sortType === 'new') {
        // NEW 상품은 등록일이 최신인 순으로 정렬
        query = query.order('created_at', { ascending: false }).limit(8);
      }
      
      // 데이터 포맷 변환 및 반환
      return { seeproduct: formattedData };
    } catch (error) {
      return { seeproduct: [] };
    }
  }
  ```

- [x] MainContainer.js 수정
  ```javascript
  // Apollo GraphQL 대신 Supabase API 사용
  import { supabaseProducts } from '../../Supabase/products';
  
  // useState 및 useEffect를 사용한 데이터 로드 구현
  const [bestData, setBestData] = useState(null);
  const [newData, setNewData] = useState(null);
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadBestItems();
    loadNewItems();
  }, []);
  ```

### 8. 스토어 페이지 API 마이그레이션
- [x] 카테고리별 상품 조회 기능 마이그레이션
  ```javascript
  // src/Supabase/products.js에 스토어 페이지 상품 조회 기능 추가
  getStoreBestProducts: async (sortType, mainCategory, subCategory) => {
    try {
      let query = supabase
        .from('products')
        .select(`id, name, price, files (id, url)`);
      
      // 카테고리 필터링 적용
      if (mainCategory) {
        query = query.eq('main_category', mainCategory);
      }
      
      if (subCategory) {
        query = query.eq('sub_category', subCategory);
      }
      
      // 데이터 포맷 변환 및 반환
      return { seeProductBest: formattedData };
    } catch (error) {
      return { seeProductBest: [] };
    }
  }
  ```

- [x] 페이지네이션 기능 마이그레이션
  ```javascript
  // 스토어 페이지용 전체 상품 조회 (페이지네이션)
  getStoreProducts: async (sortType, mainCategory, subCategory, first = 8, skip = 0) => {
    try {
      let query = supabase.from('products').select(/* ... */);
      
      // 카테고리 필터링 적용
      // 정렬 적용
      // 페이지네이션 적용
      query = query.range(skip, skip + first - 1);
      
      // 데이터 포맷 변환 및 반환
      return { seeProductAll: formattedData };
    } catch (error) {
      return { seeProductAll: [] };
    }
  }
  ```

- [x] StoreContainer.js 수정
  ```javascript
  // GraphQL 쿼리 제거 및 Supabase API 사용하도록 변경
  import { supabaseProducts } from "../../Supabase/products";
  
  // 데이터 로드 함수 구현
  const seeAllItemFunction = async() => {
    try {
      const data = await supabaseProducts.getStoreProducts(
        sort, mainCategory, subCategory, first, skip
      );
      
      if (data) {
        setDataTemp(data);
        setAll([...all, ...data.seeProductAll]);
        setPloading(false);
      }
    } catch (error) {
      console.error('상품 로드 오류:', error);
      setPloading(false);
    }
  }
  ```

### 9. MyPage 기능 마이그레이션
- [x] 장바구니 API 마이그레이션
  ```javascript
  // src/Supabase/cart.js에 장바구니 관리 기능 추가
  export const supabaseCart = {
    // 장바구니 조회
    getCart: async () => {
      // Supabase에서 현재 사용자의 장바구니 항목을 조회
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다');
      
      const userId = session.user.id;
      
      const { data, error } = await supabase
        .from('carts')
        .select(`
          id, product_id, size_id, color_id, stock_id, count,
          products(...), sizes(...), colors(...), stocks(...)
        `)
        .eq('user_id', userId);
        
      // GraphQL 응답 형식과 호환되도록 변환
      return { seeCart: [...] };
    },
    
    // 장바구니 항목 삭제
    deleteCart: async (ids) => { ... },
    
    // 결제 추가 (장바구니에서 구매 목록으로 이동)
    addPayment: async (paymentData) => { ... }
  };
  ```

- [x] 구매목록 API 마이그레이션
  ```javascript
  // src/Supabase/cart.js에 구매 목록 관리 기능 추가
  export const supabaseBuyList = {
    // 구매 목록 조회 (페이지네이션)
    getBuyList: async (first = 1, skip = 0) => {
      // Supabase에서 현재 사용자의 구매 목록을 조회
      const { data, error } = await supabase
        .from('buy_lists')
        .select(`
          id, quantity, products(...), sizes(...), colors(...)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(skip, skip + first - 1);
        
      // GraphQL 응답 형식과 호환되도록 변환
      return { seeBuyList2: [...] };
    },
    
    // 전체 구매 목록 갯수 조회 (페이지네이션용)
    getTotalBuyList: async () => { ... }
  };
  ```

- [x] 개인정보 수정 API 마이그레이션
  ```javascript
  // src/Supabase/profile.js에 사용자 프로필 관리 기능 추가
  export const supabaseProfile = {
    // 사용자 프로필 조회
    getMyProfile: async () => {
      // Supabase에서 현재 사용자의 프로필 정보 조회
      const { data: userData, error: userError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      // GraphQL 응답 형식과 호환되도록 변환
      return { me: { id, name, email, ... } };
    },
    
    // 사용자 프로필 수정
    updateProfile: async (profileData) => {
      // 비밀번호 변경 요청이 있는 경우
      if (password && confirmPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password
        });
      }
      
      // 프로필 정보 업데이트
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          name, zip_code, address, address_detail, phone
        })
        .eq('id', session.user.id);
        
      return true;
    },
    
    // 로그아웃
    signOut: async () => { ... }
  };
  ```

- [x] MyPageContainer.js 수정
  ```javascript
  // Apollo GraphQL 대신 Supabase API 사용
  import { supabaseCart, supabaseBuyList } from "../../Supabase/cart";
  import { supabaseProfile } from "../../Supabase/profile";
  
  // useState 및 useEffect를 사용한 데이터 로드 구현
  const [cartData, setCartData] = useState({ seeCart: [] });
  const [cartLoading, setCartLoading] = useState(true);
  
  // 장바구니 데이터 가져오기
  const fetchCartData = async () => {
    setCartLoading(true);
    try {
      const data = await supabaseCart.getCart();
      setCartData(data);
      // ...
    } catch (error) {
      // 오류 처리
    } finally {
      setCartLoading(false);
    }
  };
  
  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    fetchCartData();
  }, []);
  ```

## 남은 작업

### 1. Supabase 프로젝트 설정
- [ ] **Supabase 프로젝트 생성**
  - Supabase 웹사이트(https://supabase.com)에서 계정 생성 및 로그인
  - 새로운 프로젝트 생성
  - 프로젝트 URL과 anon key 복사하여 `.env` 파일에 설정

- [ ] **스토리지 버킷 설정**
  - Supabase 대시보드에서 Storage 메뉴 접속
  - `images` 버킷 생성
  - 적절한 권한 설정 (파일 공개 접근 허용)

- [ ] **데이터베이스 테이블 생성**
  - Supabase 대시보드에서 SQL 에디터 사용
  - 기존 백엔드 스키마와 동일한 테이블 구조 생성
  ```sql
  -- 사용자 테이블 (기본 auth.users 테이블 확장)
  CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
    name TEXT,
    zip_code TEXT,
    address TEXT,
    address_detail TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 상품 테이블
  CREATE TABLE public.products (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    main_category TEXT NOT NULL,
    sub_category TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 파일(이미지) 테이블
  CREATE TABLE public.files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 색상 테이블
  CREATE TABLE public.colors (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    color TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 사이즈 테이블
  CREATE TABLE public.sizes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    size TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 재고 테이블
  CREATE TABLE public.stocks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    color_id UUID REFERENCES public.colors ON DELETE CASCADE,
    size_id UUID REFERENCES public.sizes ON DELETE CASCADE,
    stock INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 장바구니 테이블
  CREATE TABLE public.cart_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    color_id UUID REFERENCES public.colors ON DELETE CASCADE,
    size_id UUID REFERENCES public.sizes ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 주문 테이블
  CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users ON DELETE CASCADE,
    total_price INTEGER NOT NULL,
    order_status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );

  -- 주문 상세 테이블
  CREATE TABLE public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders ON DELETE CASCADE,
    product_id UUID REFERENCES public.products ON DELETE CASCADE,
    color_id UUID REFERENCES public.colors ON DELETE CASCADE,
    size_id UUID REFERENCES public.sizes ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    price INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
  );
  ```

### 2. RLS(Row Level Security) 설정
- [ ] 각 테이블에 대한 RLS 정책 구성
  ```sql
  -- RLS 활성화
  ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.sizes ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

  -- 관리자 역할 생성
  CREATE ROLE admin;

  -- 사용자 프로필 정책
  CREATE POLICY "사용자는 자신의 프로필만 볼 수 있음"
    ON public.user_profiles
    FOR SELECT
    USING (auth.uid() = id);

  CREATE POLICY "사용자는 자신의 프로필만 수정할 수 있음"
    ON public.user_profiles
    FOR UPDATE
    USING (auth.uid() = id);

  -- 상품 정책
  CREATE POLICY "모든 사용자가 상품을 볼 수 있음"
    ON public.products
    FOR SELECT
    TO public
    USING (true);

  CREATE POLICY "관리자만 상품을 생성/수정/삭제할 수 있음"
    ON public.products
    FOR ALL
    TO admin
    USING (true);

  -- 장바구니 정책
  CREATE POLICY "사용자는 자신의 장바구니만 볼 수 있음"
    ON public.cart_items
    FOR SELECT
    USING (auth.uid() = user_id);

  CREATE POLICY "사용자는 자신의 장바구니만 수정할 수 있음"
    ON public.cart_items
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

  CREATE POLICY "사용자는 자신의 장바구니 항목만 삭제할 수 있음"
    ON public.cart_items
    FOR DELETE
    USING (auth.uid() = user_id);
  ```

### 3. 추가 API 마이그레이션

- [ ] **결제 시스템 통합**
  - import 모듈 연동 부분 수정
  - 결제 정보 저장 로직 Supabase에 맞게 조정

### 4. Vercel 배포 설정
- [ ] **Vercel 계정 및 프로젝트 설정**
  - Vercel 계정 생성 및 로그인(https://vercel.com)
  - GitHub 저장소와 연결하거나 로컬 프로젝트를 직접 배포

- [ ] **배포 환경 변수 설정**
  - Supabase URL 및 Anon Key를 Vercel 프로젝트의 환경 변수에 추가
  ```
  REACT_APP_SUPABASE_URL=your-supabase-url
  REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
  ```
  - 기타 필요한 환경 변수 설정
  
- [ ] **빌드 설정 확인**
  - 프로젝트 루트에 `vercel.json` 파일 생성 (필요한 경우)
  ```json
  {
    "buildCommand": "npm run build",
    "outputDirectory": "build",
    "framework": "create-react-app",
    "rewrites": [
      { "source": "/(.*)", "destination": "/index.html" }
    ]
  }
  ```

- [ ] **배포 테스트 및 도메인 설정**
  - 초기 배포 후 기능 테스트 수행
  - 필요한 경우 사용자 정의 도메인 연결

## 배포 단계별 가이드

### 1. Supabase 프로젝트 설정하기

1. Supabase 웹사이트(https://supabase.com)에 접속하여 계정 생성 및 로그인
2. 새 프로젝트 생성
   - 프로젝트 이름: `ChanStyle` (또는 원하는 이름)
   - 데이터베이스 비밀번호 설정
   - 리전 선택 (한국에 가까운 도쿄나 싱가포르 권장)
3. SQL 에디터에서 문서의 데이터베이스 스키마 SQL 실행
4. 스토리지 버킷 생성
   - `images` 버킷 생성 및 공개 액세스 설정
5. 프로젝트 API URL과 anon key 복사
   - 프로젝트 설정 > API > URL, anon key

### 2. 로컬 프로젝트 설정

1. `.env` 파일에 Supabase 정보 업데이트
   ```
   REACT_APP_SUPABASE_URL=복사한_URL
   REACT_APP_SUPABASE_ANON_KEY=복사한_ANON_KEY
   ```
2. 로컬에서 테스트 실행
   ```bash
   npm install
   npm start
   ```
3. 모든 기능이 정상 작동하는지 확인

### 3. Vercel에 배포하기

1. Vercel 계정 생성 및 로그인
2. 새 프로젝트 가져오기
   - GitHub 저장소에서 가져오기 또는 로컬 프로젝트에서 배포
3. 프로젝트 구성
   - Framework Preset: Create React App
   - Build Command: `npm run build`
   - Output Directory: `build`
4. 환경 변수 추가
   - REACT_APP_SUPABASE_URL
   - REACT_APP_SUPABASE_ANON_KEY
   - 기타 필요한 환경 변수
5. 배포 버튼 클릭
6. 배포 완료 후 생성된 URL에서 서비스 테스트

### 4. 도메인 설정 (선택사항)

1. Vercel 대시보드 > 프로젝트 > 설정 > 도메인
2. 사용자 정의 도메인 추가
3. DNS 레코드 설정 또는 네임서버 변경 (안내에 따라 진행)

## 작업 완료 체크리스트

- [ ] Supabase 프로젝트 생성 및 설정 완료
- [ ] 데이터베이스 스키마 구성 완료
- [ ] 스토리지 및 RLS 정책 설정 완료
- [ ] 로컬 환경에서 모든 기능 테스트 완료
- [ ] Vercel 배포 완료
- [ ] 프로덕션 환경에서 모든 기능 테스트 완료

## 참고 자료

- [Supabase 공식 문서](https://supabase.com/docs)
- [Supabase JavaScript 클라이언트 API](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth 문서](https://supabase.com/docs/guides/auth)
- [Supabase Storage 문서](https://supabase.com/docs/guides/storage)
