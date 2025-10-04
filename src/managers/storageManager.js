/**
 * データ永続化マネージャー
 * ローカルストレージとサーバー同期を担当
 */

import * as CONST from '../constants.js';

export class StorageManager {
    constructor(context) {
        this.context = context;
        this._saveTimer = null;
        this._serverSaveTimer = null;
    }

    /**
     * データをローカルストレージに保存
     */
    saveData() {
        try {
            const data = {
                members: this.context.members,
                teamName: this.context.teamName,
                healthRecords: this.context.healthRecords,
                gearChecklist: this.context.gearChecklist,
                hikingRecords: this.context.hikingRecords,
                mountains: this.context.mountains,
                plan: this.context.plan,
                drafts: this.context.drafts,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('fujisan_team_manager', JSON.stringify(data));
            this.context._dataChanged = false;
            
            if (this.context.serverSyncEnabled && this.context.teamId) {
                this.serverSaveDebounced();
            }
        } catch (e) {
            console.error('データ保存エラー:', e);
            this.context.showToast('データ保存に失敗しました', 'error');
        }
    }

    /**
     * データをローカルストレージから読み込み
     */
    loadData() {
        try {
            const raw = localStorage.getItem('fujisan_team_manager');
            if (!raw) return;
            const data = JSON.parse(raw);
            this.context.members = data.members || [];
            this.context.teamName = data.teamName || '富士山登頂チーム';
            this.context.healthRecords = data.healthRecords || [];
            this.context.gearChecklist = data.gearChecklist || {};
            this.context.hikingRecords = data.hikingRecords || [];
            this.context.mountains = data.mountains || [];
            this.context.plan = data.plan || { date: '', hut: '', entries: [] };
            this.context.drafts = data.drafts || {};
            if (data.lastSaved) {
                const lastSaved = new Date(data.lastSaved);
                this.context.showToast(`前回のデータを復元しました (${lastSaved.toLocaleString()})`, 'success');
            }
        } catch (e) {
            console.error('データ読込エラー:', e);
            this.context.showToast('データ読込に失敗しました', 'error');
        }
    }

    /**
     * 自動保存を設定
     */
    setupAutoSave() {
        setInterval(() => {
            if (this.context._dataChanged) {
                this.saveData();
                this.context._dataChanged = false;
            }
        }, CONST.AUTO_SAVE_INTERVAL_MS);
        
        window.addEventListener('beforeunload', () => {
            if (this.context._dataChanged) {
                this.saveData();
            }
        });
    }

    /**
     * 保存をスケジュール（デバウンス処理）
     * @param {number} delayMs - 保存までの遅延時間
     */
    scheduleSave(delayMs = CONST.DEBOUNCE_SAVE_MS) {
        this.context._dataChanged = true;
        
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.saveData();
            this._saveTimer = null;
        }, delayMs);
    }

    /**
     * サーバーからデータを読み込み
     */
    async serverLoadState() {
        try {
            const res = await fetch(`/api/state?teamId=${encodeURIComponent(this.context.teamId)}`, { cache: 'no-store' });
            if (!res.ok) return;
            const json = await res.json();
            if (json && json.state) {
                const s = json.state;
                this.context.members = s.members || [];
                this.context.teamName = s.teamName || this.context.teamName;
                this.context.healthRecords = s.healthRecords || [];
                this.context.gearChecklist = s.gearChecklist || {};
                this.context.hikingRecords = s.hikingRecords || [];
                this.context.mountains = s.mountains || [];
                this.context.plan = s.plan || this.context.plan;
            }
        } catch (e) {
            console.warn('Server load failed', e);
        }
    }

    /**
     * サーバー保存をデバウンス処理
     */
    serverSaveDebounced() {
        if (this._serverSaveTimer) clearTimeout(this._serverSaveTimer);
        this._serverSaveTimer = setTimeout(() => this.serverSaveNow(), CONST.SERVER_SAVE_DELAY_MS);
    }

    /**
     * サーバーにデータを保存
     */
    async serverSaveNow() {
        try {
            const state = {
                members: this.context.members,
                teamName: this.context.teamName,
                healthRecords: this.context.healthRecords,
                gearChecklist: this.context.gearChecklist,
                hikingRecords: this.context.hikingRecords,
                mountains: this.context.mountains,
                plan: this.context.plan
            };
            const body = { teamId: this.context.teamId, state };
            if (this.context.writeToken) body.token = this.context.writeToken;
            const res = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const message = res.status === 401
                    ? 'サーバー保存に失敗しました（認証エラー）'
                    : `サーバー保存に失敗しました (コード: ${res.status})`;
                this.context.showToast(message, 'error');
                return;
            }
        } catch (e) {
            console.warn('Server save failed', e);
            this.context.showToast('サーバー保存に失敗しました', 'error');
        }
    }

    /**
     * URLパラメータからチーム設定を読み込み
     */
    parseTeamConfigFromUrl() {
        try {
            const url = new URL(window.location.href);
            const teamId = url.searchParams.get('team');
            const token = url.searchParams.get('token');
            
            if (teamId) {
                this.context.teamId = teamId;
                localStorage.setItem('fujisan_team_id', this.context.teamId);
            }
            
            if (token) {
                this.context.writeToken = token;
                sessionStorage.setItem('fujisan_write_token', this.context.writeToken);
            }
        } catch (_) {}
        
        if (!this.context.teamId) {
            this.context.teamId = localStorage.getItem('fujisan_team_id') || null;
        }
        if (!this.context.writeToken) {
            this.context.writeToken = sessionStorage.getItem('fujisan_write_token') || null;
        }
    }
}

