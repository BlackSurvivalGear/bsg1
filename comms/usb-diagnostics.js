// USB diagnostic text is derived from connection state, never serial payloads.
export function usbDiagnosticSummary({state='disconnected',mode=null,info={},baudRate=null}={}){
 const usb=mode==='usb';
 return Object.freeze({
  state:usb?state:state==='connecting'?'connecting':'disconnected',
  transport:usb?'USB serial':mode==='simulation'?'Simulation (no USB)':'None',
  vendorId:usb?(info.vendorId||'Unavailable'):'Unavailable',
  productId:usb?(info.productId||'Unavailable'):'Unavailable',
  baudRate:usb&&Number.isInteger(baudRate)?String(baudRate):'Unavailable',
  radioIdentity:'Not verified',
  protocol:'No radio commands sent'
 });
}
export function formatDiagnosticExport(summary,entries=[]){
 const lines=['BSG COMMS — USB Diagnostics','Connection: '+summary.state,'Transport: '+summary.transport,
 'USB vendor ID: '+summary.vendorId,'USB product ID: '+summary.productId,
 'Baud rate: '+summary.baudRate,'Radio identity: '+summary.radioIdentity,
 'Protocol: '+summary.protocol,'Events:'];
 return lines.concat(entries.map(String)).join('\n');
}
