import {useCallback,useEffect,useState} from 'react';
import {planningApi} from '../../services/planningApi';
export default function usePlanning(){
 const [data,setData]=useState({orders:[],vehicles:[],staff:[],routes:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{setData((await planningApi.load()).data.data);}catch(e){setError(e.response?.data?.message||'Không thể tải dữ liệu.');}finally{setLoading(false);}},[]);
 useEffect(()=>{load();},[load]);return {data,loading,error,load};
}
