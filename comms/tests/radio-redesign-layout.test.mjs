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
 const models=readFileSync(new URL('../models.js',import.meta.url),'utf8');
 assert.ok(js.includes("import {MODELS} from './models.js';"));
 for(const image of ["../UV32.png","../UV%2016%20PRO.png","../UV%205R.png"])assert.ok(models.includes(image),image);
 assert.ok(js.includes("img.alt=current.name+' radio'"));
 assert.ok(js.includes('img.src=current.image'));
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
test('four-step design renders accessible actual state instead of invented COM port',()=>{
 assert.ok(js.includes("['Connect Radio','Read Channels','Edit Channels','Write & Verify']"));
 assert.ok(js.includes("portValue.textContent=connected?'USB serial connected':'Disconnected'"));
 assert.ok(js.includes("fwValue.textContent=!supportsPhysicalRead?'Unsupported':identified?'HN5RV01':'Not identified'"));
 assert.ok(js.includes("connection.classList.toggle('is-identified',identified)"));
 assert.ok(js.includes("search.addEventListener('input'"));
 assert.ok(css.includes('@media(max-width:700px)'));
});

test('one primary centre control connects and executes combined firmware verification and read',()=>{
 assert.ok(js.includes("primaryConnect.id='rm-primary-connect'"));
 assert.ok(js.includes("toolbar.append(disconnect,write,verify)"));
 assert.ok(!js.includes("toolbar.append(connect,disconnect,write,verify)"));
 assert.ok(js.includes("primaryConnect.onclick=()=>{if(!connect.disabled)connect.click();}"));
 assert.ok(js.includes("primaryConnect.hidden=connected"));
 assert.ok(js.includes("read.hidden=!connected||!supportsPhysicalRead"));
 assert.ok(js.includes("read.hidden=!connected||!supportsPhysicalRead"));
 assert.ok(!app.includes("new UV16ReadOnlySession({port:connectionManager.port})"));
 assert.ok(!app.includes("identifiedReadSession"));
 assert.ok(!app.includes("session.identify()"));
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
test('restored PR #51 physical read is uninterrupted, firmware identification occurs during reading',()=>{
 const wire=readFileSync(new URL('../uv16-read-only-wire.js',import.meta.url),'utf8');
 assert.ok(wire.includes('for(const address of AUX)'));
 assert.ok(wire.includes('for(const byte of MAGIC)'));
 assert.ok(wire.includes("if(firmware!=='HN5RV01')"));
 assert.ok(!wire.includes('async identify('));
 assert.ok(!app.includes('identifiedSession:existingSession'));
 assert.ok(!app.includes("event.target?.id!=='radio-identify'"));
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

test('selecting radios refreshes their own image and only UV-16 receives read workflow',()=>{
 assert.ok(js.includes("modelSelector?.addEventListener('change',refreshRadioImage)"));
 assert.ok(js.includes("current.id==='uv-16-pro-v2')prepareUV16Cutout(img)"));
 assert.ok(js.includes("const supportsPhysicalRead=selectedModel?.physicalRead===true"));
 assert.ok(js.includes("read.hidden=!connected||!supportsPhysicalRead"));
 assert.ok(js.includes("read.hidden=!connected||!supportsPhysicalRead"));
 assert.ok(js.includes("primaryConnect.disabled=connect.disabled||!supportsPhysicalRead"));
 assert.ok(js.includes("fwValue.textContent=!supportsPhysicalRead?'Unsupported'"));
 const cutout=readFileSync(new URL('../radio-photo-cutout.js',import.meta.url),'utf8');
 assert.ok(cutout.includes("img.dataset.model!=='uv-16-pro-v2'"));
});

test('select-first hero orders radio selection and status before action and photo',()=>{
 assert.ok(js.includes("hero.append(status,centre,photo)"));
 assert.ok(js.includes("status.append(heading)"));
 assert.ok(js.includes("status.append(statusLabel,connection,portLine,fwLine)"));
 assert.ok(js.includes("heading.textContent='Select Radio'"));
 assert.ok(js.includes("statusLabel.textContent='Radio Status'"));
 assert.ok(js.includes("title.textContent=selectedModel?.name||'Radio Control'"));
 assert.ok(!js.includes('modelValue.textContent=title.textContent'));
 assert.ok(css.includes('grid-template-columns:minmax(245px,305px) minmax(300px,1fr) minmax(170px,245px)'));
 assert.ok(css.includes('.rm-status{grid-column:1;grid-row:1'));
 assert.ok(css.includes('.rm-main{grid-column:2;grid-row:1'));
 assert.ok(css.includes('.rm-photo{\n  grid-column:3;grid-row:1'));
});
test('mobile order and interactive radio controls survive layout-only change',()=>{
 assert.ok(css.includes('.rm-main{grid-column:1;grid-row:2'));
 assert.ok(css.includes('.rm-photo{grid-column:1;grid-row:3'));
 assert.ok(js.includes("primaryConnect.onclick=()=>{if(!connect.disabled)connect.click();}"));
 assert.ok(js.includes("modelSelector?.addEventListener('change',refreshRadioImage)"));
 assert.ok(js.includes("read.hidden=!connected||!supportsPhysicalRead"));
 assert.ok(js.includes('centre.append(read,readHint)'));
 assert.ok(js.includes('toolbar.append(disconnect,write,verify)'));
});

test('global header removed; BSG crest navigates home beside page title',()=>{
 assert.ok(!html.includes('<body><header>'));
 assert.ok(!html.includes('<header>'));
 assert.ok(shell.includes("homeLink.className='bsg-logo-home workspace-home-logo'"));
 assert.ok(shell.includes("homeLink.href='https://blacksurvivalgear.github.io/bsg1/'"));
 assert.ok(shell.includes("homeLogo.src='../BSG%20GOLD%20LOGO.png'"));
 assert.ok(shell.includes("homeLink.setAttribute('aria-label','Return to BSG central homepage')"));
 assert.ok(shell.includes('topbar.append(homeLink,heading)'));
 const styles=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(styles.includes('.workspace-topbar .workspace-home-logo:focus-visible'));
 assert.ok(styles.includes('.app-shell{min-height:100vh}'));
});
test('radio workflow has four steps, Read completes after full channel scan',()=>{
 assert.ok(js.includes("['Connect Radio','Read Channels','Edit Channels','Write & Verify']"));
 assert.ok(!js.includes("['Connect Radio','Identify','Read Channels'"));
 assert.ok(js.includes('[[1,connected],[2,readComplete],[3,false]]'));
 assert.ok(js.includes('steps.querySelector(\'[data-step="4"]\')'));
 const workspace=readFileSync(new URL('../workspace.js',import.meta.url),'utf8');
 assert.ok(workspace.includes('Connect, read and edit physical radio channels'));
});
test('internal Dashboard menu removed; Radio Manager is default and legacy hashes resolve safely',async()=>{
 const {WORKSPACES,DEFAULT_WORKSPACE,validWorkspace,workspaceFromHash}=await import('../workspace.js');
 assert.equal(DEFAULT_WORKSPACE,'radios');
 assert.ok(!WORKSPACES.some(item=>item.id==='dashboard'));
 assert.equal(WORKSPACES.find(item=>item.id==='radios')?.group,'Workspace');
 assert.equal(validWorkspace('dashboard'),'radios');
 assert.equal(workspaceFromHash('#dashboard'),'radios');
 assert.equal(workspaceFromHash(''),'radios');
 assert.ok(shell.includes('for(const item of WORKSPACES)'));
});

test('selected radio name is shown over the centre action and radio is not separately identified',()=>{
 assert.ok(js.includes("title.textContent=selectedModel?.name||'Radio Control'"));
 assert.ok(js.includes("Firmware HN5RV01 is identified during the same complete read."));
 assert.ok(!js.includes("identifyButton=document.createElement"));
 assert.ok(!app.includes("identifiedReadSession"));
});

test('channel read result is mirrored below the main Read action without modifying USB protocol',()=>{
 assert.ok(js.includes("sourcePreview=$('uv16-read-preview')"));
 assert.ok(js.includes("centre.insertBefore(progressPanel,readSummary)"));
 assert.ok(js.includes("centre.append(readSummary)"));
 assert.ok(js.includes("sourcePreview?.classList.add('rm-source-preview')"));
 assert.ok(css.includes('#uv16-read-preview.rm-source-preview{display:none!important}'));
 assert.ok(js.includes("readSummaryTitle.textContent=success?'✓ '+lines[0]"));
 assert.ok(js.includes("lines.find(line=>/^Scanned \\d+ memory locations\\.$/.test(line))"));
 assert.ok(js.includes("lines.find(line=>line.startsWith('Radio firmware:'))"));
});
test('progress tracks existing physical reader percentage only, and hides on failure or model change',()=>{
 assert.ok(js.includes("new MutationObserver(refreshReadSummary).observe(sourcePreview"));
 assert.ok(js.includes("progress.max=100;progress.value=0"));
 assert.ok(js.includes("progress.setAttribute('aria-label','Radio channel read progress')"));
 assert.ok(js.includes("lines[0]?.match(/(\\d{1,3})%/)"));
 assert.ok(js.includes("const percent=success?100:percentMatch?Math.min(100,Math.max(0,Number(percentMatch[1]))):0"));
 assert.ok(js.includes("progressPanel.hidden=!selected||(!reading&&!success)"));
 assert.ok(js.includes("if(readSummary.hidden){progressPanel.hidden=true;return;}"));
 assert.ok(css.includes('.rm-read-progress progress::-webkit-progress-value'));
 assert.ok(css.includes('.rm-read-progress progress::-moz-progress-bar'));
 assert.ok(app.includes("onProgress:({blocksRead,totalBlocks})"));
});
test('diagnostics show centered paired reports with one copy action and preserve handlers',()=>{
 assert.ok(js.includes("diagnosticGrid.className='rm-diagnostic-grid'"));
 assert.ok(js.includes("diagnosticGrid.append(panel)"));
 assert.ok(js.includes("advanced.append(diagnosticGrid,diagnosticToolbar,original)"));
 assert.ok(js.includes("copyAll.textContent='Copy Diagnostics'"));
 assert.ok(js.includes("navigator.clipboard.writeText(text)"));
 assert.ok(js.includes("original.hidden=true"));
 assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'));
 assert.ok(css.includes('.rm-diagnostic-card>.actions,'));
 assert.ok(app.includes("usbRefresh.onclick=refreshUSBDiagnostics"));
 assert.ok(app.includes("$('radio-refresh').onclick=refreshRadioDiagnostics"));
});

test('offline write preparation remains separate from the locked hardware write and verify controls',()=>{
 assert.ok(html.includes('id="prepare-uv16-write"'));
 assert.ok(html.includes('id="uv16-write-preparation-result" role="status" aria-live="polite" hidden'));
 for(const id of ['radio-write-placeholder','radio-verify-write-placeholder'])
  assert.match(html,new RegExp('<button id="'+id+'" type="button" disabled'));
 assert.ok(app.includes("import {prepareUV16WritePlan,formatUV16WritePlan} from './uv16-write-preparation.js'"));
 assert.ok(app.includes("writePreparationButton.onclick=()=>"));
 assert.ok(app.includes("download('bsg-comms-uv16-editor-before-write.json'"));
 const dryRun=readFileSync(new URL('../uv16-write-preparation.js',import.meta.url),'utf8');
 assert.ok(dryRun.includes('readyForHardware:false,writeEnabled:false'));
 assert.ok(dryRun.includes('radioMemorySlot:null'));
 assert.ok(dryRun.includes('rawMemoryBackupAvailable:false,firmwareMatchedEncoderVerified:false'));
 assert.ok(!dryRun.includes('getWriter('));
 assert.ok(!dryRun.includes('0x57'));
});

test('offline write assessment is invalidated after channel edits, imports or model switch',()=>{
 assert.ok(app.includes("function render(){const stalePlan=$('uv16-write-preparation-result');"));
 assert.ok(app.includes("stalePlan.hidden=true;stalePlan.textContent=''"));
 assert.ok(app.includes("channels=updated;render()"));
 assert.ok(app.includes("channels=readChannels();"));
 assert.ok(app.includes("render();"));
});

test('transparent BSG crest sits in the Radio Manager heading, not the sidebar',()=>{
 assert.ok(shell.includes("homeLink.className='bsg-logo-home workspace-home-logo'"));
 assert.ok(shell.includes("homeLink.href='https://blacksurvivalgear.github.io/bsg1/'"));
 assert.ok(shell.includes("homeLogo.src='../BSG%20GOLD%20LOGO.png'"));
 assert.ok(shell.includes("topbar.append(homeLink,heading)"));
 assert.ok(!shell.includes('sidebar.append(homeLink)'));
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(style.includes('.workspace-topbar .workspace-home-logo img'));
 assert.ok(style.includes('.workspace-topbar .workspace-home-logo:focus-visible'));
});
test('desktop sidebar defaults to a narrow hover rail, with focus and pin alternatives',()=>{
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(style.includes('@media(min-width:761px){\n .app-shell{grid-template-columns:72px minmax(0,1fr)}'));
 assert.ok(style.includes('.app-sidebar:is(:hover,:focus-within,.is-pinned)'));
 assert.ok(style.includes('width:238px;box-shadow:10px 5px 24px #0009'));
 assert.ok(style.includes('visibility:hidden;opacity:0;pointer-events:none'));
 assert.ok(shell.includes("railToggle.setAttribute('aria-controls','app-sidebar')"));
 assert.ok(shell.includes("railToggle.setAttribute('aria-expanded','false')"));
 assert.ok(shell.includes("sidebar.classList.toggle('is-pinned')"));
 assert.ok(shell.includes("sidebar.classList.remove('is-open','is-pinned')"));
 assert.ok(shell.includes("const button=document.createElement('button');button.type='button';button.dataset.target=item.id"));
});
test('touch/mobile retains existing explicit menu and reduced-motion users avoid hover animations',()=>{
 const style=readFileSync(new URL('../style.css',import.meta.url),'utf8');
 assert.ok(style.includes('@media(max-width:760px){\n .app-sidebar .sidebar-rail-toggle{display:none}'));
 assert.ok(style.includes('.app-sidebar.is-open{transform:translateX(0)}'));
 assert.ok(style.includes('@media(prefers-reduced-motion:reduce)'));
 assert.ok(shell.includes("menu.onclick=()=>{const opened=sidebar.classList.toggle('is-open')"));
 assert.ok(shell.includes("backdrop.onclick=closeMenu"));
});
