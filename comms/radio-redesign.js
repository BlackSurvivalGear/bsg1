// Approved Radio Manager presentation. Reuses the existing connected USB and editor controls.
// The workspace sidebar, serial protocol and channel persistence remain unchanged.
const $=id=>document.getElementById(id);
const page=document.querySelector('.workspace-view[data-workspace="radios"]');
const original=$('connect')?.closest('.radio-console');
const editor=page?.querySelector('.radio-editor-card');
if(page&&original&&editor){
 page.classList.add('approved-radio-manager');
 const steps=document.createElement('div');steps.className='rm-steps';
 for(const [i,name] of ['Connect Radio','Identify','Read Channels','Edit Channels','Write & Verify'].entries()){
  const step=document.createElement('div');step.className='rm-step';step.dataset.step=String(i+1);
  const number=document.createElement('span');number.className='rm-step-number';number.textContent=String(i+1);
  const label=document.createElement('span');label.textContent=name;step.append(number,label);
  steps.append(step);
 }
 const hero=document.createElement('section');hero.className='rm-hero';hero.setAttribute('aria-label','Physical radio');
 const photo=document.createElement('div');photo.className='rm-photo';
 const img=document.createElement('img');img.src='../UV%2016%20PRO.png';img.alt='Baofeng UV-16 Pro V2 radio';img.loading='lazy';img.decoding='async';img.onerror=()=>{img.hidden=true;};
 photo.append(img);
 const centre=document.createElement('div');centre.className='rm-main';
 const title=document.createElement('h2');title.className='rm-model';title.textContent=$('model-name')?.textContent||'Radio Manager';
 const firmware=document.createElement('p');firmware.className='rm-firmware';firmware.textContent='Firmware: Not yet identified';
 const readHint=document.createElement('p');readHint.className='rm-read-hint';readHint.textContent='Read the radio’s programmed channels from the physical device.';
 const identifyButton=document.createElement('button');identifyButton.type='button';identifyButton.id='radio-identify';identifyButton.className='rm-identify-button';identifyButton.textContent='Identify Radio';identifyButton.disabled=true;
 centre.append(title,firmware,identifyButton);
 const status=document.createElement('div');status.className='rm-status';
 const heading=document.createElement('h3');heading.textContent='Radio Status';
 const connection=document.createElement('p');connection.className='rm-live-state';connection.textContent='Radio disconnected';
 const modelLine=document.createElement('div');modelLine.className='rm-status-line';modelLine.innerHTML='<span>Model</span>';
 const modelValue=document.createElement('strong');modelLine.append(modelValue);
 const portLine=document.createElement('div');portLine.className='rm-status-line';portLine.innerHTML='<span>Connection</span>';
 const portValue=document.createElement('strong');portLine.append(portValue);
 const fwLine=document.createElement('div');fwLine.className='rm-status-line';fwLine.innerHTML='<span>Firmware</span>';
 const fwValue=document.createElement('strong');fwLine.append(fwValue);
 status.append(heading,connection,modelLine,portLine,fwLine);
 const toolbar=document.createElement('div');toolbar.className='rm-actions';
 const connect=$('connect'),disconnect=$('usb-disconnect'),read=$('radio-read'),
  write=$('radio-write-placeholder'),verify=$('radio-verify-write-placeholder');
 connect.classList.add('rm-action','rm-connect');connect.textContent='Connect Radio';
 disconnect.classList.add('rm-action','rm-disconnect');disconnect.textContent='Disconnect';
 read.classList.add('rm-action','rm-read');
 write.classList.add('rm-action','rm-write');
 verify.classList.add('rm-action','rm-verify');
 toolbar.append(connect,disconnect,write,verify);
 centre.append(read,readHint);
 const backup=document.createElement('button');backup.type='button';backup.className='rm-action rm-backup';backup.textContent='Backup / Restore';
 backup.onclick=()=>{page.querySelector('.radio-editor-file-actions')?.scrollIntoView({behavior:'smooth',block:'center'});};
 toolbar.append(backup);
 const config=$('radio-model')?.closest('.radio-selection-row');if(config){config.classList.add('rm-model-picker');status.append(config);}
 hero.append(photo,centre,status);
 const advanced=document.createElement('details');advanced.className='rm-advanced';
 const summary=document.createElement('summary');summary.textContent='Connection settings and diagnostics';advanced.append(summary,original);
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
  const connected=$('usb-indicator')?.dataset.state==='connected';
  const identified=$('radio-indicator')?.dataset.state==='connected';
  title.textContent=$('model-name')?.textContent||'Radio Manager';
  modelValue.textContent=title.textContent;
  portValue.textContent=connected?'USB serial connected':'Disconnected';
  fwValue.textContent=identified?'HN5RV01':'Not identified';
  firmware.textContent=identified?'Firmware HN5RV01':'Firmware not yet identified';
  connection.textContent=identified?'Physical radio identified':connected?'USB connected — identification pending':'Radio disconnected';
  connection.classList.toggle('is-identified',identified);
  identifyButton.disabled=read.disabled;
  identifyButton.textContent=identified?'Identify Again':'Identify Radio';
  for(const [n,done] of [[1,connected],[2,identified],[3,identified&&Boolean($('uv16-read-preview')?.textContent.includes('Read complete'))],[4,false]]){
   const node=steps.querySelector('[data-step="'+n+'"]');node?.classList.toggle('is-complete',done);
  }
  steps.querySelector('[data-step="5"]')?.classList.add('is-locked');
 }
 const statusObserver=new MutationObserver(refresh);
 for(const el of [$('usb-indicator'),$('radio-indicator'),$('model-name'),$('uv16-read-preview'),$('count')]){
  if(el)statusObserver.observe(el,{attributes:true,childList:true,characterData:true,subtree:true});
 }
 refresh();
}
