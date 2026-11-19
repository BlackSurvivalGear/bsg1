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

test('verified physical identity and last protocol outcome display in USB diagnostics',()=>{
 const s=usbDiagnosticSummary({state:'connected',mode:'usb',radioIdentified:true,protocolStatus:'Read failed: Invalid block ACK at 0x1FC0 (expected 0x06, received 0x15)'});
 assert.match(s.radioIdentity,/HN5RV01/);
 assert.match(s.protocol,/0x1FC0/);
 assert.match(formatDiagnosticExport(s),/received 0x15/);
 assert.equal(usbDiagnosticSummary({state:'disconnected',radioIdentified:true}).radioIdentity,'Not verified');
});
