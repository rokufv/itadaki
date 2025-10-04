/**
 * 準備度計算マネージャー
 * メンバーの総合準備度評価を担当
 */

import * as CONST from '../constants.js';

export class PreparationManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * メンバーの総合準備度を計算
     * 
     * 重み付け:
     * - 安全管理: 40% (最も重要)
     * - 装備: 35% (必須)
     * - 経験: 25% (補完可能)
     * 
     * @param {Object} member - メンバー情報
     * @param {number} safetyScore - 安全スコア (0-100)
     * @param {number} gearScore - 装備スコア (0-100)
     * @param {number} experienceScore - 経験スコア (0-100)
     * @returns {number} 総合準備度 (0-100)
     */
    calculateOverallPreparationStandard(member, safetyScore, gearScore, experienceScore) {
        let overall = Math.round(
            (safetyScore * CONST.SAFETY_WEIGHT) + 
            (gearScore * CONST.GEAR_WEIGHT) + 
            (experienceScore * CONST.EXPERIENCE_WEIGHT)
        );
        
        // 安全キャップを適用
        const hasRecent48h = this.context.healthManager.hasRecentHealthWithinHours(
            member, 
            CONST.RECENT_HEALTH_CHECK_HOURS
        );
        const safetyLow = safetyScore < 50;
        const criticalMissing = this.context.gearManager.hasCriticalGearMissing(member.id);
        
        if (safetyLow) overall = Math.min(overall, CONST.SAFETY_LOW_CAP);
        if (criticalMissing) overall = Math.min(overall, CONST.CRITICAL_GEAR_MISSING_CAP);
        if (!hasRecent48h) overall = Math.min(overall, CONST.NO_RECENT_HEALTH_CAP);
        
        return overall;
    }

    /**
     * 準備度表示を更新
     */
    updatePreparationDisplay() {
        const listDiv = document.getElementById('memberPreparationList');
        if (!listDiv) return;
        
        if (this.context.members.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>';
            return;
        }
        
        let preparationHtml = '<div class="preparation-grid">';
        
        this.context.members.forEach(member => {
            const memberGear = this.context.gearChecklist[member.id] || {};
            const memberHealth = this.context.healthRecords.filter(h => h.memberId === member.id);
            const memberHiking = this.context.hikingRecords.filter(h => h.memberId === member.id);
            
            // 各スコアを計算
            const gearScoreNum = this.context.gearManager.computeGearScore(member.id);
            const gearPercentage = gearScoreNum.toFixed(1);
            
            const recentHealth = memberHealth.filter(h => {
                const recordDate = new Date(h.recordedAt);
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                return recordDate >= threeDaysAgo;
            });
            
            const experienceScore = this.context.hikingManager.calculateExperienceScore(member, memberHiking);
            const safetyScore = this.context.healthManager.computeSafetyScore(member.id);
            const overall = this.calculateOverallPreparationStandard(
                member, 
                safetyScore, 
                gearScoreNum, 
                experienceScore.score
            );
            
            preparationHtml += `
                <div class="preparation-card">
                    <h4>${member.name}</h4>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>装備準備度</span>
                            <span>${gearPercentage}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${gearPercentage}%"></div>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>体調管理</span>
                            <span>${recentHealth.length > 0 ? '記録あり' : '記録なし'}</span>
                        </div>
                        <div style="color: #666; font-size: 0.9em;">直近3日間の記録: ${recentHealth.length}件</div>
                        <div style="color: #666; font-size: 0.9em;">安全管理スコア: ${safetyScore}</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>登山経験</span>
                            <span>${experienceScore.level}</span>
                        </div>
                        <div style="color: #666; font-size: 0.9em;">登山回数: ${memberHiking.length}回</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>総合準備度</span>
                            <span>${overall}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${overall}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        preparationHtml += '</div>';
        listDiv.innerHTML = preparationHtml;
    }
}

