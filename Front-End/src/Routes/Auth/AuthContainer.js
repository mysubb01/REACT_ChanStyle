import React, { useState } from "react";
import AuthPresenter from "./AuthPresenter";
import useInput from "../../Hooks/useInput";
import { useMutation } from 'react-apollo-hooks';
import { LOG_IN, LOCAL_LOG_IN, CREATE_ACCOUNT } from './AuthQueries';
import { toast } from "react-toastify";
import { supabaseAuth } from "../../Supabase/auth";

export default () => {
    // 회원가입, 로그인 등의 상태를 관리하기 위한 react hook 
    const [action, setAction] = useState("logIn");
    const [open, setOpen] = useState(false);
    // 입력값을 받아오기 위해서 useInput hook을 사용함 
    const name = useInput("");
    const email = useInput("");
    const password = useInput("");
    const confirmPassword = useInput("");
    const zipCode = useInput("");
    const address = useInput("");
    const addressDetail = useInput("");
    const phone1 = useInput("010");
    const phone2 = useInput("");
    const phone3 = useInput("");

    const logInMutation = useMutation(LOG_IN, {
        variables: {
            email: email.value,
            password: password.value
        }
    });

    const localLogInMutation = useMutation(LOCAL_LOG_IN);

    const createAccountMutation = useMutation(CREATE_ACCOUNT, {
        variables: {
            name: name.value,
            email: email.value,
            password: password.value,
            zipCode: zipCode.value,
            address: address.value,
            addressDetail: addressDetail.value,
            phone: phone1.value + "-" + phone2.value + "-" + phone3.value
        }
    })

    // daum pstcode API의 callback 함수 
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
    }

    const loginFunction = async () => {
        if (email !== "" && password !== "") {
            try {
                // Supabase 인증 사용
                const { session } = await supabaseAuth.signIn(email.value, password.value);
                
                if (session?.access_token) {
                    // token 값을 얻어와서 Apollo Client의 LocalState에 저장
                    // (기존 방식과 호환성 유지)
                    localLogInMutation({ variables: { token: session.access_token } });
                    // 새로고침 => 새로고침을 하지 않으면 바로 mutation 값을 읽어올수 없음 
                    window.location ="/";
                } else {
                    throw Error();
                }
            } catch (error) {
                // 로그인 실패 메시지
                toast.error(`로그인에 실패하였습니다😢 email 또는 Password를 확인해 주세요.`);
                console.error("로그인 오류:", error);
            }
        }
    }


    const onSubmit = async e => {
        e.preventDefault();

        if (action === "logIn") {
            loginFunction();
        } else if (action === "signUp") {
            // 빈값이 있는지 확인 
            if (
                name.value !== "" &&
                email.value !== "" &&
                password.value !== "" &&
                confirmPassword.value !== "" &&
                zipCode.value !== "" &&
                address.value !== "" &&
                addressDetail.value !== "" &&
                phone1.value !== "" &&
                phone2.value !== "" &&
                phone3.value !== ""
            ) {
                // 비밀번호, 비밀번호확인값 일치 검사 
                if (password.value !== confirmPassword.value) {
                    toast.error("비밀번호가 일치하지 않습니다.");
                    return false;
                }
                try {
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
                    
                    toast.success("회원가입이 완료되었습니다!");
                    
                    // 회원가입 성공시 loginFunction을 실행함으로써 
                    // token값을 얻어오고 main화면으로 이동
                    setTimeout(() => loginFunction(), 1000);
                    
                    // 값 초기화  
                    name.setValue("");
                    email.setValue("");
                    password.setValue("");
                    confirmPassword.setValue("");
                    zipCode.setValue("");
                    address.setValue("");
                    addressDetail.setValue("");
                    phone3.setValue("");
                    phone1.setValue("");
                    phone2.setValue("");
                } catch (e) {
                    toast.error(e.message);
                }
            }
        }
    }

    return (
        <AuthPresenter
            action={action}
            setAction={setAction}
            name={name}
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            zipCode={zipCode}
            address={address}
            addressDetail={addressDetail}
            onSubmit={onSubmit}
            open={open}
            setOpen={setOpen}
            handleAddress={handleAddress}
            phone1={phone1.setValue}
            phone2={phone2}
            phone3={phone3}
        />
    )
}