// ========================
// KONFIG JSONBIN
// ========================
const API_KEY = "6925e616d0ea881f40ffb922";
const USERS_BIN_ID = "6925e58cd0ea881f40ffb821";
const RESULTS_BIN_ID = "6925e5bbae596e708f707277";

// ========================
// EVENT LISTENERS
// ========================
window.addEventListener("load", ()=>{
  document.getElementById("showLoginBtn").addEventListener("click", ()=>{document.getElementById("loginForm").style.display="block";document.getElementById("registerForm").style.display="none";});
  document.getElementById("showRegisterBtn").addEventListener("click", ()=>{document.getElementById("loginForm").style.display="none";document.getElementById("registerForm").style.display="block";});
  document.getElementById("btnRegister").addEventListener("click", registerUser);
  document.getElementById("btnLogin").addEventListener("click", loginUser);
  document.getElementById("logoutBtn").addEventListener("click", logout);
  document.getElementById("tabTypes").addEventListener("click", ()=>showTab("types"));
  document.getElementById("tabRanking").addEventListener("click", ()=>showTab("ranking"));
  document.getElementById("adminTabBtn").addEventListener("click", ()=>showTab("admin"));
  document.getElementById("saveTypesBtn").addEventListener("click", saveMyTypes);
  document.getElementById("addMatchBtn").addEventListener("click", addMatch);
  document.getElementById("saveResultsBtn").addEventListener("click", saveResults);

  // automatyczne logowanie jeśli zapamiętany
  if(localStorage.getItem("userToken")){
    fetchUsers().then(data=>{
      const user = data.users.find(u=>u.nick===localStorage.getItem("userToken"));
      if(user){
        document.getElementById("loginRegister").style.display="none";
        document.getElementById("logoutBtn").style.display="inline-block";
        if(user.isAdmin) document.getElementById("adminTabBtn").style.display="inline-block";
        loadPageForUser(user);
      }
    });
  }
});

// ========================
// JSONBIN FUNKCJE
// ========================
async function fetchUsers() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}/latest`, {headers:{"X-Master-Key":API_KEY,"X-Bin-Meta":"false"}});
    const data = await res.json();
    if(!data.record) return {users:[]};
    if(!data.record.users) data.record.users=[];
    return data.record;
  } catch(e){console.error("Błąd fetchUsers", e); return {users:[]};}
}

async function saveUsers(users){
  await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}`, {method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":API_KEY},body:JSON.stringify({users})});
}

async function fetchResults(){
  try{
    const res = await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}/latest`, {headers:{"X-Master-Key":API_KEY,"X-Bin-Meta":"false"}});
    const data = await res.json();
    if(!data.record) return {matches:[]};
    if(!data.record.matches) data.record.matches=[];
    return data.record;
  } catch(e){console.error("Błąd fetchResults", e); return {matches:[]};}
}

async function saveResultsBin(matches){
  await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}`, {method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":API_KEY},body:JSON.stringify({matches})});
}

// ========================
// REJESTRACJA
// ========================
async function registerUser(){
  const nick = document.getElementById("regNick").value.trim();
  const pass = document.getElementById("regPassword").value.trim();
  if(!nick||!pass){alert("Podaj nick i hasło");return;}
  const data = await fetchUsers();
  if(data.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase())){alert("Nick już istnieje");return;}
  data.users.push({nick,password:pass,isAdmin:false,types:[]});
  await saveUsers(data.users);
  alert("Zarejestrowano! Zaloguj się.");
  document.getElementById("loginForm").style.display="block";
  document.getElementById("registerForm").style.display="none";
}

// ========================
// LOGOWANIE
// ========================
async function loginUser(){
  const nick = document.getElementById("loginNick").value.trim();
  const pass = document.getElementById("loginPassword").value.trim();
  const data = await fetchUsers();
  const user = data.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase() && u.password===pass);
  if(!user){alert("Błędny nick lub hasło"); return;}
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
function logout(){localStorage.clear(); location.reload();}

// ========================
// TABY
// ========================
function showTab(tabId){document.querySelectorAll(".tabContent").forEach(d=>d.style.display="none"); document.getElementById(tabId).style.display="block";}

// ========================
// STRONA PO LOGOWANIU
// ========================
async function loadPageForUser(user){
  await loadTypes();
  await generateRanking();
  if(user.isAdmin) await loadAdminPanel();
  showTab("types");
}

// ========================
// TYPOWANIE
// ========================
async function loadTypes(){
  const data = await getAllData();
  const container = document.getElementById("typesContainer");
  container.innerHTML="";
  const user = data.users.find(u=>u.nick===localStorage.getItem("userToken"));
  if(!user){container.innerHTML="Błąd użytkownika"; return;}
  data.matches.forEach((m,i)=>{
    const open = new Date() < new Date(m.scheduled);
    const prevType = user.types[i]?user.types[i].score:"";
    container.innerHTML+=`
      <div>
        <strong>Mecz ${i+1} (${m.type})</strong> - ${open?"otwarty":"zamknięty"}<br>
        <input type="text" class="typeInput" data-index="${i}" ${!open?"disabled":""} value="${prevType}" placeholder="np. 13-11 / 2:1">
      </div><br>`;
  });
}

async function saveMyTypes(){
  const data = await getAllData();
  const userIndex = data.users.findIndex(u=>u.nick===localStorage.getItem("userToken"));
  if(userIndex===-1){alert("Błąd użytkownika"); return;}
  const inputs = document.querySelectorAll(".typeInput");
  const userTypes = Array.from(inputs).map(i=>({score:i.value}));
  data.users[userIndex].types = userTypes;
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
  const ranking = data.users.map(u=>({nick:u.nick,points:0}));
  ranking.forEach((r,i)=> table.innerHTML+=`<tr><td>${i+1}</td><td>${r.nick}</td><td>${r.points}</td></tr>`);
}

// ========================
// ADMIN PANEL
// ========================
async function loadAdminPanel(){
  if(localStorage.getItem("isAdmin")!=="true") return;
  const data = await getAllData();
  const container = document.getElementById("matchesContainer");
  container.innerHTML="";
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
  if(localStorage.getItem("isAdmin")!=="true"){alert("Brak dostępu");return;}
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
  await saveResultsBin(matches);
  alert("Zapisano wyniki!");
  loadAdminPanel();
}

// ========================
// GET ALL DATA
// ========================
async function getAllData(){
  const users = (await fetchUsers()).users;
  const matches = (await fetchResults()).matches;
  return {users,matches};
}
