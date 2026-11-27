#!/usr/bin/env python3
"""Reusable mobile Playwright screenshot capture for inspecting specific levels and states.

Examples:
  python3 tests/capture_level.py --level 29 --paint-half --out /tmp/lv29_half.png
  python3 tests/capture_level.py --rule combo --paint-half --out /tmp/combo.png
"""
import argparse
import os
import signal
import subprocess
import time
from playwright.sync_api import sync_playwright


def parse_args():
    parser = argparse.ArgumentParser(description="Capture a mobile screenshot of a Splat Crush 3 level.")
    parser.add_argument("--level", type=int, default=None, help="Exact level number (1..1549)")
    parser.add_argument(
        "--rule",
        choices=["turf", "crate", "combo", "score", "weapon"],
        default=None,
        help="Find first level matching this goal rule via pure metadata lookup",
    )
    parser.add_argument(
        "--paint-half",
        action="store_true",
        help="Paint half of the turf cells to inspect unpainted vs painted side-by-side",
    )
    parser.add_argument("--out", default="/tmp/splat_crush_capture.png", help="Output PNG path")
    parser.add_argument("--port", type=int, default=4176, help="Local vite preview port")
    return parser.parse_args()


def main():
    args = parse_args()
    out_dir = os.path.dirname(os.path.abspath(args.out))
    if out_dir:
        os.makedirs(out_dir, exist_ok=True)

    server = subprocess.Popen(
        ["npx", "vite", "preview", "--port", str(args.port), "--strictPort"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        start_new_session=True,
    )
    time.sleep(1.8)
    errors = []

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
                lambda msg: errors.append(f"CONSOLE_ERR: {msg.text}") if msg.type == "error" else None,
            )

            page.goto(f"http://localhost:{args.port}/", wait_until="networkidle")
            page.wait_for_timeout(400)
            page.locator("#btn-start-play").click()
            page.wait_for_timeout(300)

            resolved = page.evaluate(
                """({ level, rule, paintHalf }) => {
                  const app = window.__splatCrush;
                  let targetLv = level ?? 1;
                  if (level === null && rule) {
                    const total = app.getTotalLevels();
                    for (let lv = 1; lv <= total; lv++) {
                      const def = app.getLevelDef(lv);
                      const types = new Set(def.goals.map(g => g.type));
                      const match =
                        rule === 'combo' ? (types.has('turf') && types.has('crate')) : types.has(rule);
                      if (match) {
                        targetLv = lv;
                        break;
                      }
                    }
                  }
                  app.loadLevel(targetLv);
                  const eng = app.getEngine();
                  if (paintHalf) {
                    const turfCells = [];
                    for (let r = 0; r < eng.rows; r++) {
                      for (let c = 0; c < eng.cols; c++) {
                        if (eng.grid[r][c].needsTurf) turfCells.push(eng.grid[r][c]);
                      }
                    }
                    const half = Math.floor(turfCells.length / 2);
                    for (let i = 0; i < half; i++) {
                      turfCells[i].turfPainted = true;
                    }
                    eng.turfPaintedCount = half;
                    app.syncBoard();
                  }
                  return {
                    level: targetLv,
                    goals: eng.levelDef.goals,
                    turfVisual: app.getTurfVisualState(),
                  };
                }""",
                {"level": args.level, "rule": args.rule, "paintHalf": args.paint_half},
            )
            page.wait_for_timeout(800)
            page.screenshot(path=args.out)
            browser.close()

        assert len(errors) == 0, f"Runtime errors: {errors}"
        print(f"Captured Lv.{resolved['level']} -> {args.out} | goals={resolved['goals']} | turf={resolved['turfVisual']}")
    finally:
        try:
            os.killpg(os.getpgid(server.pid), signal.SIGTERM)
        except ProcessLookupError:
            pass
        server.wait(timeout=5)


if __name__ == "__main__":
    main()
