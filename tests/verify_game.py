import os
import signal
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(line_buffering=True)

SHOT_DIR = "/tmp/splat_crush_shots"
os.makedirs(SHOT_DIR, exist_ok=True)
T0 = time.monotonic()


def log(msg: str) -> None:
    print(f"[{time.monotonic() - T0:5.1f}s] {msg}", flush=True)


def run_tests():
    log("Starting vite preview server on :4173...")
    server = subprocess.Popen(
        ["npx", "vite", "preview", "--port", "4173", "--strictPort"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    time.sleep(2.0)
    errors = []
    failed_requests = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
            )
            context = browser.new_context(
                viewport={"width": 390, "height": 844},
                device_scale_factor=2,
                has_touch=True,
                is_mobile=True,
            )
            page = context.new_page()
            page.on("pageerror", lambda err: errors.append(f"PAGEERROR: {err}"))
            page.on(
                "console",
                lambda msg: errors.append(f"CONSOLE_ERR: {msg.text}")
                if msg.type == "error"
                else None,
            )
            page.on(
                "response",
                lambda res: failed_requests.append(f"{res.status} {res.url}")
                if res.status >= 400
                else None,
            )

            page.goto("http://localhost:4173/", wait_until="networkidle")
            page.wait_for_timeout(1000)

            # 1. Capture Title Screen screenshot (showing real Splatoon 3 weapons + v12.0.0 1,549 badges)
            page.screenshot(path=f"{SHOT_DIR}/01_title_mobile.png")
            assert page.locator("#title-overlay").is_visible(), "Title overlay should be visible"

            # Verify title weapon showcase images loaded
            title_imgs_ok = page.evaluate(
                """() => {
                  const imgs = Array.from(document.querySelectorAll('#title-weapon-showcase img, #rule-img-4k, #rule-img-bomb'));
                  return imgs.length === 8 && imgs.every(i => i.complete && i.naturalWidth > 0);
                }"""
            )
            assert title_imgs_ok, "Title weapon showcase / rule icons failed to load"

            # 2. Layer 2 & 2.5 Computed touch-action audit
            touch_audit = page.evaluate(
                """() => {
                  const check = (sel) => {
                    const el = document.querySelector(sel);
                    return el ? getComputedStyle(el).touchAction : null;
                  };
                  return {
                    html: check('html'),
                    body: check('body'),
                    canvas: check('#game-canvas'),
                    btnMap: check('#btn-map'),
                    btnMapSpan: check('#btn-map span'),
                    scrollY: check('#level-grid-wrap'),
                    scrollYChild: check('#level-grid'),
                    scrollX: check('#chapter-tabs'),
                  };
                }"""
            )
            log(f"Touch-action audit: {touch_audit}")
            assert touch_audit["html"] == "none"
            assert touch_audit["body"] == "none"
            assert touch_audit["canvas"] == "none"
            assert touch_audit["btnMap"] == "none"
            assert touch_audit["btnMapSpan"] == "none"
            assert touch_audit["scrollY"] == "pan-y"
            assert touch_audit["scrollYChild"] == "pan-y"
            assert touch_audit["scrollX"] == "pan-x"

            # 3. Layer 3 Gesture & dblclick interception audit
            gesture_audit = page.evaluate(
                """() => {
                  const btn = document.querySelector('#btn-map');
                  const span = document.querySelector('#btn-map span');
                  const dispatch = (el, type) => {
                    const ev = new Event(type, { bubbles: true, cancelable: true });
                    el.dispatchEvent(ev);
                    return ev.defaultPrevented;
                  };
                  return {
                    btnGestureStart: dispatch(btn, 'gesturestart'),
                    spanGestureChange: dispatch(span, 'gesturechange'),
                    btnDblClick: dispatch(btn, 'dblclick'),
                    spanDblClick: dispatch(span, 'dblclick'),
                  };
                }"""
            )
            log(f"Gesture interception audit: {gesture_audit}")
            assert all(gesture_audit.values())

            # 4. Dismiss Title Screen and inspect 3D board with real Splatoon 3 weapons
            page.locator("#btn-start-play").click()
            page.wait_for_timeout(800)
            assert page.locator("#title-overlay").is_hidden()
            page.screenshot(path=f"{SHOT_DIR}/02_board_lv1_mobile.png")

            # 5. Audit ALL 1,549 levels (difficulty monotonicity + valid initial moves) & 4K/Bomb mechanics!
            engine_audit = page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const audit = app.auditAllLevels();
                  const total = audit.total;
                  const failures = audit.failures;
                  const monoOk = audit.monoOk;

                  // Verify explicit vertical 4-match -> vertical4k & eliter4k special
                  app.loadLevel(1);
                  const engV = app.getEngine();
                  for (let r = 0; r < engV.rows; r++) {
                    for (let c = 0; c < engV.cols; c++) {
                      if (engV.grid[r][c].tile) {
                        engV.grid[r][c].tile.weaponId = (r * 2 + c) % 5;
                        engV.grid[r][c].tile.special = 'none';
                      }
                    }
                  }
                  engV.grid[1][2].tile.weaponId = 0;
                  engV.grid[2][2].tile.weaponId = 0;
                  engV.grid[3][2].tile.weaponId = 0;
                  engV.grid[4][2].tile.weaponId = 1;
                  engV.grid[4][3].tile.weaponId = 0;
                  const resV = engV.trySwap(4, 2, 4, 3);
                  const vEffects = resV.steps[0]?.effects.map(e => e.kind) || [];
                  const vSpecials = resV.steps[0]?.spawnedSpecials.map(s => s.special) || [];

                  // Verify explicit horizontal 4-match -> horizontalBomb & splatbomb special
                  app.loadLevel(1);
                  const engH = app.getEngine();
                  for (let r = 0; r < engH.rows; r++) {
                    for (let c = 0; c < engH.cols; c++) {
                      if (engH.grid[r][c].tile) {
                        engH.grid[r][c].tile.weaponId = (r * 2 + c) % 5;
                        engH.grid[r][c].tile.special = 'none';
                      }
                    }
                  }
                  engH.grid[3][0].tile.weaponId = 3;
                  engH.grid[3][1].tile.weaponId = 1;
                  engH.grid[3][2].tile.weaponId = 1;
                  engH.grid[3][3].tile.weaponId = 1;
                  engH.grid[3][4].tile.weaponId = 2;
                  engH.grid[3][5].tile.weaponId = 4;
                  engH.grid[4][4].tile.weaponId = 1;
                  const resH = engH.trySwap(3, 4, 4, 4);
                  const hEffects = resH.steps[0]?.effects.map(e => e.kind) || [];
                  const hSpecials = resH.steps[0]?.spawnedSpecials.map(s => s.special) || [];

                  app.loadLevel(1);
                  return {
                    totalLevels: total,
                    monoOk,
                    levelFailures: failures,
                    vValid: resV.valid,
                    vEffects,
                    vSpecials,
                    hValid: resH.valid,
                    hEffects,
                    hSpecials,
                  };
                }"""
            )
            log(f"Engine 1,549-level & 4K/Bomb audit: {engine_audit}")
            assert engine_audit["totalLevels"] == 1549, f"Expected 1549 levels, got {engine_audit['totalLevels']}"
            assert engine_audit["monoOk"], "Badge difficulties must be monotonically non-decreasing"
            assert len(engine_audit["levelFailures"]) == 0, f"Level failures: {engine_audit['levelFailures']}"
            assert engine_audit["vValid"] and "vertical4k" in engine_audit["vEffects"]
            assert "eliter4k" in engine_audit["vSpecials"]
            assert engine_audit["hValid"] and "horizontalBomb" in engine_audit["hEffects"]
            assert "splatbomb" in engine_audit["hSpecials"]

            # 5b. Verify live Turf painting updates both engine count & 3D visuals (removes unpainted border)
            turf_audit = page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  let turfLv = -1;
                  for (let lv = 1; lv <= app.getTotalLevels(); lv++) {
                    if (app.getLevelDef(lv).goals.some(g => g.type === 'turf')) {
                      turfLv = lv;
                      break;
                    }
                  }
                  app.loadLevel(turfLv);
                  const eng = app.getEngine();
                  const target = eng.levelDef.goals.find(g => g.type === 'turf').target;
                  const beforeVis = app.getTurfVisualState();

                  // Locate 3 horizontal unpainted turf cells with a playable neighbor below the 3rd cell
                  let swapCoords = null;
                  for (let r = 0; r < eng.rows - 1 && !swapCoords; r++) {
                    for (let c = 0; c < eng.cols - 2 && !swapCoords; c++) {
                      const a = eng.grid[r][c];
                      const b = eng.grid[r][c + 1];
                      const d = eng.grid[r][c + 2];
                      const below = eng.grid[r + 1][c + 2];
                      if (a.needsTurf && b.needsTurf && d.needsTurf && a.tile && b.tile && d.tile && below.tile) {
                        a.tile.weaponId = 1;
                        b.tile.weaponId = 1;
                        d.tile.weaponId = 2;
                        below.tile.weaponId = 1;
                        a.tile.special = 'none';
                        b.tile.special = 'none';
                        d.tile.special = 'none';
                        below.tile.special = 'none';
                        swapCoords = [r, c + 2, r + 1, c + 2];
                      }
                    }
                  }
                  app.syncBoard();
                  await app.handleSwap(...swapCoords);
                  const afterPainted = eng.turfPaintedCount;
                  const afterVis = app.getTurfVisualState();
                  app.loadLevel(1);
                  return { turfLv, target, beforeVis, afterPainted, afterVis };
                }"""
            )
            log(f"Turf visual & engine audit: {turf_audit}")
            assert turf_audit["turfLv"] > 0
            assert turf_audit["beforeVis"]["total"] == turf_audit["target"]
            assert turf_audit["beforeVis"]["painted"] == 0
            assert turf_audit["beforeVis"]["unpaintedBorders"] == turf_audit["target"]
            assert turf_audit["afterPainted"] >= 3
            assert turf_audit["afterVis"]["painted"] == turf_audit["afterPainted"]
            assert turf_audit["afterVis"]["unpaintedBorders"] == (
                turf_audit["target"] - turf_audit["afterPainted"]
            )

            # 6. Clear Lv.1 to inspect official Splatoon 3 DJ Octavio Badge Unlock Modal!
            page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const eng = app.getEngine();
                  eng.score = 1400;
                  const hint = eng.findBestHint();
                  await app.handleSwap(hint[0].row, hint[0].col, hint[1].row, hint[1].col);
                }"""
            )
            page.wait_for_timeout(1000)
            assert page.locator("#result-modal").is_visible()
            page.screenshot(path=f"{SHOT_DIR}/03_lv1_clear_badge.png")

            # 7. Open Badge Gallery modal & verify official v12.0.0 badges + Splashtag + search!
            page.locator("#btn-result-badges").click()
            page.wait_for_timeout(700)
            assert page.locator("#badge-modal").is_visible()
            page.screenshot(path=f"{SHOT_DIR}/04_badge_locker.png")
            page.locator("#btn-close-badges").click()
            page.wait_for_timeout(250)

            # 8. Open 1,549-Level Map modal, toggle Sandbox mode, jump to Chapter 31 (Lv.1501–1549)!
            page.locator("#btn-map").dispatch_event("pointerdown")
            page.wait_for_timeout(450)
            assert page.locator("#map-modal").is_visible()
            page.locator("#toggle-sandbox").check()
            page.wait_for_timeout(200)
            page.locator("#chapter-tabs button").last.click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{SHOT_DIR}/05_map_ch31.png")

            # Launch Level 1,549 (Final Boss — X Battle Top 10)!
            page.locator("#level-grid button").last.click()
            page.wait_for_timeout(900)
            lv_final_text = page.locator("#hud-level-num").text_content()
            assert lv_final_text == "LV.1549", f"Expected LV.1549, got {lv_final_text}"
            moves_rect = page.locator("#hud-moves-box").bounding_box()
            assert moves_rect is not None and (moves_rect["x"] + moves_rect["width"]) <= 390, f"Moves box clipped: {moves_rect}"
            page.screenshot(path=f"{SHOT_DIR}/06_board_lv1549_mobile.png")

            # Trigger Level 1,549 win on a real swap to inspect official X Rank Top 10 Badge!
            page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const eng = app.getEngine();
                  eng.levelDef.goals.forEach(g => {
                    if (g.type === 'crate') eng.cratesClearedCount = g.target;
                    if (g.type === 'turf') eng.turfPaintedCount = g.target;
                    if (g.type === 'weapon' && g.weaponId !== undefined) eng.weaponCollected[g.weaponId] = g.target;
                  });
                  const hint = eng.findBestHint();
                  eng.score = 0;
                  eng.levelDef.goals.push({ type: 'score', target: 50 });
                  await app.handleSwap(hint[0].row, hint[0].col, hint[1].row, hint[1].col);
                  eng.levelDef.goals.pop();
                }"""
            )
            page.wait_for_timeout(1200)
            assert page.locator("#result-modal").is_visible()
            page.screenshot(path=f"{SHOT_DIR}/07_lv1549_xrank_top10_badge.png")

            browser.close()

        assert len(failed_requests) == 0, f"Failed HTTP requests: {failed_requests}"
        assert len(errors) == 0, f"Runtime browser errors detected: {errors}"
        log("ALL PLAYWRIGHT VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
    finally:
        try:
            os.killpg(os.getpgid(server.pid), signal.SIGTERM)
        except ProcessLookupError:
            pass
        server.wait(timeout=5)


if __name__ == "__main__":
    run_tests()
