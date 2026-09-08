import * as THREE from 'three';
import { TEMEL } from '@/lib/demo';
import { EKRAN, ODA, fotografPozu, poz, type Cerceve } from './zaman';

export type Sahne = { ciz: (p: number) => Cerceve; boyutla: () => void; temizle: () => void };
// Measured UV bounds: the physical display and live DOM share these corners.
const ODA_EN = ODA.en, ODA_BOY = ODA.boy, ODA_Z = ODA.z;

/** Photographic scenic planes, physical foreground pipes, and scroll-driven vapor. */
export async function cekirdekKur(canvas: HTMLCanvasElement): Promise<Sahne> {
  const textures: THREE.Texture[] = [], geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  let renderer: THREE.WebGLRenderer | undefined;
  function temizle() {
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
    renderer?.dispose(); renderer?.forceContextLoss();
  }
  try {
    // Keep the static first frame until all scenic textures are decoded.
    const loader = new THREE.TextureLoader();
    const loaded = await Promise.allSettled(['dis', 'yaklasma', 'kontrol-odasi'].map(async name => {
      const t = await loader.loadAsync(`${TEMEL}/gorseller/giris/${name}.webp`);
      t.colorSpace = THREE.SRGBColorSpace; textures.push(t); return t;
    }));
    if (loaded.some(r => r.status === 'rejected')) throw new Error('Sahne görselleri yüklenemedi');
    const [dis, yakin, ic] = loaded.map(r => (r as PromiseFulfilledResult<THREE.Texture>).value);
    renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: false, powerPreference: 'low-power' });
    renderer.setClearColor(0x0a0c0d); renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(58, 1, .05, 160);
    const exterior = new THREE.Group(); scene.add(exterior);
    const room = new THREE.Group(); room.position.z = ODA_Z; scene.add(room);
    const photoMat = new THREE.MeshBasicMaterial({ map: dis, transparent: true, depthWrite: false, toneMapped: false });
    const roomMat = new THREE.MeshBasicMaterial({ map: ic, toneMapped: false });
    const nearMat = new THREE.MeshBasicMaterial({ map: yakin, transparent: true, depthWrite: false, toneMapped: false });
    materials.push(photoMat, roomMat, nearMat);
    const photoGeo = new THREE.PlaneGeometry(64, 36); geometries.push(photoGeo);
    const photo = new THREE.Mesh(photoGeo, photoMat);
    photo.position.z = -32; photo.renderOrder = 1; exterior.add(photo);
    const nearPhoto = new THREE.Mesh(photoGeo, nearMat);
    nearPhoto.position.z = -44; nearPhoto.renderOrder = 0; scene.add(nearPhoto);
    const roomGeo = new THREE.PlaneGeometry(ODA_EN, ODA_BOY); geometries.push(roomGeo);
    room.add(new THREE.Mesh(roomGeo, roomMat));
    scene.add(new THREE.HemisphereLight(0x9dbce7, 0x302016, 2));
    const warm = new THREE.DirectionalLight(0xffbd73, 3.2); warm.position.set(12, 4, -18); scene.add(warm);
    const steel = new THREE.MeshStandardMaterial({ color: 0x46576b, metalness: .65, roughness: .32, transparent: true });
    const band = new THREE.MeshStandardMaterial({ color: 0x8799a6, metalness: .7, roughness: .26, transparent: true });
    materials.push(steel, band);
    const pipeGeo = new THREE.CylinderGeometry(.28, .28, 1, 16), collarGeo = new THREE.TorusGeometry(.3, .035, 5, 16);
    geometries.push(pipeGeo, collarGeo);
    for (const side of [-1, 1]) {
      for (let row = 0; row < 2; row++) {
        const pipe = new THREE.Mesh(pipeGeo, steel);
        pipe.position.set(side * (10.8 + row * .8), -5.4 - row * .6, -17);
        pipe.rotation.x = Math.PI / 2; pipe.scale.y = 24; pipe.renderOrder = 2; exterior.add(pipe);
        for (let i = 0; i < 8; i++) {
          const collar = new THREE.Mesh(collarGeo, band);
          collar.position.set(pipe.position.x, pipe.position.y, -6 - i * 3); collar.renderOrder = 2; exterior.add(collar);
        }
      }
    }
    // Soft procedural cloud sprite, not a frame-clock animation.
    const vaporCanvas = document.createElement('canvas'); vaporCanvas.width = vaporCanvas.height = 128;
    const ctx = vaporCanvas.getContext('2d')!;
    for (let i = 0; i < 24; i++) {
      const x = 64 + Math.sin(i * 2.39) * 24, y = 64 + Math.cos(i * 1.71) * 22;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, 29);
      grad.addColorStop(0, 'rgba(230,235,240,0.14)'); grad.addColorStop(1, 'rgba(230,235,240,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 128, 128);
    }
    const vaporTex = new THREE.CanvasTexture(vaporCanvas); textures.push(vaporTex);
    const vapor = Array.from({ length: 28 }, (_, i) => {
      const m = new THREE.SpriteMaterial({ map: vaporTex, color: i % 3 ? 0xb8c9d9 : 0xffd2a0, transparent: true, depthWrite: false, opacity: .2 });
      materials.push(m); const sprite = new THREE.Sprite(m); sprite.renderOrder = 3; exterior.add(sprite);
      return { sprite, m, x: Math.sin(i * 2.39) * 16, y: 3 + (i % 5) * 1.8, z: -9 - (i % 7) * 2.8 };
    });
    let width = 1, height = 1;
    function boyutla() {
      width = Math.max(1, canvas.clientWidth); height = Math.max(1, canvas.clientHeight);
      renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.6));
      renderer!.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
      photo.scale.setScalar(Math.max(1, camera.aspect / (64 / 36)));
      room.scale.setScalar(photo.scale.x); nearPhoto.scale.setScalar(photo.scale.x);
    }
    boyutla();
    const centerY = (.5 - (EKRAN.ust + EKRAN.alt) / 2) * ODA_BOY;
    const centerX = ((EKRAN.sol + EKRAN.sag) / 2 - .5) * ODA_EN;
    return {
      boyutla, temizle,
      ciz(p) {
        const s = poz(p);
        camera.position.set(centerX * room.scale.x * s.ekran, centerY * room.scale.y * s.ekran, s.kamera);
        camera.lookAt(camera.position.x, camera.position.y, s.kamera - 1);
        exterior.visible = s.bina < 1; photoMat.opacity = 1 - s.bina; steel.opacity = band.opacity = (1 - s.bina) * .75;
        nearPhoto.visible = s.oda < 1; nearMat.opacity = 1 - s.oda;
        vapor.forEach(({ sprite, m, x, y, z }, i) => {
          sprite.position.set(x + Math.sin(s.p * 3 + i) * s.yaklasma * 2, y + s.yaklasma * 2, z);
          sprite.scale.setScalar(7 + (i % 4) * 1.2); m.opacity = (1 - s.bina) * (.12 + .15 * s.yaklasma);
        });
        scene.updateMatrixWorld(true); camera.updateMatrixWorld(true); renderer!.render(scene, camera);
        return fotografPozu(p, width, height).ekran;
      },
    };
  } catch (error) { temizle(); throw error; }
}
