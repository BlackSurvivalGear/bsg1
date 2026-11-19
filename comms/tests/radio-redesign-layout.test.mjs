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
