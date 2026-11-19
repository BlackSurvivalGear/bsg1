import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {eligibleUV16WriteSession,freshUV16WriteSessionMessage} from '../uv16-write-session-gate.js';

const base={connectionEpoch:4,fullReadEpoch:4,backupSaved:true,connected:true,writePending:false};
test('a completed read and saved evidence DO NOT permit writing on the same USB session',()=>{
 assert.equal(eligibleUV16WriteSession(base),false);
 assert.match(freshUV16WriteSessionMessage(base),/Disconnect.*OFF and ON/);
});
test('a fresh reconnect with saved evidence permits one explicitly confirmed write',()=>{
 assert.equal(eligibleUV16WriteSession({...base,connectionEpoch:5}),true);
});
test('disconnect, no backup, pending attempt, or missing baseline always block writing',()=>{
 for(const input of [
  {...base,connectionEpoch:5,connected:false},
  {...base,connectionEpoch:5,backupSaved:false},
  {...base,connectionEpoch:5,writePending:true},
  {...base,connectionEpoch:5,fullReadEpoch:null},
  {...base,connectionEpoch:3},
  {...base,connectionEpoch:undefined},
 ]){
  assert.equal(eligibleUV16WriteSession(input),false,JSON.stringify(input));
 }
});
test('website binds the fresh-session gate, restart instructions, and explicit physical power-cycle confirmation',()=>{
 const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
 assert.match(app,/import \{eligibleUV16WriteSession,freshUV16WriteSessionMessage\}/);
 assert.match(app,/connectionEpoch\+\+/);
 assert.match(app,/fullReadEpoch=connectionEpoch/);
 assert.match(app,/realWrite\.disabled=[\s\S]*?eligibleUV16WriteSession\(/);
 assert.match(app,/if\(!confirm\('Confirm: You have disconnected USB, switched the SAME test UV-16 OFF and ON/);
 assert.match(app,/Do not repeat Full Read/);
 assert.match(app,/writeUV16OneChannel\(\{port:connectionManager\.port/);
 assert.doesNotMatch(app,/\$\('usb-disconnect'\)\.onclick=async\(\)=>\{[\s\S]*?clearGuardCapture\(\)/);
});
