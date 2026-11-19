export const MODELS=Object.freeze([
 Object.freeze({id:'uv-32',name:'Baofeng UV-32',image:'../UV32.png',physicalRead:false}),
 Object.freeze({id:'uv-16-pro-v2',name:'Baofeng UV-16 Pro V2',image:'../UV%2016%20PRO.png',physicalRead:true}),
 Object.freeze({id:'uv-5r',name:'Baofeng UV-5R',image:'../UV%205R.png',physicalRead:false})
]);
export const DEFAULT_MODEL='uv-16-pro-v2';
export function isModel(id){return MODELS.some(model=>model.id===id);}
export function channelKey(id){if(!isModel(id))throw Error('Unknown radio model');return 'squawk-channels-v2:'+id;}
export function modelStorage(storage,id){if(!isModel(id))throw Error('Unknown radio model');return {getItem:key=>storage.getItem(key+':'+id),setItem:(key,value)=>storage.setItem(key+':'+id,value)};}
export function readModel(storage){const id=storage.getItem('squawk-selected-model-v1');return isModel(id)?id:DEFAULT_MODEL;}
export function migrateLegacyChannels(storage){const old=storage.getItem('squawk-channels-v1'),target=channelKey(DEFAULT_MODEL);if(old!==null&&storage.getItem(target)===null)storage.setItem(target,old);}
