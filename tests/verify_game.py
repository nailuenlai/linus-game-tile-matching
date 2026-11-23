import os
import subprocess
import sys
import time
from playwright.sync_api import sync_playwright

SHOT_DIR = "/tmp/splat_crush_shots"
os.makedirs(SHOT_DIR, exist_ok=True)


def run_tests():
    # Serve the built static site via vite preview
    server = subprocess.Popen(
        ["npx", "vite", "preview", "--port", "4173", "--strictPort"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    time.sleep(2.0)
    errors = []

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(
                headless=True,
                args=["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
            )
            # Test on mobile iPhone viewport first
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

            page.goto("http://localhost:4173/", wait_until="networkidle")
            page.wait_for_timeout(800)

            # 1. Capture Title Screen screenshot
            page.screenshot(path=f"{SHOT_DIR}/01_title_mobile.png")
            assert page.locator("#title-overlay").is_visible(), "Title overlay should be visible"

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
            print("Touch-action audit:", touch_audit)
            assert touch_audit["html"] == "none", f"html touch-action mismatch: {touch_audit}"
            assert touch_audit["body"] == "none", f"body touch-action mismatch: {touch_audit}"
            assert touch_audit["canvas"] == "none", f"canvas touch-action mismatch: {touch_audit}"
            assert touch_audit["btnMap"] == "none", f"btnMap touch-action mismatch: {touch_audit}"
            assert touch_audit["btnMapSpan"] == "none", f"btnMapSpan touch-action mismatch: {touch_audit}"
            assert touch_audit["scrollY"] == "pan-y", f"scrollY touch-action mismatch: {touch_audit}"
            assert touch_audit["scrollYChild"] == "pan-y", f"scrollYChild touch-action mismatch: {touch_audit}"
            assert touch_audit["scrollX"] == "pan-x", f"scrollX touch-action mismatch: {touch_audit}"

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
            print("Gesture interception audit:", gesture_audit)
            assert all(gesture_audit.values()), f"Gesture interception failed: {gesture_audit}"

            # 4. Dismiss Title Screen and inspect 3D board
            page.locator("#btn-start-play").click()
            page.wait_for_timeout(600)
            assert page.locator("#title-overlay").is_hidden(), "Title overlay should close"
            page.screenshot(path=f"{SHOT_DIR}/02_board_lv1_mobile.png")

            # 5. Verify all 100 levels load cleanly & have valid moves, and verify vertical=4K / horizontal=Splat Bomb!
            engine_audit = page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const failures = [];
                  for (let lv = 1; lv <= 100; lv++) {
                    app.loadLevel(lv);
                    const eng = app.getEngine();
                    const hint = eng.findBestHint();
                    if (!hint) failures.push(`Lv.${lv}: no valid hint`);
                  }

                  // Verify explicit vertical 3-match -> vertical4k & vertical 4-match -> eliter4k special
                  app.loadLevel(1);
                  const engV = app.getEngine();
                  // Force clean vertical 3-match at col 2 (rows 2,3,4) via swap (4,2)<->(4,3)
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

                  // Restore Lv 1 cleanly
                  app.loadLevel(1);
                  return {
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
            print("Engine 100-level & 4K/Bomb audit:", engine_audit)
            assert len(engine_audit["levelFailures"]) == 0, f"Level failures: {engine_audit['levelFailures']}"
            assert engine_audit["vValid"] and "vertical4k" in engine_audit["vEffects"], "Vertical match must trigger vertical4k"
            assert "eliter4k" in engine_audit["vSpecials"], "Vertical 4-match must spawn eliter4k special"
            assert engine_audit["hValid"] and "horizontalBomb" in engine_audit["hEffects"], "Horizontal match must trigger horizontalBomb"
            assert "splatbomb" in engine_audit["hSpecials"], "Horizontal 4-match must spawn splatbomb special"

            # 6. Execute a real visual move via handleSwap using the board's hint & clear Lv.1 to inspect Badge Unlock Modal!
            page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const eng = app.getEngine();
                  // Boost score near Lv.1 goal (1500) so the very next real match wins and triggers Badge Unlock!
                  eng.score = 1400;
                  const hint = eng.findBestHint();
                  await app.handleSwap(hint[0].row, hint[0].col, hint[1].row, hint[1].col);
                }"""
            )
            page.wait_for_timeout(900)
            assert page.locator("#result-modal").is_visible(), "Result & badge unlock modal should appear on stage clear"
            page.screenshot(path=f"{SHOT_DIR}/03_lv1_clear_rookie_badge.png")

            # 7. Open Badge Gallery modal & verify Lv.1 badge unlocked and equipped on Splashtag
            page.locator("#btn-result-badges").click()
            page.wait_for_timeout(450)
            assert page.locator("#badge-modal").is_visible(), "Badge modal should be visible"
            page.screenshot(path=f"{SHOT_DIR}/04_badge_locker.png")
            page.locator("#btn-close-badges").click()
            page.wait_for_timeout(250)

            # 8. Open 100-Level Map modal, toggle Sandbox mode, jump to Chapter 10 (Lv.100)!
            page.locator("#btn-map").dispatch_event("pointerdown")
            page.wait_for_timeout(400)
            assert page.locator("#map-modal").is_visible(), "100-level map modal should open"
            page.locator("#toggle-sandbox").check()
            page.wait_for_timeout(200)
            page.locator("#chapter-tabs button").last.click()
            page.wait_for_timeout(350)
            page.screenshot(path=f"{SHOT_DIR}/05_map_ch10.png")

            # Launch Level 100!
            page.locator("#level-grid button").last.click()
            page.wait_for_timeout(700)
            lv100_text = page.locator("#hud-level-num").text_content()
            assert lv100_text == "LV.100", f"Expected LV.100, got {lv100_text}"
            # Verify moves box is completely inside 390px viewport (no right-edge clipping!)
            moves_rect = page.locator("#hud-moves-box").bounding_box()
            assert moves_rect is not None and (moves_rect["x"] + moves_rect["width"]) <= 390, f"Moves box clipped: {moves_rect}"
            page.screenshot(path=f"{SHOT_DIR}/06_board_lv100_mobile.png")

            # Trigger Level 100 win on a real swap to inspect Mythic Crown Badge!
            page.evaluate(
                """async () => {
                  const app = window.__splatCrush;
                  const eng = app.getEngine();
                  // Leave 1 goal (score) temporarily added as 10 points below target so the swap genuinely finishes the level
                  eng.levelDef.goals.forEach(g => {
                    if (g.type === 'crate') eng.cratesClearedCount = g.target;
                    if (g.type === 'turf') eng.turfPaintedCount = g.target;
                    if (g.type === 'weapon' && g.weaponId !== undefined) eng.weaponCollected[g.weaponId] = g.target;
                  });
                  // Add a temporary 1-point remaining score goal only if already won, or reduce weapon/crate by 1?
                  // Even simpler: clear all goals except 1 weapon that matches our hint!
                  const hint = eng.findBestHint();
                  const tA = eng.grid[hint[0].row][hint[0].col].tile;
                  const tB = eng.grid[hint[1].row][hint[1].col].tile;
                  // Paint turf on all cells except hint cells? Better: mutate first goal to score=100 so next swap wins cleanly!
                  eng.score = 0;
                  eng.levelDef.goals.push({ type: 'score', target: 50 });
                  await app.handleSwap(hint[0].row, hint[0].col, hint[1].row, hint[1].col);
                  eng.levelDef.goals.pop();
                }"""
            )
            page.wait_for_timeout(1200)
            assert page.locator("#result-modal").is_visible(), "Lv.100 clear modal should appear"
            page.screenshot(path=f"{SHOT_DIR}/07_lv100_mythic_badge.png")

            browser.close()

        assert len(errors) == 0, f"Runtime browser errors detected: {errors}"
        print("ALL PLAYWRIGHT VERIFICATION CHECKS PASSED WITH ZERO ERRORS!")
    finally:
        server.terminate()
        server.wait(timeout=5)


if __name__ == "__main__":
    run_tests()
