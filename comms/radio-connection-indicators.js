// Physical USB port state is separate from firmware-verified radio identity.
export function radioConnectionIndicators({state='disconnected',mode=null,identified=false}={}){
 const usb=state==='connected'&&mode==='usb'
  ?{state:'connected',label:'Port connected'}
  :state==='connecting'
   ?{state:'pending',label:'Connecting…'}
   :state==='disconnecting'&&mode==='usb'
    ?{state:'pending',label:'Disconnecting…'}
    :{state:'inactive',label:'Disconnected'};
 const radio=state==='connected'&&mode==='usb'&&identified
  ?{state:'connected',label:'UV-16 Pro V2 identified'}
  :{state:'inactive',label:'Not identified'};
 return {usb,radio};
}
