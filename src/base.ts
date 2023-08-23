// @ts-ignore
import * as CesiumTypeOnly from '@examples/cesium';
import { State, GeometryStyle, PolygonStyle, LineStyle } from './interface';

export default class Base {
  cesium: typeof CesiumTypeOnly;
  viewer: CesiumTypeOnly.Viewer;
  eventHandler: CesiumTypeOnly.ScreenSpaceEventHandler;
  polygonEntity: CesiumTypeOnly.Entity;
  geometryPoints: CesiumTypeOnly.Cartesian3[] = [];
  state: State = 'drawing';
  controlPoints: CesiumTypeOnly.EntityCollection = [];
  controlPointsEventHandler: CesiumTypeOnly.ScreenSpaceEventHandler;
  lineEntity: CesiumTypeOnly.Entity;
  type!: 'polygon' | 'line';
  freehand!: boolean;
  style: GeometryStyle | undefined;
  outlineEntity: CesiumTypeOnly.Entity;

  constructor(cesium: CesiumTypeOnly, viewer: CesiumTypeOnly.Viewer, style?: GeometryStyle) {
    this.cesium = cesium;
    this.viewer = viewer;
    this.type = this.getType();
    this.mergeStyle(style);
    this.cartesianToLnglat = this.cartesianToLnglat.bind(this);
    this.pixelToCartesian = this.pixelToCartesian.bind(this);
    this.onClick();
  }

  mergeStyle(style: GeometryStyle | undefined) {
    if (this.type === 'polygon') {
      this.style = Object.assign(
        {
          fillColor: this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 0.2)'),
          outlineColor: this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 1.0)'),
          outlineWidth: 2,
        },
        style,
      );
    } else if (this.type === 'line') {
      this.style = Object.assign(
        {
          lineColor: this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 1.0)'),
          lineWidth: 2,
        },
        style,
      );
    }
  }

  /**
   * The base class provides a method to change the state, and different logic is implemented based on the state.
   *  The state is controlled by individual sub-components according to the actual situation.
   * @param state
   */
  setState(state: State) {
    this.state = state;
  }

  getState(): State {
    return this.state;
  }

  /**
   * Bind a global click event that responds differently based on the state. When in the drawing state,
   * a click will add points for geometric shapes. During editing, selecting a drawn shape puts it in an
   *  editable state. Clicking on empty space sets it to a static state.
   */
  onClick() {
    this.eventHandler = new this.cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.eventHandler.setInputAction((evt: any) => {
      const pickedObject = this.viewer.scene.pick(evt.position);
      const hitEntities = this.cesium.defined(pickedObject) && pickedObject.id instanceof CesiumTypeOnly.Entity;
      let activeEntity = this.polygonEntity;
      if (this.type === 'line') {
        activeEntity = this.lineEntity;
      }

      if (this.state === 'drawing') {
        // In the drawing state, the points clicked are key nodes of the shape, and they are saved in this.points.
        const cartesian = this.pixelToCartesian(evt.position);
        const points = this.getPoints();
        // If the click is outside the sphere, position information cannot be obtained.
        if (!cartesian) {
          return;
        }
        // "For non-freehand drawn shapes, validate that the distance between two consecutive clicks is greater than 10 meters
        if (!this.freehand && points.length > 0 && !this.checkDistance(cartesian, points[points.length - 1])) {
          return;
        }
        this.addPoint(cartesian);
      } else if (this.state === 'edit') {
        //In edit mode, exit the editing state and delete control points when clicking outside the currently edited shape.
        if (!hitEntities || activeEntity.id !== pickedObject.id.id) {
          this.setState('static');
          this.removeControlPoints();
        }
      } else if (this.state === 'static') {
        //When drawing multiple shapes, the click events for all shapes are triggered. Only when hitting a completed shape should it enter editing mode.
        if (hitEntities && activeEntity.id === pickedObject.id.id) {
          const pickedGraphics = this.type === 'line' ? pickedObject.id.polyline : pickedObject.id.polygon;
          if (this.cesium.defined(pickedGraphics)) {
            // Hit Geometry Shape.
            this.setState('edit');
            this.addControlPoints();
          }
        }
      }
    }, this.cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  onMouseMove() {
    this.eventHandler.setInputAction((evt: any) => {
      const points = this.getPoints();
      const cartesian = this.pixelToCartesian(evt.endPosition);
      if (!cartesian) {
        return;
      }
      if (this.checkDistance(cartesian, points[points.length - 1])) {
        // Synchronize data to subclasses.If the distance is less than 10 meters, do not proceed
        this.updateMovingPoint(cartesian, points.length);
      }
    }, this.cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  onDoubleClick() {
    // this.eventHandler = new this.cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    this.eventHandler.setInputAction((evt: any) => {
      this.finishDrawing();
    }, this.cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  }

  /**
   * Check if the distance between two points is greater than 10 meters.
   */
  checkDistance(cartesian1: CesiumTypeOnly.Cartesian3, cartesian2: CesiumTypeOnly.Cartesian3) {
    const distance = this.cesium.Cartesian3.distance(cartesian1, cartesian2);
    return distance > 10;
  }

  finishDrawing() {
    this.removeMoveListener();
    this.setState('static');
  }

  removeClickListener() {
    this.eventHandler.removeInputAction(this.cesium.ScreenSpaceEventType.LEFT_CLICK);
  }

  removeMoveListener() {
    this.eventHandler.removeInputAction(this.cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  setGeometryPoints(geometryPoints: CesiumTypeOnly.Cartesian3[]) {
    this.geometryPoints = geometryPoints;
  }

  getGeometryPoints(): CesiumTypeOnly.Cartesian3[] {
    return this.geometryPoints;
  }

  drawPolygon() {
    const callback = () => {
      return new this.cesium.PolygonHierarchy(this.geometryPoints);
    };
    if (!this.polygonEntity) {
      const style = this.style as PolygonStyle;
      this.polygonEntity = this.viewer.entities.add({
        polygon: new this.cesium.PolygonGraphics({
          hierarchy: new this.cesium.CallbackProperty(callback, false),
          show: true,
          material: style.fillColor, // || this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 0.2)'),
        }),
      });

      // Due to limitations in PolygonGraphics outlining, a separate line style is drawn.
      this.outlineEntity = this.viewer.entities.add({
        polyline: {
          positions: new this.cesium.CallbackProperty(() => {
            return [...this.geometryPoints, this.geometryPoints[0]];
          }, false),
          width: style.outlineWidth, // || 2,
          material: style.outlineColor, // || this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 1.0)'),
          clampToGround: true,
        },
      });
    }
  }

  drawLine() {
    if (!this.lineEntity) {
      const style = this.style as LineStyle;
      this.lineEntity = this.addLineEntity(style);
    }
  }

  addFirstLineOfTheArrow() {
    if (!this.lineEntity) {
      // The line style between the first two points matches the outline style.
      const style = this.style as PolygonStyle;
      const lineStyle = {
        lineColor: style.outlineColor,
        lineWidth: style.outlineWidth,
      };
      this.lineEntity = this.addLineEntity(lineStyle);
    }
  }

  addLineEntity(style: LineStyle) {
    const entity = this.viewer.entities.add({
      polyline: {
        positions: new this.cesium.CallbackProperty(() => this.geometryPoints, false),
        width: style.lineWidth, // || 2,
        material: style.lineColor, // || this.cesium.Color.fromCssColorString('rgba(59, 178, 208, 1.0)'),
        clampToGround: true,
      },
    });
    return entity;
  }

  cartesianToLnglat(cartesian: CesiumTypeOnly.Cartesian3): [number, number] {
    const lnglat = this.viewer.scene.globe.ellipsoid.cartesianToCartographic(cartesian);
    const lat = this.cesium.Math.toDegrees(lnglat.latitude);
    const lng = this.cesium.Math.toDegrees(lnglat.longitude);
    return [lng, lat];
  }

  pixelToCartesian(position: CesiumTypeOnly.Cartesian2): CesiumTypeOnly.Cartesian3 | undefined {
    const ray = this.viewer.camera.getPickRay(position);
    const cartesian = this.viewer.scene.globe.pick(ray, this.viewer.scene);
    return cartesian;
  }

  /**
   * Display key points when creating a shape, allowing dragging of these points to edit and generate new shapes.
   */
  addControlPoints() {
    const points = this.getPoints();
    this.controlPoints = points.map((position) => {
      // return this.viewer.entities.add({
      //   position,
      //   billboard: {
      //     image: './src/assets/circle_red.png',
      //   },
      // });

      return this.viewer.entities.add({
        position,
        point: {
          pixelSize: 10,
          heightReference: this.cesium.HeightReference.CLAMP_TO_GROUND,
          color: this.cesium.Color.RED,
        },
      });
    });

    let isDragging = false;
    let draggedIcon: CesiumTypeOnly.Entity = null;

    this.controlPointsEventHandler = new this.cesium.ScreenSpaceEventHandler(this.viewer.canvas);
    // Listen for left mouse button press events
    this.controlPointsEventHandler.setInputAction((clickEvent: any) => {
      const pickedObject = this.viewer.scene.pick(clickEvent.position);

      if (this.cesium.defined(pickedObject)) {
        for (let i = 0; i < this.controlPoints.length; i++) {
          if (pickedObject.id === this.controlPoints[i]) {
            isDragging = true;
            draggedIcon = this.controlPoints[i];
            draggedIcon.index = i; //Save the index of dragged points for dynamic updates during movement
            break;
          }
        }
        // Disable default camera interaction.
        this.viewer.scene.screenSpaceCameraController.enableRotate = false;
      }
    }, this.cesium.ScreenSpaceEventType.LEFT_DOWN);

    // Listen for mouse movement events
    this.controlPointsEventHandler.setInputAction((moveEvent: any) => {
      if (isDragging && draggedIcon) {
        const cartesian = this.viewer.camera.pickEllipsoid(moveEvent.endPosition, this.viewer.scene.globe.ellipsoid);
        if (cartesian) {
          draggedIcon.position.setValue(cartesian);
          this.updateDraggingPoint(cartesian, draggedIcon.index);
        }
      }
    }, this.cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Listen for left mouse button release events
    this.controlPointsEventHandler.setInputAction(() => {
      isDragging = false;
      draggedIcon = null;
      this.viewer.scene.screenSpaceCameraController.enableRotate = true;
    }, this.cesium.ScreenSpaceEventType.LEFT_UP);
  }

  removeControlPoints() {
    if (this.controlPoints.length > 0) {
      this.controlPoints.forEach((entity: CesiumTypeOnly.Entity) => {
        this.viewer.entities.remove(entity);
      });
      this.controlPointsEventHandler.removeInputAction(this.cesium.ScreenSpaceEventType.LEFT_DOWN);
      this.controlPointsEventHandler.removeInputAction(this.cesium.ScreenSpaceEventType.MOUSE_MOVE);
      this.controlPointsEventHandler.removeInputAction(this.cesium.ScreenSpaceEventType.LEFT_UP);
    }
  }

  show() {
    if (this.type === 'polygon') {
      this.polygonEntity.show = true;
      this.outlineEntity.show = true;
    } else if (this.type === 'line') {
      this.lineEntity.show = true;
    }
  }

  hide() {
    if (this.type === 'polygon') {
      this.polygonEntity.show = false;
      this.outlineEntity.show = false;
    } else if (this.type === 'line') {
      this.lineEntity.show = false;
    }
  }

  addPoint(cartesian: CesiumTypeOnly.Cartesian3) {
    //Abstract method that must be implemented by subclasses.
  }

  getPoints(): CesiumTypeOnly.Cartesian3[] {
    //Abstract method that must be implemented by subclasses.
    return this.cesium.Cartesian3();
  }

  updateMovingPoint(cartesian: CesiumTypeOnly.Cartesian3, index?: number) {
    //Abstract method that must be implemented by subclasses.
  }

  updateDraggingPoint(cartesian: CesiumTypeOnly.Cartesian3, index: number) {
    //Abstract method that must be implemented by subclasses.
  }

  getType(): 'polygon' | 'line' {
    return 'polygon';
    //Abstract method that must be implemented by subclasses.
  }
}
