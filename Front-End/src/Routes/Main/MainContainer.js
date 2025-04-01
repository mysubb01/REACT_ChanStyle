import React, { useEffect, useState } from "react"; 
import MainPresenter from "./MainPresenter";
import { supabaseProducts } from '../../Supabase/products';

export default () => {
    const settings = {
        dots: true,
        infinite: true,
        speed: 800,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 3500,
        responsive: [
            {
                breakpoint: 600,
                settings: {
                    arrows: false
                }
            }
        ]
    }

    const itemSettings = {
        dots: false, 
        infinite: false, 
        rows: 4, 
        slidesToShow: 1,
        autoplay: false,
        arrows: false,
        swipe: false,
        responsive: [
            {
                breakpoint: 900, 
                settings: {
                    dots: false, 
                    infinite: false, 
                    rows: 2,
                    slidesToShow: 1
                }
            },
            {
                breakpoint: 600,
                settings: {
                    dots: true,
                    slidesToShow: 3,
                    slidesToScroll: 3,
                    rows: 1,
                    arrows: false,
                    swipe: true
                }
            },
            {
                breakpoint: 400, 
                settings: {
                    dots: true,
                    slidesToShow: 2,
                    slidesToScroll: 2,
                    rows: 1,
                    arrows: false,
                    swipe: true
                }
            }
        ]
    }

    // 상태 관리
    const [bestData, setBestData] = useState(null);
    const [newData, setNewData] = useState(null);
    const [bestLoading, setBestLoading] = useState(true);
    const [newLoading, setNewLoading] = useState(true);

    // 데이터 로드 함수
    const loadBestItems = async () => {
        setBestLoading(true);
        try {
            const data = await supabaseProducts.getMainProducts('best');
            setBestData(data);
        } catch (error) {
            console.error('베스트 상품 로드 오류:', error);
        } finally {
            setBestLoading(false);
        }
    };

    const loadNewItems = async () => {
        setNewLoading(true);
        try {
            const data = await supabaseProducts.getMainProducts('new');
            setNewData(data);
        } catch (error) {
            console.error('신상품 로드 오류:', error);
        } finally {
            setNewLoading(false);
        }
    };

    // 컴포넌트 마운트 시 데이터 로드
    useEffect(() => {
        loadBestItems();
        loadNewItems();
    }, []);

    const testData = [
        {
            id: 1,
            url: process.env.REACT_APP_SLIDE1
        }, 
        {
            id: 2,
            url: process.env.REACT_APP_SLIDE2
        }
    ]

    return (
        <MainPresenter 
            settings={settings}
            itemSettings={itemSettings}
            testData={testData}
            bestData={bestData}
            newData={newData}
            bestLoading={bestLoading}
            newLoading={newLoading}
        />
    )
}