import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
test('radio controls are statically defined exactly once',()=>{
 for(const id of ['radio-model','bff8hp-identification-preview','usb-indicator','usb-indicator-status','radio-indicator','radio-indicator-status','connect','simulate','simulator-read','radio-settings-open','usb-disconnect','radio-disconnect','usb-diagnostics-panel','usb-refresh','usb-clear','usb-copy','simulator-identity']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
});
test('no runtime reparenting or replacement of radio controls',()=>{
 for(const fragment of ['connectionActions.replaceChildren','usbColumn.append','radioColumn.append','selectionRow.append','simulatorRead.after','selectionRow.after(indicatorRow)'])
  assert.ok(!app.includes(fragment),fragment);
});
test('connection workflow uses original event handlers and diagnostic actions',()=>{
 for(const fragment of ["$('connect').onclick","$('simulate').onclick","$('usb-disconnect').onclick","$('radio-disconnect').onclick","usbRefresh.onclick=refreshUSBDiagnostics","usbClear.onclick=","usbCopy.onclick="])
  assert.ok(app.includes(fragment),fragment);
});
test('radio connection and channel editing remain separate',()=>{
 assert.ok(html.includes('id="channels"'));
 assert.ok(html.includes('id="profiles"'));
 assert.ok(app.includes("const simulatorRead=$('simulator-read')"));
});


test('connection diagnostics remain beneath their respective controls',()=>{
 const usb=html.indexOf('id="usb-indicator"');
 const usbDiag=html.indexOf('id="usb-diagnostics-panel"');
 const radio=html.indexOf('id="radio-indicator"');
 const radioDiag=html.indexOf('id="radio-diagnostics-panel"');
 const editor=html.indexOf('class="radio-editor-card"');
 assert.ok(usb<usbDiag && usbDiag<radio && radio<radioDiag && radioDiag<editor);
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

test('V3 future hardware actions are unique disabled static placeholders',()=>{
 for(const id of ['radio-verify-placeholder','radio-write-placeholder','radio-verify-write-placeholder']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
  assert.match(html,new RegExp('<button id="'+id+'" type="button" disabled'));
  assert.ok(!app.includes("$('"+id+"')"),id+' must not have a hardware handler');
 }
});
test('V3 keeps existing working controls and avoids duplicate physical actions',()=>{
 for(const id of ['connect','usb-test','simulate','simulator-read','radio-settings-open','usb-disconnect','radio-disconnect','usb-diagnostics-panel','radio-diagnostics-panel','channels','profiles']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(html.includes('class="radio-editor-program-actions actions"'));
 assert.ok(!html.includes('Read radio (unavailable)'));
 assert.ok(!html.includes('Write radio (unavailable)'));
 assert.ok(app.includes("$('usb-disconnect').onclick"));
 assert.ok(app.includes("$('radio-disconnect').onclick"));
 assert.ok(app.includes('simulatorRead.onclick=async()=>'));
 assert.ok(!html.includes('id="disconnect"'));
 assert.ok(!html.includes('id="radio-read-identity-placeholder"'));
});

test('simulated connection and identity are clearly labelled and grouped in Radio Connection',()=>{
 assert.match(html,/<button id="simulate"[^>]*>Connect Radio \(Simulated\)<\/button>/);
 assert.match(html,/<button id="bff8hp-identification-preview"[^>]*>Identify Radio \(Simulated\)<\/button>/);
 const radioStart=html.indexOf('id="radio-indicator"');
 const radioEnd=html.indexOf('</div>',html.indexOf('id="radio-verify-placeholder"'));
 const simulator=html.indexOf('id="simulate"');
 const identity=html.indexOf('id="bff8hp-identification-preview"');
 assert.ok(radioStart<simulator && simulator<identity && identity<radioEnd);
 const selection=html.slice(html.indexOf('class="radio-selection-row"'),html.indexOf('class="radio-connection-controls"'));
 assert.ok(!selection.includes('bff8hp-identification-preview'));
 assert.ok(app.includes('identityPreview.onclick=async()=>'));
 assert.ok(app.includes("$('simulate').onclick=async()=>"));
});

test('USB and simulator disconnect controls are mode-aware and do not send radio commands',()=>{
 assert.match(html,/<button id="usb-disconnect" type="button" disabled[^>]*>Disconnect USB<\/button>/);
 assert.match(html,/<button id="radio-disconnect" type="button" disabled[^>]*>Disconnect Radio<\/button>/);
 assert.ok(app.includes("connectionManager.mode!=='usb'||connectionManager.state!=='connected'"));
 assert.ok(app.includes("connectionManager.mode!=='simulation'||connectionManager.state!=='connected'"));
 assert.ok(app.includes("$('usb-disconnect').disabled=busy||state!=='connected'||mode!=='usb'"));
 assert.ok(app.includes("$('radio-disconnect').disabled=busy||state!=='connected'||mode!=='simulation'"));
 assert.ok(app.includes('await connectionManager.disconnect()'));
 assert.ok(!html.includes('id="disconnect"'));
});

test('compact Channel Editor keeps radio actions centered and file actions after table',()=>{
 const editor=html.slice(html.indexOf('class="radio-editor-card"'),html.indexOf('class="sdr-section"'));
 assert.ok(!editor.includes('Channel List'));
 assert.ok(!editor.includes('radio-memory-groups'));
 assert.ok(!html.includes('id="radio-read-placeholder"'));
 assert.ok(!html.includes('id="radio-backup-placeholder"'));
 assert.ok(!html.includes('id="radio-restore-placeholder"'));
 for(const id of ['simulator-read','radio-write-placeholder','radio-verify-write-placeholder','add','import','export','backup','restore']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(editor.includes('class="radio-editor-program-actions actions"'));
 assert.ok(editor.indexOf('id="simulator-read"')<editor.indexOf('id="radio-write-placeholder"'));
 assert.ok(editor.indexOf('id="radio-write-placeholder"')<editor.indexOf('id="radio-verify-write-placeholder"'));
 assert.ok(editor.indexOf('id="channels"')<editor.indexOf('id="add"'));
 assert.ok(editor.indexOf('id="add"')<editor.indexOf('id="import"'));
 assert.ok(editor.indexOf('id="import"')<editor.indexOf('id="export"'));
 assert.ok(editor.indexOf('id="export"')<editor.indexOf('id="backup"'));
 assert.ok(editor.indexOf('id="backup"')<editor.indexOf('id="restore"'));
 assert.ok(app.includes('simulatorRead.onclick=async()=>'));
});

test('programming actions use prominent distinct colours while preserving disabled hardware controls',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 for(const fragment of ['#simulator-read{background:#17633f','#simulator-read:disabled{background:#17402c','#radio-write-placeholder:disabled{background:#483d19','#radio-verify-write-placeholder:disabled{background:#263547','font-weight:800','min-height:52px']){
  assert.ok(css.includes(fragment),fragment);
 }
 for(const id of ['radio-write-placeholder','radio-verify-write-placeholder']){
  assert.match(html,new RegExp('<button id="'+id+'" type="button" disabled'));
 }
 assert.ok(app.includes('simulatorRead.onclick=async()=>'));
});
test('USB and Radio diagnostics retain collapsible controls and brighter gold summaries',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(css.includes('>.usb-diagnostics-panel>summary{color:#b5c6b3'));
 assert.ok(css.includes('font-size:.79rem;font-weight:600'));
 for(const id of ['usb-diagnostics-panel','radio-diagnostics-panel']){
  assert.match(html,new RegExp('<details[^>]*id="'+id+'"'));
 }
});

test('connection columns align and diagnostic disclosures remain compact',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(css.includes('.radio-connection-stack{display:flex;flex-direction:column;align-items:stretch;justify-content:flex-start;align-self:start;height:auto'));
 assert.ok(css.includes('.radio-connection-controls{align-items:start}'));
 assert.ok(css.includes('font-size:.79rem;font-weight:600'));
 assert.ok(css.includes('border:1px solid #435646;background:#142017'));
 for(const id of ['usb-diagnostics-panel','radio-diagnostics-panel']){
  assert.match(html,new RegExp('<details[^>]*id="'+id+'"'));
 }
 for(const id of ['usb-refresh','usb-clear','usb-copy','radio-refresh','radio-clear','radio-copy']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
});

test('expanding one diagnostics disclosure does not stretch its sibling connection stack',()=>{
 const css=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(css.includes('.radio-connection-stack>.radio-control-column{flex:none;height:auto;min-height:230px'));
 assert.ok(css.includes('.radio-connection-stack>.usb-diagnostics-panel{flex:none;align-self:stretch;height:auto;min-height:0;max-height:320px;overflow:auto}'));
 assert.ok(css.includes('@media(max-width:560px){.workspace-view[data-workspace="radios"] .radio-connection-stack>.radio-control-column{min-height:0}}'));
 for(const id of ['usb-diagnostics-panel','radio-diagnostics-panel']){
  assert.match(html,new RegExp('<details[^>]*id="'+id+'"'));
 }
});
