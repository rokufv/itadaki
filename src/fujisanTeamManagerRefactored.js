/**
 * 富士山登頂チーム管理メインクラス（リファクタリング版）
 * 各機能をマネージャーに委譲
 */

import { GEAR_CATEGORIES, MOUNTAIN_HUTS } from './mountainData.js';
import { ScheduleManager } from './managers/scheduleManager.js';
import { HealthManager } from './managers/healthManager.js';
import { StorageManager } from './managers/storageManager.js';

export class FujisanTeamManager {
    constructor() {
        // アプリケーション状態
        this.members = [];
        this.teamName = '富士山登頂チーム';
        this.healthRecords = [];
        this.gearChecklist = {};
        this.currentGearCategory = 'essential';
        this.currentGearMemberId = null;
        this.deleteTargetId = null;
        this.hikingRecords = [];
        this.mountains = [];
        this.drafts = {};
        this._dataChanged = false;
        this.plan = {
            date: '',
            hut: '',
            route: '',
            entries: []
        };
        
        // サーバー同期設定
        this.serverSyncEnabled = true;
        this.teamId = null;
        this.writeToken = null;
        
        // データ（定数として参照）
        this.mountainHuts = MOUNTAIN_HUTS;
        this.gearCategories = GEAR_CATEGORIES;
        
        // マネージャーの初期化
        this.scheduleManager = new ScheduleManager(this);
        this.healthManager = new HealthManager(this);
        this.storageManager = new StorageManager(this);
    }

    /**
     * アプリケーション初期化
     */
    init() {
        this.storageManager.loadData();
        this.storageManager.parseTeamConfigFromUrl();
        this.updateDisplay();
        this.storageManager.setupAutoSave();
        if (this.serverSyncEnabled && this.teamId) {
            this.storageManager.serverLoadState();
        }
    }

    // ━━━ データ保存関連（StorageManagerに委譲） ━━━
    saveData() {
        return this.storageManager.saveData();
    }

    scheduleSave(delayMs) {
        return this.storageManager.scheduleSave(delayMs);
    }

    // ━━━ スケジュール関連（ScheduleManagerに委譲） ━━━
    generateAutoSchedule() {
        return this.scheduleManager.generateAutoSchedule();
    }

    renderPlanEntries() {
        return this.scheduleManager.renderPlanEntries();
    }

    addPlanEntry() {
        return this.scheduleManager.addPlanEntry();
    }

    deletePlanEntry(entryId) {
        return this.scheduleManager.deletePlanEntry(entryId);
    }

    clearPlan() {
        return this.scheduleManager.clearPlan();
    }

    clearTimeline() {
        return this.scheduleManager.clearTimeline();
    }

    exportPlan() {
        return this.scheduleManager.exportPlan();
    }

    // ━━━ 健康管理関連（HealthManagerに委譲） ━━━
    computeSafetyScore(memberId) {
        return this.healthManager.computeSafetyScore(memberId);
    }

    updateRiskAssessment() {
        return this.healthManager.updateRiskAssessment();
    }

    hasRecentHealthWithinHours(member, hours) {
        return this.healthManager.hasRecentHealthWithinHours(member, hours);
    }

    // ━━━ UI関連（そのまま残す - 後でUIManagerに移行可能） ━━━
    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        if (!toast) return;
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }

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

    closeConfirmDialog() {
        const modal = document.getElementById('confirmModal');
        if (modal) modal.classList.remove('show');
    }

    /**
     * 安全に関数を実行
     * @param {Function} fn - 実行する関数
     * @param {string} context - エラーコンテキスト
     */
    safeExecute(fn, context = 'Operation') {
        try {
            return fn();
        } catch (error) {
            console.error(`${context} failed:`, error);
            this.showToast(`エラーが発生しました: ${error.message}`, 'error');
            return null;
        }
    }

    // ━━━ 表示更新（簡易版 - 実際はより多くのメソッドが必要） ━━━
    updateDisplay() {
        this.updateDashboard();
        this.updateMemberSelects();
        this.updateMemberList();
        // その他の表示更新メソッドを呼び出し
    }

    updateDashboard() {
        const memberCountEl = document.getElementById('memberCount');
        const teamNameEl = document.getElementById('teamNameText');
        if (memberCountEl) memberCountEl.textContent = `${this.members.length}名`;
        if (teamNameEl) teamNameEl.textContent = this.teamName;
    }

    updateMemberSelects() {
        const selects = ['healthMember', 'gearMember', 'hikingMember'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">メンバーを選択してください</option>' + 
                    this.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
                if (currentValue && this.members.find(m => m.id == currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }

    updateMemberList() {
        const listDiv = document.getElementById('memberList');
        if (!listDiv) return;
        if (this.members.length === 0) { 
            listDiv.innerHTML = '<div class="empty-state">登録されたメンバーがいません</div>'; 
            return; 
        }
        const memberCards = this.members.map(member => `
            <div class="member-card">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div style="color: #666;">${member.age ? `${member.age}歳 | ` : ''}${member.experience}${member.joinedAt ? ` | 登録: ${new Date(member.joinedAt).toLocaleDateString()}` : ''}</div>
                </div>
                <button class="btn btn-danger" data-action="delete-member" data-id="${member.id}">削除</button>
            </div>
        `).join('');
        listDiv.innerHTML = memberCards;
    }

    setPlanDate(dateStr) {
        this.plan.date = dateStr || '';
        this.scheduleSave(300);
    }

    setPlanHut(hut) {
        this.plan.hut = hut || '';
        this.scheduleSave(300);
    }

    selectRoute(route) {
        this.plan.route = route;
        this.scheduleSave(300);
        
        document.querySelectorAll('.route-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const selectedBtn = document.querySelector(`.route-btn[data-route="${route}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');
        
        const display = document.getElementById('selectedRouteDisplay');
        const text = document.getElementById('selectedRouteText');
        if (display && text) {
            display.style.display = 'block';
            text.textContent = route;
        }
        
        this.showMountainHuts(route);
        this.showToast(`${route}を選択しました`, 'success');
    }

    showMountainHuts(route) {
        const hutArea = document.getElementById('hutSelectionArea');
        if (!hutArea) return;
        
        const huts = this.mountainHuts[route];
        if (!huts || huts.length === 0) {
            hutArea.innerHTML = '<p style="color: #666; text-align: center;">このルートの山小屋情報がありません</p>';
            return;
        }
        
        hutArea.innerHTML = `
            <div class="hut-grid">
                ${huts.map(hut => `
                    <button class="hut-btn ${this.plan.hut === hut.name ? 'selected' : ''}" data-hut="${hut.name}">
                        <div>
                            <div class="hut-name">${hut.name}</div>
                            <div class="hut-info">標高 ${hut.elevation}m</div>
                        </div>
                        <div class="hut-elevation">${hut.elevation}m</div>
                    </button>
                `).join('')}
            </div>
        `;
        
        hutArea.querySelectorAll('.hut-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const hutName = btn.dataset.hut;
                this.selectHut(hutName);
            });
        });
    }

    selectHut(hutName) {
        this.plan.hut = hutName;
        this.scheduleSave(300);
        
        document.querySelectorAll('.hut-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const selectedBtn = document.querySelector(`.hut-btn[data-hut="${hutName}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');
        
        const autoScheduleArea = document.getElementById('autoScheduleArea');
        if (autoScheduleArea && this.plan.route && this.plan.hut) {
            autoScheduleArea.style.display = 'block';
        }
        
        this.showToast(`${hutName}を選択しました`, 'success');
    }

    switchTab(tabName) {
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (navItem) navItem.classList.add('active');
        
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName)?.classList.add('active');
        
        if (tabName === 'safety') this.updateSafetyDisplay();
        if (tabName === 'gear') this.updateGearDisplay();
        if (tabName === 'experience') this.updateExperienceDisplay();
        if (tabName === 'plan') this.updatePlanDisplay();
    }

    updateSafetyDisplay() {
        this.updateMemberSelects();
        this.updateRiskAssessment();
    }

    updateGearDisplay() {
        this.updateMemberSelects();
        if (this.currentGearMemberId && this.members.find(m => m.id === this.currentGearMemberId)) {
            this.showGearCategory(this.currentGearCategory);
        }
    }

    updateExperienceDisplay() {
        this.updateMemberSelects();
    }

    updatePlanDisplay() {
        const dateEl = document.getElementById('planDate');
        if (dateEl && this.plan.date) dateEl.value = this.plan.date;
        
        if (this.plan.route) {
            this.selectRoute(this.plan.route);
        }
        
        this.renderPlanEntries();
    }

    // 注: 実際の実装では、残りのメソッド（メンバー管理、装備管理等）も
    //     それぞれのマネージャーに移行します
}

