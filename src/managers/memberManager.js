/**
 * メンバー管理マネージャー
 * チームメンバーの追加・削除・表示を担当
 */

export class MemberManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * メンバーを追加
     * バリデーション強化版
     */
    addMember() {
        this.context.safeExecute(() => {
            const name = document.getElementById('memberName')?.value.trim();
            const ageInput = document.getElementById('memberAge')?.value;
            const age = ageInput ? parseInt(ageInput) : null;
            const experience = document.getElementById('memberExperience')?.value;
            
            // バリデーション
            if (!name) {
                this.context.showToast('名前を入力してください', 'warning');
                return;
            }
            if (name.length > 50) {
                this.context.showToast('名前は50文字以内で入力してください', 'warning');
                return;
            }
            if (age !== null && (isNaN(age) || age < 0 || age > 150)) {
                this.context.showToast('年齢は0〜150の範囲で入力してください', 'warning');
                return;
            }
            if (this.context.members.some(m => m.name === name)) {
                this.context.showToast('同じ名前のメンバーが既に存在します', 'warning');
                return;
            }
            
            const member = {
                id: Date.now(),
                name,
                age,
                experience,
                joinedAt: new Date().toISOString()
            };
            
            this.context.members.push(member);
            this.context.gearChecklist[member.id] = {};
            this.clearMemberForm();
            this.context.updateDisplay();
            this.context.saveData();
            this.context.showToast(`${name}さんを追加しました`, 'success');
        }, 'Add member');
    }

    /**
     * メンバーを削除
     * @param {number} memberId - メンバーID
     */
    deleteMember(memberId) {
        this.context.safeExecute(() => {
            const member = this.context.members.find(m => m.id === memberId);
            if (!member) return;
            
            this.context.deleteTargetId = memberId;
            this.context.showConfirmDialog(
                `${member.name}さんを削除しますか？\nすべての関連データも削除されます。`,
                () => {
                    this.context.members = this.context.members.filter(m => m.id !== memberId);
                    this.context.healthRecords = this.context.healthRecords.filter(h => h.memberId !== memberId);
                    delete this.context.gearChecklist[memberId];
                    this.context.hikingRecords = this.context.hikingRecords.filter(h => h.memberId !== memberId);
                    this.context.updateDisplay();
                    this.context.saveData();
                    this.context.showToast(`${member.name}さんを削除しました`, 'success');
                }
            );
        }, 'Delete member');
    }

    /**
     * メンバーフォームをクリア
     */
    clearMemberForm() {
        const nameEl = document.getElementById('memberName');
        const ageEl = document.getElementById('memberAge');
        const expEl = document.getElementById('memberExperience');
        
        if (nameEl) nameEl.value = '';
        if (ageEl) ageEl.value = '';
        if (expEl) expEl.value = '初心者';
    }

    /**
     * メンバーリストを更新
     */
    updateMemberList() {
        const listDiv = document.getElementById('memberList');
        if (!listDiv) return;
        
        if (this.context.members.length === 0) {
            listDiv.innerHTML = '<div class="empty-state">登録されたメンバーがいません</div>';
            return;
        }
        
        const memberCards = this.context.members.map(member => `
            <div class="member-card">
                <div class="member-info">
                    <div class="member-name">${member.name}</div>
                    <div style="color: #666;">
                        ${member.age ? `${member.age}歳 | ` : ''}
                        ${member.experience}
                        ${member.joinedAt ? ` | 登録: ${new Date(member.joinedAt).toLocaleDateString()}` : ''}
                    </div>
                </div>
                <button class="btn btn-danger" data-action="delete-member" data-id="${member.id}">削除</button>
            </div>
        `).join('');
        
        listDiv.innerHTML = memberCards;
    }

    /**
     * メンバーセレクトボックスを更新
     */
    updateMemberSelects() {
        const selects = ['healthMember', 'gearMember', 'hikingMember'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                const currentValue = select.value;
                select.innerHTML = '<option value="">メンバーを選択してください</option>' + 
                    this.context.members.map(m => `<option value="${m.id}">${m.name}</option>`).join('');
                
                if (currentValue && this.context.members.find(m => m.id == currentValue)) {
                    select.value = currentValue;
                }
            }
        });
    }

    /**
     * チーム名を編集
     */
    editTeamName() {
        const displayEl = document.getElementById('teamNameDisplay');
        const editEl = document.getElementById('teamNameEdit');
        const inputEl = document.getElementById('teamNameInput');
        
        if (displayEl) displayEl.style.display = 'none';
        if (editEl) editEl.style.display = 'block';
        if (inputEl) {
            inputEl.value = this.context.teamName;
            inputEl.focus();
        }
    }

    /**
     * チーム名を保存
     */
    saveTeamName() {
        const inputEl = document.getElementById('teamNameInput');
        const textEl = document.getElementById('teamNameText');
        
        if (inputEl) {
            const newName = inputEl.value.trim();
            if (newName) {
                this.context.teamName = newName;
                if (textEl) textEl.textContent = this.context.teamName;
                this.context.saveData();
                this.context.showToast('チーム名を更新しました', 'success');
            }
        }
        this.cancelTeamName();
    }

    /**
     * チーム名編集をキャンセル
     */
    cancelTeamName() {
        const displayEl = document.getElementById('teamNameDisplay');
        const editEl = document.getElementById('teamNameEdit');
        
        if (displayEl) displayEl.style.display = 'flex';
        if (editEl) editEl.style.display = 'none';
    }
}

