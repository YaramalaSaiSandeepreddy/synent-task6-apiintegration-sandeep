/* ======================================
   ATMOSIQ — Weather Intelligence Core
   ====================================== */

// CONFIG — replace with your OpenWeatherMap API key
const API_KEY = '9ebe24b964dc2a5727df4a2545096bb2';
const BASE    = 'https://api.openweathermap.org/data/2.5';
const FORECAST_URL = `${BASE}/forecast`;
const CURRENT_URL  = `${BASE}/weather`;
const AQI_URL      = `${BASE}/air_pollution`;

// State
let state = {
  unit: localStorage.getItem('unit') || 'C',
  theme: localStorage.getItem('theme') || 'dark',
  city: localStorage.getItem('lastCity') || 'London',
  history: JSON.parse(localStorage.getItem('searchHistory') || '[]'),
  data: null,
  forecastData: null,
  charts: {},
};

// ---- DEMO / MOCK DATA (used when no API key is set) ----
function getMockCurrent(city) {
  const conditions = ['Clear','Clouds','Rain','Mist','Thunderstorm','Snow'];
  const cond = conditions[Math.floor(Math.random()*3)]; // lean toward nice weather
  const t = Math.round(18 + Math.random()*14);
  const now = Math.floor(Date.now()/1000);
  return {
    name: city,
    sys: { country: 'XX', sunrise: now - 3600*3, sunset: now + 3600*6 },
    main: { temp: t, feels_like: t-2, humidity: 55+Math.round(Math.random()*30),
            pressure: 1010+Math.round(Math.random()*15), temp_min: t-4, temp_max: t+3,
            dew_point: t-8 },
    wind: { speed: 3+Math.random()*10 },
    visibility: 8000+Math.round(Math.random()*2000),
    clouds: { all: Math.round(Math.random()*80) },
    weather: [{ main: cond, description: cond.toLowerCase()+' sky', icon:'01d' }],
    uvi: Math.round(Math.random()*8),
    coord: { lat: 51.5, lon: -0.1 },
  };
}
function getMockForecast(city) {
  const days = []; const now = Date.now();
  for(let i=0;i<40;i++){
    const t = 15+Math.random()*15;
    days.push({
      dt: Math.floor((now + i*3*3600*1000)/1000),
      main:{ temp:Math.round(t), temp_min:Math.round(t-3), temp_max:Math.round(t+3), humidity:50+Math.round(Math.random()*40) },
      wind:{ speed: 2+Math.random()*12 },
      weather:[{ main:'Clear', description:'clear sky', icon:'01d' }],
      clouds:{all:Math.round(Math.random()*70)},
    });
  }
  return { list: days, city:{name:city,country:'XX'} };
}
function getMockAQI() {
  return { list:[{ main:{aqi:1}, components:{pm2_5:5,pm10:12,no2:8,o3:20} }] };
}

const useMock = !API_KEY;

// ---- PARTICLES BG ----
(function initBG(){
  const canvas = document.getElementById('bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, particles=[];
  function resize(){ W=canvas.width=innerWidth; H=canvas.height=innerHeight; }
  window.addEventListener('resize',resize); resize();
  for(let i=0;i<70;i++){
    particles.push({
      x:Math.random()*9999, y:Math.random()*9999,
      r:0.5+Math.random()*1.5, vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
      a:Math.random(),
    });
  }
  function draw(){
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      p.x=(p.x+p.vx+W)%W; p.y=(p.y+p.vy+H)%H;
      p.a+=0.005; if(p.a>1)p.a=0;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(100,180,255,${0.15+Math.abs(Math.sin(p.a))*0.3})`;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- CLOCK ----
function updateClock(){
  const now = new Date();
  const h = now.getHours();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const dateStr = now.toLocaleDateString(undefined,opts);
  const timeStr = now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  document.getElementById('hero-datetime').textContent = `${dateStr} · ${timeStr}`;
  // Greeting
  let greet = h<12 ? 'Good Morning' : h<17 ? 'Good Afternoon' : h<21 ? 'Good Evening' : 'Good Night';
  document.getElementById('hero-greeting').textContent = greet;
}
setInterval(updateClock,1000); updateClock();

// ---- WEATHER ICON MAP ----
function getEmoji(main,icon){
  const n = icon && icon.endsWith('n');
  const m = { Clear: n?'🌙':'☀️', Clouds:'☁️', Rain:'🌧', Drizzle:'🌦', Thunderstorm:'⛈',
               Snow:'🌨', Mist:'🌫', Fog:'🌫', Haze:'🌫', Dust:'🌪', Sand:'🌪', Smoke:'🌫',
               Tornado:'🌪', Squall:'💨' };
  return m[main]||'🌤';
}

// ---- INSIGHT GENERATOR ----
function getInsight(data){
  const t = toDisplayTemp(data.main.temp);
  const cond = data.weather[0].main;
  const h = new Date().getHours();
  const facts = [
    cond==='Rain' ? '☂️ Carry an umbrella today.' : null,
    cond==='Snow' ? '🧥 Bundle up — it\'s snowing outside!' : null,
    cond==='Thunderstorm' ? '⚡ Stay indoors — thunderstorm alert.' : null,
    cond==='Clear' && h>9 && h<17 ? '🌞 Perfect weather for outdoor activities.' : null,
    data.main.humidity>80 ? '💦 High humidity — it may feel muggy.' : null,
    data.wind.speed>10 ? '💨 Strong winds — secure loose objects.' : null,
    state.unit==='C'&&data.main.temp>30 ? '🔥 Stay hydrated — it\'s very hot.' : null,
    state.unit==='C'&&data.main.temp<5 ? '🧊 Near-freezing temperatures. Dress warmly.' : null,
  ].filter(Boolean);
  return facts.length ? facts[Math.floor(Math.random()*facts.length)] : '🌍 Atmospheric conditions look stable.';
}

// ---- TEMP CONVERSION ----
function toDisplayTemp(c){
  if(state.unit==='F') return Math.round(c*9/5+32)+'°F';
  return Math.round(c)+'°C';
}

// ---- WEATHER FACTS ----
const FACTS = [
  { icon:'⚡', text:'A single bolt of lightning is 5× hotter than the surface of the sun — reaching ~30,000 K.' },
  { icon:'❄️', text:'No two snowflakes are exactly alike. Each crystal forms a unique path through the atmosphere.' },
  { icon:'🌪', text:'A tornado can move at speeds up to 480 km/h, making it the most violent atmospheric storm.' },
  { icon:'☁️', text:'An average cumulus cloud weighs about 500,000 kg — roughly 100 large elephants.' },
  { icon:'🌧', text:'The wettest place on Earth is Mawsynram, India, with ~11,871 mm of rain annually.' },
  { icon:'🌡', text:'The highest recorded air temperature was 56.7°C at Furnace Creek, California in 1913.' },
  { icon:'💨', text:'Wind has no smell — what you smell during a storm is ozone, petrichor, and plant chemicals.' },
  { icon:'🌈', text:'Rainbows are actually full circles; we only see a semicircle because the ground interrupts the view.' },
];
function showFact(){
  const f = FACTS[Math.floor(Math.random()*FACTS.length)];
  document.getElementById('fact-icon').textContent = f.icon;
  document.getElementById('fact-text').textContent  = f.text;
}
showFact();

// ---- SEARCH ----
function doSearch(){
  const val = document.getElementById('search-input').value.trim();
  if(!val) return showError('Please enter a city name.');
  loadCity(val);
  document.getElementById('search-input').blur();
}
function loadCity(city){
  addToHistory(city);
  state.city = city;
  localStorage.setItem('lastCity', city);
  fetchWeather(city);
}
function detectLocation(){
  if(!navigator.geolocation) return showError('Geolocation not supported.');
  navigator.geolocation.getCurrentPosition(
    pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
    () => showError('Location access denied.')
  );
}
function refreshWeather(){ if(state.city) fetchWeather(state.city); }

// ---- HISTORY ----
function addToHistory(city){
  state.history = [city, ...state.history.filter(c=>c.toLowerCase()!==city.toLowerCase())].slice(0,8);
  localStorage.setItem('searchHistory', JSON.stringify(state.history));
}
function showHistory(){
  const h = document.getElementById('search-history');
  const list = [...state.history,
    ...['London','New York','Tokyo','Paris','Sydney','Dubai','Mumbai','Berlin']
      .filter(c=>!state.history.includes(c))
  ].slice(0,8);
  if(!list.length){ h.classList.remove('open'); return; }
  h.innerHTML = `<div class="history-label">Recent & Popular</div>` +
    list.map(c=>`<div class="history-item" onmousedown="loadCity('${c}')">🏙 ${c}</div>`).join('');
  h.classList.add('open');
}
function hideHistory(){
  setTimeout(()=>document.getElementById('search-history').classList.remove('open'),200);
}

// ---- FETCH HELPER (no-cors via fetch mode) ----
function owmFetch(url) {
  return new Promise(async (resolve, reject) => {
    // 1st: try direct with no-cors mode won't work for reading, so try normal first
    try {
      const r = await fetch(url);
      if (r.ok) { resolve(r); return; }
      if (r.status === 401) { reject(new Error('Invalid API key (401) — check your OpenWeatherMap key')); return; }
      if (r.status === 404) { reject(new Error('City not found')); return; }
      if (r.status === 429) { reject(new Error('Rate limit hit — wait a minute and retry')); return; }
    } catch(_) {}

    // 2nd: try via allorigins
    try {
      const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(url);
      const r = await fetch(proxy);
      if (r.ok) { resolve(r); return; }
    } catch(_) {}

    // 3rd: try via corsproxy.io
    try {
      const proxy = 'https://corsproxy.io/?' + encodeURIComponent(url);
      const r = await fetch(proxy);
      if (r.ok) { resolve(r); return; }
    } catch(_) {}

    // 4th: try via thingproxy
    try {
      const proxy = 'https://thingproxy.freeboard.io/fetch/' + url;
      const r = await fetch(proxy);
      if (r.ok) { resolve(r); return; }
    } catch(_) {}

    reject(new Error('Network error — all proxies failed. Check your internet or serve this file from a web server.'));
  });
}

// ---- FETCH ----
async function fetchWeather(city){
  showLoading();
  try {
    let cur, fore, aqiData;
    if(useMock){
      cur = getMockCurrent(city);
      fore = getMockForecast(city);
      aqiData = getMockAQI();
    } else {
      const [curRes, foreRes] = await Promise.all([
        owmFetch(`${CURRENT_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
        owmFetch(`${FORECAST_URL}?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`),
      ]);
      cur  = await curRes.json();
      fore = await foreRes.json();
      try {
        const aqiRes = await owmFetch(`${AQI_URL}?lat=${cur.coord.lat}&lon=${cur.coord.lon}&appid=${API_KEY}`);
        aqiData = await aqiRes.json();
      } catch(_) { aqiData = getMockAQI(); }
    }
    state.data = cur; state.forecastData = fore;
    renderAll(cur, fore, aqiData);
  } catch(e){
    showError(e.message || 'Failed to fetch weather data.');
  } finally {
    hideLoading();
  }
}
async function fetchByCoords(lat,lon){
  showLoading();
  try {
    let cur, fore, aqiData;
    if(useMock){
      cur = getMockCurrent('Your Location');
      fore = getMockForecast('Your Location');
      aqiData = getMockAQI();
    } else {
      const [curRes, foreRes] = await Promise.all([
        owmFetch(`${CURRENT_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
        owmFetch(`${FORECAST_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      ]);
      cur  = await curRes.json();
      fore = await foreRes.json();
      try {
        const aqiRes = await owmFetch(`${AQI_URL}?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
        aqiData = await aqiRes.json();
      } catch(_) { aqiData = getMockAQI(); }
    }
    state.data = cur; state.forecastData = fore;
    renderAll(cur, fore, aqiData);
    loadCity(cur.name);
  } catch(e){ showError(e.message || 'Location fetch failed.'); }
  finally { hideLoading(); }
}

// ---- RENDER ----
function renderAll(cur, fore, aqi){
  renderHero(cur);
  renderMetrics(cur);
  renderSunArc(cur);
  renderForecast(fore);
  renderHourly(fore);
  renderCharts(fore);
  renderAQI(aqi);
  applyWeatherTheme(cur.weather[0].main);
  showFact();
}

function renderHero(d){
  document.getElementById('hero-city').textContent    = d.name;
  document.getElementById('hero-country').textContent = d.sys.country;
  document.getElementById('hero-icon').textContent    = getEmoji(d.weather[0].main, d.weather[0].icon);
  document.getElementById('hero-temp').textContent    = toDisplayTemp(d.main.temp);
  document.getElementById('hero-condition').textContent = d.weather[0].description.replace(/\b\w/g,c=>c.toUpperCase());
  document.getElementById('hero-insight').textContent = getInsight(d);
}

function renderMetrics(d){
  document.getElementById('m-feels').textContent  = toDisplayTemp(d.main.feels_like);
  document.getElementById('m-hum').textContent    = d.main.humidity+'%';
  document.getElementById('m-wind').textContent   = Math.round(d.wind.speed)+' m/s';
  document.getElementById('m-press').textContent  = d.main.pressure+' hPa';
  document.getElementById('m-vis').textContent    = (d.visibility/1000).toFixed(1)+' km';
  document.getElementById('m-cloud').textContent  = d.clouds.all+'%';
  document.getElementById('m-uv').textContent     = d.uvi !== undefined ? d.uvi : '—';
  // Dew point approx: T - ((100-RH)/5)
  const dew = Math.round(d.main.temp - (100-d.main.humidity)/5);
  document.getElementById('m-dew').textContent    = toDisplayTemp(dew);
}

function renderSunArc(d){
  const rise = new Date(d.sys.sunrise*1000);
  const set  = new Date(d.sys.sunset*1000);
  document.getElementById('sun-rise').textContent = rise.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  document.getElementById('sun-set').textContent  = set.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
  // position sun on arc
  const now = Date.now()/1000;
  const frac = Math.max(0,Math.min(1,(now-d.sys.sunrise)/(d.sys.sunset-d.sys.sunrise)));
  const t = frac*Math.PI;
  // parametric point on arc: Q 10,70 100,-10 190,70
  const bx=100,by=-10, p0x=10,p0y=70, p1x=190,p1y=70;
  const cx = (1-frac)*(1-frac)*p0x + 2*(1-frac)*frac*bx + frac*frac*p1x;
  const cy = (1-frac)*(1-frac)*p0y + 2*(1-frac)*frac*by + frac*frac*p1y;
  const sunEl = document.getElementById('sun-pos');
  sunEl.setAttribute('cx', cx); sunEl.setAttribute('cy', cy);
  const pathEl = document.getElementById('sun-arc-path');
  pathEl.style.strokeDashoffset = 250*(1-frac);
}

function renderForecast(fore){
  const days = {};
  fore.list.forEach(item=>{
    const d = new Date(item.dt*1000);
    const key = d.toDateString();
    if(!days[key]) days[key]={ dt:item.dt, temps:[], icons:[], descs:[] };
    days[key].temps.push(item.main.temp);
    days[key].icons.push(item.weather[0]);
    days[key].descs.push(item.weather[0].description);
  });
  const entries = Object.values(days).slice(0,5);
  const container = document.getElementById('forecast-scroll');
  container.innerHTML = entries.map(day=>{
    const d = new Date(day.dt*1000);
    const name = d.toLocaleDateString(undefined,{weekday:'short'});
    const hi = Math.max(...day.temps), lo = Math.min(...day.temps);
    const icon = day.icons[Math.floor(day.icons.length/2)];
    const desc = day.descs[Math.floor(day.descs.length/2)];
    return `<div class="forecast-card">
      <div class="forecast-day">${name}</div>
      <span class="forecast-icon">${getEmoji(icon.main,icon.icon)}</span>
      <div class="forecast-hi">${toDisplayTemp(hi)}</div>
      <div class="forecast-lo">${toDisplayTemp(lo)}</div>
      <div class="forecast-desc">${desc}</div>
    </div>`;
  }).join('');
}

function renderHourly(fore){
  const items = fore.list.slice(0,8);
  const container = document.getElementById('hourly-scroll');
  container.innerHTML = items.map(item=>{
    const d = new Date(item.dt*1000);
    const hr = d.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit'});
    return `<div class="hourly-card">
      <div class="hourly-time">${hr}</div>
      <span class="hourly-icon">${getEmoji(item.weather[0].main,item.weather[0].icon)}</span>
      <div class="hourly-temp">${toDisplayTemp(item.main.temp)}</div>
    </div>`;
  }).join('');
}

function renderCharts(fore){
  const labels  = fore.list.slice(0,12).map(i=>{ const d=new Date(i.dt*1000); return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}); });
  const temps   = fore.list.slice(0,12).map(i=>Math.round(i.main.temp));
  const hums    = fore.list.slice(0,12).map(i=>i.main.humidity);
  const winds   = fore.list.slice(0,12).map(i=>Math.round(i.wind.speed*10)/10);
  const chartCfg = (label,data,color)=>({
    type:'line',
    data:{ labels, datasets:[{ label, data, borderColor:color, backgroundColor:color+'22',
      borderWidth:2, pointRadius:3, pointBackgroundColor:color, tension:0.4, fill:true }]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{display:false}, tooltip:{
        backgroundColor:'rgba(7,13,31,0.9)', titleColor:'#e8f4ff', bodyColor:'#7fa8d0',
        borderColor: color, borderWidth:1, padding:10,
      }},
      scales:{
        x:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3a5a7a',font:{size:10}} },
        y:{ grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#3a5a7a',font:{size:10}} },
      },
    },
  });
  ['chart-temp','chart-hum','chart-wind'].forEach(id=>{
    if(state.charts[id]) state.charts[id].destroy();
  });
  state.charts['chart-temp'] = new Chart(document.getElementById('chart-temp'), chartCfg('Temperature',temps,'#3b9eff'));
  state.charts['chart-hum']  = new Chart(document.getElementById('chart-hum'),  chartCfg('Humidity',hums,'#00e5ff'));
  state.charts['chart-wind'] = new Chart(document.getElementById('chart-wind'), chartCfg('Wind Speed',winds,'#b26fff'));
}

function renderAQI(data){
  const aqiMap = {1:{cat:'Good',color:'#00ffa3',rec:'Air quality is satisfactory. Enjoy outdoor activities.'},
    2:{cat:'Fair',color:'#aaff00',rec:'Acceptable quality. Sensitive individuals should limit prolonged exposure.'},
    3:{cat:'Moderate',color:'#ffb800',rec:'Some pollutants present. Unusually sensitive people should limit outdoor activity.'},
    4:{cat:'Poor',color:'#ff6b35',rec:'Everyone may begin to experience health effects. Limit outdoor exertion.'},
    5:{cat:'Very Poor',color:'#ff2a6d',rec:'Health warnings of emergency conditions. Avoid outdoor activity.'},
  };
  const aqi = data.list[0].main.aqi;
  const info = aqiMap[aqi]||aqiMap[1];
  document.getElementById('aqi-val').textContent = aqi;
  document.getElementById('aqi-cat').textContent = info.cat;
  document.getElementById('aqi-cat').style.color = info.color;
  document.getElementById('aqi-rec').textContent = info.rec;
  const gauge = document.getElementById('aqi-gauge');
  gauge.style.borderColor = info.color;
  gauge.style.boxShadow = `0 0 20px ${info.color}55`;
  document.getElementById('aqi-val').style.color = info.color;
  const comp = data.list[0].components;
  document.getElementById('aqi-bars').innerHTML =
    [['PM2.5',comp.pm2_5,75],['PM10',comp.pm10,150],['NO₂',comp.no2,200],['O₃',comp.o3,180]]
    .map(([n,v,max])=>`<div class="aqi-bar-row">
      <span style="width:36px">${n}</span>
      <div style="flex:1;height:4px;background:rgba(255,255,255,0.07);border-radius:99px;overflow:hidden">
        <div style="width:${Math.min(100,v/max*100)}%;height:100%;background:${info.color};border-radius:99px"></div>
      </div>
      <span style="width:32px;text-align:right">${v?v.toFixed(1):'—'}</span>
    </div>`).join('');
}

function applyWeatherTheme(main){
  const h = new Date().getHours();
  const cls = h<6||h>20 ? 'weather-night' :
    {Clear:'weather-clear',Rain:'weather-rain',Drizzle:'weather-rain',
     Snow:'weather-snow',Thunderstorm:'weather-storm',Clouds:''}[main]||'';
  document.body.className = document.body.className.replace(/weather-\w+/g,'').trim();
  if(cls) document.body.classList.add(cls);
}

// ---- LOADING ----
function showLoading(){ /* subtle; loading screen only on first load */ }
function hideLoading(){}

// ---- ERROR ----
let errorTimer;
function showError(msg){
  const t=document.getElementById('error-toast');
  t.textContent=msg; t.classList.add('show');
  clearTimeout(errorTimer); errorTimer=setTimeout(()=>t.classList.remove('show'),3500);
}

// ---- SETTINGS ----
function openSettings(){ document.getElementById('settings-panel').classList.add('open'); document.getElementById('overlay').classList.add('open'); }
function closeSettings(){ document.getElementById('settings-panel').classList.remove('open'); document.getElementById('overlay').classList.remove('open'); }
function setUnit(u){
  state.unit=u; localStorage.setItem('unit',u);
  document.getElementById('btn-celsius').classList.toggle('active',u==='C');
  document.getElementById('btn-fahrenheit').classList.toggle('active',u==='F');
  if(state.data) renderAll(state.data, state.forecastData, getMockAQI());
}
function setTheme(t){
  state.theme=t; localStorage.setItem('theme',t);
  document.body.classList.remove('theme-neon','theme-cyberpunk');
  if(t!=='dark') document.body.classList.add('theme-'+t);
  ['btn-dark','btn-neon','btn-cyber'].forEach(id=>document.getElementById(id).classList.remove('active'));
  const map={dark:'btn-dark',neon:'btn-neon',cyberpunk:'btn-cyber'};
  document.getElementById(map[t]).classList.add('active');
}

// ---- INIT ----
(function init(){
  // Apply saved settings
  if(state.unit==='F'){ document.getElementById('btn-celsius').classList.remove('active'); document.getElementById('btn-fahrenheit').classList.add('active'); }
  if(state.theme!=='dark') setTheme(state.theme);
  // Hide loading after 2.4s
  setTimeout(()=>document.getElementById('loading-screen').classList.add('hidden'), 2400);
  // Load default city
  setTimeout(()=>fetchWeather(state.city), 300);
})();