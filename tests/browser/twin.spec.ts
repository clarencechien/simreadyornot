import {test,expect} from '@playwright/test';
const failures:string[]=[];
test.beforeEach(async({page})=>{failures.length=0;page.on('pageerror',e=>failures.push(e.message));await page.goto('/');await expect(page.locator('body')).toHaveAttribute('data-sim-time',/\d+/);await expect(page.locator('#scene')).toHaveAttribute('data-simready-assets','forklift,loaded-pallet,pallet,warehouse-rack',{timeout:30000});});
test('global, factory, line, station, pin, scenario effects and replay',async({page})=>{
 await expect(page.locator('#scene canvas')).toBeVisible();await expect(page.locator('#fallback')).toBeHidden();
 await page.locator('[data-level="0"]').click();
 await page.getByRole('button',{name:'L1智慧廠區'}).click();await expect(page.locator('#view-title')).toContainText('桃園');
 await page.locator('[data-line="TW-HQ/L1"]').click();await expect(page.locator('#view-title')).toContainText('TW-HQ / L1');
 await page.locator('[data-station="TW-HQ/L1/S3"]').click();await expect(page.locator('[data-panel="machine"]')).toBeVisible();
 await page.locator('[data-panel="machine"] .pin').click();await page.locator('[data-level="0"]').click();await expect(page.locator('[data-panel="machine"]')).toBeVisible();
 await page.locator('[data-panel="machine"] .pin').click();await expect(page.locator('[data-panel="machine"]')).toBeHidden();
 await page.locator('[data-scenario="fault"]').click();await expect(page.locator('body')).toHaveAttribute('data-active','fault');await page.locator('[data-level="2"]').click();await expect(page.locator('[data-panel="context"]')).toContainText('異常停機');

 await page.locator('#pause').click();await expect(page.locator('body')).toHaveAttribute('data-playback','0');const frozen=await page.locator('body').getAttribute('data-sim-time');await page.waitForTimeout(600);expect(await page.locator('body').getAttribute('data-sim-time')).toBe(frozen);
 for(const id of ['port','npi','demand'])await page.locator(`[data-scenario="${id}"]`).click();await expect(page.locator('body')).toHaveAttribute('data-active','fault,port,npi,demand');
 await page.locator('#replay').click();await expect(page.locator('body')).toHaveAttribute('data-active','');await expect(page.locator('body')).toHaveAttribute('data-total','0');
 await page.locator('#credits').click();await expect(page.locator('#credits-dialog')).toBeVisible();await expect(page.locator('#credit-list')).toContainText('Three.js');await page.keyboard.press('Escape');
 await page.locator('#quality').click();await expect(page.locator('#scene')).toHaveAttribute('data-quality','low');expect(failures).toEqual([]);
});
test('docked panels never overlap the viewport at common desktop sizes',async({page})=>{await page.locator('#quality').click();
 for(const size of [{width:1440,height:900},{width:1280,height:720},{width:1024,height:768}]){await page.setViewportSize(size);await page.waitForTimeout(200);const bounds=await page.locator('#scene').boundingBox();const left=await page.locator('[data-panel="global"]').boundingBox();const right=await page.locator('[data-panel="context"]').boundingBox();expect(left!.x+left!.width).toBeLessThanOrEqual(bounds!.x+1);expect(bounds!.x+bounds!.width).toBeLessThanOrEqual(right!.x+1);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 await page.locator('[data-panel="context"] .collapse').click();await page.reload();await expect(page.locator('[data-panel="context"]')).toHaveClass(/collapsed/);
});
test('phone layout stays usable',async({page})=>{await page.setViewportSize({width:390,height:844});await page.reload();await expect(page.locator('[data-scenario="fault"]')).toBeVisible();await page.locator('[data-scenario="fault"]').click();await expect(page.locator('body')).toHaveAttribute('data-active','fault');await expect(page.locator('#replay')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(failures).toEqual([]);});
