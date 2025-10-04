/**
 * 富士山登頂アプリケーション定数
 * 全ての定数を一元管理
 */

// ━━━ 登山計算定数 ━━━
export const CLIMBING_RATE_M_PER_HOUR = 300;      // 平均登山速度（m/時間）
export const SUMMIT_ELEVATION = 3776;              // 富士山頂標高（m）
export const SUNRISE_TIME = '05:00';               // ご来光時刻
export const DESCENT_TIME_RATIO = 0.7;             // 下山時間の比率（登りの70%）
export const START_TIME = '10:00';                 // 標準集合時刻
export const CLIMBING_START_TIME = '10:30';        // 標準登山開始時刻
export const MIN_DINNER_HOUR = 17;                 // 最も早い夕食時刻
export const MAX_DINNER_HOUR = 19;                 // 最も遅い夕食時刻
export const MIN_BEDTIME_HOUR = 19;                // 最も早い就寝時刻
export const MAX_BEDTIME_HOUR = 21;                // 最も遅い就寝時刻
export const DESCENT_START_TIME = '07:00';         // 下山開始時刻

// ━━━ 体調・安全管理定数 ━━━
export const MIN_SLEEP_HOURS = 5;                  // 最低必要睡眠時間
export const HEALTH_RECORD_WINDOW_DAYS = 3;        // 体調記録の有効期間（日）
export const RECENT_HEALTH_CHECK_HOURS = 48;       // 直近体調チェック期間（時間）
export const CRITICAL_CONDITION_THRESHOLD = 2;      // 危険な体調レベル
export const HIGH_FATIGUE_THRESHOLD = 4;           // 高疲労レベル

// ━━━ 準備度計算の重み ━━━
export const SAFETY_WEIGHT = 0.40;                 // 安全管理の重み（40%）
export const GEAR_WEIGHT = 0.35;                   // 装備準備の重み（35%）
export const EXPERIENCE_WEIGHT = 0.25;             // 経験の重み（25%）

// ━━━ 準備度キャップ（上限制限） ━━━
export const SAFETY_LOW_CAP = 70;                  // 安全スコア低時の上限
export const CRITICAL_GEAR_MISSING_CAP = 60;       // 必須装備欠如時の上限
export const NO_RECENT_HEALTH_CAP = 80;            // 直近体調記録なし時の上限

// ━━━ 装備カテゴリの重み ━━━
export const ESSENTIAL_GEAR_WEIGHT = 0.7;          // 必須装備の重み（70%）
export const RECOMMENDED_GEAR_WEIGHT = 0.2;        // 推奨装備の重み（20%）
export const SEASONAL_GEAR_WEIGHT = 0.1;           // 季節装備の重み（10%）

// ━━━ データ管理 ━━━
export const AUTO_SAVE_INTERVAL_MS = 10 * 1000;    // 自動保存間隔（10秒）
export const DEBOUNCE_SAVE_MS = 500;               // デバウンス保存遅延
export const SERVER_SAVE_DELAY_MS = 1500;          // サーバー保存遅延

// ━━━ ルート別五合目標高 ━━━
export const ROUTE_START_ELEVATIONS = {
    '吉田ルート': 2305,
    '富士宮ルート': 2400,
    '須走ルート': 2000,
    '御殿場ルート': 1440
};

// ━━━ 必須装備ID ━━━
export const CRITICAL_GEAR_IDS = ['boots', 'rain_jacket', 'rain_pants', 'headlamp'];

