/**
 * WILD SWITCH: 3D 動物變身大冒險 (Animal Shapeshift Adventure 3D)
 * 遵照《兒童美語 3D 互動遊戲開發指南與 GPT6-Astra 提示詞庫》重構：
 * 1. 消除網頁感：Three.js 2.5D/3D 景深透視、糖果粉彩光影、柔和陰影
 * 2. 主機級 Game Juice：Squash & Stretch 果凍彈跳、相機跟隨、Screen Shake 震動、Hitstop 停頓
 * 3. 程式化音效：ZzFX 輕量合成器（跳躍、變身、成功和弦、失敗彈簧音）＋ 真人發音
 * 4. 8 大立體地形與動物技能演出：swim(水花潛游), climb(藤蔓高攀), fly/soar(風道翱翔), jump/hop(巨岩騰空), walk/run(極速狂奔)
 */

'use strict';

// ==========================================
// 1. ZzFX 超輕量合成音效引擎 (< 1KB 核心)
// ==========================================
const zzfxV = 0.3;
const zzfx = (p=1,k=.05,b=220,e=0,r=0,t=.1,q=0,D=1,u=0,y=0,v=0,z=0,l=0,E=0,A=0,F=0,c=0,w=1,m=0,B=0)=>{
  if (GameAudio.isMuted) return;
  try {
    let M=Math,R=44100,d=2*M.PI,G=u*=500*d/R/R,C=b*=(1-k+2*k*M.random(k=[]))*d/R,g=0,c1=0,a=0,f=1,h=0,
    n=0,q1=new (window.AudioContext||window.webkitAudioContext);
    let S=q1.createBuffer(1,R*t,R),L=S.getChannelData(0);
    for(;n<R*t;L[n++]=a)a=M.sin(g)*f,f=n<R*e?n/(R*e):n<R*(e+r)?1-(n-R*e)/(R*r)*(1-D):n<R*(t-c)?D:(t-n/R)/c*D,
    g+=C,C+=G;let p1=q1.createBufferSource();p1.buffer=S;p1.connect(q1.destination);p1.start();
  } catch(e) {}
};

const SFX = {
  jump: () => zzfx(1, 0.05, 330, 0.02, 0.08, 0.12, 1, 1.5, -4),
  coin: () => zzfx(1, 0.05, 880, 0.01, 0.05, 0.15, 1, 1.2, 12),
  switchCard: () => zzfx(1, 0.05, 440, 0.01, 0.03, 0.08, 1, 1, 6),
  powerSuccess: () => zzfx(1, 0.05, 523.25, 0.02, 0.2, 0.35, 1, 1.8, 5, 2),
  wrong: () => zzfx(1, 0.05, 220, 0, 0.1, 0.3, 1, 1.2, -8),
  land: () => zzfx(1, 0.05, 120, 0.01, 0.04, 0.1, 1, 0.8, -10)
};

const GameAudio = {
  isMuted: false,
  currentVoice: null,
  voiceCache: {},

  init() {
    ['climb','dog','duck','eagle','fish','fly','frog','hop','iguana','jump','owl','rabbit','run','soar','swim','walk'].forEach(w => {
      const a = new Audio(`V1_flashcards_audios/V1_${w}.mp3`);
      a.preload = 'auto';
      this.voiceCache[w] = a;
    });
  },

  playVoice(word) {
    if (this.isMuted) return;
    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice.currentTime = 0;
    }
    const audio = this.voiceCache[word] || new Audio(`V1_flashcards_audios/V1_${word}.mp3`);
    this.currentVoice = audio;
    audio.currentTime = 0;
    audio.play().catch(e => console.warn('Audio play error:', e));
  },

  stopVoice() {
    if (this.currentVoice) {
      this.currentVoice.pause();
      this.currentVoice.currentTime = 0;
    }
  }
};
GameAudio.init();

// ==========================================
// 2. 教學教材資料 (V1 8 位動物與動作技能)
// ==========================================
const ANIMALS = [
  { id: 0, animal: 'owl', action: 'fly', emoji: '🦉', desc: '貓頭鷹夜行飛翔', color: '#94a3b8' },
  { id: 1, animal: 'rabbit', action: 'hop', emoji: '🐰', desc: '小兔子活潑輕跳', color: '#f472b6' },
  { id: 2, animal: 'frog', action: 'jump', emoji: '🐸', desc: '青蛙超能大跳躍', color: '#4ade80' },
  { id: 3, animal: 'dog', action: 'run', emoji: '🐶', desc: '狗狗歡樂疾馳', color: '#fb923c' },
  { id: 4, animal: 'eagle', action: 'soar', emoji: '🦅', desc: '老鷹高空長嘯翱翔', color: '#facc15' },
  { id: 5, animal: 'duck', action: 'walk', emoji: '🦆', desc: '鴨子搖擺自信漫步', color: '#38bdf8' },
  { id: 6, animal: 'fish', action: 'swim', emoji: '🐟', desc: '熱帶魚敏捷潛游', color: '#67e8f9' },
  { id: 7, animal: 'iguana', action: 'climb', emoji: '🦎', desc: '鬃蜥攀藤飛簷走壁', color: '#a3e635' }
];

const SPRITES = {};
['owl','rabbit','frog','dog','eagle','duck','fish','iguana','default'].forEach(name => {
  const tex = new THREE.TextureLoader().load(`sprites/${name}.png`);
  tex.minFilter = THREE.LinearFilter;
  SPRITES[name] = tex;
});

// ==========================================
// 3. Three.js 2.5D/3D 渲染系統
// ==========================================
class WildSwitch3DEngine {
  constructor() {
    this.container = document.getElementById('webgl-container');
    this.scene = new THREE.Scene();
    
    // 糖果色系漸層背景 (Pastel Skybox)
    this.scene.background = new THREE.Color(0x93c5fd);
    this.scene.fog = new THREE.FogExp2(0x93c5fd, 0.015);

    // 透視相機 (Chase / Side-scroll 2.5D 最佳視角)
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, 18);
    this.cameraTarget = new THREE.Vector3(0, 2, 0);

    // 渲染器 (支援柔和陰影與高 DPI)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    this.setupLighting();

    this.worldGroup = new THREE.Group();
    this.scene.add(this.worldGroup);

    this.particles = [];
    this.shakeIntensity = 0;
    this.shakeDecay = 0.9;

    window.addEventListener('resize', () => this.onResize());
  }

  setupLighting() {
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xbbf7d0, 0.85);
    hemiLight.position.set(0, 50, 0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xfffbeb, 1.2);
    dirLight.position.set(20, 40, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 120;
    dirLight.shadow.camera.left = -30;
    dirLight.shadow.camera.right = 30;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -15;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    const pointLight = new THREE.PointLight(0xfef08a, 1.0, 30);
    pointLight.position.set(10, 8, 5);
    this.scene.add(pointLight);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  triggerScreenShake(intensity = 0.3) {
    this.shakeIntensity = intensity;
  }

  updateCamera(playerX, playerY) {
    const targetX = playerX + 3.5;
    const targetY = Math.max(2.8, playerY + 2.0);
    
    this.camera.position.x += (targetX - this.camera.position.x) * 0.08;
    this.camera.position.y += (targetY - this.camera.position.y) * 0.08;
    this.camera.position.z = 18;

    if (this.shakeIntensity > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
    }

    this.cameraTarget.set(this.camera.position.x, 2.2, 0);
    this.camera.lookAt(this.cameraTarget);
  }

  spawnBurst(x, y, z, colorHex = 0xfacc15, count = 35) {
    const geom = new THREE.DodecahedronGeometry(0.16, 0);
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness: 0.2,
        metalness: 0.8,
        emissive: colorHex,
        emissiveIntensity: 0.4
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x, y, z);
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      const vx = Math.cos(angle) * speed;
      const vy = (Math.random() * 0.7 + 0.5) * speed;
      const vz = (Math.random() - 0.5) * 4;

      this.scene.add(mesh);
      this.particles.push({ mesh, vx, vy, vz, rotSpeed: Math.random() * 10, life: 1.0 });
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 1.5;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.vy -= 18 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.rotation.x += p.rotSpeed * dt;
      p.mesh.rotation.y += p.rotSpeed * dt;
      const scale = p.life;
      p.mesh.scale.set(scale, scale, scale);
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// ==========================================
// 4. 遊戲核心狀態與邏輯控制器
// ==========================================
class WildSwitchGame {
  constructor() {
    this.engine = new WildSwitch3DEngine();
    this.storageKey = 'wild-switch-3d-v1';
    this.savedData = { runs: 0, seen: [], weak: {}, best: 0 };
    this.loadSave();

    this.mode = 'home';
    this.difficulty = 'read';
    this.route = [];
    this.roundIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.errors = 0;
    this.reviews = 0;

    this.player = {
      x: -12,
      y: 0,
      vy: 0,
      isGrounded: true,
      facing: 1,
      scaleX: 1,
      scaleY: 1,
      selectedAnimalId: -1,
      mesh: null,
      shadowMesh: null,
      auraMesh: null
    };

    this.phase = 'approach';
    this.currentChoices = [];
    this.stars = [];
    this.currentObstacle = null;
    this.gateX = 6.0;

    this.keys = new Set();
    this.initPlayer3D();
    this.bindEvents();
    this.setupUI();

    this.showHomeModal();

    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  loadSave() {
    try {
      const data = JSON.parse(localStorage.getItem(this.storageKey));
      if (data && typeof data === 'object') {
        this.savedData.runs = data.runs || 0;
        this.savedData.seen = Array.isArray(data.seen) ? data.seen : [];
        this.savedData.weak = data.weak || {};
        this.savedData.best = data.best || 0;
      }
    } catch(e) {}
  }

  saveGame() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.savedData));
    } catch(e) {}
  }

  initPlayer3D() {
    this.playerGroup = new THREE.Group();

    const shadowGeom = new THREE.PlaneGeometry(1.6, 0.8);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.player.shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    this.player.shadowMesh.rotation.x = -Math.PI / 2;
    this.player.shadowMesh.position.y = 0.05;
    this.engine.scene.add(this.player.shadowMesh);

    const spriteGeom = new THREE.PlaneGeometry(2.4, 2.4);
    this.playerMaterial = new THREE.MeshStandardMaterial({
      map: SPRITES['default'],
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.5,
      metalness: 0.1
    });
    this.player.mesh = new THREE.Mesh(spriteGeom, this.playerMaterial);
    this.player.mesh.castShadow = true;
    this.player.mesh.position.y = 1.2;
    this.playerGroup.add(this.player.mesh);

    const ringGeom = new THREE.RingGeometry(1.1, 1.4, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0
    });
    this.player.auraMesh = new THREE.Mesh(ringGeom, ringMat);
    this.player.auraMesh.rotation.x = Math.PI / 2;
    this.player.auraMesh.position.y = 0.1;
    this.playerGroup.add(this.player.auraMesh);

    this.engine.scene.add(this.playerGroup);
  }

  updatePlayerAppearance() {
    const spriteKey = this.player.selectedAnimalId >= 0
      ? ANIMALS[this.player.selectedAnimalId].animal
      : 'default';
    
    if (SPRITES[spriteKey]) {
      this.playerMaterial.map = SPRITES[spriteKey];
      this.playerMaterial.needsUpdate = true;
    }

    this.player.scaleX = 1.4;
    this.player.scaleY = 0.7;
    
    this.player.auraMesh.material.opacity = 0.9;
    this.player.auraMesh.scale.set(0.5, 0.5, 0.5);
    gsap.to(this.player.auraMesh.scale, { x: 2.2, y: 2.2, duration: 0.5, ease: 'power2.out' });
    gsap.to(this.player.auraMesh.material, { opacity: 0, duration: 0.5, ease: 'power2.out' });
  }

  buildEnvironment() {
    while (this.engine.worldGroup.children.length > 0) {
      const obj = this.engine.worldGroup.children[0];
      this.engine.worldGroup.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }

    const roadGeom = new THREE.BoxGeometry(70, 2.5, 8);
    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x4ade80,
      roughness: 0.7,
      metalness: 0.1
    });
    const road = new THREE.Mesh(roadGeom, roadMat);
    road.position.set(20, -1.25, 0);
    road.receiveShadow = true;
    this.engine.worldGroup.add(road);

    const dirtGeom = new THREE.BoxGeometry(70, 3.5, 7.8);
    const dirtMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.9
    });
    const dirt = new THREE.Mesh(dirtGeom, dirtMat);
    dirt.position.set(20, -4.25, 0);
    this.engine.worldGroup.add(dirt);

    for (let x = -15; x <= 55; x += 6) {
      if (Math.abs(x - this.gateX) < 4) continue;
      this.createLowPolyTree(x + (Math.random() - 0.5) * 2, -4.5);
    }

    this.createObstacleGate();
    this.createStars();
    this.createGoalArch(40);
  }

  createLowPolyTree(x, z) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    const trunkGeom = new THREE.CylinderGeometry(0.25, 0.4, 3, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.8 });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = 1.5;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    const leavesMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.6 });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 6), leavesMat);
    c1.position.y = 3.2;
    c1.castShadow = true;
    treeGroup.add(c1);

    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.2, 1.8, 6), leavesMat);
    c2.position.y = 4.3;
    c2.castShadow = true;
    treeGroup.add(c2);

    this.engine.worldGroup.add(treeGroup);
  }

  createObstacleGate() {
    const currentAction = this.targetAnimal().action;
    const gateGroup = new THREE.Group();
    gateGroup.position.set(this.gateX, 0, 0);

    if (currentAction === 'swim') {
      const waterGeom = new THREE.BoxGeometry(6.5, 1.8, 8.2);
      const waterMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        roughness: 0.1,
        metalness: 0.6,
        transparent: true,
        opacity: 0.85
      });
      const water = new THREE.Mesh(waterGeom, waterMat);
      water.position.set(0, -0.6, 0);
      gateGroup.add(water);

      for(let i=0; i<6; i++) {
        const foam = new THREE.Mesh(
          new THREE.SphereGeometry(0.3, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
        );
        foam.position.set((Math.random()-0.5)*5, 0.3, (Math.random()-0.5)*4);
        gateGroup.add(foam);
      }
    } else if (currentAction === 'climb') {
      const treeTrunk = new THREE.Mesh(
        new THREE.CylinderGeometry(1.2, 1.6, 12, 8),
        new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.8 })
      );
      treeTrunk.position.set(0, 5, 0);
      treeTrunk.castShadow = true;
      gateGroup.add(treeTrunk);

      const vine = new THREE.Mesh(
        new THREE.TorusGeometry(1.5, 0.2, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x65a30d })
      );
      vine.rotation.x = Math.PI / 3;
      vine.position.set(0, 4, 0);
      gateGroup.add(vine);
    } else if (['jump','hop'].includes(currentAction)) {
      for (let r = -2; r <= 2; r += 1.8) {
        const rock = new THREE.Mesh(
          new THREE.DodecahedronGeometry(1.3 + Math.random() * 0.4, 0),
          new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 })
        );
        rock.position.set(r, 0.9, (Math.random() - 0.5) * 2);
        rock.castShadow = true;
        gateGroup.add(rock);
      }
    } else if (['fly','soar'].includes(currentAction)) {
      for (let w = 0; w < 4; w++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(2.0, 0.15, 8, 24),
          new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.7 })
        );
        ring.rotation.y = Math.PI / 2;
        ring.position.set((w - 1.5) * 1.6, 2.8, 0);
        gateGroup.add(ring);
      }
    } else {
      const hurdle = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 1.2, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.4 })
      );
      hurdle.position.set(0, 0.6, 0);
      hurdle.castShadow = true;
      gateGroup.add(hurdle);
    }

    this.currentObstacle = gateGroup;
    this.engine.worldGroup.add(gateGroup);
  }

  createStars() {
    this.stars = [];
    const starGeom = new THREE.OctahedronGeometry(0.4, 0);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });

    const positions = [
      [-7, 1.5], [-4, 3.0], [-1, 2.0],
      [12, 2.2], [16, 3.4], [22, 1.8], [28, 2.5]
    ];

    positions.forEach(([x, y]) => {
      const mesh = new THREE.Mesh(starGeom, starMat);
      mesh.position.set(x, y, 0);
      mesh.castShadow = true;
      this.engine.worldGroup.add(mesh);
      this.stars.push({ mesh, x, y, collected: false });
    });
  }

  createGoalArch(x) {
    const archGroup = new THREE.Group();
    archGroup.position.set(x, 0, 0);

    const postMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.5, roughness: 0.3 });
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 12), postMat);
    p1.position.set(0, 3, -3);
    archGroup.add(p1);

    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 6, 12), postMat);
    p2.position.set(0, 3, 3);
    archGroup.add(p2);

    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 6.4), postMat);
    beam.position.set(0, 5.8, 0);
    archGroup.add(beam);

    const flagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), flagMat);
    flag.position.set(0, 5.4, 0);
    archGroup.add(flag);

    this.engine.worldGroup.add(archGroup);
  }

  targetAnimal() {
    const routeItem = this.route[this.roundIndex] || { id: 0 };
    return ANIMALS[routeItem.id];
  }

  startGame() {
    this.difficulty = document.getElementById('difficulty-select')?.value || 'read';
    this.savedData.runs++;
    this.saveGame();

    let ids = ANIMALS.map(a => a.id).sort(() => Math.random() - 0.5);
    ids.sort((a, b) => (this.savedData.weak[b] || 0) - (this.savedData.weak[a] || 0));

    this.route = ids.map(id => ({ id, retry: false }));
    this.roundIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.errors = 0;
    this.reviews = 0;
    this.mode = 'play';

    document.getElementById('modal-overlay').hidden = true;
    this.startSegment();
  }

  startSegment() {
    this.phase = 'approach';
    this.player.x = -13;
    this.player.y = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    this.player.selectedAnimalId = -1;
    this.player.facing = 1;

    document.getElementById('challenge-billboard').classList.add('hidden');
    document.getElementById('speed-lines').classList.remove('active');

    const targetId = this.targetAnimal().id;
    const others = ANIMALS.filter(a => a.id !== targetId).sort(() => Math.random() - 0.5).slice(0, 3);
    this.currentChoices = [targetId, ...others.map(o => o.id)].sort(() => Math.random() - 0.5);

    this.buildEnvironment();
    this.updatePlayerAppearance();
    this.renderDeckCards();
    this.updateHUD();

    this.showPrompt('向右奔跑探險！收集金星，準備突破地形難關！');
  }

  renderDeckCards() {
    const deck = document.getElementById('shape-deck');
    deck.innerHTML = '';
    const isListen = this.difficulty === 'listen';

    this.currentChoices.forEach((id, index) => {
      const a = ANIMALS[id];
      const isSelected = this.player.selectedAnimalId === id;
      
      const card = document.createElement('div');
      card.className = 'shape-card ' + (isSelected ? 'selected' : '');
      card.dataset.id = id;

      const title = isListen ? a.action.toUpperCase() : a.animal.toUpperCase();
      const sub = isListen ? a.animal : a.action;

      card.innerHTML = 
        '<span class="shape-card-key">' + (index + 1) + '</span>' +
        '<div class="shape-card-img-wrap">' +
          '<img src="V1_flashcards_images/V1_' + a.animal + '.webp" alt="' + a.animal + '" onerror="this.src=\'sprites/' + a.animal + '.png\'">' +
        '</div>' +
        '<div class="shape-card-title">' + title + '</div>' +
        '<div class="shape-card-sub">' + sub + '</div>';

      card.onclick = () => this.selectAnimal(id);
      deck.appendChild(card);
    });
  }

  selectAnimal(id) {
    if (this.mode !== 'play' || this.phase === 'power') return;
    this.player.selectedAnimalId = id;
    SFX.switchCard();
    GameAudio.playVoice(ANIMALS[id].action);
    
    this.renderDeckCards();
    this.updatePlayerAppearance();

    const chosen = ANIMALS[id];
    this.showPrompt(chosen.emoji + ' ' + chosen.animal.toUpperCase() + ' 準備就緒！前往地形前按 E 施展技能！');
  }

  triggerPowerSkill() {
    if (this.mode !== 'play' || this.phase === 'power') return;

    if (this.phase !== 'gate') {
      this.showPrompt('⚠️ 請先奔跑到前方地形障礙物前！');
      SFX.wrong();
      return;
    }

    if (this.player.selectedAnimalId < 0) {
      this.showPrompt('⚠️ 請先在下方工具箱選擇動物夥伴！');
      SFX.wrong();
      return;
    }

    const target = this.targetAnimal();
    if (this.player.selectedAnimalId !== target.id) {
      this.errors++;
      this.combo = 0;
      this.savedData.weak[target.id] = (this.savedData.weak[target.id] || 0) + 1;
      this.saveGame();

      SFX.wrong();
      this.engine.triggerScreenShake(0.35);

      this.player.scaleX = 0.6;
      this.player.scaleY = 1.4;
      this.player.x -= 2.0;

      this.showToast('Oops! 試試能 "' + target.action.toUpperCase() + '" 的動物！', 'wrong');
      GameAudio.playVoice(target.action);
      this.updateHUD();
      return;
    }

    this.phase = 'power';
    this.combo++;
    this.score += 100 + this.combo * 25;
    this.savedData.best = Math.max(this.savedData.best, this.score);
    if (!this.savedData.seen.includes(target.id)) {
      this.savedData.seen.push(target.id);
    }
    if (this.savedData.weak[target.id]) {
      this.savedData.weak[target.id] = Math.max(0, this.savedData.weak[target.id] - 1);
    }
    this.saveGame();

    SFX.powerSuccess();
    this.engine.triggerScreenShake(0.25);
    document.getElementById('speed-lines').classList.add('active');

    GameAudio.playVoice(target.action);

    document.getElementById('challenge-billboard').classList.add('hidden');
    this.showToast('🎉 EXCELLENT! A ' + target.animal + ' can ' + target.action + '!', 'correct');

    this.engine.spawnBurst(this.player.x + 2, 2.5, 0, 0xfacc15, 50);

    this.playActionAnimation(target.action);
    this.updateHUD();
  }

  playActionAnimation(action) {
    const startX = this.player.x;
    const endX = this.gateX + 6.0;

    if (action === 'swim') {
      gsap.to(this.player, {
        x: endX,
        duration: 1.8,
        ease: 'power1.inOut',
        onUpdate: () => {
          this.player.y = Math.sin(performance.now() * 0.01) * 0.4 - 0.2;
          this.player.scaleX = 1.2;
          this.player.scaleY = 0.8;
        },
        onComplete: () => this.finishPowerPass()
      });
    } else if (action === 'climb') {
      const tl = gsap.timeline({ onComplete: () => this.finishPowerPass() });
      tl.to(this.player, { x: this.gateX - 0.5, y: 5.5, duration: 0.9, ease: 'power2.out' });
      tl.to(this.player, { x: endX, y: 0, duration: 0.9, ease: 'bounce.out' });
    } else if (['fly','soar'].includes(action)) {
      const tl = gsap.timeline({ onComplete: () => this.finishPowerPass() });
      tl.to(this.player, { x: this.gateX + 1, y: 4.8, duration: 0.8, ease: 'power1.inOut' });
      tl.to(this.player, { x: endX, y: 0, duration: 0.8, ease: 'power1.in' });
    } else if (['jump','hop'].includes(action)) {
      gsap.to(this.player, {
        x: endX,
        duration: 1.2,
        ease: 'power1.inOut',
        onUpdate: () => {
          const progress = (this.player.x - startX) / (endX - startX);
          this.player.y = Math.sin(progress * Math.PI) * 4.5;
        },
        onComplete: () => this.finishPowerPass()
      });
    } else {
      gsap.to(this.player, {
        x: endX,
        y: 0,
        duration: 1.0,
        ease: 'power2.inOut',
        onComplete: () => this.finishPowerPass()
      });
    }
  }

  finishPowerPass() {
    this.phase = 'exit';
    this.player.y = 0;
    this.player.vy = 0;
    this.player.isGrounded = true;
    document.getElementById('speed-lines').classList.remove('active');
    this.showPrompt('太棒了！向前奔向旗幟終點 →');
  }

  updatePhysics(dt) {
    if (this.mode !== 'play') return;

    if (this.phase === 'power') {
      this.syncPlayerMesh();
      return;
    }

    let moveDir = 0;
    if (this.keys.has('ArrowRight') || this.keys.has('d') || this.keys.has('D')) moveDir += 1;
    if (this.keys.has('ArrowLeft') || this.keys.has('a') || this.keys.has('A')) moveDir -= 1;

    if (moveDir !== 0) {
      this.player.facing = moveDir;
      this.player.x += moveDir * 11 * dt;
      this.player.mesh.rotation.z = -moveDir * 0.12;
      this.player.scaleY = 1.0 + Math.sin(performance.now() * 0.015) * 0.08;
    } else {
      this.player.mesh.rotation.z = 0;
      this.player.scaleY += (1.0 - this.player.scaleY) * 0.15;
    }

    this.player.scaleX += (1.0 - this.player.scaleX) * 0.15;

    if (!this.player.isGrounded) {
      this.player.vy -= 34 * dt;
      this.player.y += this.player.vy * dt;
      if (this.player.y <= 0) {
        this.player.y = 0;
        this.player.vy = 0;
        this.player.isGrounded = true;
        this.player.scaleX = 1.35;
        this.player.scaleY = 0.65;
        SFX.land();
      }
    }

    if (['approach', 'gate'].includes(this.phase) && this.player.x >= this.gateX - 2.8) {
      this.player.x = this.gateX - 2.8;
      if (this.phase === 'approach') {
        this.phase = 'gate';
        this.triggerGateArrival();
      }
    }

    if (this.phase === 'exit' && this.player.x >= 39.5) {
      this.roundIndex++;
      if (this.roundIndex >= this.route.length) {
        this.finishGame();
      } else {
        this.startSegment();
      }
    }

    this.stars.forEach(star => {
      if (!star.collected && Math.hypot(this.player.x - star.x, (this.player.y + 1.0) - star.y) < 1.4) {
        star.collected = true;
        this.score += 20;
        SFX.coin();
        this.engine.spawnBurst(star.x, star.y, 0, 0xfbbf24, 18);
        gsap.to(star.mesh.scale, { x: 0, y: 0, z: 0, duration: 0.2 });
        this.updateHUD();
      }
      star.mesh.rotation.y += 2.5 * dt;
      star.mesh.rotation.x += 1.2 * dt;
    });

    this.syncPlayerMesh();
  }

  triggerGateArrival() {
    const target = this.targetAnimal();
    SFX.switchCard();
    
    const billboard = document.getElementById('challenge-billboard');
    const title = document.getElementById('billboard-title');
    const sub = document.getElementById('billboard-sub');
    
    billboard.classList.remove('hidden');
    if (this.difficulty === 'listen') {
      title.textContent = '🎧 聽音變身關卡！';
      sub.textContent = '仔細聽發音，選擇能完成此動作的動物，按 E 突破！';
    } else {
      title.textContent = 'NEED ACTION: "' + target.action.toUpperCase() + '"!';
      sub.textContent = '請選擇擁有「' + target.action + '」能力的動物夥伴，再按 E 施展技能！';
    }

    GameAudio.playVoice(target.action);
    this.showPrompt('抵達險峻地形！選動物技能，再按 E 變身！');
  }

  jump() {
    if (this.mode !== 'play' || this.phase === 'power') return;
    if (this.player.isGrounded) {
      this.player.vy = 13.5;
      this.player.isGrounded = false;
      this.player.scaleX = 0.75;
      this.player.scaleY = 1.35;
      SFX.jump();
    }
  }

  syncPlayerMesh() {
    this.playerGroup.position.set(this.player.x, this.player.y, 0);
    this.player.mesh.scale.set(this.player.scaleX * this.player.facing, this.player.scaleY, 1);
    
    this.player.shadowMesh.position.x = this.player.x;
    const shadowScale = Math.max(0.3, 1.0 - this.player.y / 6.0);
    this.player.shadowMesh.scale.set(shadowScale, shadowScale, shadowScale);
  }

  setupUI() {
    document.getElementById('btn-left').onpointerdown = () => this.keys.add('ArrowLeft');
    document.getElementById('btn-left').onpointerup = () => this.keys.delete('ArrowLeft');
    document.getElementById('btn-right').onpointerdown = () => this.keys.add('ArrowRight');
    document.getElementById('btn-right').onpointerup = () => this.keys.delete('ArrowRight');

    document.getElementById('btn-jump').onclick = () => this.jump();
    document.getElementById('btn-power').onclick = () => this.triggerPowerSkill();

    document.getElementById('btn-replay-audio').onclick = () => {
      if (this.mode === 'play') GameAudio.playVoice(this.targetAnimal().action);
    };
    document.getElementById('btn-billboard-audio').onclick = () => {
      if (this.mode === 'play') GameAudio.playVoice(this.targetAnimal().action);
    };

    document.getElementById('btn-mute').onclick = () => {
      GameAudio.isMuted = !GameAudio.isMuted;
      document.getElementById('btn-mute').textContent = GameAudio.isMuted ? '🔇' : '♫';
    };

    document.getElementById('btn-pause').onclick = () => this.togglePause();
  }

  bindEvents() {
    window.addEventListener('keydown', (e) => {
      if (['ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      if (e.repeat) return;

      this.keys.add(e.key);
      if (e.key === ' ') this.jump();
      if (e.key.toLowerCase() === 'e') this.triggerPowerSkill();
      if (e.key.toLowerCase() === 'p' || e.key === 'Escape') this.togglePause();

      if (['1','2','3','4'].includes(e.key)) {
        const idx = Number(e.key) - 1;
        if (this.currentChoices[idx] !== undefined) {
          this.selectAnimal(this.currentChoices[idx]);
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  showPrompt(text) {
    document.getElementById('hud-prompt').textContent = text;
  }

  showToast(text, type = 'correct') {
    const toast = document.getElementById('feedback-toast');
    toast.textContent = text;
    toast.className = 'feedback-toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 2200);
  }

  updateHUD() {
    document.getElementById('hud-station').textContent = '第 ' + Math.min(this.roundIndex + 1, this.route.length) + ' / ' + this.route.length + ' 站';
    document.getElementById('hud-score').textContent = this.score;
    document.getElementById('hud-combo').textContent = this.combo + 'x';
  }

  togglePause() {
    if (this.mode === 'play') {
      this.mode = 'paused';
      this.keys.clear();
      GameAudio.stopVoice();
      this.showModal(
        '<span class="modal-badge">GAME PAUSED</span>' +
        '<h2 class="modal-title">冒險營地休息中</h2>' +
        '<p class="modal-desc">深呼吸放鬆一下，隨時準備好再次出發！</p>' +
        '<button class="btn-start-game" id="btn-resume">繼續冒險 →</button>'
      );
      document.getElementById('btn-resume').onclick = () => this.togglePause();
    } else if (this.mode === 'paused') {
      this.mode = 'play';
      document.getElementById('modal-overlay').hidden = true;
    }
  }

  showHomeModal() {
    this.mode = 'home';
    this.keys.clear();
    GameAudio.stopVoice();
    document.getElementById('modal-overlay').hidden = false;
    document.getElementById('btn-modal-action').onclick = () => this.startGame();
  }

  finishGame() {
    this.mode = 'done';
    this.keys.clear();
    this.savedData.best = Math.max(this.savedData.best, this.score);
    this.saveGame();

    if (typeof confetti === 'function') {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    this.showModal(
      '<span class="modal-badge">ADVENTURE COMPLETE!</span>' +
      '<h2 class="modal-title">🎉 你成功點亮了整座野生樂園！</h2>' +
      '<p class="modal-desc">' +
        '總得分：<b>⭐ ' + this.score + '</b> 分<br>' +
        '最高連擊：<b>🔥 ' + this.combo + '</b> 次 · 歷史最佳：<b>' + this.savedData.best + '</b> 分<br>' +
        '掌握動物技能圖鑑：<b>' + this.savedData.seen.length + ' / 8</b>' +
      '</p>' +
      '<button class="btn-start-game" id="btn-again">再次挑戰 ↻</button>'
    );
    document.getElementById('btn-again').onclick = () => this.startGame();
  }

  showModal(htmlContent) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = htmlContent;
    overlay.hidden = false;
  }

  loop(timestamp) {
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.updatePhysics(dt);
    this.engine.updateParticles(dt);
    this.engine.updateCamera(this.player.x, this.player.y);
    this.engine.render();

    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.game = new WildSwitchGame();
});




