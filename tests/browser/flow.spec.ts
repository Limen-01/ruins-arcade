import {test,expect} from '@playwright/test';
import {mkdir,readFile} from 'node:fs/promises';

test.beforeEach(async()=>{await mkdir('docs/evidence/v17',{recursive:true});});
const capture=async(page:import('@playwright/test').Page,kind:string,time:number,name:string,stageTime=0,pattern='',seed=371)=>{
  await page.goto(`/?capture=${kind}&time=${time}&stageTime=${stageTime}&seed=${seed}${pattern?`&pattern=${pattern}`:''}`);
  await expect(page.locator('#overlay')).toBeHidden();
  await page.screenshot({path:`docs/evidence/v17/${name.startsWith('v')?name:`v13-${name}`}.png`});
};

test('tutorial, independent settings, pause and resume',async({page})=>{
  await page.goto('/');await expect(page.locator('#play')).toBeVisible();
  await page.screenshot({path:'docs/evidence/v17/v12-home.png'});
  await page.locator('#play').click();await expect(page.locator('#begin')).toBeVisible();
  await expect(page.locator('#panel')).toContainText('弩箭');
  await page.locator('#skip').click();await expect(page.locator('#overlay')).toBeHidden();
  await page.locator('#pause').click();await expect(page.locator('#resume')).toBeVisible();
  await page.locator('#reduced').check();await page.screenshot({path:'docs/evidence/v17/v12-pause.png'});
  await page.locator('#resume').click();await expect(page.locator('#overlay')).toBeHidden({timeout:3000});
  await page.locator('#sound').click();await expect(page.locator('#sound')).toHaveAttribute('aria-pressed','false');
});

test('stage result retains survival time, next stage resets; final retry and records remain separate',async({page})=>{
  await page.goto('/');await page.evaluate(()=>{
    localStorage.setItem('ruins-arcade-v1',JSON.stringify({best:999,sound:false,haptic:false,reduced:true,tutorial:true}));
    localStorage.setItem('ruins-arcade-five-stage-v1-best-total','41');
  });
  await page.goto('/?capture=next-stage');await expect(page.locator('#next')).toBeVisible();
  await expect(page.locator('#total')).toHaveText('7.2 秒');await page.screenshot({path:'docs/evidence/v17/v12-next-stage.png'});
  await page.locator('#next').click();await expect(page.locator('#overlay')).toBeHidden();await expect(page.locator('#score')).toHaveText('0.0');await expect(page.locator('#total')).toHaveText('7.2 秒');
  await expect(page.locator('#stage')).toContainText('落雷機關');
  await page.goto('/?capture=final');await expect(page.locator('.stage-list span')).toHaveCount(5);
  await expect(page.locator('#best')).toHaveText('0.0 秒');await page.screenshot({path:'docs/evidence/v17/v12-final.png'});
  expect(await page.evaluate(()=>localStorage.getItem('ruins-arcade-five-stage-v1-best-total'))).toBe('41');
  expect(await page.evaluate(()=>localStorage.getItem('ruins-arcade-five-stage-v2-best-survival-seconds'))).toBeNull();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('ruins-arcade-v1')||'{}').best)).toBe(999);
  await page.locator('#retry-run').click();await expect(page.locator('#total')).toHaveText('0.0 秒');
});

test('production HUD survival clock advances during play and freezes through pause and resume countdown',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.setItem('ruins-arcade-v1',JSON.stringify({sound:false,haptic:false,reduced:true,tutorial:true})));
  await page.reload();await page.locator('#play').click();
  await expect(page.locator('#overlay')).toBeHidden();await page.waitForTimeout(350);
  const first=Number(await page.locator('#score').textContent());expect(first).toBeGreaterThan(0);
  await page.locator('#pause').click();const paused=await page.locator('#score').textContent();
  await page.waitForTimeout(450);expect(await page.locator('#score').textContent()).toBe(paused);
  await page.locator('#resume').click();await page.waitForTimeout(450);expect(await page.locator('#score').textContent()).toBe(paused);
  await expect(page.locator('#overlay')).toBeHidden({timeout:2000});await page.waitForTimeout(250);
  expect(Number(await page.locator('#score').textContent())).toBeGreaterThan(Number(paused));
  await page.screenshot({path:'docs/evidence/v17/v17-live-time-hud.png'});
});

test('v1.7 phone captures show sustained crossbow, overlapping point strikes, changed flame geometry and temporal mixing',async({page})=>{
  for(const [pattern,stageTime,time,name,seed] of [
    ['arrow-crossfire',40,.55,'v17-crossbow-pending',61],['arrow-crossfire',40,1.25,'v17-crossbow-active',61],['arrow-crossfire',40,2.25,'v17-crossbow-sustained',61],
    ['lightning-scatter',0,.55,'v17-lightning-opening-points',43],['lightning-short-lines',0,1.15,'v17-lightning-opening-lines',11],
    ['lightning-random-relay',40,.72,'v17-lightning-overlap-a',43],['lightning-random-relay',40,1.0,'v17-lightning-overlap-b',43],['lightning-random-relay',40,1.55,'v17-lightning-overlap-c',43],
    ['flame-moving-corridor',40,.8,'v17-flame-geometry-a',29],['flame-moving-corridor',40,1.8,'v17-flame-geometry-b',29]
  ] as const)await capture(page,'pattern',time,name,stageTime,pattern,seed);
  await capture(page,'mixed',.95,'v17-mixed-active',40,'',371);
  await capture(page,'mixed-flame',1.15,'v17-mixed-fire-flame',40,'',371);
  await page.goto('/?capture=next-stage');await page.screenshot({path:'docs/evidence/v17/v17-stage-time-result.png'});
  await page.goto('/');await page.evaluate(()=>localStorage.setItem('ruins-arcade-five-stage-v2-best-survival-seconds','42.83'));
  await page.goto('/?capture=final');await page.screenshot({path:'docs/evidence/v17/v17-five-stage-time-result.png'});
});

test('timed phone frames show lightning buildup, strike and ground fire regions',async({page})=>{
  await capture(page,'lightning',.65,'lightning-charge');
  await capture(page,'lightning',1.12,'lightning-strike');
  await capture(page,'lightning',1.38,'lightning-residue');
  await capture(page,'fire-single',.65,'fire-single-warning');
  await capture(page,'fire-single',1.25,'fire-single-burning');
  await capture(page,'fire-patch',1.25,'fire-patch-burning');
  await capture(page,'fire-patch',2.02,'fire-patch-out');
});

test('timed phone frames show each finite wave archetype, recovery and mixed arrow speeds',async({page})=>{
  await capture(page,'discrete',.72,'discrete');
  await capture(page,'grouped',.72,'grouped');
  await capture(page,'sequential',.62,'sequential-pending');
  await capture(page,'sequential',1.52,'sequential-active');
  await capture(page,'recovery',2.2,'recovery');
  await capture(page,'slow-fast',.4,'slow-fast-charge');
  await capture(page,'slow-fast',1.62,'slow-fast');
  await capture(page,'mixed',.72,'mixed',70);
  for(const stageTime of[0,10,25,45,70])await capture(page,'sequential',.35,`pressure-${stageTime}`,stageTime);
  await page.setViewportSize({width:320,height:640});await capture(page,'lane',.72,'narrow-lane');
});

test('timed death frames show lightning ash/head, one fire puff, arrow carry and delayed result',async({page})=>{
  await capture(page,'death-lightning',.25,'death-lightning-char');
  await capture(page,'death-lightning',.65,'death-lightning-ash');
  await capture(page,'death-lightning',1.05,'death-lightning-head');
  await capture(page,'death-flame',.45,'death-flame-smoke');
  await capture(page,'death-groundFire',.45,'death-ground-fire-smoke');
  await capture(page,'death-arrow',.65,'death-arrow');
  await page.goto('/?capture=death-result');await expect(page.locator('#next')).toBeHidden();
  await page.screenshot({path:'docs/evidence/v17/v12-death-before-result.png'});
  await expect(page.locator('#next')).toBeVisible({timeout:4000});
  await page.screenshot({path:'docs/evidence/v17/v12-death-after-result.png'});
});

test('new production assets and practice work after offline reload',async({page,context})=>{
  await page.goto('/');await page.evaluate(async()=>{
    await navigator.serviceWorker.ready;
    const key=(await caches.keys()).find(k=>k.startsWith('ruins-arcade-'));
    if(!key)throw new Error('cache missing');
    const cache=await caches.open(key);
    if(!(await cache.match(new URL('./',location.href))))throw new Error('shell missing');
  });
  await context.setOffline(true);await page.reload();await expect(page.locator('#play')).toBeVisible();
  await page.locator('#play').click();await page.locator('#begin').click();
  await expect(page.locator('#overlay')).toBeHidden();await page.keyboard.press('ArrowUp');
  await expect(page.locator('#realplay')).toBeVisible({timeout:7000});
  await page.screenshot({path:'docs/evidence/v17/v12-offline.png'});
});

test('late entry into active lane flame and ground fire kills during occupancy',async({page})=>{
  for(const family of ['flame','groundFire']){
    await page.goto(`/?capture=late-${family}-before`);
    await expect(page.locator('#overlay')).toBeHidden();
    await page.screenshot({path:`docs/evidence/v17/v13-late-${family}-before.png`});
    await page.goto(`/?capture=late-${family}`);
    await expect(page.locator('#next')).toBeVisible({timeout:5000});
    await page.screenshot({path:`docs/evidence/v17/v13-late-${family}-result.png`});
  }
});

test('authored v1.3 patterns render at phone size across stages',async({page})=>{
  const shots:[string,number,string,number][]=[
    ['arrow-crossfire',1.38,'crossfire-active',25],['arrow-crossfire',.72,'crossfire-warning',25],
    ['arrow-slow-fast',1.8,'slow-fast-cycle',25],
    ['lightning-cluster-relay',.72,'lightning-multitile',25],['lightning-short-lines',1.16,'lightning-short-lines',25],
    ['flame-central-pocket',1.27,'flame-pocket',25],['flame-sequential-relay',1.45,'flame-relay',25],
    ['ground-fire-fragments',1.48,'ground-fragments',25],['ground-fire-progressive',1.45,'ground-progressive',25]
  ];
  for(const [pattern,time,name,stageTime] of shots)await capture(page,'pattern',time,name,stageTime,pattern);
  for(const stageTime of [0,5,15,25,40])await capture(page,'pattern',.72,`opening-${stageTime}`,stageTime,'arrow-crossfire');
  for(const [seed,name] of [[1,'middle-both'],[2,'center-edge'],[8,'edge-center']] as const)await capture(page,'pattern',1.45,`progressive-${name}`,25,'ground-fire-progressive',seed);
  await capture(page,'mixed',1.45,'composed-mixed',25);
});

test('v1.5 repeated arrow warnings, lightning relay, flame relay and ground groups',async({page})=>{
  await capture(page,'pattern',.4,'v15-arrow-source-first',25,'arrow-staircase',13);
  await capture(page,'pattern',2.4,'v15-arrow-source-reused',25,'arrow-staircase',13);
  await capture(page,'pattern',.6,'v15-lightning-random-first',25,'lightning-random-relay',29);
  await capture(page,'pattern',1.75,'v15-lightning-random-next',25,'lightning-random-relay',29);
  await capture(page,'pattern',.6,'v15-flame-relay-first',25,'flame-sequential-relay',31);
  await capture(page,'pattern',1.1,'v15-flame-relay-next',25,'flame-sequential-relay',31);
  await capture(page,'pattern',.55,'v15-fire-islands-together',25,'ground-fire-islands',17);
  await capture(page,'pattern',.55,'v15-fire-fragments-together',25,'ground-fire-fragments',17);
  await capture(page,'pattern',1.32,'v15-progressive-group-transition',25,'ground-fire-progressive',8);
  await capture(page,'disclosure-trap',.2,'v15-hidden-followup');
  await capture(page,'disclosure-corrected',.2,'v15-corrected-disclosure');
  await capture(page,'mixed-lightning',1.35,'v15-mixed-strikes',25);
  await page.goto('/?capture=late-long-lightning-before');await expect(page.locator('#overlay')).toBeHidden();
  await page.screenshot({path:'docs/evidence/v17/v15-long-strike-before.png'});
  await page.goto('/?capture=late-long-lightning');await expect(page.locator('#next')).toBeVisible({timeout:5000});
  await page.screenshot({path:'docs/evidence/v17/v15-long-strike-result.png'});
});

test('v1.6 varied targets, long relay, dense flame and mixed lightning render at phone size',async({page})=>{
  const flame=JSON.parse(await readFile('docs/evidence/v17/five-line-accepted.json','utf8')) as {seed:number};
  const other=JSON.parse(await readFile('docs/evidence/v17/flame-volley-raw.json','utf8')) as {examples:{separated:number;mixed:number}};
  const lightning=JSON.parse(await readFile('docs/evidence/v17/lightning-line-examples.json','utf8')) as {row3:number;row6:number;row3Batch:number;row6Batch:number};
  await capture(page,'pattern',.15,'v16-lightning-relay-start',40,'lightning-random-relay',73);
  await capture(page,'pattern',2.4,'v16-lightning-relay-third-strike',40,'lightning-random-relay',73);
  await capture(page,'pattern',2.7,'v16-lightning-relay-middle',40,'lightning-random-relay',73);
  await capture(page,'pattern',6.1,'v16-lightning-relay-late',40,'lightning-random-relay',73);
  await capture(page,'pattern',lightning.row3Batch*.5+.35,'v16-lightning-row3-warning',25,'lightning-short-lines',lightning.row3);
  await capture(page,'pattern',lightning.row6Batch*.5+.35,'v16-lightning-row6-warning',25,'lightning-short-lines',lightning.row6);
  await capture(page,'pattern',.53,'v16-lightning-late-warning',80,'lightning-short-lines',lightning.row6);
  await capture(page,'pattern',.66,'v16-lightning-late-strike',80,'lightning-short-lines',lightning.row6);
  await capture(page,'pattern',.72,'v16-lightning-late-active',80,'lightning-short-lines',lightning.row6);
  await capture(page,'pattern',.88,'v16-lightning-late-residue',80,'lightning-short-lines',lightning.row6);
  await capture(page,'pattern',.85,'v16-flame-five-interior',40,'flame-multi-line',flame.seed);
  await capture(page,'pattern',.55,'v16-flame-separated',40,'flame-multi-line',other.examples.separated);
  await capture(page,'pattern',.55,'v16-flame-mixed',40,'flame-multi-line',other.examples.mixed);
  await capture(page,'pattern',1.08,'v16-ground-multipath',40,'ground-fire-progressive',71);
  await capture(page,'mixed-lightning',1.35,'v16-mixed-lightning');
});

