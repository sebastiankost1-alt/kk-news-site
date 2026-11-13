/* Konsolenkost Shop-Widget (Artikelsuche), entpackt aus Beitragsinhalt */
(function(){
(function () {
  'use strict';
  const bundle = 'https://cdn02.plentyone.com/xp4oxtd91bsc/plugin/509/konsolenkostplugininstantsearch/js/dist/konsolenkost-autoComplete.min.js';
  const endpoint = 'https://articles-search-new.konsolenkost-tools.de/typesense/collections/item_group/documents/search';
  const colors = {"NES": {"bg": "#b4232c", "text": "#ffffff", "hover": "#931c24"}, "SNES": {"bg": "#6b519c", "text": "#ffffff", "hover": "#57427f"}, "N64": {"bg": "#237443", "text": "#ffffff", "hover": "#1c5f36"}, "GameCube": {"bg": "#514689", "text": "#ffffff", "hover": "#423970"}, "Wii": {"bg": "#267d9b", "text": "#ffffff", "hover": "#1f667f"}, "Wii U": {"bg": "#0085a8", "text": "#000000", "hover": "#0085a8"}, "Switch": {"bg": "#e60012", "text": "#ffffff", "hover": "#bc000e"}, "Switch 2": {"bg": "#e60012", "text": "#ffffff", "hover": "#bc000e"}, "Game Boy": {"bg": "#635b75", "text": "#ffffff", "hover": "#514a5f"}, "Game Boy Color": {"bg": "#633b91", "text": "#ffffff", "hover": "#513076"}, "GBA": {"bg": "#514689", "text": "#ffffff", "hover": "#423970"}, "DS": {"bg": "#9b293e", "text": "#ffffff", "hover": "#7f2132"}, "3DS": {"bg": "#b4232c", "text": "#ffffff", "hover": "#931c24"}, "PS1": {"bg": "#244d91", "text": "#ffffff", "hover": "#1d3f76"}, "PS2": {"bg": "#17346a", "text": "#ffffff", "hover": "#122a56"}, "PS3": {"bg": "#202329", "text": "#ffffff", "hover": "#1a1c21"}, "PS4": {"bg": "#003791", "text": "#ffffff", "hover": "#002d76"}, "PS5": {"bg": "#003791", "text": "#ffffff", "hover": "#002d76"}, "PSP": {"bg": "#202329", "text": "#ffffff", "hover": "#1a1c21"}, "PS Vita": {"bg": "#003791", "text": "#ffffff", "hover": "#002d76"}, "Xbox": {"bg": "#107c10", "text": "#ffffff", "hover": "#0d650d"}, "Xbox 360": {"bg": "#2f751b", "text": "#ffffff", "hover": "#265f16"}, "Xbox One": {"bg": "#107c10", "text": "#ffffff", "hover": "#0d650d"}, "Xbox Series": {"bg": "#107c10", "text": "#ffffff", "hover": "#0d650d"}, "Mega Drive": {"bg": "#174c9b", "text": "#ffffff", "hover": "#123e7f"}, "Master System": {"bg": "#174c9b", "text": "#ffffff", "hover": "#123e7f"}, "Saturn": {"bg": "#174c9b", "text": "#ffffff", "hover": "#123e7f"}, "Dreamcast": {"bg": "#145ba3", "text": "#ffffff", "hover": "#104a85"}, "Game Gear": {"bg": "#174c9b", "text": "#ffffff", "hover": "#123e7f"}, "Neo Geo": {"bg": "#205799", "text": "#ffffff", "hover": "#1a477d"}, "Atari": {"bg": "#b4232c", "text": "#ffffff", "hover": "#931c24"}, "Merchandise/Zubehör": {"bg": "#0b6fb3", "text": "#ffffff", "hover": "#095b92"}, "Sonstige": {"bg": "#14232d", "text": "#ffffff", "hover": "#101c24"}};
  const aliases = {'GameBoy':'Game Boy','GameBoy Color':'Game Boy Color','GameBoy Advance':'GBA','Nintendo DS':'DS','NDS':'DS','Nintendo 3DS':'3DS','PlayStation':'PS1','Playstation':'PS1','PlayStation 2':'PS2','PlayStation 3':'PS3','PlayStation 4':'PS4','PlayStation 5':'PS5','Xbox Series X':'Xbox Series','Xbox Series X/S':'Xbox Series','Nintendo Switch':'Switch','Nintendo Switch 2':'Switch 2'};
  function palette(system) { return colors[aliases[system] || system] || colors[/Atari/i.test(system) ? 'Atari' : /Zubehör|Merchandise/i.test(system) ? 'Merchandise/Zubehör' : 'Sonstige']; }
  function paint(el, system) { const c = palette(system); el.style.setProperty('--kkw-bg', c.bg); el.style.setProperty('--kkw-text', c.text); el.style.setProperty('--kkw-hover', c.hover); }
  async function request(url, options) {
    const controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 12000);
    try { const r = await fetch(url, Object.assign({}, options || {}, {signal:controller.signal})); if (!r.ok) throw Error('HTTP'); return r; } finally { clearTimeout(timer); }
  }
  function allowed(d) {
    if (d.availability_id !== 1) return false;
    if (/18#/.test(String(d.usk || ''))) return false;
    const n = d.name || '', s = d.short_name || n;
    if (/BUNDLEARTIKEL|DEFEKT|\bNV\b|Sammlung|Bundle|Konvolut|Karton|^\d+\s*x\s/i.test(n)) return false;
    if (/Sammlung|Bundle|Karton|^\d+\s*x\s|^SA[\s:]/i.test(s)) return false;
    if (/Spielanleitung|Lösungsbuch|\bGuide\b|\bManual\b|nur (OVP|Verpackung)|Leerhülle/i.test(s)) return false;
    if ((d.type || []).includes('Spiele')) { if (/ \+ |Wundert|Adapter|Collection|Double Feature|\d+ (Original )?.*Spiele/i.test(s)) return false; }
    if ((d.type || []).includes('Konsolen')) { if (!/Konsole|Classic Mini/i.test(s)) return false; if (/Controller|Pad\b/i.test(s.split('+')[0])) return false; }
    return true;
  }
  function products(hits, limit, ids) {
    const result = [], seen = new Set(), groups = {};
    hits.forEach(function (h) {
      const d = h.document;
      if (!d) return;
      if (!allowed(d)) return;
      const group = d.group_id || d.id;
      (d.items || []).forEach(function (it) {
        const id = String(it.item_id);
        if (ids) { if (!ids.includes(id)) return; }
        if (it.availability_id !== 1 || seen.has(id) || (groups[group] || 0) >= 2) return;
        if (!/^\d+$/.test(id) || !Number.isFinite(Number(it.price)) || Number(it.price) <= 0) return;
        const pack = it.packaging || [], cond = it.condition || [];
        if ((d.type || []).includes('Konsolen')) { if (!pack.includes('mit OVP')) return; }
        let img;
        try { const u = new URL(d.cover_image || d.cover_thumbnail); const m = u.pathname.match(/^\/item\/images\/.+/); if (!m) return; img = 'https://cdn02.plentyone.com/xp4oxtd91bsc' + m[0].replace(/\.avif/gi,''); } catch (_) { return; }
        const ovp = pack.includes('mit OVP'), game = (d.type || []).includes('Spiele');
        let cat = game ? (/PS|PlayStation|Xbox|GameCube|Dreamcast|Saturn|Wii|Mega-CD/i.test(d.system) ? 'Nur Disc' : 'Nur Modul') : 'Ohne OVP';
        if (ovp) cat = 'Mit OVP';
        if (ovp) { if (cond.includes('NEU')) cat = 'Neu & OVP'; }
        if (d.is_graded === true || /WATA|VGA|Grading|CGC|PSA/i.test(cond.join(' '))) cat = 'Gegradet';
        const name = (d.short_name || d.name).replace(/\s*[\(\[][^\)\]]*[\)\]]/g,'').replace(/#/g,'').replace(/\s+(WATA|VGA|Pixel|CGC|PSA|Grading)\b.*$/i,'').replace(/[)]+/g,'').trim();
        seen.add(id); groups[group] = (groups[group] || 0) + 1;
        result.push({id:id,name:name,system:String(d.system || 'Sonstige'),cat:cat,price:Number(it.price),img:img,created:Number(d.create_date)||0});
      });
    });
    if (ids) result.sort(function(a,b){return ids.indexOf(a.id)-ids.indexOf(b.id);});
    return result.slice(0,limit);
  }
  function node(tag, cls, text) { const el = document.createElement(tag); el.className = cls; if (text !== undefined) el.textContent = text; return el; }
  function card(p, icon) {
    const a = node('a','kkw-card'); a.href = 'https://www.konsolenkost.de/a-'+p.id+'/?utm_source=newsblog&utm_campaign=Newsblog%20Ads&utm_medium=referral&rel=newsblog';
    a.dataset.system=p.system; a.dataset.name=p.name; a.dataset.p=String(p.price); paint(a,p.system);
    const media=node('span','kkw-media'), img=node('img','kkw-image'); img.src=p.img; img.alt=p.name; img.loading='lazy'; img.decoding='async'; media.append(img,node('span','kkw-badge',p.system));
    const body=node('span','kkw-body'); body.append(node('strong','kkw-title',p.name),node('span','kkw-sub',p.system+' · '+p.cat),node('span','kkw-price','ab '+p.price.toLocaleString('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2})+' €'));
    const button=node('span','kkw-button');
    if (icon) button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M2 3h3l3 12h11l3-9H6M9 21h.01M18 21h.01"/></svg>';
    button.append(document.createTextNode('Zum Angebot')); body.append(button); a.append(media,body); return a;
  }
  function init() {
    document.querySelectorAll('.kkw-widget').forEach(function(w) {
      if(w.dataset.init) return;
      w.dataset.init='1';
      const track=w.querySelector('.kkw-track'); if(!track) return;
      const status=w.querySelector('.kkw-status'), count=w.querySelector('.kkw-count');
      let cards=Array.from(track.children), filter='all';
      const toolbar=node('div','kkw-toolbar'), filters=node('div','kkw-filters'), price=node('select','kkw-select'), sort=node('select','kkw-select');
      price.setAttribute('aria-label','Preisbereich'); sort.setAttribute('aria-label','Sortierung');
      price.innerHTML='<option value="all">Alle Preise</option><option value="25">Bis 25 €</option><option value="50">Bis 50 €</option><option value="100">Bis 100 €</option>';
      sort.innerHTML='<option value="rec">Empfohlen</option><option value="name">Name A–Z</option><option value="asc">Preis aufsteigend</option><option value="desc">Preis absteigend</option><option value="new">Neu im Shop</option>';
      function enable(live) { price.disabled=!live; sort.querySelectorAll('option').forEach(function(o){if(['asc','desc','new'].includes(o.value)) o.disabled=!live;}); }
      function update() {
        let list=cards.slice();
        if(sort.value==='name') list.sort(function(a,b){return a.dataset.name.localeCompare(b.dataset.name,'de');});
        if(sort.value==='asc') list.sort(function(a,b){return Number(a.dataset.p)-Number(b.dataset.p);});
        if(sort.value==='desc') list.sort(function(a,b){return Number(b.dataset.p)-Number(a.dataset.p);});
        if(sort.value==='new') list.sort(function(a,b){return Number(b.dataset.created)-Number(a.dataset.created);});
        let n=0;
        list.forEach(function(c){let show=filter==='all'||c.dataset.system===filter;if(price.value!=='all') {if(Number(c.dataset.p)>Number(price.value)) show=false;} c.hidden=!show;track.append(c);if(show)n++;});
        count.textContent=n+' Artikel'+(n===0?' – bitte andere Filter wählen.':'');track.scrollLeft=0;
      }
      function filterButtons() {
        filters.replaceChildren();
        ['all'].concat(Array.from(new Set(cards.map(function(c){return c.dataset.system;})))).forEach(function(system){const b=node('button','kkw-filter',system==='all'?'Alle':system);b.type='button';paint(b,system);b.setAttribute('aria-pressed',String(system===filter));b.addEventListener('click',function(){filter=system;filters.querySelectorAll('button').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});update();});filters.append(b);});
      }
      cards.forEach(function(c){paint(c,c.dataset.system);});
      if(w.dataset.variant==='slider') {
        toolbar.append(filters,price,sort);
        [-1,1].forEach(function(dir){const b=node('button','kkw-arrow',dir<0?'←':'→');b.type='button';b.setAttribute('aria-label',dir<0?'Vorherige Artikel':'Weitere Artikel');b.addEventListener('click',function(){track.scrollBy({left:dir*232,behavior:'smooth'});});toolbar.append(b);});
        w.insertBefore(toolbar,track); filterButtons();price.addEventListener('change',update);sort.addEventListener('change',update);
      }
      enable(false);update();
      window.kkwKeyPromise=window.kkwKeyPromise||request(bundle).then(function(r){return r.text();}).then(function(t){const m=t.match(/,s="([^"]+)",u="item_group"/);if(!m)throw Error('Konfiguration');return m[1];}).catch(function(e){window.kkwKeyPromise=null;throw e;});
      window.kkwKeyPromise.then(async function(key){
        let ids, clauses=['availability_id:=1'];
        if(w.dataset.ids){ids=w.dataset.ids.split(',').map(function(s){return s.trim();});if(!ids.every(function(id){return /^\d+$/.test(id);})) throw Error('IDs');clauses.push('items.id:=['+ids.join(',')+']');}
        if(!ids){if(w.dataset.system){const systems=w.dataset.system.replace(/^\[|\]$/g,'').split(',').map(function(s){return s.trim();});if(!systems.every(function(s){return /^[\p{L}\p{N} /+.-]+$/u.test(s);}))throw Error('System');clauses.push('system:=['+systems.map(function(s){return '`'+s+'`';}).join(',')+']');}if(w.dataset.type){if(!/^[\p{L} ,]+$/u.test(w.dataset.type))throw Error('Typ');clauses.push('type:=['+w.dataset.type+']');}}
        const limit=w.dataset.variant==='highlight'?1:w.dataset.variant==='mini'?3:Math.max(1,Math.min(36,Math.floor(Number(w.dataset.limit)||12)));
        let hits=[];
        for(let page=1;page<=5;page++) {
          const params=new URLSearchParams({q:ids?'*':w.dataset.query||'*',preset:'webshop-search',per_page:'100',page:String(page),filter_by:clauses.join(' '+String.fromCharCode(38,38)+' ')});
          if(w.dataset.order==='new')params.set('sort_by','create_date:desc');
          const r=await request(endpoint+'?'+params,{headers:{'X-TYPESENSE-API-KEY':key}}), data=await r.json();
          if(!Array.isArray(data.hits))throw Error('Antwort');hits=hits.concat(data.hits);
          if(products(hits,limit,ids).length>=limit||data.hits.length<100)break;
        }
        const result=products(hits,limit,ids);if(!result.length)throw Error('Leer');
        cards=result.map(function(p){const c=card(p,w.dataset.icon==='cart');c.dataset.created=String(p.created);return c;});track.replaceChildren.apply(track,cards);w.dataset.live='1';enable(true);filterButtons();update();status.textContent='Live aus dem Shop · „ab“ gilt für die gezeigte Variante. Preis und Lieferbarkeit im Shop prüfen.';
      }).catch(function(){status.textContent='Auswahl ohne Live-Preise · Aktuellen Preis und Lieferbarkeit im Shop prüfen.';w.dataset.live='0';});
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
})()
