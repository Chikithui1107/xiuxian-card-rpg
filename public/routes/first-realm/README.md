# 《仙途》第一境路线卡背景包

建议放置目录：

public/routes/first-realm/

## 对应关系

01-mist-forest-wolf.png → 霧林・妖狼出沒
02-barren-road-bandit.png → 荒道・劫修攔路
03-green-creek-snake.png → 青溪・靈蛇潛伏
04-broken-cliff-traitor.png → 叛劍客精英路線
05-stone-valley-ape.png → 裂石猿精英路線
06-deep-valley-tiger.png → 噬靈虎王 Boss 路線
07-rest-moon-path.png → 休整
08-shop-ruined-village.png → 商店
09-event-spirit-altar.png → 奇遇

## 路线卡显示规则

背景层：
- width: 100%
- height: 100%
- object-fit: cover

怪物层：
- 使用现有透明 PNG
- position: absolute
- object-fit: contain
- 不要再用 cover
- 每只怪允许单独 routeScale / routeOffsetX / routeOffsetY

不要把这些背景直接替换成战斗背景。
它们只用于路线选择卡。
