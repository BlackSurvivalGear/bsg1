import {MODELS} from './models.js';
const byId=id=>document.getElementById(id);
const dialog=byId('radio-settings-dialog'),ports=byId('settings-port'),models=byId('settings-model'),note=byId('settings-note');
let authorised=[];
for(const item of MODELS){const option=document.createElement('option');option.value=item.id;option.textContent=item.name.replace(/^Baofeng /,'');models.append(option);}
async function refreshPorts(){
  ports.replaceChildren();authorised=[];
  const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Select port when connecting';ports.append(placeholder);
  if(!navigator.serial?.getPorts){note.textContent='Web Serial requires desktop Chrome or Edge on HTTPS. COM port names are not exposed by browsers.';return;}
  try{
    authorised=await navigator.serial.getPorts();
    authorised.forEach((port,index)=>{const option=document.createElement('option');option.value=String(index);const info=port.getInfo?.()||{};option.textContent='Authorised USB port '+(index+1)+(info.usbVendorId?' (USB '+info.usbVendorId.toString(16)+')':'');ports.append(option);});
    note.textContent='Browsers cannot reveal Windows COM numbers (such as COM6). Use Connect USB to authorise a new port.';
  }catch{note.textContent='Unable to list authorised ports. Use Connect USB to select a port.';}
}
byId('radio-settings-open').addEventListener('click',async()=>{
  models.value=byId('radio-model').value;
  await refreshPorts();
  dialog.showModal();
});
dialog.addEventListener('close',()=>{
  if(dialog.returnValue!=='confirm')return;
  const selector=byId('radio-model');
  if(selector.value!==models.value){selector.value=models.value;selector.dispatchEvent(new Event('change',{bubbles:true}));}
  // The chosen port is advisory only; no serial connection is opened here.
  if(ports.value!=='')note.textContent='Port preference saved for this session. Use Connect USB to open a port.';
});
