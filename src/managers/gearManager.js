/**
 * 装備管理マネージャー
 * 装備チェックリストと装備スコアの管理を担当
 */

import * as CONST from '../constants.js';

export class GearManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * 装備カテゴリを表示
     * @param {string} category - カテゴリ名 ('essential', 'recommended', 'seasonal')
     */
    showGearCategory(category) {
        this.context.currentGearCategory = category;
        const checklistDiv = document.getElementById('gearChecklist');
        
        if (!this.context.currentGearMemberId) {
            if (checklistDiv) checklistDiv.innerHTML = '<p class="empty-state">メンバーを選択してください</p>';
            return;
        }
        
        const categoryData = this.context.gearCategories[category];
        const memberGear = this.context.gearChecklist[this.context.currentGearMemberId] || {};
        
        // カテゴリヘッダー
        let html = `<h4>${categoryData.name}</h4>`;
        if (category === 'essential') {
            html += `<div style="background: #fff5f5; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #dc3545;">
                <strong>⚠️ 必須装備について</strong><br>
                <span style="font-size: 0.9em; color: #666;">これらは富士山登山に絶対必要な装備です。必ず全てチェックしてください。</span>
            </div>`;
        }
        
        // 装備アイテム
        html += categoryData.items.map(item => {
            const isChecked = memberGear[item.id] || false;
            const isEssential = category === 'essential';
            const essentialClass = isEssential ? 'essential' : '';
            const checkedClass = isChecked ? 'checked' : '';
            
            return `
                <div class="gear-item ${essentialClass} ${checkedClass}" data-item-id="${item.id}">
                    <input type="checkbox" class="gear-checkbox" data-gear-item-id="${item.id}" 
                           ${isChecked ? 'checked' : ''} id="gear-${item.id}">
                    <label for="gear-${item.id}">${item.name}</label>
                    <span class="gear-weight">${item.weight}kg</span>
                </div>
            `;
        }).join('');
        
        // 進捗サマリー
        const totalWeight = categoryData.items
            .filter(item => memberGear[item.id])
            .reduce((sum, item) => sum + item.weight, 0);
        const checkedCount = categoryData.items.filter(item => memberGear[item.id]).length;
        const totalCount = categoryData.items.length;
        const percentage = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
        
        html += `<div style="margin-top: 20px; padding: 15px; background: ${percentage === 100 ? '#d4edda' : '#e9ecef'}; border-radius: 12px; border: 2px solid ${percentage === 100 ? '#28a745' : '#dee2e6'};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <strong style="font-size: 1.1em;">${checkedCount}/${totalCount} 完了</strong>
                <strong style="font-size: 1.2em; color: var(--primary-color);">${totalWeight.toFixed(1)}kg</strong>
            </div>
            <div class="progress-bar" style="height: 10px;">
                <div class="progress-fill" style="width: ${percentage}%"></div>
            </div>
        </div>`;
        
        if (checklistDiv) checklistDiv.innerHTML = html;
    }

    /**
     * 装備アイテムのチェック状態を切り替え
     * @param {string} itemId - アイテムID
     * @param {boolean} isChecked - チェック状態
     */
    toggleGearItem(itemId, isChecked) {
        if (!this.context.currentGearMemberId) return;
        
        if (!this.context.gearChecklist[this.context.currentGearMemberId]) {
            this.context.gearChecklist[this.context.currentGearMemberId] = {};
        }
        
        this.context.gearChecklist[this.context.currentGearMemberId][itemId] = isChecked;
        
        // UIを即座に更新
        const gearItem = document.querySelector(`.gear-item[data-item-id="${itemId}"]`);
        if (gearItem) {
            if (isChecked) {
                gearItem.classList.add('checked');
            } else {
                gearItem.classList.remove('checked');
            }
        }
        
        this.context.saveData();
        this.showGearCategory(this.context.currentGearCategory);
    }

    /**
     * 全装備チェックをクリア
     */
    clearAllGear() {
        if (!this.context.currentGearMemberId) {
            this.context.showToast('メンバーを選択してください', 'warning');
            return;
        }
        
        if (confirm('選択中のメンバーの全装備チェックを解除しますか？')) {
            this.context.gearChecklist[this.context.currentGearMemberId] = {};
            this.context.saveData();
            this.showGearCategory(this.context.currentGearCategory);
            this.context.showToast('装備チェックを全て解除しました', 'success');
        }
    }

    /**
     * 全メンバーの装備サマリーを表示
     */
    showMemberGearSummary() {
        const summaryDiv = document.getElementById('gearSummaryArea');
        if (!summaryDiv) return;
        
        if (this.context.members.length === 0) {
            summaryDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>';
            return;
        }
        
        let summaryHtml = '<h4>📊 全メンバーの装備状況</h4>';
        
        this.context.members.forEach(member => {
            const memberGear = this.context.gearChecklist[member.id] || {};
            const checkedItems = Object.values(memberGear).filter(Boolean).length;
            const totalItems = Object.keys(this.context.gearCategories)
                .reduce((sum, category) => sum + this.context.gearCategories[category].items.length, 0);
            const percentage = totalItems > 0 ? (checkedItems / totalItems * 100).toFixed(1) : 0;
            
            let totalWeight = 0;
            Object.keys(this.context.gearCategories).forEach(category => {
                this.context.gearCategories[category].items.forEach(item => {
                    if (memberGear[item.id]) totalWeight += item.weight;
                });
            });
            
            summaryHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; background: white; margin-bottom: 10px; border-radius: 8px;">
                    <div>
                        <div><strong>${member.name}</strong></div>
                        <div style="color: #666; font-size: 0.9em;">準備率: ${percentage}% (${checkedItems}/${totalItems})</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-weight: bold;">${totalWeight.toFixed(1)}kg</div>
                        <div class="progress-bar" style="width: 100px;">
                            <div class="progress-fill" style="width: ${percentage}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        summaryDiv.innerHTML = summaryHtml;
    }

    /**
     * 装備チェックリストをエクスポート
     */
    exportGearChecklist() {
        if (this.context.members.length === 0) {
            this.context.showToast('メンバーを登録してください', 'warning');
            return;
        }
        
        let exportText = `${this.context.teamName} - 装備チェックリスト\n`;
        exportText += `作成日時: ${new Date().toLocaleString()}\n\n`;
        
        this.context.members.forEach(member => {
            const memberGear = this.context.gearChecklist[member.id] || {};
            exportText += `■ ${member.name}\n`;
            
            Object.keys(this.context.gearCategories).forEach(category => {
                const categoryData = this.context.gearCategories[category];
                exportText += `\n【${categoryData.name}】\n`;
                categoryData.items.forEach(item => {
                    const status = memberGear[item.id] ? '✓' : '□';
                    exportText += `${status} ${item.name} (${item.weight}kg)\n`;
                });
            });
            exportText += '\n---\n';
        });
        
        const blob = new Blob([exportText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.context.teamName}_装備チェックリスト.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.context.showToast('装備リストをダウンロードしました', 'success');
    }

    /**
     * 装備スコアを計算
     * @param {number} memberId - メンバーID
     * @returns {number} 装備スコア (0-100)
     */
    computeGearScore(memberId) {
        const categories = [
            { key: 'essential', weight: CONST.ESSENTIAL_GEAR_WEIGHT },
            { key: 'recommended', weight: CONST.RECOMMENDED_GEAR_WEIGHT },
            { key: 'seasonal', weight: CONST.SEASONAL_GEAR_WEIGHT }
        ];
        
        const memberGear = this.context.gearChecklist[memberId] || {};
        let score = 0;
        
        categories.forEach(({ key, weight }) => {
            const items = this.context.gearCategories[key].items;
            const checked = items.filter(it => memberGear[it.id]).length;
            const ratio = items.length ? checked / items.length : 0;
            score += ratio * weight * 100;
        });
        
        score = Math.round(score);
        
        // 必須装備が欠けている場合は大幅減点
        if (this.hasCriticalGearMissing(memberId)) {
            score = Math.min(score, 40);
        }
        
        return score;
    }

    /**
     * 必須装備の欠如をチェック
     * @param {number} memberId - メンバーID
     * @returns {boolean} 必須装備が欠けている場合true
     */
    hasCriticalGearMissing(memberId) {
        const memberGear = this.context.gearChecklist[memberId] || {};
        const critical = CONST.CRITICAL_GEAR_IDS;
        return critical.some(id => !memberGear[id]);
    }
}

