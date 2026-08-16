const cfg=window.R1_CONFIG||{};
const sb=supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);

let students=[], plans=[], payments=[], renewals=[], settings={reminder_days:5, owner_whatsapp:""}, currentStudent=null;

function fmtDate(s){if(!s)return"—";const [y,m,d]=s.split("-");return`${d}/${m}/${y}`;}
function daysUntil(s){const n=new Date();n.setHours(0,0,0,0);const [y,m,d]=s.split("-").map(Number);const due=new Date(y,m-1,d);return Math.ceil((due-n)/86400000);}
function addMonths(s,months){
  const [y,m,d]=s.split("-").map(Number);
  const b=new Date(y,m-1,1), n=b.getMonth()+months;
  const yy=b.getFullYear()+Math.floor(n/12), mm=((n%12)+12)%12;
  const last=new Date(yy,mm+1,0).getDate();
  return `${yy}-${String(mm+1).padStart(2,"0")}-${String(Math.min(d,last)).padStart(2,"0")}`;
}
function st(c){if(c.status==="inactive")return"inactive";if(c.status==="pending")return"pending";const d=daysUntil(c.due_date), r=Number(settings.reminder_days||5); if(d<0)return"overdue"; if(d<=r)return"soon"; return"active";}
function stLabel(v){if(v==="inactive")return"Suspenso";if(v==="pending")return"Pendente";return v==="overdue"?"Vencido":v==="soon"?"Vence em breve":"Ativo";}
function money(v){return Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function prettyMethod(v){
  const map={pix:"PIX", cartao:"Cartão", dinheiro:"Dinheiro", manual:"Manual"};
  return map[v]||v||"—";
}
function openWA(phone,msg){
  const p=String(phone||"").replace(/\D/g,"");
  if(!p)return alert("Este aluno não possui WhatsApp cadastrado.");
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(msg)}`,"_blank");
}
function buildReminder(student){
  const d=daysUntil(student.due_date);
  if(d<0) return `Olá, ${student.name}! Tudo bem? Seu plano da R1 Academia venceu em ${fmtDate(student.due_date)}. Entre em contato conosco para renovar e continuar seus treinos. 💪`;
  return `Olá, ${student.name}! Tudo bem? Passando para avisar que faltam ${d} dia(s) para o vencimento do seu plano na R1 Academia, com vencimento em ${fmtDate(student.due_date)}. Se desejar, já podemos organizar sua renovação. 💪`;
}
function setLoginMessage(t){$("loginMessage").textContent=t;}
function activateTab(tabId){
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("active", x.dataset.tab===tabId));
  document.querySelectorAll(".tab-content").forEach(x=>x.classList.toggle("hidden", x.id!==tabId));
}

$("loginBtn").onclick=async()=>{
  const {error}=await sb.auth.signInWithPassword({email:$("email").value, password:$("password").value});
  if(error)return setLoginMessage(error.message);
  await showDashboard();
};
$("logoutBtn").onclick=async()=>{await sb.auth.signOut(); location.reload();};
$("refreshBtn").onclick=loadAll;

async function showDashboard(){
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  await loadAll();
}
async function boot(){const {data:{session}}=await sb.auth.getSession(); if(session)showDashboard();}
boot();

document.querySelectorAll(".tab").forEach(btn=>btn.onclick=()=>activateTab(btn.dataset.tab));

async function loadAll(){
  const [s,p,pa,re,se]=await Promise.all([
    sb.from("students").select("*, plans(name,months,price)").order("created_at",{ascending:false}),
    sb.from("plans").select("*").order("months"),
    sb.from("payments").select("*, students(name), plans(name)").order("paid_at",{ascending:false}),
    sb.from("renewals").select("*, students(name), plans(name)").order("renewed_at",{ascending:false}),
    sb.from("settings").select("*").limit(1).maybeSingle()
  ]);

  students=s.data||[];
  plans=p.data||[];
  payments=pa.data||[];
  renewals=re.data||[];
  settings=se.data||{reminder_days:5, owner_whatsapp:""};

  $("ownerWhatsapp").value=settings.owner_whatsapp||"";
  $("reminderDays").value=settings.reminder_days||5;

  renderAll();
}

function renderAll(){
  updateKpis();
  renderStudents();
  renderPending();
  renderPayments();
  renderDueSoon();
  renderRenewed();
  renderSuspended();
  renderPlans();
}

function updateKpis(){
  $("kpiTotal").textContent=students.length;
  $("kpiActive").textContent=students.filter(x=>x.status==="active").length;
  $("kpiPending").textContent=students.filter(x=>x.status==="pending").length;
  $("kpiSuspended").textContent=students.filter(x=>x.status==="inactive").length;
  $("kpiSoon").textContent=students.filter(x=>st(x)==="soon").length;
  $("kpiOverdue").textContent=students.filter(x=>st(x)==="overdue").length;
  $("kpiRevenue").textContent=money(payments.reduce((sum,p)=>sum+Number(p.amount||0),0));
}

$("studentSearch").oninput=renderStudents;
$("studentFilter").onchange=renderStudents;

function renderStudents(){
  const query=$("studentSearch").value.toLowerCase();
  const filter=$("studentFilter").value;
  const list=students.filter(student=>{
    const matchesText=student.name.toLowerCase().includes(query)||String(student.phone||"").includes(query);
    const matchesStatus=filter==="all"||st(student)===filter;
    return matchesText&&matchesStatus;
  });

  $("studentsList").innerHTML=list.length?list.map(student=>{
    const status=st(student), diff=daysUntil(student.due_date);
    const dueText=diff<0?`${Math.abs(diff)} dia(s) vencido`:diff===0?"Vence hoje":`${diff} dia(s)`;
    return `<div class="student-row">
      <div><b>${student.name}</b><small>${student.phone||"Sem WhatsApp"}</small></div>
      <div><b>${student.plans?.name||"—"}</b><small>${prettyMethod(student.payment_method_preference)}</small></div>
      <div><b>${fmtDate(student.due_date)}</b><small>${dueText}</small></div>
      <div><span class="status ${status}">${stLabel(status)}</span></div>
      <button class="row-btn" onclick="openStudent('${student.id}')">Abrir</button>
      <button class="row-btn whatsapp" onclick="quickReminder('${student.id}')">WhatsApp</button>
    </div>`;
  }).join(""):`<div class="card">Nenhum aluno encontrado.</div>`;
}


function renderPending(){
  const list=students.filter(x=>x.status==="pending");
  $("pendingList").innerHTML=list.length ? list.map(student=>`
    <div class="pending-row pending-highlight">
      <div><b>${student.name}</b><small>${student.phone||"Sem WhatsApp"}</small></div>
      <div><b>${student.plans?.name||"—"}</b><small>${money(student.plans?.price||0)}</small></div>
      <div><b>${prettyMethod(student.payment_method_preference)}</b><small>Forma escolhida</small></div>
      <div><span class="status pending">Pendente</span></div>
      <button class="row-btn" onclick="openStudent('${student.id}')">Confirmar</button>
    </div>
  `).join("") : `<div class="card">Nenhuma matrícula pendente.</div>`;
}


$("suspendedSearch").oninput=renderSuspended;

function renderSuspended(){
  const input=$("suspendedSearch");
  if(!input)return;
  const q=(input.value||"").toLowerCase();
  const list=students.filter(x=>x.status==="inactive" && (
    x.name.toLowerCase().includes(q) || String(x.phone||"").includes(q)
  ));

  $("suspendedList").innerHTML=list.length ? list.map(student=>`
    <div class="suspended-row">
      <div><b>${student.name}</b><small>${student.phone||"Sem WhatsApp"}</small></div>
      <div><b>${student.plans?.name||"—"}</b><small>Último plano</small></div>
      <div><b>${fmtDate(student.due_date)}</b><small>Último vencimento</small></div>
      <div><span class="status inactive">Suspenso</span></div>
      <button class="row-btn" onclick="openStudent('${student.id}')">Reativar</button>
    </div>
  `).join("") : `<div class="card">Nenhum aluno suspenso encontrado.</div>`;
}

window.quickReminder=id=>{
  const student=students.find(x=>x.id===id);
  if(!student)return;
  openWA(student.phone, buildReminder(student));
};

window.openStudent=async id=>{
  currentStudent=students.find(x=>x.id===id);
  if(!currentStudent)return;

  $("modalStudentName").textContent=currentStudent.name;
  $("studentDetails").innerHTML=`
    <div class="detail"><span>WhatsApp</span><b>${currentStudent.phone||"—"}</b></div>
    <div class="detail"><span>Plano</span><b>${currentStudent.plans?.name||"—"}</b></div>
    <div class="detail"><span>Início</span><b>${fmtDate(currentStudent.start_date)}</b></div>
    <div class="detail"><span>Vencimento</span><b>${fmtDate(currentStudent.due_date)}</b></div>
    <div class="detail"><span>Status</span><b>${stLabel(st(currentStudent))}</b></div>
    <div class="detail"><span>Pagamento escolhido</span><b>${prettyMethod(currentStudent.payment_method_preference)}</b></div>
  `;
  $("renewalPaymentMethod").value=(currentStudent.payment_method_preference||"pix");
  $("reactivationPaymentMethod").value=(currentStudent.payment_method_preference||"pix");
  $("reactivationPlan").innerHTML=plans.filter(p=>p.active).map(p=>`<option value="${p.id}" ${p.id===currentStudent.plan_id?"selected":""}>${p.name} • ${money(p.price)}</option>`).join("");
  $("initialPaymentMethod").value=(currentStudent.payment_method_preference||"pix");

  const isPending=currentStudent.status==="pending";
  const isInactive=currentStudent.status==="inactive";
  $("initialPaymentPanel").classList.toggle("hidden", !isPending);
  $("renewalPanel").classList.toggle("hidden", isPending || isInactive);
  $("reactivationPanel").classList.toggle("hidden", !isInactive);
  $("activeStudentActions").classList.toggle("hidden", isPending || isInactive);
  const diff=daysUntil(currentStudent.due_date);
  $("dueAlert").innerHTML=diff<0
    ?`Plano vencido há <b>${Math.abs(diff)} dia(s)</b>. Clique no WhatsApp para enviar a mensagem automática já pronta.`
    :`Faltam <b>${diff} dia(s)</b> para o vencimento. Clique no WhatsApp para enviar a mensagem automática já pronta.`;

  await renderHistory();
  $("studentModal").classList.remove("hidden");
};

$("closeStudentBtn").onclick=()=>$("studentModal").classList.add("hidden");
$("closeStudentBackdrop").onclick=()=>$("studentModal").classList.add("hidden");

async function renderHistory(){
  if(!currentStudent)return;
  const history=renewals.filter(x=>x.student_id===currentStudent.id);
  $("renewalHistory").innerHTML=history.length
    ?history.map(item=>`<div class="history">Renovado em ${fmtDate(item.renewed_at)} • ${fmtDate(item.old_due_date)} → ${fmtDate(item.new_due_date)} • ${item.action_type==="reactivation"?"Reativação":"Renovação"} • ${prettyMethod(item.payment_method)}</div>`).join("")
    :`<div class="history">Sem renovações registradas.</div>`;
}

$("sendReminderBtn").onclick=()=>{
  if(!currentStudent)return;
  openWA(currentStudent.phone, buildReminder(currentStudent));
};


$("confirmEnrollmentBtn").onclick=async()=>{
  if(!currentStudent)return;
  if(currentStudent.status!=="pending")return alert("Esta matrícula já foi confirmada.");

  const paymentMethod=$("initialPaymentMethod").value||currentStudent.payment_method_preference||"pix";
  const amount=currentStudent.plans?.price||0;

  if(!confirm(`Confirmar matrícula de ${currentStudent.name} e recebimento de ${money(amount)} via ${prettyMethod(paymentMethod)}?`))return;

  const paymentInsert=await sb.from("payments").insert({
    student_id:currentStudent.id,
    plan_id:currentStudent.plan_id,
    amount,
    payment_method:paymentMethod,
    status:"paid"
  });
  if(paymentInsert.error)return alert(paymentInsert.error.message);

  const updatePayload={
    status:"active",
    payment_method_preference:paymentMethod,
    initial_confirmed_at:new Date().toISOString()
  };
  const studentUpdate=await sb.from("students").update(updatePayload).eq("id", currentStudent.id);
  if(studentUpdate.error)return alert(studentUpdate.error.message);

  $("studentModal").classList.add("hidden");
  await loadAll();
  activateTab("paymentsTab");
  alert("Matrícula confirmada e pagamento lançado no financeiro.");
};


$("suspendBtn").onclick=async()=>{
  if(!currentStudent)return;
  if(currentStudent.status==="inactive")return alert("Esta matrícula já está suspensa.");

  if(!confirm(`Suspender a matrícula de ${currentStudent.name}? O aluno continuará salvo e poderá ser reativado futuramente.`))return;

  const {error}=await sb.from("students").update({
    status:"inactive",
    suspended_at:new Date().toISOString()
  }).eq("id", currentStudent.id);

  if(error)return alert(error.message);

  $("studentModal").classList.add("hidden");
  await loadAll();
  activateTab("suspendedTab");
  alert("Matrícula suspensa. O aluno continua salvo no sistema.");
};

$("reactivateBtn").onclick=async()=>{
  if(!currentStudent)return;
  if(currentStudent.status!=="inactive")return alert("Este aluno não está suspenso.");

  const planId=$("reactivationPlan").value;
  const plan=plans.find(p=>p.id===planId);
  if(!plan)return alert("Selecione um plano.");

  const paymentMethod=$("reactivationPaymentMethod").value||"pix";
  const start=new Date().toISOString().slice(0,10);
  const newDue=addMonths(start, plan.months);
  const oldDue=currentStudent.due_date;

  if(!confirm(`Reativar ${currentStudent.name} no plano ${plan.name} por ${money(plan.price)} via ${prettyMethod(paymentMethod)}?`))return;

  const pay=await sb.from("payments").insert({
    student_id:currentStudent.id,
    plan_id:plan.id,
    amount:plan.price,
    payment_method:paymentMethod,
    status:"paid"
  });
  if(pay.error)return alert(pay.error.message);

  const renewalPayload={
    student_id:currentStudent.id,
    plan_id:plan.id,
    old_due_date:oldDue,
    new_due_date:newDue,
    payment_method:paymentMethod,
    action_type:"reactivation"
  };
  let ren=await sb.from("renewals").insert(renewalPayload);
  if(ren.error && String(ren.error.message||"").toLowerCase().includes("action_type")){
    const {action_type,...fallback}=renewalPayload;
    ren=await sb.from("renewals").insert(fallback);
  }
  if(ren.error)return alert(ren.error.message);

  const updatePayload={
    status:"active",
    plan_id:plan.id,
    start_date:start,
    due_date:newDue,
    payment_method_preference:paymentMethod,
    suspended_at:null,
    reactivated_at:new Date().toISOString()
  };
  let upd=await sb.from("students").update(updatePayload).eq("id",currentStudent.id);
  if(upd.error && String(upd.error.message||"").toLowerCase().includes("reactivated_at")){
    const {reactivated_at,suspended_at,...fallback}=updatePayload;
    upd=await sb.from("students").update(fallback).eq("id",currentStudent.id);
  }
  if(upd.error)return alert(upd.error.message);

  $("studentModal").classList.add("hidden");
  await loadAll();
  activateTab("paymentsTab");
  alert("Plano reativado com sucesso e pagamento lançado no financeiro.");
};

$("renewBtn").onclick=async()=>{
  if(!currentStudent)return;
  if(!confirm("Confirmar pagamento e renovar o plano?"))return;

  const oldDue=currentStudent.due_date;
  const months=currentStudent.plans?.months||1;
  const newDue=addMonths(oldDue, months);
  const amount=currentStudent.plans?.price||0;
  const paymentMethod=$("renewalPaymentMethod").value||"pix";

  const paymentInsert=await sb.from("payments").insert({
    student_id:currentStudent.id,
    plan_id:currentStudent.plan_id,
    amount,
    payment_method:paymentMethod,
    status:"paid"
  });
  if(paymentInsert.error)return alert(paymentInsert.error.message);

  const renewalPayload={
    student_id:currentStudent.id,
    plan_id:currentStudent.plan_id,
    old_due_date:oldDue,
    new_due_date:newDue,
    payment_method:paymentMethod
  };

  let renewalInsert=await sb.from("renewals").insert(renewalPayload);
  if(renewalInsert.error && String(renewalInsert.error.message||"").toLowerCase().includes("payment_method")){
    const {payment_method,...fallback}=renewalPayload;
    renewalInsert=await sb.from("renewals").insert(fallback);
  }
  if(renewalInsert.error)return alert(renewalInsert.error.message);

  const studentUpdatePayload={due_date:newDue, status:"active", payment_method_preference:paymentMethod};
  let studentUpdate=await sb.from("students").update(studentUpdatePayload).eq("id", currentStudent.id);
  if(studentUpdate.error && String(studentUpdate.error.message||"").toLowerCase().includes("payment_method_preference")){
    const {payment_method_preference,...fallback}=studentUpdatePayload;
    studentUpdate=await sb.from("students").update(fallback).eq("id", currentStudent.id);
  }
  if(studentUpdate.error)return alert(studentUpdate.error.message);

  $("studentModal").classList.add("hidden");
  await loadAll();
  activateTab("paymentsTab");
};

function renderPayments(){
  const byPix=payments.filter(x=>x.payment_method==="pix").reduce((s,x)=>s+Number(x.amount||0),0);
  const byCard=payments.filter(x=>x.payment_method==="cartao").reduce((s,x)=>s+Number(x.amount||0),0);
  const byCash=payments.filter(x=>x.payment_method==="dinheiro").reduce((s,x)=>s+Number(x.amount||0),0);

  $("paymentSummary").innerHTML=`
    <article><span>Total recebido</span><b>${money(payments.reduce((s,x)=>s+Number(x.amount||0),0))}</b></article>
    <article><span>Recebido em PIX</span><b>${money(byPix)}</b></article>
    <article><span>Recebido em Cartão</span><b>${money(byCard)}</b></article>
    <article><span>Recebido em Dinheiro</span><b>${money(byCash)}</b></article>
  `;

  $("recentRegistrations").innerHTML=students.length ? students.slice(0,10).map(student=>`
    <div class="recent-row">
      <div><b>${student.name}</b><small>${student.phone||"Sem WhatsApp"}</small></div>
      <div><b>${student.plans?.name||"—"}</b><small>${prettyMethod(student.payment_method_preference)}</small></div>
      <div><b>${fmtDate(student.start_date)}</b><small>Cadastro recente</small></div>
      <div><span class="status ${student.status==="pending"?"pending":"active"}">${student.status==="pending"?"Aguardando pagamento":"Matrícula confirmada"}</span></div>
      <button class="row-btn" onclick="openStudent('${student.id}')">Abrir</button>
      <span></span>
    </div>
  `).join("") : `<div class="card">Nenhum cadastro recente.</div>`;

  $("paymentsList").innerHTML=payments.length ? payments.map(pay=>`
    <div class="payment-row">
      <div><b>${pay.students?.name||"—"}</b><small>${pay.plans?.name||"—"}</small></div>
      <div><b>${money(pay.amount)}</b><small>${prettyMethod(pay.payment_method)}</small></div>
      <div><b>${new Date(pay.paid_at).toLocaleDateString("pt-BR")}</b><small>Recebimento</small></div>
      <div><span class="status active">${pay.status}</span></div>
      <span></span><span></span>
    </div>
  `).join("") : `<div class="card">Nenhum pagamento registrado.</div>`;
}

function renderDueSoon(){
  const list=students.filter(x=>x.status!=="inactive" && ["soon","overdue"].includes(st(x)));
  $("dueSoonList").innerHTML=list.length ? list.map(student=>{
    const status=st(student), diff=daysUntil(student.due_date);
    return `<div class="due-row">
      <div><b>${student.name}</b><small>${student.phone||"Sem WhatsApp"}</small></div>
      <div><b>${student.plans?.name||"—"}</b><small>${prettyMethod(student.payment_method_preference)}</small></div>
      <div><b>${fmtDate(student.due_date)}</b><small>${diff<0?`${Math.abs(diff)} dia(s) vencido`:`${diff} dia(s)`}</small></div>
      <div><span class="status ${status}">${stLabel(status)}</span></div>
      <button class="row-btn whatsapp" onclick="quickReminder('${student.id}')">WhatsApp</button>
      <button class="row-btn" onclick="openStudent('${student.id}')">Abrir</button>
    </div>`;
  }).join("") : `<div class="card">Nenhum cliente próximo do vencimento.</div>`;
}

function renderRenewed(){
  $("renewedList").innerHTML=renewals.length ? renewals.map(item=>`
    <div class="renewed-row">
      <div><b>${item.students?.name||"—"}</b><small>${item.plans?.name||"—"}</small></div>
      <div><b>${fmtDate(item.old_due_date)}</b><small>Vencimento anterior</small></div>
      <div><b>${fmtDate(item.new_due_date)}</b><small>Novo vencimento</small></div>
      <div><span class="status active">${item.action_type==="reactivation"?"Reativação":"Renovação"} • ${prettyMethod(item.payment_method)}</span></div>
      <span></span><span></span>
    </div>
  `).join("") : `<div class="card">Nenhuma renovação registrada.</div>`;
}

function renderPlans(){
  $("plansAdminList").innerHTML=plans.map(plan=>`
    <div class="plan-row">
      <div><b>${plan.name}</b><small>${plan.months} mês(es)</small></div>
      <div><b>${money(plan.price)}</b></div>
      <div><span class="status ${plan.active?"active":"overdue"}">${plan.active?"Ativo":"Inativo"}</span></div>
      <button class="row-btn" onclick="editPlan('${plan.id}')">Editar</button>
      <span></span><span></span>
    </div>
  `).join("");
}

$("newPlanBtn").onclick=()=>openPlanForm();
$("cancelPlanBtn").onclick=()=>$("planForm").classList.add("hidden");

function openPlanForm(plan){
  $("planForm").classList.remove("hidden");
  $("editPlanId").value=plan?.id||"";
  $("planName").value=plan?.name||"";
  $("planPrice").value=plan?.price||"";
  $("planMonths").value=plan?.months||1;
  $("planActive").value=String(plan?.active ?? true);
  $("planBenefits").value=(plan?.benefits||[]).join("\n");
}
window.editPlan=id=>openPlanForm(plans.find(x=>x.id===id));

$("savePlanBtn").onclick=async()=>{
  const id=$("editPlanId").value;
  const payload={
    name:$("planName").value.trim(),
    price:Number($("planPrice").value||0),
    months:Number($("planMonths").value||1),
    active:$("planActive").value==="true",
    benefits:$("planBenefits").value.split("\n").map(x=>x.trim()).filter(Boolean)
  };
  const response=id ? await sb.from("plans").update(payload).eq("id", id) : await sb.from("plans").insert(payload);
  if(response.error)return alert(response.error.message);
  $("planForm").classList.add("hidden");
  await loadAll();
};

$("saveSettingsBtn").onclick=async()=>{
  const payload={owner_whatsapp:$("ownerWhatsapp").value.replace(/\D/g,""), reminder_days:Number($("reminderDays").value||5)};
  const response=settings?.id ? await sb.from("settings").update(payload).eq("id", settings.id) : await sb.from("settings").insert(payload);
  if(response.error)return alert(response.error.message);
  await loadAll();
  alert("Configurações salvas.");
};
