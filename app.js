import { FujisanTeamManager } from './fujisanTeamManager.js';

const app = new FujisanTeamManager();
window.app = app; // optional: for debugging in console

function bindCoreEvents() {
    // Emergency Contact Button
    document.getElementById('emergencyBtn')?.addEventListener('click', openEmergencyModal);
    document.getElementById('emergencyCloseBtn')?.addEventListener('click', closeEmergencyModal);
    document.getElementById('emergencyModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'emergencyModal') closeEmergencyModal();
    });

    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(navItem => {
        navItem.addEventListener('click', () => {
            const tab = navItem.dataset.tab;
            if (tab === 'menu') {
                openMenu();
            } else {
                app.switchTab(tab);
            }
        });
    });

    // Menu overlay
    document.getElementById('menuCloseBtn')?.addEventListener('click', closeMenu);
    document.getElementById('menuOverlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'menuOverlay') closeMenu();
    });
    document.querySelectorAll('.menu-item').forEach(menuItem => {
        menuItem.addEventListener('click', () => {
            const tab = menuItem.dataset.tab;
            app.switchTab(tab);
            closeMenu();
        });
    });

    // Health Sliders
    setupHealthSliders();

    // Team name
    document.getElementById('editTeamNameBtn')?.addEventListener('click', () => app.editTeamName());
    document.getElementById('saveTeamNameBtn')?.addEventListener('click', () => app.saveTeamName());
    document.getElementById('cancelTeamNameBtn')?.addEventListener('click', () => app.cancelTeamName());

    // Members
    document.getElementById('addMemberBtn')?.addEventListener('click', () => app.addMember());
    document.getElementById('memberName')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') app.addMember(); });
    document.getElementById('memberList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-member"]');
        if (!btn) return;
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (Number.isFinite(id)) app.deleteMember(id);
    });

    // Health
    document.getElementById('recordHealthBtn')?.addEventListener('click', () => app.recordHealth());
    document.getElementById('showHealthHistoryBtn')?.addEventListener('click', () => app.showHealthHistory());
    document.getElementById('clearHealthFormBtn')?.addEventListener('click', () => app.clearHealthForm());
    document.getElementById('healthMember')?.addEventListener('change', () => {});

    // Gear
    document.getElementById('gearMember')?.addEventListener('change', (e) => {
        if (e.target.value) {
            app.currentGearMemberId = parseInt(e.target.value);
            app.showGearCategory(app.currentGearCategory);
        } else {
            app.currentGearMemberId = null;
            document.getElementById('gearChecklist').innerHTML = '<p class="empty-state" style="padding: 20px;">メンバーを選択してください</p>';
        }
    });
    document.querySelectorAll('[data-gear-category]')?.forEach(btn => {
        btn.addEventListener('click', () => app.showGearCategory(btn.dataset.gearCategory));
    });
    document.getElementById('clearAllGearBtn')?.addEventListener('click', () => app.clearAllGear());
    document.getElementById('showMemberGearSummaryBtn')?.addEventListener('click', () => app.showMemberGearSummary());
    document.getElementById('exportGearChecklistBtn')?.addEventListener('click', () => app.exportGearChecklist());
    document.getElementById('gearChecklist')?.addEventListener('change', (e) => {
        if (e.target && e.target.matches('input.gear-checkbox')) {
            const itemId = e.target.getAttribute('data-gear-item-id');
            app.toggleGearItem(itemId, e.target.checked);
        }
    });

    // Mountains
    document.getElementById('addMountainBtn')?.addEventListener('click', () => app.addMountain());
    document.getElementById('showMountainListBtn')?.addEventListener('click', () => app.showMountainList());
    document.getElementById('clearAllMountainsBtn')?.addEventListener('click', () => app.clearAllMountains());
    document.getElementById('mountainSelect')?.addEventListener('change', () => app.selectMountain());
    document.getElementById('mountainListArea')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-mountain"]');
        if (btn) {
            const id = parseInt(btn.getAttribute('data-id'));
            app.deleteMountain(id);
        }
    });

    // Mountain Preset Buttons
    document.querySelectorAll('.mountain-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mountainName = btn.dataset.mountain;
            const elevation = btn.dataset.elevation;
            const distance = btn.dataset.distance;
            
            // Fill the form
            document.getElementById('newMountainName').value = mountainName;
            document.getElementById('newMountainElevation').value = elevation;
            document.getElementById('newMountainDistance').value = distance;
            
            // Visual feedback
            btn.style.animation = 'none';
            setTimeout(() => {
                btn.style.animation = '';
            }, 10);
            
            // Scroll to form
            document.querySelector('.mountain-input-form')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            
            app.showToast(`${mountainName}を選択しました`, 'success');
        });
    });

    // Hiking
    document.getElementById('recordHikingBtn')?.addEventListener('click', () => app.recordHiking());
    document.getElementById('clearHikingFormBtn')?.addEventListener('click', () => app.clearHikingForm());
    document.getElementById('showAllHikingRecordsBtn')?.addEventListener('click', () => app.showAllHikingRecords());
    document.getElementById('clearHikingRecordsBtn')?.addEventListener('click', () => app.clearHikingRecords());
    const hikingDateInput = document.getElementById('hikingDate');
    if (hikingDateInput) {
        hikingDateInput.addEventListener('focus', () => {
            if (!hikingDateInput.value) hikingDateInput.value = new Date().toISOString().split('T')[0];
        });
    }
    document.getElementById('hikingHistory')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-hiking-record"]');
        if (btn) {
            const id = parseInt(btn.getAttribute('data-id'));
            app.deleteHikingRecord(id);
        }
        const showAll = e.target.closest('#showAllHikingRecordsBtnInline');
        if (showAll) app.showAllHikingRecords();
    });

    // Modals (close)
    document.body.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-action="close-modal"]');
        if (closeBtn) {
            closeBtn.closest('.modal-overlay')?.remove();
        }
    });

    // Plan - Route Selection
    document.querySelectorAll('.route-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const route = btn.dataset.route;
            app.selectRoute(route);
        });
    });

    // Plan - Activity Templates
    document.querySelectorAll('.activity-template-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const activity = btn.dataset.activity;
            document.getElementById('planActivity').value = activity;
            document.getElementById('planTime')?.focus();
            app.showToast('アクティビティを入力しました', 'success');
        });
    });

    // Plan - Auto Schedule Generator
    document.getElementById('generateScheduleBtn')?.addEventListener('click', () => {
        if (confirm('既存のスケジュールは削除されます。ご来光コースの標準スケジュールを自動生成しますか？')) {
            app.generateAutoSchedule();
        }
    });

    // Plan
    document.getElementById('planDate')?.addEventListener('change', (e) => app.setPlanDate(e.target.value));
    document.getElementById('addPlanEntryBtn')?.addEventListener('click', () => app.addPlanEntry());
    document.getElementById('clearPlanBtn')?.addEventListener('click', () => app.clearPlan());
    document.getElementById('exportPlanBtn')?.addEventListener('click', () => app.exportPlan());
    
    // Clear Timeline
    document.getElementById('clearTimelineBtn')?.addEventListener('click', () => {
        if (confirm('タイムラインの全てのスケジュールを削除しますか？')) {
            app.clearTimeline();
        }
    });
    
    document.getElementById('planScheduleList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-plan-entry"]');
        if (btn) {
            const id = parseInt(btn.getAttribute('data-id'));
            app.deletePlanEntry(id);
        }
    });
}

function openMenu() {
    document.getElementById('menuOverlay')?.classList.add('show');
}

function closeMenu() {
    document.getElementById('menuOverlay')?.classList.remove('show');
}

function openEmergencyModal() {
    document.getElementById('emergencyModal')?.classList.add('show');
}

function closeEmergencyModal() {
    document.getElementById('emergencyModal')?.classList.remove('show');
}

// Health Slider UI
function setupHealthSliders() {
    const conditionSlider = document.getElementById('healthCondition');
    const sleepSlider = document.getElementById('sleepHours');
    const fatigueSlider = document.getElementById('fatigueLevel');

    const conditionDisplay = document.getElementById('conditionDisplay');
    const sleepDisplay = document.getElementById('sleepDisplay');
    const fatigueDisplay = document.getElementById('fatigueDisplay');

    if (conditionSlider && conditionDisplay) {
        conditionSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const labels = ['😞 不調', '😟 やや不調', '😐 普通', '🙂 良い', '😊 とても良い'];
            conditionDisplay.textContent = `${labels[value - 1]} (${value})`;
        });
    }

    if (sleepSlider && sleepDisplay) {
        sleepSlider.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            sleepDisplay.textContent = `${value.toFixed(1)} 時間`;
        });
    }

    if (fatigueSlider && fatigueDisplay) {
        fatigueSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            const labels = ['😌 疲れていない', '🙂 少し疲れ', '😐 普通', '😓 疲れている', '😫 とても疲れている'];
            fatigueDisplay.textContent = `${labels[value - 1]} (${value})`;
        });
    }
}

// Connection Status Monitor
function updateConnectionStatus() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (navigator.onLine) {
        statusDot?.classList.add('online');
        statusDot?.classList.remove('offline');
        if (statusText) statusText.textContent = 'オンライン';
    } else {
        statusDot?.classList.remove('online');
        statusDot?.classList.add('offline');
        if (statusText) statusText.textContent = 'オフライン';
    }
}

window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    bindCoreEvents();
    updateConnectionStatus();
    // Restore drafts to inputs after initial render
    app.applyDraftsToUI();

    // Continuous draft capture
    const draftFields = [
        'memberName','memberAge','memberExperience',
        'healthMember','healthCondition','sleepHours','fatigueLevel',
        'newMountainName','newMountainElevation','newMountainDistance',
        'hikingMember','mountainSelect','mountainName','elevationGain','hikingDistance','hikingDifficulty','hikingDate','weather','hikingNotes',
        'planDate','planHut','planTime','planActivity'
    ];
    const draftHandler = () => {
        const gearMemberEl = document.getElementById('gearMember');
        const gearMemberValue = gearMemberEl?.value || '';
        const d = {
            memberName: document.getElementById('memberName')?.value || '',
            memberAge: document.getElementById('memberAge')?.value || '',
            memberExperience: document.getElementById('memberExperience')?.value || '初心者',
            healthMember: document.getElementById('healthMember')?.value || '',
            healthCondition: document.getElementById('healthCondition')?.value || '3',
            sleepHours: document.getElementById('sleepHours')?.value || '',
            fatigueLevel: document.getElementById('fatigueLevel')?.value || '1',
            currentGearMemberId: gearMemberValue ? parseInt(gearMemberValue, 10) : '',
            currentGearCategory: app.currentGearCategory,
            newMountainName: document.getElementById('newMountainName')?.value || '',
            newMountainElevation: document.getElementById('newMountainElevation')?.value || '',
            newMountainDistance: document.getElementById('newMountainDistance')?.value || '',
            hikingMember: document.getElementById('hikingMember')?.value || '',
            mountainSelect: document.getElementById('mountainSelect')?.value || '',
            mountainName: document.getElementById('mountainName')?.value || '',
            elevationGain: document.getElementById('elevationGain')?.value || '',
            hikingDistance: document.getElementById('hikingDistance')?.value || '',
            hikingDifficulty: document.getElementById('hikingDifficulty')?.value || '初級',
            hikingDate: document.getElementById('hikingDate')?.value || '',
            weather: document.getElementById('weather')?.value || '晴れ',
            hikingNotes: document.getElementById('hikingNotes')?.value || '',
            planDate: document.getElementById('planDate')?.value || '',
            planHut: document.getElementById('planHut')?.value || '',
            planTime: document.getElementById('planTime')?.value || '',
            planActivity: document.getElementById('planActivity')?.value || ''
        };
        app.setDrafts(d);
    };
    draftFields.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', draftHandler);
            el.addEventListener('change', draftHandler);
        }
    });
    // Special: gear member select and category buttons
    document.getElementById('gearMember')?.addEventListener('change', draftHandler);
    document.querySelectorAll('[data-gear-category]')?.forEach(btn => btn.addEventListener('click', draftHandler));
});


