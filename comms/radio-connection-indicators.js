// UI-only status derivation. A USB serial port is not proof of a radio identity.
export function radioConnectionIndicators({state='disconnected',mode=null}={}){
 const usb=state==='connected'&&mode==='usb'
  ?{state:'connected',label:'Port connected'}
  :state==='connecting'
   ?{state:'pending',label:'Connecting…'}
   :state==='disconnecting'&&mode==='usb'
    ?{state:'pending',label:'Disconnecting…'}
    :{state:'inactive',label:'Disconnected'};
 const radio=state==='connected'&&mode==='simulation'
  ?{state:'simulation',label:'SIMULATED'}
  :state==='connecting'||state==='disconnecting'
   ?{state:'pending',label:'Not identified'}
   :{state:'inactive',label:'Not identified'};
 return {usb,radio};
}
