import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVirtualMemory} from '../virtual-memory-validation.js';
import {NativeRadioDriver} from '../native-driver.js';
import {VirtualRadio} from '../virtual-radio.js';
test('accepts simulated memory and normalises channel fields',async()=>{
 const driver=new NativeRadioDriver({transport:new VirtualRadio()});
 const result=validateVirtualMemory(await driver.readMemory(),'uv-16-pro-v2');
 assert.equal(result.channels.length,2);
 assert.equal(result.channels[0].receiveOnly,true);
 assert.equal(result.channels[0].scan,true);
});
test('rejects spoofed model and non-simulated memory',()=>{
 const base={simulated:true,model:'uv-16-pro-v2',channels:[]};
 assert.throws(()=>validateVirtualMemory({...base,model:'uv-5r'},'uv-16-pro-v2'),/identity/);
 assert.throws(()=>validateVirtualMemory({...base,simulated:false},'uv-16-pro-v2'),/identity/);
});
test('rejects invalid channel and oversized memory without partial output',()=>{
 const base={simulated:true,model:'uv-16-pro-v2'};
 assert.throws(()=>validateVirtualMemory({...base,channels:[{name:'INVALID',rx:'oops',tx:'145.500'}]},base.model),/channel 1/);
 assert.throws(()=>validateVirtualMemory({...base,channels:[null]},base.model),/channel at 1/);
 assert.throws(()=>validateVirtualMemory({...base,channels:Array(1001).fill({})},base.model),/limit/);
});
test('preserves valid channel data without mutating source',()=>{
 const channel={name:'TEST',rx:'145.500',tx:'145.500',mode:'FM',receiveOnly:true};
 const memory={simulated:true,model:'uv-16-pro-v2',channels:[channel]};
 const result=validateVirtualMemory(memory,memory.model);
 result.channels[0].name='EDITED';
 assert.equal(channel.name,'TEST');
});
