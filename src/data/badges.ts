import type { BadgeDef, BadgeTier } from '../types';

export const BADGE_TIER_META: Record<
  BadgeTier,
  {
    labelZh: string;
    colorHex: string;
    borderHex: string;
    bgHex: string;
    glowHex: string;
    rankOrder: number;
  }
> = {
  rookie: {
    labelZh: '菜鳥貼紙',
    colorHex: '#94A3B8',
    borderHex: '#64748B',
    bgHex: '#272E3A',
    glowHex: 'rgba(148,163,184,0.25)',
    rankOrder: 1,
  },
  bronze: {
    labelZh: '銅級徽章',
    colorHex: '#E08E55',
    borderHex: '#B8652E',
    bgHex: '#332218',
    glowHex: 'rgba(224,142,85,0.35)',
    rankOrder: 2,
  },
  silver: {
    labelZh: '銀級徽章',
    colorHex: '#E2E8F0',
    borderHex: '#94A3B8',
    bgHex: '#232B38',
    glowHex: 'rgba(226,232,240,0.4)',
    rankOrder: 3,
  },
  gold: {
    labelZh: '純金徽章',
    colorHex: '#FFD600',
    borderHex: '#F59E0B',
    bgHex: '#382B0C',
    glowHex: 'rgba(255,214,0,0.48)',
    rankOrder: 4,
  },
  holo: {
    labelZh: '全息霓虹',
    colorHex: '#38F9D7',
    borderHex: '#FF2E93',
    bgHex: '#1D1838',
    glowHex: 'rgba(56,249,215,0.55)',
    rankOrder: 5,
  },
  mythic: {
    labelZh: '傳說神話',
    colorHex: '#FFE45E',
    borderHex: '#FF3B8B',
    bgHex: '#1A0F2E',
    glowHex: 'rgba(255,228,94,0.72)',
    rankOrder: 6,
  },
};

interface RawBadgeSpec {
  nameZh: string;
  subtitleZh: string;
  iconKey: string;
  accentHex: string;
}

const RAW_BADGES: readonly RawBadgeSpec[] = [
  // Lv 1-15: 菜鳥貼紙 (Rookie — deliberately humble, funny Splatoon beginner badges!)
  { nameZh: '破舊塗地貼紙', subtitleZh: '邊角有點捲起來的免費貼紙', iconKey: 'sticker', accentHex: '#9CA3AF' },
  { nameZh: '新手魷魚塗鴉', subtitleZh: '用蠟筆畫在紙箱上的魷魚', iconKey: 'squid', accentHex: '#A3A3A3' },
  { nameZh: '試射場紙靶', subtitleZh: '大廳裡最常被打歪的氣球', iconKey: 'target', accentHex: '#94A3B8' },
  { nameZh: '漏墨小水槍', subtitleZh: '射程只有兩步的塑膠玩具', iconKey: 'shooter', accentHex: '#B5A642' },
  { nameZh: '打工見習生名牌', subtitleZh: '第一天忘記帶救生圈', iconKey: 'egg', accentHex: '#A8825E' },
  { nameZh: '一星雜牌貼紙', subtitleZh: '在雜貨店花 100 金幣買的', iconKey: 'star', accentHex: '#8C9B8C' },
  { nameZh: '跌進水裡紀念', subtitleZh: '忘記魷魚不會游泳', iconKey: 'wave', accentHex: '#6B8E9B' },
  { nameZh: '迷路小鮭魚', subtitleZh: '咬著湯匙發呆的夥伴', iconKey: 'salmon', accentHex: '#B07D62' },
  { nameZh: '廉價塑膠別針', subtitleZh: '稍微用力就會斷掉', iconKey: 'pin', accentHex: '#948EA3' },
  { nameZh: '廣場觀光客', subtitleZh: '剛下火車還在找入口', iconKey: 'plaza', accentHex: '#A39A7E' },
  { nameZh: '生鏽墨水罐', subtitleZh: '背起來有點漏氣', iconKey: 'tank', accentHex: '#8F7E73' },
  { nameZh: '練習用三角錐', subtitleZh: '試射場角落的孤單路障', iconKey: 'cone', accentHex: '#B87A56' },
  { nameZh: '折價券集點章', subtitleZh: '集滿十點可以換一杯水', iconKey: 'ticket', accentHex: '#8E99A2' },
  { nameZh: '塗不滿角落獎', subtitleZh: '家門口總是留下一塊白地', iconKey: 'roller', accentHex: '#A67C8E' },
  { nameZh: '菜鳥聯賽參加獎', subtitleZh: '至少你有按時上線', iconKey: 'squid', accentHex: '#849684' },

  // Lv 16-35: 銅級徽章 (Bronze — getting into Turf War & basic weapons)
  { nameZh: '塗地戰初體驗・銅', subtitleZh: '終於懂得分數怎麼算了', iconKey: 'splat', accentHex: '#D98A4E' },
  { nameZh: '斯普拉射擊槍 1★', subtitleZh: '最經典的入門黃色步槍', iconKey: 'shooter', accentHex: '#E5B53B' },
  { nameZh: '斯普拉滾筒 1★', subtitleZh: '向前滾過去就對了！', iconKey: 'roller', accentHex: '#D6658E' },
  { nameZh: '斯普拉機動槍 1★', subtitleZh: '偶爾翻滾會滾進水裡', iconKey: 'dualies', accentHex: '#5BB5C9' },
  { nameZh: '醋飯泳池常客', subtitleZh: '小心水位突然下降！', iconKey: 'wave', accentHex: '#D98A4E' },
  { nameZh: '飛濺潑桶 1★', subtitleZh: '高拋墨水的小高手', iconKey: 'slosher', accentHex: '#E07A3D' },
  { nameZh: '雨刷刮水刀 1★', subtitleZh: '帥氣揮砍的入門劍士', iconKey: 'wiper', accentHex: '#89B849' },
  { nameZh: '斯普拉炸彈見習', subtitleZh: '學會滾地三角形炸彈！', iconKey: 'bomb', accentHex: '#E07855' },
  { nameZh: '4K 狙擊槍見習', subtitleZh: '開始看懂雷射瞄準線', iconKey: 'sniper', accentHex: '#C98A5B' },
  { nameZh: '魚露遺址探險家', subtitleZh: '荒野峽谷塗地達人', iconKey: 'mountain', accentHex: '#D48244' },
  { nameZh: '熊先生商會兼職', subtitleZh: '準時繳納金鮭魚卵', iconKey: 'egg', accentHex: '#E09A48' },
  { nameZh: '爆破木箱小隊', subtitleZh: '沒有箱子擋得住你', iconKey: 'crate', accentHex: '#C77E42' },
  { nameZh: '連擊新手・銅', subtitleZh: '第一次打出三連鎖！', iconKey: 'bolt', accentHex: '#DF9550' },
  { nameZh: '大廳點心常客', subtitleZh: '吃飽飯更有塗地力氣', iconKey: 'ticket', accentHex: '#D18754' },
  { nameZh: '雜貨店銅級會員', subtitleZh: '置物櫃開始有點樣子了', iconKey: 'pin', accentHex: '#CC844B' },
  { nameZh: '三發獵魚弓 1★', subtitleZh: '三支箭齊發的初學者', iconKey: 'bow', accentHex: '#A672C9' },
  { nameZh: '鰻鯰區街頭客', subtitleZh: '高架橋下的塗鴉戰士', iconKey: 'plaza', accentHex: '#D98A4E' },
  { nameZh: '墨水補給達人', subtitleZh: '潛墨回墨絕不卡彈', iconKey: 'tank', accentHex: '#D6955C' },
  { nameZh: '蠻頹對戰 C 階級', subtitleZh: '踏入真格戰場第一步', iconKey: 'rank', accentHex: '#E08E55' },
  { nameZh: '青銅魷魚戰士', subtitleZh: '正式從菜鳥畢業！', iconKey: 'squid', accentHex: '#E89B5A' },

  // Lv 36-55: 銀級徽章 (Silver — real competitive & Salmon Run progress)
  { nameZh: '斯普拉射擊槍 2★', subtitleZh: '槍法穩定、中線壓制', iconKey: 'shooter', accentHex: '#F3D250' },
  { nameZh: '斯普拉滾筒 2★', subtitleZh: '轉角伏擊讓對手防不勝防', iconKey: 'roller', accentHex: '#F06292' },
  { nameZh: '斯普拉機動槍 2★', subtitleZh: '二段翻滾精準鎖定', iconKey: 'dualies', accentHex: '#4DD0E1' },
  { nameZh: '飛濺潑桶 2★', subtitleZh: '地形高低差專家', iconKey: 'slosher', accentHex: '#FF8A50' },
  { nameZh: '蠻頹對戰 B 階級', subtitleZh: '中階場的節奏掌控者', iconKey: 'rank', accentHex: '#CBD5E1' },
  { nameZh: '熊先生商會正職', subtitleZh: '達人階級的打工支柱', iconKey: 'egg', accentHex: '#F5B041' },
  { nameZh: '橫綱討伐・銀', subtitleZh: '成功擊退頭目鮭魚橫綱', iconKey: 'salmon', accentHex: '#E2E8F0' },
  { nameZh: '雨刷刮水刀 2★', subtitleZh: '蓄力斬斷對手防線', iconKey: 'wiper', accentHex: '#9CCC65' },
  { nameZh: '三發獵魚弓 2★', subtitleZh: '遠距曲射封鎖走位', iconKey: 'bow', accentHex: '#BA68C8' },
  { nameZh: '斯普拉炸彈專家', subtitleZh: '橫向引爆零死角清除', iconKey: 'bomb', accentHex: '#FF7043' },
  { nameZh: '4K 狙擊槍準星・銀', subtitleZh: '直向穿甲一發貫穿全列', iconKey: 'sniper', accentHex: '#90CAF9' },
  { nameZh: '鋼鐵箱粉碎者', subtitleZh: '兩層防禦照樣一掃而空', iconKey: 'crate', accentHex: '#CBD5E1' },
  { nameZh: '鮭魚跑達人 +2', subtitleZh: '狂潮與烤架魚都難不倒', iconKey: 'wave', accentHex: '#94A3B8' },
  { nameZh: '辰龍討伐・銀', subtitleZh: '精準擊破口中炸彈', iconKey: 'salmon', accentHex: '#B0BEC5' },
  { nameZh: '熊先生商會銀鱗', subtitleZh: '收集大量珍貴銀鱗片', iconKey: 'star', accentHex: '#E2E8F0' },
  { nameZh: '幻界探索隊・銀', subtitleZh: '踏上雪白毛茸茸世界', iconKey: 'mountain', accentHex: '#E0F2FE' },
  { nameZh: '毛茸茸淨化師', subtitleZh: '清除所有神秘毛茸茸軟泥', iconKey: 'splat', accentHex: '#D8B4FE' },
  { nameZh: '蠻頹對戰 A 階級', subtitleZh: '邁向頂級高手的門票', iconKey: 'rank', accentHex: '#F1F5F9' },
  { nameZh: '新魷魚嘴部隊三號', subtitleZh: '與小鮭魚並肩拯救世界', iconKey: 'squid', accentHex: '#FDE047' },
  { nameZh: '白銀英雄裝備章', subtitleZh: '幻界突破的榮耀證明', iconKey: 'crown', accentHex: '#E2E8F0' },

  // Lv 56-75: 純金徽章 (Gold — prestigious gold Splatoon 3 badges!)
  { nameZh: '斯普拉射擊槍 4★ 金', subtitleZh: '全能王牌的純金認證', iconKey: 'shooter', accentHex: '#FFD600' },
  { nameZh: '斯普拉滾筒 4★ 金', subtitleZh: '一擊必殺的粉紅閃電', iconKey: 'roller', accentHex: '#FF4081' },
  { nameZh: '斯普拉機動槍 4★ 金', subtitleZh: '極速位移的純金雙槍俠', iconKey: 'dualies', accentHex: '#00E5FF' },
  { nameZh: '飛濺潑桶 4★ 金', subtitleZh: '覆蓋全場的黃金巨浪', iconKey: 'slosher', accentHex: '#FF9100' },
  { nameZh: '蠻頹對戰 S 階級・金', subtitleZh: '踏入黃金強者殿堂', iconKey: 'rank', accentHex: '#FFD600' },
  { nameZh: '秩序之塔登頂章', subtitleZh: '突破蒼白尖塔的純金證明', iconKey: 'tower', accentHex: '#FFE082' },
  { nameZh: '雨刷刮水刀 4★ 金', subtitleZh: '銳不可當的黃金劍豪', iconKey: 'wiper', accentHex: '#AEEA00' },
  { nameZh: '三發獵魚弓 4★ 金', subtitleZh: '百步穿楊的黃金弓神', iconKey: 'bow', accentHex: '#D500F9' },
  { nameZh: '能量讚彈大師・金', subtitleZh: '全隊狂按「讚！」集氣爆破', iconKey: 'booyah', accentHex: '#FFD600' },
  { nameZh: '4K 狙擊槍黃金鏡', subtitleZh: '令敵方不敢露頭的金色雷射', iconKey: 'sniper', accentHex: '#FFEA00' },
  { nameZh: '斯普拉炸彈金盃', subtitleZh: '完美拋物線炸翻全場', iconKey: 'bomb', accentHex: '#FFAB00' },
  { nameZh: '傳說 400 打工金章', subtitleZh: '熊先生親自點頭稱讚', iconKey: 'egg', accentHex: '#FFC400' },
  { nameZh: '秩序晶片收藏家', subtitleZh: '色板全滿的極致構築', iconKey: 'star', accentHex: '#FFE57F' },
  { nameZh: '巨顎討伐・純金', subtitleZh: '在巨口合攏前反殺頭目', iconKey: 'salmon', accentHex: '#FFD740' },
  { nameZh: '真格塔樓黃金霸主', subtitleZh: '一路推進至敵方終點', iconKey: 'tower', accentHex: '#FFD600' },
  { nameZh: '祭典之夜・永遠冠軍', subtitleZh: '廣場霓虹燈為你閃耀', iconKey: 'splat', accentHex: '#FFE100' },
  { nameZh: '魚虎對戰黃金神射', subtitleZh: '帶著魚虎衝破重圍', iconKey: 'bolt', accentHex: '#FFC107' },
  { nameZh: '蠻頹對戰 S+ 純金', subtitleZh: '無數連勝鑄就的純金階級', iconKey: 'rank', accentHex: '#FFD600' },
  { nameZh: '熊先生商會純金徽', subtitleZh: '打工界至高無上的黃金勳章', iconKey: 'crown', accentHex: '#FFCA28' },
  { nameZh: '黃金魷魚大師盃', subtitleZh: '七十五關全破的金色榮耀', iconKey: 'crown', accentHex: '#FFD600' },

  // Lv 76-90: 全息霓虹 (Holo / Prism — 5-star holo weapons, EVP 999, X-Rank!)
  { nameZh: '斯普拉射擊槍 5★ 全息', subtitleZh: '五顆星滿熟練全息閃耀', iconKey: 'shooter', accentHex: '#FFEE00' },
  { nameZh: '斯普拉滾筒 5★ 全息', subtitleZh: '幻彩墨跡席捲戰場', iconKey: 'roller', accentHex: '#FF2E93' },
  { nameZh: '斯普拉機動槍 5★ 全息', subtitleZh: '霓虹殘影無人能捕', iconKey: 'dualies', accentHex: '#00F5FF' },
  { nameZh: '飛濺潑桶 5★ 全息', subtitleZh: '七彩怒濤覆蓋全圖', iconKey: 'slosher', accentHex: '#FF6D00' },
  { nameZh: '大型跑前 5% 全息盃', subtitleZh: '全伺服器頂尖打工傳奇', iconKey: 'egg', accentHex: '#38F9D7' },
  { nameZh: '雨刷刮水刀 5★ 全息', subtitleZh: '極光劍氣劈開整片棋盤', iconKey: 'wiper', accentHex: '#76FF03' },
  { nameZh: '三發獵魚弓 5★ 全息', subtitleZh: '紫金星矢三線爆破', iconKey: 'bow', accentHex: '#B388FF' },
  { nameZh: '傳說 999 極限全息', subtitleZh: '危險度 MAX 完美生還', iconKey: 'salmon', accentHex: '#00E5FF' },
  { nameZh: '三色奪寶戰王者', subtitleZh: '奪下所有超級訊號的傳奇', iconKey: 'booyah', accentHex: '#FF4081' },
  { nameZh: '4K 狙擊槍 5★ 全息', subtitleZh: '彩虹貫穿光束制霸全場', iconKey: 'sniper', accentHex: '#38F9D7' },
  { nameZh: '斯普拉炸彈 5★ 全息', subtitleZh: '超新星級別橫向爆裂', iconKey: 'bomb', accentHex: '#FF5252' },
  { nameZh: 'S+10 傳奇突破章', subtitleZh: '實力已超越常規段位', iconKey: 'rank', accentHex: '#38F9D7' },
  { nameZh: 'X Power 2000+ 全息', subtitleZh: '跨入頂尖 X 戰力俱樂部', iconKey: 'bolt', accentHex: '#00F5D4' },
  { nameZh: '雙重連爆大師・全息', subtitleZh: '4K 與炸彈十字合體專家', iconKey: 'splat', accentHex: '#FF2E93' },
  { nameZh: '霓虹祭典傳說舞台', subtitleZh: '點燃全蠻頹鎮的壓軸演出', iconKey: 'crown', accentHex: '#38F9D7' },

  // Lv 91-100: 傳說神話 (Mythic — ultimate Splatoon 3 pinnacle badges!)
  { nameZh: 'X 比賽前 3000 強', subtitleZh: '全球頂尖戰士的銀紅王冠', iconKey: 'crown', accentHex: '#FF5E99' },
  { nameZh: '秩序之塔無傷神章', subtitleZh: '全色板封神的絕對掌控者', iconKey: 'tower', accentHex: '#7DF9FF' },
  { nameZh: '頭目鮭魚千討伐神像', subtitleZh: '連橫綱見了都會掉頭逃跑', iconKey: 'salmon', accentHex: '#FFD700' },
  { nameZh: '斯普拉炸彈・爆破神話', subtitleZh: '每一顆三角炸彈皆是藝術', iconKey: 'bomb', accentHex: '#FF6B35' },
  { nameZh: '4K 狙擊槍・貫穿神話', subtitleZh: '零失誤的極致神射手', iconKey: 'sniper', accentHex: '#00F5FF' },
  { nameZh: '熊先生最高榮譽金鱗', subtitleZh: '999 金鱗鑄造的傳世秘寶', iconKey: 'egg', accentHex: '#FFE45E' },
  { nameZh: 'X 比賽前 500 強', subtitleZh: '王冠閃耀於戰場最頂端', iconKey: 'crown', accentHex: '#FFD600' },
  { nameZh: 'X 比賽前 10 強神冠', subtitleZh: '舉世仰望的十強神話徽章', iconKey: 'crown', accentHex: '#FF2E93' },
  { nameZh: '斯普拉遁全武器宗師', subtitleZh: '精通所有武器與極限連鎖', iconKey: 'booyah', accentHex: '#38F9D7' },
  { nameZh: '最終祭典・魷魚神話王冠', subtitleZh: '第 100 關完全制霸！永恆傳說！', iconKey: 'mythicCrown', accentHex: '#FFE45E' },
];

export function getBadgeTierForLevel(level: number): BadgeTier {
  if (level <= 15) return 'rookie';
  if (level <= 35) return 'bronze';
  if (level <= 55) return 'silver';
  if (level <= 75) return 'gold';
  if (level <= 90) return 'holo';
  return 'mythic';
}

function getBadgeStarsForTier(tier: BadgeTier, level: number): number {
  switch (tier) {
    case 'rookie':
      return 1;
    case 'bronze':
      return 2;
    case 'silver':
      return 3;
    case 'gold':
      return 4;
    case 'holo':
      return 5;
    case 'mythic':
      return level === 100 ? 6 : 5;
  }
}

export const BADGES: readonly BadgeDef[] = RAW_BADGES.map((raw, idx) => {
  const level = idx + 1;
  const tier = getBadgeTierForLevel(level);
  const meta = BADGE_TIER_META[tier];
  return {
    level,
    id: `badge_${String(level).padStart(3, '0')}`,
    nameZh: raw.nameZh,
    subtitleZh: raw.subtitleZh,
    tier,
    tierLabelZh: meta.labelZh,
    iconKey: raw.iconKey,
    accentHex: raw.accentHex,
    bgHex: meta.bgHex,
    stars: getBadgeStarsForTier(tier, level),
  };
});

export function getBadgeForLevel(level: number): BadgeDef {
  const clamped = Math.max(1, Math.min(BADGES.length, Math.floor(level)));
  return BADGES[clamped - 1];
}
