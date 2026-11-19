// Bounded receive-only Web Serial adapter. No physical radio commands are permitted.
export class SerialTransportError extends Error {
  constructor(message,code='SERIAL_TRANSPORT_ERROR'){super(message);this.name='SerialTransportError';this.code=code;}
}
const failure=(message,code)=>new SerialTransportError(message,code);
export class SerialByteTransport {
  constructor({port,timeoutMs=2500,maxRead=256}={}){
    if(!port?.readable||!port?.writable)throw failure('Open Web Serial port required','PORT_UNAVAILABLE');
    if(!Number.isInteger(timeoutMs)||timeoutMs<100||timeoutMs>30000)throw failure('Invalid timeout','INVALID_TIMEOUT');
    if(!Number.isInteger(maxRead)||maxRead<1||maxRead>65536)throw failure('Invalid read limit','INVALID_LIMIT');
    this.port=port;this.timeoutMs=timeoutMs;this.maxRead=maxRead;this.pending=new Uint8Array(0);this.busy=false;this.closed=false;
  }
  async read(length,{signal}={}){
    if(this.closed)throw failure('Transport closed','CLOSED');
    if(this.busy)throw failure('Another operation is active','BUSY');
    if(!Number.isInteger(length)||length<1||length>this.maxRead)throw failure('Invalid requested byte count','INVALID_LENGTH');
    if(signal?.aborted)throw failure('Read cancelled','ABORTED');
    this.busy=true;let reader=null,timer=null,abortHandler=null;
    try{
      const chunks=[];let count=0;
      if(this.pending.length){const take=Math.min(length,this.pending.length);chunks.push(this.pending.slice(0,take));count=take;this.pending=this.pending.slice(take);}
      if(count===length)return concat(chunks,length);
      reader=this.port.readable.getReader();
      const deadline=Date.now()+this.timeoutMs;
      while(count<length){
        if(signal?.aborted)throw failure('Read cancelled','ABORTED');
        const remaining=deadline-Date.now();if(remaining<=0)throw failure('Response timed out','TIMEOUT');
        const outcomes=[
          reader.read().then(value=>({kind:'read',value}),error=>({kind:'error',error})),
          new Promise(resolve=>{timer=setTimeout(()=>resolve({kind:'timeout'}),remaining);})
        ];
        if(signal)outcomes.push(new Promise(resolve=>{abortHandler=()=>resolve({kind:'abort'});signal.addEventListener('abort',abortHandler,{once:true});}));
        const outcome=await Promise.race(outcomes);
        clearTimeout(timer);timer=null;
        if(signal&&abortHandler){signal.removeEventListener('abort',abortHandler);abortHandler=null;}
        if(outcome.kind==='timeout'||outcome.kind==='abort'){
          try{await reader.cancel();}catch{}
          throw failure(outcome.kind==='timeout'?'Response timed out':'Read cancelled',outcome.kind==='timeout'?'TIMEOUT':'ABORTED');
        }
        if(outcome.kind==='error')throw failure('Serial read failed: '+outcome.error.message,'READ_FAILED');
        const {value,done}=outcome.value;
        if(done)throw failure('Serial connection closed during read','DISCONNECTED');
        if(!(value instanceof Uint8Array)||!value.length)continue;
        const take=Math.min(length-count,value.length);chunks.push(value.slice(0,take));count+=take;
        if(take<value.length)this.pending=value.slice(take);
      }
      return concat(chunks,length);
    }finally{
      if(timer!==null)clearTimeout(timer);
      if(signal&&abortHandler)signal.removeEventListener('abort',abortHandler);
      try{reader?.releaseLock();}catch{}
      this.busy=false;
    }
  }
  async write(){throw failure('Physical radio commands are disabled until model verification','HARDWARE_UNVERIFIED');}
  close(){this.closed=true;this.pending=new Uint8Array(0);}
}
function concat(chunks,length){const result=new Uint8Array(length);let i=0;for(const chunk of chunks){result.set(chunk,i);i+=chunk.length;}return result;}
