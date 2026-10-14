/* Answerloft core. Original code (c) Jeremy Hodges. Self-hosted help center / knowledge base. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Answerloft = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'article';
  }
  function safeHref(u) {
    u = String(u || '').trim();
    return /^(https:\/\/|mailto:|#|\.\/|\/)[^\s"'<>]*$/i.test(u) ? u : '#';
  }
  // Small, safe Markdown subset: headings, bold, italic, code, links, lists, paragraphs, fenced code.
  function inline(s) {
    return esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (m, t, u) {
        return '<a href="' + esc(safeHref(u.replace(/&amp;/g, '&'))) + '">' + t + '</a>';
      });
  }
  function markdown(md) {
    var lines = String(md || '').replace(/\r/g, '').split('\n'), out = [], list = null, para = [], code = null;
    function flush() {
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; }
      if (list) { out.push('</' + list + '>'); list = null; }
    }
    lines.forEach(function (l) {
      if (code !== null) { if (/^```/.test(l)) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null; } else code.push(l); return; }
      if (/^```/.test(l)) { flush(); code = []; return; }
      var h = /^(#{1,4})\s+(.*)$/.exec(l), li = /^\s*([-*]|\d+\.)\s+(.*)$/.exec(l);
      if (h) { flush(); var n = h[1].length + 1; out.push('<h' + n + ' id="' + slugify(h[2]) + '">' + inline(h[2]) + '</h' + n + '>'); }
      else if (li) { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } var t = /\d/.test(li[1]) ? 'ol' : 'ul'; if (list !== t) { if (list) out.push('</' + list + '>'); out.push('<' + t + '>'); list = t; } out.push('<li>' + inline(li[2]) + '</li>'); }
      else if (!l.trim()) flush();
      else { if (list) { out.push('</' + list + '>'); list = null; } para.push(l.trim()); }
    });
    if (code !== null) out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>');
    flush();
    return out.join('\n');
  }
  function plain(md) { return String(md || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*`>\[\]()_-]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function normalize(a) {
    a = a || {};
    return { title: String(a.title || 'Untitled').trim(), slug: a.slug ? slugify(a.slug) : slugify(a.title),
      category: String(a.category || 'General').trim(), tags: (a.tags || []).map(function (t) { return String(t).toLowerCase(); }),
      body: String(a.body || ''), updated: /^\d{4}-\d{2}-\d{2}$/.test(a.updated) ? a.updated : '', draft: a.draft === true, order: Number(a.order) || 0 };
  }
  function load(list) {
    var seen = {};
    return (list || []).map(normalize).filter(function (a) { return !a.draft; }).map(function (a) {
      var s = a.slug, i = 2; while (seen[s]) s = a.slug + '-' + i++; seen[s] = 1; a.slug = s; return a;
    });
  }
  function categories(arts) {
    var map = {}, order = [];
    arts.forEach(function (a) { if (!map[a.category]) { map[a.category] = []; order.push(a.category); } map[a.category].push(a); });
    return order.map(function (c) { return { name: c, slug: slugify(c), articles: map[c].slice().sort(function (x, y) { return x.order - y.order || x.title.localeCompare(y.title); }) }; });
  }
  function tokens(q) { return String(q || '').toLowerCase().split(/[^a-z0-9]+/).filter(function (t) { return t.length > 1; }); }
  // Ranked search: title hits > tag hits > heading hits > body hits; all terms must appear somewhere.
  function search(arts, q, limit) {
    var ts = tokens(q); if (!ts.length) return [];
    return arts.map(function (a) {
      var title = a.title.toLowerCase(), tags = a.tags.join(' '), body = plain(a.body).toLowerCase(),
        heads = (a.body.match(/^#{1,4}.*$/gm) || []).join(' ').toLowerCase(), score = 0, all = true;
      ts.forEach(function (t) {
        var s = (title.indexOf(t) >= 0 ? 10 : 0) + (tags.indexOf(t) >= 0 ? 6 : 0) + (heads.indexOf(t) >= 0 ? 3 : 0) + Math.min(body.split(t).length - 1, 5);
        if (!s) all = false; score += s;
      });
      return { article: a, score: all ? score : 0 };
    }).filter(function (r) { return r.score > 0; }).sort(function (x, y) { return y.score - x.score || x.article.title.localeCompare(y.article.title); })
      .slice(0, limit || 10).map(function (r) { return r.article; });
  }
  function snippet(a, q, len) {
    len = len || 160; var text = plain(a.body), ts = tokens(q), lo = text.toLowerCase(), at = 0;
    for (var i = 0; i < ts.length; i++) { var p = lo.indexOf(ts[i]); if (p >= 0) { at = Math.max(0, p - 40); break; } }
    var s = text.slice(at, at + len); return (at ? '…' : '') + s + (at + len < text.length ? '…' : '');
  }
  function related(arts, a, n) {
    return arts.filter(function (b) { return b.slug !== a.slug; }).map(function (b) {
      var s = (b.category === a.category ? 2 : 0) + b.tags.filter(function (t) { return a.tags.indexOf(t) >= 0; }).length * 3;
      return { b: b, s: s };
    }).filter(function (r) { return r.s > 0; }).sort(function (x, y) { return y.s - x.s; }).slice(0, n || 3).map(function (r) { return r.b; });
  }
  function llmsTxt(arts, site) {
    return '# ' + (site || 'Help Center') + '\n\n' + categories(arts).map(function (c) {
      return '## ' + c.name + '\n' + c.articles.map(function (a) { return '- [' + a.title + '](#/a/' + a.slug + ')'; }).join('\n');
    }).join('\n\n') + '\n';
  }
  return { esc: esc, slugify: slugify, safeHref: safeHref, markdown: markdown, plain: plain, normalize: normalize, load: load,
    categories: categories, search: search, snippet: snippet, related: related, llmsTxt: llmsTxt };
});
