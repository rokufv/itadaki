# 富士山登頂アプリ - コード構造ドキュメント

## 📁 ファイル構造

```
/src/
├── constants.js                    # 全定数の一元管理
├── mountainData.js                 # 山小屋・装備データ
├── timeUtils.js                    # 時刻計算ユーティリティ
├── managers/
│   ├── scheduleManager.js         # スケジュール生成・管理
│   ├── healthManager.js           # 体調・安全管理
│   ├── storageManager.js          # データ永続化
│   ├── memberManager.js           # メンバー管理（未実装）
│   ├── gearManager.js             # 装備管理（未実装）
│   └── hikingManager.js           # 登山記録管理（未実装）
├── fujisanTeamManagerRefactored.js # メインクラス（リファクタリング版）
└── README.md                       # このファイル
```

## 🎯 設計原則

### 1. 単一責任の原則
各ファイル・クラスは1つの責任のみを持つ

### 2. 依存性の注入
マネージャーはコンテキスト（メインクラス）を受け取る

### 3. 定数の外部化
全ての定数を`constants.js`に集約

### 4. データと ロジックの分離
- データ: `mountainData.js`
- ロジック: `managers/*`

## 📦 各モジュールの責務

### constants.js
**目的**: 全定数の一元管理
- 登山計算定数（速度、標高等）
- 体調・安全管理定数
- 準備度計算の重み
- データ管理設定

**利点**:
- 設定変更が1箇所で完結
- マジックナンバーの排除
- ドキュメント機能

### mountainData.js
**目的**: 富士山関連データの管理
- 各ルートの山小屋情報
- 装備カテゴリと重量データ

**利点**:
- データ更新が容易
- ロジックとデータの分離

### timeUtils.js
**目的**: 時刻計算の汎用ユーティリティ
- 時刻のパース・フォーマット
- 時間の加算・減算
- 経過時間の計算

**利点**:
- 再利用可能
- テストしやすい
- バグが集中しない

### managers/scheduleManager.js
**目的**: スケジュール生成と管理
- 登山時間の計算
- ご来光スケジュールの自動生成
- タイムライン表示
- スケジュールの追加・削除・エクスポート

**主要メソッド**:
- `calculateGoraikoSchedule()` - スケジュール生成
- `generateAutoSchedule()` - 自動生成実行
- `renderPlanEntries()` - タイムライン表示

### managers/healthManager.js
**目的**: 体調記録と安全評価
- 安全スコアの計算
- リスク評価
- 体調記録の管理

**主要メソッド**:
- `computeSafetyScore()` - 安全スコア計算
- `updateRiskAssessment()` - リスク評価表示

### managers/storageManager.js
**目的**: データの永続化
- ローカルストレージへの保存・読込
- サーバーとの同期
- 自動保存機能
- URLパラメータ解析

**主要メソッド**:
- `saveData()` - データ保存
- `loadData()` - データ読込
- `serverSaveNow()` - サーバー同期

## 🔄 マネージャーパターン

### 使用方法

```javascript
// メインクラスでマネージャーを初期化
this.scheduleManager = new ScheduleManager(this);
this.healthManager = new HealthManager(this);
this.storageManager = new StorageManager(this);

// メソッドを委譲
generateAutoSchedule() {
    return this.scheduleManager.generateAutoSchedule();
}
```

### 利点
1. **可読性**: 各機能が明確に分離
2. **保守性**: 変更の影響範囲が限定
3. **テスト性**: 個別テストが容易
4. **拡張性**: 新機能追加が簡単

## 📊 移行前後の比較

### Before（1693行の巨大ファイル）
```
fujisanTeamManager.js (1693行)
├── 定数 (~100行)
├── データ (~100行)
├── スケジュール管理 (~300行)
├── メンバー管理 (~200行)
├── 体調管理 (~300行)
├── 装備管理 (~300行)
├── 登山記録管理 (~200行)
├── データ永続化 (~200行)
└── UI更新 (~300行)
```

### After（機能別に分割）
```
/src/
├── constants.js (50行)
├── mountainData.js (75行)
├── timeUtils.js (70行)
├── managers/
│   ├── scheduleManager.js (300行)
│   ├── healthManager.js (150行)
│   ├── storageManager.js (200行)
│   └── ... (その他のマネージャー)
└── fujisanTeamManagerRefactored.js (300行)
```

## 🚀 次のステップ

### 未実装のマネージャー

1. **memberManager.js**
   - メンバーの追加・削除・更新
   - メンバーリストの表示

2. **gearManager.js**
   - 装備チェックリストの管理
   - 装備スコアの計算
   - 装備サマリーの表示

3. **hikingManager.js**
   - 登山記録の追加・削除
   - 経験スコアの計算
   - 山の管理

4. **uiManager.js**
   - 全てのUI更新ロジック
   - モーダル管理
   - タブ切り替え

### 完全移行の手順

1. 各未実装マネージャーを作成
2. 既存の`fujisanTeamManager.js`から対応するメソッドを移動
3. メインクラスで委譲メソッドを作成
4. テストして動作確認
5. 元のファイルを削除

## 📝 コーディング規約

### インポート
```javascript
// 定数
import * as CONST from '../constants.js';

// データ
import { MOUNTAIN_HUTS, GEAR_CATEGORIES } from '../mountainData.js';

// ユーティリティ
import { formatTime, parseTime } from '../timeUtils.js';

// マネージャー
import { ScheduleManager } from './managers/scheduleManager.js';
```

### マネージャークラス
```javascript
export class XxxManager {
    constructor(context) {
        this.context = context; // メインクラスへの参照
    }
    
    // メソッドは動詞で開始
    calculateXxx() { ... }
    updateXxx() { ... }
    renderXxx() { ... }
}
```

### JSDoc
重要なメソッドには必ずJSDocを記載
```javascript
/**
 * 説明
 * @param {type} name - 説明
 * @returns {type} 説明
 */
```

## 🎉 改善効果

### Before
❌ 1つのファイルに全機能が詰まっている  
❌ 1693行で見通しが悪い  
❌ 変更の影響範囲が不明  
❌ テストが困難  

### After
✅ 機能ごとに分離された小さなファイル  
✅ 各ファイルは50-300行程度  
✅ 変更の影響範囲が明確  
✅ 個別テストが可能  
✅ 新機能追加が容易  

## 🤝 貢献

新しいマネージャーを追加する際は、このREADMEも更新してください。

