// BF-F8HP experimental identification only. Never reads/writes memory.
// Protocol facts cross-checked against CHIRP BF-F8HP debug traces.
// Caller must explicitly opt in and provide an already-open byte transport.
import {DriverError} from './native-driver.js';
export const BF_F8HP_IDENT=Object.freeze({baudRate:9600,magic:Object.freeze([0x50,0xBB,0xFF,0x20,0x12,0x07,0x25])});
function error(message,code){throw new DriverError(message,code);}
export class BFF8HPReadOnlyIdentifier{
 constructor({transport,consent=false}={}){
  if(!consent)error('Explicit identification consent required','CONSENT_REQUIRED');
  if(!transport||!['mock','serial'].includes(transport.kind)||typeof transport.write!=='function'||typeof transport.read!=='function')
   error('A byte transport is required','INVALID_TRANSPORT');
  this.transport=transport;this.state='idle';
 }
 async identify(){
  if(this.state!=='idle')error('Identification already attempted','BUSY');
  this.state='busy';
  try{
   // This command is identification only; it is not a radio memory read.
   await this.transport.write(Uint8Array.from(BF_F8HP_IDENT.magic));
   const ack=await this.transport.read(1);
   if(!(ack instanceof Uint8Array)||ack.length!==1||ack[0]!==0x06)error('BF-F8HP did not acknowledge identification','IDENTIFICATION_REJECTED');
   await this.transport.write(Uint8Array.of(0x02));
   const identity=await this.transport.read(8);
   if(!(identity instanceof Uint8Array)||identity.length!==8)error('Invalid BF-F8HP identity length','INVALID_IDENTITY');
   // Unknown fingerprints must never be treated as proof of model compatibility.
   return Object.freeze({candidateModel:'bf-f8hp',confirmedModel:false,identityHex:[...identity].map(b=>b.toString(16).padStart(2,'0')).join(''),readOnly:true});
  }finally{this.state='closed';}
 }
 async readMemory(){error('Memory reads require a verified firmware fingerprint','MEMORY_READ_DISABLED');}
 async writeMemory(){error('Radio programming is disabled','WRITE_DISABLED');}
}
