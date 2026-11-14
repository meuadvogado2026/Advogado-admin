const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
 const browser = await chromium.launch({headless:true,channel:"chrome"});
 const page = await browser.newPage({viewport:{width:1366,height:900}});
 const errors=[];page.on("pageerror",e=>errors.push(e.name));
 const cities=Array.from({length:54},(_,i)=>({id:`city-${i}`,stateId:"sp",name:`Cidade ${String(i).padStart(2,"0")}`,active:true}));
 cities.unshift({id:"other-state",stateId:"mg",name:"São Paulo",active:true});
 cities.push({id:"sao-paulo",stateId:"sp",name:"São Paulo",active:true},{id:"campinas",stateId:"sp",name:"Campinas",active:false,center:{lat:-22,lng:-47}});
 let dashboardMode="normal", holdDashboard=false, releaseDashboard;
 const dashboardData={generatedAt:"2026-11-14T20:00:00Z",users:{total:27,clients:23,lawyerAccounts:4,blocked:1,newLast30Days:5},lawyers:{total:10,available:6,approvedUnavailable:2,statuses:{approved:8,pending_review:1,draft:1,rejected:0,suspended:0}},coverage:{activeCities:12,servedCities:4,unservedCities:8,percentage:33.3,servedStates:2},regions:[{name:"Sudeste",count:8,percentage:80},{name:"Centro-Oeste",count:1,percentage:10},{name:"Não informado",count:1,percentage:10}],states:[{code:"SP",name:"São Paulo",count:8,available:5,percentage:80},{code:"DF",name:"Distrito Federal",count:1,available:1,percentage:10},{code:"--",name:"Não informado",count:1,available:0,percentage:10}]};
 const writes=[];const reads=[];
 await page.route("**/auth/v1/token?grant_type=password",r=>r.fulfill({json:{access_token:"fixture-token"}}));
 await page.route("http://localhost:3333/v1/**",async route=>{
  const request=route.request(),u=new URL(request.url()),p=u.pathname,method=request.method();let body={};
  if(method!=="GET") writes.push({path:p,method,body:request.postDataJSON()});else reads.push(u.search);
  if(p==="/v1/admin/dashboard"){
   if(holdDashboard)await new Promise(resolve=>{releaseDashboard=resolve;});
   if(dashboardMode==="error"){await route.fulfill({status:502,json:{error:{message:"Unavailable"}}});return;}
   body=dashboardMode==="zero"?{...dashboardData,users:{total:0,clients:0,lawyerAccounts:0,blocked:0,newLast30Days:0},lawyers:{total:0,available:0,approvedUnavailable:0,statuses:{approved:0,pending_review:0,draft:0,rejected:0,suspended:0}},coverage:{activeCities:0,servedCities:0,unservedCities:0,percentage:0,servedStates:0},regions:dashboardData.regions.map(r=>({...r,count:0,percentage:0})),states:[]}:dashboardData;
  }else if(p==="/v1/me")body={user:{id:"admin",email:"qa@example.test",role:"admin"}};
  else if(p==="/v1/areas")body={areas:[{id:"civil",name:"Direito Civil"}]};
  else if(p==="/v1/admin/states")body={states:[{id:"sp",code:"SP",name:"São Paulo",active:true},{id:"mg",code:"MG",name:"Minas Gerais",active:true},{id:"go",code:"GO",name:"Goiás",active:true}]};
  else if(p==="/v1/admin/cities"){
   let items=cities.filter(c=>(!u.searchParams.get("stateId")||u.searchParams.get("stateId")===c.stateId)&&(u.searchParams.get("includeInactive")==="true"||c.active));
   const page=+(u.searchParams.get("page")||1),pageSize=50;
   body={cities:items.slice((page-1)*pageSize,page*pageSize),pagination:{page,pageSize,total:items.length,totalPages:Math.ceil(items.length/pageSize)}};
  }else if(p==="/v1/admin/cities/campinas"&&method==="PATCH"){
   const city=cities.find(c=>c.id==="campinas");city.active=true;body={city};
  }else if(p.includes("prayer"))body={requests:[{id:"prayer",status:"read",message:"Mensagem de teste sem dados sensíveis.",anonymous:false,client:{name:"Pessoa de teste com nome bastante extenso",email:"identificacao.muito.longa.para.validar.quebra.de.linha@example.test"},createdAt:"2026-11-14T15:00:00Z",readAt:"2026-11-14T16:00:00Z"}].flatMap(item => [item, {...item,id:"prayer-2"}, {...item,id:"prayer-3",anonymous:true,client:null}]),persistence:"fixture"};
  else if(p.includes("lawyers"))body={lawyers:[],persistence:"fixture"};
  else if(p.includes("users"))body={users:[],persistence:"fixture"};
  else if(p.includes("deletion"))body={requests:[]};
  await route.fulfill({json:body});
 });
 const results=[];
 try{
  await page.goto(process.env.ADMIN_UI_URL||"http://127.0.0.1:5183");
  await page.getByLabel("Email",{exact:true}).fill("qa@example.test");
  await page.getByLabel("Senha",{exact:true}).fill("fixture-password");
  await page.getByRole("button",{name:"Entrar",exact:true}).click();
  await page.locator(".nav-button").first().waitFor();
  await page.locator('[data-metric="Clientes cadastrados"] strong').filter({hasText:"23"}).waitFor();
  assert.equal(await page.locator('[data-metric="Usuários do app"] strong').textContent(),"27");
  assert.equal(await page.locator('[data-metric="Advogados cadastrados"] strong').textContent(),"10");
  for(const width of [1366,1024,768,390]){
   await page.setViewportSize({width,height:1000});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),`Dashboard horizontal overflow ${width}`);
   await page.screenshot({path:`harness-results/dashboard-${width}.png`,fullPage:true});
  }
  await page.setViewportSize({width:1366,height:900});
  dashboardMode="error";
  await page.getByRole("button",{name:"Atualizar indicadores",exact:true}).click();
  await page.getByRole("alert").filter({hasText:"Não foi possível carregar os indicadores"}).waitFor();
  assert.equal(await page.locator("[data-metric]").count(),0);
  dashboardMode="zero";await page.getByRole("button",{name:"Tentar novamente",exact:true}).click();
  await page.getByText(/A plataforma ainda não tem usuários/).waitFor();
  assert.equal(await page.locator('[data-metric="Usuários do app"] strong').textContent(),"0");
  dashboardMode="normal";holdDashboard=true;
  await page.getByRole("button",{name:"Atualizar indicadores",exact:true}).click();
  await page.getByRole("status").filter({hasText:"Carregando indicadores"}).waitFor();
  while(!releaseDashboard)await new Promise(r=>setTimeout(r,10));
  holdDashboard=false;releaseDashboard();
  await page.locator('[data-metric="Clientes cadastrados"] strong').filter({hasText:"23"}).waitFor();
  await page.locator(".priority-action").filter({hasText:"Advogados aguardando análise"}).click();
  assert.equal(await page.locator(".lawyers-workspace .filters-row select").inputValue(),"pending_review");
  results.push("dashboard com valores reais do contrato, prioridades, loading, falha sem zeros e base vazia");
  assert.equal(await page.locator(".nav-button").filter({hasText:/Novo Advogado|Operacao/}).count(),0);
  await page.locator(".nav-button").filter({hasText:"Usuarios"}).click();
  assert.equal(await page.getByRole("button",{name:"Novo advogado",exact:true}).count(),0);
  await page.locator(".nav-button").filter({hasText:"Advogados"}).click();
  assert.equal(await page.getByRole("button",{name:"Novo advogado",exact:true}).count(),1);
  await page.getByRole("button",{name:"Novo advogado",exact:true}).click();
  await page.getByRole("heading",{name:"Novo advogado",exact:true}).waitFor();
  results.push("menu e cadastro interno preservados");
  await page.locator(".nav-button").filter({hasText:"Estados e Cidades"}).click();
  await page.getByLabel("Estado da cidade").selectOption("sp");
  await page.getByLabel("Consultar cidades do estado").selectOption("go");
  await page.getByText(/Nenhuma cidade encontrada com esses filtros/).waitFor();
  await page.getByLabel("Consultar cidades do estado").selectOption("sp");
  await page.getByLabel("Buscar cidade",{exact:true}).fill("sao");
  await page.locator(".location-record strong").filter({hasText:"SP - São Paulo"}).waitFor();
  assert.equal(await page.locator(".location-record strong").filter({hasText:"MG - São Paulo"}).count(),0);
  await page.getByLabel("Buscar cidade",{exact:true}).fill("");
  await page.getByLabel("Situação da cidade").selectOption("inactive");
  await page.locator(".location-record strong").filter({hasText:"Campinas"}).waitFor();
  assert.equal(await page.locator(".location-record strong").filter({hasText:"SP - São Paulo"}).count(),0);
  await page.getByLabel("Situação da cidade").selectOption("active");
  results.push("consulta de cidades por estado/nome/situacao, vazio claro e sem misturar estados");
  await page.getByLabel("Cidade",{exact:true}).fill(" sÃO pAuLo ");
  await page.getByRole("button",{name:"Cadastrar cidade",exact:true}).click();
  await page.getByText(/já está cadastrada e ativa/).waitFor();
  assert.equal(writes.length,0);
  assert.ok(reads.some(q=>q.includes("page=2")));
  await page.locator(".location-record strong").filter({hasText:"SP - São Paulo"}).waitFor();
  results.push("cidade ativa identificada apos pagina 1 e restrita ao estado");
  await page.getByLabel("Cidade",{exact:true}).fill("Campinas");
  await page.getByRole("button",{name:"Cadastrar cidade",exact:true}).click();
  await page.getByRole("button",{name:"Reativar cidade",exact:true}).waitFor();
  assert.equal(writes.length,0);
  await page.getByRole("button",{name:"Cancelar",exact:true}).click();
  assert.equal(writes.length,0);
  await page.getByRole("button",{name:"Cadastrar cidade",exact:true}).click();
  await page.getByRole("button",{name:"Reativar cidade",exact:true}).click();
  await page.getByText(/reativada com sucesso/).waitFor();
  assert.deepEqual(writes,[{path:"/v1/admin/cities/campinas",method:"PATCH",body:{active:true}}]);
  results.push("reativacao exige escolha e preserva cidade sem POST");
  await page.locator(".nav-button").filter({hasText:"Oracoes"}).click();
  await page.getByRole("button",{name:"Reabrir",exact:true}).first().waitFor();
  for(const width of [1366,1024,768,390]){
   await page.setViewportSize({width,height:1000});
   const bounds=await page.locator(".request-item").evaluateAll(cards=>cards.map(card=>{
    const c=card.getBoundingClientRect(),b=card.querySelector("button").getBoundingClientRect(),text=card.querySelector("small").getBoundingClientRect();
    return {inside:b.left>=c.left&&b.right<=c.right&&b.bottom<=c.bottom&&text.right<=c.right,overflow:card.scrollWidth>card.clientWidth};
   }));
   assert.ok(bounds.length===3 && bounds.every(b=>b.inside&&!b.overflow),`Card overflow at ${width}: ${JSON.stringify(bounds)}`);
   await page.screenshot({path:`harness-results/admin-regression-${width}.png`,fullPage:true});
  }
  results.push("cartao e acao contidos em 1366/1024/768/390px");
  assert.deepEqual(errors,[]);
  fs.writeFileSync("harness-results/admin-regression.json",JSON.stringify({ok:true,results},null,2));
  console.log(JSON.stringify({ok:true,results}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
