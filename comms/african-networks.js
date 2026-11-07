const root=document.getElementById('african-networks');
if(root){
 const heading=document.createElement('h2');heading.textContent='African Networks';root.append(heading);
 const intro=document.createElement('p');intro.textContent='Explore African amateur radio communities. Try viewing a website here, or open it in a new tab if embedding is restricted.';root.append(intro);
 for(const [name,url] of [['AfricanDXNet','https://africadxnet.com/'],['RSN — Radio Society of Nigeria','https://www.rsn.ng/']]){
  const card=document.createElement('section');card.className='academy-community';
  const title=document.createElement('h3');title.textContent=name;
  const controls=document.createElement('div');controls.className='academy-community-actions';
  const frame=document.createElement('iframe');frame.title=name+' website';frame.loading='lazy';frame.referrerPolicy='no-referrer';frame.style.cssText='display:none;width:100%;height:560px;border:1px solid #857348;border-radius:8px;background:#fff';
  const toggle=document.createElement('button');toggle.type='button';toggle.textContent='View within African Networks';toggle.addEventListener('click',()=>{const show=frame.style.display==='none';if(show&&!frame.src)frame.src=url;frame.style.display=show?'block':'none';toggle.textContent=show?'Hide embedded website':'View within African Networks';});
  const external=document.createElement('a');external.href=url;external.target='_blank';external.rel='noopener noreferrer';external.textContent='Open in new tab ↗';
  controls.append(toggle,external);card.append(title,controls,frame);root.append(card);
 }
}
