import test from 'node:test';
import assert from 'node:assert/strict';
import {BFF8HPReadOnlyIdentifier,BF_F8HP_IDENT} from '../bff8hp-readonly-ident.js';
function transport(reads){return {kind:'mock',writes:[],async write(bytes){this.writes.push([...bytes]);},async read(n){const value=reads.shift();assert.equal(value?.length,n);return value;}};}
test('BF-F8HP candidate identification is read-only and unconfirmed',async()=>{
 const t=transport([Uint8Array.of(6),Uint8Array.of(0x50,1,2,3,4,5,6,7)]);
 const driver=new BFF8HPReadOnlyIdentifier({transport:t,consent:true});
 const result=await driver.identify();
 assert.equal(result.confirmedModel,false);
 assert.equal(result.identityHex,'5001020304050607');
 assert.deepEqual(t.writes,[[...BF_F8HP_IDENT.magic],[2]]);
 await assert.rejects(driver.readMemory(),{code:'MEMORY_READ_DISABLED'});
 await assert.rejects(driver.writeMemory(),{code:'WRITE_DISABLED'});
 await assert.rejects(driver.identify(),{code:'BUSY'});
});
test('consent and byte transport are mandatory',()=>{
 assert.throws(()=>new BFF8HPReadOnlyIdentifier({transport:transport([])}),{code:'CONSENT_REQUIRED'});
 assert.throws(()=>new BFF8HPReadOnlyIdentifier({consent:true,transport:{kind:'simulation'}}),{code:'INVALID_TRANSPORT'});
});
test('rejects non-ACK and malformed identities',async()=>{
 const noAck=new BFF8HPReadOnlyIdentifier({consent:true,transport:transport([Uint8Array.of(0xf0)])});
 await assert.rejects(noAck.identify(),{code:'IDENTIFICATION_REJECTED'});
 const invalid=new BFF8HPReadOnlyIdentifier({consent:true,transport:transport([Uint8Array.of(6),Uint8Array.of(1,2,3,4,5,6,7,8)])});
 assert.equal((await invalid.identify()).confirmedModel,false);
});
