/**
 * NoteSphere OS — Native desktop widgets (always-on-top acrylic windows).
 *
 * Открывает маленькие «живые» окна поверх рабочего стола поверх основного
 * окна приложения (frameless, transparent, always-on-top). Каждое окно грузит
 * инлайн-HTML с собственным скриптом, поэтому работает автономно от React.
 * Управление происходит из вкладки «Рабочий стол» (WidgetsTab) через IPC.
 */

const { BrowserWindow } = require('electron');

const ACCENT = '#8b5cf6';
const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

// ---------------------------------------------------------------------------
// Inline HTML templates
// ---------------------------------------------------------------------------
function clockHtml(accent) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:transparent;overflow:hidden;font-family:${FONT};}
  *{box-sizing:border-box}
  .wrap{height:100%;display:flex;flex-direction:column;justify-content:center;align-items:center;
    border-radius:18px;background:linear-gradient(160deg, rgba(10,11,14,.86), rgba(15,17,21,.72));
    border:1px solid rgba(255,255,255,.09);box-shadow:0 8px 30px -8px rgba(0,0,0,.6);
    backdrop-filter:blur(14px);user-select:none}
  .grab{-webkit-app-region:drag;position:absolute;top:4px;left:8px;right:8px;height:14px;
    display:flex;align-items:center;gap:4px;opacity:.4}
  .grab i{width:5px;height:5px;border-radius:50%;background:${accent}}
  .time{font-size:46px;font-weight:700;color:#fff;letter-spacing:1px;line-height:1}
  .time b{color:${accent};animation:blink 1s steps(1) infinite}
  .date{margin-top:8px;font-size:12px;color:rgba(226,232,240,.7);text-transform:capitalize}
  .zone{margin-top:4px;font-size:10px;color:rgba(148,163,184,.6)}
  @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:.25}}
</style></head><body>
  <div class="wrap">
    <div class="grab"><i></i><i></i><i></i></div>
    <div class="time" id="t">00:00<span id="s" style="color:${accent}">:</span>00</div>
    <div class="date" id="d"></div>
    <div class="zone" id="z"></div>
  </div>
  <script>
    const t=document.getElementById('t'),d=document.getElementById('d'),z=document.getElementById('z');
    function pad(n){return String(n).padStart(2,'0')}
    function now(){const x=new Date();t.innerHTML=pad(x.getHours())+'<span style="color:'+${JSON.stringify(accent)}+'">:</span>'+pad(x.getMinutes());
      d.textContent=x.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
      z.textContent=new Intl.DateTimeFormat('ru-RU',{timeZoneName:'short'}).formatToParts().find(p=>p.type==='timeZoneName').value||'';}
    tick();setInterval(tick,1000);
  </script>
</body></html>`;
}

function mediaHtml(accent) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:transparent;overflow:hidden;font-family:${FONT};}
  *{box-sizing:border-box}
  .wrap{height:100%;display:flex;gap:10px;align-items:center;padding:10px 14px;
    border-radius:14px;background:linear-gradient(160deg, rgba(10,12,14,.86), rgba(19,20,26,.72));
    border:1px solid rgba(255,255,255,.09);backdrop-filter:blur(14px);box-shadow:0 8px 30px -8px rgba(0,0,0,.6);user-select:none}
  .drag{-webkit-app-region:drag;position:absolute;top:4px;left:8px;right:8px;height:12px}
  .art{width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center;
    font-size:18px;background:${accent}22;color:${accent};flex-shrink:0}
  .meta{overflow:hidden;flex:1}
  .name{font-size:12px;font-weight:700;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .sub{font-size:10px;color:rgba(148,163,184,.85);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .eq{display:flex;gap:2px;align-items:flex-end;height:14px;flex-shrink:0}
  .eq i{width:3px;background:${accent};border-radius:2px;animation:eq 1s ease-in-out infinite}
  .eq i:nth-child(2){animation-delay:.2s}.eq i:nth-child(3){animation-delay:.4s}.eq i:nth-child(4){animation-delay:.1s}
  .idle{opacity:.35}
  @keyframes eq{0%,100%{height:3px}50%{height:14px}}
</style></head><body>
  <div class="wrap">
    <div class="drag"></div>
    <div class="art">♪</div>
    <div class="meta">
      <div class="name" id="n">Остановлено</div>
      <div class="sub" id="s">SpherePlayer • образец</div>
    </div>
    <div class="eq idle" id="eq"><i></i><i></i><i></i><i></i></div>
  </div>
  <script>
    if(window.nsWidget && window.nsWidget.onMedia){
      window.nsWidget.onMedia(function(d){
        var n=document.getElementById('n'),s=document.getElementById('s'),eq=document.getElementById('eq');
        if(d && d.name){n.textContent=d.name;s.textContent=d.playing?'Воспроизводится...':'На паузе';
          eq.classList.toggle('idle', !d.playing);}else{eq.classList.add('idle');}
      });
    }
  </script>
</body></html>`;
}

function notesHtml(accent) {
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:transparent;overflow:hidden;font-family:${FONT};}
  *{box-sizing:border-box}
  .wrap{height:100%;display:flex;flex-direction:column;gap:6px;padding:16px 14px 12px;
    border-radius:14px;background:linear-gradient(160deg, rgba(10,12,14,.82), rgba(23,17,6,.7));
    border:1px solid rgba(255,183,58,.25);backdrop-filter:blur(14px);box-shadow:0 8px 30px -8px rgba(0,0,0,.6);user-select:none}
  .drag{-webkit-app-region:drag;height:12px;position:absolute;top:4px;left:8px;right:8px}
  .head{font-size:10px;font-weight:700;color:${accent};display:flex;align-items:center;gap:5px}
  textarea{flex:1;background:transparent;border:0;outline:none;resize:none;color:#f8fafc;
    font-size:12px;font-family:${FONT};line-height:1.5}
  .foot{font-size:8px;color:rgba(148,163,184,.5);text-align:right}
</style></head><body>
  <div class="wrap">
    <div class="drag"></div>
    <div class="head">◆ Быстрая заметка</div>
    <textarea id="a" placeholder="Заметка сохраняется локально..."></textarea>
    <div class="foot">NoteSphere OS • автосохранение</div>
  </div>
  <script>
    var a=document.getElementById('a');
    if(window.nsWidget && window.nsWidget.onNotes){
      window.nsWidget.onNotes(function(text){ a.value=text||''; });
      a.addEventListener('input', function(){ if(window.nsWidget.save) window.nsWidget.save(a.value); });
    }
  </script>
</body></html>`;
}

// ---------------------------------------------------------------------------
// Registry + lifecycle
// ---------------------------------------------------------------------------
const WINDOW_SIZE = {
  clock: { width: 210, height: 130 },
  media: { width: 320, height: 74 },
  notes: { width: 240, height: 180 },
};

const windows = {}; // id -> BrowserWindow

function widgetUrl(id, accent) {
  const map = { clock: clockHtml, media: mediaHtml, notes: notesHtml };
  return 'data:text/html;charset=utf-8,' + encodeURIComponent(map[id](accent));
}

function createWidget(id, accent) {
  const opt = WINDOW_SIZE[id] || WINDOW_SIZE.clock;
  const offset = Object.keys(windows).length;
  const win = new BrowserWindow({
    width: opt.width,
    height: opt.height,
    x: Math.round(20 + offset * 30),
    y: Math.round(20 + offset * 30),
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: require('path').join(__dirname, 'preload.cjs'),
    },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.loadURL(widgetUrl(id, accent));
  win.on('closed', () => delete windows[id]);
  windows[id] = win;
  return win;
}

function toggle(id, accent) {
  if (windows[id] && !windows[id].isDestroyed()) {
    windows[id].close();
    delete windows[id];
    return { id, open: false };
  }
  createWidget(id, accent);
  return { id, open: true };
}

function closeAll() {
  Object.values(windows).forEach((win) => {
    if (!win.isDestroyed()) win.close();
  });
  Object.keys(windows).forEach((k) => delete windows[k]);
}

// Push state to live widget page
function pushMedia(payload) {
  const win = windows.media;
  if (win && !win.isDestroyed()) win.webContents.send('native:media', payload);
}
function pushNotesText(text) {
  const win = windows.notes;
  if (win && !win.isDestroyed()) win.webContents.send('native:notes', text);
}

module.exports = { toggle, closeAll, pushMedia, pushNotesText, hasWidget: (id) => !!(windows[id] && !windows[id].isDestroyed()) };