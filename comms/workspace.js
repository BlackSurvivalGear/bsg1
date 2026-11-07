export const WORKSPACES=Object.freeze([
 {id:'dashboard',title:'Dashboard',group:'Workspace',description:'Overview and quick access',ready:true},
 {id:'radios',title:'Radio Manager',group:'Workspace',description:'Connect, simulate, manage profiles and edit channels',ready:true},
 {id:'repeaters',title:'Repeaters',group:'Discover',description:'UK CSV repeater search',ready:true},
 {id:'sdr',title:'Global SDR',group:'Discover',description:'Public online receiver directories',ready:true},
 {id:'frequencies',title:'Frequencies',group:'Discover',description:'UK band and service frequency reference',ready:true},
 {id:'african-networks',title:'African Networks',group:'Discover',description:'African amateur radio organisations and communities',ready:true},
 {id:'operations',title:'Operations',group:'Plan',description:'Map and terrain radio range planner',ready:true},
 {id:'tools',title:'Radio Tools',group:'Plan',description:'Antenna and RF power calculators',ready:true},

 {id:'academy',title:'Radio Academy',group:'Plan',description:'Offline radio lessons and knowledge checks',ready:true},
 {id:'settings',title:'Settings',group:'System',description:'USB diagnostics and hardware status',ready:true}
]);
export const DEFAULT_WORKSPACE='dashboard';
export function validWorkspace(value){if(value==='channels')return 'radios';return WORKSPACES.some(item=>item.id===value)?value:DEFAULT_WORKSPACE;}
export function workspaceFromHash(hash){return validWorkspace(String(hash||'').replace(/^#\/?/,'').split('/')[0]);}
