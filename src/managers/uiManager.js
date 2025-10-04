/**
 * UI管理マネージャー
 * UI更新とタブ切り替えを担当
 */

export class UIManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * タブを切り替え
     * @param {string} tabName - タブ名
     */
    switchTab(tabName) {
        // ボトムナビゲーションの更新
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (navItem) navItem.classList.add('active');
        
        // タブコンテンツの更新
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName)?.classList.add('active');
        
        // タブ固有の表示更新
        if (tabName === 'safety') this.updateSafetyDisplay();
        if (tabName === 'gear') this.updateGearDisplay();
        if (tabName === 'experience') this.updateExperienceDisplay();
        if (tabName === 'plan') this.updatePlanDisplay();
    }

    /**
     * ダッシュボードを更新
     */
    updateDashboard() {
        const memberCountEl = document.getElementById('memberCount');
        const teamNameEl = document.getElementById('teamNameText');
        
        if (memberCountEl) memberCountEl.textContent = `${this.context.members.length}名`;
        if (teamNameEl) teamNameEl.textContent = this.context.teamName;
        
        // 準備度表示を更新
        if (this.context.preparationManager) {
            this.context.preparationManager.updatePreparationDisplay();
        }
    }

    /**
     * 安全管理タブの表示を更新
     */
    updateSafetyDisplay() {
        if (this.context.memberManager) {
            this.context.memberManager.updateMemberSelects();
        }
        if (this.context.healthManager) {
            this.context.healthManager.updateRiskAssessment();
        }
    }

    /**
     * 装備タブの表示を更新
     */
    updateGearDisplay() {
        if (this.context.memberManager) {
            this.context.memberManager.updateMemberSelects();
        }
        if (this.context.gearManager && this.context.currentGearMemberId) {
            if (this.context.members.find(m => m.id === this.context.currentGearMemberId)) {
                this.context.gearManager.showGearCategory(this.context.currentGearCategory);
            }
        }
    }

    /**
     * 登山経験タブの表示を更新
     */
    updateExperienceDisplay() {
        if (this.context.memberManager) {
            this.context.memberManager.updateMemberSelects();
        }
        if (this.context.hikingManager) {
            this.context.hikingManager.updateHikingDisplay();
            this.context.hikingManager.updateMountainSelects();
        }
        
        const mountainListArea = document.getElementById('mountainListArea');
        if (mountainListArea && mountainListArea.innerHTML.includes('登録済みの山一覧')) {
            if (this.context.hikingManager) {
                this.context.hikingManager.showMountainList();
            }
        }
    }

    /**
     * 登頂計画タブの表示を更新
     */
    updatePlanDisplay() {
        const dateEl = document.getElementById('planDate');
        if (dateEl && this.context.plan.date) {
            dateEl.value = this.context.plan.date;
        }
        
        // ルート選択を復元
        if (this.context.plan.route) {
            this.context.selectRoute(this.context.plan.route);
        }
        
        // タイムラインを表示
        if (this.context.scheduleManager) {
            this.context.scheduleManager.renderPlanEntries();
        }
    }

    /**
     * 全ての表示を更新
     */
    updateDisplay() {
        this.updateDashboard();
        
        if (this.context.memberManager) {
            this.context.memberManager.updateMemberSelects();
            this.context.memberManager.updateMemberList();
        }
        
        if (this.context.preparationManager) {
            this.context.preparationManager.updatePreparationDisplay();
        }
    }

    /**
     * トーストメッセージを表示
     * @param {string} message - メッセージ
     * @param {string} type - タイプ ('info', 'success', 'warning', 'error')
     */
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => { 
            toast.classList.remove('show'); 
        }, 3000);
    }

    /**
     * 確認ダイアログを表示
     * @param {string} message - メッセージ
     * @param {Function} callback - 確認時のコールバック
     */
    showConfirmDialog(message, callback) {
        const modal = document.getElementById('confirmModal');
        const messageEl = document.getElementById('confirmMessage');
        const deleteBtn = document.getElementById('confirmDeleteBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        
        if (!modal || !messageEl) return;
        
        messageEl.textContent = message;
        modal.classList.add('show');
        
        deleteBtn.onclick = () => { 
            callback(); 
            this.closeConfirmDialog(); 
        };
        cancelBtn.onclick = () => this.closeConfirmDialog();
    }

    /**
     * 確認ダイアログを閉じる
     */
    closeConfirmDialog() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('show');
    }

    /**
     * ドラフトをUIに適用
     */
    applyDraftsToUI() {
        const d = this.context.drafts || {};
        
        // メンバーフォーム
        this.setInputValue('memberName', d.memberName);
        this.setInputValue('memberAge', d.memberAge);
        this.setInputValue('memberExperience', d.memberExperience);
        
        // 体調フォーム
        this.setInputValue('healthMember', d.healthMember);
        this.setInputValue('healthCondition', d.healthCondition);
        this.setInputValue('sleepHours', d.sleepHours);
        this.setInputValue('fatigueLevel', d.fatigueLevel);
        
        // 装備
        if (typeof d.currentGearMemberId !== 'undefined') {
            const gearMember = document.getElementById('gearMember');
            const restoredId = typeof d.currentGearMemberId === 'number' 
                ? d.currentGearMemberId 
                : parseInt(d.currentGearMemberId, 10);
            const validId = Number.isFinite(restoredId) ? restoredId : null;
            if (gearMember) gearMember.value = validId !== null ? String(validId) : '';
            this.context.currentGearMemberId = validId;
        }
        if (typeof d.currentGearCategory === 'string') {
            this.context.currentGearCategory = d.currentGearCategory;
        }
        
        // 山登録フォーム
        this.setInputValue('newMountainName', d.newMountainName);
        this.setInputValue('newMountainElevation', d.newMountainElevation);
        this.setInputValue('newMountainDistance', d.newMountainDistance);
        
        // 登山記録フォーム
        this.setInputValue('hikingMember', d.hikingMember);
        this.setInputValue('mountainSelect', d.mountainSelect);
        this.setInputValue('mountainName', d.mountainName);
        this.setInputValue('elevationGain', d.elevationGain);
        this.setInputValue('hikingDistance', d.hikingDistance);
        this.setInputValue('hikingDifficulty', d.hikingDifficulty);
        this.setInputValue('hikingDate', d.hikingDate);
        this.setInputValue('weather', d.weather);
        this.setInputValue('hikingNotes', d.hikingNotes);
        
        // 計画フォーム
        this.setInputValue('planDate', d.planDate);
        this.setInputValue('planHut', d.planHut);
        this.setInputValue('planTime', d.planTime);
        this.setInputValue('planActivity', d.planActivity);
        
        // 装備カテゴリを表示
        if (this.context.currentGearMemberId && this.context.gearManager) {
            this.context.gearManager.showGearCategory(this.context.currentGearCategory);
        }
        
        // タイムラインを表示
        if (this.context.scheduleManager) {
            this.context.scheduleManager.renderPlanEntries();
        }
    }

    /**
     * 入力要素の値を設定
     * @param {string} id - 要素ID
     * @param {*} value - 値
     */
    setInputValue(id, value) {
        const el = document.getElementById(id);
        if (el && typeof value !== 'undefined') {
            el.value = String(value || '');
        }
    }
}

