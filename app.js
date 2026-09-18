const CFG = window.BOARD_CONFIG;
const state = { posts: [], selectedPost: null };
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
  document.querySelectorAll(".column-add").forEach(el=>el.addEventListener("click",()=>openPost(el.dataset.cat)));
}
function cardHtml(p){
  const preview=p.fileUrl&&/\.(png|jpe?g|gif|webp)(\?|$)/i.test(p.fileName||p.fileUrl)?`<img class="preview" src="${esc(p.fileUrl)}" alt="">`:"";
  const badges=[p.fileName?`<span class="badge">${esc(p.fileName.split(".").pop().toUpperCase())}</span>`:"",p.linkUrl?'<span class="badge">LINK</span>':""].join("");
  return `<article class="card" data-id="${esc(p.id)}"><div class="meta">${esc(p.author||"익명")} · ${esc(p.createdAt||"")}</div><h3>${esc(p.title)}</h3>${preview}<div class="excerpt">${esc((p.content||"").slice(0,180))}</div><div class="badges">${badges}</div><div class="card-footer"><span>${esc(p.category)}</span><span>💬 ${Number(p.commentCount||0)}</span></div></article>`;
}
function openPost(cat=""){ $("#postForm").reset(); $("#category").value=cat||CFG.categories[0]; $("#postDialog").showModal(); }
async function fileToBase64(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]||"");r.onerror=reject;r.readAsDataURL(file);});}
async function submitPost(e){
  e.preventDefault(); const btn=$("#submitPostBtn"); btn.disabled=true; btn.textContent="업로드 중...";
  try{
    const file=$("#fileInput").files[0];
    if(file&&file.size>CFG.maxUploadMB*1024*1024) throw new Error(`파일은 ${CFG.maxUploadMB}MB 이하만 가능합니다.`);
    const payload={action:"createPost",category:$("#category").value,author:$("#author").value.trim(),title:$("#title").value.trim(),content:$("#content").value.trim(),linkUrl:$("#linkUrl").value.trim(),classCode:CFG.classCode||"",fileName:file?file.name:"",mimeType:file?file.type:"",fileBase64:file?await fileToBase64(file):""};
    await postNoCors(payload); $("#postDialog").close(); status("게시 중... 잠시 후 자동 반영됩니다."); setTimeout(loadPosts,2200);
  }catch(e){alert(e.message);}finally{btn.disabled=false;btn.textContent="바로 게시";}
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