(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  // --- load data (prefer lessons/*.js + __COURSE__, fallback to data.js / inline JSON) ---
  let raw = {};
  if (Array.isArray(window.__LESSONS__) && typeof window.__COURSE__ === 'object' && window.__COURSE__ !== null) {
    raw = { course: window.__COURSE__, lessons: window.__LESSONS__.slice().sort((a,b)=> String(a.id).localeCompare(String(b.id))) };
  } else if (typeof window.__COOLTEACH_DATA__ === 'object' && window.__COOLTEACH_DATA__ !== null) {
    raw = window.__COOLTEACH_DATA__;
  } else {
    try { raw = JSON.parse(document.getElementById('__COOLTEACH_DATA__').textContent.trim() || '{}'); } catch(e){ raw = {course:{}, lessons:[]}; }
  }
  const course = raw.course || {};
  const lessons = Array.isArray(raw.lessons) ? raw.lessons : [];
  const slug = course.slug || 'course';
  const lsKey = 'coolteach:' + slug;

  // --- tiny markdown fallback (only if bodyHtml missing) ---
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function mdInline(s){
    return String(s)
      .replace(/`([^`]+)`/g, (_,a)=>`<code>${escapeHtml(a)}</code>`)
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function normalizeMd(md){
    // handle double-escaped literal \n from buggy lesson files and normalize CRLF
    return String(md||'').replace(/\r\n/g,'\n').replace(/\\n/g,'\n');
  }
  function renderMarkdown(md){
    const src = normalizeMd(md);
    if(!src.trim()) return '';
    // prefer marked (bundled as assets/marked.min.js, file:// safe)
    if(typeof window.marked !== 'undefined'){
      try{
        if(typeof window.marked.parse === 'function') return window.marked.parse(src, { gfm:true, breaks:false });
        if(typeof window.marked === 'function') return window.marked(src);
      }catch(_){}
    }
    return tinyMd(src);
  }
  function tinyMd(md){
    if(!md) return '';
    let out = escapeHtml(md);
    const blocks=[];
    out = out.replace(/```(\w+)?\n([\s\S]*?)```/g, (_,lang,code)=>{
      const i=blocks.length; blocks.push(`<pre><code>${escapeHtml(code.trim())}</code></pre>`); return `@@BLOCK${i}@@`;
    });
    out = out.replace(/^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/gm, (_,head,sep,body)=>{
      const ths=head.split('|').filter(Boolean).map(s=>`<th>${mdInline(s.trim())}</th>`).join('');
      const trs=body.trim().split('\n').map(r=>{
        const tds=r.split('|').filter(Boolean).map(s=>`<td>${mdInline(s.trim())}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    });
    out = out.replace(/^\s*---\s*$/gm, '<hr>');
    out = out.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^&gt;\s*(.+)$/gm, '<blockquote>$1</blockquote>');
    out = out.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
    out = out.replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>');
    out = out.replace(/^(?:\d+\.\s+)(.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>.*<\/li>\n?)+/g, m=>`<ul>${m}</ul>`);
    out = out.split(/\n{2,}/).map(chunk=>{
      chunk=chunk.trim();
      if(!chunk) return '';
      if(/^<(h2|h3|blockquote|ul|table|pre|hr)/.test(chunk)) return chunk;
      if(/^@@BLOCK/.test(chunk)) return chunk;
      return `<p>${mdInline(chunk.replace(/\n/g,'<br>'))}</p>`;
    }).join('\n');
    blocks.forEach((b,i)=>{ out = out.replace(`@@BLOCK${i}@@`, b); });
    out = out.replace(/<h([23])>(.*?)<\/h\1>/g, (_,n,c)=>`<h${n}>${mdInline(c)}</h${n}>`);
    return out;
  }

  // --- state ---
  let state = {};
  try { state = JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch(_){ state={}; }
  if(!state.tasks) state.tasks = {};
  function saveState(){ try{ localStorage.setItem(lsKey, JSON.stringify(state)); }catch(_){} }

  // --- template version (must match skills/cool-teach/VERSION) ---
  var TEMPLATE_VERSION = '0.3.7';
  function checkVersion(){
    var meta = window.__COOLTEACH_META__ || {};
    var verEl = document.querySelector('[data-version]');
    if(!meta.templateVersion || meta.templateVersion !== TEMPLATE_VERSION){
      if(verEl){
        verEl.classList.add('version-mismatch');
        verEl.title = 'Template mismatch: preview v' + (meta.templateVersion || '?') + ' vs assets v' + TEMPLATE_VERSION + ' — regenerate preview';
      }
      try{ console.warn('[cool-teach] template version mismatch: preview v' + (meta.templateVersion || '?') + ' vs assets v' + TEMPLATE_VERSION + ' — regenerate preview.html'); }catch(_){}
    }
  }

  // --- i18n & theme (topbar icon buttons) ---
  const I18N = {
    zh: { lessons:'课程 · ', exercises:'练习', choice:'单选', multi:'多选', truefalse:'判断', short:'简答', steps:'实操', completed:'已完成', todo:'待完成', previous:'上一课', next:'下一课', check:'检查', checked:'已检查', reset:'重置', markDone:'标记完成', completedBtn:'已完成', trueLabel:'正确', falseLabel:'错误', shortPlaceholder:'请输入你的回答…', keywordsHint:'需包含关键词：', shortHint:'1–2 句话，纯文本。点击「检查」查看参考答案。', noTasks:'本课暂无练习。', pickOne:'请先选择一个选项', selectSome:'请至少选择一项', pickTF:'请选择「正确」或「错误」', inputAnswer:'请输入回答', checkSteps:'请勾选你已完成的步骤', langTitle:'语言', themeTitle:'切换深色/浅色', empty:'还没有课时。运行 <code>/cool-teach add-lesson '+(slug||'&lt;slug&gt;')+'</code> 创建第一课。' },
    en: { lessons:'Lessons · ', exercises:'EXERCISES', choice:'CHOICE', multi:'MULTI', truefalse:'TRUE / FALSE', short:'SHORT', steps:'STEPS', completed:'Completed', todo:'To do', previous:'Previous', next:'Next', check:'Check', checked:'Checked', reset:'Reset', markDone:'Mark done', completedBtn:'Completed', trueLabel:'True', falseLabel:'False', shortPlaceholder:'Type your answer…', keywordsHint:'Required keywords: ', shortHint:'1–2 sentences, plain text. Press Check to see example answer.', noTasks:'No tasks for this lesson.', pickOne:'Pick an option first', selectSome:'Select at least one', pickTF:'Pick True or False', inputAnswer:'Please enter your answer', checkSteps:'Check the steps you completed', langTitle:'Language', themeTitle:'Toggle dark/light', empty:'No lessons yet. Run <code>/cool-teach add-lesson '+(slug||'&lt;slug&gt;')+'</code> to create one.' }
  };
  let lang = 'en';
  try{ const v=localStorage.getItem('coolteach:lang'); if(v==='en'||v==='zh') lang=v; }catch(_){}
  let theme = 'dark';
  try{ const v=localStorage.getItem('coolteach:theme'); if(v==='light'||v==='dark') theme=v; }catch(_){}
  function tr(k){ return (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k; }
  function syncControls(){
    var langBtn = document.getElementById('langBtn');
    if(langBtn) langBtn.title = tr('langTitle');
    var themeBtn = document.getElementById('themeBtn');
    if(themeBtn){ themeBtn.title = tr('themeTitle'); themeBtn.setAttribute('aria-pressed', String(theme==='dark')); }
    document.querySelectorAll('#langMenu [data-lang]').forEach(function(b){
      var isActive = b.getAttribute('data-lang')===lang;
      b.classList.toggle('active', isActive);
      b.setAttribute('aria-checked', String(isActive));
    });
  }
  function closeLangMenu(){
    var menu = document.getElementById('langMenu');
    var btn = document.getElementById('langBtn');
    if(menu) menu.hidden = true;
    if(btn) btn.setAttribute('aria-expanded', 'false');
  }
  function applyTheme(th){
    theme = th==='light' ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', theme==='dark');
    document.documentElement.setAttribute('data-theme', theme);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if(metaTheme) metaTheme.setAttribute('content', theme==='dark' ? '#020420' : '#ffffff');
    const metaScheme = document.querySelector('meta[name="color-scheme"]');
    if(metaScheme) metaScheme.setAttribute('content', theme);
    try{ localStorage.setItem('coolteach:theme', theme); }catch(_){}
    syncControls();
  }
  function applyLang(l){
    lang = l==='en' ? 'en' : 'zh';
    document.documentElement.lang = lang==='en' ? 'en' : 'zh-CN';
    try{ localStorage.setItem('coolteach:lang', lang); }catch(_){}
    syncControls();
    // re-render dynamic UI if lessons loaded
    if(lessons.length){
      renderNav();
      renderMain();
      updateProgress();
    } else if(main){
      main.innerHTML = `<div class="empty">${tr('empty')}</div>`;
    }
  }
  // init theme/lang before rendering
  applyTheme(theme);
  syncControls();
  var _langBtn = document.getElementById('langBtn');
  var _langMenu = document.getElementById('langMenu');
  var _themeBtn = document.getElementById('themeBtn');
  if(_langBtn && _langMenu){
    _langBtn.addEventListener('click', function(e){
      e.stopPropagation();
      var open = _langMenu.hidden;
      _langMenu.hidden = !open;
      _langBtn.setAttribute('aria-expanded', String(open));
    });
    _langMenu.querySelectorAll('[data-lang]').forEach(function(b){
      b.addEventListener('click', function(){
        applyLang(b.getAttribute('data-lang'));
        closeLangMenu();
      });
    });
    document.addEventListener('click', function(e){
      if(!_langMenu.hidden && !_langMenu.contains(e.target) && e.target !== _langBtn && !_langBtn.contains(e.target)) closeLangMenu();
    });
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeLangMenu();
    });
  }
  if(_themeBtn){
    _themeBtn.addEventListener('click', function(){
      applyTheme(theme==='dark' ? 'light' : 'dark');
    });
  }
  checkVersion();

  // --- header (pen nLXlf: title + desc) ---
  const titleEl = $('#courseTitle');
  const descEl = $('#courseDesc');
  const kickerEl = $('#heroKicker');
  if(titleEl) titleEl.textContent = course.title || 'Untitled Course';
  if(descEl) descEl.textContent = course.description || '';
  if(kickerEl){
    const n = Array.isArray(lessons) ? lessons.length : 0;
    const label = n ? (lang==='en' ? `Course · ${n} lessons` : `课程 · ${n} 课时`) : (lang==='en' ? 'Course' : '课程');
    kickerEl.textContent = label;
  }
  document.title = (course.title ? course.title + ' — ' : '') + 'CoolTeach';

  // sync initial html lang
  document.documentElement.lang = lang==='en' ? 'en' : 'zh-CN';
  // --- nav / main ---
  const navList = $('#navList');
  const main = $('#main');
  if(!lessons.length){
    if(main) main.innerHTML = `<div class="empty">${tr('empty')}</div>`;
  }

  function taskCounts(){
    let total=0, done=0;
    lessons.forEach(l=> (l.tasks||[]).forEach(t=>{
      total++;
      const s=state.tasks[t.id];
      if(s && s.answered) done++;
    }));
    return {total, done};
  }
  function updateProgress(){
    const {total, done} = taskCounts();
    const legacyText = $('#progressText');
    const legacyFill = $('#progressFill');
    const countEl = $('#lessonCount');
    if(legacyText) legacyText.textContent = done + ' / ' + total;
    if(legacyFill) legacyFill.style.width = (total ? Math.round(done/total*100) : 0) + '%';
    if(countEl) countEl.textContent = tr('lessons') + lessons.length;
  }

  function lessonDone(lesson){
    const tasks = lesson.tasks || [];
    if(!tasks.length) return false;
    return tasks.every(t=> state.tasks[t.id]?.answered);
  }

  // single-lesson switching — only one lesson visible at a time
  let activeIdx = 0;
  (function initActive(){
    // honour hash like #lesson-0001
    const h = (location.hash||'').replace(/^#/,'');
    if(h){
      const m = h.match(/^lesson-(.+)$/);
      if(m){
        const id = m[1];
        const found = lessons.findIndex(l=> String(l.id)===id);
        if(found>=0) activeIdx = found;
      }
    }
    if(activeIdx<0 || activeIdx>=lessons.length) activeIdx = 0;
  })();

  function renderNav(){
    if(!navList) return;
    navList.innerHTML = lessons.map((l,idx)=>{
      const lid = l.id || String(idx+1).padStart(4,'0');
      const done = lessonDone(l);
      const isActive = idx===activeIdx;
      return `<a class="nav-card ${isActive?'active':''} ${done?'done':''}" href="#lesson-${escapeHtml(lid)}" data-idx="${idx}">
        <div class="nav-card-info">
          <span class="nav-card-title">${escapeHtml(l.title||'Lesson '+(idx+1))}</span>
          <span class="nav-card-summary">${escapeHtml(l.summary||'')}</span>
          <span class="nav-card-status">
            <span class="nav-card-dot ${done?'done':'todo'}"></span>
            <span class="nav-card-label ${done?'done':'todo'}">${done?tr('completed'):tr('todo')}</span>
          </span>
        </div>
      </a>`;
    }).join('');
  }

  function renderMain(){
    if(!main) return;
    if(!lessons.length){
      main.innerHTML = `<div class="empty">${tr('empty')}</div>`;
      return;
    }
    const idx = activeIdx;
    const l = lessons[idx];
    const lid = escapeHtml(l.id||String(idx+1).padStart(4,'0'));
    const title = escapeHtml(l.title||'Untitled');
    const summary = escapeHtml(l.summary||'');
    const bodyHtml = l.bodyHtml && String(l.bodyHtml).trim() ? l.bodyHtml : renderMarkdown(l.body||'');
    const tasks = Array.isArray(l.tasks) ? l.tasks : [];
    const hasTasks = tasks.length>0;
    const tasksHtml = hasTasks ? tasks.map(t=> renderTask(t)).join('') : `<div style="padding:12px 0;font-size:13px;color:var(--ui-text-muted)">${tr('noTasks')}</div>`;
    const prev = idx>0 ? lessons[idx-1] : null;
    const next = idx<lessons.length-1 ? lessons[idx+1] : null;
    const navHtml = (prev || next) ? `<div class="lesson-nav">
      ${prev ? `<a class="lesson-nav-card prev" href="#" data-nav="prev" data-idx="${idx-1}">
        <span class="lesson-nav-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></span>
        <span class="lesson-nav-text"><span class="lesson-nav-label">${tr('previous')}</span><span class="lesson-nav-title">${escapeHtml(prev.title||'Lesson')}</span></span>
      </a>` : `<span class="lesson-nav-card prev" style="visibility:hidden"></span>`}
      ${next ? `<a class="lesson-nav-card next" href="#" data-nav="next" data-idx="${idx+1}">
        <span class="lesson-nav-text"><span class="lesson-nav-label">${tr('next')}</span><span class="lesson-nav-title">${escapeHtml(next.title||'Lesson')}</span></span>
        <span class="lesson-nav-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg></span>
      </a>` : `<span class="lesson-nav-card next" style="visibility:hidden"></span>`}
    </div>` : '';
    main.innerHTML = `<section id="lesson-${lid}" class="lesson" data-lesson="${lid}">
      <div class="lesson-head">
        <h2 class="lesson-title">${title}</h2>
        ${summary?`<p class="lesson-summary">${summary}</p>`:''}
      </div>
      <div class="lesson-body"><div class="prose">${bodyHtml}</div></div>
      <div class="tasks">
        <div class="exercises-head"><span class="exercises-title">${tr('exercises')}</span></div>
        ${tasksHtml}
      </div>
      ${navHtml}
    </section>`;
    bindTaskEvents();
  }

  function switchLesson(idx){
    if(idx<0 || idx>=lessons.length) return;
    activeIdx = idx;
    // update hash without scrolling
    const lid = lessons[idx].id || String(idx+1).padStart(4,'0');
    try{ history.replaceState(null,'', '#lesson-'+lid); }catch(_){}
    renderNav();
    renderMain();
    updateProgress();
    window.scrollTo({top:0, behavior:'smooth'});
    bindNavEvents();
  }

  function bindNavEvents(){
    if(!navList) return;
    navList.querySelectorAll('.nav-card').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const idx = parseInt(a.getAttribute('data-idx'),10);
        if(!isNaN(idx)) switchLesson(idx);
      });
    });
    if(main){
      main.querySelectorAll('.lesson-nav-card[data-nav]').forEach(a=>{
        a.addEventListener('click', e=>{
          e.preventDefault();
          const idx = parseInt(a.getAttribute('data-idx'),10);
          if(!isNaN(idx)) switchLesson(idx);
        });
      });
    }
  }

  // render - matches pen nLXlf (single lesson)
  function render(){
    if(!lessons.length) return;
    updateProgress();
    renderNav();
    renderMain();
    updateProgress();
    bindNavEvents();
  }

  function validateTask(t){
    if(!t || typeof t !== 'object') return 'task is not an object';
    if(!t.id || typeof t.id !== 'string') return 'missing id';
    if(!t.type || !['choice','multi','truefalse','short','steps'].includes(t.type)) return 'invalid type: '+(t.type||'missing');
    if(!t.question || typeof t.question !== 'string') return 'missing question';
    if(typeof t.explain !== 'string') return 'missing explain';
    if(t.type==='choice'){
      if(!Array.isArray(t.options) || t.options.length<2 || t.options.length>6) return 'choice options must be 2-6';
      if(typeof t.answer !== 'number' || !Number.isInteger(t.answer) || t.answer<0 || t.answer>=t.options.length) return 'choice answer out of range';
    }
    if(t.type==='multi'){
      if(!Array.isArray(t.options) || t.options.length<3 || t.options.length>6) return 'multi options must be 3-6';
      if(!Array.isArray(t.answer) || !t.answer.length) return 'multi answer must be non-empty array';
      const uniq=[...new Set(t.answer)];
      if(uniq.length!==t.answer.length) return 'multi answer must be unique';
      if(uniq.some(v=> typeof v!=='number' || !Number.isInteger(v) || v<0 || v>=t.options.length)) return 'multi answer out of range';
      if(uniq.length<2) return 'multi must have at least 2 correct';
    }
    if(t.type==='truefalse'){
      if(typeof t.answer !== 'boolean') return 'truefalse answer must be boolean';
    }
    if(t.type==='short'){
      if(typeof t.answer !== 'string' || !t.answer.trim()) return 'short answer must be non-empty string';
      if(t.keywords !== undefined){
        if(!Array.isArray(t.keywords) || t.keywords.length<1 || t.keywords.length>5) return 'short keywords must be 1-5';
        if(t.keywords.some(k=> typeof k!=='string' || !k.trim())) return 'short keywords must be non-empty strings';
      }
    }
    if(t.type==='steps'){
      if(!Array.isArray(t.steps) || t.steps.length<2 || t.steps.length>6) return 'steps must be 2-6';
      for(const s of t.steps){ if(!s || typeof s.text!=='string' || typeof s.check!=='string') return 'steps items must have text and check'; }
    }
    return null;
  }

  function renderTask(task){
    const err = validateTask(task);
    if(err){
      return `<div class="task" data-task="${escapeHtml(String(task.id||'unknown'))}">
        <div class="task-head"><span class="task-badge badge-error">Error</span><div class="task-q"><p>${escapeHtml(task.question||'Invalid task')}</p></div></div>
        <div class="task-body"><div class="inline-error">Invalid task: ${escapeHtml(err)} — This card is shown to avoid a full-page crash. Fix the JSON in <code>lessons/*.js</code> and regenerate preview.</div></div>
      </div>`;
    }
    const typeLabel = {choice:tr('choice'), multi:tr('multi'), truefalse:tr('truefalse'), short:tr('short'), steps:tr('steps')}[task.type] || task.type;
    const badgeCls = {choice:'badge-choice', multi:'badge-multi', truefalse:'badge-truefalse', short:'badge-short', steps:'badge-steps'}[task.type] || 'badge-choice';
    const q = escapeHtml(task.question);
    const tid = escapeHtml(task.id);
    let body='';
    const saved = state.tasks[task.id] || {};

    if(task.type==='choice'){
      const opts = task.options.map((o,i)=>{
        const sel = saved.selected===i ? 'selected' : '';
        const checked = saved.selected===i ? 'checked' : '';
        let extra='' ;
        if(saved.answered){
          if(i===task.answer) extra=' correct';
          else if(i===saved.selected) extra=' wrong';
        }
        return `<label class="opt ${sel}${extra}" data-idx="${i}">
          <input type="radio" name="task-${tid}" value="${i}" ${checked} ${saved.answered?'disabled':''} />
          <span>${escapeHtml(String(o))}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="choice">${opts}</div>`;
    } else if(task.type==='multi'){
      const selArr = Array.isArray(saved.selected) ? saved.selected : [];
      const opts = task.options.map((o,i)=>{
        const isSel = selArr.includes(i);
        let extra='';
        if(saved.answered){
          const isCorrect = task.answer.includes(i);
          if(isCorrect) extra=' correct';
          else if(isSel) extra=' wrong';
        }
        return `<label class="opt ${isSel?'selected':''}${extra}" data-idx="${i}">
          <input type="checkbox" name="task-${tid}" value="${i}" ${isSel?'checked':''} ${saved.answered?'disabled':''} />
          <span>${escapeHtml(String(o))}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="multi">${opts}</div>`;
    } else if(task.type==='truefalse'){
      const sel = saved.selected;
      const tfOpts = [
        {label:tr('trueLabel'), value:true},
        {label:tr('falseLabel'), value:false}
      ].map(o=>{
        const isSel = sel===o.value;
        let extra='';
        if(saved.answered){
          if(o.value===task.answer) extra=' correct';
          else if(isSel) extra=' wrong';
        }
        return `<label class="opt ${isSel?'selected':''}${extra}" data-val="${o.value}">
          <input type="radio" name="task-${tid}" value="${String(o.value)}" ${isSel?'checked':''} ${saved.answered?'disabled':''} />
          <span>${o.label}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="truefalse">${tfOpts}</div>`;
    } else if(task.type==='short'){
      const val = typeof saved.selected === 'string' ? saved.selected : '';
      const disabled = saved.answered ? 'disabled' : '';
      body=`<div class="short-wrap" data-type="short">
        <textarea class="short-input" placeholder="${escapeHtml(tr('shortPlaceholder'))}" ${disabled}>${escapeHtml(val)}</textarea>
        ${task.keywords && task.keywords.length ? `<div class="short-hint">${tr('keywordsHint')}${task.keywords.map(k=>'<code>'+escapeHtml(k)+'</code>').join('、')}</div>` : `<div class="short-hint">${tr('shortHint')}</div>`}
      </div>`;
    } else if(task.type==='steps'){
      const checks = Array.isArray(saved.selected) ? saved.selected : [];
      const stepsHtml = task.steps.map((s,i)=>{
        const ck = checks.includes(i);
        return `<label class="step ${ck?'checked':''}">
          <input type="checkbox" data-step="${i}" ${ck?'checked':''} />
          <span><span>${escapeHtml(s.text)}</span><small>✓ ${escapeHtml(s.check)}</small></span>
        </label>`;
      }).join('');
      body=`<ul class="steps-list" data-type="steps">${stepsHtml}</ul>`;
    }

    const isCorrect = saved.answered ? !!saved.correct : false;
    const showFeedback = saved.answered ? 'show' : '';
    const fbCls = saved.answered ? (isCorrect ? 'correct' : 'wrong') : '';
    const explain = escapeHtml(task.explain||'');

    const actionLabel = task.type==='steps' ? (saved.answered && isCorrect ? tr('completedBtn') : tr('markDone')) : (saved.answered ? tr('checked') : tr('check'));
    const actionAttr = task.type==='steps' ? 'check-steps' : 'check';
    return `<div class="task" data-task="${tid}" data-type="${escapeHtml(task.type)}">
      <div class="task-head"><span class="task-badge ${badgeCls}">${typeLabel}</span><div class="task-q"><p>${q}</p></div></div>
      <div class="task-body">
        ${body}
        <div class="task-actions">
          <button class="btn btn-primary" data-action="${actionAttr}" ${saved.answered && task.type!=='steps'?'disabled':''}>${actionLabel}</button>
          <button class="btn btn-ghost" data-action="reset">${tr('reset')}</button>
        </div>
        <div class="feedback ${fbCls} ${showFeedback}" data-feedback>
          ${saved.answered?`${explain}`:''}
        </div>
      </div>
    </div>`;
  }

  function bindTaskEvents(){
    if(!main) return;
    main.querySelectorAll('.task').forEach(el=>{
      const tid = el.getAttribute('data-task');
      const type = el.getAttribute('data-type');
      el.querySelectorAll('.opt').forEach(opt=>{
        opt.addEventListener('click', e=>{
          const s = state.tasks[tid];
          if(s && s.answered) return;
          setTimeout(()=>{
            el.querySelectorAll('.opt').forEach(o=>{
              const inp=o.querySelector('input');
              if(!inp) return;
              o.classList.toggle('selected', inp.checked);
            });
          },0);
        });
      });
      el.querySelectorAll('.step input[type="checkbox"]').forEach(inp=>{
        inp.addEventListener('change', ()=>{
          const row=inp.closest('.step');
          if(row) row.classList.toggle('checked', inp.checked);
        });
      });

      const btnCheck = el.querySelector('[data-action="check"],[data-action="check-steps"]');
      const btnReset = el.querySelector('[data-action="reset"]');
      const feedback = el.querySelector('[data-feedback]');

      if(btnCheck){
        btnCheck.addEventListener('click', ()=>{
          const task = lessons.flatMap(l=>l.tasks||[]).find(x=>x.id===tid);
          if(!task) return;
          const err=validateTask(task);
          if(err) return;
          let correct=false;
          let selected=null;

          if(type==='choice'){
            const checked = el.querySelector('input[type="radio"]:checked');
            if(!checked){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('pickOne')+'</b>'; return; }
            selected = parseInt(checked.value,10);
            correct = selected===task.answer;
          } else if(type==='multi'){
            const checks=[...el.querySelectorAll('input[type="checkbox"]:checked')].map(i=>parseInt(i.value,10)).sort((a,b)=>a-b);
            if(!checks.length){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('selectSome')+'</b>'; return; }
            selected = checks;
            const exp=[...task.answer].sort((a,b)=>a-b);
            correct = checks.length===exp.length && checks.every((v,i)=>v===exp[i]);
          } else if(type==='truefalse'){
            const checked = el.querySelector('input[type="radio"]:checked');
            if(!checked){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('pickTF')+'</b>'; return; }
            selected = checked.value==='true';
            correct = selected===task.answer;
          } else if(type==='short'){
            const inputEl = el.querySelector('.short-input');
            const val = inputEl ? inputEl.value.trim() : '';
            if(!val){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('inputAnswer')+'</b>'; return; }
            selected = val;
            if(task.keywords && task.keywords.length){
              const low = val.toLowerCase();
              const missing = task.keywords.filter(k=> !low.includes(k.toLowerCase()));
              correct = missing.length===0;
            } else {
              correct = true;
            }
          } else if(type==='steps'){
            const checks=[...el.querySelectorAll('.steps-list input[type="checkbox"]:checked')].map(i=>parseInt(i.getAttribute('data-step'),10)).sort((a,b)=>a-b);
            selected = checks;
            correct = checks.length===task.steps.length;
            if(!correct && checks.length===0){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('checkSteps')+'</b> — '+escapeHtml(task.explain); return; }
          }

          state.tasks[tid] = { answered:true, correct, selected, at: new Date().toISOString() };
          saveState();
          const fresh = document.createElement('div');
          fresh.innerHTML = renderTask(task);
          const newEl = fresh.firstElementChild;
          el.replaceWith(newEl);
          bindSingle(newEl, task);
          updateProgress();
          refreshNavDone();
        });
      }
      if(btnReset){
        btnReset.addEventListener('click', ()=>{
          delete state.tasks[tid];
          saveState();
          const task = lessons.flatMap(l=>l.tasks||[]).find(x=>x.id===tid);
          if(!task) return;
          const fresh=document.createElement('div'); fresh.innerHTML=renderTask(task);
          const newEl=fresh.firstElementChild;
          el.replaceWith(newEl);
          bindSingle(newEl, task);
          updateProgress();
          refreshNavDone();
        });
      }
    });
  }

  function refreshNavDone(){
    if(!navList) return;
    navList.querySelectorAll('.nav-card').forEach((a,i)=>{
      const l=lessons[i];
      const done = l && lessonDone(l);
      a.classList.toggle('done', !!done);
      const dot = a.querySelector('.nav-card-dot');
      const label = a.querySelector('.nav-card-label');
      if(dot) dot.className = 'nav-card-dot ' + (done?'done':'todo');
      if(label){ label.className = 'nav-card-label ' + (done?'done':'todo'); label.textContent = done?'Completed':'To do'; }
    });
  }

  function bindSingle(el, task){
    const tid=el.getAttribute('data-task');
    const type=el.getAttribute('data-type');
    el.querySelectorAll('.opt').forEach(opt=>{
      opt.addEventListener('click', ()=>{
        const s=state.tasks[tid]; if(s&&s.answered) return;
        setTimeout(()=>{
          el.querySelectorAll('.opt').forEach(o=>{
            const inp=o.querySelector('input'); if(!inp) return;
            o.classList.toggle('selected', inp.checked);
          });
        },0);
      });
    });
    el.querySelectorAll('.step input').forEach(inp=>{
      inp.addEventListener('change', ()=>{ const row=inp.closest('.step'); if(row) row.classList.toggle('checked', inp.checked); });
    });
    const btnCheck=el.querySelector('[data-action="check"],[data-action="check-steps"]');
    const btnReset=el.querySelector('[data-action="reset"]');
    const feedback=el.querySelector('[data-feedback]');
    if(btnCheck){
      btnCheck.addEventListener('click', ()=>{
        const err=validateTask(task); if(err) return;
        let correct=false, selected=null;
        if(type==='choice'){
          const c=el.querySelector('input[type="radio"]:checked'); if(!c){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('pickOne')+'</b>'; return; }
          selected=parseInt(c.value,10); correct=selected===task.answer;
        } else if(type==='multi'){
          const checks=[...el.querySelectorAll('input[type="checkbox"]:checked')].map(i=>parseInt(i.value,10)).sort((a,b)=>a-b);
          if(!checks.length){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('selectSome')+'</b>'; return; }
          selected=checks; const exp=[...task.answer].sort((a,b)=>a-b); correct=checks.length===exp.length && checks.every((v,i)=>v===exp[i]);
        } else if(type==='truefalse'){
          const c=el.querySelector('input[type="radio"]:checked'); if(!c){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('pickTF')+'</b>'; return; }
          selected=c.value==='true'; correct=selected===task.answer;
        } else if(type==='short'){
          const inputEl = el.querySelector('.short-input');
          const val = inputEl ? inputEl.value.trim() : '';
          if(!val){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('inputAnswer')+'</b>'; return; }
          selected=val;
          if(task.keywords && task.keywords.length){
            const low=val.toLowerCase();
            const missing=task.keywords.filter(k=> !low.includes(k.toLowerCase()));
            correct=missing.length===0;
          } else {
            correct=true;
          }
        } else if(type==='steps'){
          const checks=[...el.querySelectorAll('.steps-list input[type="checkbox"]:checked')].map(i=>parseInt(i.getAttribute('data-step'),10)).sort((a,b)=>a-b);
          selected=checks;
          correct=checks.length===task.steps.length;
          if(!correct && checks.length===0){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>'+tr('checkSteps')+'</b> — '+escapeHtml(task.explain); return; }
        }
        state.tasks[tid]={answered:true, correct, selected, at:new Date().toISOString()}; saveState();
        const fresh=document.createElement('div'); fresh.innerHTML=renderTask(task); const newEl=fresh.firstElementChild;
        el.replaceWith(newEl); bindSingle(newEl, task); updateProgress(); refreshNavDone();
      });
    }
    if(btnReset){
      btnReset.addEventListener('click', ()=>{
        delete state.tasks[tid]; saveState();
        const fresh=document.createElement('div'); fresh.innerHTML=renderTask(task); const newEl=fresh.firstElementChild;
        el.replaceWith(newEl); bindSingle(newEl, task); updateProgress(); refreshNavDone();
      });
    }
  }

  // scroll spy + card active state
  function updateActiveNav(){
    if(!main || !navList) return;
    const secs=[...main.querySelectorAll('.lesson')];
    const navItems=[...navList.querySelectorAll('.nav-card')];
    if(!secs.length) return;
    const onScroll=()=>{
      let idx=0;
      for(let i=0;i<secs.length;i++){
        const r=secs[i].getBoundingClientRect();
        if(r.top<=160) idx=i;
      }
      navItems.forEach((a,i)=> a.classList.toggle('active', i===idx));
    };
    document.addEventListener('scroll', onScroll, {passive:true});
    navList.addEventListener('click', e=>{
      const a=e.target.closest('.nav-card'); if(!a) return;
      e.preventDefault();
      const target=document.querySelector(a.getAttribute('href'));
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
    main.addEventListener('click', e=>{
      const a=e.target.closest('.lesson-nav-card'); if(!a) return;
      const href=a.getAttribute('href'); if(!href) return;
      e.preventDefault();
      const target=document.querySelector(href);
      if(target) target.scrollIntoView({behavior:'smooth', block:'start'});
    });
    onScroll();
  }

  render();
})();
