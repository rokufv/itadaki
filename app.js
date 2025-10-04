import { FujisanTeamManager } from './fujisanTeamManager.js';

const app = new FujisanTeamManager();
window.app = app; // optional: for debugging in console

function bindCoreEvents() {
    // Tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => app.switchTab(tab.dataset.tab));
    });

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

    // Plan
    document.getElementById('planDate')?.addEventListener('change', (e) => app.setPlanDate(e.target.value));
    document.getElementById('planHut')?.addEventListener('input', (e) => app.setPlanHut(e.target.value));
    document.getElementById('addPlanEntryBtn')?.addEventListener('click', () => app.addPlanEntry());
    document.getElementById('clearPlanBtn')?.addEventListener('click', () => app.clearPlan());
    document.getElementById('exportPlanBtn')?.addEventListener('click', () => app.exportPlan());
    document.getElementById('planScheduleList')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-action="delete-plan-entry"]');
        if (btn) {
            const id = parseInt(btn.getAttribute('data-id'));
            app.deletePlanEntry(id);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    app.init();
    bindCoreEvents();
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


