#!/usr/bin/env python3
"""
Sync official Splatoon 3 assets (WebP) and generated TypeScript datasets from Leanny/splat3.

Usage:
    python3 scripts/sync_splat3_assets.py --version 1200

Requires: git, Python 3.10+, Pillow (PIL).
"""

import argparse
import json
import subprocess
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
BADGE_OUT_DIR = REPO_ROOT / "public/assets/badges"
WEAPON_OUT_DIR = REPO_ROOT / "public/assets/weapons"

CLASS_TO_SLOT = {
    "Shooter": 0,
    "Blaster": 0,
    "Roller": 1,
    "Brush": 1,
    "Maneuver": 2,
    "Charger": 2,
    "Slosher": 3,
    "Spinner": 3,
    "Saber": 4,
    "Shelter": 4,
    "Stringer": 5,
}

MISSION_NAMES = {
    "Mission_Lv00": "DJ芥末章魚將軍",
    "Mission_Lv01": "熊先生・英雄模式通關",
    "Mission_Lv02": "螢・英雄裝備滿級",
    "Mission_Lv03": "潮・英雄裝備滿級",
    "Mission_Lv04": "小鮭魚・隱藏茶壺制霸",
}

SDODR_ACH_NAMES = {
    "Achievement_Sdodr_Lv00": "姬無人機・初始之塔",
    "Achievement_Sdodr_Lv01": "飯田・初始之塔",
    "Achievement_Sdodr_Lv02": "小八・秩序篇通關",
    "Achievement_Sdodr_Lv03": "秩序之塔・全調色盤",
    "Achievement_Sdodr_Lv04": "夢霞攤販・全兌換",
    "Achievement_Sdodr_Lv05": "小八低駭解・秩序制霸",
}

FEST10X_NAMES = {
    "Fest10xBattle_Join_Lv00": "莎莎・10倍比賽參戰",
    "Fest10xBattle_Join_Lv01": "曼曼・10倍比賽參戰",
    "Fest10xBattle_Join_Lv02": "鬼福・10倍比賽參戰",
    "Fest10xBattle_Win_Lv00": "純金莎莎・10倍比賽10勝",
    "Fest10xBattle_Win_Lv01": "純金曼曼・10倍比賽10勝",
    "Fest10xBattle_Win_Lv02": "純金鬼福・10倍比賽10勝",
}

TIP_TONE_ZH = {
    "Fire": "火力晶片",
    "Continuity": "支援晶片",
    "Range": "射程晶片",
    "Move": "機動晶片",
    "Luck": "幸運晶片",
    "Auto": "無人機晶片",
}

SHOP_PLACE_ZH = {
    "SpendShop": "蠻頹鎮",
    "SpendShop_Fsodr": "尚興市",
    "SpendShop_Sdodr": "尚興廣場",
}

SHOP_TYPE_ZH = {
    "Head": "頭部裝備店",
    "Clothes": "服裝店",
    "Shoes": "鞋店",
    "Goods": "雜貨店",
}

DIV_ZH = {
    "Atlantic": "艾洛眼組",
    "Pacific": "暇古組",
}


def sparse_clone_leanny(work_dir: Path, version: str) -> None:
    """Fetch only the required JSON + image directories from Leanny/splat3 in one clone."""
    if not (work_dir / ".git").exists():
        work_dir.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(
            [
                "git",
                "clone",
                "--depth",
                "1",
                "--filter=blob:none",
                "--sparse",
                "https://github.com/Leanny/splat3.git",
                str(work_dir),
            ],
            check=True,
        )
    else:
        subprocess.run(["git", "-C", str(work_dir), "pull", "--ff-only"], check=True)

    subprocess.run(
        [
            "git",
            "-C",
            str(work_dir),
            "sparse-checkout",
            "set",
            "--no-cone",
            f"/data/mush/{version}/BadgeInfo.json",
            f"/data/mush/{version}/WeaponInfoMain.json",
            f"/data/mush/{version}/WeaponInfoSpecial.json",
            "/data/language/TWzh.json",
            "/images/badge/",
            "/images/weapon_flat/",
            "/images/subspe/",
        ],
        check=True,
    )


def tier_for_difficulty(diff_int: int) -> str:
    if diff_int <= 15:
        return "rookie"
    if diff_int <= 32:
        return "bronze"
    if diff_int <= 50:
        return "silver"
    if diff_int <= 68:
        return "gold"
    if diff_int <= 85:
        return "holo"
    return "mythic"


def category_group(cat: str) -> str:
    if cat in ("WeaponLevel", "VariousWeaponLevel"):
        return "weapon"
    if cat == "WinCount_WeaponSp":
        return "special"
    if cat.startswith("Coop") or cat == "TotalKumaPoint":
        return "salmon"
    if cat in (
        "XRank",
        "XRank_Revised",
        "XPower",
        "WinCount_HighXPower",
        "Udemae",
        "WinCount",
        "WinCount_Tcl",
        "ChallengeWinStreak",
        "EventMatch",
        "FestRankMax",
        "Fest10xBattle",
        "HammerHostTournament",
    ):
        return "battle"
    if cat in ("Mission", "Achievement_Sdodr", "TipColorComplete_Sdodr"):
        return "story"
    return "lifestyle"


def sync(version: str, work_dir: Path, skip_clone: bool, overwrite_webp: bool) -> None:
    if not skip_clone:
        sparse_clone_leanny(work_dir, version)

    mush_dir = work_dir / "data/mush" / version
    img_src = work_dir / "images"

    badges_raw = json.loads((mush_dir / "BadgeInfo.json").read_text(encoding="utf-8"))
    weapons_raw = json.loads((mush_dir / "WeaponInfoMain.json").read_text(encoding="utf-8"))
    specials_raw = json.loads((mush_dir / "WeaponInfoSpecial.json").read_text(encoding="utf-8"))
    tw = json.loads((work_dir / "data/language/TWzh.json").read_text(encoding="utf-8"))

    weapons_by_id = {w["Id"]: w for w in weapons_raw}
    specials_by_id = {s["Id"]: s for s in specials_raw}
    versus_weapons = sorted(
        (w for w in weapons_raw if w.get("Type") == "Versus"),
        key=lambda w: (w.get("Id", 0), w["__RowId"]),
    )
    weapon_index_map = {w["Id"]: idx for idx, w in enumerate(versus_weapons)}

    def loc(table: str, key: str) -> str:
        return tw.get(table, {}).get(key, "")

    def resolve_desc(b: dict) -> str:
        res = loc("CommonMsg/Badge/BadgeMsg", b.get("MsgLabelEx", ""))
        if res:
            if "[group=0004 type=0007 params=00 00 00 00]" in res:
                res = res.replace(
                    "[group=0004 type=0007 params=00 00 00 00]",
                    loc("CommonMsg/Coop/CoopEnemy", b["Sub1_Str"]) or b["Sub1_Str"],
                )
            if "[group=0004 type=000e params=00 00 00 00]" in res:
                res = res.replace(
                    "[group=0004 type=000e params=00 00 00 00]",
                    loc("CommonMsg/Coop/CoopStageName", b["Sub1_Str"]) or b["Sub1_Str"],
                )
            if "[group=0004 type=000f params=00 00 00 00]" in res:
                res = res.replace(
                    "[group=0004 type=000f params=00 00 00 00]",
                    loc("CommonMsg/Gear/GearBrandName", f"B{b['Sub1_Int']:02d}")
                    or str(b["Sub1_Int"]),
                )
            if "[group=0004 type=0001 params=00 00 00 00]" in res:
                if b["Category"] == "WeaponLevel":
                    w = weapons_by_id[b["Sub1_Int"]]
                    res = res.replace(
                        "[group=0004 type=0001 params=00 00 00 00]",
                        loc("CommonMsg/Weapon/WeaponName_Main", w["__RowId"]) or w["__RowId"],
                    )
                elif b["Category"] == "WinCount_WeaponSp":
                    s = specials_by_id[b["Sub1_Int"]]
                    res = res.replace(
                        "[group=0004 type=0001 params=00 00 00 00]",
                        loc("CommonMsg/Weapon/WeaponName_Special", s["__RowId"]) or s["__RowId"],
                    )
        else:
            res = loc("CommonMsg/Badge/BadgeMsg", b["Name"])
        return res.strip()

    def make_badge_name_zh(b: dict, req_zh: str) -> str:
        cat = b["Category"]
        name = b["Name"]
        s1i = b["Sub1_Int"]
        s1s = b["Sub1_Str"]
        s2i = b["Sub2_Int"]

        if cat == "WeaponLevel":
            w = weapons_by_id[s1i]
            wname = loc("CommonMsg/Weapon/WeaponName_Main", w["__RowId"]) or w["__RowId"]
            return f"{wname} ★{s2i}"
        if cat == "WinCount_WeaponSp":
            s = specials_by_id[s1i]
            sname = loc("CommonMsg/Weapon/WeaponName_Special", s["__RowId"]) or s["__RowId"]
            return f"{sname} {s2i}勝"
        if cat == "Mission":
            return MISSION_NAMES.get(name, req_zh)
        if cat == "Achievement_Sdodr":
            return SDODR_ACH_NAMES.get(name, req_zh)
        if cat == "Fest10xBattle":
            return FEST10X_NAMES.get(name, req_zh)
        if cat == "TipColorComplete_Sdodr":
            parts = s1s.split("_")
            tone = TIP_TONE_ZH.get(parts[0], parts[0])
            ver = parts[1] if len(parts) > 1 else ""
            return f"秩序{tone}・{ver}"
        if cat == "CoopGrade_Normal":
            stage = loc("CommonMsg/Coop/CoopStageName", s1s) or s1s
            return f"{stage} 傳說{s2i}"
        if cat == "CoopBossKillNum":
            enemy = loc("CommonMsg/Coop/CoopEnemy", s1s) or s1s
            return f"頭目{enemy} {s2i}討伐"
        if cat == "CoopRareEnemyKillNum":
            enemy = loc("CommonMsg/Coop/CoopEnemy", s1s) or s1s
            return f"{enemy} {s2i}討伐"
        if cat == "GearTotalRarity":
            brand = loc("CommonMsg/Gear/GearBrandName", f"B{s1i:02d}") or f"B{s1i:02d}"
            return f"{brand} 稀有度{s2i}"
        if cat in SHOP_PLACE_ZH:
            place = SHOP_PLACE_ZH[cat]
            shop = SHOP_TYPE_ZH.get(s1s, s1s)
            amt = "100萬" if s1i >= 1000000 else "10萬"
            return f"{place}{shop} {amt}"
        if cat == "PlayerRank":
            return f"玩家等級 Lv.{s1i}"
        if cat == "CatalogueLevel":
            return f"目錄等級 Lv.{s1i}"
        if cat == "NawaBattlerRank":
            return f"占地鬥士 Lv.{s1i}"
        if cat == "NawaBattlerCardNum":
            return f"占地鬥士 {s1i}張卡"
        if cat == "NawaBattlerWinAllNpcLevel3":
            return "占地鬥士道場全制霸"
        if cat == "Udemae":
            return ["蠻頹技術 A", "蠻頹技術 S", "蠻頹技術 S+"][s1i]
        if cat == "VariousWeaponLevel":
            return f"{s1i}種武器 ★4達成"
        if cat == "WinCount":
            mode_map = {
                "Pnt": "占地對戰",
                "Var": "真格區域",
                "Vlf": "真格塔樓",
                "Vgl": "真格魚虎",
                "Vcl": "真格蛤蜊",
            }
            return f"{mode_map.get(s1s, s1s)} {s2i}勝"
        if cat == "WinCount_Tcl":
            side = "進攻方" if s1s == "Atk" else "防守方"
            return f"三色奪寶({side}) {s2i}勝"
        if cat == "ChallengeWinStreak":
            return f"蠻頹挑戰 {s1i}勝"
        if cat == "CoopBigRunTrophy":
            return ["大型跑・銅盃", "大型跑・銀盃", "大型跑・金盃"][s1i]
        if cat == "CoopContestTrophy":
            return ["團隊打工・前50%", "團隊打工・前20%", "團隊打工・前5%"][s1i]
        if cat == "CoopClearDangerRateMax":
            return "鮭魚跑・危險度MAX"
        if cat == "CoopKillTripleBoss":
            return "鮭魚跑・頭目聯合討伐"
        if cat == "TotalKumaPoint":
            return f"熊先生點數 {s1i:,}p"
        if cat == "EventMatch":
            return ["活動比賽・前50%", "活動比賽・前20%", "活動比賽・前5%"][s1i - 1]
        if cat == "FestRankMax":
            return "祭典稱號・永遠"
        if cat == "OrderFood":
            return f"商店點餐 {s1i}次"
        if cat == "OrderVendor":
            return f"刺冠預訂 {s1i}次"
        if cat == "OrderVendor_Fsodr":
            return f"丹尼預訂 {s1i}次"
        if cat == "SpendLottery":
            return f"抽獎機 {s1i // 10000}萬魷鈔"
        if cat == "LimitedRewardLottery":
            return f"抽獎機 頭獎{s1i}次"
        if cat == "HammerHostTournament":
            return f"大賽主辦 {s1i}人參賽"
        if cat == "XPower":
            div = "Atlantic" if "Atlantic" in name else "Pacific"
            return f"X戰力 2000+（{DIV_ZH[div]}）"
        if cat == "WinCount_HighXPower":
            div = "Atlantic" if "Atlantic" in name else "Pacific"
            return f"X2000+ {s2i}勝（{DIV_ZH[div]}）"
        if cat == "XRank":
            return f"X比賽 全球前{s1i}名"
        if cat == "XRank_Revised":
            div = "Atlantic" if "Atlantic" in name else "Pacific"
            return f"X比賽 前{s2i}名（{DIV_ZH[div]}）"
        return req_zh

    def compute_difficulty_score(b: dict) -> float:
        cat = b["Category"]
        name = b["Name"]
        s1i = b["Sub1_Int"]
        s1s = b["Sub1_Str"]
        s2i = b["Sub2_Int"]

        if cat == "Mission":
            return {0: 1.0, 1: 5.5, 2: 11.5, 3: 11.8, 4: 21.0}[s1i]
        if cat == "WinCount_Tcl":
            if s2i == 1:
                return 2.0 if s1s == "Atk" else 2.2
            return 12.8 if s1s == "Atk" else 13.0
        if cat == "Achievement_Sdodr":
            return {0: 2.8, 1: 3.2, 2: 8.5, 3: 22.0, 4: 23.2, 5: 33.5}[s1i]
        if cat == "OrderFood":
            return {10: 3.8, 100: 29.2, 1000: 61.2}[s1i]
        if cat in ("OrderVendor", "OrderVendor_Fsodr"):
            off = 0.2 if cat == "OrderVendor_Fsodr" else 0.0
            return (4.5 if s1i == 10 else 29.5) + off
        if cat == "FestRankMax":
            return 6.0
        if cat == "Fest10xBattle":
            if s1s == "Join":
                return 6.5 + (int(name[-2:]) * 0.1)
            return 32.0 + (int(name[-2:]) * 0.1)
        if cat == "TotalKumaPoint":
            return {10000: 7.0, 100000: 30.0, 9999999: 84.2}[s1i]
        if cat in ("SpendShop", "SpendShop_Fsodr", "SpendShop_Sdodr"):
            base = 7.8 if s1i <= 100000 else 24.5
            place_off = {"SpendShop": 0.0, "SpendShop_Fsodr": 0.3, "SpendShop_Sdodr": 0.6}[cat]
            return base + place_off
        if cat == "SpendLottery":
            return {300000: 9.0, 3000000: 36.2, 30000000: 83.8}[s1i]
        if cat == "PlayerRank":
            return {
                30: 9.8, 50: 17.2, 100: 35.0, 200: 51.0, 300: 52.0, 400: 53.0,
                500: 54.0, 600: 69.0, 700: 70.0, 800: 71.0, 900: 72.0, 999: 84.5,
            }[s1i]
        if cat == "CatalogueLevel":
            return 10.2 if s1i == 50 else 16.8
        if cat == "CoopBigRunTrophy":
            return {0: 10.8, 1: 31.0, 2: 53.2}[s1i]
        if cat == "CoopContestTrophy":
            return {0: 11.0, 1: 31.2, 2: 53.4}[s1i]
        if cat == "EventMatch":
            return {1: 11.2, 2: 31.4, 3: 53.6}[s1i]
        if cat == "HammerHostTournament":
            return {16: 12.0, 250: 52.4, 1000: 98.4}[s1i]
        if cat == "WinCount":
            if s1s == "Pnt":
                return {50: 13.2, 250: 30.2, 1200: 60.0}[s2i]
            return 30.5 if s2i == 100 else 60.4
        if cat == "CoopRareEnemyKillNum":
            return {100: 14.0, 1000: 40.0, 10000: 82.0}[s2i]
        if cat == "WinCount_WeaponSp":
            return {30: 15.0, 180: 39.0, 1200: 76.0}[s2i]
        if cat == "NawaBattlerRank":
            return {
                30: 16.0, 40: 33.8, 50: 34.2, 100: 51.2, 200: 51.8, 300: 52.6,
                400: 53.8, 500: 69.2, 600: 69.8, 700: 70.6, 800: 71.4, 900: 72.2, 999: 84.7,
            }[s1i]
        if cat == "NawaBattlerCardNum":
            return {90: 16.4, 120: 34.4, 150: 50.2}[s1i]
        if cat == "NawaBattlerWinAllNpcLevel3":
            return 34.6
        if cat == "Udemae":
            return {0: 18.0, 1: 31.8, 2: 37.0}[s1i]
        if cat == "ChallengeWinStreak":
            return {10: 18.5, 50: 52.2, 250: 75.0}[s1i]
        if cat == "CoopBossKillNum":
            return {10: 19.2, 100: 47.0, 1000: 83.0}[s2i]
        if cat == "CoopGrade_Normal":
            return {200: 20.0, 400: 38.0, 600: 48.0, 999: 59.0}[s2i]
        if cat == "TipColorComplete_Sdodr":
            return 22.5
        if cat == "GearTotalRarity":
            return 23.8 if s2i == 30 else 41.0
        if cat == "LimitedRewardLottery":
            return {4: 35.8, 8: 61.5, 16: 75.4}[s1i]
        if cat == "VariousWeaponLevel":
            return {10: 35.2, 25: 50.5, 50: 61.0}[s1i]
        if cat == "CoopClearDangerRateMax":
            return 54.2
        if cat == "CoopKillTripleBoss":
            return 54.4
        if cat == "XPower":
            return 49.0 if "Atlantic" in name else 49.2
        if cat == "WinCount_HighXPower":
            div_off = 0.0 if "Atlantic" in name else 0.15
            return {15: 49.4, 70: 67.0, 350: 85.0}[s2i] + div_off
        if cat == "XRank_Revised":
            div_off = 0.0 if "Atlantic" in name else 0.15
            return {
                50000: 41.6, 30000: 41.9, 10000: 50.0, 5000: 67.4,
                3000: 68.0, 1000: 85.3, 500: 85.6, 10: 99.2,
            }[s2i] + div_off
        if cat == "XRank":
            return {3000: 68.4, 500: 85.9, 10: 100.0}[s1i]
        if cat == "WeaponLevel":
            w_frac = weapon_index_map.get(s1i, 0) / max(1, len(versus_weapons) - 1)
            star_ranges = {
                4: (25.2, 28.8),
                5: (42.2, 46.5),
                6: (54.8, 58.6),
                7: (62.0, 66.5),
                8: (70.0, 74.5),
                9: (77.0, 81.5),
                10: (86.2, 98.0),
            }
            lo, hi = star_ranges[s2i]
            return lo + w_frac * (hi - lo)
        raise ValueError(f"Unhandled badge category: {cat} ({name})")

    BADGE_OUT_DIR.mkdir(parents=True, exist_ok=True)
    WEAPON_OUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Convert Versus weapons + sub/special icons
    weapon_entries = []
    for w in versus_weapons:
        row_id = w["__RowId"]
        src_png = img_src / "weapon_flat" / f"Path_Wst_{row_id}.png"
        out_path = WEAPON_OUT_DIR / f"{row_id}.webp"
        if overwrite_webp or not out_path.exists():
            Image.open(src_png).convert("RGBA").save(out_path, "WEBP", quality=92, method=4)
        w_class = row_id.split("_")[0]
        slot = CLASS_TO_SLOT[w_class]
        name_zh = loc("CommonMsg/Weapon/WeaponName_Main", row_id) or row_id
        weapon_entries.append((row_id, name_zh, w_class, slot))

    for src_rel, out_name in [
        ("subspe/Wsb_Bomb_Splash00.png", "special_splatbomb.webp"),
        ("subspe/Wsp_SpNiceBall00.png", "special_booyah.webp"),
    ]:
        out_path = WEAPON_OUT_DIR / out_name
        if overwrite_webp or not out_path.exists():
            Image.open(img_src / src_rel).convert("RGBA").save(out_path, "WEBP", quality=95, method=4)

    # 2. Convert badges & compute difficulty ordering
    processed_badges = []
    for b in badges_raw:
        stem = b["__RowId"].replace("Work/Gyml/BadgeInfo", "Badge").replace(".spl__BadgeInfo.gyml", "")
        src_png = img_src / "badge" / f"{stem}.png"
        out_path = BADGE_OUT_DIR / f"{stem}.webp"
        if overwrite_webp or not out_path.exists():
            Image.open(src_png).convert("RGBA").save(out_path, "WEBP", quality=92, method=4)

        req_zh = resolve_desc(b)
        name_zh = make_badge_name_zh(b, req_zh)
        diff_f = compute_difficulty_score(b)
        weapon_row = weapons_by_id[b["Sub1_Int"]]["__RowId"] if b["Category"] == "WeaponLevel" else ""
        processed_badges.append({
            "id": b["Name"],
            "img": stem,
            "nameZh": name_zh,
            "reqZh": req_zh,
            "cat": category_group(b["Category"]),
            "diffFloat": diff_f,
            "order": b["Order"],
            "weaponRowId": weapon_row,
        })

    processed_badges.sort(key=lambda x: (x["diffFloat"], x["order"], x["id"]))
    for pb in processed_badges:
        d_int = max(1, min(100, int(round(pb["diffFloat"]))))
        pb["difficulty"] = d_int
        pb["tier"] = tier_for_difficulty(d_int)

    # 3. Emit generated TypeScript modules
    ver_label = f"{version[:-2]}.{version[-2]}.{version[-1]}" if len(version) >= 3 else version
    weapons_ts = [
        f"// AUTO-GENERATED from Splatoon 3 v{ver_label} datamine ({len(weapon_entries)} Versus weapons). Do not edit manually.",
        "export interface Splat3WeaponInfo {",
        "  readonly rowId: string;",
        "  readonly nameZh: string;",
        "  readonly weaponClass: string;",
        "  readonly slot: 0 | 1 | 2 | 3 | 4 | 5;",
        "}",
        "",
        "// Tuple: [rowId, nameZh, weaponClass, slot]",
        "const RAW_SPLAT3_WEAPONS: ReadonlyArray<readonly [string, string, string, 0 | 1 | 2 | 3 | 4 | 5]> = [",
    ]
    for row_id, name_zh, w_class, slot in weapon_entries:
        weapons_ts.append(
            f"  [{json.dumps(row_id)}, {json.dumps(name_zh, ensure_ascii=False)}, {json.dumps(w_class)}, {slot}],"
        )
    weapons_ts += [
        "];",
        "",
        "export const SPLAT3_WEAPONS: readonly Splat3WeaponInfo[] = RAW_SPLAT3_WEAPONS.map(",
        "  ([rowId, nameZh, weaponClass, slot]) => ({ rowId, nameZh, weaponClass, slot }),",
        ");",
        "",
        "export const SPLAT3_WEAPON_BY_ROW_ID: ReadonlyMap<string, Splat3WeaponInfo> = new Map(",
        "  SPLAT3_WEAPONS.map((w) => [w.rowId, w]),",
        ");",
        "",
        "export const SPLAT3_WEAPONS_BY_SLOT: ReadonlyArray<readonly Splat3WeaponInfo[]> = [",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 0),",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 1),",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 2),",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 3),",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 4),",
        "  SPLAT3_WEAPONS.filter((w) => w.slot === 5),",
        "];",
        "",
    ]
    (REPO_ROOT / "src/data/splat3Weapons.generated.ts").write_text(
        "\n".join(weapons_ts), encoding="utf-8"
    )

    badges_ts = [
        f"// AUTO-GENERATED from Splatoon 3 v{ver_label} datamine (all {len(processed_badges):,} badges sorted by acquisition difficulty).",
        "export type Splat3BadgeCategory = 'weapon' | 'special' | 'salmon' | 'battle' | 'story' | 'lifestyle';",
        "export type RawBadgeTier = 'rookie' | 'bronze' | 'silver' | 'gold' | 'holo' | 'mythic';",
        "",
        "// Tuple: [id, imgStem, nameZh, reqZh, category, difficulty(1-100), tier, weaponRowId]",
        "export const RAW_SPLAT3_BADGES_V1200: ReadonlyArray<",
        "  readonly [string, string, string, string, Splat3BadgeCategory, number, RawBadgeTier, string]",
        "> = [",
    ]
    for pb in processed_badges:
        row = [
            pb["id"],
            pb["img"],
            pb["nameZh"],
            pb["reqZh"],
            pb["cat"],
            pb["difficulty"],
            pb["tier"],
            pb["weaponRowId"],
        ]
        badges_ts.append(f"  {json.dumps(row, ensure_ascii=False)},")
    badges_ts += ["];", ""]
    (REPO_ROOT / "src/data/splat3Badges.generated.ts").write_text(
        "\n".join(badges_ts), encoding="utf-8"
    )

    print(
        f"Synced Splatoon 3 v{ver_label}: {len(processed_badges)} badges, {len(weapon_entries)} weapons.",
        flush=True,
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Sync Splatoon 3 assets and TS datasets from Leanny/splat3.")
    parser.add_argument("--version", default="1200", help="Leanny/splat3 mush version folder (default: 1200)")
    parser.add_argument("--work-dir", default="/tmp/splat3_sync", help="Temporary sparse-clone directory")
    parser.add_argument("--skip-clone", action="store_true", help="Reuse existing --work-dir without git pull")
    parser.add_argument("--overwrite-webp", action="store_true", help="Re-encode existing WebP files")
    args = parser.parse_args()
    sync(args.version, Path(args.work_dir), args.skip_clone, args.overwrite_webp)


if __name__ == "__main__":
    main()
