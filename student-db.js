(function(){
  const cfg=window.MIDTERM_FIREBASE_CONFIG||{};
  let app=null,auth=null,db=null,A=null,F=null,currentUser=null;

  function normSeat(v){ return String(Number(String(v||"").trim())).padStart(2,"0"); }
  function accountEmail(cls,seat){
    // 沿用 Python 版本的學生學習帳號識別，已有帳號可直接使用同一組密碼。
    return `python1151-${String(cls||"").trim()}-${normSeat(seat)}@student.course115.local`;
  }

  async function init(){
    if(!cfg.enabled) return false;
    const [appMod,authMod,fsMod]=await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js"),
      import("https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js")
    ]);
    app=appMod.getApps().length?appMod.getApp():appMod.initializeApp(cfg);
    auth=authMod.getAuth(app); db=fsMod.getFirestore(app); A=authMod; F=fsMod;
    await authMod.setPersistence(auth,authMod.browserLocalPersistence);
    currentUser=auth.currentUser||null;
    return true;
  }

  const ready=init();

  async function loginOrCreate(cls,seat,password){
    await ready;
    const email=accountEmail(cls,seat);
    try{
      const c=await A.signInWithEmailAndPassword(auth,email,password);
      currentUser=c.user;
      return {created:false,uid:currentUser.uid,email};
    }catch(e){
      // 先嘗試建立帳號；若帳號已存在，表示密碼不正確。
      try{
        const c=await A.createUserWithEmailAndPassword(auth,email,password);
        currentUser=c.user;
        return {created:true,uid:currentUser.uid,email};
      }catch(createErr){
        if(createErr?.code==="auth/email-already-in-use"){
          const err=new Error("PASSWORD_MISMATCH");
          err.code="PASSWORD_MISMATCH";
          throw err;
        }
        throw createErr;
      }
    }
  }

  async function logout(){
    await ready;
    if(auth) await A.signOut(auth);
    currentUser=null;
  }

  function user(){ return currentUser||auth?.currentUser||null; }

  async function load(){
    await ready;
    const u=user(); if(!u) return null;
    const snap=await F.getDoc(F.doc(db,"midtermStudents",u.uid));
    return snap.exists()?snap.data():null;
  }

  async function save(payload){
    await ready;
    const u=user(); if(!u) throw new Error("NOT_SIGNED_IN");
    await F.setDoc(F.doc(db,"midtermStudents",u.uid),{
      uid:u.uid,
      className:String(payload.className||"").trim(),
      seatNo:String(Number(payload.seatNo||0)),
      name:String(payload.name||"").trim(),
      courseId:"midterm-review",
      stations:payload.stations||{},
      currentStation:String(payload.currentStation||"R1"),
      completedStations:Number(payload.completedStations||0),
      completed:!!payload.completed,
      totalRounds:Number(payload.totalRounds||0),
      totalWrongAnswers:Number(payload.totalWrongAnswers||0),
      weakTopics:Array.isArray(payload.weakTopics)?payload.weakTopics:[],
      updatedAt:F.serverTimestamp(),
      lastSeenAt:F.serverTimestamp()
    },{merge:true});
    return {ok:true};
  }

  window.MidtermDB={
    ready,loginOrCreate,logout,user,load,save,accountEmail
  };
})();