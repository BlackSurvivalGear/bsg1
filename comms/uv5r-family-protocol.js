// Original BSG COMMS offline UV-5R-family protocol. Not connected to Web Serial.
// Byte transport contract: write(Uint8Array), read(exactLength) -> Uint8Array.
import {DriverError} from './native-driver.js';
const ACK=0x06, BLOCK=0x40;
export const UV5R_FAMILY=Object.freeze({
  'uv-5r':Object.freeze({model:'uv-5r',baudRate:9600,magic:Object.freeze([0x50,0xBB,0xFF,0x01,0x25,0x98,0x4D])}),
  'bf-f8hp':Object.freeze({model:'bf-f8hp',baudRate:9600,magic:null})
});
function fail(message,code){throw new DriverError(message,code);}
function bytes(value,length,label){
  if(!(value instanceof Uint8Array)||value.length!==length)fail(label+' must contain exactly '+length+' bytes','INVALID_RESPONSE');
  return value;
}
export function makeReadRequest(address,length=BLOCK){
  if(!Number.isInteger(address)||address<0||address>0xFFFF||!Number.isInteger(length)||length!==BLOCK||address+length>0x10000)
    fail('Invalid memory block address or length','INVALID_BLOCK');
  return Uint8Array.of(0x53,address>>>8,address&255,length);
}
export function parseReadResponse(response,address,length=BLOCK){
  bytes(response,length+4,'Read response');
  if(response[0]!==0x58||((response[1]<<8)|response[2])!==address||response[3]!==length)
    fail('Read response opcode, address or size mismatch','INVALID_BLOCK_RESPONSE');
  return response.slice(4);
}
export class UV5RFamilyProtocol {
  constructor({transport,model='uv-5r',magic}={}){
    if(!UV5R_FAMILY[model])fail('Unsupported protocol model','UNSUPPORTED_MODEL');
    if(!transport||transport.kind!=='mock'||typeof transport.write!=='function'||typeof transport.read!=='function')
      fail('Only offline mock byte transports are supported','HARDWARE_UNVERIFIED');
    this.transport=transport;this.model=model;this.magic=magic??UV5R_FAMILY[model].magic;
    if(!Array.isArray(this.magic)||this.magic.length!==7||this.magic.some(x=>!Number.isInteger(x)||x<0||x>255))
      fail('A verified seven-byte model handshake is required','HANDSHAKE_UNVERIFIED');
    this.identified=false;
  }
  async expectAck(){
    const reply=bytes(await this.transport.read(1),1,'Acknowledgement');
    if(reply[0]!==ACK)fail('Radio did not acknowledge request','ACK_REJECTED');
  }
  async identify(){
    if(this.identified)fail('Session already identified','BUSY');
    for(const value of this.magic){await this.transport.write(Uint8Array.of(value));}
    await this.expectAck();
    await this.transport.write(Uint8Array.of(0x02));
    const identity=bytes(await this.transport.read(8),8,'Identity');
    await this.transport.write(Uint8Array.of(ACK));
    await this.expectAck();
    this.identified=true;
    return {model:this.model,identity:identity.slice(),simulated:true};
  }
  async readBlock(address){
    if(!this.identified)fail('Identify the mock radio before reading','NOT_IDENTIFIED');
    await this.transport.write(makeReadRequest(address));
    await this.expectAck();
    const response=bytes(await this.transport.read(68),68,'Read response');
    const payload=parseReadResponse(response,address);
    await this.transport.write(Uint8Array.of(ACK));
    return payload;
  }
  async writeMemory(){fail('Physical and simulated memory writes are disabled','WRITE_DISABLED');}
}
