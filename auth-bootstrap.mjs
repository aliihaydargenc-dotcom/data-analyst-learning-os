import {createClient} from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabase=createClient(
  "https://mudlekwkoxbkkauxberv.supabase.co",
  "sb_publishable_gwyoygp8B-OBdXrLXbc6ZA_MGk9rvWx",
  {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}
);
const entry=new URL(import.meta.url).searchParams.get("entry")||"app.js";
const OWNER_KEY="da-learning-os:cloud-owner";
const isLocal=["localhost","127.0.0.1"].includes(location.hostname);

function isTracked(key){
  return typeof key==="string"&&key.startsWith("da-learning-os")&&key!==OWNER_KEY;
}
function snapshot(){
  const data={};
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(isTracked(key))data[key]=localStorage.getItem(key);
  }
  return data;
}
function clearTracked(nativeRemove){
  const keys=[];
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i);
    if(isTracked(key))keys.push(key);
  }
  for(const key of keys)nativeRemove.call(localStorage,key);
}
function returnTo(){
  const value=location.pathname+location.search;
  return value.startsWith("/")&&!value.startsWith("//")?value:"/";
}

async function hydrateAndSync(userId){
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  const nativeClear=Storage.prototype.clear;
  const owner=localStorage.getItem(OWNER_KEY);
  const localBefore=snapshot();

  const {data:row}=await supabase.from("learning_state").select("payload").eq("user_id",userId).maybeSingle();
  const cloud=row?.payload&&typeof row.payload==="object"?row.payload:null;
  const hasCloud=cloud&&Object.keys(cloud).length>0;

  if(hasCloud){
    clearTracked(nativeRemove);
    for(const [key,value] of Object.entries(cloud)){
      if(isTracked(key)&&typeof value==="string")nativeSet.call(localStorage,key,value);
    }
  }else if(owner&&owner!==userId){
    clearTracked(nativeRemove);
    await supabase.from("learning_state").upsert({user_id:userId,payload:{}});
  }else if(Object.keys(localBefore).length){
    await supabase.from("learning_state").upsert({user_id:userId,payload:localBefore});
  }else{
    await supabase.from("learning_state").upsert({user_id:userId,payload:{}});
  }
  nativeSet.call(localStorage,OWNER_KEY,userId);

  let timer=null,syncing=false,dirty=false;
  async function flush(){
    if(syncing){dirty=true;return}
    syncing=true;
    try{
      const {error}=await supabase.from("learning_state").upsert({user_id:userId,payload:snapshot()});
      window.dispatchEvent(new CustomEvent("learning-cloud-sync",{detail:{state:error?"offline":"synced"}}));
    }catch{
      window.dispatchEvent(new CustomEvent("learning-cloud-sync",{detail:{state:"offline"}}));
    }finally{
      syncing=false;
      if(dirty){dirty=false;schedule(80)}
    }
  }
  function schedule(delay=650){
    if(timer)clearTimeout(timer);
    timer=setTimeout(()=>{timer=null;flush()},delay);
    window.dispatchEvent(new CustomEvent("learning-cloud-sync",{detail:{state:"saving"}}));
  }
  Storage.prototype.setItem=function(key,value){
    const result=nativeSet.call(this,key,value);
    if(this===localStorage&&isTracked(String(key)))schedule();
    return result;
  };
  Storage.prototype.removeItem=function(key){
    const result=nativeRemove.call(this,key);
    if(this===localStorage&&isTracked(String(key)))schedule();
    return result;
  };
  Storage.prototype.clear=function(){
    const result=nativeClear.call(this);
    if(this===localStorage){
      nativeSet.call(this,OWNER_KEY,userId);
      schedule();
    }
    return result;
  };
  window.__learningCloudFlush=flush;
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")flush()});
}

function renderAccount(profile){
  const host=document.querySelector(".sidebar")||document.querySelector(".lesson-top-actions");
  if(!host)return;
  const area=document.createElement("div");
  area.className="account-area";
  area.innerHTML='<span class="account-summary"><strong></strong><small data-cloud-label>Bulut senkron</small></span>'+
    (profile.role==="admin"?'<a class="account-admin-link" href="/admin">Kullanıcılar</a>':'')+
    '<button class="account-logout" type="button">Çıkış</button>';
  area.querySelector("strong").textContent=profile.full_name||profile.email||"Hesap";
  const languageButton=host.querySelector("#languageToggle");
  if(languageButton)host.insertBefore(area,languageButton);else host.append(area);
  const label=area.querySelector("[data-cloud-label]");
  window.addEventListener("learning-cloud-sync",event=>{
    const state=event.detail?.state;
    label.textContent=state==="saving"?"Kaydediliyor…":state==="offline"?"Yerelde kayıtlı":"Bulut senkron";
  });
  area.querySelector(".account-logout").addEventListener("click",async()=>{
    try{await window.__learningCloudFlush?.()}catch{}
    const keys=[];
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(isTracked(key)||key===OWNER_KEY)keys.push(key);
    }
    for(const key of keys)localStorage.removeItem(key);
    await supabase.auth.signOut();
    location.replace("/giris");
  });
}

async function boot(){
  if(isLocal){
    document.body.classList.remove("auth-booting");
    await import("./"+entry);
    return;
  }
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){
    location.replace("/giris?returnTo="+encodeURIComponent(returnTo()));
    return;
  }
  const {data:profile,error}=await supabase.from("profiles")
    .select("id,email,full_name,role,active")
    .eq("id",session.user.id)
    .maybeSingle();
  if(error||!profile?.active){
    await supabase.auth.signOut();
    location.replace("/giris?hata="+encodeURIComponent("Bu hesap Learning OS için aktif değil."));
    return;
  }
  await hydrateAndSync(session.user.id);
  renderAccount(profile);
  document.body.classList.remove("auth-booting");
  await import("./"+entry);
}

boot().catch(async()=>{
  try{await supabase.auth.signOut()}catch{}
  location.replace("/giris?hata="+encodeURIComponent("Oturum başlatılamadı. Lütfen tekrar giriş yapın."));
});