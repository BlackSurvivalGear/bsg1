import test from 'node:test';
import assert from 'node:assert/strict';
import {usbDiagnosticSummary,formatDiagnosticExport} from '../usb-diagnostics.js';
test('disconnected state never reports verified radio',()=>{
 const result=usbDiagnosticSummary();
 assert.equal(result.transport,'None');
 assert.equal(result.radioIdentity,'Not verified');
 assert.equal(result.baudRate,'Unavailable');
});
test('USB port info is transport metadata, not radio verification',()=>{
 const result=usbDiagnosticSummary({state:'connected',mode:'usb',info:{vendorId:'0x1A86',productId:'0x7523'},baudRate:9600});
 assert.equal(result.transport,'USB serial');
 assert.equal(result.vendorId,'0x1A86');
 assert.equal(result.baudRate,'9600');
 assert.equal(result.radioIdentity,'Not verified');
 assert.match(formatDiagnosticExport(result,['USB port opened']),/USB port opened/);
});
test('simulator does not report a USB port',()=>{
 const result=usbDiagnosticSummary({state:'connected',mode:'simulation',baudRate:9600});
 assert.equal(result.transport,'Simulation (no USB)');
 assert.equal(result.state,'disconnected');
 assert.equal(result.vendorId,'Unavailable');
});
