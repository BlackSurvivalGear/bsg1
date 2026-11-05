import test from 'node:test';
import assert from 'node:assert/strict';
import {radioDiagnosticSummary,formatRadioDiagnosticExport} from '../radio-diagnostics.js';
test('disconnected radio is not identified',()=>{
 const s=radioDiagnosticSummary();assert.equal(s.identity,'Not verified');assert.equal(s.protocol,'Not verified');
});
test('USB port is not radio identification',()=>{
 const s=radioDiagnosticSummary({state:'connected',mode:'usb',model:'bf-f8hp',identity:'fake'});
 assert.match(s.connection,/not verified/);assert.equal(s.identity,'Not verified');
});
test('simulator reports synthetic identity and protocol only',()=>{
 const s=radioDiagnosticSummary({state:'connected',mode:'simulation',model:'bf-f8hp',identity:'BSG-VIRTUAL-1',protocolMock:64});
 assert.match(s.connection,/SIMULATED/);assert.match(s.identity,/synthetic/);assert.match(s.protocol,/Synthetic 64-byte/);
 assert.match(formatRadioDiagnosticExport(s,['Simulator connected']),/Simulator connected/);
});
