import test from 'node:test';
import assert from 'node:assert/strict';
import {radioConnectionIndicators} from '../radio-connection-indicators.js';
test('disconnected means neither transport nor physical radio is verified',()=>{
 const {usb,radio}=radioConnectionIndicators();
 assert.deepEqual(usb,{state:'inactive',label:'Disconnected'});
 assert.deepEqual(radio,{state:'inactive',label:'Not identified'});
});
test('opening USB port never marks radio as identified',()=>{
 const {usb,radio}=radioConnectionIndicators({state:'connected',mode:'usb'});
 assert.deepEqual(usb,{state:'connected',label:'Port connected'});
 assert.deepEqual(radio,{state:'inactive',label:'Not identified'});
});
test('simulator is explicitly marked simulated and USB stays disconnected',()=>{
 const {usb,radio}=radioConnectionIndicators({state:'connected',mode:'simulation'});
 assert.deepEqual(usb,{state:'inactive',label:'Disconnected'});
 assert.deepEqual(radio,{state:'simulation',label:'SIMULATED'});
});
test('connection transitions are pending and never verified',()=>{
 for(const state of ['connecting','disconnecting']){
  const result=radioConnectionIndicators({state,mode:'usb'});
  assert.equal(result.usb.state,'pending');
  assert.notEqual(result.radio.state,'connected');
 }
});
test('disconnect restores both inactive indicators',()=>{
 const result=radioConnectionIndicators({state:'disconnected',mode:null});
 assert.equal(result.usb.state,'inactive');
 assert.equal(result.radio.state,'inactive');
});
