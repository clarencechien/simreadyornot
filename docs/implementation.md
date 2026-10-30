# NEXUS implementation — SimReady integration

## Current assets

Warehouse assets now use NVIDIA SimReady, converted to GLB by codepawl, licensed CC BY 4.0. Nine original downloads passed SHA-256 checks against upstream hashes:

| Asset | Role | Optimized triangles | Bytes |
|---|---|---:|---:|
| rack_large_empty_a01 | Warehouse shelving | 9,322 | 251,908 |
| pallet_assembly_b01 | Loaded pallets on shelves / receiving | 2,715 | 180,052 |
| vehicle_forklift_orange_a01 | Moving material-handling vehicle | 13,433 | 303,000 |
| pallet_a01 | Empty pallets at dispatch | 2,052 | 81,520 |
| furniture_workbench_standard_e01 | workbench | 14,455 | 215,280 |
| cart_mobile_b01 | service-cart | 6,057 | 86,624 |
| palletJack_lowProfile_a01 | pallet-jack | 5,961 | 155,712 |
| tools_fireExtinguisher_CO2_a01 | extinguisher | 6,064 | 127,912 |
| conveyor_belt_a05 | conveyor | 7,019 | 241,276 |

Original geometry was simplified, textures resized to 512px WebP, and buffers meshopt-compressed. The loader normalizes each asset's origin without changing its scale. Repeated static assets (including stations) use InstancedMesh with shared geometry and materials and retain per-instance station picking. A wrapper preserves the normalized source origin when placing each instance. PCB assemblies also use instanced GLB geometry. The standalone HTML embeds all GLBs; the regular build serves local GLBs without requiring external runtime network access.

Eight detailed SMT station GLBs are authored in Blender, including panel gaps, feeder reels, adjustable feet, HMI panels, ID plates and reflow exhausts. Original Blender GLBs also cover the AMRs, short PCB transfers, populated circuit boards, and one-/two-/four-line cutaway halls. Architecture includes clerestory windows, trusses, sectional dock doors, ventilation, task lights, ESD floor boundaries and pedestrian crossings. Runtime primitives remain for the schematic world map and status lights. These are original visual models, not manufacturer-certified machine twins. The default renderer uses neutral lighting, ACES tone mapping and a cached static shadow map; low quality disables shadows. This is a visual, discrete-event demo, not a physical or calibrated industrial simulation. Attribution includes author, source, CC BY link and modification details.

## User interface

The initial view is TW-HQ's factory. Global KPIs appear only in the world view, leaving more space for local equipment. A dedicated viewport and fixed inspector rail keep data separate from the model; the machine inspector occupies the same right rail as context instead of overlapping it. Pinning preserves that inspector across navigation. Mobile uses a single bottom inspector. Long inspector contents scroll within their own region; page horizontal overflow is tested.

The expand-scene button hides desktop inspector rails without covering the viewport. Warehouse shortcuts focus the raw-material or finished-goods racks; the overview button restores the factory camera. Camera transitions use elapsed time, so low frame rates do not prolong movement. Camera orbit, zoom, four view levels, scenario injection, pause, replay, low quality and saved collapsed/pinned states remain available. Free panel dragging/resizing from v1 is disabled in the docked workspace.

## Simulation

A seeded discrete-event queue runs in a Worker. Eight lines have eight processing stations, unit queues, production outcomes, shipment arrivals and AGV replenishment events. Three SKU BOM/route definitions are demonstration data, not a full material-balance or scheduling solver.

The four scenarios model TH-01/L3 reflow downtime and rerouting, a five-day Singapore delay, TW-HQ changeover and yield ramp, and increased demand. Throughput and yield have one-hour rolling records sampled every 30 virtual seconds. SPC uses the most recent 32 cycle values. OEE and logistics/cost indicators are simplified demo metrics. Replaying clears scenarios; reproducing a scenario requires identical injections at identical virtual times.

MX-01 currently reuses the eight-station manufacturing model; dedicated FATP/CTO equipment and process timings remain future work. Forklift/AGV travel follows display paths without collision, multi-vehicle planning or full item-level load tracking.

## Reproduction and validation

- `npm ci`, `npm test`, `npm run build`, `npm run build:review`.
- Run the dev server, then `npm run test:browser`. Browser tests wait for actual SimReady scene readiness; software WebGL is slower than a hardware renderer.
- Asset reproduction: `python3 scripts/assets/fetch.py`, `python3 scripts/assets/prepare_simready.py`, `node scripts/assets/audit.mjs`.
- Asset hashes/budgets: `scripts/assets/manifest.json` and `scripts/assets/optimized-report.json`.
- Blender kit rebuild: `blender -b -t 2 --python scripts/assets/build_factory.py`, then `python3 scripts/assets/prepare_factory.py` for meshopt compression without geometry simplification.

The browser suite covers four-level navigation, pinning, scenarios, pause/reset, credits, low quality, docked viewport separation at three desktop sizes, phone overflow, and a standalone HTML document with all additional network fetches denied. Managed Chromium blocks file: navigation; direct double-click opening is not validated in this environment.

The external SimReady per-asset 20k triangle budget is verified. Architectural kit GLBs have separate larger geometry budgets. Hardware 45 FPS remains unverified; software Chromium tests establish functionality, not end-user frame rate. GitHub Pages deployment is automated by .github/workflows/pages.yml on pushes to main; the workflow runs simulation tests and the production build before publishing.
