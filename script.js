// ========================
// KONFIG JSONBIN
// ========================
const API_KEY = "6925e616d0ea881f40ffb922";
const USERS_BIN_ID = "6925e58cd0ea881f40ffb821";   // users.json
const RESULTS_BIN_ID = "6925e5bbae596e708f707277"; // results.json

// ========================
// FUNKCJE DO UŻYTKOWNIKÓW
// ========================
async function fetchUsers() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}/latest`, {
      headers: { "X-Master-Key": API_KEY, "X-Bin-Meta":"false" }
    });
    const data = await res.json();
    if(!data.record) return { users: [] };
    if(!data.record.users) data.record.users=[];
    return data.record;
  } catch(e){
    console.error("Błąd pobierania użytkowników:", e);
    return { users: [] };
  }
}

async function saveUsers(users){
  try {
    await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}`, {
      method:"PUT",
      headers: { "Content-Type":"application/json","X-Master-Key":API_KEY },
      body: JSON.stringify({users})
    });
  } catch(e){ console.error("Błąd zapisu użytkowników:", e);}
}

// ========================
// REJESTRACJA
// ========================
async function registerUser(){
  const nick = document.getElementById("regNick").value.trim();
  const pass = document.getElementById("regPassword").value.trim();
  if(!nick || !pass){ alert("Podaj nick i hasło"); return; }

  const data = await fetchUsers();
  if(data.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase())){ alert("Nick już istnieje"); return; }

  data.users.push({nick, password: pass, isAdmin: false, types: []});
  await saveUsers(data.users);
  alert("Zarejestrowano! Teraz możesz się zalogować.");
  showLogin();
}

// ========================
// LOGOWANIE
// ========================
async function loginUser(){
  const nick = document.getElementById("loginNick").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  const data = await fetchUsers();

  const user = data.users.find(u => u.nick.toLowerCase()===nick.toLowerCase() && u.password===pass);
  if(!user){ alert("Błędny nick lub hasło"); return; }

  // zapis tokenów
  localStorage.setItem("userToken", user.nick);
  localStorage.setItem("isAdmin", user.isAdmin);
  document.getElementById("loginRegister").style.display="none";
  document.getElementById("logoutBtn").style.display="inline-block";
  if(user.isAdmin) document.getElementById("adminTabBtn").style.display="inline-block";
  loadPageForUser(user);
}

// ========================
// LOGOUT
// ========================
function logout(){
  localStorage.removeItem("userToken");
  localStorage.removeItem("isAdmin");
  location.reload();
}

// ========================
// TABS
// ========================
function showTab(tabId){
  document.querySelectorAll(".tabContent").forEach(div=>div.style.display="none");
  document.getElementById(tabId).style.display="block";
}

// ========================
// TYPOWANIE
// ========================
async function getAllData(){
  const usersData = await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}/latest`, {headers:{"X-Master-Key":API_KEY,"X-Bin-Meta":"false"}}).then(res=>res.json());
  const resultsData = await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}/latest`, {headers:{"X-Master-Key":API_KEY,"X-Bin-Meta":"false"}}).then(res=>res.json());
  return { users: usersData.record.users || [], matches: resultsData.record.matches || [] };
}

function isMatchOpen(matchTime){ return new Date() < new Date(matchTime); }

async function loadTypes(){
  const data = await getAllData();
  const container = document.getElementById("typesContainer"); container.innerHTML="";
  const currentUser = localStorage.getItem("userToken");
  const user = data.users.find(u=>u.nick===currentUser);
  if(!user){ container.innerHTML="Błąd użytkownika"; return; }

  data.matches.forEach((m,i)=>{
    const open = isMatchOpen(m.scheduled);
    const prevType = user.types[i]?user.types[i].score:"";
    container.innerHTML+=`
      <div>
        <strong>Mecz ${i+1} (${m.type})</strong> - ${open?"otwarty":"zamknięty"}<br>
        <input type="text" class="typeInput" data-index="${i}" data-type="${m.type}" ${!open?"disabled":""} value="${prevType}" placeholder="np. 13-11 / 2:1">
      </div><br>`;
  });
}

async function saveMyTypes(){
  const currentUser = localStorage.getItem("userToken");
  const data = await getAllData();
  const userIndex = data.users.findIndex(u=>u.nick===currentUser);
  if(userIndex===-1){ alert("Błąd użytkownika"); return; }

  const inputs = document.querySelectorAll(".typeInput");
  const userTypes = Array.from(inputs).map(i=>({type:i.dataset.type,score:i.value}));
  data.users[userIndex].types=userTypes;
  await saveUsers(data.users);
  alert("Typy zapisane!");
}

// ========================
// RANKING
// ========================
async function generateRanking(){
  const data = await getAllData();
  const table = document.getElementById("rankingTable");
  table.innerHTML="<tr><th>#</th><th>Nick</th><th>Punkty</th></tr>";
  const ranking = data.users.map(u=>({nick:u.nick,points:calculatePoints(u.types,data.matches)}));
  ranking.sort((a,b)=>b.points-a.points);
  ranking.forEach((r,i)=> table.innerHTML+=`<tr><td>${i+1}</td><td>${r.nick}</td><td>${r.points}</td></tr>`);
}

function calculatePoints(userTypes,matches){
  let points=0;
  for(let i=0;i<matches.length;i++){
    const result = matches[i]; const user=userTypes[i]; if(!user) continue;
    if(result.type==="BO1"){ if(user.score===result.score) points+=5; else if(user.score.split("-")[0]===result.score.split("-")[0]) points+=3; }
    if(result.type==="BO3"){ if(user.score===result.score) points+=7; else if(user.score.split(":")[0]===result.score.split(":")[0]) points+=4; }
  }
  return points;
}

// ========================
// ADMIN PANEL
// ========================
async function loadAdminPanel(){
  if(localStorage.getItem("isAdmin")!=="true") return;
  const data = await getAllData();
  const container = document.getElementById("matchesContainer"); container.innerHTML="";
  data.matches.forEach((m,i)=>{
    container.innerHTML+=`
      <div>
        <strong>Mecz ${i+1}</strong><br>
        Typ meczu:
        <select class="adminType" data-index="${i}">
          <option value="BO1" ${m.type==="BO1"?"selected":""}>BO1</option>
          <option value="BO3" ${m.type==="BO3"?"selected":""}>BO3</option>
        </select><br>
        Data: <input type="datetime-local" class="adminDate" data-index="${i}" value="${m.scheduled?new Date(m.scheduled).toISOString().slice(0,16):""}"><br>
        Wynik: <input type="text" class="adminScore" data-index="${i}" value="${m.score||""}" placeholder="np. 13-11 / 2:1">
      </div><br>`;
  });
}

function addMatch(){
  const container = document.getElementById("matchesContainer");
  const index = container.children.length;
  container.innerHTML+=`
    <div>
      <strong>Mecz ${index+1}</strong><br>
      Typ meczu:
      <select class="adminType" data-index="${index}">
        <option value="BO1">BO1</option>
        <option value="BO3">BO3</option>
      </select><br>
      Data: <input type="datetime-local" class="adminDate" data-index="${index}"><br>
      Wynik: <input type="text" class="adminScore" data-index="${index}" placeholder="np. 13-11 / 2:1">
    </div><br>`;
}

async function saveResults(){
  if(localStorage.getItem("isAdmin")!=="true"){ alert("Brak dostępu"); return; }
  const dateInputs=document.querySelectorAll(".adminDate");
  const scoreInputs=document.querySelectorAll(".adminScore");
  const typeInputs=document.querySelectorAll(".adminType");
  const matches=[];
  for(let i=0;i<dateInputs.length;i++){
    matches.push({
      type:typeInputs[i].value,
      scheduled:new Date(dateInputs[i].value).toISOString(),
      score:scoreInputs[i].value
    });
  }
  await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}`, {method:"PUT", headers:{"Content-Type":"application/json","X-Master-Key":API_KEY}, body:JSON.stringify({matches})});
  alert("Zapisano wyniki!");
  loadAdminPanel();
}

// ========================
// INIT
// ========================
window.addEventListener("load", async ()=>{
  if(localStorage.getItem("userToken")){
    const data = await fetchUsers();
    const currentUser = data.users.find(u=>u.nick===localStorage.getItem("userToken"));
    if(currentUser){
      document.getElementById("loginRegister").style.display="none";
      document.getElementById("logoutBtn").style.display="inline-block";
      if(currentUser.isAdmin) document.getElementById("adminTabBtn").style.display="inline-block";
      loadPageForUser(currentUser);
    }
  }
});

async function loadPageForUser(user){
  await loadTypes();
  await generateRanking();
  if(user.isAdmin) await loadAdminPanel();
  showTab("types");
}

// ========================
// POKAZ FORM LOGOWANIA/REJESTRACJI
// ========================
function showLogin(){ document.getElementById("loginForm").style.display="block"; document.getElementById("registerForm").style.display="none";}
function showRegister(){ document.getElementById("loginForm").style.display="none"; document.getElementById("registerForm").style.display="block";}
