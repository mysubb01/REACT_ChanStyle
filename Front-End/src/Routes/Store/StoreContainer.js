import React, { useEffect, useState } from "react"; 
import StorePresenter from "./StorePresenter";
import { supabaseProducts } from "../../Supabase/products";

export default () => {
    let istopToggle = false; 
    let isBottomToggle = false; 
    let isMenuListToggle = false;

    const [title, setTitle] = useState("ALL"); 
    const [best, setBest] = useState([]);
    const [all, setAll] = useState([]);

    const settings = {
        dots: false, 
        infinite: false, 
        swipe: false,
        arrows: false,
        autoplay: false,
        slidesToShow: 1,
        rows: 4,
        responsive: [
            {
                breakpoint: 1024, 
                settings: {
                    dots: true, 
                    slidesToShow: 3, 
                    slidesToScroll: 1, 
                    arrows: true,
                    rows: 1
                }
            },
            {
                breakpoint: 768, 
                settings: {
                    dots: true, 
                    slidesToShow: 2, 
                    slidesToScroll: 2, 
                    arrows: true, 
                    rows: 1
                }
            },
            {
                breakpoint: 600, 
                settings: {
                    dots: true, 
                    arrows: false, 
                    swipe: true,
                    slidesToShow: 2, 
                    slidesToScroll: 2, 
                    rows: 1
                }
            }
        ]
    };

    const topToggle = () => {
        const target = document.getElementById("toggle-menu"); 
        if(!istopToggle) {
            target.style.height = "350px";
            istopToggle = true; 
        } else {
            target.style.height = "0px";
            istopToggle = false;
        }
    }

    const bottomToggle = () => {
        const target = document.getElementById("toggle-menu2"); 
        if(!isBottomToggle) {
            target.style.height = "350px";
            isBottomToggle = true; 
        } else {
            target.style.height = "0px";
            isBottomToggle = false;
        }
    }

    const menuListToggle = () => {
        const menuList = document.querySelector(".store__menu-list"); 
        const inner = document.querySelector(".store__menu-inner");
        if(!isMenuListToggle) {
            inner.style.display = "flex";
            menuList.style.height = "unset";
            isMenuListToggle = true;
        } else {
            inner.style.display = "none";
            menuList.style.height = "0px";
            isMenuListToggle = false;
        }
    }

    // with가 600 이상이 되었을 때 menuList가 보이게끔 하기 위함 
    // 600 이하에서 menuList를 접은상태에서 resize를 하게되면 menuList가 접혀있는상태가 되어 있으므로
    const onResize = () => {
        const inner = document.querySelector(".store__menu-inner");
        if(window.innerWidth > 600) {
            inner.style.display = "flex";
        }
    }

    useEffect(() => {
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    },[])

    const menuClick = (name) => {
        setTitle(name);
    }

    const first = 8;
    const [skip, setSkip] = useState(0); 
    const [pLoading, setPloading] = useState(false);
    const [dataTemp, setDataTemp] = useState([]);

    // 페이징
    const clickMore = () => {
        setPloading(true);
        setSkip(skip+first); 
    }

    useEffect(() => {
        if(skip !== 0) {
            seeAllItemFunction();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[skip])

    const [sort, setSort] = useState("");
    const [mainCategory, setMaincategory] = useState();
    const [subCategory, setSubCategory] = useState();

    // Supabase API로 상품 로드 함수 구현
    const seeAllItemFunction = async() => {
        try {
            const data = await supabaseProducts.getStoreProducts(
                sort, 
                mainCategory, 
                subCategory, 
                first, 
                skip
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

    const seeAllBestItemFunction = async() => {
        try {
            const data = await supabaseProducts.getStoreBestProducts(
                sort,
                mainCategory,
                subCategory
            );
            
            if(data) {
                setBest(data);
                seeAllItemFunction();
            }
        } catch (error) {
            console.error('베스트 상품 로드 오류:', error);
        }
    }

    useEffect(() => {
        setBest([]); 
        setAll([]);
        if(title === "ALL") {
            setSort("all");   
            setMaincategory("");
            setSubCategory("");
        } else if (title === "SHIRTS") {
            setSort("all");   
            setMaincategory("shirts");
            setSubCategory("");
        } else if (title === "PANTS") {
            setSort("all");   
            setMaincategory("pants");
            setSubCategory("");
        } else if (title === "SHOES") {
            setSort("all");   
            setMaincategory("shoes");
            setSubCategory("");
        } else if (title === "BASIC") {
            setSort("all");   
            setMaincategory("");
            setSubCategory("basic");
        } else if (title === "NEW") {
            setSort("all");   
            setMaincategory("");
            setSubCategory("new");
        } else if (title === "HIGH PRICE") {
            setSort("highPrice");   
            setMaincategory("");
            setSubCategory("");
        } else if (title === "LOW PRICE") {
            setSort("lowPrice");   
            setMaincategory("");
            setSubCategory("");
        }

        setSkip(0);
    },[title])

    useEffect(() => {
        if(sort !== "") {
            seeAllBestItemFunction();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    },[sort])


    return (
        <StorePresenter 
            title={title}
            bottomToggle={bottomToggle}
            topToggle={topToggle}
            settings={settings}
            best={best}
            all={all}
            clickMore={clickMore}
            pLoading={pLoading}
            dataTemp={dataTemp}
            menuListToggle={menuListToggle}
            menuClick={menuClick}
            mainCategory={mainCategory}
        />
    )
}