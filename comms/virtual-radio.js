// Original deterministic virtual radio; no USB, serial, or physical radio commands.
import {DriverError} from './native-driver.js';
const DEFAULT_CHANNELS = Object.freeze([
  Object.freeze({name:'SIM CALL',rx:'145.500',tx:'145.500',mode:'FM',receiveOnly:true}),
  Object.freeze({name:'SIM LOCAL',rx:'433.500',tx:'433.500',mode:'NFM',receiveOnly:true})
]);
export class VirtualRadio {
  constructor({model='uv-16-pro-v2',channels=DEFAULT_CHANNELS,latencyMs=0}={}) {
    this.kind='simulation';
    this.model=model;
    this.channels=channels.map(channel=>({...channel}));
    this.latencyMs=latencyMs;
    this.connected=true;
  }
  disconnect(){this.connected=false;}
  async exchange(request,{signal}={}) {
    if (!this.connected) throw new DriverError('Virtual radio disconnected', 'DISCONNECTED');
    if (signal?.aborted) throw new DriverError('Operation cancelled', 'ABORTED');
    if (!request || request.model!==this.model) throw new DriverError('Model mismatch', 'MODEL_MISMATCH');
    if (this.latencyMs>0) await new Promise(resolve=>setTimeout(resolve,this.latencyMs));
    if (!this.connected) throw new DriverError('Virtual radio disconnected', 'DISCONNECTED');
    if (signal?.aborted) throw new DriverError('Operation cancelled', 'ABORTED');
    if (request.operation==='identify') return {model:this.model,simulated:true,firmware:'BSG-VIRTUAL-1'};
    if (request.operation==='read-memory') return {model:this.model,simulated:true,channels:this.channels.map(channel=>({...channel}))};
    throw new DriverError('Unsupported virtual radio operation', 'UNSUPPORTED_OPERATION');
  }
}
