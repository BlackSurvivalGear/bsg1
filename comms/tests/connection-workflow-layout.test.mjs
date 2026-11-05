import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('radio controls are statically defined exactly once',()=>{
 for(const id of ['radio-model','bff8hp-identification-preview','usb-indicator','usb-indicator-status','radio-indicator','radio-indicator-status','connect','simulate','simulator-read','radio-settings-open','disconnect','usb-diagnostics-panel','usb-refresh','usb-clear','usb-copy','simulator-identity']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
});
test('no runtime reparenting or replacement of radio controls',()=>{
 for(const fragment of ['connectionActions.replaceChildren','usbColumn.append','radioColumn.append','selectionRow.append','simulatorRead.after','selectionRow.after(indicatorRow)'])
  assert.ok(!app.includes(fragment),fragment);
});
test('connection workflow uses original event handlers and diagnostic actions',()=>{
 for(const fragment of ["$('connect').onclick","$('simulate').onclick","$('disconnect').onclick","usbRefresh.onclick=refreshUSBDiagnostics","usbClear.onclick=","usbCopy.onclick="])
  assert.ok(app.includes(fragment),fragment);
});
test('radio connection and channel editing remain separate',()=>{
 assert.ok(html.includes('id="channels"'));
 assert.ok(html.includes('id="profiles"'));
 assert.ok(app.includes("const simulatorRead=$('simulator-read')"));
});


test('connection messages precede the collapsible diagnostics panel',()=>{
 const messages=html.indexOf('class="radio-console-messages"');
 const diagnostics=html.indexOf('id="usb-diagnostics-panel"');
 assert.ok(messages>=0 && diagnostics>messages);
});


test('paired diagnostic panels have unique static IDs and independent actions',()=>{
 for(const id of ['radio-diagnostics-panel','radio-diagnostics-info','radio-refresh','radio-clear','radio-copy','radio-diagnostics-feedback']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 for(const fragment of ["$('radio-refresh').onclick","$('radio-clear').onclick","$('radio-copy').onclick","radioEvents.length=0"]){
  assert.ok(app.includes(fragment),fragment);
 }
 assert.ok(!app.includes('connectionActions.replaceChildren'));
});

test('USB connection test is a single static control with a safe handler',()=>{
 assert.equal((html.match(/id="usb-test"/g)||[]).length,1);
 assert.ok(app.includes("$('usb-test').onclick=async()=>"));
 assert.ok(app.includes('connectionManager.testUSBConnection()'));
 assert.ok(app.includes('usbDiagnosticsPanel.open=true'));
});
