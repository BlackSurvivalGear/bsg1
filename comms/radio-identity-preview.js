// Synthetic-only identity preview for every supported radio model.
import {MODELS} from './models.js';
import {VirtualRadio} from './virtual-radio.js';
import {NativeRadioDriver} from './native-driver.js';
import {previewBFF8HPIdentity} from './bff8hp-identification-preview.js';
export async function previewRadioIdentity(model,{consent=false}={}){
 if(!MODELS.some(item=>item.id===model))throw Error('Unsupported radio model');
 if(!consent)throw Error('Explicit identity preview consent required');
 if(model==='bf-f8hp'){
  const result=await previewBFF8HPIdentity({consent:true});
  return {model,simulated:true,confirmedModel:false,display:'Synthetic identity '+result.identityHex+' · model unconfirmed · no USB used'};
 }
 const radio=new VirtualRadio({model});
 try{
  const result=await new NativeRadioDriver({transport:radio,model}).identify();
  return {model,simulated:true,confirmedModel:false,display:'Virtual identity '+result.firmware+' · model unconfirmed · no USB used'};
 }finally{radio.disconnect();}
}
