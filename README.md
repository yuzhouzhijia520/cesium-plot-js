# cesium-plot-js

cesium 军事标绘插件,支持绘制多边形、曲线、箭头等图形

![image](https://ethan-zf.github.io/cesium-plot-js/examples/banner.png)

淡入淡出效果：

![image](https://ethan-zf.github.io/cesium-plot-js/examples/show-hide-animation.gif)

生长动画：
![image](https://ethan-zf.github.io/cesium-plot-js/examples/attack-arrow-growth.gif)

在线示例： [demo](https://github.com/yuzhouzhijia520/cesium-plot-js/blob/dev/examples/index.html)

### CDN

1. 引入文件

```
<script src="https://unpkg.com/cesium-plot-js"></script>
```

2. 调用绘制 api

```
  new CesiumPlot.FineArrow(Cesium, viewer);
```

### NPM

1. install

```
npm i cesium-plot-js
```

2. import

```
import CesiumPlot from 'cesium-plot-js';
```

3. 调用绘制 api

```
  new CesiumPlot.FineArrow(Cesium, viewer);
```

### Classes

每个图形为独立的类，绑定事件或其他操作通过类的实例来实现

| 类名                   | 类型      | 描述             | 生长动画 |
| ---------------------- | --------- | ---------------- | -------- |
| Polygon                | 'polygon' | 多边形           | ❌       |
| Reactangle             | 'polygon' | 矩形             | ❌       |
| Triangle               | 'polygon' | 三角形           | ❌       |
| Circle                 | 'polygon' | 圆形             | ❌       |
| Sector                 | 'polygon' | 扇形             | ❌       |
| StraightArrow          | 'line'    | 细直箭头         | ✔️       |
| CurvedArrow            | 'line'    | 曲线箭头         | ✔️       |
| FineArrow              | 'polygon' | 直箭头           | ✔️       |
| AttackArrow            | 'polygon' | 进攻方向箭头     | ✔️       |
| SwallowtailAttackArrow | 'polygon' | 燕尾进攻方向箭头 | ✔️       |
| SquadCombat            | 'polygon' | 分队战斗方向     | ✔️       |
| SwallowtailSquadCombat | 'polygon' | 燕尾分队战斗方向 | ✔️       |
| AssaultDirection       | 'polygon' | 突击方向         | ✔️       |
| DoubleArrow            | 'polygon' | 双箭头           | ✔️       |
| FreehandLine           | 'line'    | 自由线           | ❌       |
| FreehandPolygon        | 'polygon' | 自由面           | ❌       |
| Curve                  | 'line'    | 曲线             | ❌       |
| Ellipse                | 'polygon' | 椭圆             | ❌       |
| Lune                   | 'polygon' | 半月面           | ❌       |

### 构造函数

所有图形的构造函数：

<类名>(cesium: Cesium, viewer: Cesium.Viewer, style?: [PolygonStyle](#PolygonStyle) | [LineStyle](#LineStyle))

<h5 id='PolygonStyle'>PolygonStyle类型</h5>

```
{
  material?: Cesium.MaterialProperty;
  outlineWidth?: number;
  outlineMaterial?: Cesium.MaterialProperty;
};
```

<h5 id='LineStyle'>LineStyle类型</h5>

```
{
  material?: Cesium.Color;
  lineWidth?: number;
};
```

示例

```
// 初始化viewer
const viewer = new Cesium.Viewer('cesiumContainer');
// 抗锯齿
viewer.scene.postProcessStages.fxaa.enabled = true;
// 设置自定义样式
const geometry = new CesiumPlot.FineArrow(Cesium, viewer, {
  material: Cesium.Color.fromCssColorString('rgba(59, 178, 208, 0.5)'),
  outlineMaterial: Cesium.Color.fromCssColorString('rgba(59, 178, 208, 1)'),
  outlineWidth: 3,
});
```

### 类的实例方法

| 方法名               | 参数                                                                  | 描述                                                 |
| -------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| hide                 | options?: [AnimationOpts](#AnimationOpts)                             | 隐藏，options 可配置动画参数，参数缺省时，不显示动画 |
| show                 | options?: [AnimationOpts](#AnimationOpts)                             | 显示，options 可配置动画参数，参数缺省时，不显示动画 |
| startGrowthAnimation | options?: [AnimationOpts](#AnimationOpts)                             | 生长动画，options 可配置动画参数                     |
| getPoints            |                                                                       | 获取图形关键点位                                     |
| remove               |                                                                       | 删除                                                 |
| on                   | (event: [EventType](#EventType), listener: (eventData?: any) => void) | 绑定事件                                             |
| off                  | (event: [EventType](#EventType))                                      | 解绑事件                                             |

<h5 id='AnimationOpts'>AnimationOpts类型</h5>

| 参数     | 类型       | 默认值 | 描述                   |
| -------- | ---------- | ------ | ---------------------- |
| duration | number     | 2000   | 动画持续时间（ms）     |
| delay    | number     | 0      | 动画延迟启动时间（ms） |
| callback | () => void | -      | 动画结束回调           |

```
// 隐藏图形
const geometry = new CesiumPlot.Reactangle(Cesium, viewer);
geometry.hide();
```

```
// 绑定事件
const geometry = new CesiumPlot.Reactangle(Cesium, viewer);
geometry.on('drawEnd', (data)=>{
  console.log(data)
});
```

### 静态方法

**CesiumPlot.createGeometryFromData(cesium: Cesium, viewer: Cesium.Viewer, options:[CreateGeometryFromDataOpts](#CreateGeometryFromDataOpts))**

根据图形的关键点位重新生成图形

<h5 id='CreateGeometryFromDataOpts'>CreateGeometryFromDataOpts参数类型</h5>

```
{
  type: 'FineArrow'|'AttackArrow'|'SwallowtailAttackArrow'|'SquadCombat'|'SwallowtailSquadCombat'|'StraightArrow'|'CurvedArrow'|'AssaultDirection'|'DoubleArrow'|'FreehandLine'|'FreehandPolygon'|'Curve'|'Ellipse'|'Lune'|'Reactangle'|'Triangle'|'Polygon'|'Circle'|'Sector', // 图形类型
  cartesianPoints: Cesium.Cartesian3[], // 图形关键点位，可通过实例方法getPoints或者drawEnd事件获得
  style?: PolygonStyle | LineStyle // 样式
}
```

<h3 id='EventType'>Events</h3>

- **drawStart**

绘制开始

- **drawUpdate**

绘制过程中点位更新，回调事件返回更新的 Cartesian3 点位

- **drawEnd**

绘制结束，回调事件返回图形的关键点位

```
geometry.on('drawEnd', (data) => {
  console.log(data);
});
```

- **editStart**

编辑开始

- **editEnd**

编辑结束，回调事件返回图形的关键点位
