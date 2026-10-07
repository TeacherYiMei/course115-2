(async function(){
  const cfg=window.MIDTERM_FIREBASE_CONFIG;
  const [appMod,A,F]=await Promise.all([
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
  ]);
  const app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(cfg);
  const auth=A.getAuth(app),db=F.getFirestore(app);
  await A.setPersistence(auth,A.browserLocalPersistence);

  const $=s=>document.querySelector(s);
  let teacher=null,allRows=[];

  function allowed(){return teacher?.role==="admin"?null:(teacher?.classes||[]).map(String)}
  function canClass(c){return teacher?.role==="admin" || (allowed()||[]).includes(String(c))}
  function fmt(ts){try{return ts?.toDate?ts.toDate().toLocaleString("zh-TW"):""}catch(e){return ""}}
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}

  async function readTeacher(){
    const u=auth.currentUser;if(!u)return null;
    const snap=await F.getDoc(F.doc(db,"teachers",u.uid));
    return snap.exists()?snap.data():null;
  }

  async function login(){
    $("#loginError").textContent="";
    try{
      await A.signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);
      teacher=await readTeacher();
      if(!teacher || !["teacher","admin"].includes(teacher.role)){
        await A.signOut(auth);throw new Error("這個帳號沒有教師權限。");
      }
      showApp();await loadRows();
    }catch(e){$("#loginError").textContent=e?.message||"登入失敗";}
  }

  function showApp(){
    $("#loginCard").classList.add("hidden");$("#app").classList.remove("hidden");
    $("#teacherName").textContent=teacher.displayName||"教師";
    const classes=teacher.role==="admin"?["全部班級"]:(teacher.classes||[]).map(String).sort();
    $("#classFilter").innerHTML=(teacher.role==="admin"?'<option value="">全部班級</option>':"")+
      classes.filter(x=>x!=="全部班級").map(c=>`<option value="${esc(c)}">${esc(c)} 班</option>`).join("");
  }

  async function loadRows(){
    $("#status").textContent="讀取中…";
    const col=F.collection(db,"midtermStudents");
    let docs=[];
    if(teacher.role==="admin"){
      const snap=await F.getDocs(col);docs=snap.docs;
    }else{
      for(const c of (teacher.classes||[])){
        const q=F.query(col,F.where("className","==",String(c)));
        const snap=await F.getDocs(q);docs.push(...snap.docs);
      }
    }
    allRows=docs.map(d=>({id:d.id,...d.data()}));
    render();
    $("#status").textContent=`最後更新：${new Date().toLocaleTimeString("zh-TW")}`;
  }

  function filtered(){
    const c=$("#classFilter").value;
    return allRows.filter(r=>!c||String(r.className)===c)
      .sort((a,b)=>String(a.className).localeCompare(String(b.className),"zh-Hant")||Number(a.seatNo)-Number(b.seatNo));
  }

  function stationBadge(r,id){
    const s=r.stations?.[id]||{};
    if(s.completed)return `<span class="badge done">完成</span>`;
    if(s.rounds)return `<span class="badge warn">${Number(s.rounds)} 輪</span>`;
    return `<span class="badge">—</span>`;
  }

  function render(){
    const rows=filtered();
    $("#mStudents").textContent=rows.length;
    $("#mDone").textContent=rows.filter(r=>r.completed).length;
    $("#mStations").textContent=rows.length?(rows.reduce((a,r)=>a+Number(r.completedStations||0),0)/rows.length).toFixed(1):"0";
    $("#mWrong").textContent=rows.reduce((a,r)=>a+Number(r.totalWrongAnswers||0),0);

    $("#rows").innerHTML=rows.map(r=>`<tr>
      <td>${esc(r.className)}</td><td>${esc(r.seatNo)}</td><td>${esc(r.name)}</td>
      <td>${stationBadge(r,"R1")}</td><td>${stationBadge(r,"R2")}</td><td>${stationBadge(r,"R3")}</td><td>${stationBadge(r,"R4")}</td>
      <td>${Number(r.completedStations||0)} / 4</td>
      <td>${Number(r.totalWrongAnswers||0)}</td>
      <td>${esc((r.weakTopics||[]).join("、")||"—")}</td>
      <td>${esc(fmt(r.updatedAt)||"—")}</td>
      <td>
        <button class="soft detailBtn" data-id="${esc(r.id)}">明細</button>
        <button class="soft resetBtn" data-id="${esc(r.id)}">重設</button>
        <button class="danger deleteBtn" data-id="${esc(r.id)}">刪除紀錄</button>
      </td>
    </tr>`).join("");

    document.querySelectorAll(".detailBtn").forEach(b=>b.onclick=()=>detail(b.dataset.id));
    document.querySelectorAll(".resetBtn").forEach(b=>b.onclick=()=>resetRec(b.dataset.id));
    document.querySelectorAll(".deleteBtn").forEach(b=>b.onclick=()=>deleteRec(b.dataset.id));
  }

  function detail(id){
    const r=allRows.find(x=>x.id===id);if(!r)return;
    $("#detailTitle").textContent=`${r.className} 班｜${r.seatNo} 號｜${r.name}`;
    $("#stationDetail").innerHTML=["R1","R2","R3","R4"].map(id=>{
      const s=r.stations?.[id]||{};
      return `<div class="stationBox"><h4>${id}</h4>
        <div>${s.completed?"✅ 已完成":"尚未完成"}</div>
        <div>第一輪答對：${Number(s.firstRoundCorrect||0)} / 10</div>
        <div>重練輪數：${Number(s.rounds||0)}</div>
        <div>錯題次數：${Number(s.totalWrongAnswers||0)}</div>
        <div class="muted">弱點：${esc((s.weakTopics||[]).join("、")||"—")}</div>
      </div>`;
    }).join("");
    $("#detailWeak").textContent=(r.weakTopics||[]).join("、")||"—";
    $("#detailDialog").showModal();
  }

  async function resetRec(id){
    const r=allRows.find(x=>x.id===id);if(!r||!canClass(r.className))return;
    if(prompt(`要重設 ${r.className} 班 ${r.seatNo} 號 ${r.name} 的期中複習進度，請輸入「重設」：`)!=="重設")return;
    await F.updateDoc(F.doc(db,"midtermStudents",id),{
      stations:{},currentStation:"R1",completedStations:0,completed:false,totalRounds:0,totalWrongAnswers:0,weakTopics:[],updatedAt:F.serverTimestamp()
    });
    await loadRows();
  }

  async function deleteRec(id){
    const r=allRows.find(x=>x.id===id);if(!r||!canClass(r.className))return;
    if(!confirm(`確定刪除 ${r.className} 班 ${r.seatNo} 號 ${r.name} 的「期中複習紀錄」？\n\n不會刪除 Firebase Authentication 學習帳號。`))return;
    await F.deleteDoc(F.doc(db,"midtermStudents",id));await loadRows();
  }

  function exportXlsx(){
    const rows=filtered().map(r=>({
      班級:r.className,座號:r.seatNo,姓名:r.name,
      R1:r.stations?.R1?.completed?"完成":"未完成",
      R1第一輪答對:r.stations?.R1?.firstRoundCorrect??"",
      R1輪數:r.stations?.R1?.rounds??"",
      R2:r.stations?.R2?.completed?"完成":"未完成",
      R2第一輪答對:r.stations?.R2?.firstRoundCorrect??"",
      R2輪數:r.stations?.R2?.rounds??"",
      R3:r.stations?.R3?.completed?"完成":"未完成",
      R3第一輪答對:r.stations?.R3?.firstRoundCorrect??"",
      R3輪數:r.stations?.R3?.rounds??"",
      R4:r.stations?.R4?.completed?"完成":"未完成",
      R4第一輪答對:r.stations?.R4?.firstRoundCorrect??"",
      R4輪數:r.stations?.R4?.rounds??"",
      完成站數:Number(r.completedStations||0),
      累計錯題:Number(r.totalWrongAnswers||0),
      弱點主題:(r.weakTopics||[]).join("、")
    }));
    const ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"期中複習進度");
    XLSX.writeFile(wb,`期中考複習進度_${$("#classFilter").value||"全部"}.xlsx`);
  }

  $("#loginBtn").onclick=login;
  $("#password").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
  $("#refreshBtn").onclick=loadRows;$("#classFilter").onchange=render;$("#exportBtn").onclick=exportXlsx;
  $("#logoutBtn").onclick=async()=>{await A.signOut(auth);location.reload()};

  if(auth.currentUser){
    teacher=await readTeacher();
    if(teacher&&["teacher","admin"].includes(teacher.role)){showApp();await loadRows();}
  }
})();