for(const [id,name,url] of [['africandxnet','AfricanDXNet','https://africadxnet.com/'],['rsn','RSN — Radio Society of Nigeria','https://www.rsn.ng/']]){
 const root=document.getElementById(id);
 if(!root)continue;
 const intro=document.createElement('p');intro.textContent='View the community website here, or open it in a new tab if embedding is restricted.';
 const controls=document.createElement('div');controls.className='academy-community-actions';
 const frame=document.createElement('iframe');frame.title=name+' website';frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.style.cssText='display:none;width:100%;height:560px;border:1px solid #857348;border-radius:8px;background:#fff';
 const toggle=document.createElement('button');toggle.type='button';toggle.textContent='View website here';toggle.addEventListener('click',()=>{const show=frame.style.display==='none';if(show&&!frame.src)frame.src=url;frame.style.display=show?'block':'none';toggle.textContent=show?'Hide embedded website':'View website here';});
 const external=document.createElement('a');external.href=url;external.target='_blank';external.rel='noopener noreferrer';external.textContent='Open in new tab ↗';
 controls.append(toggle,external);root.append(intro,controls,frame);
}
