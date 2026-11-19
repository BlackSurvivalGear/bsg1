// Import CHIRP's exported CSV, never its model-specific binary .img image.
// All imported memories are receive-only until deliberately reviewed.
import {normaliseChannel} from './channels.js';

function csvRows(text) {
  const rows=[];let row=[],cell='',quoted=false;
  text=String(text).replace(/^\uFEFF/,'');
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(ch==='"'){
      if(quoted&&text[i+1]==='"'){cell+='"';i++;}
      else if(!quoted&&cell==='')quoted=true;
      else if(quoted)quoted=false;
      else throw Error('Malformed CSV quotes');
    }else if(ch===','&&!quoted){row.push(cell);cell='';}
    else if((ch==='\n'||ch==='\r')&&!quoted){
      if(ch==='\r'&&text[i+1]==='\n')i++;
      row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
      row=[];cell='';
    }else cell+=ch;
  }
  if(quoted)throw Error('Unclosed CSV quote');
  row.push(cell);if(row.some(value=>value.trim()))rows.push(row);
  return rows;
}
const frequency=value=>{
  const n=Number(String(value??'').trim());
  if(!Number.isFinite(n)||n<=0||n>999.999999)throw Error('Invalid CHIRP frequency');
  return n;
};
export function parseChirpCSV(text) {
  const rows=csvRows(text);
  if(!rows.length)throw Error('Empty CHIRP CSV');
  const header=rows.shift().map(x=>x.trim().toLowerCase());
  for(const column of ['location','name','frequency','duplex','offset','mode'])
    if(!header.includes(column))throw Error('Missing CHIRP column: '+column);
  if(rows.length>1000)throw Error('Maximum 1000 channels');
  const output=[];
  for(const [index,row] of rows.entries()){
    if(row.length!==header.length)throw Error('CHIRP row '+(index+2)+' has an unexpected number of columns');
    const data=Object.fromEntries(header.map((name,i)=>[name,row[i].trim()]));
    try{
      const rx=frequency(data.frequency);
      const duplex=data.duplex.toLowerCase();
      const offset=Number(data.offset||'0');
      if(!Number.isFinite(offset)||offset<0||offset>999.999999)throw Error('Invalid offset');
      if(!['','+','-','split','off'].includes(duplex))throw Error('Unsupported duplex '+data.duplex);
      const tx=duplex==='+'?rx+offset:duplex==='-'?rx-offset:duplex==='split'?frequency(data.offset):rx;
      frequency(tx);
      const mode=data.mode.toUpperCase();
      if(!['FM','NFM'].includes(mode))throw Error('Unsupported mode '+data.mode);
      const toneMode=(data.tone||'').toUpperCase();
      if(!['','TONE','TSQL','DTCS'].includes(toneMode))throw Error('Unsupported tone mode '+toneMode);
      const tone=toneMode==='DTCS'?'DCS':toneMode?'CTCSS':'None';
      const toneValue=toneMode==='DTCS'?(data.dtcsCode||'').padStart(3,'0')+(data.dtcsPolarity?.startsWith('R')?'I':'N')
        :toneMode==='TSQL'?data.ctonefreq||data.rtonefreq||'':toneMode==='TONE'?data.rtonefreq||'':'';
      const power=/^low$/i.test(data.power)?'Low':/^high$/i.test(data.power)?'High':'Default';
      const name=data.name||'CH '+data.location;
      output.push(normaliseChannel({
        name,rx:String(rx),tx:String(tx),mode,notes:data.comment||'',
        direction:duplex==='+'?'Plus':duplex==='-'?'Minus':'Simplex',
        offset:duplex==='+'||duplex==='-'?String(offset):'0',
        tone,toneValue,power,scan:data.skip.toUpperCase()!=='S',
        receiveOnly:true
      }));
    }catch(error){throw Error('CHIRP row '+(index+2)+': '+error.message);}
  }
  return output;
}
