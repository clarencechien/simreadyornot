import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',timeout:90000,workers:1,use:{baseURL:'http://127.0.0.1:5173',viewport:{width:1440,height:1000},launchOptions:{executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}}});
