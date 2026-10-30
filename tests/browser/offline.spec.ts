import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
test('standalone bundle runs with only one HTML response and no resource fetches',async({page,context})=>{
 const errors:string[]=[],remote:string[]=[];const url='http://127.0.0.1:5173/standalone-review.html';const html=await readFile(resolve('dist-review/index.html'),'utf8');
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==url)remote.push(r.url());});
 // Managed Chromium blocks file: navigation. Supply the exact bundle as the sole
 // document response, with networking offline, and deny every resource request.
 await page.route('**/*',route=>route.request().url()===url?route.fulfill({contentType:'text/html',body:html}):route.abort());await context.setOffline(true);
 await page.goto(url);await expect(page.locator('body')).toHaveAttribute('data-sim-time',/\d+/);await expect(page.locator('#scene')).toHaveAttribute('data-simready-assets','forklift,loaded-pallet,pallet,warehouse-rack',{timeout:30000});await expect(page.locator('#scene canvas')).toBeVisible();await expect(page.locator('#fallback')).toBeHidden();await expect.poll(async()=>Number(await page.locator('body').getAttribute('data-total')),{timeout:15000}).toBeGreaterThan(0);
 await page.locator('[data-scenario="fault"]').click();await expect(page.locator('#causal')).toContainText('TW-HQ 承接工單');await page.locator('#credits').click();await expect(page.locator('#credit-list')).toContainText('Three.js');await expect(page.locator('#credit-list')).toContainText('NVIDIA');expect(errors).toEqual([]);expect(remote).toEqual([]);
});
