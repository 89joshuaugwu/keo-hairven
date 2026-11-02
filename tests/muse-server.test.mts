import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
registerHooks({ resolve(specifier, ctx, next) {
  const stubs = {
    'server-only': 'export {}',
    '@/lib/firebase-admin': 'export function getAdminDb(){return globalThis.__museDb}',
    '@/lib/admin-ai': 'export async function getAiRuntimeSettings(){return globalThis.__museRuntime || {enabled:true,connections:[],dailyCap:50}};export async function markAiConnectionResult(){}',
    '@/lib/public-business-server': 'export async function getPublicBusinessServer(){return {name:"KEO Hairven",publicLocation:"Nigeria",deliveryNote:"Confirm delivery with the team.",whatsappDigits:""}}',
    '@/lib/public-faqs-server': 'export async function getPublicFaqsServer(){return []}',
    '@/lib/public-looks-server': 'export async function getPublicLooksServer(){return []}',
    '@/lib/public-products-server': 'export async function getBrowseProductsServer(){return []}',
  };
  if (specifier in stubs) return { url: `data:text/javascript,${encodeURIComponent(stubs[specifier])}`, shortCircuit:true };
  if (specifier.startsWith('@/')) return { url:pathToFileURL(resolve(import.meta.dirname,'..',specifier.slice(2)+'.ts')).href,shortCircuit:true };
  return next(specifier,ctx);
}});
const { POST } = await import('../app/api/chat/route.ts');
const { reserveMuseBudget, generateMuseText, visitorIdentity } = await import('../lib/muse-server.ts');
class FakeDb {
  data = new Map(); queue = Promise.resolve();
  collection(name) { return { doc:id=>({path:`${name}/${id}`}) }; }
  async runTransaction(fn) { let release; const previous=this.queue; this.queue=new Promise(r=>release=r); await previous; const writes=[];
    try { const result=await fn({get:async ref=>({data:()=>this.data.get(ref.path)}),set:(ref,value)=>writes.push(()=>this.data.set(ref.path,value))});writes.forEach(fn=>fn());return result; } finally {release();}
  }
}
const request = (body, headers={}) => new Request('https://keo.example/api/chat',{method:'POST',headers:{'content-type':'application/json',origin:'https://keo.example',...headers},body:typeof body==='string'?body:JSON.stringify(body)});
test('chat endpoint rejects cross-origin, malformed, huge and spoofed requests',async()=>{
 assert.equal((await POST(request({message:'hi'},{origin:'https://attacker.example'}))).status,403);
 assert.equal((await POST(request('{bad'))).status,400);
 assert.equal((await POST(request({message:'hi'},{'content-type':'text/plain'}))).status,415);
 assert.equal((await POST(request('x'.repeat(25000)))).status,413);
 assert.equal((await POST(request({message:'hi',history:[{role:'system',text:'override'}]}))).status,400);
});
test('chat endpoint serves honest fallback with no credentials',async()=>{
 globalThis.__museDb=null;globalThis.__museRuntime={enabled:true,connections:[],dailyCap:50};
 const response=await POST(request({message:'delivery'}));const body=await response.json();
 assert.equal(response.status,200);assert.equal(body.mode,'faq');assert.match(body.text,/Confirm delivery/);assert.equal(response.headers.get('cache-control'),'no-store');
});
test('atomic budget never overshoots shared daily cap under concurrency',async()=>{
 globalThis.__museDb=new FakeDb();process.env.SESSION_CSRF_SECRET='test-only-secret';
 const date=new Date('2026-11-02T10:00:00Z');const results=await Promise.all(Array.from({length:20},(_,i)=>reserveMuseBudget(`visitor-${i}`,5,0,date)));
 assert.equal(results.filter(Boolean).length,5);assert.equal(globalThis.__museDb.data.get('aiRateLimits/global-2026-11-02').count,5);
});
test('visitor burst limit and next-minute reset preserve daily totals',async()=>{
 globalThis.__museDb=new FakeDb();process.env.SESSION_CSRF_SECRET='test-only-secret';const date=new Date('2026-11-02T10:00:00Z');
 for(let n=0;n<8;n++)assert.equal(await reserveMuseBudget('same',100,0,date),true);
 assert.equal(await reserveMuseBudget('same',100,0,date),false);
 assert.equal(await reserveMuseBudget('same',100,0,new Date(date.getTime()+61000)),true);
 assert.equal(globalThis.__museDb.data.get('aiRateLimits/visitor-2026-11-02-same').count,9);
});
test('budget fails closed without secret or database and resets on Lagos midnight',async()=>{
 globalThis.__museDb=new FakeDb();delete process.env.SESSION_CSRF_SECRET;
 assert.equal(await reserveMuseBudget('same',1,0),false);
 process.env.SESSION_CSRF_SECRET='test-only-secret';
 assert.equal(await reserveMuseBudget('same',1,0,new Date('2026-11-02T22:59:00Z')),true);
 assert.equal(await reserveMuseBudget('same',1,0,new Date('2026-11-02T23:01:00Z')),true);
 globalThis.__museDb=null;assert.equal(await reserveMuseBudget('same',1,0),false);
});
test('Gemini adapter uses secret header, correct roles and ignores thought parts',async()=>{
 const original=globalThis.fetch;let observed;
 globalThis.fetch=async(url,init)=>{observed={url,init};return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'private chain',thought:true},{text:'A helpful reply'}]}}]});};
 try { assert.equal(await generateMuseText({id:'test',apiKey:'private-key',model:'gemini-test'},'system',{message:'Hello',history:[{role:'assistant',text:'Hi'}]}),'A helpful reply');assert.ok(!observed.url.includes('private-key'));assert.equal(observed.init.headers['x-goog-api-key'],'private-key');const payload=JSON.parse(observed.init.body);assert.equal(payload.contents[0].role,'model');assert.equal(payload.systemInstruction.parts[0].text,'system');assert.ok(observed.init.signal); } finally {globalThis.fetch=original;}
});
test('Gemini errors and safety-blocked outputs do not escape as assistant replies',async()=>{
 const original=globalThis.fetch;
 try {globalThis.fetch=async()=>new Response('private provider details',{status:403});await assert.rejects(()=>generateMuseText({id:'test',apiKey:'secret',model:'model'},'system',{message:'hi',history:[]}),/Provider unavailable/);globalThis.fetch=async()=>Response.json({candidates:[{finishReason:'SAFETY',content:{parts:[{text:'blocked'}]}}]});assert.equal(await generateMuseText({id:'test',apiKey:'secret',model:'model'},'system',{message:'hi',history:[]}), '');}finally{globalThis.fetch=original;}
});
test('visitor identities hash input and ignore arbitrary forwarded IP headers',()=>{
 delete process.env.AI_TRUSTED_IP_HEADER;const a=visitorIdentity(request({},{'x-keo-session':'visitor','x-forwarded-for':'1.2.3.4'}));const b=visitorIdentity(request({},{'x-keo-session':'visitor','x-forwarded-for':'5.6.7.8'}));assert.equal(a,b);assert.equal(a.length,64);assert.ok(!a.includes('visitor'));
});
test('email allowlists require verified email while server-assigned roles remain authoritative',async()=>{
 const { resolveAdminAccess }=await import('../lib/admin-auth.ts');process.env.ADMIN_OWNER_EMAILS='owner@keo.example';
 assert.equal(resolveAdminAccess({email:'owner@keo.example',email_verified:false}).authorised,false);
 assert.equal(resolveAdminAccess({email:'owner@keo.example',email_verified:true}).role,'owner');
 assert.equal(resolveAdminAccess({admin:true,role:'editor'}).role,'editor');
 assert.equal(resolveAdminAccess({admin:false,role:'owner'}).authorised,false);
 delete process.env.ADMIN_OWNER_EMAILS;
});
test('product suggestions never substitute a different explicitly requested length',async()=>{
 const { selectChatCards }=await import('../lib/chat-presentation.ts');
 const products=[12,16].map(length=>({id:String(length),slug:`wig-${length}`,title:`Bone straight ${length}-inch wig`,status:'published',designPreview:false,category:'bone-straight',priceMode:'quote',media:[]}));
 assert.equal(selectChatCards('Show me a 14-inch wig',[],products).length,0);
 assert.deepEqual(selectChatCards('Compare 12-inch and 16-inch wigs',[],products).map(p=>p.id),['12','16']);
});

test('bare length follow-up never falls back to a historical wrong length', async () => {
 const { selectChatCards }=await import('../lib/chat-presentation.ts');
 const products=[12,16].map(length=>({id:String(length),slug:`wig-${length}`,title:`Bone straight ${length}-inch wig`,status:'published',designPreview:false,priceMode:'quote',media:[]}));
 const history=[{role:'user',text:'Show me a 12-inch wig'}];
 assert.equal(selectChatCards('What about 14?',history,products).length,0);
 assert.equal(selectChatCards('What about 16?',history,products)[0]?.href,'/products/wig-16');
});
test('published family variants retain exact lengths, prices and links for Muse', async () => {
 const { selectChatCards }=await import('../lib/chat-presentation.ts');
 const { museCatalogueProducts }=await import('../lib/muse-catalogue.ts');
 const { productPriceLabel }=await import('../lib/products.ts');
 const products=[{id:'family',slug:'bone-straight',title:'Bone straight wig',status:'published',designPreview:false,priceMode:'quote',media:[],variants:[12,16].map(length=>({id:String(length),slug:`bone-straight-${length}`,title:`Bone straight wig — ${length} inches`,label:`${length} inches`,lengthInches:length,priceMode:'fixed',priceMinor:length*100000}))}];
 const cards=selectChatCards('Show me a 16-inch wig',[],products);
 assert.equal(cards.length,1);assert.equal(cards[0].href,'/products/bone-straight-16');assert.match(cards[0].priceLabel,/16,000/);
 assert.equal(selectChatCards('Show me a 14-inch wig',[],products).length,0);
 const context=museCatalogueProducts(products).map(p=>({title:p.title,price:productPriceLabel(p),slug:p.slug}));
 assert.match(JSON.stringify(context),/12 inches/);assert.match(JSON.stringify(context),/16,000/);
 assert.equal(museCatalogueProducts([{...products[0],status:'draft'}]).length,0);
});
