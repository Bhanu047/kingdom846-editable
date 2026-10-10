import {createContext,useContext,useState,useCallback} from 'react';
const C=createContext(null);export const useAuth=()=>useContext(C);
async function api(path,opts={}){const res=await fetch(path,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...opts});let data={};try{data=await res.json()}catch{}if(!res.ok){const e=new Error(data.error||'Request failed');if(res.status===409)e.conflict=data;throw e}return data}
export function AuthProvider({children}){const [user,setUser]=useState(null);const [ready,setReady]=useState(false);
const refresh=useCallback(async()=>{try{const d=await api('/api/me');setUser(d.user)}catch{setUser(null)}finally{setReady(true)}},[]);
const login=async(username,password)=>{const d=await api('/api/login',{method:'POST',body:JSON.stringify({username,password})});setUser(d.user)};
const logout=async()=>{await api('/api/logout',{method:'POST'});setUser(null)};
const getWarRoom=useCallback(()=>api('/api/war-room/roster'),[]);
const saveWarRoom=useCallback((groups,version)=>api('/api/war-room/roster',{method:'PUT',body:JSON.stringify({groups,version})}),[]);
return <C.Provider value={{user,ready,refresh,login,logout,canUseWarRoom:!!user,getWarRoom,saveWarRoom}}>{children}</C.Provider>}
