export interface SandboxFile { fileId:string; name:string; size:number; sha256:string; sandboxPath:string }
export interface SandboxWorkspace { workspaceId:string; title:string; files:SandboxFile[] }
export interface SandboxArtifact { artifactId:string; versionId:string; name:string; size:number; sha256:string }
export interface SandboxRun { workspaceId:string;runId:string;inputFingerprint:string;executionStatus:string;outputStatus:string;error:string|null;log:string;artifacts:SandboxArtifact[];inputs:SandboxFile[] }
const prefix = '/sandbox-api/v1'
const knownErrorMessages: Record<string, string> = {
  execution_unavailable: '沙箱暂不可运行：Docker 引擎或固定 Python 环境未就绪，本次任务未启动；已上传数据仍保留在本机工作区。',
}
export function sandboxClient(token:string) {
  async function request<T>(path:string, init:RequestInit = {}):Promise<T> {
    const response = await fetch(prefix + path, {...init, headers:{Authorization:'Bearer '+token,...init.headers}, signal:AbortSignal.timeout(15000)})
    if(!response.ok) { const error = await response.json().catch(()=>({message:'服务连接失败'})); throw new Error(knownErrorMessages[error.code] || error.message || error.code || String(response.status)) }
    return response.json()
  }
  const post = <T>(path:string, data:unknown, extra = {}) => request<T>(path,{method:'POST',headers:{'Content-Type':'application/json',...extra},body:JSON.stringify(data)})
  return {
    workspaces:async()=>(await request<{workspaces:SandboxWorkspace[]}>('/workspaces')).workspaces,
    workspace:(id:string)=>request<SandboxWorkspace>('/workspaces/'+id),
    create:(title:string)=>post<SandboxWorkspace>('/workspaces',{title}),
    upload:(id:string,file:File)=>request<SandboxFile>('/workspaces/'+id+'/files',{method:'POST',headers:{'Content-Type':'application/octet-stream','X-Filename':encodeURIComponent(file.name)},body:file}),
    run:(id:string)=>request<SandboxRun>('/runs/'+id),
    events:(id:string,after:number)=>request<{events:any[]}>('/runs/'+id+'/events?after='+after),
    start:(id:string,data:unknown,key:string)=>post<SandboxRun>('/workspaces/'+id+'/runs',data,{'Idempotency-Key':key}),
    cancel:(id:string)=>post<SandboxRun>('/runs/'+id+'/cancel',{}),
    commit:(id:string)=>post<SandboxRun>('/runs/'+id+'/commit',{}),
    async download(runId:string, item:SandboxArtifact) {
      const response = await fetch(prefix+'/runs/'+runId+'/artifacts/'+item.artifactId+'/versions/'+item.versionId,{headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(15000)})
      if(!response.ok) throw new Error('结果读取失败，请重新连接后重试。')
      const blob=await response.blob(); const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('')
      if(hash!==item.sha256) throw new Error('结果校验不一致，下载已拒绝。')
      return blob
    }
  }
}
