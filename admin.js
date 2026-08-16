const cfg=window.R1_CONFIG||{}, sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);let students=[],plans=[],payments=[],settings={},currentStudent=null;
function fmtDate(s){if(!s)return"—";const [y,m,d]=s.split("-");return`${d}/${m}/${y}`}
function daysUntil(s){const n=new Date();n.setHours(0,0,0,0);const [y,m,d]=s.split("-").map(Number),due=new Date(y,m-1,d);return Math.ceil((due-n)/86400000)}
function addMonths(s,months){const[y,m,d]=s.split("-").map(Number),b=new Date(y,m-1,1),n=b.getMonth()+months,yy=b.getFullYear()+Math.floor(n/12),mm=((n%12)+12)%12,last=new Date(yy,mm+1,0).getDate();return`${yy}-${String(mm+1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`}
function st(c){const d=daysUntil(c.due_date);return d<0?"overdue":d<=Number(settings.reminder_days||5)?"soon":"active"}
function stLabel(v){return v==="overdue"?"Vencido":v==="soon"?"Vence em breve":"Ativo"}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}
function msg(t){$("loginMessage").textContent=t}

$("loginBtn").onclick=async()=>{const{error}=await sb.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error)return msg(error.message);await showDashboard()};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut();location.reload()};
$("refreshBtn").onclick=loadAll;
async function showDashboard(){$("loginView").classList.add("hidden");$("dashboardView").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");await loadAll()}
async function boot(){const{data:{session}}=await sb.auth.getSession();if(session)showDashboard()}boot();

document.querySelectorAll(".tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".tab-content").forEach(x=>x.classList.add("hidden"));$(b.dataset.tab).classList.remove("hidden")});

async function loadAll(){
  const [s,p,pa,set]=await Promise.all([
    sb.from("students").select("*,plans(name,months,price)").order("created_at",{ascending:false}),
    sb.from("plans").select("*").order("months"),
    sb.from("payments").select("*,students(name),plans(name)").order("paid_at",{ascending:false}),
    sb.from("settings").select("*").limit(1).maybeSingle()
  ]);
  students=s.data||[];plans=p.data||[];payments=pa.data||[];settings=set.data||{reminder_days:5};
  $("ownerWhatsapp").value=settings.owner_whatsapp||"";$("reminderDays").value=settings.reminder_days||5;
  renderAll()
}
function renderAll(){renderStudents();renderPayments();renderPlans();updateKpis()}
function updateKpis(){
  $("kpiTotal").textContent=students.length;$("kpiActive").textContent=students.filter(x=>st(x)==="active").length;$("kpiSoon").textContent=students.filter(x=>st(x)==="soon").length;$("kpiOverdue").textContent=students.filter(x=>st(x)==="overdue").length;
  $("kpiRevenue").textContent=money(payments.reduce((a,x)=>a+Number(x.amount||0),0))
}
$("studentSearch").oninput=renderStudents;$("studentFilter").onchange=renderStudents;
function renderStudents(){
  const q=$("studentSearch").value.toLowerCase(),f=$("studentFilter").value;
  const list=students.filter(c=>(c.name.toLowerCase().includes(q)||c.phone.includes(q))&&(f==="all"||st(c)===f));
  $("studentsList").innerHTML=list.length?list.map(c=>`<div class="student-row"><div><b>${c.name}</b><small>${c.phone}</small></div><div><b>${c.plans?.name||"—"}</b><small>${c.plans?.months||0} mês(es)</small></div><div><b>${fmtDate(c.due_date)}</b><small>${daysUntil(c.due_date)} dia(s)</small></div><div><span class="status ${st(c)}">${stLabel(st(c))}</span></div><button class="row-btn" onclick="openStudent('${c.id}')">Abrir</button></div>`).join(""):`<div class="card">Nenhum aluno encontrado.</div>`
}
window.openStudent=id=>{currentStudent=students.find(x=>x.id===id);if(!currentStudent)return;$("modalStudentName").textContent=currentStudent.name;$("studentDetails").innerHTML=`<div class="detail"><span>WhatsApp</span><b>${currentStudent.phone}</b></div><div class="detail"><span>Plano</span><b>${currentStudent.plans?.name||"—"}</b></div><div class="detail"><span>Início</span><b>${fmtDate(currentStudent.start_date)}</b></div><div class="detail"><span>Vencimento</span><b>${fmtDate(currentStudent.due_date)}</b></div><div class="detail"><span>Status</span><b>${stLabel(st(currentStudent))}</b></div><div class="detail"><span>Objetivo</span><b>${currentStudent.goal||"—"}</b></div>`;const d=daysUntil(currentStudent.due_date);$("dueAlert").innerHTML=d<0?`Plano vencido há <b>${Math.abs(d)} dia(s)</b>.`:`Faltam <b>${d} dia(s)</b> para o vencimento.`;renderHistory();$("studentModal").classList.remove("hidden")};
$("closeStudentBtn").onclick=()=>$("studentModal").classList.add("hidden");$("closeStudentBackdrop").onclick=()=>$("studentModal").classList.add("hidden");
async function renderHistory(){const{data}=await sb.from("renewals").select("*").eq("student_id",currentStudent.id).order("renewed_at",{ascending:false});$("renewalHistory").innerHTML=(data||[]).length?(data||[]).map(x=>`<div class="history">Renovado em ${fmtDate(x.renewed_at)} • ${fmtDate(x.old_due_date)} → ${fmtDate(x.new_due_date)}</div>`).join(""):`<div class="history">Sem renovações registradas.</div>`}

$("sendReminderBtn").onclick=()=>{if(!currentStudent)return;const d=daysUntil(currentStudent.due_date),text=d<0?`Olá, ${currentStudent.name}! Seu plano da R1 Academia venceu em ${fmtDate(currentStudent.due_date)}. Entre em contato para renovar e continuar seus treinos. 💪`:`Olá, ${currentStudent.name}! Passando para avisar que faltam ${d} dia(s) para o vencimento do seu plano da R1 Academia, em ${fmtDate(currentStudent.due_date)}. Se desejar, já podemos organizar sua renovação. 💪`;window.open(`https://wa.me/${currentStudent.phone}?text=${encodeURIComponent(text)}`,"_blank")};

$("renewBtn").onclick=async()=>{if(!currentStudent||!confirm("Confirmar pagamento e renovar o plano?"))return;const oldDue=currentStudent.due_date,months=currentStudent.plans.months,newDue=addMonths(oldDue,months),amount=currentStudent.plans.price;const{error:pe}=await sb.from("payments").insert({student_id:currentStudent.id,plan_id:currentStudent.plan_id,amount,payment_method:"manual",status:"paid"});if(pe)return alert(pe.message);const{error:re}=await sb.from("renewals").insert({student_id:currentStudent.id,plan_id:currentStudent.plan_id,old_due_date:oldDue,new_due_date:newDue});if(re)return alert(re.message);const{error:ue}=await sb.from("students").update({due_date:newDue,status:"active"}).eq("id",currentStudent.id);if(ue)return alert(ue.message);$("studentModal").classList.add("hidden");await loadAll()};

function renderPayments(){$("paymentsList").innerHTML=payments.length?payments.map(x=>`<div class="payment-row"><div><b>${x.students?.name||"—"}</b><small>${x.plans?.name||"—"}</small></div><div><b>${money(x.amount)}</b><small>${x.payment_method}</small></div><div><b>${new Date(x.paid_at).toLocaleDateString("pt-BR")}</b></div><div><span class="status active">${x.status}</span></div><span></span></div>`).join(""):`<div class="card">Nenhum pagamento registrado.</div>`}

function renderPlans(){$("plansAdminList").innerHTML=plans.map(p=>`<div class="plan-row"><div><b>${p.name}</b><small>${p.months} mês(es)</small></div><div><b>${money(p.price)}</b></div><div><span class="status ${p.active?"active":"overdue"}">${p.active?"Ativo":"Inativo"}</span></div><button class="row-btn" onclick="editPlan('${p.id}')">Editar</button><span></span></div>`).join("")}
$("newPlanBtn").onclick=()=>openPlanForm();$("cancelPlanBtn").onclick=()=>$("planForm").classList.add("hidden");
function openPlanForm(p){$("planForm").classList.remove("hidden");$("editPlanId").value=p?.id||"";$("planName").value=p?.name||"";$("planPrice").value=p?.price||"";$("planMonths").value=p?.months||1;$("planActive").value=String(p?.active??true);$("planBenefits").value=(p?.benefits||[]).join("\n")}
window.editPlan=id=>openPlanForm(plans.find(x=>x.id===id));
$("savePlanBtn").onclick=async()=>{const id=$("editPlanId").value,payload={name:$("planName").value.trim(),price:Number($("planPrice").value),months:Number($("planMonths").value),active:$("planActive").value==="true",benefits:$("planBenefits").value.split("\n").map(x=>x.trim()).filter(Boolean)};const q=id?sb.from("plans").update(payload).eq("id",id):sb.from("plans").insert(payload);const{error}=await q;if(error)return alert(error.message);$("planForm").classList.add("hidden");await loadAll()};
$("saveSettingsBtn").onclick=async()=>{const payload={owner_whatsapp:$("ownerWhatsapp").value.replace(/\D/g,""),reminder_days:Number($("reminderDays").value||5)};let r;if(settings?.id)r=await sb.from("settings").update(payload).eq("id",settings.id);else r=await sb.from("settings").insert(payload);if(r.error)return alert(r.error.message);await loadAll();alert("Configurações salvas.")};
