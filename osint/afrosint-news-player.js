/* AfrOsint floating news player and channel data; source: BlackSurvivalGear/AfrOsint js/app.js */
let headerTz=null,headerTzLabel='',headerTzIso='';
let globalMaxZIndex=2000;
function bringToFront(element){if(element)element.style.zIndex=String(++globalMaxZIndex);}

function _getEvPos(e){if(e.touches&&e.touches.length>0)return{clientX:e.touches[0].clientX,clientY:e.touches[0].clientY};if(e.changedTouches&&e.changedTouches.length>0)return{clientX:e.changedTouches[0].clientX,clientY:e.changedTouches[0].clientY};return{clientX:e.clientX,clientY:e.clientY}}

const globalFeeds=[['RT','https://rumble.com/embed/v33aw1a/?pub=4jw3x3'],['AL JAZEERA','https://www.youtube.com/embed/gCNeDWCI0vo'],['AFRICA','https://www.youtube.com/embed/W8nThq62Vb4']];


const featuredChannels = [['Frontline Africa','https://www.youtube.com/embed?listType=playlist&list=UUNOc6D_St272mk8d4IsxD8A']];
const africanChannels=[['Frontline Africa','https://www.youtube.com/embed?listType=playlist&list=UUNOc6D_St272mk8d4IsxD8A'],['Channels TV','https://www.youtube.com/embed/W8nThq62Vb4'],['Africanews','https://www.youtube.com/embed/NQjabLGdP5g']];
const americanChannels=[['CBC News','https://www.youtube.com/embed/jxP_h3V-Dv8'],['CNBC','https://www.youtube.com/embed/9NyxcX3rhQs']];
const asianChannels=[['Al Jazeera','https://www.youtube.com/embed/gCNeDWCI0vo'],['Al Jazeera Arabic','https://www.youtube.com/embed/bNyUyrR0PHo'],['WION','https://www.youtube.com/embed/vfszY1JYbMc']];
const chineseChannels=[];
const europeanChannels=[['Euronews','https://www.youtube.com/embed/pykpO5kQJ98']];
const russianChannels=[['RT','https://rumble.com/embed/vtp5hp/'],['RT News','https://rumble.com/embed/vtp5hp/']];


const splitChannels=[
    ['Frontline Africa','https://www.youtube.com/embed?listType=playlist&list=UUNOc6D_St272mk8d4IsxD8A'],
    ['Channels TV','https://www.youtube.com/embed/W8nThq62Vb4'],
    ['ARISE News','https://www.youtube.com/embed?listType=playlist&list=UUyEJX-kSj0kOOCS7Qlq2G7g'],
    ['Hundeyin','https://www.youtube.com/embed?listType=playlist&list=UUXsKcgijudPUE7ETATel9eA'],
    ['Zack Mwekassa English','https://www.youtube.com/embed?listType=playlist&list=UU1mojQ4ksdcSKg8jGc-f22Q'],
    ['Bjorn Uncut','https://www.youtube.com/embed?listType=playlist&list=UUKptuDIHY8aXa1TaEvbg0-w'],
    ['One54 Africa','https://www.youtube.com/embed?listType=playlist&list=UUbB_WVM-e7nuhWd_FB_8KBQ'],
    ['Adeola Fayehun','https://www.youtube.com/embed?listType=playlist&list=UULbiHTTFeFBTvcU_D98PCYw'],
    ['Black Culture Diary','https://www.youtube.com/embed?listType=playlist&list=UU2vy1ztN3iredhD_ouNbh4w'],
    ['Bigshai','https://www.youtube.com/embed?listType=playlist&list=UUekCbszayI4SqqoBy0XS2ug'],
    ['Euronews','https://www.youtube.com/embed/pykpO5kQJ98'],
    ['Al Jazeera Arabic','https://www.youtube.com/embed/bNyUyrR0PHo'],
    ['CBC News','https://www.youtube.com/embed/jxP_h3V-Dv8'],
    ['CNBC','https://www.youtube.com/embed/9NyxcX3rhQs'],
    ['Africanews','https://www.youtube.com/embed/NQjabLGdP5g'],
    ['WION','https://www.youtube.com/embed/vfszY1JYbMc'],
    ['Al Jazeera','https://www.youtube.com/embed/gCNeDWCI0vo'],
    ['RT','https://rumble.com/embed/v33aw1a/?pub=4jw3x3']
].filter((ch,i,arr)=>arr.findIndex(c=>c[1]===ch[1])===i);

function _autoMute(url){if(url.indexOf('youtube.com')>=0)return url+(url.indexOf('?')>=0?'&':'?')+'autoplay=1&mute=1&enablejsapi=1&origin='+encodeURIComponent(window.location.origin);if(url.indexOf('rumble.com')>=0)return url+(url.indexOf('?')>=0?'&':'?')+'autoplay=1&mute=1';return url}

/* AllAfrica RSS headlines: headline-only, source attribution and original links. */
const afrNewsSources=[
 {name:'ALLAFRICA',feed:'https://allafrica.com/tools/headlines/rdf/latest/headlines.rdf',home:'https://allafrica.com/latest/',domain:'allafrica.com'},
 {name:'AFRICANEWS',feed:'https://www.africanews.com/feed/',home:'https://www.africanews.com/',domain:'africanews.com'},
 {name:'RT',feed:'https://rt-english.com/rss/news/',home:'https://www.rt.com/',domain:'rt-english.com'},
 {name:'REUTERS',feed:'https://news.google.com/rss/search?q=site%3Areuters.com%2Fworld%2Fafrica+when%3A7d&hl=en-GB&gl=GB&ceid=GB%3Aen',home:'https://www.reuters.com/world/africa/',domain:'news.google.com'}
];
let afrHeadlineItems=[],afrHeadlineFetchedAt=0,afrHeadlinePending=null;
function afrTickerFill(track,items){
 track.replaceChildren();
 for(const item of items){
  const a=document.createElement('a');a.href=item.link;a.target='_blank';a.rel='noopener noreferrer';a.textContent=item.source+' · '+item.title;a.title=item.source+' — '+item.title;
  a.style.cssText='color:#e9d6a2;text-decoration:none;white-space:nowrap;padding:0 18px;border-right:1px solid #7d6a3b';
  track.appendChild(a);
 }
}
function afrTickerRefresh(){
 const items=afrHeadlineItems.length?afrHeadlineItems:afrNewsSources.map(source=>({source:source.name,title:'Open latest headlines',link:source.home}));
 document.querySelectorAll('.afr-news-ticker-track').forEach(track=>afrTickerFill(track,items.concat(items)));
}
async function afrLoadHeadlines(){
 if(afrHeadlinePending)return afrHeadlinePending;
 if(afrHeadlineFetchedAt&&Date.now()-afrHeadlineFetchedAt<15*60*1000)return;
 afrHeadlinePending=(async()=>{
  try{
   const feeds=await Promise.all(afrNewsSources.map(async source=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),9000);
    try{
     const endpoint='https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(source.feed);
     const response=await fetch(endpoint,{signal:controller.signal});
     if(!response.ok)throw Error('Feed unavailable');
     const data=await response.json();
     if(data.status!=='ok'||!Array.isArray(data.items))return [];
     return data.items.map(x=>{
      const title=String(x.title||'').trim(),link=String(x.link||'');
      let valid=false;
      try{const url=new URL(link);valid=url.protocol==='https:'&&(url.hostname===source.domain||url.hostname.endsWith('.'+source.domain)||source.name==='RT'&&url.hostname==='rt.com')}catch(e){}
      return valid&&title?{source:source.name,title,link,date:Date.parse(x.pubDate||'')||0}:null;
     }).filter(Boolean).slice(0,8);
    }catch(e){return []}finally{clearTimeout(timer)}
   }));
   const seen=new Set();
   const merged=feeds.flat().sort((a,b)=>b.date-a.date).filter(x=>{const key=x.title.toLowerCase();if(seen.has(key))return false;seen.add(key);return true}).slice(0,30);
   if(merged.length)afrHeadlineItems=merged;
   afrHeadlineFetchedAt=Date.now();
  }catch(e){afrHeadlineFetchedAt=Date.now()-10*60*1000}
  finally{afrHeadlinePending=null;afrTickerRefresh()}
 })();
 return afrHeadlinePending;
}
function afrAttachTicker(box){
 const bar=document.createElement('div');bar.className='afr-news-ticker';
 bar.style.cssText='display:flex;align-items:center;flex-shrink:0;height:38px;background:#091518;border-top:1px solid #b7954e;overflow:hidden;font:600 14px system-ui';
 const label=document.createElement('a');label.href='https://allafrica.com/';label.target='_blank';label.rel='noopener noreferrer';label.textContent='HEADLINES';label.title='AllAfrica, Africanews, RT and Reuters via Google News';
 label.style.cssText='color:#10130f;background:#d7b66c;padding:8px 7px;font-weight:800;text-decoration:none;flex-shrink:0;z-index:1';
 const viewport=document.createElement('div');viewport.style.cssText='min-width:0;flex:1;overflow:hidden;white-space:nowrap';
 const track=document.createElement('div');track.className='afr-news-ticker-track';track.style.cssText='display:inline-flex;align-items:center;min-width:max-content;animation:afrTickerScroll 220s linear infinite';
 viewport.addEventListener('mouseenter',()=>track.style.animationPlayState='paused');
 viewport.addEventListener('mouseleave',()=>track.style.animationPlayState='running');
 viewport.addEventListener('focusin',()=>track.style.animationPlayState='paused');
 viewport.addEventListener('focusout',()=>track.style.animationPlayState='running');
 const styleId='afr-news-ticker-style';
 if(!document.getElementById(styleId)){const style=document.createElement('style');style.id=styleId;style.textContent='@keyframes afrTickerScroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}@media(prefers-reduced-motion:reduce){.afr-news-ticker-track{animation:none!important;max-width:100%;overflow:auto}}';document.head.appendChild(style)}
 viewport.appendChild(track);bar.append(label,viewport);box.appendChild(bar);
 afrTickerRefresh();afrLoadHeadlines();
}

var afrNewsBoxCount=0;
function afrAddNewsBox(){var id=afrNewsBoxCount++;var startIdx=splitChannels.findIndex(function(c){return c[0]==='Frontline Africa'});if(startIdx<0)startIdx=0;var container=document.getElementById('persistentNewsBoxes');if(!container)return;var box=document.createElement('div');box.id='afrNewsBox'+id;box.dataset.chIdx=startIdx;box.style.cssText='position:absolute;top:'+(10+id*30)+'px;left:'+(Math.max(12,Math.round(window.innerWidth/2-260)+id*20))+'px;right:auto;width:min(520px,calc(100vw - 24px));height:360px;z-index:'+(1101+id)+';pointer-events:auto;background:#000;border:1px solid #b7954e;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 16px #00ffee22';var ch=splitChannels[startIdx];var chSrc=_autoMute(ch[1]);box.innerHTML='<div style="display:grid;grid-template-columns:minmax(64px,1fr) minmax(0,1fr) minmax(96px,1fr);align-items:center;gap:4px;background:linear-gradient(90deg,#081821,#0c2a35);padding:5px 8px;min-height:38px;border-bottom:1px solid #00ffee33;cursor:move;touch-action:none;user-select:none;flex-shrink:0" onmousedown="afrNewsDrag(event,'+id+')" ontouchstart="afrNewsDrag(event,'+id+')"><div style="display:flex;align-items:center;gap:6px;min-width:0"><button onclick="afrNewsChChange('+id+',-1)" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:Share Tech Mono,monospace">&#9664;</button><button onclick="afrNewsChChange('+id+',1)" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:Share Tech Mono,monospace">&#9654;</button><button onclick="openAfricanManWall()" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:11px;font-weight:700;cursor:pointer;padding:6px 5px;border-radius:4px" title="Open News Wall">WALL</button></div><div style="min-width:0;text-align:center;display:flex;align-items:center;justify-content:center"><span id="afrNewsLabel'+id+'" style="color:#00ffee;font-family:Share Tech Mono,monospace;font-size:15px;font-weight:700;letter-spacing:0.5px;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;text-shadow:0 0 6px #00ffee66">'+ch[0]+'</span></div><div style="display:flex;gap:4px;align-items:center;justify-content:flex-end;min-width:0"><button onclick="afrNewsLike('+id+')" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:13px;font-weight:700;cursor:pointer;padding:4px 8px;border-radius:4px" title="Open current video on YouTube">LIKE</button><button onclick="afrNewsFs('+id+')" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:Share Tech Mono,monospace" title="Full Screen">&#x26F6;</button><button onclick="afrAddNewsBox()" style="background:transparent;border:1px solid #00ffee44;color:#00ffee;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:Share Tech Mono,monospace" title="Add News Box">+</button><button onclick="afrRemoveNewsBox('+id+')" style="background:transparent;border:1px solid #ff444488;color:#ff4444;font-size:16px;cursor:pointer;padding:4px 8px;border-radius:4px;font-family:Share Tech Mono,monospace" title="Close">&times;</button></div></div><iframe id="afrNewsFrame'+id+'" src="'+chSrc+'" style="flex:1;width:100%;border:none" allow="autoplay;encrypted-media" allowfullscreen></iframe>';container.appendChild(box);afrNewsAttachPlayer(id);afrAttachTicker(box);afrInstallResizeHandles(box,id)}
function afrInstallResizeHandles(box,id){
['n','s','e','w','ne','nw','se','sw'].forEach(function(edge){
 var h=document.createElement('div');h.dataset.resize=edge;h.title='Drag to resize';h.setAttribute('aria-label','Resize video '+edge);
 var v=edge.includes('n')?'top:0;':edge.includes('s')?'bottom:0;':'top:8px;bottom:8px;';
 var hor=edge.includes('w')?'left:0;':edge.includes('e')?'right:0;':'left:8px;right:8px;';
 var corner=edge.length===2;
 h.style.cssText='position:absolute;z-index:8;touch-action:none;'+(corner?'width:14px;height:14px;':'')+v+hor+(corner?'':'')+'cursor:'+edge+'-resize;';
 if(!corner){if(edge==='n'||edge==='s')h.style.height='7px';else h.style.width='7px'}
 h.addEventListener('pointerdown',function(e){
  if(afrNewsFsId===id||e.button!==0)return;
  e.stopPropagation();e.preventDefault();bringToFront(box);
  var rect=box.getBoundingClientRect(),parent=box.parentElement.getBoundingClientRect();
  var left=rect.left-parent.left,top=rect.top-parent.top,width=rect.width,height=rect.height;
  box.style.left=left+'px';box.style.top=top+'px';box.style.right='auto';
  h.setPointerCapture(e.pointerId);
  function move(ev){
   var dx=ev.clientX-e.clientX,dy=ev.clientY-e.clientY;
   var l=left,t=top,w=width,ht=height;
   if(edge.includes('e'))w=Math.max(260,Math.min(parent.width-l,width+dx));
   if(edge.includes('s'))ht=Math.max(170,Math.min(parent.height-t,height+dy));
   if(edge.includes('w')){l=Math.max(0,Math.min(left+dx,left+width-260));w=width+left-l}
   if(edge.includes('n')){t=Math.max(0,Math.min(top+dy,top+height-170));ht=height+top-t}
   box.style.left=l+'px';box.style.top=t+'px';box.style.width=w+'px';box.style.height=ht+'px';
  }
  function stop(){h.removeEventListener('pointermove',move);h.removeEventListener('pointerup',stop);h.removeEventListener('pointercancel',stop)}
  h.addEventListener('pointermove',move);h.addEventListener('pointerup',stop);h.addEventListener('pointercancel',stop);
 });
 box.appendChild(h);
});
}
var afrNewsPlayers={};
var afrNewsYoutubeApiRequested=false;
function afrNewsAttachPlayer(id){
 var box=document.getElementById('afrNewsBox'+id),frame=document.getElementById('afrNewsFrame'+id);
 if(!box||!frame||!frame.src.includes('youtube.com'))return;
 if(!window.YT||!YT.Player){
  if(!afrNewsYoutubeApiRequested){
   afrNewsYoutubeApiRequested=true;
   var previous=window.onYouTubeIframeAPIReady;
   window.onYouTubeIframeAPIReady=function(){
    if(typeof previous==='function')previous();
    document.querySelectorAll('[id^="afrNewsFrame"]').forEach(function(el){
     afrNewsAttachPlayer(Number(el.id.replace('afrNewsFrame','')));
    });
   };
   var script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';document.head.appendChild(script);
  }
  return;
 }
 try{afrNewsPlayers[id]=new YT.Player(frame,{events:{onReady:function(event){afrNewsPlayers[id]=event.target;}}});}
 catch(e){afrNewsPlayers[id]=null;}
}
function afrNewsLike(id){
 var box=document.getElementById('afrNewsBox'+id);
 if(!box)return;
 var ch=splitChannels[Number(box.dataset.chIdx)];
 if(!ch)return;
 if(ch[1].indexOf('youtube.com')<0){window.open(ch[1],'_blank','noopener,noreferrer');return;}
 var player=afrNewsPlayers[id],videoId='';
 try{
  if(player&&typeof player.getVideoData==='function'){
   var data=player.getVideoData();
   videoId=data&&data.video_id||'';
  }
  if(!videoId&&player&&typeof player.getVideoUrl==='function'){
   var match=player.getVideoUrl().match(/[?&]v=([A-Za-z0-9_-]{11})/);
   if(match)videoId=match[1];
  }
 }catch(e){}
 if(!videoId){
  var direct=ch[1].match(/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/);
  if(direct)videoId=direct[1];
 }
 if(videoId)window.open('https://www.youtube.com/watch?v='+encodeURIComponent(videoId),'_blank','noopener,noreferrer');
 else alert('Current YouTube video is not available yet. Wait for playback to start, then select LIKE.');
}
function afrNewsChChange(id,dir){var box=document.getElementById('afrNewsBox'+id);if(!box)return;var idx=parseInt(box.dataset.chIdx);idx=(idx+dir+splitChannels.length)%splitChannels.length;box.dataset.chIdx=idx;var ch=splitChannels[idx];document.getElementById('afrNewsLabel'+id).textContent=ch[0];var frame=document.getElementById('afrNewsFrame'+id);var next=frame.cloneNode(false);next.src=_autoMute(ch[1]);frame.replaceWith(next);delete afrNewsPlayers[id];afrNewsAttachPlayer(id)}
function afrRemoveNewsBox(id){var box=document.getElementById('afrNewsBox'+id);if(box)box.remove();if(!document.getElementById('persistentNewsBoxes').children.length)document.getElementById('persistentNewsBoxes').hidden=true}
var afrNewsFsId=-1;function afrNewsFs(id){var box=document.getElementById('afrNewsBox'+id);if(!box)return;if(afrNewsFsId===id){box.style.cssText='position:absolute;top:'+box.dataset.origTop+'px;right:auto;left:'+box.dataset.origLeft+'px;width:360px;height:240px;z-index:1101;pointer-events:auto;background:#000;border:1px solid #b7954e;border-radius:6px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 0 16px #00ffee22';afrNewsFsId=-1}else{var rect=box.getBoundingClientRect();var parent=box.parentElement.getBoundingClientRect();box.dataset.origTop=rect.top-parent.top;box.dataset.origLeft=rect.left-parent.left;box.style.cssText='position:absolute;top:0;left:0;width:100%;height:100%;z-index:1110;pointer-events:auto;background:#000;border:none;border-radius:0;overflow:hidden;display:flex;flex-direction:column';afrNewsFsId=id}}
var afrNewsDragEl=null,afrNewsDragPointer=null,afrNewsDragOX=0,afrNewsDragOY=0,afrNewsStartX=0,afrNewsStartY=0;
function afrNewsDrag(e,id){
if(e.target.closest('button')||afrNewsFsId===id)return;
if(e.type==='mousedown'&&e.button!==0)return;
if(e.type==='touchstart'&&e.touches.length!==1)return;
if(afrNewsDragEl)return;
var pos=_getEvPos(e),box=document.getElementById('afrNewsBox'+id);
if(!box)return;
afrNewsDragEl=box;
afrNewsDragPointer=e.type.startsWith('touch')?'touch':'mouse';
afrNewsStartX=pos.clientX;afrNewsStartY=pos.clientY;
bringToFront(box);
var rect=box.getBoundingClientRect(),parent=box.parentElement.getBoundingClientRect();
afrNewsDragOX=pos.clientX-rect.left;afrNewsDragOY=pos.clientY-rect.top;
box.style.transform='none';box.style.right='auto';
box.style.left=(rect.left-parent.left)+'px';box.style.top=(rect.top-parent.top)+'px';
document.addEventListener('mousemove',afrNewsDoDrag);
document.addEventListener('mouseup',afrNewsStopDrag);
document.addEventListener('touchmove',afrNewsDoDrag,{passive:false});
document.addEventListener('touchend',afrNewsStopDrag);
document.addEventListener('touchcancel',afrNewsStopDrag);
if(e.cancelable)e.preventDefault();
}
function afrNewsDoDrag(e){
if(!afrNewsDragEl||((e.type.startsWith('touch')?'touch':'mouse')!==afrNewsDragPointer))return;
var pos=_getEvPos(e);
if(e.cancelable)e.preventDefault();
var parent=afrNewsDragEl.parentElement.getBoundingClientRect();
var x=pos.clientX-afrNewsDragOX-parent.left;
var y=pos.clientY-afrNewsDragOY-parent.top;
afrNewsDragEl.style.left=Math.max(0,Math.min(x,parent.width-afrNewsDragEl.offsetWidth))+'px';
afrNewsDragEl.style.top=Math.max(0,Math.min(y,parent.height-afrNewsDragEl.offsetHeight))+'px';
}
function afrNewsStopDrag(){
document.removeEventListener('mousemove',afrNewsDoDrag);
document.removeEventListener('mouseup',afrNewsStopDrag);
document.removeEventListener('touchmove',afrNewsDoDrag);
document.removeEventListener('touchend',afrNewsStopDrag);
document.removeEventListener('touchcancel',afrNewsStopDrag);
afrNewsDragEl=null;afrNewsDragPointer=null;
}

function openAfricanManNews(){const container=document.getElementById('persistentNewsBoxes');container.hidden=false;if(!container.children.length)afrAddNewsBox();else afrLoadHeadlines()}
function closeAfricanManNews(){const container=document.getElementById('persistentNewsBoxes');container.replaceChildren();container.hidden=true;afrNewsBoxCount=0;afrNewsFsId=-1}
