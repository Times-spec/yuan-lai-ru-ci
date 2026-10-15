/* 原来如此 · SPA */
(function(){
"use strict";

var CATS = {
  security:   { name:"验证与安全", en:"SECURITY",   color:"#D93736", icon:"🛡️", desc:"登录、验证码、扫码、指纹……每一次「证明你是谁」的背后，都是一场攻防博弈。" },
  navigation: { name:"跳转与导航", en:"NAVIGATION", color:"#2563EB", icon:"🧭", desc:"301、短链接、扫码跳转、小程序互跳……一次点击之后，请求到底去了哪里？" },
  features:   { name:"小功能大智慧", en:"FEATURES",   color:"#059669", icon:"✨", desc:"懒加载、骨架屏、暗黑模式、自动补全……习以为常的细节里藏着精妙的工程权衡。" },
  backend:    { name:"后端基建", en:"INFRASTRUCTURE", color:"#7C3AED", icon:"🗄️", desc:"Redis、MySQL、Docker、Nginx、消息队列……每个网站背后都有一套默默运转的基础设施，开发者天天打交道，却很少有人讲清它们到底在干什么。" },
  network:    { name:"网络与协议", en:"NETWORK", color:"#EA580C", icon:"🌐", desc:"在浏览器输入网址、按下回车之后，到底发生了什么？跟着 DNS、TCP、TLS 走完一次完整的网络之旅。" },
  engineering:{ name:"工程与协作", en:"CRAFT", color:"#0E7490", icon:"🛠️", desc:"从一个需求被提出，到代码上线、知识沉淀——软件工程里那些“理所当然”的做法，背后都有一套方法论。" },
  ai:         { name:"AI 与大模型", en:"AI", color:"#DB2777", icon:"🤖", desc:"深度学习、Transformer、微调、评测、智能体……一条链看懂大模型是怎么来的，每个环节解决了什么问题。" },
  media:      { name:"影音媒体", en:"MEDIA", color:"#B45309", icon:"🎬", desc:"采样率、量化位数、编码、帧率、码率……剪视频导出时那一堆参数，到底是什么意思、该怎么选。" }
};

/* 逻辑线（旅程线）：某些分类的条目天然构成一条时间/流程线，在分类页顶部可视化呈现 */
var JOURNEYS = {
  network: {
    title:"一次网址访问的旅程",
    desc:"在浏览器输入网址、按下回车——跟着这条线走完请求的一生；后半段看看 Clash 如何决定每条请求走不走代理。",
    nodes:["network-dns-records","network-doh","network-tcp-tls","network-proxy-chain","network-clash-modes","network-clash-rules","network-json-yaml","network-svg"]
  },
  engineering: {
    title:"一个需求的生命周期",
    desc:"从 PRD 写下第一行字，到设计、开发、测试、沉淀为知识——跟着这条线走完一圈。",
    nodes:["eng-prd","eng-ux-ui","eng-linear-jira","eng-tdd","eng-e2e","eng-adr","eng-wiki"]
  },
  ai: {
    title:"一条链看懂大模型",
    desc:"从深度学习到递归自我改进——跟着这条线，看机器如何一步步学会思考。",
    nodes:["ai-deep-learning","ai-neural-network","ai-transformer","ai-token","ai-embedding","ai-pretraining","ai-sft-lora","ai-rlhf","ai-inference-deploy","ai-benchmark","ai-harness","ai-rag","ai-hallucination","ai-agent","ai-tts-asr-ocr","ai-prompt-engineering","ai-scaling-law","ai-rsi"]
  },
  backend: {
    title:"一个网站的上云之路",
    desc:"从合租一台 VPS，到弹性云服务器、对象存储，再看懂 IaaS/PaaS/SaaS——跟着这条线，看网站一步步搬上云。",
    nodes:["backend-vps","backend-ecs","backend-object-storage","backend-iaas-paas-saas","backend-cdn"]
  }
};

/* C2: 分类子分组 —— 网络与协议按子主题分组（JSON/YAML、SVG 已移至小功能大智慧，PAP 已移至 AI 与大模型） */
var SUBGROUPS = {
  network: [
    {title:"上网的基础", tag:"适合先读", ids:["network-dns-records","network-doh","network-tcp-tls","network-domain-bind","network-ssh"]},
    {title:"代理与 Clash", tag:"系列阅读", ids:["network-proxy-chain","network-clash-what","network-clash-modes","network-clash-rules","network-policy-groups","network-tun-mode","network-subscription","network-fake-ip","network-proxychains"]},
    {title:"IP 与隐私", ids:["network-ip-types","network-ip-purity","network-webrtc-leak","network-proxy-protocols","network-proxy-slang"]}
  ]
};

var DATA = null;        // {security:[], navigation:[], features:[]}
var BY_ID = {};
var app = document.getElementById('app');

/* ---------- utils ---------- */
function esc(s){
  return String(s==null?"":s).replace(/[&<>"']/g,function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}
function setCatVar(el, cat){
  el.style.setProperty('--c', CATS[cat].color);
}
function cardHTML(it){
  var c = CATS[it.category];
  return '<a class="card rv" href="#/p/'+it.id+'" data-nav>'+
    '<div class="meta"><span class="dot" style="background:'+c.color+'"></span>'+
    '<span class="catname">'+c.name+'</span></div>'+
    '<h3>'+esc(it.name)+'</h3>'+
    '<div class="tagline">'+esc(it.tagline||"")+'</div>'+
    '<div class="foot">💡 <b>原理一句话：</b>'+esc(it.principle?it.principle.summary:"")+'</div>'+
  '</a>';
}
/* 代码高亮（B1 修复）：单次扫描，一个正则同时匹配注释/字符串/关键字，
   回调里一次性决定类名。旧版多次 replace 会让后面的正则咬到前面插入的
   <span class="..."> 标签里的引号/关键字（如 class），把标签拆坏。 */
function highlight(code, lang){
  var esc2 = function(s){
    return String(s).replace(/[&<>]/g,function(c){
      return {"&":"&amp;","<":"&lt;",">":"&gt;"}[c];
    });
  };
  /* 组1: URL（避免 https:// 里 // 被误判为注释）；组2: 注释；组3: 字符串；组4: 关键字 */
  var TOKEN = /(https?:\/\/[^\s"'<>]*)|(\/\/[^\n]*|#[^\n]*|--[^\n]*)|('[^'\n]*'|"[^"\n]*"|`[^`\n]*)|(\b(?:const|let|var|function|return|if|else|for|while|import|from|export|new|await|async|def|class|require|res|req|true|false|null|None|SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|location|proxy_pass|add_header)\b)/g;
  var out = "", last = 0, m;
  TOKEN.lastIndex = 0;
  while((m = TOKEN.exec(code)) !== null){
    out += esc2(code.slice(last, m.index));
    var cls = m[2] ? "c" : m[3] ? "s" : m[4] ? "k" : null;
    out += cls ? '<span class="'+cls+'">'+esc2(m[0])+'</span>' : esc2(m[0]);
    last = m.index + m[0].length;
  }
  out += esc2(code.slice(last));
  return out;
}
function codeHTML(cd){
  if(!cd || !cd.code) return "";
  return '<div class="codeblock"><div class="chead"><span class="dots"><i></i><i></i><i></i></span>'+
    '<span>'+esc(cd.lang||"code")+'</span>'+
    (cd.label?'<span style="color:#7A7A85"> · '+esc(cd.label)+'</span>':"")+
    '<button class="copy-btn" data-code="'+esc(cd.code).replace(/"/g,'&quot;')+'">复制</button>'+
  '</div><pre>'+highlight(cd.code, cd.lang)+'</pre></div>';
}

/* ---------- views ---------- */
function homeView(){
  var total = 0, counts = {};
  Object.keys(CATS).forEach(function(k){ counts[k]=(DATA[k]||[]).length; total+=counts[k]; });
  var liveCats = Object.keys(CATS).filter(function(k){ return counts[k]>0; });
  /* H1: 数字并入分类卡片右上角（大号衬线数字+分类色），删掉单独统计行 */
  var catCards = liveCats.map(function(k){
    var c = CATS[k];
    return '<a class="cat-card rv" style="--c:'+c.color+'" href="#/c/'+k+'" data-nav>'+
      '<div class="cc-num" style="color:'+c.color+'">'+counts[k]+'</div>'+
      '<div class="emoji">'+c.icon+'</div><h3>'+c.name+'</h3><p>'+c.desc+'</p>'+
      '<div class="go">进入分类</div></a>';
  }).join("");
  /* H3: 精选改主次结构 —— 1 张深色主推卡 + 4 张小卡片 */
  var featCat = liveCats[0], feat = DATA[featCat][0];
  var fc = CATS[featCat];
  var smallPicks = [];
  liveCats.slice(1,5).forEach(function(k){ if(DATA[k][0]) smallPicks.push(DATA[k][0]); });
  var featHTML = '<a class="pick-hero rv" style="--c:'+fc.color+'" href="#/p/'+feat.id+'" data-nav>'+
    '<div class="ph-kicker">本周推荐 · '+fc.name+'</div>'+
    '<h3>'+esc(feat.name)+'</h3><p>'+esc(feat.tagline||"")+'</p>'+
    '<div class="ph-go">开始阅读 →</div></a>';
  var smallHTML = smallPicks.map(cardHTML).join("");
  return '<div class="hero"><div class="wrap">'+
    '<div class="hero-badge">🔍 每天都在用，却从没想过为什么</div>'+
    '<h1>习以为常的背后，<br><span class="hl">原来如此</span></h1>'+
    '<p class="lead">验证码为什么能认出你是人？扫码登录时手机和电脑说了什么悄悄话？'+
    '短链接一点就到，中间经历了什么？这里把 '+total+' 个技术概念逐个拆开——'+
    '用大白话讲原理，给开发者讲接入。</p>'+
    '</div></div>'+
  '<div class="wrap"><div class="cat-cards">'+catCards+'</div>'+
    '<div class="sec-head"><h2>精选</h2></div>'+
    '<div class="picks">'+featHTML+'<div class="picks-small">'+smallHTML+'</div></div>'+
    '<a class="all-btn rv" href="#/all" data-nav>浏览全部 '+total+' 篇 →</a>'+
    '<div style="height:24px"></div>'+
  '</div>';
}

function categoryView(cat){
  var c = CATS[cat]; if(!c) return notFoundView();
  var items = DATA[cat]||[];
  /* C2: 有子分组配置的分类按组渲染，否则保持平铺 */
  var sg = SUBGROUPS[cat], body;
  /* C1: 旅程已收录的文章不再在下方重复出现 */
  var journeyIds = {};
  var jn = JOURNEYS[cat];
  ((jn&&jn.nodes)||[]).forEach(function(id){ journeyIds[id]=1; });
  if(sg){
    var used = {};
    body = sg.map(function(g){
      var its = g.ids.map(function(id){ return BY_ID[id]; })
        .filter(function(x){ return x && x.category===cat && !journeyIds[x.id]; });
      its.forEach(function(x){ used[x.id] = 1; });
      if(!its.length) return "";
      return '<div class="subgroup"><div class="subgroup-head"><h3>'+esc(g.title)+'</h3>'+
        '<span class="count">'+its.length+' 篇</span>'+
        (g.tag?'<span class="tag">'+esc(g.tag)+'</span>':"")+'</div>'+
        '<div class="cards">'+its.map(cardHTML).join("")+'</div></div>';
    }).join("");
    var rest = items.filter(function(x){ return !used[x.id] && !journeyIds[x.id]; });
    if(rest.length){
      body += '<div class="subgroup"><div class="subgroup-head"><h3>更多文章</h3>'+
        '<span class="count">'+rest.length+' 篇</span></div>'+
        '<div class="cards">'+rest.map(cardHTML).join("")+'</div></div>';
    }
  } else {
    var nonJourney = items.filter(function(x){ return !journeyIds[x.id]; });
    var jCount = items.length - nonJourney.length;
    body = (jCount>0?'<div class="subgroup-head" style="margin-top:8px"><h3>更多文章</h3><span class="count">'+nonJourney.length+' 篇</span></div>':"")+
      '<div class="cards" style="margin-bottom:24px">'+nonJourney.map(cardHTML).join("")+'</div>';
  }
  var j = JOURNEYS[cat];
  var journey = "";
  if(j){
    var nodes = j.nodes.map(function(id, i){
      var it = BY_ID[id];
      if(!it) return "";
      return '<li class="chain-item rv"><a href="#/p/'+id+'" data-nav>'+
        '<span class="chain-num">'+(i+1)+'</span>'+
        '<span class="chain-body"><span class="chain-name">'+esc(it.name)+'</span>'+
        '<span class="chain-tag">'+esc(it.tagline||"")+'</span></span>'+
        '<span class="chain-go">→</span></a></li>';
    }).join("");
    journey = '<div class="chain" style="--c:'+c.color+'">'+
      '<div class="chain-bg" aria-hidden="true"><i></i><i></i><i></i></div>'+
      '<div class="chain-head"><span class="chain-title">🧭 '+esc(j.title)+'</span>'+
      '<span class="chain-desc">'+esc(j.desc)+'</span></div>'+
      '<ol class="chain-list">'+nodes+'</ol></div>';
  }
  return '<div class="wrap cat-page" style="--c:'+c.color+'"><div class="cat-hero">'+
    '<span class="kicker">'+c.en+' · '+(DATA[cat]||[]).length+' 篇</span>'+
    '<h1>'+c.icon+' '+c.name+'</h1><p>'+c.desc+'</p></div>'+
    journey+
    '<div style="margin-bottom:24px">'+body+'</div></div>';
}

function allView(){
  var secs = Object.keys(CATS).filter(function(k){ return (DATA[k]||[]).length>0; }).map(function(k){
    var c = CATS[k];
    return '<div class="sec-head" style="margin-top:48px"><h2>'+c.icon+' '+c.name+'</h2>'+
      '<span style="font-size:13px;color:var(--muted)">'+DATA[k].length+' 个</span>'+
      '<a class="more" href="#/c/'+k+'" data-nav>进入分类 →</a></div>'+
      '<div class="cards">'+DATA[k].map(cardHTML).join("")+'</div>';
  }).join("");
  return '<div class="wrap"><div class="cat-hero"><span class="kicker" style="background:var(--ink)">ALL · 全部文章</span>'+
    '<h1>📚 文章全览</h1><p>按分类浏览全部文章，点击任意卡片查看「原理 + 接入」的完整解读。</p></div>'+secs+'<div style="height:24px"></div></div>';
}

function detailView(id){
  var it = BY_ID[id]; if(!it) return notFoundView();
  var c = CATS[it.category];
  var others = DATA[it.category].filter(function(x){return x.id!==id;});
  var idx = DATA[it.category].findIndex(function(x){return x.id===id;});
  var prev = DATA[it.category][(idx-1+DATA[it.category].length)%DATA[it.category].length];
  var next = DATA[it.category][(idx+1)%DATA[it.category].length];

  var alias = (it.alias&&it.alias.length)?'<div class="alias-row">'+it.alias.map(function(a){return '<span class="alias">'+esc(a)+'</span>';}).join("")+'</div>':"";
  var stepsArr = it.principle.steps||[];
  /* A3: 流程图按阶段分组（有 flowGroups 数据时），两组并排，细竖线+圆形编号 */
  var flowGroups = it.principle.flowGroups;
  var flow;
  if(flowGroups && flowGroups.length){
    flow = '<div class="flow-groups">'+flowGroups.map(function(g){
      var gs = stepsArr.slice(g.from||0, g.to||stepsArr.length);
      var items = gs.map(function(s,i){
        var n = (g.from||0)+i+1;
        return '<li class="fg-step"><span class="fg-n" style="--gc:'+(g.color||'var(--c)')+'">'+n+'</span><p>'+esc(s)+'</p></li>';
      }).join("");
      return '<div class="flow-group"><div class="fg-head"><h4>'+esc(g.title)+'</h4>'+
        (g.sub?'<span class="fg-sub">'+esc(g.sub)+'</span>':"")+'</div>'+
        '<ol class="fg-list">'+items+'</ol></div>';
    }).join("")+'</div>';
  } else {
    flow = '<ol class="flow">'+stepsArr.map(function(s,i){
      var card = '<li class="fstep"><span class="n">'+(i+1)+'</span><p>'+esc(s)+'</p></li>';
      return i<stepsArr.length-1 ? card+'<li class="farrow" aria-hidden="true">↓</li>' : card;
    }).join("")+'</ol>';
  }
  var steps = stepsArr.length?'<div class="flow-label">📊 先看这张图——'+stepsArr.length+'步看懂全过程</div>'+flow:"";
  var paras = (it.principle.detail||"").split(/\n+/).map(function(p){return p.trim();}).filter(function(p){return p;});
  var detail = paras.map(function(p){return '<p>'+esc(p)+'</p>';}).join("");
  var deep = paras.length?'<div class="deep-label">📖 掰开揉碎，讲透每一步</div><div class="detail-text">'+detail+'</div>':"";
  /* 第二视角：不再是固定的"开发者接入"，而是按每篇读者的真实问题定制 */
  var gd = it.guide || {};
  var gEmoji = (gd.heading||"").split(" ")[0] || "🛠️";
  var gTitle = (gd.heading||"").replace(/^\S+\s*/,"") || "开发者：应该如何接入";
  /* A4: 路线卡片=「选哪条路」（可点选），when 改为副标题 */
  var opts = (gd.options||[]).map(function(o,i){
    return '<div class="opt opt-sel" data-opt="'+i+'" tabindex="0" role="button" aria-pressed="false">'+
      '<div class="on">'+esc(o.name)+'</div>'+
      (o.when?'<div class="ow-sub">'+esc(o.when)+'</div>':"")+
      '<div class="od">'+esc(o.desc||"")+'</div></div>';
  }).join("");
  /* A4: 动手清单=checkbox，进度存 localStorage */
  var dsteps = (gd.steps||[]).map(function(s,i){
    var key = "todo_"+it.id+"_"+i;
    return '<li><label class="todo-item"><input type="checkbox" data-todo-key="'+key+'">'+
      '<span class="todo-box" aria-hidden="true"></span><span class="todo-text">'+esc(s)+'</span></label></li>';
  }).join("");
  /* A5: 警告合并为单个 callout，每条拆成「误区：正解」，加粗前半句 */
  var pits = (gd.pitfalls||[]).map(function(p){
    var idx = p.search(/[:：]/);
    var head = idx>0 ? p.slice(0,idx) : p;
    var tail = idx>0 ? p.slice(idx+1) : "";
    return '<li><strong>'+esc(head)+'</strong>'+(tail?'：'+esc(tail):"")+'</li>';
  }).join("");
  var code = codeHTML(gd.code);
  var devBody = (opts?'<div class="deep-label" style="margin-top:34px">🧭 选一条路</div><div class="opt-grid">'+opts+'</div>':"")+
    (dsteps?'<div class="deep-label" style="margin-top:34px">✅ 动手清单</div><ol class="dev-steps todos">'+dsteps+'</ol>':"")+ code +
    (pits?'<div class="callout-warn"><div class="cw-head">⚠️ 这些坑别踩</div><ul class="cw-list">'+pits+'</ul></div>':"");
  var devSec = devBody?
    '<section class="dsec" id="sec-dev"><div class="dsec-head"><span class="num">'+esc(gd.num||"接")+'</span><h2>'+esc(gTitle)+'</h2><span class="en">'+esc(gd.en||"INTEGRATION")+'</span></div>'+
    devBody+'</section>' : "";
  /* A6: 浮动目录由 JS 从 h2/h3 动态生成，这里只放容器 */
  var anchor = '<nav class="toc" id="detailToc" aria-label="页面目录"></nav>';
  var srcs = (it.sources||[]).map(function(s){
    return '<li><a href="'+esc(s.url)+'" target="_blank" rel="noopener">'+esc(s.title||s.url)+
      '<span class="ext">↗ 外部链接</span></a></li>';
  }).join("");

  return '<div class="wrap" style="--c:'+c.color+'"><div class="prose">'+
    '<div class="detail-hero"><div class="crumb"><a href="#/" data-nav>首页</a><span class="sep">/</span>'+
      '<a href="#/c/'+it.category+'" data-nav>'+c.name+'</a><span class="sep">/</span>'+esc(it.name)+'</div>'+
      '<span class="kicker">'+c.icon+' '+c.name+'</span>'+
      '<h1>'+esc(it.name)+'</h1>'+
      '<div class="tagline">'+esc(it.tagline||"")+'</div>'+alias+'</div>'+
    '<div class="scene-lead" id="sec-scene"><div class="label">👀 日常场景</div><p>'+esc(it.scene||"")+'</p></div>'+

    '<section class="dsec" id="sec-principle"><div class="dsec-head"><span class="num">原</span><h2>原理：它是怎么运作的</h2><span class="en">HOW IT WORKS</span></div>'+
      '<div class="psummary"><span class="plabel">💡 一句话说透</span><p>'+esc(it.principle.summary||"")+'</p></div>'+
      steps+deep+'</section>'+

    devSec +

    (srcs?'<section class="dsec" id="sec-read"><div class="dsec-head"><span class="num">读</span><h2>延伸阅读</h2><span class="en">READ MORE</span></div><ul class="sources">'+srcs+'</ul></section>':"")+

    '<div class="pn-nav">'+
      '<a class="pn" href="#/p/'+prev.id+'" data-nav><div class="dir">← 上一个</div><div class="nm">'+esc(prev.name)+'</div></a>'+
      '<a class="pn next" href="#/p/'+next.id+'" data-nav><div class="dir">下一个 →</div><div class="nm">'+esc(next.name)+'</div></a>'+
    '</div>'+
    '<div class="fb-banner rv"><div><strong>发现讲得不对的地方？</strong><span>较真的人最可爱，欢迎指出来。</span></div>'+
    '<a href="mailto:voyager06@163.com?subject='+encodeURIComponent('【纠错】'+it.name)+'">✉️ 写邮件纠错</a></div>'+
  '</div></div>'+anchor;
}

function aboutView(){
  return '<div class="wrap"><div class="prose"><div class="about-hero">'+
    '<h1>🔍 关于「原来如此」</h1></div><div class="about-body">'+
    '<p>你有没有过这样的时刻：输完短信验证码，忽然好奇——这串数字是怎么在几秒钟内从服务器跑到你手机上的？'+
    '扫码登录时，手机和电脑之间到底说了什么悄悄话？为什么 12306 的验证码越来越难，而有些网站却什么都不用点就能「无感通过」？</p>'+
    '<p>我们每天都在和几十个这样的小功能打交道：验证码、人机验证、扫码登录、短链接、页面跳转、懒加载、骨架屏、暗黑模式……'+
    '它们太常见了，常见到我们习以为常，从没想过它们是怎么工作的。</p>'+
    '<p>这个网站想做的，就是把这些「习以为常」逐个拆开。每一篇都从两个维度讲透：</p>'+
    '<div class="dim-grid">'+
      '<div class="dim"><h4>🧠 学习者视角</h4><p>它的工作原理是什么？数据在手机、浏览器、服务器之间如何流转？为什么这样设计就能防住坏人？用大白话讲，不需要你会写代码。</p></div>'+
      '<div class="dim"><h4>🛠️ 开发者视角</h4><p>如果我要做一个，应该怎么接入？有哪些现成方案？前后端各自要做什么？有哪些坑是前人踩过的？</p></div>'+
    '</div>'+
    '<h3>内容是怎么组织的</h3>'+
    '<p>八大分类：<strong>验证与安全</strong>（证明「你是谁」的一切手段）、'+
    '<strong>跳转与导航</strong>（一次点击之后，请求去了哪里）、'+
    '<strong>小功能大智慧</strong>（那些你从没注意过、但缺了会很难受的细节）、'+
    '<strong>后端基建</strong>、<strong>网络与协议</strong>、<strong>工程与协作</strong>、'+
    '<strong>AI 与大模型</strong>、<strong>影音媒体</strong>。</p>'+
    '<p>每篇文章统一包含：日常场景 → 原理图解 → 开发者接入方案 → 真实踩坑 → 延伸阅读。'+
    '建议从你最熟悉的场景开始，比如每天都在输的短信验证码。</p>'+
    '<h3>免责声明</h3>'+
    '<p>本站内容为科普解读，技术细节可能随产品迭代而变化；实际接入请务必以各服务的官方文档为准。'+
    '如果你发现某处讲得不对，欢迎指出——较真的人最可爱。</p>'+
  '</div></div></div>';
}

function contactView(){
  var mail = "voyager06@163.com";
  var fbCards = [
    {icon:"🐛", title:"纠错", desc:"哪篇文章、哪段讲得不对？贴上原文和你的理解，较真的人最可爱。",
     subject:"【纠错】", btn:"写邮件纠错"},
    {icon:"💡", title:"选题建议", desc:"有没有哪个「习以为常」你一直好奇？告诉我，下篇可能就写它。",
     subject:"【选题建议】", btn:"提个选题"},
    {icon:"💬", title:"闲聊 / 合作", desc:"技术交流、转载、合作，或者单纯打个招呼，都欢迎。",
     subject:"【你好】", btn:"发邮件聊聊"}
  ].map(function(f){
    return '<div class="fb-card rv"><div class="fb-icon">'+f.icon+'</div>'+
      '<h3>'+f.title+'</h3><p>'+f.desc+'</p>'+
      '<a class="fb-btn" href="mailto:'+mail+'?subject='+encodeURIComponent(f.subject)+'">✉️ '+f.btn+'</a></div>';
  }).join("");
  return '<div class="wrap"><div class="prose"><div class="contact-hero rv">'+
    '<span class="kicker">📮 联系与反馈</span>'+
    '<h1>有话想说？<br>直接来找我</h1>'+
    '<p class="lead">纠错、选题、闲聊、合作——所有邮件我都会看。'+
    '如果是纠错，请带上文章名和具体段落，改起来最快。</p></div>'+
    '<div class="author-card rv">'+
      '<div class="author-avatar">🔍</div>'+
      '<div class="author-info"><h3>Times</h3>'+
      '<p>西南交大通信工程在读，「原来如此」的作者。相信每个习以为常的小功能背后，都有一套值得讲透的机制。</p>'+
      '<div class="author-links">'+
        '<a href="mailto:'+mail+'">✉️ '+mail+'</a>'+
        '<a href="https://www.xiaohongshu.com" target="_blank" rel="noopener">📕 小红书 @Time flies</a>'+
        '<a href="https://www.voyager06.tech" target="_blank" rel="noopener">🌐 个人网站</a>'+
        '<a href="https://github.com/Times-spec" target="_blank" rel="noopener">💻 GitHub</a>'+
      '</div></div></div>'+
    '<div class="sec-head"><h2>你想说什么？</h2></div>'+
    '<div class="fb-grid">'+fbCards+'</div>'+
    '<div class="fb-note rv"><p>📝 偏好填表单？也可以直接发邮件，正文写清 <strong>文章名 + 问题 + 你的理解</strong> 三件套就行。'+
    '一般 1–3 天内回复，纠错类优先处理。</p></div>'+
  '</div></div>';
}

function notFoundView(){
  return '<div class="wrap"><div class="prose" style="text-align:center;padding:100px 0">'+
    '<div style="font-size:64px">🧭</div><h1 style="font-family:var(--serif);margin:16px 0">这个页面走丢了</h1>'+
    '<p style="color:var(--muted)">可能是链接过期，或者文章还在赶来的路上。</p>'+
    '<a href="#/" data-nav style="display:inline-block;margin-top:20px;background:var(--ink);color:#fff;padding:10px 28px;border-radius:12px">回到首页</a></div></div>';
}

/* ---------- router ---------- */
function route(){
  var h = location.hash || "#/";
  var m;
  var html;
  if(h==="#/"||h==="#") html = homeView();
  else if(h==="#/all") html = allView();
  else if(h==="#/about") html = aboutView();
  else if(h==="#/contact") html = contactView();
  else if((m=h.match(/^#\/c\/(\w+)$/))) html = categoryView(m[1]);
  else if((m=h.match(/^#\/p\/([\w-]+)$/))) html = detailView(m[1]);
  else html = notFoundView();
  app.innerHTML = html;
  window.scrollTo(0,0);
  document.querySelectorAll('.header-nav a').forEach(function(a){
    var href = a.getAttribute('href');
    a.classList.toggle('active',
      (h==="#/" && a.dataset.route==="home") ||
      (href && href!=="#/" && h.indexOf(href)===0));
  });
  var catM2 = h.match(/^#\/c\/(\w+)$/);
  document.getElementById('catDropBtn').classList.toggle('active', !!catM2);
  closeCatMenu();
  revealInit();
  anchorInit();
  todoInit();
  optInit();
  var title = "原来如此 · 把听说过的技术讲透";
  if((m=h.match(/^#\/p\/([\w-]+)$/)) && BY_ID[m[1]]) title = BY_ID[m[1]].name+" · 原来如此";
  document.title = title;
}

/* ---------- category dropdown ---------- */
var catDrop = document.getElementById('catDrop');
var catDropBtn = document.getElementById('catDropBtn');
var catDropPanel = document.getElementById('catDropPanel');
function buildCatMenu(){
  catDropPanel.innerHTML = Object.keys(CATS).filter(function(k){
    return (DATA[k]||[]).length>0;
  }).map(function(k){
    var c = CATS[k];
    return '<a class="cat-item" href="#/c/'+k+'" data-nav>'+
      '<span class="ci-icon">'+c.icon+'</span>'+
      '<span class="ci-name">'+c.name+'</span>'+
      '<span class="ci-count">'+DATA[k].length+' 篇</span></a>';
  }).join("");
}
function closeCatMenu(){ catDrop.classList.remove('open'); catDropPanel.hidden = true; }
catDropBtn.addEventListener('click', function(e){
  e.stopPropagation();
  var willOpen = !catDrop.classList.contains('open');
  closeCatMenu();
  if(willOpen){ catDrop.classList.add('open'); catDropPanel.hidden = false; }
});
document.addEventListener('click', function(e){
  if(!e.target.closest('.nav-drop')) closeCatMenu();
});
document.addEventListener('keydown', function(e){
  if(e.key==="Escape") closeCatMenu();
});

/* ---------- A6: 浮动目录 —— 从 h2/.deep-label 动态生成，滚动高亮 ---------- */
var anchorIO;
function anchorInit(){
  var toc = document.getElementById('detailToc');
  if(anchorIO) anchorIO.disconnect();
  if(!toc) return;
  /* 收集 L1（.dsec-head h2）和 L2（.deep-label） */
  var items = [];
  document.querySelectorAll('.prose .dsec').forEach(function(sec){
    var h2 = sec.querySelector('.dsec-head h2');
    if(!h2) return;
    if(!sec.id) sec.id = 'sec-'+items.length;
    items.push({id: sec.id, text: h2.textContent.trim(), lv: 1, el: sec});
    sec.querySelectorAll('.deep-label').forEach(function(dl, i){
      var id = sec.id+'-sub'+i;
      dl.id = id;
      /* 去掉 emoji 前缀，目录保持安静 */
      var t = dl.textContent.trim().replace(/^[\u{1F300}-\u{1FAFF}\u2600-\u27BF\u2B00-\u2BFF]\s*/u, '');
      items.push({id: id, text: t, lv: 2, el: dl});
    });
  });
  if(items.length < 2){ toc.style.display='none'; return; }
  toc.style.display='';
  toc.innerHTML = '<div class="toc-title">目录</div>'+items.map(function(it){
    return '<a class="toc-l'+it.lv+'" data-target="'+it.id+'">'+esc(it.text)+'</a>';
  }).join("");
  var links = toc.querySelectorAll('a');
  anchorIO = new IntersectionObserver(function(es){
    es.forEach(function(e){
      if(e.isIntersecting){
        links.forEach(function(l){ l.classList.toggle('active', l.dataset.target===e.target.id); });
      }
    });
  },{rootMargin:'-20% 0px -70% 0px'});
  items.forEach(function(it){ anchorIO.observe(it.el); });
  links.forEach(function(l){
    l.addEventListener('click',function(){
      var el = document.getElementById(l.dataset.target);
      if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}

/* ---------- reveal on scroll ---------- */
var io;
function revealInit(){
  var els = document.querySelectorAll('.rv');
  if(!('IntersectionObserver' in window)){ return; }
  /* B3: 只有 Observer 可用时才加上 js-reveal，启用隐藏状态 */
  document.documentElement.classList.add('js-reveal');
  if(io) io.disconnect();
  io = new IntersectionObserver(function(es){
    es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.08});
  els.forEach(function(e){ io.observe(e); });
}

/* ---------- search ---------- */
var overlay = document.getElementById('searchOverlay');
var sInput = document.getElementById('searchInput');
var sResults = document.getElementById('searchResults');
var selIdx = 0, curList = [];

function openSearch(){ overlay.hidden=false; sInput.value=""; renderSearch(""); setTimeout(function(){sInput.focus();},30); }
function closeSearch(){ overlay.hidden=true; }
function allItems(){
  var a=[]; Object.keys(CATS).forEach(function(k){ a=a.concat(DATA[k]); }); return a;
}
function renderSearch(q){
  q = q.trim().toLowerCase();
  var items = allItems();
  curList = q ? items.filter(function(it){
    var hay = (it.name+" "+it.tagline+" "+(it.alias||[]).join(" ")+" "+
      (it.principle?it.principle.summary:"")+" "+(it.scene||"")).toLowerCase();
    return hay.indexOf(q)>=0;
  }).slice(0,12) : items.slice(0,8);
  selIdx = 0;
  if(!curList.length){
    sResults.innerHTML='<div class="search-empty"><div class="se-icon">🛰️</div><div>没找到「'+esc(q)+'」</div><div class="se-hint">换个关键词试试，比如：验证码、缓存、代理、Transformer</div></div>';
    return;
  }
  sResults.innerHTML = curList.map(function(it,i){
    var c = CATS[it.category];
    return '<div class="search-item'+(i===0?" selected":"")+'" data-id="'+it.id+'">'+
      '<span class="dot" style="background:'+c.color+'"></span>'+
      '<span class="nm">'+esc(it.name)+'</span>'+
      '<span class="tg">'+esc(it.tagline||"")+'</span></div>';
  }).join("");
  sResults.querySelectorAll('.search-item').forEach(function(el){
    el.addEventListener('click',function(){ location.hash="#/p/"+el.dataset.id; closeSearch(); });
    el.addEventListener('mousemove',function(){
      sResults.querySelectorAll('.search-item').forEach(function(x){x.classList.remove('selected');});
      el.classList.add('selected');
      selIdx = curList.findIndex(function(it){return it.id===el.dataset.id;});
    });
  });
}
function moveSel(d){
  if(!curList.length) return;
  selIdx = (selIdx+d+curList.length)%curList.length;
  var els = sResults.querySelectorAll('.search-item');
  els.forEach(function(x){x.classList.remove('selected');});
  if(els[selIdx]){ els[selIdx].classList.add('selected'); els[selIdx].scrollIntoView({block:'nearest'}); }
}

/* ---------- B2: 手机端底部抽屉导航 ---------- */
var menuWrap = document.getElementById('menuSheetWrap');
var menuList = document.getElementById('menuSheetList');
function buildMenuSheet(){
  if(!menuList || !DATA) return;
  menuList.innerHTML = Object.keys(CATS).filter(function(k){
    return (DATA[k]||[]).length>0;
  }).map(function(k){
    var c = CATS[k];
    return '<a href="#/c/'+k+'" data-nav>'+
      '<span class="ci-icon">'+c.icon+'</span>'+
      '<span class="ci-name">'+c.name+'</span>'+
      '<span class="ci-count">'+DATA[k].length+' 篇</span></a>';
  }).join("");
}
function openMenu(){ buildMenuSheet(); if(menuWrap) menuWrap.hidden = false; }
function closeMenu(){ if(menuWrap) menuWrap.hidden = true; }
on('menuTrigger','click',function(e){ e.stopPropagation(); openMenu(); });
if(menuWrap){
  menuWrap.addEventListener('click',function(e){
    if(e.target===menuWrap || e.target.closest('a')) closeMenu();
  });
}
document.addEventListener('keydown',function(e){
  if(e.key==="Escape") closeMenu();
});

/* ---------- A4: 动手清单 checkbox + localStorage ---------- */
function todoInit(){
  try{
    document.querySelectorAll('input[data-todo-key]').forEach(function(box){
      var key = box.getAttribute('data-todo-key');
      box.checked = localStorage.getItem(key)==="1";
      box.addEventListener('change',function(){
        try{ localStorage.setItem(key, box.checked?"1":"0"); }catch(e){}
      });
    });
  }catch(e){}
}

/* ---------- A4: 路线卡片点选 ---------- */
function optInit(){
  document.querySelectorAll('.opt-sel').forEach(function(el){
    var toggle = function(){
      var on = el.classList.toggle('sel');
      el.setAttribute('aria-pressed', on?"true":"false");
    };
    el.addEventListener('click', toggle);
    el.addEventListener('keydown', function(e){
      if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggle(); }
    });
  });
}

/* ---------- events ---------- */
/* 安全绑定：元素缺失时跳过，绝不让单个元素拖死全站 */
function on(id, ev, fn){
  var el = document.getElementById(id);
  if(el) el.addEventListener(ev, fn);
  else if(window.console) console.warn('[原来如此] 缺少元素 #' + id);
  return el;
}
on('searchTrigger','click',openSearch);
overlay.addEventListener('click',function(e){ if(e.target===overlay) closeSearch(); });
sInput.addEventListener('input',function(){ renderSearch(sInput.value); });
sInput.addEventListener('keydown',function(e){
  if(e.key==="Escape") closeSearch();
  else if(e.key==="ArrowDown"){ e.preventDefault(); moveSel(1); }
  else if(e.key==="ArrowUp"){ e.preventDefault(); moveSel(-1); }
  else if(e.key==="Enter"&&curList[selIdx]){ location.hash="#/p/"+curList[selIdx].id; closeSearch(); }
});
document.addEventListener('keydown',function(e){
  if(e.key==="/" && document.activeElement!==sInput && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)){
    e.preventDefault(); openSearch();
  } else if(e.key==="Escape"&&!overlay.hidden){ closeSearch(); }
});
document.addEventListener('click',function(e){
  var b = e.target.closest('.copy-btn');
  if(b){
    var t = b.getAttribute('data-code');
    navigator.clipboard.writeText(t).then(function(){
      b.textContent="已复制 ✓"; setTimeout(function(){b.textContent="复制";},1600);
    }).catch(function(){ b.textContent="复制失败"; });
  }
});
window.addEventListener('hashchange',route);
window.addEventListener('scroll',function(){
  var sh = document.getElementById('siteHeader');
  var bt = document.getElementById('backTop');
  var sp = document.getElementById('scrollProgress');
  if(sh) sh.classList.toggle('scrolled',window.scrollY>10);
  if(bt) bt.classList.toggle('show',window.scrollY>500);
  if(sp){
    var d = document.documentElement;
    var p = d.scrollTop/(d.scrollHeight-d.clientHeight||1)*100;
    sp.style.width = p+"%";
  }
},{passive:true});
on('backTop','click',function(){
  window.scrollTo({top:0,behavior:'smooth'});
});

/* ---------- boot ---------- */
var CONTENT_FILES = ['security','security-extra','navigation','features','backend','backend-extra','network','network-extra','network-clash','network-ip','engineering','engineering-extra','engineering-qa','multimodal','ai','ai-extra','media'];
Promise.all(CONTENT_FILES.map(function(f){
  return fetch('content/'+f+'.json').then(function(r){
    if(!r.ok) throw new Error(f);
    return r.json();
  }).catch(function(){ return []; });
})).then(function(lists){
  DATA = {};
  lists.forEach(function(list){
    list.forEach(function(it){
      if(!it || !it.category || !it.id) return;
      if(!DATA[it.category]) DATA[it.category] = [];
      DATA[it.category].push(it);
      BY_ID[it.id] = it;
    });
  });
  buildCatMenu();
  route();
}).catch(function(err){
  app.innerHTML = '<div class="wrap"><div class="prose" style="text-align:center;padding:100px 0">'+
    '<div style="font-size:56px">📦</div><h2 style="font-family:var(--serif);margin:16px 0">内容加载失败</h2>'+
    '<p style="color:var(--muted)">请检查 content 目录下的 JSON 文件是否存在且格式正确。</p></div></div>';
  console.error(err);
});

})();
