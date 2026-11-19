import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../radio-redesign.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../radio-redesign.css',import.meta.url),'utf8');
const app=readFileSync(new URL('../app.js',import.meta.url),'utf8');
const shell=readFileSync(new URL('../shell.js',import.meta.url),'utf8');
test('approved redesign loads after existing radio and sidebar modules',()=>{
 assert.ok(html.includes('src="./radio-redesign.js"'));
 assert.ok(html.includes('href="./radio-redesign.css"'));
 assert.ok(html.indexOf('src="./shell.js"')<html.indexOf('src="./radio-redesign.js"'));
 assert.ok(shell.includes('for(const item of WORKSPACES)'));
 assert.ok(!js.includes("sidebar.replaceChildren"));
});
test('approved image is resolved relative to comms folder',()=>{
 assert.ok(js.includes("../UV%2016%20PRO.png"));
 assert.ok(js.includes("img.alt='Baofeng UV-16 Pro V2 radio'"));
});
test('existing physical radio handlers and model-aware reader remain untouched',()=>{
 for(const id of ['connect','usb-disconnect','radio-read','radio-write-placeholder','radio-verify-write-placeholder','channels','radio-model']){
  assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
 }
 assert.ok(app.includes('readUV16WebsiteSample({connection:connectionManager,model,consent:true,'));
 for(const marker of ["$('connect').onclick","$('usb-disconnect').onclick","radioRead.onclick=async()=>"]){
  assert.ok(app.includes(marker),marker);
 }
 assert.ok(!js.includes('navigator.serial'));
});
test('write and verify remain physically disabled',()=>{
 for(const id of ['radio-write-placeholder','radio-verify-write-placeholder'])
  assert.match(html,new RegExp('<button id="'+id+'" type="button" disabled'));
 assert.ok(!js.includes('removeAttribute(\'disabled\')'));
 assert.ok(!js.includes('writeMemory('));
});
test('five-step design renders accessible actual state instead of invented COM port',()=>{
 assert.ok(js.includes("['Connect Radio','Identify','Read Channels','Edit Channels','Write & Verify']"));
 assert.ok(js.includes("portValue.textContent=connected?'USB serial connected':'Disconnected'"));
 assert.ok(js.includes("fwValue.textContent=identified?'HN5RV01':'Not identified'"));
 assert.ok(js.includes("connection.classList.toggle('is-identified',identified)"));
 assert.ok(js.includes("search.addEventListener('input'"));
 assert.ok(css.includes('@media(max-width:700px)'));
});

test('one primary centre control advances Connect, Identify, Read without duplicate Connect',()=>{
 assert.ok(js.includes("primaryConnect.id='rm-primary-connect'"));
 assert.ok(js.includes("toolbar.append(disconnect,write,verify)"));
 assert.ok(!js.includes("toolbar.append(connect,disconnect,write,verify)"));
 assert.ok(js.includes("primaryConnect.onclick=()=>{if(!connect.disabled)connect.click();}"));
 assert.ok(js.includes("primaryConnect.hidden=connected"));
 assert.ok(js.includes("identifyButton.hidden=!connected||identified"));
 assert.ok(js.includes("read.hidden=!identified"));
 assert.ok(app.includes("const session=new UV16ReadOnlySession({port:connectionManager.port});"));
 assert.ok(app.includes("identifiedReadSession=session;"));
 assert.ok(app.includes("const result=await session.identify();"));
 assert.ok(css.includes(".rm-advanced #connect{display:none!important}"));
});
test('radio image is fully contained with white-background blending and secondary write controls',()=>{
 assert.ok(css.includes("mix-blend-mode:normal"));
 assert.ok(css.includes("object-fit:contain"));
 assert.ok(css.includes(".rm-actions .rm-write,.approved-radio-manager .rm-actions .rm-verify"));
 for(const id of ['radio-write-placeholder','radio-verify-write-placeholder'])
  assert.match(html,new RegExp('<button id="'+id+'" type="button" disabled'));
});

test('image background is actually made transparent by one-time alpha flood fill',()=>{
 const cutout=readFileSync(new URL('../radio-photo-cutout.js',import.meta.url),'utf8');
 assert.ok(js.includes("import {prepareUV16Cutout} from './radio-photo-cutout.js';"));
 assert.ok(js.includes('prepareUV16Cutout(img);'));
 assert.ok(cutout.includes('context.getImageData(0,0,w,h)'));
 assert.ok(cutout.includes('d[i*4+3]=0'));
 assert.ok(cutout.includes("trimmed.toDataURL('image/png')"));
 assert.ok(cutout.includes("img.dataset.cutoutReady='true'"));
 assert.ok(!cutout.includes('setInterval('));
});
test('existing read and independent Identify share verified protocol session',()=>{
 const wire=readFileSync(new URL('../uv16-read-only-wire.js',import.meta.url),'utf8');
 assert.ok(wire.includes('if(!this.#identified)await this.#identifyHandshake(signal)'));
 assert.ok(app.includes('identifiedSession:existingSession'));
 assert.ok(app.includes('clearIdentifiedSession()'));
 assert.ok(app.includes('Power-cycle the radio and reconnect USB before retrying.'));
});

test('radio image is contained within the hero at desktop and mobile widths',()=>{
 assert.ok(css.includes('.approved-radio-manager .rm-photo{'));
 assert.ok(css.includes('height:260px'));
 assert.ok(css.includes('max-height:260px'));
 assert.ok(css.includes('overflow:hidden'));
 assert.ok(css.includes('position:absolute;inset:0'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(css.includes('height:220px;max-height:220px'));
});
test('read errors remain visible with failed address and the status no longer claims simulator',()=>{
 const workspace=readFileSync(new URL('../workspace.js',import.meta.url),'utf8');
 assert.ok(app.includes("lastPhysicalProtocol='Read failed: '+error.message"));
 assert.ok(app.includes("samplePreview.textContent='Read failed — '+error.message"));
 assert.ok(app.includes('radioIdentified:physicalRadioIdentified'));
 assert.ok(!workspace.includes('Connect, simulate, manage profiles and edit channels'));
});
