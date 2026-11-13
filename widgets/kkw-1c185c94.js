/* Konsolenkost Shop-Widget (Artikelsuche), entpackt aus Beitragsinhalt */
(function () {
  'use strict';
  var publicScript = 'https://cdn02.plentyone.com/xp4oxtd91bsc/plugin/509/konsolenkostplugininstantsearch/js/dist/konsolenkost-autoComplete.min.js';
  var endpoint = 'https://articles-search-new.konsolenkost-tools.de/typesense/collections/item_group/documents/search';
  function request(url, options) {
    var controller = new AbortController(), timer = setTimeout(function () { controller.abort(); }, 12000);
    return fetch(url, Object.assign({}, options || {}, {signal: controller.signal})).then(function (r) {
      if (!r.ok) throw new Error('Abruf fehlgeschlagen');
      return r;
    }).finally(function () { clearTimeout(timer); });
  }
  function allowed(d) {
    var n = d.name || '', short = d.short_name || n;
    return d.availability_id === 1 && !/18#/.test(String(d.usk || '')) &&
      !/BUNDLEARTIKEL|DEFEKT|\bNV\b|Sammlung|Bundle|Konvolut|Karton|^\d+\s*x\s/i.test(n) &&
      !/Sammlung|Bundle|Karton|^\d+\s*x\s|^SA[\s:]/i.test(short) &&
      !/Spielanleitung|Lösungsbuch|\bGuide\b|\bManual\b|nur (OVP|Verpackung)|Leerhülle/i.test(short) &&
      (!(d.type || []).includes('Spiele') || !/ \+ |Wundert|Adapter|Collection|Double Feature|\d+ (Original )?.*Spiele/i.test(short));
  }
  function products(hits, limit, selectedIds) {
    var result = [], groups = {}, ids = new Set();
    hits.forEach(function (hit) {
      var d = hit.document;
      if (!allowed(d)) return;
      var group = d.group_id || d.id;
      (d.items || []).forEach(function (it) {
        if ((selectedIds && !selectedIds.includes(String(it.item_id))) || it.availability_id !== 1 || (groups[group] || 0) >= 2 || ids.has(String(it.item_id))) return;
        if (!Number.isFinite(Number(it.price)) || Number(it.price) <= 0 || !/^\d+$/.test(String(it.item_id))) return;
        var pack = it.packaging || [], cond = it.condition || [];
        var graded = d.is_graded === true || /WATA|VGA|Grading|CGC|PSA/i.test(cond.join(' '));
        var ovp = pack.includes('mit OVP'), isNew = cond.includes('NEU');
        var disc = /PS|PlayStation|Xbox|GameCube|Dreamcast|Saturn|Wii|Mega-CD/i.test(d.system || '');
        var game = (d.type || []).includes('Spiele');
        var cat = graded ? 'Gegradet' : isNew && ovp ? 'Neu & OVP' : ovp ? 'Mit OVP' : game && !disc ? 'Nur Modul' : game ? 'Nur Disc' : 'Ohne OVP';
        var img = d.cover_image || d.cover_thumbnail || '';
        if (!/^https:\/\//.test(img)) return;
        ids.add(String(it.item_id)); groups[group] = (groups[group] || 0) + 1;
        result.push({id: it.item_id, name: d.short_name || d.name, system: d.system, cat: cat, price: Number(it.price), img: img});
      });
    });
    return result.slice(0, limit);
  }
  function init() {
    document.querySelectorAll('.kk-nw[data-query]').forEach(function (w) {
      if (w.dataset.init) return;
      w.dataset.init = '1';
      var grid = w.querySelector('.kk-nw-grid'), sort = w.querySelector('.kk-nw-s');
      var count = w.querySelector('.kk-nw-n'), status = w.querySelector('.kk-nw-status');
      var cards = Array.from(grid.children), filter = 'all';
      function update() {
        var list = cards.slice(), n = 0;
        if (sort.value === 'asc') list.sort(function (a,b) { return Number(a.dataset.p) - Number(b.dataset.p); });
        if (sort.value === 'desc') list.sort(function (a,b) { return Number(b.dataset.p) - Number(a.dataset.p); });
        if (sort.value === 'name') list.sort(function (a,b) { return a.textContent.localeCompare(b.textContent, 'de'); });
        list.forEach(function (card) {
          grid.appendChild(card);
          var show = filter === 'all' || card.dataset.c === filter;
          card.style.display = show ? 'flex' : 'none';
          if (show) n++;
        });
        count.textContent = n + ' Artikel' + (n === 0 ? ' – wählt einen anderen Filter.' : '');
        grid.scrollLeft = 0;
      }
      w.querySelectorAll('button[data-f]').forEach(function (button) {
        button.addEventListener('click', function () {
          filter = button.dataset.f;
          w.querySelectorAll('button[data-f]').forEach(function (b) {
            var active = b === button;
            b.setAttribute('aria-pressed', String(active));
            b.style.background = active ? '#14232d' : '#fff'; b.style.color = active ? '#fff' : '#14232d';
          });
          update();
        });
      });
      sort.addEventListener('change', update); update();
      // Public frontend search key is read only into memory, never embedded in the article.
      window.kkNwPublicKey = window.kkNwPublicKey || request(publicScript).then(function (r) { return r.text(); }).then(function (text) {
        var match = text.match(/,s="([^"]+)",u="item_group"/);
        if (!match) throw new Error('Öffentliche Suchkonfiguration geändert');
        return match[1];
      });
      var limit = Math.max(1, Math.min(36, Number(w.dataset.limit) || 12));
      window.kkNwPublicKey.then(async function (key) {
        var filterBy = 'availability_id:=1';
        if (w.dataset.system) filterBy += ' && system:=' + w.dataset.system;
        if (w.dataset.type) filterBy += ' && type:=[' + w.dataset.type + ']';
        if (w.dataset.ids) {
          var ids = w.dataset.ids.split(',').map(function (s) { return s.trim(); }).filter(function (s) { return /^\d+$/.test(s); });
          if (!ids.length) throw new Error('Ungültige Artikelauswahl');
          filterBy += ' && items.id:=[' + ids.join(',') + ']';
        }
        var hits = [];
        for (var page = 1; page <= 3; page++) {
          var params = new URLSearchParams({q: w.dataset.query || '*', preset: 'webshop-search', per_page: '100', page: String(page), filter_by: filterBy});
          var r = await request(endpoint + '?' + params, {headers: {'X-TYPESENSE-API-KEY': key}});
          var data = await r.json();
          if (!Array.isArray(data.hits)) throw new Error('Ungültige Suchantwort');
          hits = hits.concat(data.hits);
          if (products(hits, limit, ids).length >= limit || data.hits.length < 100) break;
        }
        var result = products(hits, limit, ids);
        if (!result.length) throw new Error('Keine passenden lieferbaren Artikel');
        var fragment = document.createDocumentFragment();
        result.forEach(function (p) {
          var card = cards[0].cloneNode(true);
          card.href = 'https://www.konsolenkost.de/a-' + p.id + '/?utm_source=newsblog&utm_campaign=Newsblog%20Ads&utm_medium=referral&rel=newsblog';
          card.dataset.c = p.cat; card.dataset.p = String(p.price); card.style.display = 'flex';
          var img = card.querySelector('img'); img.src = p.img; img.alt = p.name;
          card.querySelector('strong').textContent = p.name;
          card.querySelector('.kk-nw-sub').textContent = p.system + ' · ' + p.cat;
          var price = document.createElement('span'); price.className = 'kk-nw-price';
          price.style.cssText = 'margin-top:auto;font-size:19px;font-weight:800;color:#0075b4';
          price.textContent = 'ab ' + p.price.toLocaleString('de-DE', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
          card.insertBefore(price, card.lastElementChild); fragment.appendChild(card);
        });
        grid.replaceChildren(fragment); cards = Array.from(grid.children);
        sort.querySelectorAll('option[value="asc"],option[value="desc"]').forEach(function (o) { o.disabled = false; });
        status.textContent = 'Live aus dem Shop. Preis und Lieferbarkeit beim Artikel prüfen. „ab“ bezeichnet die gezeigte Artikelvariante.';
        w.dataset.live = '1'; update();
      }).catch(function () {
        status.textContent = 'Produktauswahl ohne Live-Preise. Aktuellen Preis und Lieferbarkeit findet ihr im Shop.';
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true}); else init();
})();

