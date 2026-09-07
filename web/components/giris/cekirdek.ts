import * as THREE from 'three';
import { poz } from './zaman';

export type Cerceve = { sol: number; sag: number; ust: number; alt: number };
export type Sahne = { ciz: (p: number) => Cerceve; boyutla: () => void; temizle: () => void };

export function cekirdekKur(canvas: HTMLCanvasElement): Sahne {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
  renderer.setClearColor(0x0a0c0d, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .03, 80);
  const group = new THREE.Group();
  scene.add(group);
  scene.add(new THREE.HemisphereLight(0xe1e8ed, 0x292019, 2.2));
  const key = new THREE.DirectionalLight(0xffe7cc, 4.5);
  key.position.set(-3, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xc3d3da, 3);
  rim.position.set(5, -1, -3);
  scene.add(rim);
  const materials = [
    new THREE.MeshStandardMaterial({ color: 0x697475, metalness: .78, roughness: .28 }),
    new THREE.MeshStandardMaterial({ color: 0x333e40, metalness: .55, roughness: .24, transparent: true, opacity: .84 }),
    new THREE.MeshStandardMaterial({ color: 0xc2703e, metalness: .7, roughness: .3 }),
  ];
  const geometries: THREE.BufferGeometry[] = [];
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x9da8a7, transparent: true, opacity: .25 });
  const layers: THREE.Group[] = [];
  // Solid architectural slabs with a shared rectangular aperture; no textures or postprocessing.
  const shape = new THREE.Shape();
  shape.moveTo(-2.25, -1.65); shape.lineTo(2.25, -1.65); shape.lineTo(2.25, 1.65); shape.lineTo(-2.25, 1.65); shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-1.18, -.88); hole.lineTo(-1.18, .88); hole.lineTo(1.18, .88); hole.lineTo(1.18, -.88); hole.closePath();
  shape.holes.push(hole);
  const slab = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: .018, bevelThickness: .015, curveSegments: 1 });
  const edges = new THREE.EdgesGeometry(slab, 30);
  geometries.push(slab, edges);
  for (let i = 0; i < 6; i++) {
    const layer = new THREE.Group();
    layer.add(new THREE.Mesh(slab, materials[i === 2 ? 2 : i % 2]));
    layer.add(new THREE.LineSegments(edges, lineMaterial));
    layers.push(layer); group.add(layer);
  }
  const shutterGeo = new THREE.BoxGeometry(1.2, 1.8, .06);
  const shutterMat = new THREE.MeshStandardMaterial({ color: 0x14181a, roughness: .65, metalness: .3 });
  geometries.push(shutterGeo);
  const shutters = [-1, 1].map(sign => {
    const mesh = new THREE.Mesh(shutterGeo, shutterMat);
    layers[5].add(mesh); return { mesh, sign };
  });
  let width = 1, height = 1, mobile = false;
  function boyutla() {
    width = canvas.clientWidth; height = canvas.clientHeight; mobile = width < 700;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = mobile ? 48 : 36;
    camera.updateProjectionMatrix();
  }
  boyutla();
  const point = new THREE.Vector3();
  return {
    boyutla,
    ciz(p) {
      const s = poz(p);
      group.position.set((mobile ? 0 : 1.55) * s.x, (mobile ? -2.4 : -.05) * s.x, 0);
      group.rotation.set(s.rx, s.ry, s.rz);
      group.scale.setScalar(mobile ? .74 + .26 * (1 - s.x) : 1);
      layers.forEach((layer, i) => { layer.position.z = -i * s.aralik; });
      shutters.forEach(({ mesh, sign }) => { mesh.position.set(sign * (.6 + 1.2 * s.aciklik), 0, -.04); });
      camera.position.set(0, 0, s.kamera);
      camera.lookAt(0, 0, s.kamera - 1);
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      renderer.render(scene, camera);
      // The DOM aperture is the projected opening in the rearmost physical slab.
      point.set(-1.18 * s.aciklik, .88, .04); layers[5].localToWorld(point); point.project(camera);
      const sol = (point.x + 1) * width / 2, ust = (1 - point.y) * height / 2;
      point.set(1.18 * s.aciklik, -.88, .04); layers[5].localToWorld(point); point.project(camera);
      return { sol, ust, sag: (point.x + 1) * width / 2, alt: (1 - point.y) * height / 2 };
    },
    temizle() {
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      lineMaterial.dispose(); shutterMat.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
