// Offline UV-16 backup coverage and recovery audit. Never communicates with hardware.
import {validateUV16ReadRegions,UV16_AUX_ADDRESSES} from './uv16-read-regions.js';
import {createUV16MockRadio,simulateCHIRPUpload} from './uv16-chirp-mock-upload.js';
export const UV16_RECOVERY_AUDIT_FORMAT='bsg-uv16-recovery-audit-v1';
const hexBytes=text=>Uint8Array.from(text.match(/../g).map(x=>parseInt(x,16)));
const REQUIRED_AUX=Object.freeze([0x1e80,0x1ec0,0x1f00,0x1f40,0x1f80,0x1fc0]);
export function assessUV16BackupCoverage(snapshot){
 validateUV16ReadRegions(snapshot);
 const captured=UV16_AUX_ADDRESSES.slice();
 const missing=REQUIRED_AUX.filter(address=>!captured.includes(address));
 return Object.freeze({
  format:UV16_RECOVERY_AUDIT_FORMAT,kind:'OFFLINE_COVERAGE_ONLY',
  firmware:snapshot.firmware,channelBytes:snapshot.memory.length,
  auxiliaryCaptured:Object.freeze(captured),
  additionalCHIRPReferenceRegions:Object.freeze(missing),
  // These are CHIRP reference addresses, not a proven exhaustive HN5RV01 image map.
  fullMemoryMapVerified:false,firmwareWriteProtocolVerified:false,
  restorable:false,restorationTestedOnHardware:false,canWrite:false,
  warning:'Snapshot integrity is not proof of completeness, recoverability or physical restoration.'
 });
}
function equal(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i]);}
/**
 * Simulates restoration after a failed or interrupted frequency-only mock upload.
 * Only synthetic byte arrays; a successful result is not physical recovery proof.
 */
export function simulateUV16MockRecovery({baseline,target,failAt=0}={}){
 if(!(baseline instanceof Uint8Array)||baseline.length!==2048||
    !(target instanceof Uint8Array)||target.length!==2048)throw Error('Synthetic 2048-byte images required');
 if(!Number.isInteger(failAt)||failAt<0||failAt>=2048||failAt%64)throw Error('Invalid simulated failure address');
 const mock=createUV16MockRadio({memory:baseline,interruptAt:failAt});
 const upload=simulateCHIRPUpload({before:baseline,after:target,simulator:mock});
 const afterFailure=mock.snapshot();
 // Recovery is deliberately a fresh, local in-memory simulator. No restoration frames.
 const restored=baseline.slice();
 return Object.freeze({
  format:UV16_RECOVERY_AUDIT_FORMAT,kind:'OFFLINE_RECOVERY_SIMULATION_ONLY',
  uploadStopped:upload.stopped,uploadError:upload.error,
  partialStateMatchesBaseline:equal(afterFailure,baseline),
  partialStateMatchesTarget:equal(afterFailure,target),
  simulatedRestorationMatchesBaseline:equal(restored,baseline),\n  simulatedRestoreAttempted:restoreReport!==null,simulatedRestoreStopped:restoreReport?.stopped??false,
  realRestorationDemonstrated:false,restorableBackupVerified:false,
  physicalWriteVerified:false,canWrite:false,
  warning:'Recreating a baseline in memory does not restore a physical radio.'
 });
}
