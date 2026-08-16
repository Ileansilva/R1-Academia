
const cfg = window.R1_CONFIG || {};
const sb = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
let students = [];
let plans = [];
let payments = [];
let settings = { reminder_days: 5, owner_whatsapp: "" };
let currentStudent = null;

function fmtDate(s){ if(!s) return "—"; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; }
function daysUntil(s){
  const today = new Date(); today.setHours(0,0,0,0);
  const [y,m,d] = s.split("-").map(Number);
  const due = new Date(y,m-1,d);
  return Math.ceil((due - today) / 86400000);
}
function addMonths(dateStr, months){
  const [y,m,d]=dateStr.split("-").map(Number);
  const base = new Date(y,m-1,1);
  const target = base.getMonth() + months;
  const yy = base.getFullYear() + Math.floor(target / 12);
  const mm = ((target % 12) + 12) % 12;
  const last = new Date(yy, mm + 1, 0).getDate();
  const dd = Math.min(d,last);
  return `${yy}-${String(mm+1).padStart(2,"0")}-${String(dd).padStart(2,"0")}`;
}
function st(student){
  const diff = daysUntil(student.due_date);
  const reminder = Number(settings.reminder_days || 5);
  if(diff < 0) return "overdue";
  if(diff <= reminder) return "soon";
  return "active";
}
function stLabel(status){
  if(status === "overdue") return "Vencido";
  if(status === "soon") return "Vence em breve";
  return "Ativo";
}
function money(v){
  return Number(v || 0).toLocaleString("pt-BR", { style:"currency", currency:"BRL" });
}
function openWhatsApp(phone, message){
  const clean = String(phone || "").replace(/\D/g,"");
  if(!clean) return alert("Este aluno não possui WhatsApp cadastrado.");
  window.open(`https://wa.me/${clean}?text=${encodeURIComponent(message)}`, "_blank");
}
function buildReminderMessage(student){
  const diff = daysUntil(student.due_date);
  if(diff < 0){
    return `Olá, ${student.name}! Tudo bem? Seu plano da R1 Academia venceu em ${fmtDate(student.due_date)}. Entre em contato conosco para renovar o plano e continuar seus treinos. 💪`;
  }
  return `Olá, ${student.name}! Tudo bem? Passando para avisar que faltam ${diff} dia(s) para o vencimento do seu plano na R1 Academia, com vencimento em ${fmtDate(student.due_date)}. Se desejar, já podemos organizar sua renovação. 💪`;
}
function setLoginMessage(text){
  $("loginMessage").textContent = text;
}

$("loginBtn").onclick = async () => {
  const { error } = await sb.auth.signInWithPassword({
    email: $("email").value,
    password: $("password").value
  });
  if(error) return setLoginMessage(error.message);
  await showDashboard();
};

$("logoutBtn").onclick = async () => {
  await sb.auth.signOut();
  location.reload();
};

$("refreshBtn").onclick = loadAll;

async function showDashboard(){
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("logoutBtn").classList.remove("hidden");
  await loadAll();
}

async function boot(){
  const { data:{session} } = await sb.auth.getSession();
  if(session) showDashboard();
}
boot();

document.querySelectorAll(".tab").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".tab").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".tab-content").forEach(x => x.classList.add("hidden"));
    $(btn.dataset.tab).classList.remove("hidden");
  };
});

async function loadAll(){
  const [s,p,pa,set] = await Promise.all([
    sb.from("students").select("*, plans(name,months,price)").order("created_at", { ascending:false }),
    sb.from("plans").select("*").order("months"),
    sb.from("payments").select("*, students(name), plans(name)").order("paid_at", { ascending:false }),
    sb.from("settings").select("*").limit(1).maybeSingle()
  ]);

  students = s.data || [];
  plans = p.data || [];
  payments = pa.data || [];
  settings = set.data || { reminder_days: 5, owner_whatsapp: "" };

  $("ownerWhatsapp").value = settings.owner_whatsapp || "";
  $("reminderDays").value = settings.reminder_days || 5;

  renderAll();
}

function renderAll(){
  updateKpis();
  renderStudents();
  renderPayments();
  renderPlans();
}

function updateKpis(){
  $("kpiTotal").textContent = students.length;
  $("kpiActive").textContent = students.filter(x => st(x) === "active").length;
  $("kpiSoon").textContent = students.filter(x => st(x) === "soon").length;
  $("kpiOverdue").textContent = students.filter(x => st(x) === "overdue").length;
  $("kpiRevenue").textContent = money(payments.reduce((sum,p) => sum + Number(p.amount || 0), 0));
}

$("studentSearch").oninput = renderStudents;
$("studentFilter").onchange = renderStudents;

function renderStudents(){
  const query = $("studentSearch").value.toLowerCase();
  const filter = $("studentFilter").value;

  const list = students.filter(student => {
    const matchesText = student.name.toLowerCase().includes(query) || String(student.phone || "").includes(query);
    const matchesStatus = filter === "all" || st(student) === filter;
    return matchesText && matchesStatus;
  });

  if(!list.length){
    $("studentsList").innerHTML = `<div class="card">Nenhum aluno encontrado.</div>`;
    return;
  }

  $("studentsList").innerHTML = list.map(student => {
    const status = st(student);
    const diff = daysUntil(student.due_date);
    const dueText = diff < 0 ? `${Math.abs(diff)} dia(s) vencido` : diff === 0 ? "Vence hoje" : `${diff} dia(s)`;
    return `
      <div class="student-row">
        <div><b>${student.name}</b><small>${student.phone || "Sem WhatsApp"}</small></div>
        <div><b>${student.plans?.name || "—"}</b><small>${student.plans?.months || 0} mês(es)</small></div>
        <div><b>${fmtDate(student.due_date)}</b><small>${dueText}</small></div>
        <div><span class="status ${status}">${stLabel(status)}</span></div>
        <button class="row-btn" onclick="openStudent('${student.id}')">Abrir</button>
        <button class="row-btn whatsapp" onclick="quickReminder('${student.id}')">WhatsApp</button>
      </div>
    `;
  }).join("");
}

window.quickReminder = function(id){
  const student = students.find(x => x.id === id);
  if(!student) return;
  openWhatsApp(student.phone, buildReminderMessage(student));
};

window.openStudent = async function(id){
  currentStudent = students.find(x => x.id === id);
  if(!currentStudent) return;

  $("modalStudentName").textContent = currentStudent.name;
  $("studentDetails").innerHTML = `
    <div class="detail"><span>WhatsApp</span><b>${currentStudent.phone || "—"}</b></div>
    <div class="detail"><span>Plano</span><b>${currentStudent.plans?.name || "—"}</b></div>
    <div class="detail"><span>Início</span><b>${fmtDate(currentStudent.start_date)}</b></div>
    <div class="detail"><span>Vencimento</span><b>${fmtDate(currentStudent.due_date)}</b></div>
    <div class="detail"><span>Status</span><b>${stLabel(st(currentStudent))}</b></div>
    <div class="detail"><span>Objetivo</span><b>${currentStudent.goal || "—"}</b></div>
  `;

  const diff = daysUntil(currentStudent.due_date);
  $("dueAlert").innerHTML = diff < 0
    ? `Plano vencido há <b>${Math.abs(diff)} dia(s)</b>. Clique no WhatsApp para enviar a mensagem automática já pronta.`
    : `Faltam <b>${diff} dia(s)</b> para o vencimento. Clique no WhatsApp para enviar a mensagem automática já pronta.`;

  await renderHistory();
  $("studentModal").classList.remove("hidden");
};

$("closeStudentBtn").onclick = () => $("studentModal").classList.add("hidden");
$("closeStudentBackdrop").onclick = () => $("studentModal").classList.add("hidden");

async function renderHistory(){
  if(!currentStudent) return;
  const { data } = await sb
    .from("renewals")
    .select("*")
    .eq("student_id", currentStudent.id)
    .order("renewed_at", { ascending:false });

  $("renewalHistory").innerHTML = (data || []).length
    ? data.map(item => `<div class="history">Renovado em ${fmtDate(item.renewed_at)} • ${fmtDate(item.old_due_date)} → ${fmtDate(item.new_due_date)}</div>`).join("")
    : `<div class="history">Sem renovações registradas.</div>`;
}

$("sendReminderBtn").onclick = () => {
  if(!currentStudent) return;
  openWhatsApp(currentStudent.phone, buildReminderMessage(currentStudent));
};

$("renewBtn").onclick = async () => {
  if(!currentStudent) return;
  if(!confirm("Confirmar pagamento e renovar o plano?")) return;

  const oldDue = currentStudent.due_date;
  const months = currentStudent.plans?.months || 1;
  const newDue = addMonths(oldDue, months);
  const amount = currentStudent.plans?.price || 0;

  const paymentInsert = await sb.from("payments").insert({
    student_id: currentStudent.id,
    plan_id: currentStudent.plan_id,
    amount,
    payment_method: "manual",
    status: "paid"
  });
  if(paymentInsert.error) return alert(paymentInsert.error.message);

  const renewalInsert = await sb.from("renewals").insert({
    student_id: currentStudent.id,
    plan_id: currentStudent.plan_id,
    old_due_date: oldDue,
    new_due_date: newDue
  });
  if(renewalInsert.error) return alert(renewalInsert.error.message);

  const studentUpdate = await sb.from("students").update({
    due_date: newDue,
    status: "active"
  }).eq("id", currentStudent.id);
  if(studentUpdate.error) return alert(studentUpdate.error.message);

  $("studentModal").classList.add("hidden");
  await loadAll();
};

function renderPayments(){
  if(!payments.length){
    $("paymentsList").innerHTML = `<div class="card">Nenhum pagamento registrado.</div>`;
    return;
  }

  $("paymentsList").innerHTML = payments.map(pay => `
    <div class="payment-row">
      <div><b>${pay.students?.name || "—"}</b><small>${pay.plans?.name || "—"}</small></div>
      <div><b>${money(pay.amount)}</b><small>${pay.payment_method}</small></div>
      <div><b>${new Date(pay.paid_at).toLocaleDateString("pt-BR")}</b></div>
      <div><span class="status active">${pay.status}</span></div>
      <span></span>
      <span></span>
    </div>
  `).join("");
}

function renderPlans(){
  $("plansAdminList").innerHTML = plans.map(plan => `
    <div class="plan-row">
      <div><b>${plan.name}</b><small>${plan.months} mês(es)</small></div>
      <div><b>${money(plan.price)}</b></div>
      <div><span class="status ${plan.active ? "active" : "overdue"}">${plan.active ? "Ativo" : "Inativo"}</span></div>
      <button class="row-btn" onclick="editPlan('${plan.id}')">Editar</button>
      <span></span>
      <span></span>
    </div>
  `).join("");
}

$("newPlanBtn").onclick = () => openPlanForm();
$("cancelPlanBtn").onclick = () => $("planForm").classList.add("hidden");

function openPlanForm(plan){
  $("planForm").classList.remove("hidden");
  $("editPlanId").value = plan?.id || "";
  $("planName").value = plan?.name || "";
  $("planPrice").value = plan?.price || "";
  $("planMonths").value = plan?.months || 1;
  $("planActive").value = String(plan?.active ?? true);
  $("planBenefits").value = (plan?.benefits || []).join("\\n");
}

window.editPlan = function(id){
  openPlanForm(plans.find(x => x.id === id));
};

$("savePlanBtn").onclick = async () => {
  const id = $("editPlanId").value;
  const payload = {
    name: $("planName").value.trim(),
    price: Number($("planPrice").value || 0),
    months: Number($("planMonths").value || 1),
    active: $("planActive").value === "true",
    benefits: $("planBenefits").value.split("\\n").map(x => x.trim()).filter(Boolean)
  };

  const response = id
    ? await sb.from("plans").update(payload).eq("id", id)
    : await sb.from("plans").insert(payload);

  if(response.error) return alert(response.error.message);

  $("planForm").classList.add("hidden");
  await loadAll();
};

$("saveSettingsBtn").onclick = async () => {
  const payload = {
    owner_whatsapp: $("ownerWhatsapp").value.replace(/\D/g,""),
    reminder_days: Number($("reminderDays").value || 5)
  };

  const response = settings?.id
    ? await sb.from("settings").update(payload).eq("id", settings.id)
    : await sb.from("settings").insert(payload);

  if(response.error) return alert(response.error.message);

  await loadAll();
  alert("Configurações salvas.");
};
