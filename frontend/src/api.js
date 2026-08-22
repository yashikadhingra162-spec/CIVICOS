import { createClient } from '@supabase/supabase-js';
const supabaseUrl=import.meta.env.VITE_SUPABASE_URL;
const supabaseKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY||import.meta.env.VITE_SUPABASE_ANON_KEY;
if(!supabaseUrl||!supabaseKey) throw new Error('Missing Supabase configuration.');
const supabase=createClient(supabaseUrl,supabaseKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const REPORTS_KEY='civicos-my-report-ids', CLUSTER_RADIUS_METERS=100;
const N8N_WEBHOOK_URL=import.meta.env.VITE_N8N_CIVICOS_WEBHOOK_URL||'';
const normStatus=s=>String(s||'pending').trim().toLowerCase();
export const statusLabel=s=>normStatus(s).replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());
const priorityFor=r=>clamp(Math.round(50+Number(r.verification_count||0)*5-Number(r.downvote_count||0)*10-Number(r.spam_score||0)*.25),5,100);
const markerColor=p=>p>=80?'#ef4444':p>=60?'#f97316':p>=40?'#eab308':'#22c55e';
const categoryOf=r=>String(r.category||'other').trim().toLowerCase();
function distanceMeters(a,b){const lat1=Number(a.latitude)*Math.PI/180,lat2=Number(b.latitude)*Math.PI/180,dLat=lat2-lat1,dLon=(Number(b.longitude)-Number(a.longitude))*Math.PI/180,h=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
function normalizeReport(r){const priority_score=priorityFor(r),marker_color=markerColor(priority_score),original=Array.isArray(r.image_urls)?r.image_urls.filter(Boolean):[],resolution=Array.isArray(r.resolution_image_urls)?r.resolution_image_urls.filter(Boolean):[];return {...r,title:r.title||'Civic issue',description:r.description||'',status:normStatus(r.status),moderation_status:normStatus(r.moderation_status),priority_score,priority_label:priority_score>=80?'CRITICAL':priority_score>=60?'HIGH':priority_score>=40?'MEDIUM':'LOW',marker_color,sidebarColor:marker_color,status_color:marker_color,preview_image:original[0]||null,resolution_images:resolution,all_images:[...original,...resolution],report_count:1,department:r.category||'Civic services',clustered:false,member_reports:[r]};}
export function clusterReports(rows,radius=CLUSTER_RADIUS_METERS){const items=rows.map(normalizeReport),parent=items.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a;};for(let i=0;i<items.length;i++){if(!Number.isFinite(+items[i].latitude)||!Number.isFinite(+items[i].longitude))continue;for(let j=i+1;j<items.length;j++){if(categoryOf(items[i])!==categoryOf(items[j])||!Number.isFinite(+items[j].latitude)||!Number.isFinite(+items[j].longitude))continue;if(distanceMeters(items[i],items[j])<=radius)join(i,j);}}const groups=new Map();items.forEach((x,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(x);});return [...groups.values()].map(members=>{const ordered=[...members].sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)),rep=ordered[0];if(members.length===1)return rep;const latitude=members.reduce((s,x)=>s+Number(x.latitude),0)/members.length,longitude=members.reduce((s,x)=>s+Number(x.longitude),0)/members.length,priority_score=clamp(Math.max(...members.map(x=>x.priority_score))+(members.length-1)*12,5,100),marker_color=markerColor(priority_score),status=members.map(x=>x.status).find(s=>!['resolved','verified','rejected'].includes(s))||rep.status;return {...rep,latitude,longitude,status,priority_score,priority_label:priority_score>=80?'CRITICAL':priority_score>=60?'HIGH':priority_score>=40?'MEDIUM':'LOW',marker_color,sidebarColor:marker_color,status_color:marker_color,report_count:members.length,clustered:true,member_reports:ordered,member_report_ids:ordered.map(x=>x.id),cluster_title:`${members.length} nearby reports`,title:`${rep.title} (${members.length} nearby reports)`};});}
function inferCategory(d){const t=d.toLowerCase();if(/pothole|road|street/.test(t))return'roads';if(/garbage|waste|trash|dump/.test(t))return'waste';if(/water|drain|sewer|flood|leak/.test(t))return'water';if(/light|electric|power|wire/.test(t))return'utilities';if(/tree|park|pollution|environment/.test(t))return'environment';if(/traffic|signal|crossing|accident/.test(t))return'traffic';return'other';}
const makeTitle=d=>{const x=d.trim().replace(/\s+/g,' ');return !x?'Civic issue':x.length>72?`${x.slice(0,69).trim()}...`:x;};
const ids=()=>{try{return JSON.parse(localStorage.getItem(REPORTS_KEY)||'[]')}catch{return[]}};
const remember=id=>localStorage.setItem(REPORTS_KEY,JSON.stringify([...new Set([id,...ids()])].slice(0,100)));
const forget=id=>localStorage.setItem(REPORTS_KEY,JSON.stringify(ids().filter(x=>x!==id)));
const fingerprint=()=>{let x=localStorage.getItem('civicos-voter-fingerprint');if(!x){x=crypto.randomUUID();localStorage.setItem('civicos-voter-fingerprint',x)}return x};
async function fetchReports(params=''){const q=new URLSearchParams(params.startsWith('?')?params.slice(1):params),requested=q.get('status');let query=supabase.from('reports').select('*').eq('moderation_status','approved').order('created_at',{ascending:false});if(requested)query=query.eq('status',normStatus(requested));const {data,error}=await query;if(error)throw error;return data||[];}
export async function getIncidents(params=''){return {incidents:clusterReports(await fetchReports(params))};}
export async function getRawIncidents(params=''){return {incidents:(await fetchReports(params)).map(normalizeReport)};}
export async function getMyReports(){const list=ids();if(!list.length)return{incidents:[]};const {data,error}=await supabase.from('reports').select('*').in('id',list).order('created_at',{ascending:false});if(error)throw error;return{incidents:clusterReports(data||[])}}
export async function getIncident(id){const {data,error}=await supabase.from('reports').select('*').eq('id',id).single();if(error)throw error;return normalizeReport(data)}
export async function getStats(){const rows=await fetchReports();return clusterReports(rows).reduce((s,r)=>{if(r.priority_score>=80)s.critical++;else if(r.priority_score>=60)s.high++;else if(r.priority_score>=40)s.medium++;if(['resolved','verified'].includes(r.status))s.resolved++;return s},{critical:0,high:0,medium:0,resolved:0})}
export async function getHotspots(){const clusters=clusterReports(await fetchReports());return{hotspots:clusters.filter(x=>x.report_count>1).map(x=>({category:x.category||'other',latitude:x.latitude,longitude:x.longitude,report_count:x.report_count,locations:x.report_count,priority_score:x.priority_score}))}}

async function notifyAuthority(report){
  if(!N8N_WEBHOOK_URL) return {sent:false,skipped:true};
  const payload={
    report_id:report.id,
    incident_id:report.id,
    title:report.title,
    description:report.description,
    category:report.category,
    severity:report.priority_label||'LOW',
    priority_score:report.priority_score,
    status:report.status,
    moderation_status:report.moderation_status,
    address:report.address||'',
    location:report.address||`${report.latitude}, ${report.longitude}`,
    latitude:report.latitude,
    longitude:report.longitude,
    coordinates:`${report.latitude}, ${report.longitude}`,
    image_url:Array.isArray(report.image_urls)?report.image_urls[0]||'':'',
    image_urls:Array.isArray(report.image_urls)?report.image_urls:[],
    created_at:report.created_at||new Date().toISOString()
  };
  try{
    const response=await fetch(N8N_WEBHOOK_URL,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true});
    if(!response.ok){let detail='n8n notification failed';try{const body=await response.json();detail=body?.message||body?.error||detail}catch{};console.warn('[CIVICOS] authority notification failed:',detail)}
    return {sent:response.ok,status:response.status};
  }catch(error){console.warn('[CIVICOS] authority notification request failed:',error);return {sent:false,error:true};}
}

export async function createReport(input){const id=crypto.randomUUID(),description=input.description.trim(),category=input.category||inferCategory(description),report={id,title:makeTitle(description),description,category,status:'pending',latitude:Number(input.latitude),longitude:Number(input.longitude),address:input.address||null,image_urls:input.image_url?[input.image_url]:[],spam_score:0,duplicate_score:0,moderation_status:'approved',verification_count:0,downvote_count:0};const {data,error}=await supabase.from('reports').insert(report).select().single();if(error)throw error;remember(id);const saved=data||report;void notifyAuthority(saved);return{report_id:id,incident_id:id,report:normalizeReport(saved)}}
export async function deleteReport(id){const {error}=await supabase.from('reports').delete().eq('id',id);if(error)throw error;forget(id);return true}
export async function voteReport(id,type='verify'){type=type==='upvote'?'verify':type==='downvote'?'dispute':type;const {data,error}=await supabase.from('report_votes').insert({report_id:id,vote_type:type,voter_fingerprint:fingerprint()}).select().single();if(error)throw error;return data}
async function adminRequest(path,options={}){const response=await fetch(`/api/admin/${path}`,{credentials:'include',headers:{'Content-Type':'application/json',...(options.headers||{})},...options}),body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.detail||'Admin request failed');return body}
export const adminLogin=password=>adminRequest('login',{method:'POST',body:JSON.stringify({password})});export const adminSession=()=>adminRequest('session',{method:'GET'});export const adminLogout=()=>adminRequest('logout',{method:'POST'});export const assignIncident=(id,payload={})=>adminRequest(`reports/${encodeURIComponent(id)}/assign`,{method:'PATCH',body:JSON.stringify(payload)});export const setStatus=(id,status)=>adminRequest(`reports/${encodeURIComponent(id)}/status`,{method:'PATCH',body:JSON.stringify({status})});export const verifyIncident=(id,payload={})=>adminRequest(`reports/${encodeURIComponent(id)}/verify`,{method:'POST',body:JSON.stringify(payload)});export {supabase};