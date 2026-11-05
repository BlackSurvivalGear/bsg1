// BF-F8HP offline identification readiness. Never opens a serial port or sends hardware commands.
import {BFF8HPReadOnlyIdentifier,BF_F8HP_IDENT} from './bff8hp-readonly-ident.js';
import {DriverError} from './native-driver.js';
export const BF_F8HP_OFFLINE_TIMEOUT_MS=1500;
const fail=(message,code)=>new DriverError(message,code);
export function createOfflineBF8HPTransport(responses,{delayMs=0}={}){
 if(!Array.isArray(responses))throw fail('Mock responses must be an array','INVALID_FIXTURE');
 const queue=responses.map(value=>Uint8Array.from(value));
 const writes=[];
 let closed=false;
 return {
  kind:'mock',writes,
  async write(bytes){
   if(closed)throw fail('Mock transport closed','DISCONNECTED');
   if(!(bytes instanceof Uint8Array))throw fail('Invalid mock write','INVALID_REQUEST');
   writes.push([...bytes]);
  },
  async read(length){
   if(closed)throw fail('Mock transport closed','DISCONNECTED');
   if(delayMs>0)await new Promise(resolve=>setTimeout(resolve,delayMs));
   if(closed)throw fail('Mock transport closed','DISCONNECTED');
   const next=queue.shift();
   if(!next||next.length!==length)throw fail('Unexpected mock response length','INVALID_RESPONSE');
   return next;
  },
  close(){closed=true;queue.length=0;},
  get pending(){return queue.length;}
 };
}
export async function runBF8HPOfflineIdentification({responses,timeoutMs=BF_F8HP_OFFLINE_TIMEOUT_MS,signal,delayMs=0}={}){
 if(!Number.isInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000)throw fail('Invalid offline timeout','INVALID_TIMEOUT');
 if(signal?.aborted)throw fail('Offline identification cancelled','ABORTED');
 const fixture=responses??[Uint8Array.of(0x06),Uint8Array.of(0x50,0x52,0x45,0x56,0x49,0x45,0x57,0x00)];
 const transport=createOfflineBF8HPTransport(fixture,{delayMs});
 const identifier=new BFF8HPReadOnlyIdentifier({transport,consent:true});
 let timer,abortHandler;
 const timeout=new Promise((_,reject)=>{
  timer=setTimeout(()=>reject(fail('Offline identification timed out','TIMEOUT')),timeoutMs);
 });
 const aborted=new Promise((_,reject)=>{
  abortHandler=()=>reject(fail('Offline identification cancelled','ABORTED'));
  signal?.addEventListener('abort',abortHandler,{once:true});
 });
 try{
  const result=await Promise.race([identifier.identify(),timeout,aborted]);
  if(transport.pending!==0)throw fail('Unexpected extra mock responses','INVALID_RESPONSE');
  if(transport.writes.length!==2||
   transport.writes[0].join(',')!==BF_F8HP_IDENT.magic.join(',')||
   transport.writes[1].join(',')!=='2')throw fail('Unexpected mock handshake sequence','INVALID_REQUEST');
  return Object.freeze({...result,simulated:true,transport:'offline mock',hardwareVerified:false});
 }finally{
  clearTimeout(timer);
  signal?.removeEventListener('abort',abortHandler);
  transport.close();
 }
}
