// Offline BF-F8HP identification preview; does not access Web Serial.
import {BFF8HPReadOnlyIdentifier} from './bff8hp-readonly-ident.js';
export async function previewBFF8HPIdentity({consent=false}={}){
 const identity=Uint8Array.of(0x50,0x52,0x45,0x56,0x49,0x45,0x57,0x00);
 const replies=[Uint8Array.of(6),identity];
 const transport={kind:'mock',writes:[],async write(bytes){this.writes.push([...bytes]);},async read(length){
  const next=replies.shift();
  if(!next||next.length!==length)throw Error('Invalid offline identification fixture');
  return next;
 }};
 const identifier=new BFF8HPReadOnlyIdentifier({transport,consent});
 const result=await identifier.identify();
 if(replies.length||transport.writes.length!==2||result.confirmedModel)throw Error('Invalid identification preview');
 return {...result,simulated:true};
}
