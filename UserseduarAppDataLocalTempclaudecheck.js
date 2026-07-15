
const API='https://agile-spasso.mesaagro.workers.dev';
/* ajuste se o repositório de retrospectivas mudar de dono/nome */
const RETRO_OWNER='eduardopfranca';
const RETRO_REPO='agile_spasso';
const uid=()=>'x'+Math.random().toString(36).slice(2,9)+Date.now().toString(36);
function extractIdTs(id){const ms=parseInt((id||'').slice(8),36);return isNaN(ms)?0:ms;}

const VIEWS=[
  {id:'sprints',label:'Sprints'},
  {id:'backlog',label:'Backlog'},
  {id:'mapa',label:'Mapa da Planilha'},
  {id:'pending',label:'Itens Pendentes'},
  {id:'retro',label:'Retrospectivas'}
];

/* ---------- autor (nome no navegador) ---------- */
let author=localStorage.getItem('autor');
function ensureAuthor(){
  if(!author){
    author=(prompt('Seu nome (aparece nas notas e no rodapé de quem editou):')||'').trim()||'Anônimo';
    localStorage.setItem('autor',author);
  }
  return author;
}
ensureAuthor();
const esc=s=>(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const el=id=>document.getElementById(id);

/* ---------- default data ---------- */
function mkItems(arr){return arr.map(a=>({id:uid(),status:a[0],confirm:!!a[1],done:false,notes:[],text:a[2],sprintId:null,pendingResolved:false,urgency:'media'}));}
const DEFAULT_STATE={
  docTitle:'Documento de Desenvolvimento do Aplicativo',docSub:'Spasso',activeView:'sprints',
  footNote:'A sequência das seções reflete a dependência lógica entre as frentes, não a ordem de execução. No planejamento de sprints, frentes independentes — como Precificação e Fundação — podem avançar em paralelo.',
  sections:[
    {id:'sec-precificacao',title:'Precificação',subtitle:'Geração de preços — módulo independente, de valor imediato',
     intro:'Trabalho de valor imediato e baixo risco, em boa parte já pronto. A precificação é um contexto isolado: depende apenas de metodologia e de dados de mercado, sem relação com a gestão de posição.',
     items:mkItems([['A',0,'Limpeza visual do app: ocultar funções inativas e remover interface e código depreciados.'],['E',0,'Conferência da metodologia e do cálculo de preços: Long Basis, Target e NDF.'],['A',0,'Adaptar a publicação e a consulta da Tabela Oficial de Preços na interface.'],['A',0,'Validar e atualizar a ingestão de dados de mercado (CBOT, Milho B3 e câmbio), com carregamento sob demanda.'],['P',0,'Homologação da precificação: operar o app em paralelo com a planilha até a validação matemática completa.']])},
    {id:'sec-fundacao',title:'Fundação',subtitle:'Entidades primárias e suas relações',
     intro:'A espinha dorsal do app. Entidades primárias são os dados mestres. Aqui se define o modelo que suporta múltiplas empresas e corretoras e as regras que ligam essas entidades entre si.',
     items:mkItems([['N',0,'Estruturar o banco de dados para suportar múltiplos Grupos e múltiplas Empresas (CNPJs).'],['N',0,'Desenhar as relações, vínculos e gatilhos entre as entidades primárias.'],['N',0,'Implementar as entidades primárias novas: Grupo, Empresa, Corretora, Conta.'],['A',0,'Adaptar as entidades primárias existentes: Commodity, Produtor/Contraparte, Praça, Safra, Usuário/Cargo.']])},
    {id:'sec-cadastros',title:'Cadastros',subtitle:'Gestão das entidades primárias (frontend)',
     intro:'As telas para criar e manter as entidades primárias, com as regras de integridade que impedem cadastros inconsistentes.',
     items:mkItems([['N',0,'Interfaces de cadastro das entidades primárias.'],['N',0,'Regras de preenchimento e integridade (obrigatórios × opcionais e vínculos).'],['A',0,'Adaptar cadastros já existentes (ex.: Produtor ganha endereço e área de produção).'],['A',0,'Converter Commodity em cadastro aberto (agnóstico), com volume por lote.']])},
    {id:'sec-captura',title:'Captura',subtitle:'Entidades secundárias e lançamentos de dados (frontend e esquema)',
     intro:'Entidades secundárias são transacionais. Junto delas vêm os lançamentos — formulários que apenas alimentam uma base. Esta etapa cria essas interfaces e define como o dado entra no sistema.',
     items:mkItems([['N',0,'Interfaces das entidades secundárias (transacionais).'],['N',0,'Formulários de lançamento (ex.: apontamento de preço físico de praça e preços de MTM).'],['N',0,'Esquema de incorporação dos dados capturados à base: validação, destino e versionamento.'],['N',1,'Integração com o Sankhya (ERP do Grupo Spasso). Depende de decisão e ação da Spasso.']])},
    {id:'sec-registro',title:'Registro de hedge',subtitle:'Boletagem e conciliação de operações',
     intro:'Registrar as operações de hedge no app e confrontá-las com o que a corretora reporta.',
     items:mkItems([['A',0,'Boletagem das operações de bolsa (futuros e opções), imutável, com vínculo de offset (Entrada/Saída).'],['N',0,'Chave única (Trade ID / Contrato StoneX) para impedir duplicidade.'],['A',0,'Registro das operações físicas de Long Basis vinculadas ao derivativo e ao NDF.'],['N',0,'Conciliação entre os registros do app e o extrato da corretora.']])},
    {id:'sec-posicao',title:'Posição/MTM',subtitle:'Consolidação da posição e marcação a mercado',
     intro:'Enxergar a posição de forma consolidada e valorizá-la a mercado, com histórico.',
     items:mkItems([['N',0,'Posição consolidada por qualquer recorte e combinação.'],['A',0,'MTM decomposto (físico + bolsa + dólar) pelo fechamento diário — engine Python.'],['N',0,'Repositório de operações liquidadas com resultado por saca.'],['N',0,'Snapshots temporais diários (posição, MTM, preços, caixa) — histórico.']])},
    {id:'sec-risco',title:'Risco/contábil',subtitle:'Camada analítica e de saída da operação',
     intro:'Onde a operação deixa definitivamente as planilhas.',
     items:mkItems([['N',0,'Exposição (tons, cambial, a basis) e VaR sobre a posição consolidada.'],['N',1,'Política de risco: limites, margem e stress. Dependem da área de risco (Maely).'],['N',0,'Caixa da corretora (liquidações, margem, corretagem, IR) e fluxo de caixa.'],['N',1,'Contábil: hedge accounting e relatório para a Fato. Dependem da contabilidade.']])},
    {id:'sec-comercial',title:'Comercial',subtitle:'Frente comercial de preços e posições',
     intro:'Como a equipe comercial interage com preços e posições.',
     items:mkItems([['A',0,'Boleta de negociação do comercial para a mesa.'],['A',0,'Tabela self-service com carrego integrado para o comercial.'],['N',1,'Visibilidade de posições abertas para o comercial — a validar com o comercial (Reinaldo).']])},
    {id:'sec-diferidos',title:'Itens diferidos',subtitle:'Baixa prioridade',intro:'',
     items:mkItems([['A',0,'Basis histórico interpolado: consolidar a origem dos dados em base centralizada.']])},
  ],
  abas:[
    {id:'aba-dms',name:'dms',tipo:'Referência',status:'A',coveredBy:['sec-fundacao'],papel:'Listas de domínio: commodity+bolsa (com volume/lote), calendário, tipos de movimento de caixa e de liquidação.'},
    {id:'aba-precos-mtm',name:'Preços_MTM',tipo:'Registro',status:'A',coveredBy:['sec-captura'],papel:'Preços de fechamento (bolsa), FX e preço físico por praça — base do MTM.'},
    {id:'aba-analitico-deriv',name:'Analítico_Deriv',tipo:'Registro',status:'A',coveredBy:['sec-registro'],papel:'Livro de derivativos (futuros/dólar), imutável, com vínculo de offset. Chaves Trade ID / Contrato StoneX.'},
    {id:'aba-analitico-deriv-op',name:'Analítico_Deriv_Op',tipo:'Registro',status:'N',coveredBy:['sec-registro'],papel:'Livro de opções (Call), vinculado ao derivativo.'},
    {id:'aba-lb-vig',name:'Op. Long_Basis_Vig',tipo:'Registro',status:'A',coveredBy:['sec-registro'],papel:'Operações físicas de Long Basis vigentes, ligadas a derivativo + NDF.'},
    {id:'aba-lb-liq',name:'Op. Long_Basis_Liq',tipo:'Registro',status:'A',coveredBy:['sec-registro'],papel:'Operações de Long Basis liquidadas (Entrada/Saída).'},
    {id:'aba-liquidacoes',name:'Liquidações.Derivativos',tipo:'Registro',status:'N',coveredBy:['sec-posicao'],papel:'Registro de liquidações (offset), resultado em USD/BRL.'},
    {id:'aba-caixa',name:'Caixa_Corretoras',tipo:'Registro',status:'N',coveredBy:['sec-risco'],papel:'Caixa da corretora: saldo + livro de movimentos (IRRF etc.).'},
    {id:'aba-precos-mtm2',name:'Din.MTM_LB',tipo:'Reporte',status:'N',coveredBy:['sec-posicao'],papel:'MTM dinâmico de uma operação Long Basis (resumo por praça/componente).'},
    {id:'aba-mtm-lb',name:'MTM_LB-Milho-26',tipo:'Reporte',status:'N',coveredBy:['sec-posicao'],papel:'MTM parcial da operação LB Milho, por praça e por componente.'},
    {id:'aba-reporte-liq',name:'Reporte_Liq',tipo:'Reporte',status:'N',coveredBy:['sec-posicao'],papel:'Resultado de uma liquidação por componente (físico/bolsa/dólar), basis e R$/sc.'},
    {id:'aba-resumo',name:'Resumo_Derivativos',tipo:'Reporte',status:'N',coveredBy:['sec-posicao'],papel:'Exposição (tons/cambial/basis) e MTM consolidado em R$.'},
    {id:'aba-evolucao',name:'Evolução_MTM',tipo:'Reporte',status:'N',coveredBy:['sec-posicao'],papel:'Série diária do MTM Total — histórico (snapshot temporal).'},
    {id:'aba-var-cambial',name:'Var_Cambial',tipo:'Reporte',status:'N',coveredBy:['sec-risco'],papel:'Movimentações de caixa por tipo, caixa inicial/final, variação cambial.'},
    {id:'aba-fluxo',name:'Fluxo_Caixa',tipo:'Reporte',status:'N',coveredBy:['sec-risco'],papel:'Projeção de fluxo de caixa por empresa/corretora/commodity/mês.'},
    {id:'aba-gestao',name:'Gestão_Stonex',tipo:'Reporte',status:'N',coveredBy:['sec-risco'],papel:'Caixa, MTM, net de liquidação, margem, consumo, saldo e stress (limite StoneX).'},
  ],
  sprints:[],
  pendingItems:[]
};

let state, sortables=[], docVersion=0;

/* ---------- lookups ---------- */
const getSection=id=>state.sections.find(s=>s.id===id);
function getItem(id){for(const s of state.sections){const it=s.items.find(i=>i.id===id);if(it)return it;}}
const getAba=id=>state.abas.find(a=>a.id===id);
function nodeDone(id){
  const s=state.sections.find(x=>x.id===id);
  if(s)return s.items.length>0&&s.items.every(i=>i.done);
  for(const sec of state.sections){const it=sec.items.find(x=>x.id===id);if(it)return !!it.done;}
  return false;
}
function nodeLabel(id){
  const s=state.sections.find(x=>x.id===id);if(s)return '▸ '+s.title;
  for(const sec of state.sections){const it=sec.items.find(x=>x.id===id);if(it)return '• '+(it.text||'item').slice(0,42);}
  return '(removido)';
}
const abaAposentavel=a=>a.coveredBy.length>0&&a.coveredBy.every(nodeDone);
const coverersOf=nodeId=>state.abas.filter(a=>a.coveredBy.includes(nodeId));

/* ---------- persistence ---------- */
let saveT;
const setSaveState=t=>el('saveState').textContent=t;
function save(){
  setSaveState('salvando…');clearTimeout(saveT);
  saveT=setTimeout(async()=>{
    try{
      state.lastEditedBy=author;state.lastEditedTs=new Date().toISOString();
      const r=await fetch(API+'/doc',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({version:docVersion,data:state})});
      if(r.status===409){
        setSaveState('conflito — recarregue');
        alert('Alguém salvou uma versão mais nova antes de você. Recarregue a página para pegar a versão atual (suas últimas alterações podem não ter sido salvas).');
        return;
      }
      if(!r.ok) throw new Error('http '+r.status);
      const out=await r.json();docVersion=out.version;
      setSaveState('salvo ✓ (por '+author+')');
    }catch(e){setSaveState('erro ao salvar — verifique a conexão');}
  },350);
}

/* ---------- backlog render ---------- */
function statusOptions(sel){return [['','—'],['E','E'],['A','A'],['N','N'],['P','P']].map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${l}</option>`).join('');}
function badgesFor(nodeId){
  const covs=coverersOf(nodeId);if(!covs.length)return '';
  return `<div class="marco">${covs.map(a=>{const ok=abaAposentavel(a);
    return `<span class="abaTag ${ok?'ok':''}" title="${ok?'pode ser abandonada':'aguardando conclusão'}">🗑 ${esc(a.name)}${ok?' ✓':''}</span>`;}).join('')}</div>`;
}
function urgencyOptions(sel){return [['baixa','Baixa'],['media','Média'],['alta','Alta']].map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${l}</option>`).join('');}
function formatNoteTs(ts){try{return new Date(ts).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});}catch(e){return '';}}
function noteListHTML(it){
  return (it.notes||[]).map(n=>`<div class="noteEntry"><span class="noteMeta">${esc(n.author)} · ${formatNoteTs(n.ts)}</span><span class="noteText">${esc(n.text)}</span></div>`).join('');
}
function sprintPickHTML(it){
  let o='<option value="">— sem sprint —</option>';
  state.sprints.forEach(sp=>{o+=`<option value="${sp.id}" ${sp.id===it.sprintId?'selected':''}>${esc(sp.name)}</option>`;});
  return `<select class="sprintPick" data-role="sprintPick">${o}</select>`;
}
function sprintBadgeHTML(it){
  if(!it.sprintId)return '';
  const sp=state.sprints.find(s=>s.id===it.sprintId);
  return `<button class="sprintBadge" data-role="gotoSprint" data-sprint-id="${it.sprintId}">→ ${esc(sp?sp.name:'(sprint removido)')}</button>`;
}
function itemHTML(it,opts){
  opts=opts||{};
  const hasNotes=(it.notes||[]).length>0;
  return `<div class="item ${hasNotes?'showNote':''} ${it.confirm?'hasBang':''} ${it.done?'isDone':''}" data-iid="${it.id}">
    <input type="checkbox" class="done" data-role="done" ${it.done?'checked':''} title="Concluído">
    <select class="status ${it.status||''}" data-role="status">${statusOptions(it.status||'')}</select>
    <button class="bang ${it.confirm?'on':''}" data-role="confirm" title="Pendência externa">!</button>
    <select class="urgency urgency-${it.urgency||'media'}" data-role="urgency" title="Urgência">${urgencyOptions(it.urgency||'media')}</select>
    <div class="itemMain">
      <textarea class="itemText" data-role="text" rows="1">${esc(it.text)}</textarea>
      ${badgesFor(it.id)}
      <div class="itemSprintRow">${sprintPickHTML(it)}${sprintBadgeHTML(it)}</div>
      <button class="noteToggle" data-role="noteToggle">${hasNotes?'<span class="dot">●</span> notas ('+it.notes.length+')':'+ nota'}</button>
      <div class="note" data-role="noteBlock">
        <div class="noteList">${noteListHTML(it)}</div>
        <div class="noteAddRow">
          <input class="noteInput" data-role="noteInput" placeholder="adicionar nota…">
          <button class="noteAddBtn" data-role="addNote">+</button>
        </div>
      </div>
    </div>
    ${opts.hideActions?'':'<span class="handle item-handle">⋮⋮</span><button class="itemDel" data-role="delItem" title="Remover item">✕</button>'}
  </div>`;
}
function sectionHTML(s){
  const allDone=s.items.length>0&&s.items.every(i=>i.done);
  return `<div class="section" data-sid="${s.id}">
    <div class="secHead">
      <span class="handle sec-handle">⋮⋮</span>
      <div class="grow">
        <div class="secTitleRow">
          <input class="secTitle" data-role="secTitle" value="${esc(s.title)}" placeholder="Título">
          ${allDone?'<span class="secDone">✓ concluída</span>':''}
        </div>
        <input class="secSub" data-role="secSub" value="${esc(s.subtitle)}" placeholder="subtítulo">
        <textarea class="secIntro" data-role="secIntro" rows="1" placeholder="introdução…">${esc(s.intro)}</textarea>
        ${badgesFor(s.id)}
      </div>
      <button class="secDel" data-role="delSection" title="Remover seção">🗑</button>
    </div>
    <div class="items" data-sid="${s.id}">${s.items.map(itemHTML).join('')}</div>
    <button class="addItem" data-role="addItem">+ item</button>
  </div>`;
}
function renderBacklog(){
  el('sections').innerHTML=state.sections.map(sectionHTML).join('');
  el('footNote').value=state.footNote||'';
  autosizeAll();initSortables();updateDiagram();updateBangCount();applyFilter();
}
function updateDiagram(){
  const names=state.sections.filter(s=>s.title&&s.title.toLowerCase()!=='itens diferidos').map(s=>esc(s.title));
  el('diagram').innerHTML=names.length?names.join('<span class="arrow">→</span>'):'<span style="color:var(--muted)">Adicione seções.</span>';
}
function updateBangCount(){
  let n=0;state.sections.forEach(s=>s.items.forEach(i=>{if(i.confirm)n++;}));
  const on=document.body.classList.contains('filtering');
  el('filterBang').textContent=on?`Mostrar tudo (${n})`:`❗ Só pendências externas (${n})`;
}
function applyFilter(){
  const on=document.body.classList.contains('filtering');
  document.querySelectorAll('#sections > .section').forEach(sec=>{sec.style.display=(on&&!sec.querySelector('.item.hasBang'))?'none':'';});
}

/* ---------- mapa render ---------- */
function coverOptions(){
  let o='<option value="">+ vincular…</option>';
  state.sections.forEach(s=>{
    o+=`<optgroup label="${esc(s.title)}"><option value="${s.id}">▸ ${esc(s.title)} (seção inteira)</option>`;
    s.items.forEach(it=>{o+=`<option value="${it.id}">• ${esc((it.text||'item').slice(0,48))}</option>`;});
    o+='</optgroup>';
  });
  return o;
}
function abaHTML(a){
  const apos=abaAposentavel(a),covered=a.coveredBy.length>0;
  const chips=a.coveredBy.length?a.coveredBy.map(id=>`<span class="covChip ${nodeDone(id)?'done':''}">${esc(nodeLabel(id))}<button data-role="unlink" data-aid="${a.id}" data-node="${id}">✕</button></span>`).join(''):'<span class="noneTxt">— sem vínculo —</span>';
  return `<div class="aba" data-aid="${a.id}">
    <div class="abaHead">
      <span class="handle aba-handle">⋮⋮</span>
      <input class="abaName" data-role="abaName" value="${esc(a.name)}">
      <select class="status ${a.status||''}" data-role="abaStatus">${statusOptions(a.status||'')}</select>
      <span class="tipo">${esc(a.tipo||'')}</span>
      <button class="itemDel" data-role="delAba" title="Remover aba">✕</button>
    </div>
    <textarea class="abaPapel" data-role="abaPapel" rows="1" placeholder="papel / camada…">${esc(a.papel)}</textarea>
    <div class="cobertura"><span class="cobLabel">Coberta por:</span>${chips}
      <select class="coverPick" data-role="cover" data-aid="${a.id}">${coverOptions()}</select>
    </div>
    <div class="abaState ${apos?'ok':covered?'wait':'nolink'}">${apos?'✓ pode ser abandonada':covered?'aguardando conclusão do vínculo':'sem vínculo definido'}</div>
  </div>`;
}
function renderMapa(){
  el('abas').innerHTML=state.abas.map(abaHTML).join('');
  document.querySelectorAll('.abaPapel').forEach(autosize);
  initAbaSortable();
}
function updateProgress(){
  const total=state.abas.length;
  const cob=state.abas.filter(a=>a.coveredBy.length>0).length;
  const apos=state.abas.filter(abaAposentavel).length;
  el('progress').innerHTML=`Planilha da Maela — <b>${cob}/${total}</b> abas cobertas pelo backlog · <b class="aposN">${apos}</b> aposentáveis`;
}
/* ---------- sprints render ---------- */
let expandedSprints=new Set();
function assignedItems(sprintId){
  const out=[];state.sections.forEach(s=>s.items.forEach(it=>{if(it.sprintId===sprintId)out.push(it);}));
  return out;
}
function sprintStatusOptions(sel){return [['planned','Planejado'],['active','Ativo'],['done','Concluído']].map(([v,l])=>`<option value="${v}" ${v===sel?'selected':''}>${l}</option>`).join('');}
function sprintHTML(sp){
  const items=assignedItems(sp.id);
  const total=items.length,done=items.filter(i=>i.done).length;
  const pct=total?Math.round(done/total*100):0;
  const expanded=expandedSprints.has(sp.id);
  return `<div class="sprintCard ${expanded?'expanded':''}" data-spid="${sp.id}">
    <div class="sprintHead" data-role="sprintToggle">
      <input class="sprintName" data-role="sprintName" value="${esc(sp.name)}" placeholder="Nome do sprint">
      <select class="status" data-role="sprintStatus">${sprintStatusOptions(sp.status)}</select>
      <input class="sprintDate" type="date" data-role="sprintStart" value="${esc(sp.start)}">
      <span class="sprintDateSep">–</span>
      <input class="sprintDate" type="date" data-role="sprintEnd" value="${esc(sp.end)}">
      <button class="itemDel" data-role="delSprint" title="Remover sprint">✕</button>
    </div>
    <div class="sprintBar"><div class="sprintBarFill" style="width:${pct}%"></div></div>
    <div class="sprintProgressText">${done}/${total} concluídos</div>
    <div class="sprintBody">
      <textarea class="secIntro" data-role="sprintGoal" rows="1" placeholder="objetivo do sprint…">${esc(sp.goal)}</textarea>
      <div class="items">${items.map(it=>itemHTML(it,{hideActions:true})).join('')||'<span class="noneTxt">— nenhum item vinculado —</span>'}</div>
    </div>
  </div>`;
}
function renderSprints(){
  const sorted=[...state.sprints].sort((a,b)=>(a.start||'').localeCompare(b.start||''));
  el('sprintsList').innerHTML=sorted.map(sprintHTML).join('')||'<div class="hint">Nenhum sprint criado ainda.</div>';
  document.querySelectorAll('#sprintsList .secIntro,#sprintsList .itemText').forEach(autosize);
}

/* ---------- pending items render ---------- */
function mostRecentTs(it){return extractIdTs(it.id);}
function urgencyBadgeHTML(u){
  const label=u==='alta'?'Alta':u==='baixa'?'Baixa':'Média';
  return `<span class="urgencyBadge ${u}">${label}</span>`;
}
function buildPendingList(){
  const derived=[];
  state.sections.forEach(sec=>sec.items.forEach(it=>{
    if(it.confirm||it.pendingResolved){
      derived.push({kind:'backlog',id:it.id,sectionTitle:sec.title,title:it.text||'(sem texto)',
        resolved:!!it.pendingResolved,urgency:it.urgency||'media',sortKey:mostRecentTs(it)});
    }
  }));
  const standalone=state.pendingItems.map(p=>({kind:'standalone',id:p.id,title:p.title,description:p.description,
    author:p.author,resolved:p.status==='resolved',urgency:p.urgency||'media',sortKey:new Date(p.createdAt).getTime()||0}));
  return [...derived,...standalone].sort((a,b)=>b.sortKey-a.sortKey);
}
function pendingHTML(p){
  const originHTML=p.kind==='backlog'
    ?`<button class="pendingOriginBadge clickable" data-role="gotoBacklog" data-node-id="${p.id}">Backlog · ${esc(p.sectionTitle)}</button>`
    :`<span class="pendingOriginBadge">Adicionado aqui</span>`;
  const body=p.kind==='backlog'
    ?`<div class="pendingTitle">${esc(p.title)}</div>`
    :`<input class="pendingTitleInput" data-role="pendingTitle" data-id="${p.id}" value="${esc(p.title)}">
      <textarea class="secIntro" data-role="pendingDescription" data-id="${p.id}" rows="1" placeholder="descrição…">${esc(p.description||'')}</textarea>
      <div class="pendingAuthor">por ${esc(p.author||'')}</div>`;
  return `<div class="pendingCard ${p.resolved?'resolved':''}" data-kind="${p.kind}" data-id="${p.id}">
    <div class="pendingHead">${originHTML}${urgencyBadgeHTML(p.urgency)}</div>
    ${body}
    <div class="pendingActions">
      <button class="tb" data-role="togglePendingResolved" data-kind="${p.kind}" data-id="${p.id}">${p.resolved?'Reabrir':'Resolver'}</button>
      ${p.kind==='standalone'?`<button class="itemDel" data-role="delPendingStandalone" data-id="${p.id}" title="Remover">✕</button>`:''}
    </div>
  </div>`;
}
function renderPending(){
  const showAll=document.body.classList.contains('pendingShowAll');
  let list=buildPendingList();
  if(!showAll)list=list.filter(p=>!p.resolved);
  el('pendingList').innerHTML=list.length?list.map(pendingHTML).join(''):'<div class="hint">Nenhum item pendente.</div>';
  document.querySelectorAll('#pendingList .secIntro').forEach(autosize);
  el('filterPending').textContent=showAll?'Mostrar apenas abertas':'Mostrar tudo';
}

/* ---------- retrospectives (read-only, GitHub API) ---------- */
let retroCache=null,retroLoading=false;
let expandedRetros=new Set();
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
function parseRetroDate(name){
  const m=/^(\d{4})(\d{2})(\d{2})\.md$/.exec(name);
  if(!m)return null;
  return {y:+m[1],mo:+m[2],d:+m[3]};
}
function formatRetroDate(p){return `${p.d} de ${MESES[p.mo-1]} de ${p.y}`;}
async function loadRetrospectives(){
  if(retroCache!==null||retroLoading)return;
  retroLoading=true;
  el('retroList').innerHTML='<div class="hint">carregando…</div>';
  try{
    const r=await fetch(`https://api.github.com/repos/${RETRO_OWNER}/${RETRO_REPO}/contents/retrospectives`,{headers:{'Accept':'application/vnd.github+json'}});
    if(!r.ok)throw new Error('http '+r.status);
    const list=await r.json();
    const files=list.filter(f=>f.type==='file'&&/\.md$/i.test(f.name));
    const withContent=await Promise.all(files.map(async f=>({name:f.name,content:await (await fetch(f.download_url)).text()})));
    withContent.sort((a,b)=>b.name.localeCompare(a.name));
    retroCache=withContent;
    if(withContent.length)expandedRetros.add(0);
    renderRetro();
  }catch(e){
    retroCache=null;
    el('retroList').innerHTML='<div class="hint">erro ao carregar retrospectivas — verifique a conexão</div>';
  }finally{
    retroLoading=false;
  }
}
function retroEntryHTML(file,idx){
  const parsed=parseRetroDate(file.name);
  const expanded=expandedRetros.has(idx);
  const dateLabel=parsed?formatRetroDate(parsed):esc(file.name);
  const malformed=parsed?'':'<span class="retroMalformed">formato de data não reconhecido</span>';
  const badge=idx===0?'<span class="retroBadgeNew">mais recente</span>':'';
  let bodyHTML;
  try{bodyHTML=(window.marked?marked.parse(file.content):esc(file.content));}catch(e){bodyHTML=esc(file.content);}
  return `<div class="retroCard ${expanded?'expanded':''}" data-idx="${idx}">
    <div class="retroHead" data-role="retroToggle">
      <span class="retroDate">${dateLabel}</span>${badge}${malformed}
    </div>
    <div class="retroBody">${bodyHTML}</div>
  </div>`;
}
function renderRetro(){
  if(retroCache===null)return;
  el('retroList').innerHTML=retroCache.map((f,i)=>retroEntryHTML(f,i)).join('')||'<div class="hint">Nenhuma retrospectiva encontrada.</div>';
}

function renderAll(){renderBacklog();renderMapa();renderSprints();renderPending();updateProgress();}

function autosize(e){if(!e)return;e.style.height='auto';e.style.height=e.scrollHeight+'px';}
function autosizeAll(){document.querySelectorAll('.secIntro,.itemText,#footNote').forEach(autosize);}

/* ---------- drag ---------- */
function rebuildBacklogFromDOM(){
  const secMeta={},itemMap={};
  state.sections.forEach(s=>{secMeta[s.id]=s;s.items.forEach(it=>itemMap[it.id]=it);});
  const ns=[];
  document.querySelectorAll('#sections > .section').forEach(secEl=>{
    const s=secMeta[secEl.dataset.sid];if(!s)return;const items=[];
    secEl.querySelectorAll('.items > .item').forEach(itEl=>{const it=itemMap[itEl.dataset.iid];if(it)items.push(it);});
    s.items=items;ns.push(s);
  });
  state.sections=ns;updateDiagram();updateProgress();save();
}
function initSortables(){
  sortables.filter(s=>s._bl).forEach(s=>{try{s.destroy()}catch(e){}});
  sortables=sortables.filter(s=>!s._bl);
  if(!window.Sortable)return;
  const a=Sortable.create(el('sections'),{handle:'.sec-handle',draggable:'.section',animation:150,onEnd:rebuildBacklogFromDOM});a._bl=1;sortables.push(a);
  document.querySelectorAll('.items').forEach(c=>{const s=Sortable.create(c,{handle:'.item-handle',group:'items',draggable:'.item',animation:150,onEnd:rebuildBacklogFromDOM});s._bl=1;sortables.push(s);});
}
function initAbaSortable(){
  sortables.filter(s=>s._ab).forEach(s=>{try{s.destroy()}catch(e){}});
  sortables=sortables.filter(s=>!s._ab);
  if(!window.Sortable)return;
  const s=Sortable.create(el('abas'),{handle:'.aba-handle',draggable:'.aba',animation:150,onEnd:()=>{
    const map={};state.abas.forEach(a=>map[a.id]=a);
    state.abas=[...document.querySelectorAll('#abas > .aba')].map(e=>map[e.dataset.aid]).filter(Boolean);save();
  }});s._ab=1;sortables.push(s);
}

/* ---------- shared item-level handlers (used by Backlog and Sprints views) ---------- */
function handleItemInput(e){
  const r=e.target.dataset.role;
  const itemEl=e.target.closest('.item');if(!itemEl)return false;
  const it=getItem(itemEl.dataset.iid);if(!it)return false;
  if(r==='text'){it.text=e.target.value;autosize(e.target);save();return true;}
  if(r==='noteInput')return true;
  return false;
}
function handleItemChange(e){
  const r=e.target.dataset.role;
  const itemEl=e.target.closest('.item');if(!itemEl)return false;
  const it=getItem(itemEl.dataset.iid);if(!it)return false;
  if(r==='status'){it.status=e.target.value;e.target.className='status '+(it.status||'');save();return true;}
  if(r==='done'){it.done=e.target.checked;renderAll();save();return true;}
  if(r==='urgency'){it.urgency=e.target.value;e.target.className='urgency urgency-'+it.urgency;save();return true;}
  if(r==='sprintPick'){it.sprintId=e.target.value||null;renderAll();save();return true;}
  return false;
}
function addNoteFromItem(itemEl){
  const it=getItem(itemEl.dataset.iid);if(!it)return;
  const inp=itemEl.querySelector('.noteInput');
  const v=(inp.value||'').trim();if(!v)return;
  it.notes.push({id:uid(),author:ensureAuthor(),ts:new Date().toISOString(),text:v});
  renderAll();save();
  const again=document.querySelector(`[data-iid="${it.id}"]`);
  if(again){again.classList.add('showNote');const i2=again.querySelector('.noteInput');if(i2)i2.focus();}
}
function handleItemClick(e){
  const r=e.target.dataset.role;
  const itemEl=e.target.closest('.item');if(!itemEl)return false;
  const it=getItem(itemEl.dataset.iid);if(!it)return false;
  if(r==='confirm'){it.confirm=!it.confirm;it.pendingResolved=it.confirm?false:true;renderAll();save();return true;}
  if(r==='noteToggle'){itemEl.classList.toggle('showNote');if(itemEl.classList.contains('showNote')){const inp=itemEl.querySelector('.noteInput');if(inp)inp.focus();}return true;}
  if(r==='addNote'){addNoteFromItem(itemEl);return true;}
  if(r==='gotoSprint'){
    const sid=e.target.dataset.sprintId;
    setView('sprints');expandedSprints.add(sid);renderSprints();
    setTimeout(()=>{const card=document.querySelector(`.sprintCard[data-spid="${sid}"]`);if(card)card.scrollIntoView({behavior:'smooth',block:'center'});},0);
    return true;
  }
  return false;
}
function handleItemKeydown(e){
  if(e.target.dataset.role==='noteInput'&&e.key==='Enter'){e.preventDefault();addNoteFromItem(e.target.closest('.item'));}
}

/* ---------- backlog events ---------- */
const S=el('sections');
S.addEventListener('input',e=>{
  if(handleItemInput(e))return;
  const r=e.target.dataset.role;
  if(r==='secTitle'||r==='secSub'||r==='secIntro'){const s=getSection(e.target.closest('.section').dataset.sid);if(!s)return;
    s[r==='secTitle'?'title':r==='secSub'?'subtitle':'intro']=e.target.value;if(r==='secTitle'){updateDiagram();}autosize(e.target);save();}
});
S.addEventListener('change',e=>{
  if(handleItemChange(e))return;
});
S.addEventListener('click',e=>{
  const r=e.target.dataset.role;if(!r)return;
  if(handleItemClick(e))return;
  if(r==='delItem'){const s=getSection(e.target.closest('.section').dataset.sid);const iid=e.target.closest('.item').dataset.iid;
    s.items=s.items.filter(i=>i.id!==iid);state.abas.forEach(a=>a.coveredBy=a.coveredBy.filter(x=>x!==iid));renderAll();save();}
  else if(r==='addItem'){const s=getSection(e.target.closest('.section').dataset.sid);const it={id:uid(),status:'',confirm:false,done:false,notes:[],text:'',sprintId:null,pendingResolved:false,urgency:'media'};s.items.push(it);renderAll();const ta=document.querySelector(`[data-iid="${it.id}"] .itemText`);if(ta)ta.focus();save();}
  else if(r==='delSection'){const sid=e.target.closest('.section').dataset.sid;const s=getSection(sid);
    if(confirm(`Remover a seção "${s.title||'sem título'}" e seus ${s.items.length} itens?`)){
      const ids=[sid,...s.items.map(i=>i.id)];state.sections=state.sections.filter(x=>x.id!==sid);
      state.abas.forEach(a=>a.coveredBy=a.coveredBy.filter(x=>!ids.includes(x)));renderAll();save();}}
});
S.addEventListener('keydown',handleItemKeydown);

/* ---------- sprints events ---------- */
const SP=el('sprintsList');
SP.addEventListener('input',e=>{
  if(handleItemInput(e))return;
  const r=e.target.dataset.role;
  const card=e.target.closest('.sprintCard');if(!card)return;
  const sp=state.sprints.find(s=>s.id===card.dataset.spid);if(!sp)return;
  if(r==='sprintName'){sp.name=e.target.value;save();}
  else if(r==='sprintGoal'){sp.goal=e.target.value;autosize(e.target);save();}
});
SP.addEventListener('change',e=>{
  if(handleItemChange(e))return;
  const r=e.target.dataset.role;
  const card=e.target.closest('.sprintCard');if(!card)return;
  const sp=state.sprints.find(s=>s.id===card.dataset.spid);if(!sp)return;
  if(r==='sprintStart'){sp.start=e.target.value;renderSprints();save();}
  else if(r==='sprintEnd'){sp.end=e.target.value;save();}
  else if(r==='sprintStatus'){sp.status=e.target.value;renderSprints();save();}
});
SP.addEventListener('click',e=>{
  if(handleItemClick(e))return;
  const r=e.target.dataset.role;if(!r)return;
  const card=e.target.closest('.sprintCard');if(!card)return;
  if(r==='sprintToggle'){const sid=card.dataset.spid;if(expandedSprints.has(sid))expandedSprints.delete(sid);else expandedSprints.add(sid);renderSprints();}
  else if(r==='delSprint'){const sid=card.dataset.spid;const sp=state.sprints.find(s=>s.id===sid);
    if(confirm(`Remover o sprint "${sp.name||'sem nome'}"?`)){
      state.sections.forEach(s=>s.items.forEach(it=>{if(it.sprintId===sid)it.sprintId=null;}));
      state.sprints=state.sprints.filter(s=>s.id!==sid);renderAll();save();
    }}
});
SP.addEventListener('keydown',handleItemKeydown);

/* ---------- pending items events ---------- */
const PD=el('pendingList');
PD.addEventListener('input',e=>{
  const r=e.target.dataset.role;const id=e.target.dataset.id;
  const p=state.pendingItems.find(x=>x.id===id);if(!p)return;
  if(r==='pendingTitle'){p.title=e.target.value;save();}
  else if(r==='pendingDescription'){p.description=e.target.value;autosize(e.target);save();}
});
PD.addEventListener('click',e=>{
  const r=e.target.dataset.role;if(!r)return;
  if(r==='togglePendingResolved'){
    const kind=e.target.dataset.kind,id=e.target.dataset.id;
    if(kind==='backlog'){const it=getItem(id);if(!it)return;
      if(it.pendingResolved){it.pendingResolved=false;it.confirm=true;}else{it.pendingResolved=true;it.confirm=false;}
      renderAll();save();
    }else{const p=state.pendingItems.find(x=>x.id===id);if(!p)return;p.status=p.status==='resolved'?'open':'resolved';renderPending();save();}
  }else if(r==='delPendingStandalone'){
    if(confirm('Remover este item pendente?')){state.pendingItems=state.pendingItems.filter(x=>x.id!==e.target.dataset.id);renderPending();save();}
  }else if(r==='gotoBacklog'){
    const iid=e.target.dataset.nodeId;setView('backlog');renderAll();
    setTimeout(()=>{const node=document.querySelector(`[data-iid="${iid}"]`);if(node){node.scrollIntoView({behavior:'smooth',block:'center'});node.classList.add('showNote');}},0);
  }
});

/* ---------- retrospectives events ---------- */
const RT=el('retroList');
RT.addEventListener('click',e=>{
  const r=e.target.dataset.role;if(r!=='retroToggle')return;
  const card=e.target.closest('.retroCard');const idx=+card.dataset.idx;
  if(expandedRetros.has(idx))expandedRetros.delete(idx);else expandedRetros.add(idx);
  renderRetro();
});

/* ---------- mapa events ---------- */
const AB=el('abas');
AB.addEventListener('input',e=>{const r=e.target.dataset.role;const a=getAba(e.target.closest('.aba').dataset.aid);if(!a)return;
  if(r==='abaName'){a.name=e.target.value;}else if(r==='abaPapel'){a.papel=e.target.value;autosize(e.target);}save();});
AB.addEventListener('change',e=>{const r=e.target.dataset.role;
  if(r==='abaStatus'){const a=getAba(e.target.closest('.aba').dataset.aid);a.status=e.target.value;e.target.className='status '+(a.status||'');updateProgress();save();}
  else if(r==='cover'){const a=getAba(e.target.dataset.aid);const v=e.target.value;if(v&&!a.coveredBy.includes(v))a.coveredBy.push(v);renderAll();save();}});
AB.addEventListener('click',e=>{const r=e.target.dataset.role;if(!r)return;
  if(r==='unlink'){const a=getAba(e.target.dataset.aid);a.coveredBy=a.coveredBy.filter(x=>x!==e.target.dataset.node);renderAll();save();}
  else if(r==='delAba'){const a=getAba(e.target.closest('.aba').dataset.aid);if(confirm(`Remover a aba "${a.name}"?`)){state.abas=state.abas.filter(x=>x.id!==a.id);renderMapa();updateProgress();save();}}});

/* ---------- tabs ---------- */
function renderTabs(){
  el('tabs').innerHTML=VIEWS.map(v=>`<div class="tab" data-view-id="${v.id}">${esc(v.label)}</div>`).join('');
}
renderTabs();
function setView(v){
  state.activeView=v;document.body.dataset.view=v;
  document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.viewId===v));
  if(v==='retro')loadRetrospectives();
  save();
}
el('tabs').addEventListener('click',e=>{
  const t=e.target.closest('.tab');if(!t)return;
  setView(t.dataset.viewId);
});

/* ---------- header / footer ---------- */
el('docTitle').addEventListener('input',e=>{state.docTitle=e.target.value;save();});
el('docSub').addEventListener('input',e=>{state.docSub=e.target.value;save();});
el('footNote').addEventListener('input',e=>{state.footNote=e.target.value;autosize(e.target);save();});

/* ---------- autor (toolbar) ---------- */
function refreshAuthorLabel(){el('authorLabel').textContent=author;}
el('changeAuthor').addEventListener('click',()=>{
  const n=(prompt('Seu nome:',author)||'').trim();
  if(n){author=n;localStorage.setItem('autor',author);refreshAuthorLabel();}
});

/* ---------- toolbar ---------- */
el('filterBang').addEventListener('click',()=>{document.body.classList.toggle('filtering');el('filterBang').classList.toggle('active');applyFilter();updateBangCount();});
el('addSection').addEventListener('click',()=>{const s={id:uid(),title:'Nova seção',subtitle:'',intro:'',items:[{id:uid(),status:'',confirm:false,done:false,notes:[],text:'',sprintId:null,pendingResolved:false,urgency:'media'}]};state.sections.push(s);renderAll();save();const t=document.querySelector(`[data-sid="${s.id}"] .secTitle`);if(t){t.focus();t.select();t.scrollIntoView({behavior:'smooth',block:'center'});}});
el('addAba').addEventListener('click',()=>{const a={id:uid(),name:'Nova aba',tipo:'',status:'',coveredBy:[],papel:''};state.abas.push(a);renderMapa();updateProgress();save();const n=document.querySelector(`[data-aid="${a.id}"] .abaName`);if(n){n.focus();n.select();n.scrollIntoView({behavior:'smooth',block:'center'});}});
el('addSprint').addEventListener('click',()=>{
  const today=new Date().toISOString().slice(0,10);
  const sp={id:uid(),name:'Novo sprint',goal:'',start:today,end:'',status:'planned'};
  state.sprints.push(sp);expandedSprints.add(sp.id);renderSprints();save();
  const n=document.querySelector(`[data-spid="${sp.id}"] .sprintName`);
  if(n){n.focus();n.select();n.scrollIntoView({behavior:'smooth',block:'center'});}
});
el('addPendingItem').addEventListener('click',()=>{
  const p={id:uid(),origin:'standalone',title:'Novo item pendente',description:'',author:ensureAuthor(),createdAt:new Date().toISOString(),status:'open',urgency:'media'};
  state.pendingItems.push(p);renderPending();save();
  const t=document.querySelector(`.pendingCard[data-id="${p.id}"] .pendingTitleInput`);
  if(t){t.focus();t.select();t.scrollIntoView({behavior:'smooth',block:'center'});}
});
el('filterPending').addEventListener('click',()=>{document.body.classList.toggle('pendingShowAll');renderPending();});
el('reset').addEventListener('click',()=>{if(confirm('Resetar para o conteúdo original? Suas edições serão perdidas (exporte antes).')){state=JSON.parse(JSON.stringify(DEFAULT_STATE));boot();save();}});
function download(name,text,type){const b=new Blob([text],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),400);}
el('expJson').addEventListener('click',()=>download('documento_projeto.json',JSON.stringify(state,null,2),'application/json'));
el('expMd').addEventListener('click',()=>download('documento_projeto.md',toMarkdown(),'text/markdown'));
el('impBtn').addEventListener('click',()=>el('impFile').click());
el('impFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const rd=new FileReader();
  rd.onload=()=>{try{const obj=JSON.parse(rd.result);if(!obj.sections)throw new Error('sem seções');normalize(obj);state=obj;boot();save();}catch(err){alert('JSON inválido: '+err.message);}e.target.value='';};
  rd.readAsText(f);});

/* ---------- markdown ---------- */
function toMarkdown(){
  const flow=state.sections.filter(s=>s.title&&s.title.toLowerCase()!=='itens diferidos').map(s=>s.title).join(' → ');
  let md=`# ${state.docTitle}\n**${state.docSub}**\n\n`;
  md+=`**${flow}**\n\n`;
  md+='**Legenda:** `[E]` existente · `[A]` a adaptar · `[N]` novo · `[P]` processo · `(!)` pendência externa · `[x]` concluído.\n\n';
  md+=`## Backlog\n\n`;
  state.sections.forEach((s,i)=>{
    md+=`### ${i+1}. ${s.title}\n`;if(s.subtitle)md+=`*${s.subtitle}*\n`;if(s.intro)md+=`\n${s.intro}\n`;
    const secApos=coverersOf(s.id);if(secApos.length)md+=`\n> 🗑 aposenta (seção): ${secApos.map(a=>a.name).join(', ')}\n`;
    md+='\n';
    s.items.forEach(it=>{
      const ck=it.done?'[x] ':'[ ] ';const bang=it.confirm?'`(!)` ':'';const tag=it.status?`\`[${it.status}]\` `:'';
      md+=`- ${ck}${bang}${tag}${it.text}\n`;
      const cov=coverersOf(it.id);if(cov.length)md+=`  - 🗑 aposenta: ${cov.map(a=>a.name).join(', ')}\n`;
      if(it.notes&&it.notes.length)it.notes.forEach(n=>{md+=`  - _nota (${n.author}): ${n.text.replace(/\n/g,' ')}_\n`;});
    });
    md+='\n';
  });
  md+=`---\n\n**Nota sobre a ordem.** ${state.footNote}\n\n`;
  md+=`## Mapa da Planilha (${state.abas.length} abas)\n\n`;
  md+=`| Aba | Status | Tipo | Coberta por | Aposentável |\n|---|---|---|---|---|\n`;
  state.abas.forEach(a=>{
    const cov=a.coveredBy.map(id=>nodeLabel(id)).join('; ')||'—';
    md+=`| ${a.name} | ${a.status||'—'} | ${a.tipo||''} | ${cov} | ${abaAposentavel(a)?'✓ sim':'não'} |\n`;
  });
  return md;
}

/* ---------- boot ---------- */
function normalize(o){
  o.activeView=o.activeView||'sprints';
  (o.sections||[]).forEach(s=>{s.id=s.id||uid();(s.items||[]).forEach(i=>{
    i.id=i.id||uid();
    if(i.done===undefined)i.done=false;
    if(i.confirm===undefined)i.confirm=false;
    if(typeof i.notes==='string'){
      i.notes=i.notes.trim()?[{id:uid(),author:'—',ts:new Date(0).toISOString(),text:i.notes}]:[];
    }else if(!Array.isArray(i.notes)){
      i.notes=[];
    }else{
      i.notes.forEach(n=>{n.id=n.id||uid();n.author=n.author||'—';n.ts=n.ts||new Date(0).toISOString();});
    }
    if(i.sprintId===undefined)i.sprintId=null;
    if(i.pendingResolved===undefined)i.pendingResolved=false;
    if(i.urgency===undefined)i.urgency='media';
  });});
  if(!o.abas)o.abas=JSON.parse(JSON.stringify(DEFAULT_STATE.abas));
  o.abas.forEach(a=>{a.id=a.id||uid();if(!Array.isArray(a.coveredBy))a.coveredBy=[];if(a.papel===undefined)a.papel='';});
  if(!Array.isArray(o.sprints))o.sprints=[];
  o.sprints.forEach(s=>{s.id=s.id||uid();s.name=s.name||'';s.goal=s.goal||'';s.start=s.start||'';s.end=s.end||'';s.status=s.status||'planned';});
  if(!Array.isArray(o.pendingItems))o.pendingItems=[];
  o.pendingItems.forEach(p=>{p.id=p.id||uid();p.origin='standalone';p.status=p.status||'open';p.createdAt=p.createdAt||new Date(0).toISOString();p.urgency=p.urgency||'media';});
}
function boot(){
  el('docTitle').value=state.docTitle||'';el('docSub').value=state.docSub||'';
  expandedSprints=new Set(state.sprints.filter(s=>s.status==='active').map(s=>s.id));
  setView(state.activeView||'sprints');
  renderAll();autosize(el('footNote'));
  refreshAuthorLabel();
}
async function load(){
  setSaveState('carregando…');
  let loaded=null;
  try{
    const r=await fetch(API+'/doc');
    const out=await r.json();
    docVersion=out.version||0;
    loaded=out.data;
  }catch(e){
    setSaveState('sem conexão com o servidor — mostrando conteúdo padrão');
  }
  if(loaded)normalize(loaded);
  state=loaded||JSON.parse(JSON.stringify(DEFAULT_STATE));
  boot();
  setSaveState(loaded?('salvo ✓'+(state.lastEditedBy?(' — última edição: '+state.lastEditedBy):'')):'novo documento — será criado ao salvar');
}
load();
