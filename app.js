const cfg=window.R1_CONFIG||{};
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
let plans=[];
const $=id=>document.getElementById(id);

function isoToday(){return new Date().toISOString().slice(0,10)}
function fmtDate(s){if(!s)return"—";const [y,m,d]=s.split("-");return `${d}/${m}/${y}`}
function addMonths(dateStr,months){
  const [y,m,d]=dateStr.split("-").map(Number);
  const base=new Date(y,m-1,1);
  const n=base.getMonth()+months;
  const yy=base.getFullYear()+Math.floor(n/12);
  const mm=((n%12)+12)%12;
  const last=new Date(yy,mm+1,0).getDate();
  return `${yy}-${String(mm+1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`;
}
function cleanPhone(v){return(v||"").replace(/\D/g,"")}

$("start_date").value=isoToday();

async function loadPlans(){
  const {data,error}=await sb.from("plans").select("*").eq("active",true).order("months");
  if(error){$("signupMessage").textContent="Configure o Supabase antes de usar o sistema.";return}
  plans=data||[];
  $("plan_id").innerHTML=plans.map(p=>`<option value="${p.id}">${p.name} • R$ ${Number(p.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</option>`).join("");
  $("plansGrid").innerHTML=plans.map(p=>`
    <article class="plan">
      <h3>${p.name}</h3>
      <div class="plan-price">R$ ${Number(p.price).toLocaleString("pt-BR",{minimumFractionDigits:2})}</div>
      <small>${p.months} ${p.months===1?"mês":"meses"}</small>
      <ul>${(p.benefits||[]).map(x=>`<li>${x}</li>`).join("")}</ul>
      <button class="btn btn-primary" onclick="choosePlan('${p.id}')">Escolher</button>
    </article>
  `).join("");
  updateDue();
}
window.choosePlan=id=>{$("plan_id").value=id;updateDue();location.hash="#matricula"}

function updateDue(){
  const p=plans.find(x=>x.id===$("plan_id").value),s=$("start_date").value;
  $("duePreview").textContent=p&&s?fmtDate(addMonths(s,p.months)):"—";
}
$("plan_id").onchange=updateDue;
$("start_date").onchange=updateDue;

$("signupForm").onsubmit=async e=>{
  e.preventDefault();
  const p=plans.find(x=>x.id===$("plan_id").value), start=$("start_date").value;
  if(!p)return;

  const payload={
    name:$("name").value.trim(),
    phone:cleanPhone($("phone").value),
    birth_date:$("birth_date").value||null,
    goal:$("goal").value,
    plan_id:p.id,
    start_date:start,
    due_date:addMonths(start,p.months),
    status:"pending",
    payment_method_preference:$("payment_method").value
  };

  let response=await sb.from("students").insert(payload);
  if(response.error && String(response.error.message||"").toLowerCase().includes("payment_method_preference".toLowerCase())){
    // fallback for older database schema
    const {payment_method_preference,...fallback}=payload;
    response=await sb.from("students").insert(fallback);
  }

  if(response.error){
    $("signupMessage").textContent="Não foi possível enviar: "+response.error.message;
    return;
  }

  $("signupMessage").style.color="#41d57a";
  $("signupMessage").textContent="Cadastro enviado com sucesso! O proprietário já verá este aluno no financeiro e na lista de alunos.";
  e.target.reset();
  $("start_date").value=isoToday();
  updateDue();
};

$("whatsappBtn").onclick=async()=>{
  const {data}=await sb.from("settings").select("owner_whatsapp").limit(1).maybeSingle();
  if(data?.owner_whatsapp)window.open(`https://wa.me/${data.owner_whatsapp}`,"_blank")
};

// Premium UI effects
document.addEventListener("DOMContentLoaded", () => {
  const revealEls = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if(entry.isIntersecting){
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  revealEls.forEach(el => observer.observe(el));

  document.querySelectorAll(".counter").forEach(counter => {
    const target = Number(counter.dataset.target || 0);
    let value = 0;
    const step = Math.max(1, Math.ceil(target / 40));
    const timer = setInterval(() => {
      value += step;
      if(value >= target){
        value = target;
        clearInterval(timer);
      }
      counter.textContent = value;
    }, 25);
  });

  const glow = document.getElementById("cursorGlow");
  if(glow){
    window.addEventListener("mousemove", e => {
      glow.style.left = e.clientX + "px";
      glow.style.top = e.clientY + "px";
    });
  }

  document.querySelectorAll("[data-parallax]").forEach(el => {
    const amount = Number(el.dataset.parallax || 0.05);
    window.addEventListener("mousemove", e => {
      const x = (e.clientX / innerWidth - .5) * 34 * amount;
      const y = (e.clientY / innerHeight - .5) * 34 * amount;
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
    });
  });

  const menuBtn=document.getElementById("menuBtn");
  const mainNav=document.getElementById("mainNav");
  if(menuBtn && mainNav){
    menuBtn.addEventListener("click", ()=>mainNav.classList.toggle("open"));
  }
});

loadPlans();
