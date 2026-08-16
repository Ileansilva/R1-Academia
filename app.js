const cfg=window.R1_CONFIG||{};
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
let plans=[];
const $=id=>document.getElementById(id);
function isoToday(){return new Date().toISOString().slice(0,10)}
function fmtDate(s){if(!s)return"—";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function addMonths(dateStr,months){const [y,m,d]=dateStr.split("-").map(Number), base=new Date(y,m-1,1);const n=base.getMonth()+months, yy=base.getFullYear()+Math.floor(n/12), mm=((n%12)+12)%12, last=new Date(yy,mm+1,0).getDate();return `${yy}-${String(mm+1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`}
function cleanPhone(v){return(v||"").replace(/\D/g,"")}
$("start_date").value=isoToday();

async function loadPlans(){
  const {data,error}=await sb.from("plans").select("*").eq("active",true).order("months");
  if(error){$("signupMessage").textContent="Configure o Supabase antes de usar o sistema.";return}
  plans=data||[];
  $("plan_id").innerHTML=plans.map(p=>`<option value="${p.id}">${p.name} • R$ ${Number(p.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</option>`).join("");
  $("plansGrid").innerHTML=plans.map(p=>`<article class="plan"><h3>${p.name}</h3><div class="plan-price">R$ ${Number(p.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div><small>${p.months} ${p.months===1?"mês":"meses"}</small><ul>${(p.benefits||[]).map(x=>`<li>${x}</li>`).join("")}</ul><button class="btn btn-primary" onclick="choosePlan('${p.id}')">Escolher</button></article>`).join("");
  updateDue()
}
window.choosePlan=id=>{$("plan_id").value=id;updateDue();location.hash="#matricula"}
function updateDue(){const p=plans.find(x=>x.id===$("plan_id").value),s=$("start_date").value;$("duePreview").textContent=p&&s?fmtDate(addMonths(s,p.months)):"—"}
$("plan_id").onchange=updateDue;$("start_date").onchange=updateDue;

$("signupForm").onsubmit=async e=>{
  e.preventDefault();
  const p=plans.find(x=>x.id===$("plan_id").value), start=$("start_date").value;
  if(!p)return;
  const payload={name:$("name").value.trim(),phone:cleanPhone($("phone").value),birth_date:$("birth_date").value||null,goal:$("goal").value,plan_id:p.id,start_date:start,due_date:addMonths(start,p.months),status:"pending"};
  const {error}=await sb.from("students").insert(payload);
  if(error){$("signupMessage").textContent="Não foi possível enviar: "+error.message;return}
  $("signupMessage").style.color="#41d57a";$("signupMessage").textContent="Cadastro enviado com sucesso! A academia confirmará sua matrícula.";
  e.target.reset();$("start_date").value=isoToday();updateDue()
};

$("whatsappBtn").onclick=async()=>{
  const {data}=await sb.from("settings").select("owner_whatsapp").limit(1).maybeSingle();
  if(data?.owner_whatsapp)window.open(`https://wa.me/${data.owner_whatsapp}`,"_blank")
};
loadPlans();
