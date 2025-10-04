/**
 * 健康・安全管理マネージャー
 * 体調記録とリスク評価を担当
 */

import * as CONST from '../constants.js';

export class HealthManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * 安全管理スコアを計算
     * @param {number} memberId - メンバーID
     * @returns {number} 安全スコア (0-100)
     */
    computeSafetyScore(memberId) {
        const now = new Date();
        const windowStart = new Date(now.getTime());
        windowStart.setDate(windowStart.getDate() - CONST.HEALTH_RECORD_WINDOW_DAYS);
        
        const records = this.context.healthRecords.filter(
            h => h.memberId === memberId && new Date(h.recordedAt) >= windowStart
        );
        
        if (records.length === 0) return 70;
        
        const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
        const conditions = records.map(r => r.condition).filter(v => typeof v === 'number');
        const fatigues = records.map(r => r.fatigueLevel).filter(v => typeof v === 'number');
        const sleepsAll = records.map(r => r.sleepHours).filter(v => typeof v === 'number' && !isNaN(v));
        
        const avgCondition = conditions.length ? avg(conditions) : 3;
        const avgFatigue = fatigues.length ? avg(fatigues) : 2;
        const avgSleep = sleepsAll.length ? avg(sleepsAll) : 7;
        
        const conditionScore = Math.max(0, Math.min(1, (avgCondition - 1) / 4)) * 100;
        const fatigueScore = Math.max(0, Math.min(1, (5 - avgFatigue) / 4)) * 100;
        const sleepScore = Math.max(0, Math.min(1, avgSleep / 7)) * 100;
        
        let safety = Math.round(conditionScore * 0.5 + fatigueScore * 0.3 + sleepScore * 0.2);
        
        const redFlag = records.some(r => 
            (r.condition && r.condition <= CONST.CRITICAL_CONDITION_THRESHOLD) || 
            (r.fatigueLevel && r.fatigueLevel >= CONST.HIGH_FATIGUE_THRESHOLD) || 
            (typeof r.sleepHours === 'number' && r.sleepHours < CONST.MIN_SLEEP_HOURS)
        );
        
        if (redFlag) safety = Math.min(safety, 60);
        return safety;
    }

    /**
     * 直近体調記録の有無をチェック
     * @param {Object} member - メンバー情報
     * @param {number} hours - チェック期間（時間）
     * @returns {boolean} 記録があればtrue
     */
    hasRecentHealthWithinHours(member, hours) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.context.healthRecords.some(h => h.memberId === member.id && new Date(h.recordedAt) >= cutoff);
    }

    /**
     * リスク評価を更新
     */
    updateRiskAssessment() {
        const riskDiv = document.getElementById('riskAssessment');
        if (!riskDiv) return;
        if (this.context.members.length === 0) { 
            riskDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>'; 
            return; 
        }
        
        const recentRecords = this.context.healthRecords.filter(record => {
            const recordDate = new Date(record.recordedAt);
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            return recordDate >= twoDaysAgo;
        });
        
        let riskHtml = '<h4>メンバー別リスク評価</h4>';
        this.context.members.forEach(member => {
            const memberRecords = recentRecords.filter(r => r.memberId === member.id);
            let riskText = '低リスク';
            let riskColor = 'status-excellent';
            
            if (memberRecords.length > 0) {
                const avgCondition = memberRecords.reduce((sum, r) => sum + r.condition, 0) / memberRecords.length;
                const avgFatigue = memberRecords.reduce((sum, r) => sum + r.fatigueLevel, 0) / memberRecords.length;
                const sleepValues = memberRecords
                    .map(r => r.sleepHours)
                    .filter(v => typeof v === 'number' && !Number.isNaN(v));
                const avgSleep = sleepValues.length ? sleepValues.reduce((sum, v) => sum + v, 0) / sleepValues.length : 7;
                
                if (avgCondition <= 2 || avgFatigue >= 4 || avgSleep < 5) { 
                    riskText = '高リスク'; 
                    riskColor = 'status-poor'; 
                } else if (avgCondition <= 3 || avgFatigue >= 3 || avgSleep < 6) { 
                    riskText = '中リスク'; 
                    riskColor = 'status-good'; 
                }
            } else {
                riskText = 'データ不足';
                riskColor = 'status-good';
            }
            
            riskHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin-bottom: 5px; border-radius: 8px;">
                    <div><strong>${member.name}</strong></div>
                    <div class="status-indicator ${riskColor}">${riskText}</div>
                </div>
            `;
        });
        riskDiv.innerHTML = riskHtml;
    }
}

