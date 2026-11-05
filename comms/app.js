import {SDR_DIRECTORIES,searchSDR,readSDRFavorites,toggleSDRFavorite} from './sdr.js';
import {parseRepeaterCSV,searchRepeaters,repeaterChannel} from './repeaters.js';
import {ConnectionManager} from './connection.js';
import {NativeRadioDriver} from './native-driver.js';
import {VirtualRadio} from './virtual-radio.js';
import {runFamilyMockRead} from './uv5r-family-mock.js';
import {previewBFF8HPIdentity} from './bff8hp-identification-preview.js';
import {validateVirtualMemory} from './virtual-memory-validation.js';
import {normaliseChannel,parseCSV,toCSV,parseBackup} from './channels.js';
import {readProfiles,saveProfile,deleteProfile} from './profiles.js';
import {MODELS,readModel,channelKey,modelStorage,migrateLegacyChannels} from './models.js';
const $=id=>document.getElementById(id);migrateLegacyChannels(localStorage);let model=readModel(localStorage),key=channelKey(model),channels=[];
const profileStore=()=>modelStorage(localStorage,model);
function readChannels(){try{const saved=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(saved)?saved.slice(0,1000).map(normaliseChannel):[];}catch{return [];}}

channels=readChannels();
function persist(){localStorage.setItem(key,JSON.stringify(channels));$('count').textContent='('+channels.length+')';}
function render(){const body=$('channels');body.replaceChildren();channels.forEach((channel,index)=>{const row=document.createElement('tr'),number=document.createElement('td');number.textContent=String(index+1);row.append(number);for(const field of ['name','rx','tx','mode','notes']){const cell=document.createElement('td');const input=field==='mode'?document.createElement('select'):document.createElement('input');if(field==='mode'){for(const mode of ['FM','NFM']){const option=document.createElement('option');option.value=mode;option.textContent=mode;input.append(option);}}else{input.type='text';input.setAttribute('aria-label',field+' for channel '+(index+1));}input.value=channel[field];input.addEventListener('change',()=>{try{channels[index]=normaliseChannel({...channel,[field]:input.value});persist();render();}catch(e){alert(e.message);render();}});cell.append(input);row.append(cell);}const advanced=document.createElement('td'),toggle=document.createElement('button');toggle.textContent='Settings';toggle.setAttribute('aria-label','Advanced settings for channel '+(index+1));toggle.onclick=()=>{const detail=document.getElementById('advanced-'+index);detail.hidden=!detail.hidden;};advanced.append(toggle);row.append(advanced);const cell=document.createElement('td'),remove=document.createElement('button');remove.textContent='Delete';remove.setAttribute('aria-label','Delete channel '+(index+1));remove.onclick=()=>{channels.splice(index,1);persist();render();};cell.append(remove);row.append(cell);body.append(row);const details=document.createElement('tr');details.id='advanced-'+index;details.hidden=true;const panel=document.createElement('td');panel.colSpan=8;const grid=document.createElement('div');grid.className='advanced-grid';const fields=[['power','Power',['Default','Low','Medium','High']],['tone','Tone',['None','CTCSS','DCS']],['toneValue','Tone value'],['direction','Repeater',['Simplex','Plus','Minus']],['offset','Offset MHz'],['scan','Include in scan'],['receiveOnly','Receive only']];for(const [field,label,options] of fields){const wrap=document.createElement('label');wrap.textContent=label+' ';const input=options?document.createElement('select'):document.createElement('input');if(options){for(const value of options){const option=document.createElement('option');option.value=value;option.textContent=value;input.append(option);}}else input.type=['scan','receiveOnly'].includes(field)?'checkbox':'text';if(input.type==='checkbox')input.checked=channel[field];else input.value=channel[field];input.addEventListener('change',()=>{try{const value=input.type==='checkbox'?input.checked:input.value;channels[index]=normaliseChannel({...channels[index],[field]:value});persist();render();document.getElementById('advanced-'+index).hidden=false;}catch(e){alert(e.message);}});wrap.append(input);grid.append(wrap);}panel.append(grid);details.append(panel);body.append(details);});persist();}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('add').onclick=()=>{if(channels.length>=1000)return alert('Maximum 1000 channels');channels.push(normaliseChannel({name:'NEW',rx:'145.500',tx:'145.500',mode:'FM',notes:''}));render();};
$('export').onclick=()=>download('bsg-comms-channels.csv',toCSV(channels),'text/csv');
$('backup').onclick=()=>download('bsg-comms-backup.json',JSON.stringify({format:'squawk-channels-v1',channels},null,2),'application/json');
let importType='csv';$('import').onclick=()=>{importType='csv';$('file').accept='.csv';$('file').click();};$('restore').onclick=()=>{importType='json';$('file').accept='.json';$('file').click();};
$('file').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{const incoming=importType==='csv'?parseCSV(await file.text()):parseBackup(await file.text());if(incoming.length>1000)throw Error('Maximum 1000 channels');if(confirm('Replace the current channel list with '+incoming.length+' imported channels?')){channels=incoming;render();}}catch(e){alert('Import failed: '+e.message);}event.target.value='';};
document.addEventListener('squawk-add-receive-only-channel',event=>{
 if(channels.length>=1000)return alert('Maximum 1000 channels');
 try{const candidate=normaliseChannel({...event.detail,receiveOnly:true});channels.push(candidate);render();alert('Receive-only reference added to Channel Editor.');}
 catch(error){alert('Unable to add channel: '+error.message);}
});
let virtualRadio=null;
let virtualDriver=null;
const simulatorIdentity=document.createElement('p');
simulatorIdentity.id='simulator-identity';
simulatorIdentity.textContent='Virtual radio not connected.';
const identityPreview=document.createElement('button');
identityPreview.type='button';identityPreview.id='bff8hp-identification-preview';
identityPreview.textContent='Preview BF-F8HP identity';
identityPreview.title='Offline demonstration only; no USB communication';
const simulatorRead=document.createElement('button');
simulatorRead.type='button';simulatorRead.id='simulator-read';
simulatorRead.textContent='Read virtual radio';simulatorRead.disabled=true;
// My Radios is visible in the tabbed shell; diagnostics may be hidden.
$('simulate').after(simulatorRead);
simulatorRead.after(identityPreview);
const selectionRow=document.createElement('div');
selectionRow.className='radio-selection-row';
selectionRow.append(document.querySelector('label[for="radio-model"]'),$('radio-model'),identityPreview);
$('model-name').after(selectionRow);
$('connection').after(simulatorIdentity);
const diagnostics=$('diagnostic-log');
function addDiagnostic(message){
  const entry=document.createElement('li');
  entry.textContent=new Date().toLocaleTimeString()+' — '+message;
  diagnostics.prepend(entry);
  while(diagnostics.children.length>30)diagnostics.lastElementChild.remove();
}
const connectionManager=new ConnectionManager({
  serial:navigator.serial??null,
  onChange:({state,mode,info,baudRate})=>{
    const busy=state==='connecting'||state==='disconnecting';
    simulatorRead.disabled=busy||state!=='connected'||mode!=='simulation';
    identityPreview.disabled=busy||state==='connected'||model!=='bf-f8hp';
    $('connect').disabled=busy||state==='connected';
    $('simulate').disabled=busy||state==='connected';
    $('disconnect').disabled=busy||state==='disconnected';
    $('connection-state').textContent=state==='connected'?(mode==='simulation'?'Simulator connected':'USB port connected'):state;
    $('connection').textContent=state==='connected'
      ?(mode==='simulation'?'Simulation only — no hardware connected.':'Serial transport open. Radio identity and programming protocol are unverified.')
      :'No radio connection. Hardware programming is not supported.';
    $('device-mode').textContent=mode==='usb'?'USB serial':mode==='simulation'?'Simulation':'None';
    $('device-vendor').textContent=mode==='usb'?info.vendorId:'Unavailable';
    $('device-product').textContent=mode==='usb'?info.productId:'Unavailable';
    $('device-baud').textContent=baudRate===null?'Unavailable':String(baudRate);
  },
  onLog:addDiagnostic
});
identityPreview.onclick=async()=>{
  if(model!=='bf-f8hp'||connectionManager.state!=='disconnected')return;
  if(!confirm('Run a SYNTHETIC BF-F8HP identity preview? No USB port or physical radio will be accessed.'))return;
  identityPreview.disabled=true;
  try{
    const result=await previewBFF8HPIdentity({consent:true});
    simulatorIdentity.textContent='BF-F8HP identity preview: '+result.identityHex+' · SYNTHETIC · model unconfirmed · no USB used';
    addDiagnostic('BF-F8HP offline identity preview completed; synthetic, model unconfirmed, no USB commands');
  }catch(error){addDiagnostic('BF-F8HP preview failed: '+error.message);alert(error.message);}
  finally{identityPreview.disabled=connectionManager.state!=='disconnected'||model!=='bf-f8hp';}
};
$('connect').onclick=async()=>{try{await connectionManager.connectUSB();}catch(e){alert('Connection failed: '+e.message);}};
$('simulate').onclick=async()=>{try{
  connectionManager.connectSimulator();
  virtualRadio=new VirtualRadio({model});
  virtualDriver=new NativeRadioDriver({transport:virtualRadio,model});
  const identity=await virtualDriver.identify();
  const familyMock=['uv-5r','bf-f8hp'].includes(model)?await runFamilyMockRead(model):null;
  simulatorIdentity.textContent='Virtual radio: '+identity.model+' · '+identity.firmware+' (simulated, not physical hardware)'+(familyMock?' · '+familyMock.blockLength+'-byte protocol mock passed (synthetic data)':'');
  if(familyMock)addDiagnostic('Offline '+model+' mock protocol: 64-byte framed read validated; not hardware verified');
  addDiagnostic('Virtual radio identified: '+identity.model+' (simulated)');
}catch(e){virtualRadio?.disconnect();virtualRadio=null;virtualDriver=null;simulatorIdentity.textContent='Virtual radio unavailable.';addDiagnostic('Simulator error: '+e.message);try{if(connectionManager.mode==='simulation')await connectionManager.disconnect();}catch{}alert(e.message);}};
simulatorRead.onclick=async()=>{
  if(connectionManager.mode!=='simulation'||!virtualDriver)return;
  simulatorRead.disabled=true;
  try{
    const memory=await virtualDriver.readMemory();
    const incoming=validateVirtualMemory(memory,model).channels;
    if(incoming.length>1000)throw Error('Maximum 1000 channels');
    if(confirm('Load '+incoming.length+' SIMULATED channels into the editor? This replaces the current local channel list.')){
      channels=incoming;render();addDiagnostic('Loaded '+incoming.length+' simulated channels into the editor');
    }else addDiagnostic('Simulated memory read cancelled by user');
  }catch(e){addDiagnostic('Virtual memory read failed: '+e.message);alert(e.message);}
  finally{simulatorRead.disabled=connectionManager.mode!=='simulation'||connectionManager.state!=='connected';}
};
$('disconnect').onclick=async()=>{try{await connectionManager.disconnect();virtualRadio?.disconnect();virtualRadio=null;virtualDriver=null;simulatorIdentity.textContent='Virtual radio not connected.';}catch(e){alert('Disconnect failed: '+e.message);}};
connectionManager.setState('disconnected');
addDiagnostic('Diagnostics ready. No radio read/write commands are available.');



let repeaterRows=[];
const repeaterResults=$('repeater-results');
function showRepeaters(){
  repeaterResults.replaceChildren();
  const found=searchRepeaters(repeaterRows,$('repeater-query').value,$('repeater-band').value);
  $('repeater-count').textContent=repeaterRows.length?found.length+' matching repeaters':'Load a UK repeater CSV to search';
  for(const repeater of found.slice(0,100)){
    const row=document.createElement('tr');
    const addCell=value=>{const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);return cell;};
    addCell(repeater.callsign);addCell(repeater.location||'—');
    addCell(repeater.rx.toFixed(5));addCell(repeater.tx===null?'Not listed':repeater.tx.toFixed(5));
    addCell(repeater.tone||'—');addCell(repeater.mode);addCell(repeater.status||'—');
    const actions=document.createElement('td'),button=document.createElement('button');
    button.textContent='Add channel';
    button.disabled=!repeater.analog||repeater.tx===null;
    button.title=button.disabled?'Requires confirmed analogue mode and input frequency':'Adds receive-only channel for review';
    button.onclick=()=>{
      if(channels.length>=1000)return alert('Maximum 1000 channels');
      try{
        const candidate=normaliseChannel(repeaterChannel(repeater));
        if(!confirm('Add '+repeater.callsign+' as a receive-only channel? Check all settings before enabling transmission.'))return;
        channels.push(candidate);render();
      }catch(error){alert('Cannot import repeater: '+error.message);}
    };
    actions.append(button);row.append(actions);repeaterResults.append(row);
  }
}
$('repeater-file-button').onclick=()=>$('repeater-file').click();
$('repeater-file').onchange=async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try{
    if(file.size>2_000_000)throw Error('CSV must be under 2 MB');
    const parsed=parseRepeaterCSV(await file.text());
    repeaterRows=parsed;showRepeaters();
    $('repeater-message').textContent='Loaded '+parsed.length+' records from '+file.name+'. Verify current data with the source.';
  }catch(error){$('repeater-message').textContent='Import failed: '+error.message;}
  event.target.value='';
};
$('repeater-query').addEventListener('input',showRepeaters);
$('repeater-band').addEventListener('change',showRepeaters);
showRepeaters();

function refreshProfiles(){
  const select=$('profiles'),previous=select.value;
  select.replaceChildren();
  const placeholder=document.createElement('option');
  placeholder.value='';
  placeholder.textContent='Select saved profile';
  select.append(placeholder);
  for(const name of Object.keys(readProfiles(profileStore())).sort()){
    const option=document.createElement('option');
    option.value=name;
    option.textContent=name;
    select.append(option);
  }
  if([...select.options].some(option=>option.value===previous))select.value=previous;
}
$('save-profile').onclick=()=>{
  const name=prompt('Profile name (up to 50 characters):',$('profiles').value||'');
  if(name===null)return;
  try{
    const key=name.trim(),existing=readProfiles(profileStore());
    if(Object.hasOwn(existing,key)&&!confirm('Overwrite saved profile "'+key+'"?'))return;
    saveProfile(profileStore(),key,channels);
    refreshProfiles();
    $('profiles').value=key;
  }catch(e){alert(e.message);}
};
$('load-profile').onclick=()=>{
  const name=$('profiles').value;
  if(!name)return alert('Select a saved profile');
  const saved=readProfiles(profileStore())[name];
  if(!saved)return alert('Profile unavailable');
  if(confirm('Replace current channels with profile "'+name+'"?')){channels=saved;render();}
};
$('delete-profile').onclick=()=>{
  const name=$('profiles').value;
  if(!name)return alert('Select a saved profile');
  if(confirm('Delete saved profile "'+name+'"?')){
    deleteProfile(profileStore(),name);
    refreshProfiles();
  }
};

const selector=$('radio-model');
for(const item of MODELS){
  const option=document.createElement('option');
  option.value=item.id;
  option.textContent=item.name;
  selector.append(option);
}
selector.value=model;
function displayModel(){
  const selected=MODELS.find(item=>item.id===model);
  $('model-name').textContent=selected.name;
  $('programming-model').textContent=selected.name;
  // Model selection changes the workspace, not the physical USB connection.
}
selector.addEventListener('change',()=>{
  if(connectionManager.state!=='disconnected'){
    selector.value=model;
    alert('Disconnect before changing radio model.');
    return;
  }
  model=selector.value;
  identityPreview.disabled=model!=='bf-f8hp';
  simulatorIdentity.textContent='Virtual radio not connected.';
  localStorage.setItem('squawk-selected-model-v1',model);
  key=channelKey(model);
  channels=readChannels();
  displayModel();
  refreshProfiles();
  $('profiles').value='';
  render();
});
displayModel();
identityPreview.disabled=model!=='bf-f8hp';
refreshProfiles();
render();

const sdrResults=$('sdr-results');
function renderSDR(){
  sdrResults.replaceChildren();
  const favorites=readSDRFavorites(localStorage);
  const matches=searchSDR(SDR_DIRECTORIES,{query:$('sdr-query').value,type:$('sdr-type').value,favoritesOnly:$('sdr-favorites-only').checked,favorites});
  $('sdr-count').textContent=matches.length+' directories';
  for(const entry of matches){
    const card=document.createElement('article');card.className='sdr-card';
    const title=document.createElement('h3');title.textContent=entry.name;
    const meta=document.createElement('p');meta.className='sdr-meta';meta.textContent=entry.type+' · '+entry.region;
    const desc=document.createElement('p');desc.textContent=entry.description;
    const actions=document.createElement('div');actions.className='actions';
    const open=document.createElement('a');open.className='sdr-open';open.href=entry.url;open.target='_blank';open.rel='noopener noreferrer';open.textContent='Explore receivers';
    const favorite=document.createElement('button');favorite.type='button';
    favorite.textContent=favorites.includes(entry.id)?'★ Saved':'☆ Favourite';
    favorite.setAttribute('aria-pressed',String(favorites.includes(entry.id)));
    favorite.setAttribute('aria-label',(favorites.includes(entry.id)?'Remove favourite ':'Save favourite ')+entry.name);
    favorite.onclick=()=>{toggleSDRFavorite(localStorage,entry.id);renderSDR();};
    actions.append(open,favorite);card.append(title,meta,desc,actions);sdrResults.append(card);
  }
  if(!matches.length){const empty=document.createElement('p');empty.textContent='No matching SDR directories. Try a different filter.';sdrResults.append(empty);}
}
$('sdr-query').addEventListener('input',renderSDR);
$('sdr-type').addEventListener('change',renderSDR);
$('sdr-favorites-only').addEventListener('change',renderSDR);
renderSDR();
