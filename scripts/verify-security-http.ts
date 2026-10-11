/** Security regression: built standalone server with synthetic identities and an in-process identity provider; no remote services. */
import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { FileWorkbenchStore } from '../src/workbench/filesystem-store';
import { FileLocalSessionStore } from '../src/auth/local-session-store';
import { FileLocalUserStore } from '../src/auth/local-user-store';
import { FileLocalAuthChallengeStore } from '../src/auth/local-auth-challenge-store';
import { LocalAuthService } from '../src/auth/auth-service';
import type { AuthIdentityProvider } from '../src/auth/identity-provider';

async function main() {
  const output=process.argv[2]; if(!output || !path.isAbsolute(output)) throw new Error('Absolute output path required');
  const root=await mkdtemp(path.join(os.tmpdir(),'neska-security-http-'));
  const rows:unknown[]=[];let child:ChildProcess|undefined;let serverLog='';
  const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
  const uid=id(1);const dataRoot=path.join(root,'data'),usersRoot=path.join(dataRoot,'users');
  const listener=createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');
  const port=(listener.address() as {port:number}).port;await new Promise<void>(r=>listener.close(()=>r()));
  const base=`http://127.0.0.1:${port}`;

  try {
    await mkdir(path.join(usersRoot,uid),{recursive:true,mode:0o700});
    await writeFile(path.join(usersRoot,uid,'user.json'),JSON.stringify({schemaVersion:1,userId:uid,email:'fixture@example.test',displayName:'Synthetic',enabled:true,workerId:`worker-${uid}`}),{mode:0o600});
    const config={schemaVersion:1,installationId:'example-security',companyName:'Synthetic',companySlug:'example-security',publicUrl:base,branding:{productName:'Neska',logoPath:'/logo.svg',faviconPath:'/favicon.ico',accentColor:'#111111'},paths:{dataRoot,usersRoot,companyContextRoot:path.join(dataRoot,'company'),sourceReadRoot:path.join(root,'source'),publishWriteRoot:path.join(root,'publish'),backupsRoot:path.join(dataRoot,'backups')}};
    const configPath=path.join(root,'installation.json');await writeFile(configPath,JSON.stringify(config));
    const store=new FileWorkbenchStore({installationId:'example-security',usersRoot});await store.load(uid);
    const project=await store.createProject(uid,'Synthetic');await store.createThread(uid,project.id,'Seed');
    const statePath=path.join(usersRoot,uid,'state/workbench.json');const original=JSON.parse(await readFile(statePath,'utf8'));
    const session=await new FileLocalSessionStore({rootDirectory:path.join(dataRoot,'sessions')}).create('example-security',uid);
    let headers={Cookie:`__Host-aibrain-session=${session.sessionId}`};
    child=spawn(process.execPath,['.next/standalone/server.js'],{cwd:process.cwd(),env:{PATH:process.env.PATH,NODE_ENV:'production',HOSTNAME:'127.0.0.1',PORT:String(port),AIBRAIN_SESSION_SECRET:randomUUID()+randomUUID(),AIBRAIN_INSTALLATION_CONFIG:configPath,NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
    child.stdout?.on('data',b=>serverLog+=b.toString());child.stderr?.on('data',b=>serverLog+=b.toString());
    let ready=false;for(let i=0;i<100;i++){try{ready=(await fetch(`${base}/api/health/live`,{signal:AbortSignal.timeout(1000)})).ok;}catch{}if(ready)break;if(child.exitCode!==null)throw new Error(serverLog);await delay(100);}
    assert(ready,'server readiness');
    assert.equal((await fetch(`${base}/api/threads`)).status,401,'unauthenticated request');
    const userB=id(2);
    await mkdir(path.join(usersRoot,userB),{recursive:true,mode:0o700});
    await writeFile(path.join(usersRoot,userB,'user.json'),JSON.stringify({schemaVersion:1,userId:userB,email:'other@example.test',displayName:'Other',enabled:true,workerId:`worker-${userB}`}),{mode:0o600});
    const projectB=await store.createProject(userB,'Other private project');
    const threadB=await store.createThread(userB,projectB.id,'PRIVATE-B-MARKER');
    const sessionB=await new FileLocalSessionStore({rootDirectory:path.join(dataRoot,'sessions')}).create('example-security',userB);
    const headersB={Cookie:`__Host-aibrain-session=${sessionB.sessionId}`};
    async function probe(name:string,route:string,init:RequestInit,expected:number|number[],forbidden?:string){
      const r=await fetch(base+route,{...init,signal:AbortSignal.timeout(10000)});const body=await r.text();
      assert((Array.isArray(expected)?expected:[expected]).includes(r.status),`${name}: ${r.status}`);
      if(forbidden)assert(!body.includes(forbidden),name+' leaked private data');
      rows.push({name,status:r.status,expected});console.log(JSON.stringify({name,status:r.status}));
      return body;
    }
    await probe('own thread allowed','/api/threads/'+original.threads[0].id,{headers},200);
    await probe('cross-user thread denied','/api/threads/'+threadB.id,{headers},[403,404],'PRIVATE-B-MARKER');
    await probe('document metadata under foreign thread is not exposed (synthetic missing upload)','/api/threads/'+threadB.id+'/documents/'+id(3),{headers},[403,404]);
    await probe('cross-user project denied','/api/projects/'+projectB.id,{headers},[403,404],'Other private project');
    await probe('other owner can read','/api/threads/'+threadB.id,{headers:headersB},200);
    const untrusted={'Content-Type':'application/json',Origin:'https://untrusted.example.test','Sec-Fetch-Site':'cross-site',...headers};
    await probe('task-center rejects foreign Origin with valid cookie','/api/task-center',{method:'PATCH',headers:untrusted,body:JSON.stringify({action:'preferences',preferences:{inApp:false,desktop:false}})},403);
    const task=JSON.parse(await probe('rejected preferences were not persisted','/api/task-center',{headers},200));assert.notEqual(task.preferences.inApp,false);
    await probe('same-origin task-center update works','/api/task-center',{method:'PATCH',headers:{...headers,Origin:base,'Content-Type':'application/json'},body:JSON.stringify({action:'preferences',preferences:{inApp:false,desktop:false}})},200);
    const updated=JSON.parse(await probe('authorized preferences persisted','/api/task-center',{headers},200));assert.equal(updated.preferences.inApp,false);
    let signedOut = false;
    const identity = {userId:uid,email:'fixture@example.test',accessToken:'synthetic-access',refreshToken:'synthetic-refresh'};
    const provider: AuthIdentityProvider = {
      async verifyPassword(){return identity;}, async updatePassword(){}, async requestPasswordRecovery(){},
      async verifyPasswordRecovery(){return identity;}, async signOut(){signedOut=true;},
    };
    const auth = new LocalAuthService('example-security',provider,new FileLocalUserStore(usersRoot),
      new FileLocalSessionStore({rootDirectory:path.join(dataRoot,'sessions')}),
      new FileLocalAuthChallengeStore({rootDirectory:path.join(dataRoot,'challenges'),encryptionKey:randomBytes(32)}));
    const recovered=await auth.completePasswordRecovery({code:'synthetic-recovery'},'Recovered-password-123');
    assert(signedOut,'recovery provider credentials closed');
    await probe('pre-recovery cookie denied by HTTP server','/api/threads/'+original.threads[0].id,{headers},401);
    headers={Cookie:`__Host-aibrain-session=${recovered.session.sessionId}`};
    await probe('post-recovery cookie works','/api/threads/'+original.threads[0].id,{headers},200);
    await probe('recovery preserves other user session','/api/threads/'+threadB.id,{headers:headersB},200);
    await probe('control thread mutation rejects foreign Origin','/api/threads/'+original.threads[0].id,{method:'PATCH',headers:untrusted,body:JSON.stringify({title:'SHOULD-NOT-CHANGE'})},403);
    await probe('logout rejects foreign Origin','/api/auth/logout',{method:'POST',headers:untrusted},403);
    await probe('logout accepted from own Origin','/api/auth/logout',{method:'POST',headers:{...headers,Origin:base}},200);
    await probe('revoked local session denied','/api/threads/'+original.threads[0].id,{headers},401);
    await probe('other session remains valid','/api/threads/'+threadB.id,{headers:headersB},200);
    await writeFile(path.join(usersRoot,userB,'user.json'),JSON.stringify({schemaVersion:1,userId:userB,email:'other@example.test',displayName:'Other',enabled:false,workerId:`worker-${userB}`}),{mode:0o600});
    await probe('disabled user session denied','/api/threads/'+threadB.id,{headers:headersB},401);

  } finally {
    if(child && child.exitCode===null && child.signalCode===null){const exited=once(child,'exit');child.kill('SIGTERM');const timer=setTimeout(()=>child?.kill('SIGKILL'),5000);await exited;clearTimeout(timer);}
    await writeFile(output,JSON.stringify({scope:'isolated standalone HTTP security regressions; synthetic provider, no live AI or identity service',rows},null,2));
    await writeFile(output+'.server.log',serverLog);await rm(root,{recursive:true,force:true});
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
