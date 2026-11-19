// Report physical protocol status separately from basic USB transport.
export function radioDiagnosticSummary({state='disconnected',mode=null,model='unknown',identity=null,protocolMock=null,protocolStatus='Not verified'}={}){
 const simulated=state==='connected'&&mode==='simulation';
 const physical=state==='connected'&&mode==='usb'&&identity==='HN5RV01';
 return Object.freeze({
  connection:simulated?'SIMULATED':physical?'UV-16 read-only identity confirmed':state==='connected'&&mode==='usb'?'USB port open; radio not verified':'Not connected',
  model:simulated?model+' (selected, unverified)':physical?model:'Not identified',
  identity:simulated&&identity?identity+' (synthetic)':physical?identity+' (physical read-only)':'Not verified',
  protocol:simulated&&protocolMock?'Synthetic '+protocolMock+'-byte mock passed':state==='connected'&&mode==='usb'?protocolStatus:'Not verified',
  hardware:physical?'Firmware checked via bounded physical read-only command; memory read not implied':state==='connected'&&mode==='usb'?'USB port open; successful physical identity not established':'No physical radio operation confirmed'
 });
}
export function formatRadioDiagnosticExport(summary,events=[]){
 return ['BSG COMMS — Radio Diagnostics','Connection: '+summary.connection,
 'Model: '+summary.model,'Identity: '+summary.identity,'Protocol: '+summary.protocol,
 'Hardware: '+summary.hardware,'Events:',...events.map(String)].join('\n');
}
