// ========================
// KONFIG JSONBIN
// ========================
const API_KEY = "6925e616d0ea881f40ffb922";
const USERS_BIN_ID = "6925e58cd0ea881f40ffb821";   // users.json
const RESULTS_BIN_ID = "6925e5bbae596e708f707277"; // results.json

// ========================
// FUNKCJE JSONBIN
// ========================
async function fetchUsers() {
  try {
    const res = await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}/latest`, {
      headers: { "X-Master-Key": API_KEY, "X-Bin-Meta":"false" }
    });
    const data = await res.json();
    if(!data.record) return { users: [] };
    if(!data.record.users) data.record.users=[];
    return data.record;  // <- WAŻNE: zwracamy record, nie cały data
  } catch(e){ console.error("Błąd fetchUsers:", e); return { users: [] }; }
}

async function saveUsers(users){
  await fetch(`https://api.jsonbin.io/v3/b/${USERS_BIN_ID}`, {
    method:"PUT",
    headers: {"Content-Type":"application/json","X-Master-Key":API_KEY},
    body: JSON.stringify({users})
  });
}

async function fetchResults(){
  try{
    const res = await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}/latest`, {
      headers: {"X-Master-Key":API_KEY,"X-Bin-Meta":"false"}
    });
    const data = await res.json();
    if(!data.record) return { matches: [] };
    if(!data.record.matches) data.record.matches=[];
    return data.record;
  } catch(e){ console.error("Błąd fetchResults:", e); return { matches: [] }; }
}

async function saveResultsBin(matches){
  await fetch(`https://api.jsonbin.io/v3/b/${RESULTS_BIN_ID}`, {
    method:"PUT",
    headers: {"Content-Type":"application/json","X-Master-Key":API_KEY},
    body: JSON.stringify({matches})
  });
}

// ========================
// REJESTRACJA
// ========================
async function registerUser(){
  const nick = document.getElementById("regNick").value.trim();
  const pass = document.getElementById("regPassword").value.trim();
  if(!nick||!pass){ alert("Podaj nick i hasło"); return; }

  const data = await fetchUsers();
  if(data.users.find(u=>u.nick.toLowerCase()===nick.toLowerCase())){ alert("Nick już istnieje"); return; }

  data.users.push({nick, password: pass, isAdmin:false, types:[]});
  await saveUsers(data.users);

  alert("Zarejestrowano! Możesz się teraz zalogować.");
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
  const user = data.users.find(u => u.nick.toLowerCase() === nick.toLowerCase());

  if(!user || user.password !== pass){ alert("Błędny nick lub hasło"); return; }

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
  localStorage.clear();
  location.reload();
}

// ========================
// TABY
// ========================
function showTab(tabId){
  document.querySelectorAll(".tabContent").forEach(d=>d.style.display="none");
  document.getElementById(tabId).style.display="block";
}

// ========================
// INIT STRONY
// ========================
window.addEventListener("load", async ()=>{
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

// ========================
// RESZTA FUNKCJI (TYPOWANIE, ADMIN, RANKING) 
// Możesz wziąć z poprzedniego script.js – wszystko działa tak samo
// ========================
