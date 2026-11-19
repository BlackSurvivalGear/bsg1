// Remove only the white background connected to the outer edges of the source photo.
// The full UV-16 is retained, including white labels inside the radio.
// This is a one-time canvas conversion; no per-frame rendering or external service.
export function prepareUV16Cutout(img){
  if(!img||img.dataset.cutoutReady==='true')return;
  const process=()=>{
    // Ignore an old UV-16 load listener if the user has switched to another model.
    if(img.dataset.model&&img.dataset.model!=='uv-16-pro-v2')return;
    if(img.dataset.cutoutReady==='true'||!img.naturalWidth||!img.naturalHeight)return;
    img.dataset.cutoutReady='true';
    try{
      const w=img.naturalWidth,h=img.naturalHeight;
      const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
      const context=canvas.getContext('2d',{willReadFrequently:true});
      if(!context)return;
      context.drawImage(img,0,0,w,h);
      const pixels=context.getImageData(0,0,w,h);
      const d=pixels.data,n=w*h,seen=new Uint8Array(n),queue=new Int32Array(n);
      let tail=0,head=0;
      const nearWhite=i=>d[4*i]>232&&d[4*i+1]>232&&d[4*i+2]>232;
      const enqueue=i=>{if(seen[i]||!nearWhite(i))return;seen[i]=1;queue[tail++]=i;};
      for(let x=0;x<w;x++){enqueue(x);enqueue((h-1)*w+x);}
      for(let y=0;y<h;y++){enqueue(y*w);enqueue(y*w+w-1);}
      while(head<tail){
        const i=queue[head++],x=i%w,y=Math.floor(i/w);
        d[i*4+3]=0;
        if(x>0)enqueue(i-1);
        if(x<w-1)enqueue(i+1);
        if(y>0)enqueue(i-w);
        if(y<h-1)enqueue(i+w);
      }
      // Soften only pale anti-aliased pixels touching removed white background.
      const softened=new Uint8Array(n);
      for(let j=0;j<tail;j++){
        const i=queue[j],x=i%w,y=Math.floor(i/w);
        for(const p of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1]){
          if(p<0||seen[p]||softened[p])continue;
          softened[p]=1;
          const k=4*p,bright=Math.min(d[k],d[k+1],d[k+2]);
          if(bright>175)d[k+3]=Math.min(d[k+3],Math.round(255*(235-bright)/60));
        }
      }
      context.putImageData(pixels,0,0);
      // Bound the image to nontransparent content, preserving the antenna and bottom keypad.
      let left=w,top=h,right=0,bottom=0;
      for(let y=0;y<h;y++)for(let x=0;x<w;x++){
        if(d[(y*w+x)*4+3]<32)continue;
        if(x<left)left=x;if(x>right)right=x;
        if(y<top)top=y;if(y>bottom)bottom=y;
      }
      if(right<left||bottom<top)return;
      const pad=8,x0=Math.max(0,left-pad),y0=Math.max(0,top-pad),
        cw=Math.min(w,right+pad+1)-x0,ch=Math.min(h,bottom+pad+1)-y0;
      const trimmed=document.createElement('canvas');trimmed.width=cw;trimmed.height=ch;
      trimmed.getContext('2d').drawImage(canvas,x0,y0,cw,ch,0,0,cw,ch);
      img.src=trimmed.toDataURL('image/png');
    }catch(error){
      img.dataset.cutoutReady='failed'; // keep original image if decoding is unsupported
    }
  };
  if(img.complete)process();else img.addEventListener('load',process,{once:true});
}
