/**
 * 登山記録管理マネージャー
 * 登山記録と山の登録・管理を担当
 */

export class HikingManager {
    constructor(context) {
        this.context = context;
    }

    /**
     * 登山記録を保存
     */
    recordHiking() {
        this.context.safeExecute(() => {
            const memberId = parseInt(document.getElementById('hikingMember')?.value);
            const mountainName = document.getElementById('mountainName')?.value.trim();
            const elevationGain = parseInt(document.getElementById('elevationGain')?.value) || 0;
            const distance = parseFloat(document.getElementById('hikingDistance')?.value) || 0;
            const difficulty = document.getElementById('hikingDifficulty')?.value;
            const date = document.getElementById('hikingDate')?.value;
            const weather = document.getElementById('weather')?.value;
            const notes = document.getElementById('hikingNotes')?.value.trim();
            
            if (!memberId) {
                this.context.showToast('メンバーを選択してください', 'warning');
                return;
            }
            if (!mountainName) {
                this.context.showToast('山名を入力してください', 'warning');
                return;
            }
            
            const member = this.context.members.find(m => m.id === memberId);
            if (!member) return;
            
            const hikingRecord = {
                id: Date.now(),
                memberId,
                memberName: member.name,
                mountainName,
                elevationGain,
                distance,
                difficulty,
                date: date || new Date().toISOString().split('T')[0],
                weather,
                notes,
                recordedAt: new Date().toISOString()
            };
            
            this.context.hikingRecords.push(hikingRecord);
            this.context.saveData();
            this.clearHikingForm();
            this.updateHikingDisplay();
            this.context.showToast(`${member.name}さんの登山記録を保存しました`, 'success');
        }, 'Record hiking');
    }

    /**
     * 登山記録フォームをクリア
     */
    clearHikingForm() {
        const fields = {
            'hikingMember': '',
            'mountainSelect': '',
            'mountainName': '',
            'elevationGain': '',
            'hikingDistance': '',
            'hikingDifficulty': '初級',
            'hikingDate': '',
            'weather': '晴れ',
            'hikingNotes': ''
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.value = value;
        });
    }

    /**
     * 全ての登山記録を表示
     */
    showAllHikingRecords() {
        if (this.context.hikingRecords.length === 0) {
            this.context.showToast('登山記録がありません', 'warning');
            return;
        }
        
        const recordsHtml = this.context.hikingRecords
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
        
        // メモリリーク対策
        const closeModal = () => {
            modal.remove();
        };
        
        modal.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="close-modal"]') || e.target === modal) {
                closeModal();
            }
        });
        
        document.body.appendChild(modal);
    }

    /**
     * 全ての登山記録を削除
     */
    clearHikingRecords() {
        if (this.context.hikingRecords.length === 0) {
            this.context.showToast('削除する記録がありません', 'warning');
            return;
        }
        
        if (confirm('すべての登山記録を削除しますか？この操作は取り消せません。')) {
            this.context.hikingRecords = [];
            this.context.saveData();
            this.updateHikingDisplay();
            this.context.showToast('すべての登山記録を削除しました', 'success');
        }
    }

    /**
     * 登山記録表示を更新
     */
    updateHikingDisplay() {
        const historyDiv = document.getElementById('hikingHistory');
        if (!historyDiv) return;
        
        if (this.context.hikingRecords.length === 0) {
            historyDiv.innerHTML = '<div class="empty-state">登山記録がありません</div>';
            return;
        }
        
        const recentRecords = this.context.hikingRecords
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
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
        
        historyDiv.innerHTML = historyHtml + 
            (this.context.hikingRecords.length > 5 ? 
                '<div style="text-align: center; margin-top: 15px;"><button class="btn btn-info" id="showAllHikingRecordsBtnInline">すべての記録を表示</button></div>' : 
                '');
    }

    /**
     * 登山記録を削除
     * @param {number} recordId - 記録ID
     */
    deleteHikingRecord(recordId) {
        const record = this.context.hikingRecords.find(r => r.id === recordId);
        if (!record) return;
        
        if (confirm(`${record.memberName}さんの${record.mountainName}の記録を削除しますか？`)) {
            this.context.hikingRecords = this.context.hikingRecords.filter(r => r.id !== recordId);
            this.context.saveData();
            this.updateHikingDisplay();
            this.context.showToast('登山記録を削除しました', 'success');
        }
    }

    // ━━━ 山の管理 ━━━

    /**
     * 山を登録
     */
    addMountain() {
        this.context.safeExecute(() => {
            const mountainName = document.getElementById('newMountainName')?.value.trim();
            const elevationInput = document.getElementById('newMountainElevation')?.value;
            const distanceInput = document.getElementById('newMountainDistance')?.value;
            const elevation = elevationInput ? parseInt(elevationInput) : 0;
            const distance = distanceInput ? parseFloat(distanceInput) : 0;
            
            // バリデーション
            if (!mountainName) {
                this.context.showToast('山名を入力してください', 'warning');
                return;
            }
            if (mountainName.length > 100) {
                this.context.showToast('山名は100文字以内で入力してください', 'warning');
                return;
            }
            if (elevation < 0 || elevation > 9000) {
                this.context.showToast('標高は0〜9000mの範囲で入力してください', 'warning');
                return;
            }
            if (distance < 0 || distance > 1000) {
                this.context.showToast('距離は0〜1000kmの範囲で入力してください', 'warning');
                return;
            }
            if (this.context.mountains.some(m => m.name === mountainName)) {
                this.context.showToast('既に登録されている山名です', 'warning');
                return;
            }
            
            const mountain = {
                id: Date.now(),
                name: mountainName,
                elevation,
                distance,
                addedAt: new Date().toISOString()
            };
            
            this.context.mountains.push(mountain);
            this.context.saveData();
            this.clearMountainForm();
            this.updateMountainSelects();
            this.context.showToast(`${mountainName}を登録しました`, 'success');
        }, 'Add mountain');
    }

    /**
     * 山の登録フォームをクリア
     */
    clearMountainForm() {
        ['newMountainName', 'newMountainElevation', 'newMountainDistance'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
    }

    /**
     * 山のリストを表示
     */
    showMountainList() {
        const mountainListArea = document.getElementById('mountainListArea');
        if (!mountainListArea) return;
        
        if (this.context.mountains.length === 0) {
            mountainListArea.innerHTML = '<div class="empty-state" style="padding: 20px;">登録されている山がありません</div>';
            return;
        }
        
        let listHtml = '<h4>登録済みの山一覧</h4>';
        listHtml += this.context.mountains.map(mountain => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; margin-bottom: 5px; border-radius: 8px;">
                <div>
                    <strong>${mountain.name}</strong>
                    <span style="color: #666; font-size: 0.9em; margin-left: 10px;">
                        標高: ${mountain.elevation}m, 距離: ${mountain.distance}km
                    </span>
                </div>
                <button class="btn btn-danger" data-action="delete-mountain" data-id="${mountain.id}" style="margin: 0;">削除</button>
            </div>
        `).join('');
        
        mountainListArea.innerHTML = listHtml;
    }

    /**
     * 山を削除
     * @param {number} mountainId - 山のID
     */
    deleteMountain(mountainId) {
        this.context.safeExecute(() => {
            const mountain = this.context.mountains.find(m => m.id === mountainId);
            if (!mountain) return;
            
            if (confirm(`${mountain.name}を削除しますか？`)) {
                this.context.mountains = this.context.mountains.filter(m => m.id !== mountainId);
                this.context.saveData();
                this.showMountainList();
                this.updateMountainSelects();
                this.context.showToast(`${mountain.name}を削除しました`, 'success');
            }
        }, 'Delete mountain');
    }

    /**
     * 全ての山を削除
     */
    clearAllMountains() {
        this.context.safeExecute(() => {
            if (this.context.mountains.length === 0) {
                this.context.showToast('削除する山がありません', 'warning');
                return;
            }
            
            if (confirm('すべての山を削除しますか？この操作は取り消せません。')) {
                this.context.mountains = [];
                this.context.saveData();
                this.showMountainList();
                this.updateMountainSelects();
                this.context.showToast('すべての山を削除しました', 'success');
            }
        }, 'Clear all mountains');
    }

    /**
     * 山を選択
     */
    selectMountain() {
        this.context.safeExecute(() => {
            const mountainSelect = document.getElementById('mountainSelect');
            const selectedMountainId = parseInt(mountainSelect?.value);
            
            if (selectedMountainId) {
                const selectedMountain = this.context.mountains.find(m => m.id === selectedMountainId);
                if (selectedMountain) {
                    const nameEl = document.getElementById('mountainName');
                    const elevEl = document.getElementById('elevationGain');
                    const distEl = document.getElementById('hikingDistance');
                    
                    if (nameEl) nameEl.value = selectedMountain.name;
                    if (elevEl) elevEl.value = selectedMountain.elevation;
                    if (distEl) distEl.value = selectedMountain.distance;
                    
                    this.context.showToast(`${selectedMountain.name}の情報を自動入力しました`, 'success');
                }
            }
        }, 'Select mountain');
    }

    /**
     * 山のセレクトボックスを更新
     */
    updateMountainSelects() {
        const mountainSelect = document.getElementById('mountainSelect');
        if (mountainSelect) {
            mountainSelect.innerHTML = '<option value="">登録済みの山から選択</option>' +
                this.context.mountains.map(m => `<option value="${m.id}">${m.name} (${m.elevation}m)</option>`).join('');
        }
    }

    /**
     * 経験スコアを計算
     * @param {Object} member - メンバー情報
     * @param {Array} hikingRecords - 登山記録配列
     * @returns {Object} { score, level }
     */
    calculateExperienceScore(member, hikingRecords) {
        let score = 0;
        let level = '初心者';
        
        // 経験レベルによる基本スコア
        if (member.experience === '中級者') score += 30;
        if (member.experience === '上級者') score += 50;
        
        // 登山回数によるスコア
        score += Math.min(hikingRecords.length * 10, 30);
        
        // 高標高登山経験によるスコア
        const highAltitudeCount = hikingRecords.filter(h => h.elevationGain > 1000).length;
        score += Math.min(highAltitudeCount * 5, 20);
        
        // レベル判定
        if (score >= 70) level = '上級者';
        else if (score >= 40) level = '中級者';
        
        return { score, level };
    }
}

