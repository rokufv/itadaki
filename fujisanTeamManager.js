export class FujisanTeamManager {
    constructor() {
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
        this._saveTimer = null;
        this.plan = {
            date: '',
            hut: '',
            route: '',
            entries: [] // { id, time, activity }
        };
        // Server sync (Vercel KV)
        this.serverSyncEnabled = true;
        this.teamId = null;
        this.writeToken = null;
        this._serverSaveTimer = null;

        // Mountain huts by route
        this.mountainHuts = {
            '吉田ルート': [
                { name: '七合目トモエ館', elevation: 2740 },
                { name: '七合目鎌岩館', elevation: 2790 },
                { name: '七合目富士一館', elevation: 2800 },
                { name: '八合目太子館', elevation: 3100 },
                { name: '八合目蓬莱館', elevation: 3150 },
                { name: '八合目白雲荘', elevation: 3200 },
                { name: '八合目元祖室', elevation: 3250 },
                { name: '本八合目トモエ館', elevation: 3400 }
            ],
            '富士宮ルート': [
                { name: '六合目雲海荘', elevation: 2490 },
                { name: '新七合目御来光山荘', elevation: 2780 },
                { name: '元祖七合目山口山荘', elevation: 3010 },
                { name: '八合目池田館', elevation: 3250 },
                { name: '九合目万年雪山荘', elevation: 3460 },
                { name: '九合五勺胸突山荘', elevation: 3590 }
            ],
            '須走ルート': [
                { name: '七合目大陽館', elevation: 2700 },
                { name: '七合目見晴館', elevation: 2750 },
                { name: '本七合目江戸屋', elevation: 2960 },
                { name: '八合目江戸屋', elevation: 3350 }
            ],
            '御殿場ルート': [
                { name: '七合五勺わらじ館', elevation: 3050 },
                { name: '赤岩八合館', elevation: 3300 }
            ]
        };

        this.gearCategories = {
            essential: {
                name: '必須装備',
                items: [
                    { id: 'boots', name: '登山靴（ハイカット）', weight: 1.2 },
                    { id: 'rain_jacket', name: 'レインウェア（上）', weight: 0.3 },
                    { id: 'rain_pants', name: 'レインウェア（下）', weight: 0.25 },
                    { id: 'headlamp', name: 'ヘッドランプ', weight: 0.15 },
                    { id: 'warm_clothes', name: '防寒着', weight: 0.5 },
                    { id: 'gloves', name: '手袋', weight: 0.1 },
                    { id: 'water', name: '水（2L以上）', weight: 2.0 },
                    { id: 'food', name: '行動食', weight: 0.5 },
                    { id: 'backpack', name: 'ザック', weight: 1.0 }
                ]
            },
            recommended: {
                name: '推奨装備',
                items: [
                    { id: 'sunglasses', name: 'サングラス', weight: 0.05 },
                    { id: 'sunscreen', name: '日焼け止め', weight: 0.1 },
                    { id: 'first_aid', name: '救急セット', weight: 0.3 },
                    { id: 'poles', name: 'トレッキングポール', weight: 0.5 }
                ]
            },
            seasonal: {
                name: '季節装備',
                items: [
                    { id: 'cool_shirt', name: '速乾性シャツ', weight: 0.2 },
                    { id: 'salt_tablet', name: '塩分タブレット', weight: 0.05 }
                ]
            }
        };
    }

    init() {
        this.loadData();
        this.parseTeamConfigFromUrl();
        this.updateDisplay();
        this.setupAutoSave();
        if (this.serverSyncEnabled && this.teamId) {
            this.serverLoadState();
        }
    }

    saveData() {
        try {
            const data = {
                members: this.members,
                teamName: this.teamName,
                healthRecords: this.healthRecords,
                gearChecklist: this.gearChecklist,
                hikingRecords: this.hikingRecords,
                mountains: this.mountains,
                plan: this.plan,
                drafts: this.drafts,
                lastSaved: new Date().toISOString()
            };
            localStorage.setItem('fujisan_team_manager', JSON.stringify(data));
            if (this.serverSyncEnabled && this.teamId) this.serverSaveDebounced();
        } catch (e) {
            console.error('データ保存エラー:', e);
            this.showToast('データ保存に失敗しました', 'error');
        }
    }

    loadData() {
        try {
            const raw = localStorage.getItem('fujisan_team_manager');
            if (!raw) return;
            const data = JSON.parse(raw);
            this.members = data.members || [];
            this.teamName = data.teamName || '富士山登頂チーム';
            this.healthRecords = data.healthRecords || [];
            this.gearChecklist = data.gearChecklist || {};
            this.hikingRecords = data.hikingRecords || [];
            this.mountains = data.mountains || [];
            this.plan = data.plan || { date: '', hut: '', entries: [] };
            this.drafts = data.drafts || {};
            if (data.lastSaved) {
                const lastSaved = new Date(data.lastSaved);
                this.showToast(`前回のデータを復元しました (${lastSaved.toLocaleString()})`, 'success');
            }
        } catch (e) {
            console.error('データ読込エラー:', e);
            this.showToast('データ読込に失敗しました', 'error');
        }
    }

    // Plan
    setPlanDate(dateStr) {
        this.plan.date = dateStr || '';
        this.scheduleSave(300);
    }
    setPlanHut(hut) {
        this.plan.hut = hut || '';
        this.scheduleSave(300);
    }
    addPlanEntry() {
        const time = document.getElementById('planTime')?.value || '';
        const activity = document.getElementById('planActivity')?.value.trim() || '';
        if (!time || !activity) { this.showToast('時刻とアクティビティを入力してください', 'warning'); return; }
        const entry = { id: Date.now(), time, activity };
        this.plan.entries.push(entry);
        this.renderPlanEntries();
        this.scheduleSave(300);
        document.getElementById('planActivity').value = '';
    }
    deletePlanEntry(entryId) {
        this.plan.entries = this.plan.entries.filter(e => e.id !== entryId);
        this.renderPlanEntries();
        this.scheduleSave(300);
    }
    clearPlan() {
        this.plan = { date: '', hut: '', entries: [] };
        const dateEl = document.getElementById('planDate');
        const hutEl = document.getElementById('planHut');
        if (dateEl) dateEl.value = '';
        if (hutEl) hutEl.value = '';
        this.renderPlanEntries();
        this.scheduleSave(300);
    }
    exportPlan() {
        const lines = [];
        lines.push(`${this.teamName} - 富士山登頂計画`);
        lines.push(`作成日時: ${new Date().toLocaleString()}`);
        lines.push('');
        lines.push(`予定日: ${this.plan.date || '未設定'}`);
        lines.push(`山小屋: ${this.plan.hut || '未設定'}`);
        lines.push('');
        lines.push('スケジュール:');
        const sorted = [...this.plan.entries].sort((a,b) => a.time.localeCompare(b.time));
        if (sorted.length === 0) {
            lines.push('（未登録）');
        } else {
            sorted.forEach(e => lines.push(`${e.time} - ${e.activity}`));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.teamName}_登頂計画.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('登頂計画をダウンロードしました', 'success');
    }
    renderPlanEntries() {
        const container = document.getElementById('planScheduleList');
        if (!container) return;
        const sorted = [...this.plan.entries].sort((a,b) => a.time.localeCompare(b.time));
        if (sorted.length === 0) {
            container.innerHTML = '<div class="empty-state">スケジュールがありません</div>';
            return;
        }
        
        // Calculate duration between entries
        container.innerHTML = sorted.map((e, index) => {
            let durationHtml = '';
            if (index > 0) {
                const prevTime = sorted[index - 1].time;
                const duration = this.calculateTimeDuration(prevTime, e.time);
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
    
    calculateTimeDuration(time1, time2) {
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
    
    selectRoute(route) {
        this.plan.route = route;
        this.scheduleSave(300);
        
        // Update UI
        document.querySelectorAll('.route-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const selectedBtn = document.querySelector(`.route-btn[data-route="${route}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');
        
        // Show route display
        const display = document.getElementById('selectedRouteDisplay');
        const text = document.getElementById('selectedRouteText');
        if (display && text) {
            display.style.display = 'block';
            text.textContent = route;
        }
        
        // Show mountain huts for this route
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
        
        // Add event listeners to hut buttons
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
        
        // Update UI
        document.querySelectorAll('.hut-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const selectedBtn = document.querySelector(`.hut-btn[data-hut="${hutName}"]`);
        if (selectedBtn) selectedBtn.classList.add('selected');
        
        // Show auto schedule generator
        const autoScheduleArea = document.getElementById('autoScheduleArea');
        if (autoScheduleArea && this.plan.route && this.plan.hut) {
            autoScheduleArea.style.display = 'block';
        }
        
        this.showToast(`${hutName}を選択しました`, 'success');
    }
    
    generateAutoSchedule() {
        if (!this.plan.route || !this.plan.hut) {
            this.showToast('先にルートと山小屋を選択してください', 'warning');
            return;
        }
        
        // Get hut elevation
        const huts = this.mountainHuts[this.plan.route];
        const selectedHut = huts.find(h => h.name === this.plan.hut);
        if (!selectedHut) {
            this.showToast('山小屋情報が見つかりません', 'error');
            return;
        }
        
        // Generate schedule based on hut elevation and route
        const schedule = this.calculateGoraikoSchedule(this.plan.route, selectedHut);
        
        // Clear existing entries
        this.plan.entries = [];
        
        // Add schedule entries
        schedule.forEach(entry => {
            this.plan.entries.push({
                id: Date.now() + Math.random(),
                time: entry.time,
                activity: entry.activity
            });
        });
        
        this.saveData();
        this.renderPlanEntries();
        
        // Scroll to timeline
        document.getElementById('planScheduleList')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
        this.showToast('標準スケジュールを生成しました！', 'success');
    }
    
    calculateGoraikoSchedule(route, hut) {
        const schedule = [];
        const hutElevation = hut.elevation;
        
        // Calculate times based on hut elevation
        const hoursToSummit = this.calculateHoursToSummit(hutElevation);
        const hoursToHut = this.calculateHoursToHut(route, hutElevation);
        
        // ━━━ Day 1（1日目）━━━
        schedule.push({ time: '10:00', activity: '⛰️ 五合目集合' });
        schedule.push({ time: '10:30', activity: '📋 装備確認・登山開始' });
        
        // Add rest stops based on climbing time
        if (hoursToHut >= 3) {
            const firstRestHour = 10.5 + (hoursToHut / 2);
            const fh = Math.floor(firstRestHour);
            const fm = Math.round((firstRestHour % 1) * 60);
            schedule.push({ 
                time: `${fh.toString().padStart(2, '0')}:${fm.toString().padStart(2, '0')}`, 
                activity: '🍙 休憩・水分補給' 
            });
        }
        
        // Arrival time at hut
        const hutArrivalTime = 10.5 + hoursToHut;
        const hutArrivalHour = Math.floor(hutArrivalTime);
        const hutArrivalMin = Math.round((hutArrivalTime % 1) * 60);
        schedule.push({ 
            time: `${hutArrivalHour.toString().padStart(2, '0')}:${hutArrivalMin.toString().padStart(2, '0')}`, 
            activity: `🏠 ${hut.name}到着` 
        });
        
        // Evening at hut
        const dinnerHour = Math.min(Math.max(hutArrivalHour + 1, 17), 19);
        schedule.push({ 
            time: `${dinnerHour.toString().padStart(2, '0')}:00`, 
            activity: '🍱 夕食' 
        });
        
        const bedtimeHour = Math.min(Math.max(dinnerHour + 2, 19), 21);
        schedule.push({ 
            time: `${bedtimeHour.toString().padStart(2, '0')}:00`, 
            activity: '🌙 就寝' 
        });
        
        // ━━━ Day 2（2日目）ご来光コース ━━━
        const sunriseTime = '05:00';
        const departureHour = 5 - Math.ceil(hoursToSummit);
        
        // Wake up and departure
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
        
        // Sunrise at summit
        schedule.push({ time: sunriseTime, activity: '🌅 山頂でご来光（標高3776m）' });
        schedule.push({ time: '06:00', activity: '📸 記念撮影・休憩' });
        schedule.push({ time: '07:00', activity: '⬇️ 下山開始' });
        
        // Descent
        const totalDescentTime = hoursToHut * 0.7; // Faster than ascent
        const fiveGoArrivalTime = 7 + totalDescentTime;
        const fah = Math.floor(fiveGoArrivalTime);
        const fam = Math.round((fiveGoArrivalTime % 1) * 60);
        
        schedule.push({ 
            time: `${fah.toString().padStart(2, '0')}:${fam.toString().padStart(2, '0')}`, 
            activity: '⛰️ 五合目到着・解散' 
        });
        
        return schedule;
    }
    
    calculateHoursToSummit(hutElevation) {
        // Summit is at 3776m
        const elevationDiff = 3776 - hutElevation;
        
        // Rough estimate: 300m per hour on average
        const hours = elevationDiff / 300;
        
        return Math.max(1, Math.min(hours, 6)); // Between 1-6 hours
    }
    
    calculateHoursToHut(route, hutElevation) {
        // Different routes have different starting elevations
        const routeStartElevations = {
            '吉田ルート': 2305,
            '富士宮ルート': 2400,
            '須走ルート': 2000,
            '御殿場ルート': 1440
        };
        
        const startElevation = routeStartElevations[route] || 2305;
        const elevationDiff = hutElevation - startElevation;
        
        // Estimate: 300m per hour for average climber
        const hours = elevationDiff / 300;
        
        return Math.max(hours, 0.5); // At least 30 minutes
    }
    
    calculateHutArrivalTime(route, hutElevation) {
        // Base start time is 10:30
        // Different routes have different starting elevations
        const routeStartElevations = {
            '吉田ルート': 2305,
            '富士宮ルート': 2400,
            '須走ルート': 2000,
            '御殿場ルート': 1440
        };
        
        const startElevation = routeStartElevations[route] || 2305;
        const elevationDiff = hutElevation - startElevation;
        
        // Estimate: 300m per hour
        const hours = Math.ceil(elevationDiff / 300);
        
        // Start at 10:30 (10.5), add hours
        const arrivalTime = 10.5 + hours;
        
        return Math.min(Math.max(Math.floor(arrivalTime), 14), 18); // Between 14:00-18:00
    }

    setupAutoSave() {
        setInterval(() => this.saveData(), 10 * 1000);
        window.addEventListener('beforeunload', () => this.saveData());
    }

    scheduleSave(delayMs = 500) {
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.saveData();
            this._saveTimer = null;
        }, delayMs);
    }

    setDrafts(drafts) {
        this.drafts = drafts || {};
        this.scheduleSave(300);
    }

    getDrafts() {
        return this.drafts || {};
    }

    applyDraftsToUI() {
        const d = this.drafts || {};
        // member form
        if (typeof d.memberName === 'string') document.getElementById('memberName') && (document.getElementById('memberName').value = d.memberName);
        if (typeof d.memberAge !== 'undefined') document.getElementById('memberAge') && (document.getElementById('memberAge').value = d.memberAge);
        if (typeof d.memberExperience === 'string') document.getElementById('memberExperience') && (document.getElementById('memberExperience').value = d.memberExperience);

        // health form
        if (typeof d.healthMember !== 'undefined') document.getElementById('healthMember') && (document.getElementById('healthMember').value = String(d.healthMember || ''));
        if (typeof d.healthCondition !== 'undefined') document.getElementById('healthCondition') && (document.getElementById('healthCondition').value = String(d.healthCondition));
        if (typeof d.sleepHours !== 'undefined') document.getElementById('sleepHours') && (document.getElementById('sleepHours').value = d.sleepHours);
        if (typeof d.fatigueLevel !== 'undefined') document.getElementById('fatigueLevel') && (document.getElementById('fatigueLevel').value = String(d.fatigueLevel));

        // gear
        if (typeof d.currentGearMemberId !== 'undefined') {
            const gearMember = document.getElementById('gearMember');
            const restoredId = typeof d.currentGearMemberId === 'number' ? d.currentGearMemberId : parseInt(d.currentGearMemberId, 10);
            const validId = Number.isFinite(restoredId) ? restoredId : null;
            if (gearMember) gearMember.value = validId !== null ? String(validId) : '';
            this.currentGearMemberId = validId;
        }
        if (typeof d.currentGearCategory === 'string') this.currentGearCategory = d.currentGearCategory;

        // mountain add form
        if (typeof d.newMountainName === 'string') document.getElementById('newMountainName') && (document.getElementById('newMountainName').value = d.newMountainName);
        if (typeof d.newMountainElevation !== 'undefined') document.getElementById('newMountainElevation') && (document.getElementById('newMountainElevation').value = d.newMountainElevation);
        if (typeof d.newMountainDistance !== 'undefined') document.getElementById('newMountainDistance') && (document.getElementById('newMountainDistance').value = d.newMountainDistance);

        // hiking form
        if (typeof d.hikingMember !== 'undefined') document.getElementById('hikingMember') && (document.getElementById('hikingMember').value = String(d.hikingMember || ''));
        if (typeof d.mountainSelect !== 'undefined') document.getElementById('mountainSelect') && (document.getElementById('mountainSelect').value = String(d.mountainSelect || ''));
        if (typeof d.mountainName === 'string') document.getElementById('mountainName') && (document.getElementById('mountainName').value = d.mountainName);
        if (typeof d.elevationGain !== 'undefined') document.getElementById('elevationGain') && (document.getElementById('elevationGain').value = d.elevationGain);
        if (typeof d.hikingDistance !== 'undefined') document.getElementById('hikingDistance') && (document.getElementById('hikingDistance').value = d.hikingDistance);
        if (typeof d.hikingDifficulty === 'string') document.getElementById('hikingDifficulty') && (document.getElementById('hikingDifficulty').value = d.hikingDifficulty);
        if (typeof d.hikingDate === 'string') document.getElementById('hikingDate') && (document.getElementById('hikingDate').value = d.hikingDate);
        if (typeof d.weather === 'string') document.getElementById('weather') && (document.getElementById('weather').value = d.weather);
        if (typeof d.hikingNotes === 'string') document.getElementById('hikingNotes') && (document.getElementById('hikingNotes').value = d.hikingNotes);

        // plan drafts
        if (typeof d.planDate === 'string') document.getElementById('planDate') && (document.getElementById('planDate').value = d.planDate);
        if (typeof d.planHut === 'string') document.getElementById('planHut') && (document.getElementById('planHut').value = d.planHut);
        if (typeof d.planTime === 'string') document.getElementById('planTime') && (document.getElementById('planTime').value = d.planTime);
        if (typeof d.planActivity === 'string') document.getElementById('planActivity') && (document.getElementById('planActivity').value = d.planActivity);

        // reflect gear view if possible
        if (this.currentGearMemberId) this.showGearCategory(this.currentGearCategory);
        // render plan entries
        this.renderPlanEntries();
    }

    parseTeamConfigFromUrl() {
        try {
            const url = new URL(window.location.href);
            const teamId = url.searchParams.get('team');
            const token = url.searchParams.get('token');
            if (teamId) this.teamId = teamId;
            if (token) this.writeToken = token;
            // Persist for next visits
            if (this.teamId) localStorage.setItem('fujisan_team_id', this.teamId);
            if (this.writeToken) localStorage.setItem('fujisan_write_token', this.writeToken);
        } catch (_) {
            // ignore
        }
        // fallback from localStorage
        if (!this.teamId) this.teamId = localStorage.getItem('fujisan_team_id') || null;
        if (!this.writeToken) this.writeToken = localStorage.getItem('fujisan_write_token') || null;
    }

    async serverLoadState() {
        try {
            const res = await fetch(`/api/state?teamId=${encodeURIComponent(this.teamId)}`, { cache: 'no-store' });
            if (!res.ok) return;
            const json = await res.json();
            if (json && json.state) {
                const s = json.state;
                this.members = s.members || [];
                this.teamName = s.teamName || this.teamName;
                this.healthRecords = s.healthRecords || [];
                this.gearChecklist = s.gearChecklist || {};
                this.hikingRecords = s.hikingRecords || [];
                this.mountains = s.mountains || [];
                this.plan = s.plan || this.plan;
                this.updateDisplay();
            }
        } catch (e) {
            console.warn('Server load failed', e);
        }
    }

    serverSaveDebounced() {
        if (this._serverSaveTimer) clearTimeout(this._serverSaveTimer);
        this._serverSaveTimer = setTimeout(() => this.serverSaveNow(), 1500);
    }

    async serverSaveNow() {
        try {
            const state = {
                members: this.members,
                teamName: this.teamName,
                healthRecords: this.healthRecords,
                gearChecklist: this.gearChecklist,
                hikingRecords: this.hikingRecords,
                mountains: this.mountains,
                plan: this.plan
            };
            const body = { teamId: this.teamId, state };
            if (this.writeToken) body.token = this.writeToken;
            const res = await fetch('/api/state', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                let detail = '';
                try { detail = await res.text(); } catch (_) { /* ignore */ }
                const message = res.status === 401
                    ? 'サーバー保存に失敗しました（認証エラー）'
                    : `サーバー保存に失敗しました (コード: ${res.status})`;
                this.showToast(message, 'error');
                console.warn('Server save failed', res.status, detail);
                return;
            }
        } catch (e) {
            console.warn('Server save failed', e);
            this.showToast('サーバー保存に失敗しました', 'error');
        }
    }

    safeExecute(fn, context = 'Operation') {
        try {
            return fn();
        } catch (error) {
            console.error(`${context} failed:`, error);
            this.showToast(`エラーが発生しました: ${error.message}`, 'error');
            return null;
        }
    }

    switchTab(tabName) {
        // Update bottom navigation active state
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-tab="${tabName}"]`);
        if (navItem) navItem.classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName)?.classList.add('active');
        
        // Update specific displays
        if (tabName === 'safety') this.updateSafetyDisplay();
        if (tabName === 'gear') this.updateGearDisplay();
        if (tabName === 'experience') this.updateExperienceDisplay();
        if (tabName === 'plan') this.updatePlanDisplay();
    }

    // Team name
    editTeamName() {
        document.getElementById('teamNameDisplay').style.display = 'none';
        document.getElementById('teamNameEdit').style.display = 'block';
        document.getElementById('teamNameInput').value = this.teamName;
        document.getElementById('teamNameInput').focus();
    }
    saveTeamName() {
        const newName = document.getElementById('teamNameInput').value.trim();
        if (newName) {
            this.teamName = newName;
            document.getElementById('teamNameText').textContent = this.teamName;
            this.saveData();
            this.showToast('チーム名を更新しました', 'success');
        }
        this.cancelTeamName();
    }
    cancelTeamName() {
        document.getElementById('teamNameDisplay').style.display = 'flex';
        document.getElementById('teamNameEdit').style.display = 'none';
    }

    // Members
    addMember() {
        this.safeExecute(() => {
            const name = document.getElementById('memberName').value.trim();
            const age = parseInt(document.getElementById('memberAge').value) || null;
            const experience = document.getElementById('memberExperience').value;
            if (!name) { this.showToast('名前を入力してください', 'warning'); return; }
            if (this.members.some(m => m.name === name)) { this.showToast('同じ名前のメンバーが既に存在します', 'warning'); return; }
            const member = { id: Date.now(), name, age, experience, joinedAt: new Date().toISOString() };
            this.members.push(member);
            this.gearChecklist[member.id] = {};
            this.clearMemberForm();
            this.updateDisplay();
            this.saveData();
            this.showToast(`${name}さんを追加しました`, 'success');
        }, 'Add member');
    }
    deleteMember(memberId) {
        this.safeExecute(() => {
            const member = this.members.find(m => m.id === memberId);
            if (!member) return;
            this.deleteTargetId = memberId;
            this.showConfirmDialog(`${member.name}さんを削除しますか？\nすべての関連データも削除されます。`, () => {
                this.members = this.members.filter(m => m.id !== memberId);
                this.healthRecords = this.healthRecords.filter(h => h.memberId !== memberId);
                delete this.gearChecklist[memberId];
                this.hikingRecords = this.hikingRecords.filter(h => h.memberId !== memberId);
                this.updateDisplay();
                this.saveData();
                this.showToast(`${member.name}さんを削除しました`, 'success');
            });
        }, 'Delete member');
    }
    clearMemberForm() {
        document.getElementById('memberName').value = '';
        document.getElementById('memberAge').value = '';
        document.getElementById('memberExperience').value = '初心者';
    }

    // Health
    recordHealth() {
        this.safeExecute(() => {
            const memberId = parseInt(document.getElementById('healthMember').value);
            const condition = parseInt(document.getElementById('healthCondition').value);
            const sleepHours = parseFloat(document.getElementById('sleepHours').value);
            const fatigueLevel = parseInt(document.getElementById('fatigueLevel').value);
            if (!memberId) { this.showToast('メンバーを選択してください', 'warning'); return; }
            const member = this.members.find(m => m.id === memberId);
            if (!member) return;
            const healthRecord = { id: Date.now(), memberId, memberName: member.name, condition, sleepHours, fatigueLevel, recordedAt: new Date().toISOString() };
            this.healthRecords.push(healthRecord);
            this.saveData();
            this.updateRiskAssessment();
            this.showToast(`${member.name}さんの体調を記録しました`, 'success');
        }, 'Record health');
    }
    clearHealthForm() {
        document.getElementById('healthMember').value = '';
        document.getElementById('healthCondition').value = '3';
        document.getElementById('sleepHours').value = '';
        document.getElementById('fatigueLevel').value = '1';
    }
    showHealthHistory() {
        if (this.healthRecords.length === 0) { this.showToast('体調記録がありません', 'warning'); return; }
        const historyHtml = this.healthRecords
            .sort((a, b) => new Date(b.recordedAt) - new Date(a.recordedAt))
            .slice(0, 10)
            .map(record => {
                const date = new Date(record.recordedAt);
                return `
                    <div class="health-record">
                        <div><strong>${record.memberName}</strong> - ${date.toLocaleDateString()} ${date.toLocaleTimeString()}</div>
                        <div>体調: ${record.condition}/5, 睡眠: ${record.sleepHours || '未記録'}時間, 疲労: ${record.fatigueLevel}/5</div>
                    </div>
                `;
            }).join('');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="confirm-dialog" style="max-width: 600px;">
                <h3>📊 体調記録履歴（最新10件）</h3>
                <div style="max-height: 400px; overflow-y: auto; margin: 20px 0;">
                    ${historyHtml}
                </div>
                <button class="btn" data-action="close-modal">閉じる</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    updateRiskAssessment() {
        const riskDiv = document.getElementById('riskAssessment');
        if (!riskDiv) return;
        if (this.members.length === 0) { riskDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>'; return; }
        const recentRecords = this.healthRecords.filter(record => {
            const recordDate = new Date(record.recordedAt);
            const twoDaysAgo = new Date();
            twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
            return recordDate >= twoDaysAgo;
        });
        let riskHtml = '<h4>メンバー別リスク評価</h4>';
        this.members.forEach(member => {
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
                if (avgCondition <= 2 || avgFatigue >= 4 || avgSleep < 5) { riskText = '高リスク'; riskColor = 'status-poor'; }
                else if (avgCondition <= 3 || avgFatigue >= 3 || avgSleep < 6) { riskText = '中リスク'; riskColor = 'status-good'; }
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

    // Gear
    showGearCategory(category) {
        this.currentGearCategory = category;
        const checklistDiv = document.getElementById('gearChecklist');
        if (!this.currentGearMemberId) { checklistDiv.innerHTML = '<p class="empty-state">メンバーを選択してください</p>'; return; }
        const categoryData = this.gearCategories[category];
        const memberGear = this.gearChecklist[this.currentGearMemberId] || {};
        
        // Add category header with description
        let html = `<h4>${categoryData.name}</h4>`;
        if (category === 'essential') {
            html += `<div style="background: #fff5f5; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #dc3545;">
                <strong>⚠️ 必須装備について</strong><br>
                <span style="font-size: 0.9em; color: #666;">これらは富士山登山に絶対必要な装備です。必ず全てチェックしてください。</span>
            </div>`;
        }
        
        html += categoryData.items.map(item => {
            const isChecked = memberGear[item.id] || false;
            const isEssential = category === 'essential';
            const essentialClass = isEssential ? 'essential' : '';
            const checkedClass = isChecked ? 'checked' : '';
            return `
                <div class="gear-item ${essentialClass} ${checkedClass}" data-item-id="${item.id}">
                    <input type="checkbox" class="gear-checkbox" data-gear-item-id="${item.id}" ${isChecked ? 'checked' : ''} id="gear-${item.id}">
                    <label for="gear-${item.id}">${item.name}</label>
                    <span class="gear-weight">${item.weight}kg</span>
                </div>
            `;
        }).join('');
        
        const totalWeight = categoryData.items.filter(item => memberGear[item.id]).reduce((sum, item) => sum + item.weight, 0);
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
        
        checklistDiv.innerHTML = html;
    }
    toggleGearItem(itemId, isChecked) {
        if (!this.currentGearMemberId) return;
        if (!this.gearChecklist[this.currentGearMemberId]) this.gearChecklist[this.currentGearMemberId] = {};
        this.gearChecklist[this.currentGearMemberId][itemId] = isChecked;
        
        // Update UI immediately for better responsiveness
        const gearItem = document.querySelector(`.gear-item[data-item-id="${itemId}"]`);
        if (gearItem) {
            if (isChecked) {
                gearItem.classList.add('checked');
            } else {
                gearItem.classList.remove('checked');
            }
        }
        
        this.saveData();
        this.showGearCategory(this.currentGearCategory);
    }
    clearAllGear() {
        if (!this.currentGearMemberId) { this.showToast('メンバーを選択してください', 'warning'); return; }
        if (confirm('選択中のメンバーの全装備チェックを解除しますか？')) {
            this.gearChecklist[this.currentGearMemberId] = {};
            this.saveData();
            this.showGearCategory(this.currentGearCategory);
            this.showToast('装備チェックを全て解除しました', 'success');
        }
    }
    showMemberGearSummary() {
        const summaryDiv = document.getElementById('gearSummaryArea');
        if (this.members.length === 0) { summaryDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>'; return; }
        let summaryHtml = '<h4>📊 全メンバーの装備状況</h4>';
        this.members.forEach(member => {
            const memberGear = this.gearChecklist[member.id] || {};
            const checkedItems = Object.values(memberGear).filter(Boolean).length;
            const totalItems = Object.keys(this.gearCategories).reduce((sum, category) => sum + this.gearCategories[category].items.length, 0);
            const percentage = totalItems > 0 ? (checkedItems / totalItems * 100).toFixed(1) : 0;
            let totalWeight = 0;
            Object.keys(this.gearCategories).forEach(category => {
                this.gearCategories[category].items.forEach(item => {
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
    exportGearChecklist() {
        if (this.members.length === 0) { this.showToast('メンバーを登録してください', 'warning'); return; }
        let exportText = `${this.teamName} - 装備チェックリスト\n`;
        exportText += `作成日時: ${new Date().toLocaleString()}\n\n`;
        this.members.forEach(member => {
            const memberGear = this.gearChecklist[member.id] || {};
            exportText += `■ ${member.name}\n`;
            Object.keys(this.gearCategories).forEach(category => {
                const categoryData = this.gearCategories[category];
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
        a.download = `${this.teamName}_装備チェックリスト.txt`;
        a.click();
        URL.revokeObjectURL(url);
        this.showToast('装備リストをダウンロードしました', 'success');
    }

    // Mountains
    addMountain() {
        this.safeExecute(() => {
            const mountainName = document.getElementById('newMountainName').value.trim();
            const elevation = parseInt(document.getElementById('newMountainElevation').value) || 0;
            const distance = parseFloat(document.getElementById('newMountainDistance').value) || 0;
            if (!mountainName) { this.showToast('山名を入力してください', 'warning'); return; }
            if (this.mountains.some(m => m.name === mountainName)) { this.showToast('既に登録されている山名です', 'warning'); return; }
            const mountain = { id: Date.now(), name: mountainName, elevation, distance, addedAt: new Date().toISOString() };
            this.mountains.push(mountain);
            this.saveData();
            this.clearMountainForm();
            this.updateMountainSelects();
            this.showToast(`${mountainName}を登録しました`, 'success');
        }, 'Add mountain');
    }
    clearMountainForm() {
        document.getElementById('newMountainName').value = '';
        document.getElementById('newMountainElevation').value = '';
        document.getElementById('newMountainDistance').value = '';
    }
    showMountainList() {
        const mountainListArea = document.getElementById('mountainListArea');
        if (this.mountains.length === 0) { mountainListArea.innerHTML = '<div class="empty-state" style="padding: 20px;">登録されている山がありません</div>'; return; }
        let listHtml = '<h4>登録済みの山一覧</h4>';
        listHtml += this.mountains.map(mountain => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin-bottom: 5px; border-radius: 8px;">
                <div>
                    <strong>${mountain.name}</strong>
                    <span style="color: #666; font-size: 0.9em; margin-left: 10px;">標高: ${mountain.elevation}m, 距離: ${mountain.distance}km</span>
                </div>
                <button class="btn btn-danger" data-action="delete-mountain" data-id="${mountain.id}" style="margin: 0;">削除</button>
            </div>
        `).join('');
        mountainListArea.innerHTML = listHtml;
    }
    deleteMountain(mountainId) {
        this.safeExecute(() => {
            const mountain = this.mountains.find(m => m.id === mountainId);
            if (!mountain) return;
            if (confirm(`${mountain.name}を削除しますか？`)) {
                this.mountains = this.mountains.filter(m => m.id !== mountainId);
                this.saveData();
                this.showMountainList();
                this.updateMountainSelects();
                this.showToast(`${mountain.name}を削除しました`, 'success');
            }
        }, 'Delete mountain');
    }
    clearAllMountains() {
        this.safeExecute(() => {
            if (this.mountains.length === 0) { this.showToast('削除する山がありません', 'warning'); return; }
            if (confirm('すべての山を削除しますか？この操作は取り消せません。')) {
                this.mountains = [];
                this.saveData();
                this.showMountainList();
                this.updateMountainSelects();
                this.showToast('すべての山を削除しました', 'success');
            }
        }, 'Clear all mountains');
    }
    selectMountain() {
        this.safeExecute(() => {
            const mountainSelect = document.getElementById('mountainSelect');
            const selectedMountainId = parseInt(mountainSelect.value);
            if (selectedMountainId) {
                const selectedMountain = this.mountains.find(m => m.id === selectedMountainId);
                if (selectedMountain) {
                    document.getElementById('mountainName').value = selectedMountain.name;
                    document.getElementById('elevationGain').value = selectedMountain.elevation;
                    document.getElementById('hikingDistance').value = selectedMountain.distance;
                    this.showToast(`${selectedMountain.name}の情報を自動入力しました`, 'success');
                }
            }
        }, 'Select mountain');
    }
    updateMountainSelects() {
        const mountainSelect = document.getElementById('mountainSelect');
        if (mountainSelect) {
            mountainSelect.innerHTML = '<option value="">登録済みの山から選択</option>' +
                this.mountains.map(m => `<option value="${m.id}">${m.name} (${m.elevation}m)</option>`).join('');
        }
    }

    // Hiking
    recordHiking() {
        this.safeExecute(() => {
            const memberId = parseInt(document.getElementById('hikingMember').value);
            const mountainName = document.getElementById('mountainName').value.trim();
            const elevationGain = parseInt(document.getElementById('elevationGain').value) || 0;
            const distance = parseFloat(document.getElementById('hikingDistance').value) || 0;
            const difficulty = document.getElementById('hikingDifficulty').value;
            const date = document.getElementById('hikingDate').value;
            const weather = document.getElementById('weather').value;
            const notes = document.getElementById('hikingNotes').value.trim();
            if (!memberId) { this.showToast('メンバーを選択してください', 'warning'); return; }
            if (!mountainName) { this.showToast('山名を入力してください', 'warning'); return; }
            const member = this.members.find(m => m.id === memberId);
            if (!member) return;
            const hikingRecord = { id: Date.now(), memberId, memberName: member.name, mountainName, elevationGain, distance, difficulty, date: date || new Date().toISOString().split('T')[0], weather, notes, recordedAt: new Date().toISOString() };
            this.hikingRecords.push(hikingRecord);
            this.saveData();
            this.clearHikingForm();
            this.updateHikingDisplay();
            this.showToast(`${member.name}さんの登山記録を保存しました`, 'success');
        }, 'Record hiking');
    }
    clearHikingForm() {
        document.getElementById('hikingMember').value = '';
        document.getElementById('mountainSelect').value = '';
        document.getElementById('mountainName').value = '';
        document.getElementById('elevationGain').value = '';
        document.getElementById('hikingDistance').value = '';
        document.getElementById('hikingDifficulty').value = '初級';
        document.getElementById('hikingDate').value = '';
        document.getElementById('weather').value = '晴れ';
        document.getElementById('hikingNotes').value = '';
    }
    showAllHikingRecords() {
        if (this.hikingRecords.length === 0) { this.showToast('登山記録がありません', 'warning'); return; }
        const recordsHtml = this.hikingRecords
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map(record => `
                <div class="hiking-record">
                    <div><strong>${record.memberName}</strong> - ${record.mountainName}</div>
                    <div>日付: ${record.date}, 天候: ${record.weather}, 難易度: ${record.difficulty}</div>
                    <div>標高差: ${record.elevationGain}m, 距離: ${record.distance}km</div>
                    ${record.notes ? `<div>メモ: ${record.notes}</div>` : ''}
                </div>
            `).join('');
        const modal = document.createElement('div');
        modal.className = 'modal-overlay show';
        modal.innerHTML = `
            <div class="confirm-dialog" style="max-width: 700px;">
                <h3>📊 全登山記録</h3>
                <div style="max-height: 500px; overflow-y: auto; margin: 20px 0;">
                    ${recordsHtml}
                </div>
                <button class="btn" data-action="close-modal">閉じる</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
    clearHikingRecords() {
        if (this.hikingRecords.length === 0) { this.showToast('削除する記録がありません', 'warning'); return; }
        if (confirm('すべての登山記録を削除しますか？この操作は取り消せません。')) {
            this.hikingRecords = [];
            this.saveData();
            this.updateHikingDisplay();
            this.showToast('すべての登山記録を削除しました', 'success');
        }
    }
    updateHikingDisplay() {
        const historyDiv = document.getElementById('hikingHistory');
        if (!historyDiv) return;
        if (this.hikingRecords.length === 0) { historyDiv.innerHTML = '<div class="empty-state">登山記録がありません</div>'; return; }
        const recentRecords = this.hikingRecords.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
        const historyHtml = recentRecords.map(record => `
            <div class="hiking-record">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div>
                        <div><strong>${record.memberName}</strong> - ${record.mountainName}</div>
                        <div style="color: #666; font-size: 0.9em;">${record.date} | ${record.weather} | ${record.difficulty}</div>
                        <div style="color: #666; font-size: 0.9em;">標高差: ${record.elevationGain}m, 距離: ${record.distance}km</div>
                        ${record.notes ? `<div style="margin-top: 5px;">${record.notes}</div>` : ''}
                    </div>
                    <button class="btn btn-danger" data-action="delete-hiking-record" data-id="${record.id}" style="margin: 0;">削除</button>
                </div>
            </div>
        `).join('');
        historyDiv.innerHTML = historyHtml + (this.hikingRecords.length > 5 ? '<div style="text-align: center; margin-top: 15px;"><button class="btn btn-info" id="showAllHikingRecordsBtnInline">すべての記録を表示</button></div>' : '');
    }
    deleteHikingRecord(recordId) {
        const record = this.hikingRecords.find(r => r.id === recordId);
        if (!record) return;
        if (confirm(`${record.memberName}さんの${record.mountainName}の記録を削除しますか？`)) {
            this.hikingRecords = this.hikingRecords.filter(r => r.id !== recordId);
            this.saveData();
            this.updateHikingDisplay();
            this.showToast('登山記録を削除しました', 'success');
        }
    }

    // Preparation
    updatePreparationDisplay() {
        const listDiv = document.getElementById('memberPreparationList');
        if (!listDiv) return;
        if (this.members.length === 0) { listDiv.innerHTML = '<div class="empty-state">メンバーを登録してください</div>'; return; }
        let preparationHtml = '<div class="preparation-grid">';
        this.members.forEach(member => {
            const memberGear = this.gearChecklist[member.id] || {};
            const memberHealth = this.healthRecords.filter(h => h.memberId === member.id);
            const memberHiking = this.hikingRecords.filter(h => h.memberId === member.id);
            const gearScoreNum = this.computeGearScore(member.id);
            const gearPercentage = gearScoreNum.toFixed(1);
            const recentHealth = memberHealth.filter(h => {
                const recordDate = new Date(h.recordedAt);
                const threeDaysAgo = new Date();
                threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                return recordDate >= threeDaysAgo;
            });
            const experienceScore = this.calculateExperienceScore(member, memberHiking);
            const safetyScore = this.computeSafetyScore(member.id);
            const overall = this.calculateOverallPreparationStandard(member, safetyScore, gearScoreNum, experienceScore.score);
            preparationHtml += `
                <div class="preparation-card">
                    <h4>${member.name}</h4>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>装備準備度</span><span>${gearPercentage}%</span></div>
                        <div class="progress-bar"><div class="progress-fill" style="width: ${gearPercentage}%"></div></div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>体調管理</span><span>${recentHealth.length > 0 ? '記録あり' : '記録なし'}</span></div>
                        <div style="color: #666; font-size: 0.9em;">直近3日間の記録: ${recentHealth.length}件</div>
                        <div style="color: #666; font-size: 0.9em;">安全管理スコア: ${safetyScore}</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>登山経験</span><span>${experienceScore.level}</span></div>
                        <div style="color: #666; font-size: 0.9em;">登山回数: ${memberHiking.length}回</div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;"><span>総合準備度</span><span>${overall}%</span></div>
                        <div class="progress-bar"><div class="progress-fill" style="width: ${overall}%"></div></div>
                    </div>
                </div>
            `;
        });
        preparationHtml += '</div>';
        listDiv.innerHTML = preparationHtml;
    }
    calculateExperienceScore(member, hikingRecords) {
        let score = 0;
        let level = '初心者';
        if (member.experience === '中級者') score += 30;
        if (member.experience === '上級者') score += 50;
        score += Math.min(hikingRecords.length * 10, 30);
        const highAltitudeCount = hikingRecords.filter(h => h.elevationGain > 1000).length;
        score += Math.min(highAltitudeCount * 5, 20);
        if (score >= 70) level = '上級者';
        else if (score >= 40) level = '中級者';
        return { score, level };
    }
    // New standard weighting (B): Safety 40%, Gear 35%, Experience 25%
    calculateOverallPreparationStandard(member, safetyScore, gearScore, experienceScore) {
        const wSafety = 0.40;
        const wGear = 0.35;
        const wExp = 0.25;
        let overall = Math.round((safetyScore * wSafety) + (gearScore * wGear) + (experienceScore * wExp));
        // Apply caps (safety nets)
        const hasRecent48h = this.hasRecentHealthWithinHours(member, 48);
        const safetyLow = safetyScore < 50;
        const criticalMissing = this.hasCriticalGearMissing(member.id);
        if (safetyLow) overall = Math.min(overall, 70);
        if (criticalMissing) overall = Math.min(overall, 60);
        if (!hasRecent48h) overall = Math.min(overall, 80);
        return overall;
    }

    computeSafetyScore(memberId) {
        const recentWindowDays = 3;
        const now = new Date();
        const windowStart = new Date(now.getTime());
        windowStart.setDate(windowStart.getDate() - recentWindowDays);
        const records = this.healthRecords.filter(h => h.memberId === memberId && new Date(h.recordedAt) >= windowStart);
        if (records.length === 0) {
            // No recent data → conservative baseline and cap will apply elsewhere
            return 70;
        }
        const avg = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
        const conditions = records.map(r => r.condition).filter(v => typeof v === 'number');
        const fatigues = records.map(r => r.fatigueLevel).filter(v => typeof v === 'number');
        const sleepsAll = records.map(r => r.sleepHours).filter(v => typeof v === 'number' && !isNaN(v));
        const avgCondition = conditions.length ? avg(conditions) : 3;
        const avgFatigue = fatigues.length ? avg(fatigues) : 2;
        const avgSleep = sleepsAll.length ? avg(sleepsAll) : 7;
        // Normalize to 0-100
        const conditionScore = Math.max(0, Math.min(1, (avgCondition - 1) / 4)) * 100; // 1..5
        const fatigueScore = Math.max(0, Math.min(1, (5 - avgFatigue) / 4)) * 100; // invert 1..5
        const sleepScore = Math.max(0, Math.min(1, avgSleep / 7)) * 100; // 7h baseline
        let safety = Math.round(conditionScore * 0.5 + fatigueScore * 0.3 + sleepScore * 0.2);
        // Red flags → cap safety
        const redFlag = records.some(r => (r.condition && r.condition <= 2) || (r.fatigueLevel && r.fatigueLevel >= 4) || (typeof r.sleepHours === 'number' && r.sleepHours < 5));
        if (redFlag) safety = Math.min(safety, 60);
        // If no record within last 48h, cap will be applied in overall
        return safety;
    }

    hasRecentHealthWithinHours(member, hours) {
        const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
        return this.healthRecords.some(h => h.memberId === member.id && new Date(h.recordedAt) >= cutoff);
    }

    computeGearScore(memberId) {
        const categories = [
            { key: 'essential', weight: 0.7 },
            { key: 'recommended', weight: 0.2 },
            { key: 'seasonal', weight: 0.1 }
        ];
        const memberGear = this.gearChecklist[memberId] || {};
        let score = 0;
        categories.forEach(({ key, weight }) => {
            const items = this.gearCategories[key].items;
            const checked = items.filter(it => memberGear[it.id]).length;
            const ratio = items.length ? checked / items.length : 0;
            score += ratio * weight * 100;
        });
        score = Math.round(score);
        if (this.hasCriticalGearMissing(memberId)) score = Math.min(score, 40);
        return score;
    }

    hasCriticalGearMissing(memberId) {
        const memberGear = this.gearChecklist[memberId] || {};
        const critical = ['boots', 'rain_jacket', 'rain_pants', 'headlamp'];
        return critical.some(id => !memberGear[id]);
    }

    // UI helpers
    updateDisplay() {
        this.updateDashboard();
        this.updateMemberSelects();
        this.updateMemberList();
        this.updatePreparationDisplay();
    }
    updateDashboard() {
        document.getElementById('memberCount').textContent = `${this.members.length}名`;
        document.getElementById('teamNameText').textContent = this.teamName;
        // メンバー一覧はダッシュボードから非表示にしたため、ここでは準備度のみ更新
        this.updatePreparationDisplay();
    }
    updateMemberList() {
        const listDiv = document.getElementById('memberList');
        if (this.members.length === 0) { listDiv.innerHTML = '<div class="empty-state">登録されたメンバーがいません</div>'; return; }
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
    updateMemberSelects() {
        const selects = ['healthMember', 'gearMember', 'hikingMember'];
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">メンバーを選択してください</option>' + this.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
                if (currentValue && this.members.find(m => m.id == currentValue)) select.value = currentValue;
            }
        });
    }
    updateSafetyDisplay() { this.updateMemberSelects(); this.updateRiskAssessment(); }
    updateGearDisplay() { this.updateMemberSelects(); if (this.currentGearMemberId && this.members.find(m => m.id === this.currentGearMemberId)) this.showGearCategory(this.currentGearCategory); }
    updateExperienceDisplay() {
        this.updateMemberSelects();
        this.updateHikingDisplay();
        this.updateMountainSelects();
        const mountainListArea = document.getElementById('mountainListArea');
        if (mountainListArea && mountainListArea.innerHTML.includes('登録済みの山一覧')) this.showMountainList();
    }

    updatePlanDisplay() {
        // Set inputs from model in case of direct model changes
        const dateEl = document.getElementById('planDate');
        if (dateEl && this.plan.date) dateEl.value = this.plan.date;
        
        // Restore route selection
        if (this.plan.route) {
            this.selectRoute(this.plan.route);
        }
        
        this.renderPlanEntries();
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast show ${type}`;
        setTimeout(() => { toast.classList.remove('show'); }, 3000);
    }
    showConfirmDialog(message, callback) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').classList.add('show');
        document.getElementById('confirmDeleteBtn').onclick = () => { callback(); this.closeConfirmDialog(); };
        document.getElementById('confirmCancelBtn').onclick = () => this.closeConfirmDialog();
    }
    closeConfirmDialog() { document.getElementById('confirmModal').classList.remove('show'); }
}




