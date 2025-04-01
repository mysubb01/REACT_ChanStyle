import React, { useState, useEffect } from "react";
import MyPagePresenter from "./MyPagePresenter";
import useInput from "../../Hooks/useInput";
import { toast } from "react-toastify";
import { supabaseCart, supabaseBuyList } from "../../Supabase/cart";
import { supabaseProfile } from "../../Supabase/profile";

export default ({history}) => {
    // tab
    const [tab, setTab] = useState("cart");
    const clickTab = (tabString) => {
        setTab(tabString);
    }
    

    // 장바구니 
    const [cartId, setCartId] = useState("");
    const [count, setCount] = useState([]);
    const [totalarr, setTotalarr] = useState([]);
    const [total, setTotal] = useState(0);
    const [cartLoading, setCartLoading] = useState(true);
    const [cartData, setCartData] = useState({ seeCart: [] });
    
    // 총 합계를 구하기 위한 식 (array.reduce에서 사용됨)
    const totalFunc = (a, b) => a + b;

    let productArray = [];
    let sizeIdArray = [];
    let colorIdArray = [];
    let stockIdArray = [];
    let countArray = [];
    let cartArray = []; 

    // 장바구니 데이터 가져오기
    const fetchCartData = async () => {
        setCartLoading(true);
        try {
            const data = await supabaseCart.getCart();
            setCartData(data);
            
            // 초기 count 배열 설정
            if (data && data.seeCart) {
                const initialCounts = data.seeCart.map(item => item.count[0].count);
                setCount(initialCounts);
            }
        } catch (error) {
            console.error('장바구니 로드 오류:', error);
            toast.error('장바구니를 불러오는데 실패했습니다.');
        } finally {
            setCartLoading(false);
        }
    };

    // 컴포넌트 마운트 시 장바구니 조회
    useEffect(() => {
        fetchCartData();
    }, []);

    // 장바구니 수량 증가
    const cartCountUp = (i) => {
        const countTemp = [...count];
        countTemp[i] = countTemp[i] + 1;
        setCount(countTemp);
    }

    // 장바구니 수량 감소
    const cartCountDown = (i) => {
        const countTemp = [...count];
        if (countTemp[i] > 1) {
            countTemp[i] = countTemp[i] - 1;
            setCount(countTemp);
        }
    }

    // 수량 변경에 따른 총액 계산
    useEffect(() => {
        if (cartLoading === false && cartData.seeCart.length > 0) {
            const totalarrTemp = [];
            const countTemp = [...count];

            cartData.seeCart.map((item, index) => (
                item.product.map(product => (
                    totalarrTemp.push(countTemp[index] * product.price)
                ))
            ))
            setTotalarr([...totalarrTemp]);
            if (totalarrTemp.length !== 0) {
                setTotal(totalarrTemp.reduce(totalFunc));
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, cartData])

    // 장바구니에서 상품을 삭제하기 위해 생성
    // => 클릭한 상품의 Id 값을 받아와서 cartId에 set해줌 
    const passCartId = async (id) => {
        setCartId(id);
    }

    // passcartId함수가 실행되면 cartId의 값이 setting 되고 해당 hook(useEffect)이 실행됨 
    useEffect(() => {
        const deleteCartFunc = async () => {
            try {
                const result = await supabaseCart.deleteCart(cartId);
                if (result) {
                    fetchCartData();
                    toast.success('상품이 장바구니에서 삭제되었습니다.');
                }
            } catch (error) {
                console.error('장바구니 삭제 오류:', error);
                toast.error('장바구니에서 상품을 삭제하는데 실패했습니다.');
            }
        }
        
        if (cartId !== "") {
            deleteCartFunc();
            setCartId("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cartId])

    // 전체 선택/해제
    const allCheck = (checked) => {
        if (checked) {
            if (cartLoading === false) {
                cartData.seeCart.map((item) => {
                    const chkBox = document.getElementById(item.id);
                    return chkBox.checked = true;
                })
            }
        } else {
            if (cartLoading === false) {
                cartData.seeCart.map((item) => {
                    const chkBox = document.getElementById(item.id);
                    return chkBox.checked = false;
                })
            }
        }
    }

    let isChecked = false; 

    // 장바구니에서 선택한 상품 주문하기
    const selectOrder = async () => {
        try {
            cartData.seeCart.map(async (item, index) => {
                const chkBox = document.getElementById(item.id);
                if (chkBox.checked === true) {
                    isChecked = true;
                    return (
                        productArray.push(item.product[0].id),
                        sizeIdArray.push(item.sizeId[0].id),
                        colorIdArray.push(item.colorId[0].id),
                        stockIdArray.push(item.stockId[0].id), 
                        countArray.push(count[index]), 
                        cartArray.push(item.id)
                    )
                }
                return null;
            });
            
            if(isChecked) {
                const result = await supabaseCart.addPayment({
                    product: productArray,
                    size: sizeIdArray,
                    color: colorIdArray,
                    stock: stockIdArray,
                    count: countArray,
                    cart: cartArray
                });
                
                if(result) {
                    productArray = []; 
                    sizeIdArray = [];
                    colorIdArray = [];
                    stockIdArray = [];
                    countArray = [];
                    cartArray = [];
                    toast.success('주문이 완료되었습니다.');
                    setTimeout(() => history.push('/payment'), 1000);
                }
            }
            
            if(isChecked === false) {
                toast.warning("주문할 상품을 선택하여 주세요");
            }
        } catch (error) {
            console.error('주문 처리 오류:', error);
            toast.error('주문 처리 중 오류가 발생했습니다.');
        }
    }

    // 구매 목록 
    const [buyData, setBuyData] = useState({ seeBuyList2: [] });
    const [buyListData, setBuyListData] = useState({ seeBuyList: [] });
    const [buyListLoading, setBuyListLoading] = useState(true);
    
    // 페이징을 위한 초기 first, skip 값 
    const first = 1;
    const [skip, setSkip] = useState(0);
    const [page, setPage] = useState(0);
    const [totalPage, setTotalpage] = useState(0);

    // 페이지 변경
    const changePage = (value) => {
        setPage(value - 1);
        setSkip((value - 1) * first);
    }
    
    // 구매 목록 조회
    const fetchBuyList = async () => {
        try {
            setBuyListLoading(true);
            // 전체 구매 목록 수 조회
            const totalData = await supabaseBuyList.getTotalBuyList();
            setBuyListData(totalData);
            
            if (totalData && totalData.seeBuyList) {
                setTotalpage(Math.ceil(totalData.seeBuyList.length / first));
            }
            
            // 페이지별 구매 목록 조회
            const pageData = await supabaseBuyList.getBuyList(first, skip);
            setBuyData(pageData);
        } catch (error) {
            console.error('구매 목록 조회 오류:', error);
            toast.error('구매 목록을 불러오는데 실패했습니다.');
        } finally {
            setBuyListLoading(false);
        }
    };

    // 페이지 변경 시 구매 목록 조회
    useEffect(() => {
        if (tab === 'buyList') {
            fetchBuyList();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, tab])


    // 개인정보 수정 
    const name = useInput("");
    const email = useInput("");
    const password = useInput("");
    const confirmPassword = useInput("");
    const zipCode = useInput("");
    const address = useInput("");
    const addressDetail = useInput("");
    const phone1 = useInput("");
    const phone2 = useInput("");
    const phone3 = useInput("");
    const [open, setOpen] = useState(false);
    
    // 개인정보를 변경한후 변경정보를 얻어오기 위한 delay 
    const [delay, setDelay] = useState(false);
    const [userData, setUserData] = useState({ me: null });
    const [userLoading, setUserLoading] = useState(true);

    // 사용자 프로필 정보 조회
    const fetchUserProfile = async () => {
        try {
            setUserLoading(true);
            const data = await supabaseProfile.getMyProfile();
            setUserData(data);
            
            if (data && data.me) {
                const fullPhone = data.me.phone.split("-");
                name.setValue(data.me.name);
                email.setValue(data.me.email);
                zipCode.setValue(data.me.zipCode);
                address.setValue(data.me.address);
                addressDetail.setValue(data.me.addressDetail);
                phone1.setValue(fullPhone[0]);
                phone2.setValue(fullPhone[1]);
                phone3.setValue(fullPhone[2]);
            }
        } catch (error) {
            console.error('사용자 프로필 조회 오류:', error);
        } finally {
            setUserLoading(false);
        }
    };

    // 컴포넌트 마운트 시 사용자 정보 조회
    useEffect(() => {
        fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 주소 검색 결과 처리
    const handleAddress = (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
                extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
            }
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
        }

        zipCode.setValue(data.zonecode);
        address.setValue(fullAddress);
        setOpen(false);
    }

    // 개인정보 수정 처리
    const onSubmit = async e => {
        e.preventDefault();

        if (
            name.value === "" ||
            zipCode.value === "" ||
            address.value === "" ||
            addressDetail.value === "" ||
            phone1.value === "" ||
            phone2.value === "" ||
            phone3.value === ""
        ) {
            toast.error("필수항목을 모두 입력하셔야 합니다.");
            return;
        }

        if (password.value !== "" || confirmPassword.value !== "") {
            if (password.value !== confirmPassword.value) {
                toast.error("비밀번호가 일치하지 않습니다");
                return;
            }
        }

        try {
            const result = await supabaseProfile.updateProfile({
                name: name.value,
                zipCode: zipCode.value,
                address: address.value,
                addressDetail: addressDetail.value,
                phone: phone1.value + "-" + phone2.value + "-" + phone3.value,
                password: password.value,
                confirmPassword: confirmPassword.value
            });
            
            if (result) {
                toast.success("회원정보가 수정되었습니다");
                // 비밀번호 입력값 초기화
                password.setValue("");
                confirmPassword.setValue("");
                
                setDelay(true);
                // 업데이트된 사용자 정보 다시 조회
                fetchUserProfile();
            }
        } catch (error) {
            console.error('프로필 수정 오류:', error);
            toast.error("회원정보 수정에 실패했습니다");
        }
    }

    // 로그아웃 처리
    const logOut = async () => {
        try {
            const result = await supabaseProfile.signOut();
            if (result) {
                toast.success("로그아웃 되었습니다");
                setTimeout(() => history.push('/'), 1000);
            }
        } catch (error) {
            console.error('로그아웃 오류:', error);
            toast.error("로그아웃에 실패했습니다");
        }
    };

    return (
        <MyPagePresenter 
            tab={tab}
            clickTab={clickTab}
            cartData={cartData}
            cartLoading={cartLoading}
            count={count}
            cartCountUp={cartCountUp}
            cartCountDown={cartCountDown}
            totalarr={totalarr}
            total={total}
            passCartId={passCartId}
            allCheck={allCheck}
            selectOrder={selectOrder}
            buyData={buyData}
            totalPage={totalPage}
            page={page}
            changePage={changePage}
            buyListLoading={buyListLoading}
            name={name}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            zipCode={zipCode}
            address={address}
            addressDetail={addressDetail}
            phone1={phone1}
            phone2={phone2}
            phone3={phone3}
            open={open}
            setOpen={setOpen}
            handleAddress={handleAddress}
            onSubmit={onSubmit}
            userData={userData}
            userLoading={userLoading}
            logOut={logOut}
        />
    )
}