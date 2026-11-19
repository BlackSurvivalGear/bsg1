// A completed full-memory read can leave HN5RV01 in its programming session.
// A write must start on a new USB connection after the radio is power-cycled.
// A fresh USB connection alone cannot prove a physical power-cycle: the operator
// must explicitly confirm it immediately before writing.
export function eligibleUV16WriteSession({connectionEpoch,fullReadEpoch,backupSaved,connected,writePending}={}){
 return Number.isInteger(connectionEpoch)&&Number.isInteger(fullReadEpoch)&&
   connectionEpoch>fullReadEpoch&&backupSaved===true&&connected===true&&writePending!==true;
}
export function freshUV16WriteSessionMessage({connectionEpoch,fullReadEpoch,backupSaved,connected,writePending}={}){
 if(writePending)return 'A previous write attempt still requires independent verification. No second write is permitted.';
 if(!backupSaved)return 'Save the full radio capture before programming.';
 if(!Number.isInteger(fullReadEpoch))return 'Read Full Radio and save its capture before programming.';
 if(!connected)return 'Disconnect, switch the test radio OFF and ON, then reconnect USB.';
 if(!Number.isInteger(connectionEpoch)||connectionEpoch<=fullReadEpoch)
  return 'Full read completed in this USB session. Disconnect, switch the test radio OFF and ON, then reconnect USB before writing.';
 return 'Ready for operator confirmation of radio power-cycle and one controlled write.';
}
