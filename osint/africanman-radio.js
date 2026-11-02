/* AfricanMan independent persistent radio. Single audio element in dashboard parent. */
(function(){
'use strict';
const panel=document.getElementById('africanman-radio');
const body=document.getElementById('am-radio-body');
const audio=new Audio();audio.preload='none';audio.volume=.75;
const name=document.getElementById('am-radio-station'),status=document.getElementById('am-radio-status');
const play=document.getElementById('am-radio-play'),mute=document.getElementById('am-radio-mute');
let currentId='',lastName='';
const search=document.getElementById('am-radio-search'),results=document.getElementById('am-radio-results');
let searchController=null;
const favCurrent=document.getElementById('am-radio-fav-current'),favView=document.getElementById('am-radio-show-favs');
const favKey='africanman-radio-favourites-v1';
let favourites=[];
try{const stored=JSON.parse(localStorage.getItem(favKey)||'[]');if(Array.isArray(stored))favourites=stored.filter(x=>x&&typeof x.name==='string'&&typeof (x.url_resolved||x.url)==='string').slice(0,100)}catch(e){}
let currentStation=null,showFavourites=false,lastSearch=[];
function stationKey(st){return String(st.stationuuid||st.url_resolved||st.url||'')}
function isFavourite(st){return !!st&&favourites.some(x=>stationKey(x)===stationKey(st))}
function updateFavouriteButton(){favCurrent.textContent=isFavourite(currentStation)?'★':'☆';favCurrent.disabled=!currentStation;favCurrent.setAttribute('aria-label',isFavourite(currentStation)?'Remove current station from favourites':'Save current station to favourites')}
function saveFavourites(){try{localStorage.setItem(favKey,JSON.stringify(favourites))}catch(e){status.textContent='Unable to save favourites on this device'}updateFavouriteButton();if(showFavourites)renderResults(favourites)}
function toggleFavourite(st){if(!st)return;const key=stationKey(st);if(isFavourite(st))favourites=favourites.filter(x=>stationKey(x)!==key);else favourites.unshift({name:st.name,country:st.country||'',stationuuid:st.stationuuid||'',url_resolved:st.url_resolved||st.url});favourites=favourites.slice(0,100);saveFavourites()}
function renderResults(stations){results.replaceChildren();const valid=stations.filter(x=>/^https:\/\//i.test(x.url_resolved||x.url));if(!valid.length){results.textContent=showFavourites?'No favourites saved. Search for a station, press its ☆ button, then return to Favourites.':lastSearch.length?'No playable stations found. Try another search.':'Search for a station above, or select a country station to start listening.';return}for(const station of valid){const row=document.createElement('div');row.style.cssText='display:flex;gap:4px';const listen=document.createElement('button');listen.type='button';listen.style.flex='1';listen.textContent=station.name+(station.country?' · '+station.country:'');listen.addEventListener('click',()=>start(station));const star=document.createElement('button');star.type='button';star.textContent=isFavourite(station)?'★':'☆';star.setAttribute('aria-label',isFavourite(station)?'Remove favourite':'Add favourite');star.addEventListener('click',()=>{toggleFavourite(station);if(!showFavourites)renderResults(lastSearch)});row.append(listen,star);results.append(row)}}
favCurrent.addEventListener('click',()=>{toggleFavourite(currentStation);if(!showFavourites&&lastSearch.length)renderResults(lastSearch)});
favView.addEventListener('click',()=>{showFavourites=!showFavourites;favView.setAttribute('aria-pressed',String(showFavourites));favView.textContent=showFavourites?'★ Favourites':'☆ Favourites';renderResults(showFavourites?favourites:lastSearch)});
updateFavouriteButton();
renderResults([]);

async function findStations(){
 const term=search.value.trim();if(term.length<2){results.textContent='Enter at least two characters to search for stations';return;}
 if(searchController)searchController.abort();searchController=new AbortController();
 results.textContent='Searching stations…';
 try{
  const url='https://de1.api.radio-browser.info/json/stations/search?name='+encodeURIComponent(term)+'&limit=30&hidebroken=true&order=clickcount&reverse=true';
  const response=await fetch(url,{signal:searchController.signal});if(!response.ok)throw Error('Station directory unavailable');
  const stations=await response.json();if(!Array.isArray(stations))throw Error('Invalid station results');lastSearch=stations;showFavourites=false;favView.setAttribute('aria-pressed','false');favView.textContent='☆ Favourites';renderResults(stations)
 }catch(error){if(error.name!=='AbortError')results.textContent='Station search unavailable. Try again.'}
}
document.getElementById('am-radio-find').addEventListener('click',findStations);
search.addEventListener('keydown',event=>{if(event.key==='Enter')findStations()});
const toggle=document.getElementById('radio-toggle');
function showRadio(open){panel.hidden=!open;toggle.setAttribute('aria-expanded',String(open));}
toggle.addEventListener('click',()=>showRadio(panel.hidden));
function sync(){play.textContent=audio.paused?'▶':'❚❚';mute.textContent=audio.muted?'🔇':'🔊';panel.classList.toggle('is-playing',!audio.paused)}
function start(station){
 const url=station.url_resolved||station.url;
 if(typeof url!=='string'||!/^https:\/\//i.test(url)){showRadio(true);status.textContent='Station stream URL unavailable. Choose another station.';return;}
 if(typeof station.name!=='string'||station.name.length>180)return;
 showRadio(true);
 if(currentId===String(station.stationuuid||url)&&audio.src){currentStation={...station,url_resolved:url};updateFavouriteButton();if(audio.paused)audio.play().catch(()=>status.textContent='Press Play to start the stream');else audio.pause();sync();return}
 currentId=String(station.stationuuid||url);lastName=station.name;currentStation={...station,url_resolved:url};updateFavouriteButton();
 name.textContent=lastName;status.textContent='Connecting…';audio.src=url;
 audio.play().then(()=>status.textContent='Live radio').catch(()=>status.textContent='Press Play to start the stream');
 sync();
}
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||!event.data||event.data.type!=='africanman:play-radio')return;
 const frame=document.getElementById('country-frame');
 if(!frame||event.source!==frame.contentWindow)return;
 start(event.data.station||{});
});
play.addEventListener('click',()=>{if(audio.paused)audio.play().catch(()=>status.textContent='Unable to play this stream');else audio.pause();sync()});
mute.addEventListener('click',()=>{audio.muted=!audio.muted;sync()});
document.getElementById('am-radio-volume').addEventListener('input',e=>audio.volume=Number(e.target.value)/100);
document.getElementById('am-radio-min').addEventListener('click',()=>{body.classList.toggle('collapsed');document.getElementById('am-radio-min').textContent=body.classList.contains('collapsed')?'+':'−'});
document.getElementById('am-radio-close').addEventListener('click',()=>{audio.pause();audio.removeAttribute('src');audio.load();currentId='';currentStation=null;updateFavouriteButton();showRadio(false)});
audio.addEventListener('play',sync);audio.addEventListener('pause',sync);
audio.addEventListener('error',()=>status.textContent='Stream unavailable. Choose another station.');
let dragging=false,ox=0,oy=0;
document.getElementById('am-radio-bar').addEventListener('pointerdown',e=>{
 if(e.target.closest('button'))return;
 dragging=true;const rect=panel.getBoundingClientRect();ox=e.clientX-rect.left;oy=e.clientY-rect.top;
 panel.style.left=rect.left+'px';panel.style.top=rect.top+'px';panel.style.right='auto';panel.style.bottom='auto';
 e.currentTarget.setPointerCapture(e.pointerId);
});
document.getElementById('am-radio-bar').addEventListener('pointermove',e=>{
 if(!dragging)return;
 panel.style.left=Math.max(0,Math.min(innerWidth-panel.offsetWidth,e.clientX-ox))+'px';
 panel.style.top=Math.max(0,Math.min(innerHeight-panel.offsetHeight,e.clientY-oy))+'px';
});
document.getElementById('am-radio-bar').addEventListener('pointerup',()=>dragging=false);
document.getElementById('am-radio-bar').addEventListener('pointercancel',()=>dragging=false);
})();