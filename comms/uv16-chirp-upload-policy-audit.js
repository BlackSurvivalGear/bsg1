// Read-only model of CHIRP baofeng_common.py upload gating; never generates write frames.
export const CHIRP_UPLOAD_POLICY_FORMAT='bsg-uv16-chirp-upload-policy-v1';
export const CHIRP_FULL_RANGES=Object.freeze([[0x0000,0x0df0],[0x0e00,0x1800],[0x1e80,0x2000]].map(x=>Object.freeze(x)));
export const CHIRP_AUX_COMPARE_RANGES=Object.freeze([[0x1f00,0x1f60],[0x1f70,0x1f80],[0x1f90,0x1fc0]].map(x=>Object.freeze(x)));
function bytes(v,n){return v instanceof Uint8Array&&v.length===n;}
function equal(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
function fail(s){throw Error(s);}
function rangesSafe(ranges){
 if(!Array.isArray(ranges)||!ranges.length||ranges.some(r=>!Array.isArray(r)||r.length!==2||!Number.isInteger(r[0])||!Number.isInteger(r[1])||r[0]<0||r[1]>0x2000||r[0]>=r[1]||r[0]%16||r[1]%16))fail('Invalid reference ranges');
 return ranges.map(r=>Object.freeze([...r]));
}
/**
 * Evaluates the public CHIRP Baofeng-common source decision, not HN5RV01 hardware compatibility.
 * auxRadio is concatenated from radio blocks 0x1f00:0x1f60, 0x1f70:0x1f80,
 * and 0x1f90:0x1fc0. The 0x1e80 block is NOT part of the comparison.
 */
export function auditCHIRPBaofengUploadPolicy({image,radioAreas,droppedByte=false,vendor='Baofeng',fallbackRanges}={}){
 if(!bytes(image,0x2000))fail('Expected synthetic 8192-byte CHIRP radio memory map');
 if(!Array.isArray(radioAreas)||radioAreas.length!==3||![96,16,48].every((n,i)=>bytes(radioAreas[i],n)))fail('Three complete synthetic radio comparison areas required');
 if(typeof droppedByte!=='boolean'||typeof vendor!=='string'||!vendor)fail('Invalid CHIRP policy inputs');
 const fallback=rangesSafe(fallbackRanges??[[0x0008,0x0cf8],[0x0d08,0x0df8],[0x0e08,0x1808]]);
 const comparisons=CHIRP_AUX_COMPARE_RANGES.map(([start,end],i)=>Object.freeze({start,end,match:equal(image.subarray(start,end),radioAreas[i])}));
 const auxMatched=comparisons.every(c=>c.match);
 const blocked=droppedByte&&!auxMatched;
 const useFull=!blocked&&(droppedByte||(auxMatched&&vendor!=='BTECH'));
 const selected=blocked?[]:(useFull?CHIRP_FULL_RANGES:fallback);
 const includes1e80=selected.some(([start,end])=>start<=0x1e80&&end>=0x1ec0);
 return Object.freeze({
  format:CHIRP_UPLOAD_POLICY_FORMAT,kind:'OFFLINE_SOURCE_BEHAVIOUR_AUDIT',
  comparisons:Object.freeze(comparisons),auxMatched,droppedByte,blockedByCHIRPGuard:blocked,
  selectedReferenceRanges:Object.freeze(selected),wouldInclude1E80:includes1e80,
  // Critical: this flag is independent of auxMatched, matching the source.
  block1E80WasCompared:false,
  referenceDecisionOnly:true,firmwareCompatibilityVerified:false,
  restorableBackupVerified:false,physicalWriteVerified:false,canWrite:false,
  warning:'Source-level CHIRP decision model only. Never apply these ranges to a physical HN5RV01 radio.'
 });
}
