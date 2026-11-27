import type {
  BlockerType,
  CascadeStep,
  CellState,
  ClearEffectEvent,
  GoalProgress,
  LevelDef,
  MoveResult,
  SpecialType,
  TileState,
  WeaponId,
} from '../types';
import { getWeapon } from '../data/weapons';

interface MatchRun {
  orientation: 'h' | 'v';
  weaponId: WeaponId;
  cells: Array<{ row: number; col: number }>;
}

export class Match3Engine {
  public readonly levelDef: LevelDef;
  public readonly rows: number;
  public readonly cols: number;
  public grid: CellState[][] = [];
  public movesLeft: number;
  public score = 0;
  public weaponCollected: Record<WeaponId, number> = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  public turfPaintedCount = 0;
  public cratesClearedCount = 0;

  private nextUid = 1;
  private rngState: number;

  constructor(levelDef: LevelDef) {
    this.levelDef = levelDef;
    this.rows = levelDef.rows;
    this.cols = levelDef.cols;
    this.movesLeft = levelDef.moves;
    this.rngState = levelDef.seed >>> 0;
    this.initBoard();
  }

  private rand(): number {
    this.rngState = (this.rngState * 1664525 + 1013904223) >>> 0;
    return this.rngState / 0x100000000;
  }

  private randWeapon(): WeaponId {
    return Math.floor(this.rand() * this.levelDef.weaponCount) as WeaponId;
  }

  private createTile(row: number, col: number, weaponId: WeaponId, special: SpecialType = 'none'): TileState {
    return {
      uid: this.nextUid++,
      weaponId,
      special,
      row,
      col,
    };
  }

  private initBoard(): void {
    this.grid = [];
    for (let r = 0; r < this.rows; r++) {
      const rowArr: CellState[] = [];
      for (let c = 0; c < this.cols; c++) {
        const playable = this.levelDef.mask[r][c] === 1;
        const needsTurf = playable && this.levelDef.turfMask[r][c] === 1;
        const bCode = playable ? this.levelDef.blockerMask[r][c] : 0;
        let blocker: BlockerType = 'none';
        if (bCode === 1) blocker = 'crate1';
        else if (bCode === 2) blocker = 'crate2';
        else if (bCode === 3) blocker = 'ooze';

        rowArr.push({
          row: r,
          col: c,
          playable,
          needsTurf,
          turfPainted: false,
          turfColorHex: '#00E65C',
          blocker,
          tile: null,
        });
      }
      this.grid.push(rowArr);
    }

    // Fill playable non-crate cells avoiding initial 3-in-a-row
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (!cell.playable || cell.blocker === 'crate1' || cell.blocker === 'crate2') continue;
        let chosen = this.randWeapon();
        for (let tries = 0; tries < 20; tries++) {
          const candidate = ((chosen + tries) % this.levelDef.weaponCount) as WeaponId;
          if (!this.wouldCauseInitialMatch(r, c, candidate)) {
            chosen = candidate;
            break;
          }
        }
        cell.tile = this.createTile(r, c, chosen);
      }
    }

    // Guarantee at least one valid move on initial board
    if (!this.findBestHint()) {
      this.shufflePlayableTiles();
    }
  }

  private wouldCauseInitialMatch(r: number, c: number, w: WeaponId): boolean {
    if (
      c >= 2 &&
      this.grid[r][c - 1].tile?.weaponId === w &&
      this.grid[r][c - 2].tile?.weaponId === w
    ) {
      return true;
    }
    if (
      r >= 2 &&
      this.grid[r - 1][c].tile?.weaponId === w &&
      this.grid[r - 2][c].tile?.weaponId === w
    ) {
      return true;
    }
    return false;
  }

  public isInBounds(r: number, c: number): boolean {
    return r >= 0 && r < this.rows && c >= 0 && c < this.cols;
  }

  public canInteractCell(r: number, c: number): boolean {
    if (!this.isInBounds(r, c)) return false;
    const cell = this.grid[r][c];
    if (!cell.playable || !cell.tile) return false;
    if (cell.blocker === 'crate1' || cell.blocker === 'crate2') return false;
    return true;
  }

  public areAdjacent(r1: number, c1: number, r2: number, c2: number): boolean {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }

  public getGoalProgress(): GoalProgress[] {
    return this.levelDef.goals.map((goal) => {
      let current = 0;
      if (goal.type === 'score') {
        current = this.score;
      } else if (goal.type === 'weapon' && goal.weaponId !== undefined) {
        current = this.weaponCollected[goal.weaponId];
      } else if (goal.type === 'turf') {
        current = this.turfPaintedCount;
      } else if (goal.type === 'crate') {
        current = this.cratesClearedCount;
      }
      return {
        goal,
        current: Math.min(current, goal.target),
        completed: current >= goal.target,
      };
    });
  }

  public isLevelWon(): boolean {
    return this.getGoalProgress().every((g) => g.completed);
  }

  public isLevelLost(): boolean {
    return !this.isLevelWon() && this.movesLeft <= 0;
  }

  public getEarnedStars(): number {
    const [s1, s2, s3] = this.levelDef.starScores;
    if (this.score >= s3) return 3;
    if (this.score >= s2) return 2;
    if (this.score >= s1 || this.isLevelWon()) return 1;
    return 0;
  }

  /**
   * Attempts a player swap between (r1, c1) and (r2, c2).
   * Returns full cascade steps so the 3D renderer can animate every match, 4K shot,
   * Splat Bomb detonation, fall, and combo step cleanly.
   */
  public trySwap(r1: number, c1: number, r2: number, c2: number): MoveResult {
    const empty: MoveResult = {
      valid: false,
      swapped: [
        { row: r1, col: c1 },
        { row: r2, col: c2 },
      ],
      steps: [],
      totalScoreGained: 0,
    };

    if (this.movesLeft <= 0 || this.isLevelWon()) return empty;
    if (!this.areAdjacent(r1, c1, r2, c2)) return empty;
    if (!this.canInteractCell(r1, c1) || !this.canInteractCell(r2, c2)) return empty;

    const cellA = this.grid[r1][c1];
    const cellB = this.grid[r2][c2];
    const tileA = cellA.tile!;
    const tileB = cellB.tile!;

    // Swap in-place
    this.swapTiles(cellA, cellB);

    const isSpecialPair =
      tileA.special !== 'none' && tileB.special !== 'none';
    const isBooyahSwap =
      tileA.special === 'booyah' || tileB.special === 'booyah';

    const initialRuns = this.findAllMatchRuns();
    if (!isSpecialPair && !isBooyahSwap && initialRuns.length === 0) {
      // Revert invalid swap
      this.swapTiles(cellA, cellB);
      return empty;
    }

    this.movesLeft--;
    const steps: CascadeStep[] = [];
    let totalScoreGained = 0;
    let comboIndex = 1;

    // First step: handle special-special or booyah-swap immediately if applicable
    if (isSpecialPair || isBooyahSwap) {
      const specialStep = this.resolveDirectSpecialSwap(r1, c1, r2, c2, comboIndex);
      steps.push(specialStep);
      totalScoreGained += specialStep.scoreGained;
      comboIndex++;
    }

    // Cascade loop for regular & follow-up matches
    let safety = 0;
    while (safety < 30) {
      safety++;
      const runs = this.findAllMatchRuns();
      if (runs.length === 0) break;

      const pivot =
        comboIndex === 1
          ? [
              { row: r2, col: c2 },
              { row: r1, col: c1 },
            ]
          : [];
      const step = this.resolveMatchRuns(runs, pivot, comboIndex);
      steps.push(step);
      totalScoreGained += step.scoreGained;
      comboIndex++;
    }

    return {
      valid: true,
      swapped: [
        { row: r1, col: c1 },
        { row: r2, col: c2 },
      ],
      steps,
      totalScoreGained,
    };
  }

  private swapTiles(a: CellState, b: CellState): void {
    const tmp = a.tile;
    a.tile = b.tile;
    b.tile = tmp;
    if (a.tile) {
      a.tile.row = a.row;
      a.tile.col = a.col;
    }
    if (b.tile) {
      b.tile.row = b.row;
      b.tile.col = b.col;
    }
  }

  private findAllMatchRuns(): MatchRun[] {
    const runs: MatchRun[] = [];

    // Horizontal runs
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < this.cols) {
        const tile = this.grid[r][c].tile;
        if (!tile || tile.special === 'booyah') {
          c++;
          continue;
        }
        const w = tile.weaponId;
        let end = c + 1;
        while (end < this.cols) {
          const next = this.grid[r][end].tile;
          if (!next || next.special === 'booyah' || next.weaponId !== w) break;
          end++;
        }
        const len = end - c;
        if (len >= 3) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let k = c; k < end; k++) cells.push({ row: r, col: k });
          runs.push({ orientation: 'h', weaponId: w, cells });
        }
        c = end;
      }
    }

    // Vertical runs
    for (let c = 0; c < this.cols; c++) {
      let r = 0;
      while (r < this.rows) {
        const tile = this.grid[r][c].tile;
        if (!tile || tile.special === 'booyah') {
          r++;
          continue;
        }
        const w = tile.weaponId;
        let end = r + 1;
        while (end < this.rows) {
          const next = this.grid[end][c].tile;
          if (!next || next.special === 'booyah' || next.weaponId !== w) break;
          end++;
        }
        const len = end - r;
        if (len >= 3) {
          const cells: Array<{ row: number; col: number }> = [];
          for (let k = r; k < end; k++) cells.push({ row: k, col: c });
          runs.push({ orientation: 'v', weaponId: w, cells });
        }
        r = end;
      }
    }

    return runs;
  }

  private key(r: number, c: number): string {
    return `${r},${c}`;
  }

  private resolveDirectSpecialSwap(
    r1: number,
    c1: number,
    r2: number,
    c2: number,
    comboIndex: number,
  ): CascadeStep {
    const tA = this.grid[r1][c1].tile!;
    const tB = this.grid[r2][c2].tile!;

    const toClear = new Set<string>();
    const directHitBlockers = new Set<string>();
    const effects: ClearEffectEvent[] = [];

    toClear.add(this.key(r1, c1));
    toClear.add(this.key(r2, c2));

    const addRow = (row: number): Array<{ row: number; col: number }> => {
      const cells: Array<{ row: number; col: number }> = [];
      if (row < 0 || row >= this.rows) return cells;
      for (let c = 0; c < this.cols; c++) {
        if (!this.grid[row][c].playable) continue;
        cells.push({ row, col: c });
        toClear.add(this.key(row, c));
        directHitBlockers.add(this.key(row, c));
      }
      return cells;
    };

    const addCol = (col: number): Array<{ row: number; col: number }> => {
      const cells: Array<{ row: number; col: number }> = [];
      if (col < 0 || col >= this.cols) return cells;
      for (let r = 0; r < this.rows; r++) {
        if (!this.grid[r][col].playable) continue;
        cells.push({ row: r, col });
        toClear.add(this.key(r, col));
        directHitBlockers.add(this.key(r, col));
      }
      return cells;
    };

    if (tA.special === 'booyah' && tB.special === 'booyah') {
      // Double Booyah clears entire board!
      const allCells: Array<{ row: number; col: number }> = [];
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          if (!this.grid[r][c].playable) continue;
          allCells.push({ row: r, col: c });
          toClear.add(this.key(r, c));
          directHitBlockers.add(this.key(r, c));
        }
      }
      effects.push({
        kind: 'booyah',
        colorHex: '#FFE45E',
        originRow: r2,
        originCol: c2,
        cells: allCells,
      });
    } else if (tA.special === 'booyah' || tB.special === 'booyah') {
      const other = tA.special === 'booyah' ? tB : tA;
      const targetWeapon = other.weaponId;
      const colorHex = getWeapon(targetWeapon).primaryHex;
      const hitCells: Array<{ row: number; col: number }> = [];

      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
          const tile = this.grid[r][c].tile;
          if (tile && tile.weaponId === targetWeapon) {
            hitCells.push({ row: r, col: c });
            toClear.add(this.key(r, c));
            if (other.special === 'eliter4k') {
              addCol(c);
            } else if (other.special === 'splatbomb') {
              addRow(r);
            }
          }
        }
      }
      effects.push({
        kind: 'booyah',
        colorHex,
        originRow: r2,
        originCol: c2,
        cells: hitCells,
      });
    } else if (tA.special === 'eliter4k' && tB.special === 'eliter4k') {
      // Triple column 4K barrage!
      const cells = [...addCol(c2 - 1), ...addCol(c2), ...addCol(c2 + 1)];
      effects.push({
        kind: 'fullColumn4k',
        colorHex: getWeapon(tB.weaponId).primaryHex,
        originRow: r2,
        originCol: c2,
        cells,
      });
    } else if (tA.special === 'splatbomb' && tB.special === 'splatbomb') {
      // Triple row Splat Bomb barrage!
      const cells = [...addRow(r2 - 1), ...addRow(r2), ...addRow(r2 + 1)];
      effects.push({
        kind: 'fullRowBomb',
        colorHex: getWeapon(tB.weaponId).primaryHex,
        originRow: r2,
        originCol: c2,
        cells,
      });
    } else {
      // 4K Sniper + Splat Bomb Cross Combo!
      const cells = [...addCol(c2), ...addRow(r2)];
      effects.push({
        kind: 'crossCombo',
        colorHex: '#38F9D7',
        originRow: r2,
        originCol: c2,
        cells,
      });
    }

    return this.executeClearSet(toClear, directHitBlockers, new Map(), effects, comboIndex);
  }

  private resolveMatchRuns(
    runs: MatchRun[],
    pivots: Array<{ row: number; col: number }>,
    comboIndex: number,
  ): CascadeStep {
    const toClear = new Set<string>();
    const directHitBlockers = new Set<string>();
    const spawnMap = new Map<string, { weaponId: WeaponId; special: SpecialType }>();
    const effects: ClearEffectEvent[] = [];

    // Detect L/T intersections of same weapon
    const hCellMap = new Map<string, MatchRun>();
    for (const run of runs) {
      if (run.orientation === 'h') {
        for (const cell of run.cells) {
          hCellMap.set(this.key(cell.row, cell.col), run);
        }
      }
    }

    const handledRuns = new Set<MatchRun>();

    // Check intersections first
    for (const vRun of runs) {
      if (vRun.orientation !== 'v') continue;
      for (const cell of vRun.cells) {
        const k = this.key(cell.row, cell.col);
        const hRun = hCellMap.get(k);
        if (hRun && hRun.weaponId === vRun.weaponId) {
          handledRuns.add(vRun);
          handledRuns.add(hRun);
          const colorHex = getWeapon(vRun.weaponId).primaryHex;

          // Emit BOTH 4K Sniper (vertical) & Splat Bomb (horizontal) effects!
          effects.push({
            kind: 'vertical4k',
            colorHex,
            originRow: cell.row,
            originCol: cell.col,
            cells: [...vRun.cells],
          });
          effects.push({
            kind: 'horizontalBomb',
            colorHex,
            originRow: cell.row,
            originCol: cell.col,
            cells: [...hRun.cells],
          });

          for (const vc of vRun.cells) toClear.add(this.key(vc.row, vc.col));
          for (const hc of hRun.cells) toClear.add(this.key(hc.row, hc.col));

          // Spawn a special at intersection (Booyah if 5+ combined and either >=5, else Splat Bomb / 4K)
          const totalUnique = new Set([
            ...vRun.cells.map((p) => this.key(p.row, p.col)),
            ...hRun.cells.map((p) => this.key(p.row, p.col)),
          ]).size;
          const special: SpecialType =
            totalUnique >= 6 ? 'booyah' : vRun.cells.length >= hRun.cells.length ? 'eliter4k' : 'splatbomb';
          spawnMap.set(k, { weaponId: vRun.weaponId, special });
          break;
        }
      }
    }

    // Handle remaining standalone runs
    for (const run of runs) {
      if (handledRuns.has(run)) continue;
      const colorHex = getWeapon(run.weaponId).primaryHex;
      const mid = run.cells[Math.floor(run.cells.length / 2)];

      // Every vertical match fires E-liter 4K; every horizontal match detonates Splat Bomb!
      effects.push({
        kind: run.orientation === 'v' ? 'vertical4k' : 'horizontalBomb',
        colorHex,
        originRow: mid.row,
        originCol: mid.col,
        cells: [...run.cells],
      });

      for (const cell of run.cells) {
        toClear.add(this.key(cell.row, cell.col));
      }

      if (run.cells.length >= 4) {
        // Choose spawn position: player's swap pivot if inside run, else middle cell
        let spawnCell = mid;
        for (const p of pivots) {
          if (run.cells.some((rc) => rc.row === p.row && rc.col === p.col)) {
            spawnCell = p;
            break;
          }
        }
        const spawnKey = this.key(spawnCell.row, spawnCell.col);
        if (!spawnMap.has(spawnKey)) {
          const special: SpecialType =
            run.cells.length >= 5
              ? 'booyah'
              : run.orientation === 'v'
                ? 'eliter4k'
                : 'splatbomb';
          spawnMap.set(spawnKey, { weaponId: run.weaponId, special });
        }
      }
    }

    return this.executeClearSet(toClear, directHitBlockers, spawnMap, effects, comboIndex);
  }

  private executeClearSet(
    toClear: Set<string>,
    directHitBlockers: Set<string>,
    spawnMap: Map<string, { weaponId: WeaponId; special: SpecialType }>,
    effects: ClearEffectEvent[],
    comboIndex: number,
  ): CascadeStep {
    // Chain-trigger any existing special tiles caught in toClear
    const triggeredSpecials = new Set<string>();
    const queue = Array.from(toClear);

    while (queue.length > 0) {
      const k = queue.shift()!;
      if (triggeredSpecials.has(k)) continue;
      const [r, c] = k.split(',').map(Number);
      const tile = this.grid[r]?.[c]?.tile;
      if (!tile || tile.special === 'none') continue;

      triggeredSpecials.add(k);
      const colorHex = getWeapon(tile.weaponId).primaryHex;

      if (tile.special === 'eliter4k') {
        const colCells: Array<{ row: number; col: number }> = [];
        for (let rr = 0; rr < this.rows; rr++) {
          if (!this.grid[rr][c].playable) continue;
          colCells.push({ row: rr, col: c });
          const nk = this.key(rr, c);
          directHitBlockers.add(nk);
          if (!toClear.has(nk)) {
            toClear.add(nk);
            queue.push(nk);
          }
        }
        effects.push({
          kind: 'fullColumn4k',
          colorHex,
          originRow: r,
          originCol: c,
          cells: colCells,
        });
      } else if (tile.special === 'splatbomb') {
        const rowCells: Array<{ row: number; col: number }> = [];
        for (let cc = 0; cc < this.cols; cc++) {
          if (!this.grid[r][cc].playable) continue;
          rowCells.push({ row: r, col: cc });
          const nk = this.key(r, cc);
          directHitBlockers.add(nk);
          if (!toClear.has(nk)) {
            toClear.add(nk);
            queue.push(nk);
          }
        }
        effects.push({
          kind: 'fullRowBomb',
          colorHex,
          originRow: r,
          originCol: c,
          cells: rowCells,
        });
      } else if (tile.special === 'booyah') {
        // Chain-triggered Booyah clears the most abundant weapon on the board
        const counts = [0, 0, 0, 0, 0, 0];
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            const t = this.grid[rr][cc].tile;
            if (t && t.special !== 'booyah') counts[t.weaponId]++;
          }
        }
        let bestW: WeaponId = 0;
        for (let w = 1; w < this.levelDef.weaponCount; w++) {
          if (counts[w] > counts[bestW]) bestW = w as WeaponId;
        }
        const hitCells: Array<{ row: number; col: number }> = [];
        for (let rr = 0; rr < this.rows; rr++) {
          for (let cc = 0; cc < this.cols; cc++) {
            const t = this.grid[rr][cc].tile;
            if (t && t.weaponId === bestW) {
              hitCells.push({ row: rr, col: cc });
              const nk = this.key(rr, cc);
              if (!toClear.has(nk)) {
                toClear.add(nk);
                queue.push(nk);
              }
            }
          }
        }
        effects.push({
          kind: 'booyah',
          colorHex: getWeapon(bestW).primaryHex,
          originRow: r,
          originCol: c,
          cells: hitCells,
        });
      }
    }

    // Collect adjacent crate hits from cleared tile cells
    const blockerHitSet = new Set<string>(directHitBlockers);
    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ];
    for (const k of toClear) {
      const [r, c] = k.split(',').map(Number);
      const cell = this.grid[r][c];
      if (cell.blocker === 'ooze') {
        blockerHitSet.add(k);
      }
      if (cell.tile) {
        for (const [dr, dc] of dirs) {
          const nr = r + dr;
          const nc = c + dc;
          if (!this.isInBounds(nr, nc)) continue;
          const adj = this.grid[nr][nc];
          if (adj.blocker === 'crate1' || adj.blocker === 'crate2') {
            blockerHitSet.add(this.key(nr, nc));
          }
        }
      }
    }

    const clearedTiles: CascadeStep['clearedTiles'] = [];
    const spawnedSpecials: CascadeStep['spawnedSpecials'] = [];
    const blockerHits: CascadeStep['blockerHits'] = [];
    const turfPainted: CascadeStep['turfPainted'] = [];
    let scoreGained = 0;

    // 1. Damage blockers
    for (const bk of blockerHitSet) {
      const [r, c] = bk.split(',').map(Number);
      const cell = this.grid[r][c];
      if (cell.blocker === 'none') continue;
      const prev = cell.blocker;
      let next: BlockerType = 'none';
      if (prev === 'crate2') {
        next = 'crate1';
        scoreGained += 80;
      } else if (prev === 'crate1' || prev === 'ooze') {
        next = 'none';
        this.cratesClearedCount++;
        scoreGained += 160;
      }
      cell.blocker = next;
      blockerHits.push({ row: r, col: c, prev, next });
    }

    // 2. Clear tiles & paint turf
    for (const k of toClear) {
      const [r, c] = k.split(',').map(Number);
      const cell = this.grid[r][c];
      if (!cell.playable) continue;

      if (cell.tile) {
        const t = cell.tile;
        clearedTiles.push({
          uid: t.uid,
          row: r,
          col: c,
          weaponId: t.weaponId,
          special: t.special,
        });
        this.weaponCollected[t.weaponId]++;
        const basePoints = t.special !== 'none' ? 120 : 60;
        scoreGained += basePoints;

        if (cell.needsTurf && !cell.turfPainted) {
          const paintHex = '#00E65C';
          cell.turfPainted = true;
          cell.turfColorHex = paintHex;
          this.turfPaintedCount++;
          turfPainted.push({ row: r, col: c, colorHex: paintHex });
          scoreGained += 100;
        }
        cell.tile = null;
      } else if (cell.needsTurf && !cell.turfPainted && cell.blocker === 'none') {
        cell.turfPainted = true;
        cell.turfColorHex = '#00E65C';
        this.turfPaintedCount++;
        turfPainted.push({ row: r, col: c, colorHex: '#00E65C' });
        scoreGained += 100;
      }
    }

    // 3. Spawn newly earned specials (4K Sniper / Splat Bomb / Booyah Bomb)
    for (const [sk, spec] of spawnMap.entries()) {
      const [r, c] = sk.split(',').map(Number);
      const cell = this.grid[r][c];
      if (!cell.playable || cell.blocker === 'crate1' || cell.blocker === 'crate2') continue;
      const newTile = this.createTile(r, c, spec.weaponId, spec.special);
      cell.tile = newTile;
      spawnedSpecials.push({
        uid: newTile.uid,
        row: r,
        col: c,
        weaponId: newTile.weaponId,
        special: newTile.special,
      });
      scoreGained += 150;
    }

    // Apply combo multiplier
    const multiplier = 1 + (comboIndex - 1) * 0.45;
    scoreGained = Math.round(scoreGained * multiplier);
    this.score += scoreGained;

    // 4. Gravity & refill
    const falls = this.applyGravityAndRefill();

    return {
      comboIndex,
      clearedTiles,
      spawnedSpecials,
      blockerHits,
      turfPainted,
      effects,
      falls,
      scoreGained,
    };
  }

  private applyGravityAndRefill(): CascadeStep['falls'] {
    const falls: CascadeStep['falls'] = [];

    for (let c = 0; c < this.cols; c++) {
      // Compact column from bottom to top, stopping across hard blockers (crate1/crate2) and holes?
      // To keep Match-3 smooth & never leave unreachable voids under holes/crates, tiles drop smoothly
      // through holes/crates into any open playable cell below!
      let writeRow = this.rows - 1;
      while (writeRow >= 0) {
        const target = this.grid[writeRow][c];
        if (!target.playable || target.blocker === 'crate1' || target.blocker === 'crate2') {
          writeRow--;
          continue;
        }
        if (target.tile) {
          writeRow--;
          continue;
        }

        // Find nearest tile above in this column
        let srcRow = writeRow - 1;
        while (srcRow >= 0) {
          const src = this.grid[srcRow][c];
          if (src.playable && src.tile && src.blocker !== 'crate1' && src.blocker !== 'crate2') {
            break;
          }
          srcRow--;
        }

        if (srcRow >= 0) {
          const moving = this.grid[srcRow][c].tile!;
          this.grid[srcRow][c].tile = null;
          moving.row = writeRow;
          moving.col = c;
          target.tile = moving;
          falls.push({
            uid: moving.uid,
            fromRow: srcRow,
            toRow: writeRow,
            col: c,
            isNew: false,
            weaponId: moving.weaponId,
            special: moving.special,
          });
        } else {
          // Spawn new tile from above the board
          const spawnOffset = -1 - falls.filter((f) => f.col === c && f.isNew).length;
          const newTile = this.createTile(writeRow, c, this.randWeapon());
          target.tile = newTile;
          falls.push({
            uid: newTile.uid,
            fromRow: spawnOffset,
            toRow: writeRow,
            col: c,
            isNew: true,
            weaponId: newTile.weaponId,
            special: newTile.special,
          });
        }
        writeRow--;
      }
    }

    return falls;
  }

  /**
   * Finds a valid swap hint on the current board, prioritizing special combos and 4+ matches.
   */
  public findBestHint(): [{ row: number; col: number }, { row: number; col: number }] | null {
    let fallback: [{ row: number; col: number }, { row: number; col: number }] | null = null;

    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!this.canInteractCell(r, c)) continue;
        const neighbors: Array<[number, number]> = [
          [r, c + 1],
          [r + 1, c],
        ];
        for (const [nr, nc] of neighbors) {
          if (!this.canInteractCell(nr, nc)) continue;
          const cellA = this.grid[r][c];
          const cellB = this.grid[nr][nc];
          const tA = cellA.tile!;
          const tB = cellB.tile!;

          if (
            (tA.special !== 'none' && tB.special !== 'none') ||
            tA.special === 'booyah' ||
            tB.special === 'booyah'
          ) {
            return [
              { row: r, col: c },
              { row: nr, col: nc },
            ];
          }

          if (tA.weaponId === tB.weaponId) continue;

          this.swapTiles(cellA, cellB);
          const runs = this.findAllMatchRuns();
          this.swapTiles(cellA, cellB);

          if (runs.length > 0) {
            const hasLong = runs.some((run) => run.cells.length >= 4);
            if (hasLong) {
              return [
                { row: r, col: c },
                { row: nr, col: nc },
              ];
            }
            if (!fallback) {
              fallback = [
                { row: r, col: c },
                { row: nr, col: nc },
              ];
            }
          }
        }
      }
    }

    return fallback;
  }

  /**
   * Shuffles normal tiles when no valid moves exist, ensuring no instant matches
   * and at least one valid move.
   */
  public shufflePlayableTiles(): boolean {
    const slots: CellState[] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this.grid[r][c];
        if (cell.playable && cell.tile && cell.tile.special === 'none') {
          slots.push(cell);
        }
      }
    }
    if (slots.length < 3) return false;

    for (let attempt = 0; attempt < 25; attempt++) {
      // Fisher-Yates shuffle of weaponIds
      const weapons = slots.map((s) => s.tile!.weaponId);
      for (let i = weapons.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        const tmp = weapons[i];
        weapons[i] = weapons[j];
        weapons[j] = tmp;
      }
      for (let i = 0; i < slots.length; i++) {
        slots[i].tile!.weaponId = weapons[i];
      }
      if (this.findAllMatchRuns().length === 0 && this.findBestHint()) {
        return true;
      }
    }

    // Guaranteed fallback: craft a guaranteed 3-match setup
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols - 3; c++) {
        if (
          this.canInteractCell(r, c) &&
          this.canInteractCell(r, c + 1) &&
          this.canInteractCell(r, c + 2) &&
          this.canInteractCell(r, c + 3)
        ) {
          const w: WeaponId = 0;
          const other: WeaponId = 1;
          this.grid[r][c].tile!.weaponId = w;
          this.grid[r][c + 1].tile!.weaponId = w;
          this.grid[r][c + 2].tile!.weaponId = other;
          this.grid[r][c + 3].tile!.weaponId = w;
          return true;
        }
      }
    }
    return false;
  }
}
