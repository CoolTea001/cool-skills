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
    out = out.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    out = out.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^#\s+(.+)$/gm, '<h2>$1</h2>');
    out = out.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>');
    out = out.replace(/<\/blockquote>\n<blockquote>/g, '<br>');
    out = out.replace(/^(?:- |\* )(.+)$/gm, '<li>$1</li>');
    out = out.replace(/^(?:\d+\.\s+)(.+)$/gm, '<li>$1</li>');
    out = out.replace(/(<li>.*<\/li>\n?)+/g, m=>`<ul>${m}</ul>`);
    out = out.split(/\n{2,}/).map(chunk=>{
      chunk=chunk.trim();
      if(!chunk) return '';
      if(/^<(h2|h3|blockquote|ul|table|pre)/.test(chunk)) return chunk;
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

  // --- header (pen nLXlf: title + desc) ---
  const titleEl = $('#courseTitle');
  const descEl = $('#courseDesc');
  if(titleEl) titleEl.textContent = course.title || 'Untitled Course';
  if(descEl) descEl.textContent = course.description || '';
  document.title = (course.title ? course.title + ' — ' : '') + 'CoolTeach';

  // --- nav / main ---
  const navList = $('#navList');
  const main = $('#main');
  if(!lessons.length){
    if(main) main.innerHTML = '<div class="empty">No lessons yet. Run <code>/cool-teach add-lesson '+(slug||'&lt;slug&gt;')+'</code> to create one.</div>';
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
    const inline = $('#progressInline');
    const countEl = $('#lessonCount');
    if(legacyText) legacyText.textContent = done + ' / ' + total;
    if(legacyFill) legacyFill.style.width = (total ? Math.round(done/total*100) : 0) + '%';
    if(inline) inline.textContent = done + ' / ' + total;
    if(countEl) countEl.textContent = 'Lessons · ' + lessons.length;
  }

  function lessonDone(lesson){
    const tasks = lesson.tasks || [];
    if(!tasks.length) return false;
    return tasks.every(t=> state.tasks[t.id]?.answered);
  }

  // render - matches pen nLXlf
  function render(){
    if(!lessons.length) return;
    // list head count
    updateProgress();
    // nav: pen-style cards with dot + Completed/To do
    if(navList){
      navList.innerHTML = lessons.map((l,idx)=>{
        const lid = l.id || String(idx+1).padStart(4,'0');
        const done = lessonDone(l);
        const isActive = idx===0; // first lesson active by default, scroll-spy will update
        return `<a class="nav-card ${isActive?'active':''} ${done?'done':''}" href="#lesson-${escapeHtml(lid)}" data-idx="${idx}">
          <div class="nav-card-info">
            <span class="nav-card-title">${escapeHtml(l.title||'Lesson '+(idx+1))}</span>
            <span class="nav-card-summary">${escapeHtml(l.summary||'')}</span>
            <span class="nav-card-status">
              <span class="nav-card-dot ${done?'done':'todo'}"></span>
              <span class="nav-card-label ${done?'done':'todo'}">${done?'Completed':'To do'}</span>
            </span>
          </div>
        </a>`;
      }).join('');
    }

    // lessons: each lesson as a transparent block with head + body + tasks + nav
    if(main){
      main.innerHTML = lessons.map((l,idx)=>{
        const lid = escapeHtml(l.id||String(idx+1).padStart(4,'0'));
        const lslug = escapeHtml(l.slug||'');
        const title = escapeHtml(l.title||'Untitled');
        const summary = escapeHtml(l.summary||'');
        const tags = Array.isArray(l.tags) ? l.tags : [];
        const bodyHtml = l.bodyHtml && String(l.bodyHtml).trim() ? l.bodyHtml : tinyMd(l.body||'');
        const tasks = Array.isArray(l.tasks) ? l.tasks : [];
        const hasTasks = tasks.length>0;
        const tasksHtml = hasTasks ? tasks.map(t=> renderTask(t)).join('') : '<div style="padding:12px 0;font-size:13px;color:var(--ui-text-muted)">No tasks for this lesson.</div>';
        // prev/next nav per pen
        const prev = idx>0 ? lessons[idx-1] : null;
        const next = idx<lessons.length-1 ? lessons[idx+1] : null;
        const navHtml = (prev || next) ? `<div class="lesson-nav">
          ${prev ? `<a class="lesson-nav-card prev" href="#lesson-${escapeHtml(prev.id||String(idx).padStart(4,'0'))}">
            <span class="lesson-nav-arrow"><span style="font-size:12px;color:var(--ui-text-muted)">←</span></span>
            <span class="lesson-nav-text"><span class="lesson-nav-label">Previous</span><span class="lesson-nav-title">${escapeHtml(prev.title||'Lesson')}</span></span>
          </a>` : `<span class="lesson-nav-card prev" style="visibility:hidden"></span>`}
          ${next ? `<a class="lesson-nav-card next" href="#lesson-${escapeHtml(next.id||String(idx+2).padStart(4,'0'))}">
            <span class="lesson-nav-text"><span class="lesson-nav-label">Next</span><span class="lesson-nav-title">${escapeHtml(next.title||'Lesson')}</span></span>
            <span class="lesson-nav-arrow"><span style="font-size:12px;color:#020420">→</span></span>
          </a>` : `<span class="lesson-nav-card next" style="visibility:hidden"></span>`}
        </div>` : '';
        return `<section id="lesson-${lid}" class="lesson" data-lesson="${lid}">
          <div class="lesson-head">
            <p class="lesson-kicker">Lesson ${lid} · ${lslug}</p>
            <h2 class="lesson-title">${title}</h2>
            ${summary?`<p class="lesson-summary">${summary}</p>`:''}
            ${tags.length?`<div class="lesson-tags">${tags.map(x=>`<span class="tag">${escapeHtml(String(x).trim())}</span>`).join('')}</div>`:''}
          </div>
          <div class="lesson-body"><div class="prose">${bodyHtml}</div></div>
          <div class="tasks">
            <div class="exercises-head"><span class="exercises-title">Exercises</span></div>
            ${tasksHtml}
          </div>
          ${navHtml}
        </section>`;
      }).join('');
    }

    bindTaskEvents();
    updateProgress();
    updateActiveNav();
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

  function renderTask(t){
    const err = validateTask(t);
    if(err){
      return `<div class="task" data-task="${escapeHtml(String(t.id||'unknown'))}">
        <div class="task-head"><span class="task-badge badge-error">Error</span><div class="task-q"><p>${escapeHtml(t.question||'Invalid task')}</p><div class="task-id">${escapeHtml(String(t.id||''))}</div></div></div>
        <div class="task-body"><div class="inline-error">Invalid task: ${escapeHtml(err)} — This card is shown to avoid a full-page crash. Fix the JSON in <code>lessons/*.js</code> and regenerate preview.</div></div>
      </div>`;
    }
    const typeLabel = {choice:'Choice', multi:'Multi', truefalse:'True / False', short:'SHORT', steps:'STEPS'}[t.type] || t.type;
    const badgeCls = {choice:'badge-choice', multi:'badge-multi', truefalse:'badge-truefalse', short:'badge-short', steps:'badge-steps'}[t.type] || 'badge-choice';
    const q = escapeHtml(t.question);
    const tid = escapeHtml(t.id);
    let body='';
    const saved = state.tasks[t.id] || {};

    if(t.type==='choice'){
      const opts = t.options.map((o,i)=>{
        const sel = saved.selected===i ? 'selected' : '';
        const checked = saved.selected===i ? 'checked' : '';
        let extra='' ;
        if(saved.answered){
          if(i===t.answer) extra=' correct';
          else if(i===saved.selected) extra=' wrong';
        }
        return `<label class="opt ${sel}${extra}" data-idx="${i}">
          <input type="radio" name="task-${tid}" value="${i}" ${checked} ${saved.answered?'disabled':''} />
          <span>${escapeHtml(String(o))}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="choice">${opts}</div>`;
    } else if(t.type==='multi'){
      const selArr = Array.isArray(saved.selected) ? saved.selected : [];
      const opts = t.options.map((o,i)=>{
        const isSel = selArr.includes(i);
        let extra='';
        if(saved.answered){
          const isCorrect = t.answer.includes(i);
          if(isCorrect) extra=' correct';
          else if(isSel) extra=' wrong';
        }
        return `<label class="opt ${isSel?'selected':''}${extra}" data-idx="${i}">
          <input type="checkbox" name="task-${tid}" value="${i}" ${isSel?'checked':''} ${saved.answered?'disabled':''} />
          <span>${escapeHtml(String(o))}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="multi">${opts}</div>`;
    } else if(t.type==='truefalse'){
      const sel = saved.selected;
      const tfOpts = [
        {label:'True', value:true},
        {label:'False', value:false}
      ].map(o=>{
        const isSel = sel===o.value;
        let extra='';
        if(saved.answered){
          if(o.value===t.answer) extra=' correct';
          else if(isSel) extra=' wrong';
        }
        return `<label class="opt ${isSel?'selected':''}${extra}" data-val="${o.value}">
          <input type="radio" name="task-${tid}" value="${String(o.value)}" ${isSel?'checked':''} ${saved.answered?'disabled':''} />
          <span>${o.label}</span>
        </label>`;
      }).join('');
      body=`<div class="options" data-type="truefalse">${tfOpts}</div>`;
    } else if(t.type==='short'){
      const val = typeof saved.selected === 'string' ? saved.selected : '';
      const disabled = saved.answered ? 'disabled' : '';
      body=`<div class="short-wrap" data-type="short">
        <textarea class="short-input" placeholder="Type your answer…  e.g. Intent × volume × difficulty that you can win." ${disabled}>${escapeHtml(val)}</textarea>
        ${t.keywords && t.keywords.length ? `<div class="short-hint">需包含关键词：${t.keywords.map(k=>'<code>'+escapeHtml(k)+'</code>').join('、')}</div>` : `<div class="short-hint">1–2 sentences, plain text. Press Check to see example answer.</div>`}
      </div>`;
    } else if(t.type==='steps'){
      const checks = Array.isArray(saved.selected) ? saved.selected : [];
      const stepsHtml = t.steps.map((s,i)=>{
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
    const fbText = saved.answered ? (isCorrect ? 'Correct' : 'Not quite') : '';
    const explain = escapeHtml(t.explain||'');

    const actionLabel = t.type==='steps' ? (saved.answered && isCorrect ? 'Completed' : 'Mark done') : (saved.answered ? 'Checked' : 'Check');
    const actionAttr = t.type==='steps' ? 'check-steps' : 'check';
    return `<div class="task" data-task="${tid}" data-type="${escapeHtml(t.type)}">
      <div class="task-head"><span class="task-badge ${badgeCls}">${typeLabel}</span><div class="task-q"><p>${q}</p><div class="task-id">${tid}</div></div></div>
      <div class="task-body">
        ${body}
        <div class="task-actions">
          <button class="btn btn-primary" data-action="${actionAttr}" ${saved.answered && t.type!=='steps'?'disabled':''}>${actionLabel}</button>
          <button class="btn btn-ghost" data-action="reset">Reset</button>
          ${t.type==='steps' && !saved.answered ? `<span style="font-size:11px;color:var(--color-green-400)">Check all to complete</span>` : ``}
        </div>
        <div class="feedback ${fbCls} ${showFeedback}" data-feedback>
          ${saved.answered?`<b>${fbText} — </b>${explain}`:''}
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
            if(!checked){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Pick an option first</b>'; return; }
            selected = parseInt(checked.value,10);
            correct = selected===task.answer;
          } else if(type==='multi'){
            const checks=[...el.querySelectorAll('input[type="checkbox"]:checked')].map(i=>parseInt(i.value,10)).sort((a,b)=>a-b);
            if(!checks.length){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Select at least one</b>'; return; }
            selected = checks;
            const exp=[...task.answer].sort((a,b)=>a-b);
            correct = checks.length===exp.length && checks.every((v,i)=>v===exp[i]);
          } else if(type==='truefalse'){
            const checked = el.querySelector('input[type="radio"]:checked');
            if(!checked){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Pick True or False</b>'; return; }
            selected = checked.value==='true';
            correct = selected===task.answer;
          } else if(type==='short'){
            const inputEl = el.querySelector('.short-input');
            const val = inputEl ? inputEl.value.trim() : '';
            if(!val){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>请输入回答</b>'; return; }
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
            if(!correct && checks.length===0){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Check the steps you completed</b> — '+escapeHtml(task.explain); return; }
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
          const c=el.querySelector('input[type="radio"]:checked'); if(!c){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Pick an option first</b>'; return; }
          selected=parseInt(c.value,10); correct=selected===task.answer;
        } else if(type==='multi'){
          const checks=[...el.querySelectorAll('input[type="checkbox"]:checked')].map(i=>parseInt(i.value,10)).sort((a,b)=>a-b);
          if(!checks.length){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Select at least one</b>'; return; }
          selected=checks; const exp=[...task.answer].sort((a,b)=>a-b); correct=checks.length===exp.length && checks.every((v,i)=>v===exp[i]);
        } else if(type==='truefalse'){
          const c=el.querySelector('input[type="radio"]:checked'); if(!c){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Pick True or False</b>'; return; }
          selected=c.value==='true'; correct=selected===task.answer;
        } else if(type==='short'){
          const inputEl = el.querySelector('.short-input');
          const val = inputEl ? inputEl.value.trim() : '';
          if(!val){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>请输入回答</b>'; return; }
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
          if(!correct && checks.length===0){ feedback.className='feedback wrong show'; feedback.innerHTML='<b>Check the steps you completed</b> — '+escapeHtml(task.explain); return; }
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
