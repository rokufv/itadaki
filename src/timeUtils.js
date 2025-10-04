/**
 * 時刻計算ユーティリティ
 * 時刻のパース、フォーマット、計算を行う
 */

/**
 * 時刻文字列("HH:MM")をオブジェクトに変換
 * @param {string} timeStr - 時刻文字列 (例: "14:30")
 * @returns {Object} { hours, minutes }
 */
export function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return { hours: h || 0, minutes: m || 0 };
}

/**
 * 小数時間を時刻文字列("HH:MM")に変換
 * @param {number} decimalHours - 小数時間 (例: 14.75 = 14:45)
 * @returns {string} 時刻文字列 (例: "14:45")
 */
export function formatTime(decimalHours) {
    let totalMinutes = Math.round(decimalHours * 60);
    
    // 負の時間を翌日に補正
    while (totalMinutes < 0) {
        totalMinutes += 24 * 60;
    }
    // 24時間を超える場合は0時からに補正
    totalMinutes = totalMinutes % (24 * 60);
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * 時刻に指定時間を加算
 * @param {string} timeStr - 基準時刻 (例: "14:00")
 * @param {number} hoursToAdd - 加算する時間（負の値も可）
 * @returns {string} 加算後の時刻 (例: "16:30")
 */
export function addHours(timeStr, hoursToAdd) {
    const time = parseTime(timeStr);
    const decimalHours = time.hours + (time.minutes / 60) + hoursToAdd;
    return formatTime(decimalHours);
}

/**
 * 2つの時刻間の経過時間を計算
 * @param {string} time1 - 開始時刻
 * @param {string} time2 - 終了時刻
 * @returns {string} 経過時間の文字列 (例: "2時間30分")
 */
export function calculateTimeDuration(time1, time2) {
    try {
        const [h1, m1] = time1.split(':').map(Number);
        const [h2, m2] = time2.split(':').map(Number);
        let minutes = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (minutes < 0) minutes += 24 * 60; // Handle next day
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}時間${mins}分`;
        if (hours > 0) return `${hours}時間`;
        if (mins > 0) return `${mins}分`;
        return '';
    } catch (e) {
        return '';
    }
}

