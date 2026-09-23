const SETTINGS = {
  SPREADSHEET_ID: '19VX-pjaiYJvDxKYxY3W_Dt6zJAm9MKBvpHh6NhqeaAc',
  DRIVE_FOLDER_ID: '1rkh8Mkgp1g7IUBVkrzAmKr6pAt7qBklj',
  POSTS_SHEET: 'Posts',
  COMMENTS_SHEET: 'Comments'
};
function setup(){const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID);ensureSheet_(ss,SETTINGS.POSTS_SHEET,['id','category','author','title','content','linkUrl','fileName','fileUrl','createdAt']);ensureSheet_(ss,SETTINGS.COMMENTS_SHEET,['id','postId','author','text','createdAt']);}
function ensureSheet_(ss,name,headers){let sh=ss.getSheetByName(name);if(!sh)sh=ss.insertSheet(name);if(sh.getLastRow()===0)sh.appendRow(headers);return sh;}
function doGet(e){try{setup();const action=String((e.parameter&&e.parameter.action)||'listPosts');let payload;if(action==='listPosts')payload=listPosts_();else if(action==='listComments')payload=listComments_(e.parameter.postId||'');else payload={ok:false,error:'Unknown action'};return output_(payload,e.parameter&&e.parameter.callback);}catch(err){return output_({ok:false,error:String(err.message||err)},e.parameter&&e.parameter.callback);}}
function doPost(e){try{setup();const p=e.parameter||{};let result;if(p.action==='createPost')result=createPost_(p);else if(p.action==='createComment')result=createComment_(p);else if(p.action==='updatePost')result=updatePost_(p);else if(p.action==='deletePost')result=deletePost_(p);else result={ok:false,error:'Unknown action'};return output_(result);}catch(err){return output_({ok:false,error:String(err.message||err)});}}
function createPost_(p){const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID),sh=ss.getSheetByName(SETTINGS.POSTS_SHEET),id=Utilities.getUuid();let fileUrl='',fileName=String(p.fileName||'').trim();if(p.fileBase64&&fileName){const bytes=Utilities.base64Decode(p.fileBase64),blob=Utilities.newBlob(bytes,p.mimeType||'application/octet-stream',fileName),folder=DriveApp.getFolderById(SETTINGS.DRIVE_FOLDER_ID),file=folder.createFile(blob);try{file.setSharing(DriveApp.Access.ANYONE_WITH_LINK,DriveApp.Permission.VIEW);}catch(_){}fileUrl=file.getUrl();}const createdAt=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Seoul','yyyy-MM-dd HH:mm');sh.appendRow([id,String(p.category||''),String(p.author||''),String(p.title||''),String(p.content||''),String(p.linkUrl||''),fileName,fileUrl,createdAt]);return {ok:true,id:id};}
function createComment_(p){if(!p.postId)throw new Error('postId가 없습니다.');const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID),sh=ss.getSheetByName(SETTINGS.COMMENTS_SHEET),id=Utilities.getUuid(),createdAt=Utilities.formatDate(new Date(),Session.getScriptTimeZone()||'Asia/Seoul','yyyy-MM-dd HH:mm');sh.appendRow([id,String(p.postId),String(p.author||''),String(p.text||''),createdAt]);return {ok:true,id:id};}
function listPosts_(){const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID),posts=rowsAsObjects_(ss.getSheetByName(SETTINGS.POSTS_SHEET)),cs=rowsAsObjects_(ss.getSheetByName(SETTINGS.COMMENTS_SHEET)),count={};cs.forEach(c=>count[c.postId]=(count[c.postId]||0)+1);posts.forEach(p=>p.commentCount=count[p.id]||0);posts.reverse();return {ok:true,posts:posts};}
function listComments_(postId){const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID),comments=rowsAsObjects_(ss.getSheetByName(SETTINGS.COMMENTS_SHEET)).filter(x=>String(x.postId)===String(postId));return {ok:true,comments:comments};}
function rowsAsObjects_(sh){const values=sh.getDataRange().getDisplayValues();if(values.length<2)return[];const headers=values[0];return values.slice(1).filter(r=>r.some(Boolean)).map(r=>{const o={};headers.forEach((h,i)=>o[h]=r[i]||'');return o;});}
function output_(obj,callback){const json=JSON.stringify(obj);if(callback)return ContentService.createTextOutput(String(callback).replace(/[^\w$.]/g,'')+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);}

function assertAdmin_(pin){
  const secret=PropertiesService.getScriptProperties().getProperty('ADMIN_PIN');
  if(!secret||secret.length<4)throw new Error('관리자 비밀번호가 설정되지 않았습니다.');
  if(String(pin||'')!==secret)throw new Error('관리자 비밀번호가 올바르지 않습니다.');
}
function findPostRow_(sh,postId){
  const ids=sh.getRange(2,1,Math.max(sh.getLastRow()-1,1),1).getDisplayValues();
  const idx=ids.findIndex(row=>String(row[0])===String(postId));
  if(idx<0)throw new Error('게시물을 찾을 수 없습니다.');
  return idx+2;
}
function updatePost_(p){
  assertAdmin_(p.adminPin);
  if(!p.postId||!String(p.title||'').trim()||!String(p.author||'').trim())throw new Error('필수 입력값이 없습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const sh=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID).getSheetByName(SETTINGS.POSTS_SHEET);
    const row=findPostRow_(sh,p.postId);
    sh.getRange(row,2,1,5).setValues([[String(p.category||''),String(p.author||''),String(p.title||''),String(p.content||''),String(p.linkUrl||'')]]);
    return {ok:true,id:p.postId};
  }finally{lock.releaseLock();}
}
function deletePost_(p){
  assertAdmin_(p.adminPin);
  if(!p.postId)throw new Error('게시물 ID가 없습니다.');
  const lock=LockService.getScriptLock();lock.waitLock(10000);
  try{
    const ss=SpreadsheetApp.openById(SETTINGS.SPREADSHEET_ID);
    const sh=ss.getSheetByName(SETTINGS.POSTS_SHEET);
    sh.deleteRow(findPostRow_(sh,p.postId));
    const comments=ss.getSheetByName(SETTINGS.COMMENTS_SHEET);
    for(let row=comments.getLastRow();row>=2;row--){
      if(String(comments.getRange(row,2).getDisplayValue())===String(p.postId))comments.deleteRow(row);
    }
    return {ok:true,id:p.postId};
  }finally{lock.releaseLock();}
}
