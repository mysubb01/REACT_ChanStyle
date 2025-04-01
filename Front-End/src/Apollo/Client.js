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
})