export const sites = [
 {id:'TW-HQ',name:'桃園智慧工廠',country:'TAIWAN',lat:25,lon:121,lines:2,role:'NPI · 高階主板',color:'#5ee7cd'},
 {id:'TH-01',name:'泰國製造中心',country:'THAILAND',lat:14,lon:101,lines:4,role:'SMT · 大量生產',color:'#63b7ff'},
 {id:'MX-01',name:'墨西哥組裝中心',country:'MEXICO',lat:28,lon:-106,lines:2,role:'FATP · CTO',color:'#ac9aff'},
 {id:'HUB-SG',name:'新加坡物流樞紐',country:'SINGAPORE',lat:1,lon:104,lines:0,role:'區域物流樞紐',color:'#ffc777'},
 {id:'HUB-LA',name:'洛杉磯配送中心',country:'UNITED STATES',lat:34,lon:-118,lines:0,role:'北美配送',color:'#ffc777'},
];
export const stations = ['Loader','印刷機','SPI','貼片機 A','貼片機 B','回焊爐','AOI','Unloader'];
export const skus = [
 {id:'SRV-MB',name:'伺服器主板',bom:['PCB-S12','SoC-A8','DDR-5','CAP-0402'],route:['TW-HQ','TH-01','MX-01']},
 {id:'PWR-CT',name:'電源控制板',bom:['PCB-P4','MCU-P2','MOS-60','CAP-0603'],route:['TH-01','MX-01']},
 {id:'EDGE-M',name:'邊緣運算模組',bom:['PCB-E8','SoC-E4','DDR-5','RF-01'],route:['TW-HQ','MX-01']},
];
export const routes = [
 {from:'TW-HQ',to:'TH-01',mode:'Air' as const,days:1},
 {from:'TH-01',to:'HUB-SG',mode:'Sea' as const,days:3},
 {from:'HUB-SG',to:'HUB-LA',mode:'Sea' as const,days:14},
 {from:'HUB-LA',to:'MX-01',mode:'Truck' as const,days:2},
 {from:'TW-HQ',to:'MX-01',mode:'Air' as const,days:2},
];
export const scenarios = [
 {id:'fault',title:'回焊爐故障',tag:'EQUIPMENT',site:'TH-01',description:'Line 3 停機 2 小時 → 工單轉移台灣 → 空運成本上升',color:'#ff6f7d'},
 {id:'port',title:'新加坡塞港',tag:'LOGISTICS',site:'HUB-SG',description:'樞紐延誤 5 天 → 北美準交風險 → 墨西哥庫存下降',color:'#ffc777'},
 {id:'npi',title:'新品導入',tag:'PRODUCTION',site:'TW-HQ',description:'貼片機換線 → EDGE-M 試產 → 良率逐步爬坡',color:'#63b7ff'},
 {id:'demand',title:'需求暴增',tag:'DEMAND',site:'ALL',description:'SRV-MB 訂單 ×2 → 產能拉高 → 倉儲與 AGV 負荷上升',color:'#ac9aff'},
];
