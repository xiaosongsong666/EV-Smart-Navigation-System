import * as THREE from 'three';
import maplibregl from 'maplibre-gl';

/**
 * ECEF (地心地固坐标系) → 经纬度 + 海拔
 */
export function ecefToLngLatAlt(x: number, y: number, z: number) {
  const a = 6378137.0;
  const e2 = 6.69437999014e-3;
  const b = a * Math.sqrt(1 - e2);
  const ep2 = (a * a - b * b) / (b * b);
  const p = Math.sqrt(x * x + y * y);
  const th = Math.atan2(a * z, b * p);
  const lon = Math.atan2(y, x);
  const lat = Math.atan2(
    z + ep2 * b * Math.pow(Math.sin(th), 3),
    p - e2 * a * Math.pow(Math.cos(th), 3),
  );
  const n = a / Math.sqrt(1 - e2 * Math.sin(lat) * Math.sin(lat));
  const alt = p / Math.cos(lat) - n;
  return { lng: (lon * 180) / Math.PI, lat: (lat * 180) / Math.PI, alt };
}

/**
 * 计算模型在地图中的墨卡托变换
 */
export function getModelTransform(
  coord: [number, number, number],
  rotate: [number, number, number] = [Math.PI / 2, 0, 0],
) {
  const modelAsMercatorCoordinate = maplibregl.MercatorCoordinate.fromLngLat(
    [coord[0], coord[1]],
    coord[2],
  );
  return {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: rotate[0],
    rotateY: rotate[1],
    rotateZ: rotate[2],
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits(),
  };
}

/**
 * 更新模型本地变换矩阵
 */
export function updateLocalTransform(
  modelOrigin: [number, number, number] = [0, 0, 0],
): THREE.Matrix4 {
  const modelTransform = getModelTransform(modelOrigin);
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const axisZ = new THREE.Vector3(0, 0, 1);
  const rotationX = new THREE.Matrix4().makeRotationAxis(axisX, modelTransform.rotateX);
  const rotationY = new THREE.Matrix4().makeRotationAxis(axisY, modelTransform.rotateY);
  const rotationZ = new THREE.Matrix4().makeRotationAxis(axisZ, modelTransform.rotateZ);
  const scaleVec = new THREE.Vector3(
    modelTransform.scale,
    -modelTransform.scale,
    modelTransform.scale,
  );
  return new THREE.Matrix4()
    .makeTranslation(
      modelTransform.translateX,
      modelTransform.translateY,
      modelTransform.translateZ,
    )
    .scale(scaleVec)
    .multiply(rotationX)
    .multiply(rotationY)
    .multiply(rotationZ);
}
