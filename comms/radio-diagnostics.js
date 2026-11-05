// Radio-level diagnostics are simulation-only until a verified hardware protocol exists.
export function radioDiagnosticSummary({state='disconnected',mode=null,model='unknown',identity=null,protocolMock=null}={}){
 const simulated=state==='connected'&&mode==='simulation';
 return Object.freeze({
  connection:simulated?'SIMULATED':state==='connected'&&mode==='usb'?'USB port open; radio not verified':'Not connected',
  model:simulated?model+' (selected, unverified)':'Not identified',
  identity:simulated&&identity?identity+' (synthetic)':'Not verified',
  protocol:simulated&&protocolMock?'Synthetic '+protocolMock+'-byte mock passed':'Not verified',
  hardware:'No physical radio identification or memory operations performed'
 });
}
export function formatRadioDiagnosticExport(summary,events=[]){
 return ['BSG COMMS — Radio Diagnostics','Connection: '+summary.connection,
 'Model: '+summary.model,'Identity: '+summary.identity,'Protocol: '+summary.protocol,
 'Hardware: '+summary.hardware,'Events:',...events.map(String)].join('\n');
}
