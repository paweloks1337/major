
// JSONbin.io config
const API_KEY = "6925e616d0ea881f40ffb922";
const TYPES_BIN_ID = "6925e58cd0ea881f40ffb821";
const RESULTS_BIN_ID = "6925e5bbae596e708f707277";

// Admin credentials
const admins = { "paweloks":"haslo1", "matty":"haslo2" };

// Logowanie admina
function adminLogin() {
  const nick = document.getElementById("loginNick").value.trim().toLowerCase();
  const pass = document.getElementById("loginPassword").value.trim();
  const remember = document.getElementById("rememberMe").checked;
  if(admins[nick] && admins[nick] === pass){
    if(remember) localStorage.setItem("adminToken", nick);
    else sessionStorage.setItem("adminToken", nick);
    document.getElementById("loginModal").style.display = "none";
    document.getElementById("adminTabBtn").style.display="inline-block";
    loadAdminPanel();
    alert("Zalogowano!");
  } else alert("Błędny nick lub hasło!");
}

function checkAdmin() { return localStorage.getItem("adminToken") || sessionStorage.getItem("adminToken"); }

// Zakładki
function showTab(tabId){
  document.querySelectorAll(".tabContent").forEach(div=>div.style.display="none");
  document.getElementById(tabId).style.display="block";
}

// Token użytkownika
function generateToken() {
  let token = localStorage.getItem("userToken");
  if(!token){ token = crypto.randomUUID(); localStorage.setItem("userToken", token);}
  return token;
}

// Pobranie danych
async function getAllData(){
  const typesData = await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}/latest`,{headers:{"X-Master-Key":API_KEY}}).then(res=>res.json());
  const resultsData = await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}/latest`,{headers:{"X-Master-Key":API_KEY}}).then(res=>res.json());
  return { users: typesData.record.users||[], matches: resultsData.record.matches||[] };
}

// Form typów
async function loadTypes(){
  const data = await getAllData();
  const container = document.getElementById("typesContainer"); container.innerHTML="";
  data.matches.forEach((m,i)=>{
    const open = isMatchOpen(m.scheduled);
    container.innerHTML+=`
      <div>
        <strong>Mecz ${i+1} (${m.type})</strong> - ${open?"otwarty":"zamknięty"}<br>
        <input type="text" class="typeInput" data-index="${i}" data-type="${m.type}" ${!open?"disabled":""} placeholder="np. 13-11 / 2:1">
      </div><br>`;
  });
}

function isMatchOpen(matchTime){ return new Date() < new Date(matchTime); }

// Zapis typów
async function saveMyTypes(){
  const token = generateToken();
  const nick = prompt("Podaj swój nick:").trim();
  const inputs = document.querySelectorAll(".typeInput");
  const userTypes = Array.from(inputs).map(i=>({type:i.dataset.type, score:i.value}));
  let typesData = await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}/latest`,{headers:{"X-Master-Key":API_KEY}}).then(res=>res.json());
  let users = typesData.record.users||[];
  const index = users.findIndex(u=>u.token===token);
  const userData = { nick, token, types: userTypes };
  if(index>-1) users[index]=userData; else users.push(userData);
  await fetch(`https://api.jsonbin.io/v3/b/${TYPES_BIN_ID}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":API_KEY},body:JSON.stringify({users})});
  alert("Typy zapisane! Twój token: "+token);
}

// Ranking
async function generateRanking(){
  const data = await getAllData();
  const table = document.getElementById("rankingTable");
  table.innerHTML="<tr><th>#</th><th>Nick</th><th>Punkty</th></tr>";
  const ranking = data.users.map(u=>({nick:u.nick, points:calculatePoints(u.types,data.matches)}));
  ranking.sort((a,b)=>b.points-a.points);
  ranking.forEach((r,i)=>table.innerHTML+=`<tr><td>${i+1}</td><td>${r.nick}</td><td>${r.points}</td></tr>`);
}

// Liczenie punktów
function calculatePoints(userTypes, matches){
  let points=0;
  for(let i=0;i<matches.length;i++){
    const result = matches[i]; const user=userTypes[i]; if(!user) continue;
    if(result.type==="BO1"){ if(user.score===result.score) points+=5; else if(user.score.split("-")[0]===result.score.split("-")[0]) points+=3; }
    if(result.type==="BO3"){ if(user.score===result.score) points+=7; else if(user.score.split(":")[0]===result.score.split(":")[0]) points+=4; }
  }
  return points;
}

// Admin panel
async function loadAdminPanel(){
  if(!checkAdmin()){ alert("Brak dostępu!"); return; }
  const data = await getAllData();
  const container = document.getElementById("matchesContainer"); container.innerHTML="";
  data.matches.forEach((m,i)=>{
    container.innerHTML+=`
      <div>
        <strong>Mecz ${i+1} (${m.type})</strong><br>
        Data: <input type="datetime-local" value="${m.scheduled?new Date(m.scheduled).toISOString().slice(0,16):""}" class="adminDate" data-index="${i}"><br>
        Wynik: <input type="text" value="${m.score||""}" class="adminScore" data-index="${i}" placeholder="np. 13-11 / 2:1">
      </div><br>`;
  });
}

async function saveResults(){
  if(!checkAdmin()){ alert("Brak dostępu!"); return; }
  const dateInputs=document.querySelectorAll(".adminDate");
  const scoreInputs=document.querySelectorAll(".adminScore");
  const matches=[];
  for(let i=0;i<dateInputs.length;i++){
    matches.push({type:"BO1", scheduled:new Date(dateInputs[i].value).toISOString(), score:scoreInputs[i].value});
  }
  await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":API_KEY},body:JSON.stringify({matches})});
  alert("Wyniki zapisane!");
}

// Init
window.addEventListener("load", ()=>{
  showTab('types');
  loadTypes();
  generateRanking();
  if(!checkAdmin()) document.getElementById("adminTabBtn").style.display="none";
});
