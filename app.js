const CFG = window.BOARD_CONFIG;
const state = { posts: [], selectedPost: null, editingPost: null };
const $ = (s) => document.querySelector(s);
const esc = (v="") => String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
function status(msg=""){ $("#status").textContent = msg; }
function apiReady(){ return CFG.apiUrl && !CFG.apiUrl.includes("PASTE_YOUR_"); }
function jsonp(action, params={}) {
  return new Promise((resolve, reject) => {
    if (!apiReady()) return reject(new Error("config.js에 Apps Script URL을 입력하세요."));
    const cb = "__cb_" + Date.now() + "_" + Math.random().toString(36).slice(2);
    const script = document.createElement("script");
    const qs = new URLSearchParams({action, callback:cb, ...params});
    window[cb] = (data) => { resolve(data); cleanup(); };
    const timer = setTimeout(()=>{ reject(new Error("서버 응답 시간 초과")); cleanup(); }, 15000);
    function cleanup(){ clearTimeout(timer); delete window[cb]; script.remove(); }
    script.onerror = ()=>{ reject(new Error("데이터를 불러오지 못했습니다.")); cleanup(); };
    script.src = CFG.apiUrl + "?" + qs.toString();
    document.body.appendChild(script);
  });
}
function postNoCors(payload) {
  if (!apiReady()) throw new Error("config.js에 Apps Script URL을 입력하세요.");
  return fetch(CFG.apiUrl,{method:"POST",mode:"no-cors",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:new URLSearchParams(payload)});
}
async function loadPosts(){
  status("게시물 불러오는 중...");
  try{ const res=await jsonp("listPosts"); if(!res.ok) throw new Error(res.error||"게시물 조회 실패"); state.posts=res.posts||[]; renderBoard(); status(`${state.posts.length}개 게시물`); }
  catch(e){ status(e.message); renderBoard(); }
}
function renderBoard(){
  const q=($("#searchInput").value||"").trim().toLowerCase();
  const posts=state.posts.filter(p=>!q||[p.title,p.author,p.content,p.category].join(" ").toLowerCase().includes(q));
  $("#board").innerHTML=CFG.categories.map(cat=>{const items=posts.filter(p=>p.category===cat);return `<section class="column"><div class="column-head"><span>${esc(cat)}</span><span class="column-count">${items.length}</span></div><button class="column-add" data-cat="${esc(cat)}">＋</button><div class="cards">${items.length?items.map(cardHtml).join(""):'<div class="empty">아직 게시물이 없습니다.</div>'}</div></section>`;}).join("");
  document.querySelectorAll(".card").forEach(el=>el.addEventListener("click",()=>openDetail(el.dataset.id)));
  document.querySelectorAll(".card-action").forEach(el=>el.addEventListener("click",e=>{
    e.stopPropagation();
    if(el.dataset.action==="edit") openEdit(el.dataset.id);
    else if(el.dataset.action==="delete") deletePost(el.dataset.id);
  }));
  document.querySelectorAll(".column-add").forEach(el=>el.addEventListener("click",()=>openPost(el.dataset.cat)));
}
function cardHtml(p){
  const preview=p.fileUrl&&/\.(png|jpe?g|gif|webp)(\?|$)/i.test(p.fileName||p.fileUrl)?`<img class="preview" src="${esc(p.fileUrl)}" alt="">`:"";
  const badges=[p.fileName?`<span class="badge">${esc(p.fileName.split(".").pop().toUpperCase())}</span>`:"",p.linkUrl?'<span class="badge">LINK</span>':""].join("");
  return `<article class="card" data-id="${esc(p.id)}"><div class="meta">${esc(p.author||"익명")} · ${esc(p.createdAt||"")}</div><h3>${esc(p.title)}</h3>${preview}<div class="excerpt">${esc((p.content||"").slice(0,180))}</div><div class="badges">${badges}</div><div class="card-footer"><span>${esc(p.category)}</span><span>💬 ${Number(p.commentCount||0)}</span></div><div class="card-actions"><button type="button" class="card-action" data-action="edit" data-id="${esc(p.id)}">✎ 수정</button><button type="button" class="card-action danger" data-action="delete" data-id="${esc(p.id)}">🗑 삭제</button></div></article>`;
}
function openPost(cat=""){
  state.editingPost=null;
  $("#postForm").reset();
  $("#category").value=cat||CFG.categories[0];
  $("#postDialogTitle").textContent="게시물 올리기";
  $("#submitPostBtn").textContent="바로 게시";
  $("#adminPinRow").hidden=true;
  $("#adminPin").required=false;
  $("#fileInput").disabled=false;
  $("#postDialog").showModal();
}
function openEdit(id){
  const p=state.posts.find(x=>String(x.id)===String(id)); if(!p)return;
  state.editingPost=p;
  $("#postForm").reset();
  $("#category").value=p.category;
  $("#author").value=p.author||"";
  $("#title").value=p.title||"";
  $("#content").value=p.content||"";
  $("#linkUrl").value=p.linkUrl||"";
  $("#fileInput").disabled=true;
  $("#adminPinRow").hidden=false;
  $("#adminPin").required=true;
  $("#postDialogTitle").textContent="게시물 수정";
  $("#postNote").textContent="기존 첨부파일은 유지됩니다. 파일 교체 기능은 추후 제공됩니다.";
  $("#submitPostBtn").textContent="수정 저장";
  $("#postDialog").showModal();
}
async function refreshUntil(check, successText){
  for(let i=0;i<6;i++){
    await new Promise(r=>setTimeout(r,1100+i*450));
    try{
      const res=await jsonp("listPosts");
      if(!res.ok)continue;
      state.posts=res.posts||[];renderBoard();
      if(check(state.posts)){status(successText);return true;}
    }catch(_){}
  }
  status("처리 결과를 확인하지 못했습니다. 시트를 확인하고 다시 시도해 주세요.");
  return false;
}
async function deletePost(id){
  const p=state.posts.find(x=>String(x.id)===String(id)); if(!p)return;
  if(!window.confirm(`「${p.title}」 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`))return;
  const pin=window.prompt("삭제하려면 관리자 비밀번호를 입력하세요.");
  if(pin===null)return;
  if(!pin.trim()){alert("관리자 비밀번호를 입력하세요.");return;}
  try{
    status("삭제 처리 및 결과 확인 중...");
    await postNoCors({action:"deletePost",postId:id,adminPin:pin});
    await refreshUntil(posts=>!posts.some(x=>String(x.id)===String(id)),"게시물이 삭제되었습니다.");
  }catch(e){status(e.message);}
}
async function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.onerror=reject;r.readAsDataURL(file);});}
async function submitPost(e){
  e.preventDefault(); const btn=$("#submitPostBtn"); btn.disabled=true; btn.textContent="업로드 중...";
  try{
    const file=$("#fileInput").files[0];
    if(file&&file.size>CFG.maxUploadMB*1024*1024) throw new Error(`파일은 ${CFG.maxUploadMB}MB 이하만 가능합니다.`);
    const editing=state.editingPost;
    const payload={action:editing?"updatePost":"createPost",postId:editing?editing.id:"",adminPin:editing?$("#adminPin").value:"",category:$("#category").value,author:$("#author").value.trim(),title:$("#title").value.trim(),content:$("#content").value.trim(),linkUrl:$("#linkUrl").value.trim(),classCode:CFG.classCode||"",fileName:file?file.name:"",mimeType:file?file.type:"",fileBase64:file?await fileToBase64(file):""};
    await postNoCors(payload);
    if(editing){
      const ok=await refreshUntil(posts=>posts.some(x=>String(x.id)===String(editing.id)&&x.title===payload.title&&x.content===payload.content&&x.author===payload.author&&x.category===payload.category&&x.linkUrl===payload.linkUrl),"게시물이 수정되었습니다.");
      if(ok){$("#postDialog").close();state.editingPost=null;}
    } else {
      $("#postDialog").close();
      status("게시물 등록 결과 확인 중...");
      await refreshUntil(posts=>posts.some(x=>x.title===payload.title&&x.content===payload.content&&x.author===payload.author),"게시물이 등록되었습니다.");
    }
  }catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent=state.editingPost?"수정 저장":"바로 게시";}
}
async function openDetail(id){
  const p=state.posts.find(x=>String(x.id)===String(id));if(!p)return;state.selectedPost=p;$("#detailTitle").textContent=p.title;
  $("#detailBody").innerHTML=`<div class="detail-meta">${esc(p.author||"익명")} · ${esc(p.createdAt||"")} · ${esc(p.category||"")}</div><div class="detail-content">${esc(p.content||"")}</div>${p.linkUrl?`<a class="detail-link" href="${esc(p.linkUrl)}" target="_blank" rel="noopener">외부 링크 열기 ↗</a><br>`:""}${p.fileUrl?`<a class="detail-link" href="${esc(p.fileUrl)}" target="_blank" rel="noopener">첨부파일 열기: ${esc(p.fileName||"파일")} ↗</a>`:""}`;
  $("#comments").innerHTML="댓글 불러오는 중...";$("#detailDialog").showModal();
  try{const res=await jsonp("listComments",{postId:id});if(!res.ok)throw new Error(res.error||"댓글 조회 실패");const cs=res.comments||[];$("#comments").innerHTML=cs.length?`<div class="comments">${cs.map(c=>`<div class="comment"><b>${esc(c.author||"익명")}</b><p>${esc(c.text||"")}</p><small>${esc(c.createdAt||"")}</small></div>`).join("")}</div>`:'<div class="empty">첫 댓글을 남겨보세요.</div>';}catch(e){$("#comments").textContent=e.message;}
}
async function submitComment(e){
  e.preventDefault();if(!state.selectedPost)return;
  try{await postNoCors({action:"createComment",postId:state.selectedPost.id,author:$("#commentAuthor").value.trim(),text:$("#commentText").value.trim(),classCode:CFG.classCode||""});$("#commentForm").reset();setTimeout(()=>openDetail(state.selectedPost.id),1800);setTimeout(loadPosts,2000);}catch(e){alert(e.message);}
}
function init(){
  document.title=CFG.boardTitle;$("#boardTitle").textContent=CFG.boardTitle;$("#category").innerHTML=CFG.categories.map(c=>`<option>${esc(c)}</option>`).join("");
  $("#openPostBtn").addEventListener("click",()=>openPost());$("#refreshBtn").addEventListener("click",loadPosts);$("#searchInput").addEventListener("input",renderBoard);$("#postForm").addEventListener("submit",submitPost);$("#commentForm").addEventListener("submit",submitComment);
  document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>document.getElementById(b.dataset.close).close()));loadPosts();
}
init();