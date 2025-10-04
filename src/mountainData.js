/**
 * 富士山登山データ
 * 山小屋情報と装備カテゴリデータ
 */

// ━━━ 山小屋データ（ルート別） ━━━
export const MOUNTAIN_HUTS = {
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

// ━━━ 装備カテゴリデータ ━━━
export const GEAR_CATEGORIES = {
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

