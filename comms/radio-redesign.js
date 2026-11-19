import {prepareUV16Cutout} from './radio-photo-cutout.js';
import {MODELS} from './models.js';
// Approved Radio Manager presentation. Reuses the existing connected USB and editor controls.
// The workspace sidebar, serial protocol and channel persistence remain unchanged.
const $=id=>document.getElementById(id);
const page=document.querySelector('.workspace-view[data-workspace="radios"]');
const original=$('connect')?.closest('.radio-console');
const editor=page?.querySelector('.radio-editor-card');
if(page&&original&&editor){
 page.classList.add('approved-radio-manager');
 const steps=document.createElement('div');steps.className='rm-steps';
 for(const [i,name] of ['Connect Radio','Read Channels','Edit Channels','Write & Verify'].entries()){
  const step=document.createElement('div');step.className='rm-step';step.dataset.step=String(i+1);
  const number=document.createElement('span');number.className='rm-step-number';number.textContent=String(i+1);
  const label=document.createElement('span');label.textContent=name;step.append(number,label);
  steps.append(step);
 }
 const hero=document.createElement('section');hero.className='rm-hero';hero.setAttribute('aria-label','Physical radio');
 const photo=document.createElement('div');photo.className='rm-photo';
 const img=document.createElement('img');img.alt='Selected Baofeng radio';img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};
 photo.append(img);
 const modelSelector=$('radio-model');
 function refreshRadioImage(){
   const current=MODELS.find(item=>item.id===modelSelector?.value);
   if(!current||img.dataset.model===current.id)return;
   img.dataset.model=current.id;
   img.hidden=false;
   img.alt=current.name+' radio';
   delete img.dataset.cutoutReady;
   img.src=current.image;
   // The UV-16's original white-backed photo needs cutout processing.
   // New UV-32 / UV-5R images are displayed as supplied, without applying UV-16 processing.
   if(current.id==='uv-16-pro-v2')prepareUV16Cutout(img);
 }
 refreshRadioImage();
 modelSelector?.addEventListener('change',refreshRadioImage);
 const centre=document.createElement('div');centre.className='rm-main';
 const title=document.createElement('h2');title.className='rm-model';title.textContent='Radio Control';
 const firmware=document.createElement('p');firmware.className='rm-firmware';firmware.textContent='Firmware: Not yet identified';
 const readHint=document.createElement('p');readHint.className='rm-read-hint';readHint.textContent='Read the radio’s programmed channels from the physical device.';
 const primaryConnect=document.createElement('button');primaryConnect.type='button';primaryConnect.id='rm-primary-connect';primaryConnect.className='rm-primary-button';primaryConnect.textContent='Connect Radio';
 centre.append(title,firmware,primaryConnect);
 const status=document.createElement('div');status.className='rm-status';
 const heading=document.createElement('h3');heading.textContent='Select Radio';
 const statusLabel=document.createElement('h4');statusLabel.className='rm-status-label';statusLabel.textContent='Radio Status';
 const connection=document.createElement('p');connection.className='rm-live-state';connection.textContent='Radio disconnected';
 const portLine=document.createElement('div');portLine.className='rm-status-line';portLine.innerHTML='<span>Connection</span>';
 const portValue=document.createElement('strong');portLine.append(portValue);
 const fwLine=document.createElement('div');fwLine.className='rm-status-line';fwLine.innerHTML='<span>Firmware</span>';
 const fwValue=document.createElement('strong');fwLine.append(fwValue);
 status.append(heading);
 const toolbar=document.createElement('div');toolbar.className='rm-actions';
 const connect=$('connect'),disconnect=$('usb-disconnect'),read=$('radio-read'),
  write=$('radio-write-placeholder'),verify=$('radio-verify-write-placeholder');
 connect.classList.add('rm-action','rm-connect');connect.textContent='Connect Radio';
 disconnect.classList.add('rm-action','rm-disconnect');disconnect.textContent='Disconnect';
 read.classList.add('rm-action','rm-read');
 write.classList.add('rm-action','rm-write');
 verify.classList.add('rm-action','rm-verify');
 // Existing physical connect handler remains intact but is only invoked through the centre control.
 // Keep its original DOM node inside diagnostics; do not introduce a second connection path.
 primaryConnect.onclick=()=>{if(!connect.disabled)connect.click();};
 toolbar.append(disconnect,write,verify);
 centre.append(read,readHint);
 // The application continues to write the full read result to its existing PRE.
 // Only its presentation moves to a concise, live summary in this hero.
 const sourcePreview=$('uv16-read-preview');
 const readSummary=document.createElement('div');
 readSummary.className='rm-read-summary';
 readSummary.setAttribute('role','status');
 readSummary.setAttribute('aria-live','polite');
 readSummary.hidden=true;
 const readSummaryTitle=document.createElement('strong');
 const readSummaryMeta=document.createElement('p');
 const readSummaryOutcome=document.createElement('p');
 readSummary.append(readSummaryTitle,readSummaryMeta,readSummaryOutcome);
 centre.append(readSummary);
 // Read-only progress mirrors the existing USB reader's block callbacks.
 // Never infer progress from elapsed time or send additional commands.
 const progressPanel=document.createElement('div');
 progressPanel.className='rm-read-progress';
 progressPanel.hidden=true;
 const progressLabel=document.createElement('div');
 progressLabel.className='rm-read-progress-label';
 const progressText=document.createElement('span');progressText.textContent='Reading radio memory';
 const progressPercent=document.createElement('strong');progressPercent.textContent='0%';
 progressLabel.append(progressText,progressPercent);
 const progress=document.createElement('progress');
 progress.max=100;progress.value=0;progress.setAttribute('aria-label','Radio channel read progress');
 progressPanel.append(progressLabel,progress);
 centre.insertBefore(progressPanel,readSummary);
 sourcePreview?.classList.add('rm-source-preview');
 function refreshReadSummary(){
   const text=sourcePreview?.textContent.trim()||'';
   const selected=modelSelector?.value==='uv-16-pro-v2';
   readSummary.hidden=!selected||!text;
   if(readSummary.hidden)return;
   const lines=text.split('\n').map(line=>line.trim()).filter(Boolean);
   const success=lines[0]?.startsWith('Read complete');
   const failed=lines[0]?.startsWith('Read failed');
   const reading=lines[0]?.startsWith('Reading UV-16');
   const percentMatch=reading?lines[0]?.match(/(\\d{1,3})%/):null;
   const percent=success?100:percentMatch?Math.min(100,Math.max(0,Number(percentMatch[1]))):0;
   progressPanel.hidden=!selected||(!reading&&!success);
   if(!progressPanel.hidden){
     progress.value=percent;
     progressPercent.textContent=percent+'%';
     progressText.textContent=success?'Channel read complete':'Reading radio memory';
     progressPanel.classList.toggle('is-complete',success);
   }
   readSummary.classList.toggle('is-success',success);
   readSummary.classList.toggle('is-error',failed);
   readSummaryTitle.textContent=success?'✓ '+lines[0]:failed?lines[0]:lines[0]||'';
   readSummaryMeta.textContent=success
    ?[lines.find(line=>/^Scanned \d+ memory locations\.$/.test(line)),lines.find(line=>line.startsWith('Radio firmware:'))].filter(Boolean).join(' · ')
    :'';
   readSummaryOutcome.textContent=success
    ?lines.find(line=>/channels added to Channel Editor|retrieved channels already exist/.test(line))||'Channel frequencies retrieved. Modes, tones and power remain unverified.'
    :'';
 }
 sourcePreview&&new MutationObserver(refreshReadSummary).observe(sourcePreview,{childList:true,characterData:true,subtree:true});
 modelSelector?.addEventListener('change',refreshReadSummary);
 refreshReadSummary();
 const backup=document.createElement('button');backup.type='button';backup.className='rm-action rm-backup';backup.textContent='Backup / Restore';
 backup.onclick=()=>{page.querySelector('.radio-editor-file-actions')?.scrollIntoView({behavior:'smooth',block:'center'});};
 toolbar.append(backup);
 const config=$('radio-model')?.closest('.radio-selection-row');if(config){config.classList.add('rm-model-picker');status.append(config);}
 status.append(statusLabel,connection,portLine,fwLine);
 // Selection and physical status come first; the live action stays central and artwork previews on the right.
 hero.append(status,centre,photo);
 const advanced=document.createElement('details');advanced.className='rm-advanced';
 const summary=document.createElement('summary');summary.textContent='Connection settings and diagnostics';advanced.append(summary);
 // Keep all underlying diagnostics and settings handlers connected to their original nodes.
 // Reparent the two pre-existing diagnostics reports instead of recreating their data.
 const usbPanel=$('usb-diagnostics-panel'),radioPanel=$('radio-diagnostics-panel');
 const diagnosticGrid=document.createElement('div');diagnosticGrid.className='rm-diagnostic-grid';
 for(const panel of [usbPanel,radioPanel]){
   if(!panel)continue;
   panel.classList.add('rm-diagnostic-card');
   panel.querySelector('.actions')?.setAttribute('hidden','');
   panel.querySelector('p')?.setAttribute('hidden','');
   panel.querySelector('[role="status"]')?.setAttribute('hidden','');
   diagnosticGrid.append(panel);
 }
 const diagnosticToolbar=document.createElement('div');diagnosticToolbar.className='rm-diagnostic-toolbar';
 const radioSettings=$('radio-settings-open');
 if(radioSettings)diagnosticToolbar.append(radioSettings);
 const copyAll=document.createElement('button');copyAll.type='button';
 copyAll.className='rm-copy-diagnostics';copyAll.textContent='Copy Diagnostics';
 const copyFeedback=document.createElement('span');copyFeedback.className='rm-copy-feedback';
 copyFeedback.setAttribute('role','status');
 copyAll.onclick=async()=>{
   // Refresh the existing read-only reports using their original handlers.
   $('usb-refresh')?.click();$('radio-refresh')?.click();
   const text=['USB Diagnostics',$('usb-diagnostics-info')?.textContent||'',
               'Radio Diagnostics',$('radio-diagnostics-info')?.textContent||''].join('\n\n');
   try{await navigator.clipboard.writeText(text);copyFeedback.textContent='Copied both diagnostic reports';}
   catch{copyFeedback.textContent='Clipboard unavailable';}
 };
 diagnosticToolbar.append(copyAll,copyFeedback);
 advanced.append(diagnosticGrid,diagnosticToolbar,original);
 original.hidden=true;
 advanced.addEventListener('toggle',()=>{
   if(!advanced.open)return;
   for(const panel of [usbPanel,radioPanel])if(panel)panel.open=true;
   $('usb-refresh')?.click();$('radio-refresh')?.click();
 });
 page.insertBefore(steps,editor);page.insertBefore(hero,editor);page.insertBefore(toolbar,editor);page.insertBefore(advanced,editor);
 const search=document.createElement('input');search.type='search';search.className='rm-search';search.placeholder='Search channels…';
 search.setAttribute('aria-label','Search channels');
 const editorHeading=editor.querySelector('.toolbar');editorHeading?.append(search);
 const table=$('channels');
 function filterRows(){
  const q=search.value.trim().toLowerCase();const rows=[...table.children];
  for(let i=0;i<rows.length;i+=2){
   const main=rows[i],details=rows[i+1];const matched=!q||main?.textContent.toLowerCase().includes(q)||
    [...(main?.querySelectorAll('input,select')||[])].some(el=>(el.value||'').toLowerCase().includes(q));
   if(main)main.hidden=!matched;
   if(details)details.hidden=!matched||details.dataset.rmExpanded!=='yes';
  }
 }
 // Existing editor renders its advanced rows hidden by default; filter only main rows.
 search.addEventListener('input',()=>{
  const q=search.value.trim().toLowerCase();
  for(let i=0;i<table.children.length;i+=2){
   const row=table.children[i],detail=table.children[i+1];
   const match=!q||[row?.textContent,...[...(row?.querySelectorAll('input,select')||[])].map(x=>x.value)].join(' ').toLowerCase().includes(q);
   if(row)row.style.display=match?'':'none';
   if(detail)detail.style.display=match?'':'none';
  }
 });
 const observer=new MutationObserver(()=>{if(search.value)search.dispatchEvent(new Event('input'));});
 observer.observe(table,{childList:true});
 function refresh(){
  refreshRadioImage();
  const selectedModel=MODELS.find(item=>item.id===modelSelector?.value);
  const supportsPhysicalRead=selectedModel?.physicalRead===true;
  const connected=$('usb-indicator')?.dataset.state==='connected';
  const identified=supportsPhysicalRead&&$('radio-indicator')?.dataset.state==='connected';
  // Show the chosen physical radio name in the centre header, not a generic label.
  title.textContent=selectedModel?.name||'Radio Control';
  portValue.textContent=connected?'USB serial connected':'Disconnected';
  fwValue.textContent=!supportsPhysicalRead?'Unsupported':identified?'HN5RV01':'Not identified';
  firmware.textContent=!supportsPhysicalRead?'Physical radio protocol not yet supported':identified?'Firmware HN5RV01':'Firmware not yet identified';
  connection.textContent=!supportsPhysicalRead?'Model preview only — physical read unavailable':identified?'Physical radio identified':connected?'USB connected — identity verified during Read':'Radio disconnected';
  connection.classList.toggle('is-identified',identified);
  // Exactly one primary action is visible. Never present Read before firmware identification.
  primaryConnect.hidden=connected;
  // PR #51 reads firmware and all 128 slots in one uninterrupted transaction.
  read.hidden=!connected||!supportsPhysicalRead;
  primaryConnect.textContent=supportsPhysicalRead?'Connect Radio':'Physical read not yet supported';
  primaryConnect.disabled=connect.disabled||!supportsPhysicalRead;
  readHint.textContent=!supportsPhysicalRead?'UV-32 and UV-5R physical identification and memory reading are not yet implemented.'
   :!connected?'Connect the physical radio using its USB programming cable.'
   :'Read the radio’s channels. Firmware HN5RV01 is identified during the same complete read.';
  const readComplete=connected&&identified&&Boolean($('uv16-read-preview')?.textContent.includes('Read complete'));
  for(const [n,done] of [[1,connected],[2,readComplete],[3,false]]){
   const node=steps.querySelector('[data-step="'+n+'"]');node?.classList.toggle('is-complete',done);
  }
  steps.querySelector('[data-step="4"]')?.classList.add('is-locked');
 }
 const statusObserver=new MutationObserver(refresh);
 for(const el of [$('usb-indicator'),$('radio-indicator'),$('model-name'),$('uv16-read-preview'),$('count')]){
  if(el)statusObserver.observe(el,{attributes:true,childList:true,characterData:true,subtree:true});
 }
 refresh();
}
