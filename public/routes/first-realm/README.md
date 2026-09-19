# 《仙途》第一境路线背景包 V2

建议解压到：

`public/routes/first-realm/`

## 对应关系

- `01-mist-forest-wolf.png` → 霧林・妖狼出沒
- `02-barren-battlefield-bandit.png` → 荒道・劫修攔路
- `03-emerald-creek-snake.png` → 青溪・靈蛇潛伏
- `04-stone-valley-ape.png` → 石谷・裂猿怒吼
- `05-blood-ridge-elite.png` → 血嶺・強敵現身（叛劍客 / 精英）
- `06-tiger-altar-boss.png` → 虎神古壇・噬靈王現（Boss）
- `07-rest-pavilion.png` → 山亭・暫歇調息（修整）
- `08-misty-market-shop.png` → 幽市・霧中交易（商店）
- `09-spirit-altar-event.png` → 靈壇・古符異動（奇遇）

## Route card 显示规则

背景层：
- `width: 100%`
- `height: 100%`
- `object-fit: cover`

怪物层：
- 使用现有透明怪物 PNG
- `position: absolute`
- `object-fit: contain`
- 不要使用 `cover`
- 可为每只怪单独设置 `routeScale / routeOffsetX / routeOffsetY`

这些图只用于路线选择卡 / 节点场景，不要直接覆盖现有战斗背景。
