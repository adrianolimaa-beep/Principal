/* Stress x Recovery: source joins, strictly pre-game predictors and exploratory statistics. */
(function () {
  'use strict';
  const S = window.RecoveryStats, R = window.RECOVERY_DATA;
  if (!S || !R) return;
  const keys = ['totalDistance','sprintMeters','highIntensityMeters','accelerationsB23','decelerationsB23','fmpHighMin','rhieBouts','explosiveActions'];
  const labels = {totalDistance:'Distância total',sprintMeters:'Sprint',highIntensityMeters:'Alta intensidade',accelerationsB23:'Acelerações B2–3',decelerationsB23:'Desacelerações B2–3',fmpHighMin:'FMP High Dynamic',rhieBouts:'RHIE',explosiveActions:'Ações explosivas',gameScore:'Componente de jogo',score:'Índice físico completo'};
  const predictors = {sum4:'Carga total D−4 a D−1',ewma4:'EWMA4 até D−1',acute:'Aguda EWMA7 até D−1',chronic:'Crônica EWMA28 até D−1',ratio:'Aguda / crônica até D−1',d1:'Treino D_-1',d21:'Treino D_+2/-1',d0:'Carga D_0 (inclui jogo)'};
  const f = (x,d=2) => S.finite(x) ? x.toLocaleString('pt-BR',{maximumFractionDigits:d}) : '—';
  const esc = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const day = (d,n) => new Date(Date.parse(d+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
  const days = (a,b) => Math.round((Date.parse(a)-Date.parse(b))/86400000);
  const key = (id,date) => id+'|'+date;
  const opts = (o,v) => Object.entries(o).map(([k,l])=>`<option value="${esc(k)}" ${k===v?'selected':''}>${esc(l)}</option>`).join('');
  const table = (headers,rows) => `<div class="sr-scroll"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join('')}</tr>`).join(''):`<tr><td colspan="${headers.length}" class="sr-empty">Sem dados suficientes para os filtros escolhidos.</td></tr>`}</tbody></table></div>`;
  const panel = (title,body,note='') => `<section class="sr-panel"><h3>${title}</h3>${note?`<p class="sr-muted">${note}</p>`:''}${body}</section>`;
  const records = new Map(), daily = new Map(), gameMap = new Map(), ckMap = new Map(), cmjMap = new Map();
  for (const a of availability) {
    const k=key(a.athleteId,a.date); if(!records.has(k)) records.set(k,[]); records.get(k).push(a);
  }
  for (const e of events) gameMap.set(key(e.athleteId,e.date),e);
  for (const s of sessions.filter(s=>s.periodName==='session')) {
    const k=key(s.athleteId,s.date);
    if (!daily.has(k)) daily.set(k,{id:s.athleteId,date:s.date,minutes:0,...Object.fromEntries(keys.map(k=>[k,0]))});
    const row=daily.get(k); row.minutes+=s.minutes;
    for(const m of keys) row[m]=S.finite(row[m]) && S.finite(s[m]) ? row[m]+s[m] : null;
  }
  for(const r of R.ck) ckMap.set(key(r.id,r.gameDate),r);
  for(const r of R.cmj.filter(r=>r.gameDate&&!r.duplicate)) cmjMap.set(key(r.id,r.gameDate),r);
  const histories = new Map();
  for(const id of new Set(events.map(e=>e.athleteId))) {
    const ss=[...daily.values()].filter(r=>r.id===id).sort((a,b)=>a.date.localeCompare(b.date));
    if(!ss.length) continue;
    const end=events.filter(e=>e.athleteId===id).map(e=>e.date).sort().at(-1);
    const result=new Map(), current=Object.fromEntries(keys.map(k=>[k,{ewma4:null,acute:null,chronic:null}]));
    for(let d=ss[0].date;d<=end;d=day(d,1)) {
      const r=daily.get(key(id,d)), previous={};
      for(const m of keys) {
        // Match the legacy index convention: missing calendar days decay with zero.
        const load=r?.[m]??0;
        for(const [w,n] of Object.entries({ewma4:4,acute:7,chronic:28})) current[m][w]=current[m][w]===null?load:2/(n+1)*load+(1-2/(n+1))*current[m][w];
        previous[m]={...current[m],ratio:current[m].chronic>0?current[m].acute/current[m].chronic:null};
      }
      result.set(d,{metrics:previous,historyDays:days(d,ss[0].date)+1});
    }
    histories.set(id,result);
  }
  function training(id,date) {
    const k=key(id,date), r=daily.get(k), tags=records.get(k)||[];
    const rest=tags.some(t=>/FOLGA|DESCANSO/i.test(t.adv));
    // A janela e as EWMAs incluem a carga Session de treinos e jogos anteriores.
    return {row:r||null,known:!!r||rest||gameMap.has(k),tags};
  }
  function previousCMJ(id,date,metric) {
    const rows=R.cmj.filter(r=>r.id===id&&!r.duplicate&&r.date<date&&S.finite(r[metric])).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
    return rows.length>=3?S.mean(rows.map(r=>r[metric])):null;
  }
  const baseRows=events.map(e=>{
    const prev=events.filter(r=>r.athleteId===e.athleteId&&r.date<e.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
    const pre=[4,3,2,1].map(n=>training(e.athleteId,day(e.date,-n)));
    const h=histories.get(e.athleteId)?.get(day(e.date,-1));
    const birth=R.profiles[e.athleteId]?.birth;
    const groups=[...new Set((records.get(key(e.athleteId,e.date))||[]).filter(r=>r.dayCode==='D_0'&&['G1','G2','G3'].includes(r.group)).map(r=>r.group))];
    return {e,id:e.athleteId,date:e.date,age:birth?days(e.date,birth)/365.2425:null,gap:prev?days(e.date,prev.date):null,pre,h,groups,ck:ckMap.get(key(e.athleteId,e.date)),cmj:cmjMap.get(key(e.athleteId,e.date)),known:pre.filter(r=>r.known).length};
  });
  let config={start:'2026-01-01',end:meta.eventEnd,scope:'team',position:'all',group:'all',metric:'totalDistance',predictor:'sum4',outcome:'game',strict:false};
  let lastRows=[],lastPairs=[],signature='', demandCache=null,demandSig='';
  const root=document.getElementById('recoveryView');
  if(!root) return;
  root.innerHTML=`<div class="sr-hero"><div class="sr-eyebrow">Fortaleza EC · Fisiologia</div><h2>Estresse x Recuperação</h2><p>Como a carga anterior se relaciona com a resposta no jogo e com as avaliações posteriores de CK e CMJ?</p><div class="sr-flow"><span>01 · Preparação</span><span>02 · Resposta no jogo</span><span>03 · Recuperação</span></div></div>
    <div class="sr-controls"><label>De<input id="sr-start" type="date" value="${config.start}"></label><label>Até<input id="sr-end" type="date" value="${config.end}"></label><label>Participantes<select id="sr-scope">${opts({team:'Equipe',athlete:'Atleta selecionado na lateral'},config.scope)}</select></label><label>Posição<select id="sr-position">${opts({all:'Todas',...Object.fromEntries([...new Set(events.map(e=>e.position))].sort().map(p=>[p,p]))},config.position)}</select></label><label>Grupo no D_0<select id="sr-group">${opts({all:'Todos',G1:'G1',G2:'G2',G3:'G3'},config.group)}</select></label><label>Métrica de carga<select id="sr-metric">${opts(labels,config.metric)}</select></label><label>Carga anterior / D_0<select id="sr-predictor">${opts(predictors,config.predictor)}</select></label><label>Relação em detalhe<select id="sr-outcome">${opts({game:'Carga anterior → jogo',ck:'Jogo → CK (log)',jump:'Jogo → CMJ: altura',rsi:'Jogo → CMJ: RSI'},config.outcome)}</select></label><label>Cobertura dos 4 dias<select id="sr-strict"><option value="false">Mostrar todos (ausência = zero na soma)</option><option value="true">Somente 4 dias conhecidos</option></select></label></div>
    <p class="sr-muted">Os filtros laterais de minutos, dois tempos completos, atletas ativos e volume/densidade também se aplicam. A carga anterior usa sempre volume; densidade modifica a resposta do jogo e a comparação dos treinos.</p>
    <div class="sr-actions"><button id="sr-export">Exportar dados analisados (CSV)</button><span class="sr-status" id="sr-status"></span></div><div id="sr-results" aria-live="polite"></div>`;
  for(const name of Object.keys(config)) document.getElementById('sr-'+name).addEventListener('change',ev=>{config[name]=name==='strict'?ev.target.value==='true':ev.target.value;renderRecovery(true);});
  function metricValueFor(row,m) {
    if(!keys.includes(m)) return demandCache?.get(key(row.id,row.date))?.[m]??null;
    return state.loadMode==='density'?(row.e.minutes>0?row.e[m]/row.e.minutes:null):row.e[m];
  }
  function predictor(row,m,p) {
    if(!keys.includes(m)) return null;
    if(['ewma4','acute','chronic','ratio'].includes(p)) return row.h?.historyDays>=28?row.h.metrics[m][p]:null;
    if(p==='d0') {
      const current=training(row.id,row.date);
      return current.tags.some(r=>r.dayCode==='D_0')&&current.row&&S.finite(current.row[m])?current.row[m]:null;
    }
    let a=row.pre;
    if(p==='d1'||p==='d21') a=a.filter(t=>t.tags.some(r=>r.dayCode===(p==='d1'?'D_-1':'D_+2/-1')));
    if((p!=='sum4'&&!a.some(t=>t.row))||a.some(t=>t.row&&!S.finite(t.row[m]))) return null;
    return a.reduce((s,t)=>s+(t.row?.[m]||0),0);
  }
  function pairsFor(rows,m,p,outcome) {
    return rows.map(r=>{
      const measure=outcome==='game'?null:outcome==='ck'?r.ck:r.cmj;
      const post=measure?[...daily.values()].filter(s=>s.id===r.id&&s.date>r.date&&s.date<measure.date&&!gameMap.has(key(s.id,s.date))):[];
      const postLoad=keys.includes(m)?post.reduce((sum,s)=>sum+(s[m]||0),0):null;
      return {id:r.id,date:r.date,name:r.e.athlete,position:r.e.position,group:r.groups.join('/'),age:r.age,minutes:r.e.minutes,gap:r.gap,known:r.known,x:outcome==='game'?predictor(r,m,p):metricValueFor(r,m),y:outcome==='game'?metricValueFor(r,m):outcome==='ck'?(r.ck?.ck>0?Math.log(r.ck.ck):null):r.cmj?.[outcome]??null,hours:r.ck?.hours??null,post:postLoad};
    }).filter(r=>S.finite(r.x)&&S.finite(r.y));
  }
  function heat(r) {return S.finite(r)?`<span class="sr-cell" style="display:block;padding:6px;background:${r>=0?'rgba(10,127,137,':'rgba(190,106,37,'}${Math.abs(r)*.28+.04})">${f(r)}</span>`:'—';}
  function scatter(rows) {
    const a=S.within(rows); if(a.length<3) return '<p class="sr-empty">São necessárias observações repetidas para desenhar a relação.</p>';
    const xmin=Math.min(...a.map(r=>r.x)),xmax=Math.max(...a.map(r=>r.x)),ymin=Math.min(...a.map(r=>r.y)),ymax=Math.max(...a.map(r=>r.y));
    const x=v=>60+(v-xmin)/(xmax-xmin||1)*650,y=v=>275-(v-ymin)/(ymax-ymin||1)*240;
    return `<svg viewBox="0 0 760 330" role="img" aria-label="Dispersão da carga e resposta centralizadas pela média do atleta"><path d="M60 30V275H715" stroke="#b7c8d4" fill="none"/>${[0,.25,.5,.75,1].map(t=>`<text x="50" y="${275-t*240}" text-anchor="end" font-size="11" fill="#536a7c">${f(ymin+t*(ymax-ymin),1)}</text><text x="${60+t*650}" y="295" text-anchor="middle" font-size="11" fill="#536a7c">${f(xmin+t*(xmax-xmin),1)}</text>`).join('')}${a.map(r=>`<circle cx="${x(r.x)}" cy="${y(r.y)}" r="4" fill="#137a8b" opacity=".55"><title>${esc(r.name)} · ${r.date}: ${f(r.x)} / ${f(r.y)}</title></circle>`).join('')}<text x="380" y="323" text-anchor="middle" font-size="12">Carga: desvio da média individual</text></svg>`;
  }
  function comparison(rows,m) {
    if(!keys.includes(m)) return '<p class="sr-empty">Selecione uma das oito métricas para comparar os treinos.</p>';
    const ids=new Set(rows.map(r=>r.id));
    const tagged=[...daily.values()].filter(r=>ids.has(r.id)&&r.date>=config.start&&r.date<=config.end&&!gameMap.has(key(r.id,r.date))).flatMap(r=>{
      const dayRecords=records.get(key(r.id,r.date))||[];
      if(config.group!=='all'&&!dayRecords.some(t=>t.group===config.group)) return [];
      const tags=[...new Set(dayRecords.map(t=>t.dayCode).filter(t=>['D_-1','D_+2/-1'].includes(t)))];
      return tags.length===1&&S.finite(r[m])?[{id:r.id,tag:tags[0],y:state.loadMode==='density'?(r.minutes>0?r[m]/r.minutes:null):r[m]}].filter(r=>S.finite(r.y)):[];
    });
    const p=S.paired(tagged);
    return table(['Atletas pareados','Média D_-1','Média D_+2/-1','Diferença (D_+2/-1 − D_-1)','IC 95% da diferença','Efeito dz'],p.n?[[p.n,f(p.a),f(p.b),f(p.difference),p.ci?p.ci.map(x=>f(x)).join(' a '):'Amostra insuficiente',f(p.dz)]]:[])+`<p class="sr-muted">${tagged.length} sessões no período. Primeiro é calculada a média de cada tag por atleta; depois, a diferença pareada entre essas médias. dz = média das diferenças / desvio-padrão das diferenças. A comparação é descritiva, sem ajuste pelo calendário.</p>`;
  }
  function ageAnalysis(pairs) {
    const aggregated=S.groups(pairs).map(g=>({id:g[0].id,position:g[0].position,x:S.mean(g.map(r=>r.age).filter(S.finite)),y:S.mean(g.map(r=>r.y)),minutes:S.mean(g.map(r=>r.minutes)),gap:S.mean(g.map(r=>r.gap).filter(S.finite))})).filter(r=>S.finite(r.x)&&S.finite(r.y));
    const positions=[...new Set(aggregated.map(r=>r.position))].sort();
    const covs=['minutes','gap',...positions.slice(1).map((p,i)=>'pos'+i)];
    for(const r of aggregated) positions.slice(1).forEach((p,i)=>r['pos'+i]=r.position===p?1:0);
    const result=S.model(aggregated,covs,true);
    return table(['Atletas','Correlação entre médias','Diferença ajustada por +1 ano de idade'],aggregated.length?[[aggregated.length,f(S.corr(aggregated)),result?f(result.effect/result.sx):'Amostra insuficiente / ajuste singular']]:[])+`<p class="sr-muted">Uma observação por atleta; idade e resposta médias dos jogos incluídos. Ajuste por posição, minutos e intervalo entre jogos. Associação entre pessoas, sem inferir efeito do envelhecimento; pode refletir diferenças de função e seleção. Sem intervalo inferencial para este ajuste exploratório.</p>`;
  }
  function trajectory(rows,m) {
    const selected=rows.filter(r=>r.id===state.athleteId).sort((a,b)=>a.date.localeCompare(b.date));
    const vals=selected.map(r=>metricValueFor(r,m)).filter(S.finite),mean=S.mean(vals),sd=S.sd(vals);
    return `<p class="sr-muted">Atleta da lateral · média ${f(mean)} · CV ${mean>0&&S.finite(sd)?f(sd/mean*100)+'%':'—'}. Variação contra a média dos jogos filtrados.</p>`+table(['Jogo','Resposta','Δ média individual','Carga total 4 dias','Dias conhecidos','Índice físico','CK (28–52h)','CMJ altura / Δ histórico','CMJ RSI / Δ histórico'],selected.map(r=>{
      const value=metricValueFor(r,m), cmj=r.cmj;
      const cmjCell=k=>{const v=cmj?.[k],ref=cmj?previousCMJ(r.id,cmj.date,k):null;return `${f(v)} / ${ref>0&&S.finite(v)?f((v/ref-1)*100)+'%':'—'}`;};
      return [r.date,f(value),mean>0&&S.finite(value)?f((value/mean-1)*100)+'%':'—',f(predictor(r,m,'sum4')),r.known+'/4',f(demandCache?.get(key(r.id,r.date))?.score),r.ck?`${f(r.ck.ck)} (${f(r.ck.hours)}h)`:'—',cmjCell('jump'),cmjCell('rsi')];
    }));
  }
  function interpretation(model,mci,r,ci) {
    const relation=config.outcome==='game'?`${predictors[config.predictor]} e ${labels[config.metric]}`:`${labels[config.metric]} do jogo e ${{ck:'CK entre 28–52h',jump:'altura do CMJ D+2',rsi:'RSI do CMJ D+2'}[config.outcome]}`;
    const context=`Recorte: ${config.group==='all'?'todos os grupos':config.group}, ${config.position==='all'?'todas as posições':config.position}.`;
    if(config.outcome==='game'&&config.predictor==='d0') return `<div class="sr-interpretation caution"><strong>Interpretação automática</strong><p>A relação entre carga D_0 e a carga do jogo não deve ser interpretada como efeito preparatório: a carga Session de D_0 contém o próprio jogo. Uma correlação alta neste caso é, em grande parte, estrutural. Para examinar a recuperação, selecione CK ou CMJ; nesses desfechos, a exposição passa a ser a carga consolidada do jogo.</p><span>${context}</span></div>`;
    if(!model||!mci) return `<div class="sr-interpretation neutral"><strong>Interpretação automática</strong><p>A amostra não permite estimar com estabilidade a associação ajustada entre ${esc(relation)}.</p><span>${context}</span></div>`;
    const clear=mci[0]>0||mci[1]<0, positive=model.effect>0;
    let direction=positive?'aumento':'redução', magnitude=f(Math.abs(model.effect)), interval=mci.map(v=>f(v)).join(' a '), unit='unidades do desfecho';
    if(config.outcome==='ck') {magnitude=f(Math.abs(Math.expm1(model.effect)*100),1)+'%';interval=mci.map(v=>f(Math.expm1(v)*100,1)+'%').join(' a ');unit='na CK';}
    if(config.outcome==='jump') unit='cm na altura do salto';
    if(config.outcome==='rsi') unit='m/s no RSI-modified';
    if(config.outcome==='game') unit=`em ${labels[config.metric]}`;
    const result=clear?`Houve associação significativa pelo critério exploratório do IC 95% entre ${esc(relation)}. Um aumento de 1 desvio-padrão na carga esteve associado a ${direction} de ${magnitude} ${unit} (IC 95%: ${interval}).`:`Não houve associação significativa entre ${esc(relation)}: o intervalo de confiança incluiu zero. A estimativa apontou ${direction} de ${magnitude} ${unit}, mas permanece inconclusiva (IC 95%: ${interval}).`;
    const corr=S.finite(r)?` A correlação dentro do atleta foi r = ${f(r)}${ci?` (IC 95%: ${ci.map(v=>f(v)).join(' a ')})`:''}.`:'';
    return `<div class="sr-interpretation ${clear?'clear':'neutral'}"><strong>Interpretação automática</strong><p>${result}${corr}</p><span>${context} Resultado associativo e exploratório; não demonstra causalidade e não foi corrigido pelas múltiplas métricas examinadas.</span></div>`;
  }
  function renderRecovery(force=false) {
    root.classList.toggle('active',state.view==='recovery');
    if(state.view!=='recovery') return;
    const sig=JSON.stringify([config,state.minMinutes,state.completeOnly,state.activeOnly,state.loadMode,state.athleteId]);
    if(!force&&sig===signature) return; signature=sig;
    const ds=JSON.stringify([state.minMinutes,state.completeOnly,state.activeOnly,state.loadMode]);
    if(ds!==demandSig){demandCache=new Map(buildDemandAnalysis().analyses.map(r=>[key(r.athleteId,r.date),r]));demandSig=ds;}
    const rows=baseRows.filter(r=>baseFilter(r.e)&&r.date>=config.start&&r.date<=config.end&&(config.scope==='team'||r.id===state.athleteId)&&(config.position==='all'||r.e.position===config.position)&&(config.group==='all'||r.groups.includes(config.group))&&(!config.strict||r.known===4));
    lastRows=rows;
    const pairs=pairsFor(rows,config.metric,config.predictor,config.outcome);lastPairs=pairs;
    const repeated=S.within(pairs), nAth=S.groups(repeated).length;
    const r=S.rm(pairs),ci=S.bootstrap(pairs,S.rm,400);
    const covs=config.outcome==='game'?['minutes','gap']:config.outcome==='ck'?['minutes','hours','post']:['minutes','post'];
    const model=S.model(pairs,covs), mci=model?S.bootstrap(pairs,x=>S.model(x,covs)?.effect,400):null;
    const kpi=(title,value,sub)=>`<div class="sr-kpi"><span>${title}</span><strong>${value}</strong><span>${sub}</span></div>`;
    let html=`<div class="sr-kpis">${kpi('Atleta × jogo',rows.length,`${new Set(rows.map(r=>r.id)).size} atletas · ${new Set(rows.map(r=>r.date)).size} datas`)}${kpi('CK vinculada',rows.filter(r=>r.ck).length,'PÓS de 28 a 52 horas, inclusive')}${kpi('CMJ D+2 vinculado',rows.filter(r=>r.cmj).length,'Altura e RSI, conforme disponibilidade')}${kpi('4 dias conhecidos',rows.filter(r=>r.known===4).length,'Sessão, jogo ou folga registrada')}</div>`;
    if(config.start>config.end) html+='<div class="sr-note">O início do período deve ser anterior ao fim.</div>';
    html+=`<div class="sr-note">Leitura exploratória: associações não demonstram causa ou recuperação insuficiente. Dias sem sessão entram como zero na EWMA, conforme a convenção do índice existente; as somas de treino também usam zero para ausências, salvo o filtro de 4 dias conhecidos. EWMA exige ao menos 28 dias desde o primeiro registro, o que não garante 28 dias completos de medição.</div>`;
    if(!keys.includes(config.metric)) html+='<div class="sr-note">O índice completo mantém a fórmula existente: 60% jogo + 20% EWMA4 + 20% aguda/crônica, com a carga na data do jogo. Sua associação com os próprios componentes não é estimada aqui. Para carga anterior → jogo, selecione uma das oito métricas; os índices aparecem na evolução individual e podem ser relacionados às avaliações posteriores.</div>';
    html+=panel('Carga anterior × resposta no jogo',table(['Métrica',...Object.values(predictors)],keys.map(m=>[labels[m],...Object.keys(predictors).map(p=>{const a=pairsFor(rows,m,p,'game');const w=S.within(a);return `<div title="${w.length} observações repetidas · ${S.groups(w).length} atletas">${heat(S.rm(a))}<small>${w.length} obs. / ${S.groups(w).length} atl.</small></div>`;})])), 'Correlação dentro do atleta: cada medida é centralizada na média individual. Cada coluna usa um modelo de carga separado. A carga total e as EWMAs incluem treinos e jogos anteriores; D_-1 e D_+2/-1 representam sessões tagueadas. Preditores em volume; métricas do jogo respeitam volume/densidade.');
    html+=panel('Relação selecionada',`<p><strong>${esc(config.outcome==='game'?predictors[config.predictor]+' → '+labels[config.metric]:labels[config.metric]+' → '+({ck:'log(CK)',jump:'altura do CMJ',rsi:'RSI do CMJ'}[config.outcome]))}</strong></p>`+table(['Observações repetidas','Atletas','r dentro do atleta','IC 95% por atleta'],[[repeated.length,nAth,f(r),ci?ci.map(x=>f(x)).join(' a '):'Não estimado (<6 atletas ou sem variabilidade)']])+scatter(pairs)+`<p class="sr-muted">Os pontos mostram desvios das médias individuais. O coeficiente pressupõe uma inclinação linear comum. IC por reamostragem de atletas (400 repetições), sem tratar jogos do mesmo atleta como independentes. A dependência entre atletas na mesma partida permanece sem ajuste.</p>`);
    html+=panel('Carga e resposta: ajuste dentro do atleta',table(['Diferença por +1 DP de carga','IC 95%','R² dentro do atleta','Δ R² ao incluir carga','Observações / atletas'],model?[[f(model.effect),mci?mci.map(x=>f(x)).join(' a '):'Não estimado',f(model.r2),f(model.deltaR2),`${model.n} / ${model.athletes}`]]:[]),`Regressão com efeito fixo de atleta, após centralização individual. Ajustes: ${config.outcome==='game'?'minutos e intervalo entre jogos':config.outcome==='ck'?'minutos, horas PÓS e treino entre jogo e coleta':'minutos e treino entre jogo e avaliação'}. Covariáveis sem variação são omitidas; colinearidade impede a estimativa. Este é um modelo exploratório de efeitos fixos, não um modelo misto.`);
    if(config.outcome!=='game') html+='<p class="sr-note">A carga pós-jogo inclui apenas os dias estritamente entre jogo e avaliação. Sem horário do treino, o próprio dia da coleta fica fora para evitar incluir carga posterior. CK usa log natural; CMJ usa os valores consolidados da planilha, sem escolher uma tentativa. O horário do treino e a condição de avaliação antes/depois dele ainda não foram confirmados.</p>';
    html+=`<div class="sr-two">${panel('Idade e diferenças entre atletas',ageAnalysis(pairs))}${panel('D_-1 × D_+2/-1',comparison(rows,config.metric))}</div>`;
    html+=panel('Comportamento entre jogos · atleta selecionado',trajectory(rows,config.metric),'CMJ: variação relativa à média das últimas 5 avaliações anteriores (mínimo 3), excluindo duplicatas. Esse histórico não equivale a uma referência em condição recuperada.');
    html+=panel('Observação do recorte',interpretation(model,mci,r,ci),'Texto gerado a partir do modelo ajustado e do intervalo de confiança exibidos acima.');
    html+=panel('Qualidade dos dados e método',`<details><summary>Fontes, exclusões e limites da análise</summary><p>Base de jogos: ${esc(meta.generatedAt)}. Integração de recuperação: ${esc(R.generatedAt)}. Última leitura da CK: ${esc(R.ckFetchedAt)}.</p><p>${rows.filter(r=>r.known<4).length} jogos têm dias desconhecidos na janela anterior. ${rows.filter(r=>!r.h||r.h.historyDays<28).length} jogos não têm 28 dias de histórico para EWMA. Os filtros afetam as respostas; o histórico anterior permanece disponível fora do período selecionado.</p>${table(['Auditoria na fonte inteira (antes dos filtros)','Registros'],Object.entries(R.audit).map(([k,v])=>[esc(({ckUnmapped:'CK: atleta/data não identificado',ckAmbiguousOrNoGame:'CK: nenhum jogo ou vínculo ambíguo',ckMissingValue:'CK: valor ausente',ckOutsideWindow:'CK: fora de 28–52h ou PÓS ausente',ckDuplicateCollections:'CK: coletas duplicadas excluídas',ckLinked:'CK: vínculo único',cmjLinked:'CMJ: vínculo D+2',ckInvalidValue:'CK: valor inválido',ckOtherClub:'CK: outro clube',cmjUnmapped:'CMJ: atleta/data não identificado'})[k]||k),v]))}<p>CK: vínculo único por atleta com jogo de 1 a 3 dias de calendário antes da coleta, compatível com 28–52h sem horários completos. Não é validação pelo horário de início da partida. CMJ: tag D+2 e jogo exatamente 2 dias antes; múltiplos registros no dia são excluídos do vínculo.</p><p>Sessões Session compõem a carga diária, sem somar novamente os dois tempos. Na janela D−4 a D−1 e nas EWMAs, a carga Session inclui treinos e jogos anteriores. Na carga entre jogo e avaliação, apenas treinos são somados. Dias com jogo mas sem Session continuam conhecidos como jogo, porém sem carga imputada. D_+2/-1 mantém uma única carga diária.</p><p>As oito métricas são analisadas separadamente. Não há testes de significância, correção por multiplicidade ou conclusões confirmatórias. R² descreve ajuste na amostra, não capacidade preditiva. Idade e posição constantes não são estimadas no ajuste dentro do atleta. ANOVA não é aplicada a este painel desbalanceado.</p><p><a href="https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2017.00456/full" target="_blank" rel="noopener">Referência: Bakdash e Marusich — correlação para medidas repetidas</a>.</p><p>Atualização: use o botão Atualizar dados ao abrir pelo servidor local, ou execute ATUALIZAR_RECUPERACAO.ps1. A página lê a última base salva; não mantém conexão contínua com as fontes.</p>${R.warnings.map(w=>`<p class="sr-note">${esc(w)}</p>`).join('')}</details>`);
    if(R.sourceGeneratedAt!==meta.generatedAt) html='<div class="sr-note">A base de recuperação foi gerada com outra versão dos jogos. Atualize a integração antes de interpretar os vínculos.</div>'+html;
    document.getElementById('sr-results').innerHTML=html;
    document.getElementById('sr-status').textContent=`${labels[config.metric]} · ${config.group==='all'?'todos os grupos':config.group} · ${state.loadMode==='density'?'densidade por minuto':'volume'} · ${rows.length} jogos filtrados`;
  }
  document.getElementById('sr-export').addEventListener('click',()=>{
    const headers=['atleta_id','atleta','data_jogo','grupo_d0','metrica','relacao','preditor','modo_jogo','x','y','idade','minutos','intervalo_jogos','horas_ck','treino_entre_jogo_coleta','dias_conhecidos_4','ck','cmj_altura','cmj_rsi'];
    const cell=x=>'"'+String(x??'').replace(/^[=+@]/,"'").replaceAll('"','""')+'"';
    const csv=[headers,...lastPairs.map(r=>{const b=lastRows.find(x=>x.id===r.id&&x.date===r.date);return [r.id,r.name,r.date,r.group,config.metric,config.outcome,config.predictor,state.loadMode,r.x,r.y,r.age,r.minutes,r.gap,r.hours,r.post,r.known,b?.ck?.ck,b?.cmj?.jump,b?.cmj?.rsi];})].map(row=>row.map(cell).join(';')).join('\r\n');
    const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='estresse-recuperacao.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  window.renderRecovery=renderRecovery;
  window.RecoveryAnalysis={baseRows,predictor,pairsFor,training,histories,config,render:renderRecovery};
})();
