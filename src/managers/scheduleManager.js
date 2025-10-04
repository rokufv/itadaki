/**
 * スケジュール管理マネージャー
 * 登山スケジュールの生成と管理を担当
 */

import * as CONST from '../constants.js';
import { formatTime, parseTime, calculateTimeDuration } from '../timeUtils.js';
import { MOUNTAIN_HUTS } from '../mountainData.js';

export class ScheduleManager {
    constructor(context) {
        this.context = context; // FujisanTeamManager instance
    }

    /**
     * 山小屋から山頂までの登山時間を計算
     * @param {number} hutElevation - 山小屋の標高（m）
     * @returns {number} 登山時間（時間）
     */
    calculateHoursToSummit(hutElevation) {
        const elevationDiff = CONST.SUMMIT_ELEVATION - hutElevation;
        const hours = elevationDiff / CONST.CLIMBING_RATE_M_PER_HOUR;
        return Math.max(1, Math.min(hours, 6)); // 1-6時間の範囲に制限
    }

    /**
     * 五合目から山小屋までの登山時間を計算
     * @param {string} route - ルート名
     * @param {number} hutElevation - 山小屋の標高（m）
     * @returns {number} 登山時間（時間）
     */
    calculateHoursToHut(route, hutElevation) {
        const startElevation = CONST.ROUTE_START_ELEVATIONS[route] || 2305;
        const elevationDiff = hutElevation - startElevation;
        const hours = elevationDiff / CONST.CLIMBING_RATE_M_PER_HOUR;
        return Math.max(hours, 0.5); // 最低30分
    }

    /**
     * ご来光コースの標準スケジュールを生成
     * @param {string} route - ルート名
     * @param {Object} hut - 山小屋情報 { name, elevation }
     * @returns {Array} スケジュール配列
     */
    calculateGoraikoSchedule(route, hut) {
        const schedule = [];
        const hutElevation = hut.elevation;
        
        // 登山時間を計算
        const hoursToSummit = this.calculateHoursToSummit(hutElevation);
        const hoursToHut = this.calculateHoursToHut(route, hutElevation);
        
        // ━━━ Day 1（1日目）━━━
        schedule.push({ time: CONST.START_TIME, activity: '⛰️ 五合目集合' });
        schedule.push({ time: CONST.CLIMBING_START_TIME, activity: '📋 装備確認・登山開始' });
        
        // 登山時間が3時間以上の場合は休憩を追加
        if (hoursToHut >= 3) {
            const firstRestTime = formatTime(10.5 + (hoursToHut / 2));
            schedule.push({ 
                time: firstRestTime, 
                activity: '🍙 休憩・水分補給' 
            });
        }
        
        // 山小屋到着
        const hutArrivalTime = formatTime(10.5 + hoursToHut);
        const hutArrivalHour = parseTime(hutArrivalTime).hours;
        schedule.push({ 
            time: hutArrivalTime, 
            activity: `🏠 ${hut.name}到着` 
        });
        
        // 夕食・就寝
        const dinnerHour = Math.min(Math.max(hutArrivalHour + 1, CONST.MIN_DINNER_HOUR), CONST.MAX_DINNER_HOUR);
        schedule.push({ 
            time: `${dinnerHour.toString().padStart(2, '0')}:00`, 
            activity: '🍱 夕食' 
        });
        
        const bedtimeHour = Math.min(Math.max(dinnerHour + 2, CONST.MIN_BEDTIME_HOUR), CONST.MAX_BEDTIME_HOUR);
        schedule.push({ 
            time: `${bedtimeHour.toString().padStart(2, '0')}:00`, 
            activity: '🌙 就寝' 
        });
        
        // ━━━ Day 2（2日目）ご来光コース ━━━
        const sunriseTime = CONST.SUNRISE_TIME;
        const departureHour = 5 - Math.ceil(hoursToSummit);
        
        // 起床・出発時刻の計算
        let wakeUpHour = Math.max(departureHour - 1, 1);
        if (departureHour < 0) {
            wakeUpHour = 24 + departureHour - 1;
        }
        
        schedule.push({ 
            time: `${wakeUpHour.toString().padStart(2, '0')}:00`, 
            activity: '⏰ 起床・準備' 
        });
        
        const actualDepartureHour = departureHour < 0 ? 24 + departureHour : departureHour;
        schedule.push({ 
            time: `${Math.max(actualDepartureHour, 1).toString().padStart(2, '0')}:00`, 
            activity: '🔦 山小屋出発（ヘッドライト装着）' 
        });
        
        // 山頂でご来光
        schedule.push({ time: sunriseTime, activity: `🌅 山頂でご来光（標高${CONST.SUMMIT_ELEVATION}m）` });
        schedule.push({ time: '06:00', activity: '📸 記念撮影・休憩' });
        schedule.push({ time: CONST.DESCENT_START_TIME, activity: '⬇️ 下山開始' });
        
        // 下山
        const totalDescentTime = hoursToHut * CONST.DESCENT_TIME_RATIO;
        const fiveGoArrivalTime = formatTime(7 + totalDescentTime);
        
        schedule.push({ 
            time: fiveGoArrivalTime, 
            activity: '⛰️ 五合目到着・解散' 
        });
        
        return schedule;
    }

    /**
     * 自動スケジュールを生成
     */
    generateAutoSchedule() {
        if (!this.context.plan.route || !this.context.plan.hut) {
            this.context.showToast('先にルートと山小屋を選択してください', 'warning');
            return;
        }
        
        const huts = MOUNTAIN_HUTS[this.context.plan.route];
        const selectedHut = huts.find(h => h.name === this.context.plan.hut);
        if (!selectedHut) {
            this.context.showToast('山小屋情報が見つかりません', 'error');
            return;
        }
        
        // スケジュール生成
        const schedule = this.calculateGoraikoSchedule(this.context.plan.route, selectedHut);
        
        // エントリーをクリアして追加
        this.context.plan.entries = [];
        schedule.forEach((entry, index) => {
            this.context.plan.entries.push({
                id: Date.now() + Math.random(),
                time: entry.time,
                activity: entry.activity,
                order: index
            });
        });
        
        this.context.saveData();
        this.renderPlanEntries();
        
        document.getElementById('planScheduleList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        this.context.showToast('標準スケジュールを生成しました！', 'success');
    }

    /**
     * タイムラインエントリーを表示
     */
    renderPlanEntries() {
        const container = document.getElementById('planScheduleList');
        if (!container) return;
        
        // order番号でソート
        const sorted = [...this.context.plan.entries].sort((a, b) => {
            if (typeof a.order === 'number' && typeof b.order === 'number') {
                return a.order - b.order;
            }
            return a.time.localeCompare(b.time);
        });
        
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state">スケジュールがありません</div>';
            return;
        }
        
        container.innerHTML = sorted.map((e, index) => {
            let durationHtml = '';
            if (index > 0) {
                const prevTime = sorted[index - 1].time;
                const duration = calculateTimeDuration(prevTime, e.time);
                if (duration) {
                    durationHtml = `<span class="timeline-duration">+${duration}</span>`;
                }
            }
            
            return `
                <div class="timeline-item">
                    <div class="timeline-time">${e.time}</div>
                    <div class="timeline-connector"></div>
                    <div class="timeline-activity">${e.activity}${durationHtml}</div>
                    <button class="timeline-delete" data-action="delete-plan-entry" data-id="${e.id}">削除</button>
                </div>
            `;
        }).join('');
    }

    /**
     * スケジュールエントリーを追加
     */
    addPlanEntry() {
        const time = document.getElementById('planTime')?.value || '';
        const activity = document.getElementById('planActivity')?.value.trim() || '';
        if (!time || !activity) { 
            this.context.showToast('時刻とアクティビティを入力してください', 'warning'); 
            return; 
        }
        
        const maxOrder = this.context.plan.entries.length > 0 
            ? Math.max(...this.context.plan.entries.map(e => e.order || 0))
            : -1;
        
        const entry = { 
            id: Date.now(), 
            time, 
            activity,
            order: maxOrder + 1
        };
        
        this.context.plan.entries.push(entry);
        this.renderPlanEntries();
        this.context.scheduleSave(300);
        document.getElementById('planActivity').value = '';
    }

    /**
     * スケジュールエントリーを削除
     * @param {number} entryId - エントリーID
     */
    deletePlanEntry(entryId) {
        this.context.plan.entries = this.context.plan.entries.filter(e => e.id !== entryId);
        this.renderPlanEntries();
        this.context.scheduleSave(300);
    }

    /**
     * スケジュールを全クリア
     */
    clearPlan() {
        this.context.plan = { date: '', hut: '', entries: [] };
        const dateEl = document.getElementById('planDate');
        const hutEl = document.getElementById('planHut');
        if (dateEl) dateEl.value = '';
        if (hutEl) hutEl.value = '';
        this.renderPlanEntries();
        this.context.scheduleSave(300);
    }

    /**
     * タイムライン全削除
     */
    clearTimeline() {
        this.context.plan.entries = [];
        this.renderPlanEntries();
        this.context.saveData();
        this.context.showToast('タイムラインを全て削除しました', 'success');
    }

    /**
     * スケジュールをエクスポート
     */
    exportPlan() {
        const lines = [];
        lines.push(`${this.context.teamName} - 富士山登頂計画`);
        lines.push(`作成日時: ${new Date().toLocaleString()}`);
        lines.push('');
        lines.push(`予定日: ${this.context.plan.date || '未設定'}`);
        lines.push(`山小屋: ${this.context.plan.hut || '未設定'}`);
        lines.push('');
        lines.push('スケジュール:');
        const sorted = [...this.context.plan.entries].sort((a,b) => a.time.localeCompare(b.time));
        if (sorted.length === 0) {
            lines.push('（未登録）');
        } else {
            sorted.forEach(e => lines.push(`${e.time} - ${e.activity}`));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.context.teamName}_登頂計画.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.context.showToast('登頂計画をダウンロードしました', 'success');
    }
}

