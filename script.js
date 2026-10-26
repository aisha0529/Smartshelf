import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =====================================================================
//  SMARTSHELF - Multi-Floor Library Map (Aras G, Aras 1, Aras 2)
// =====================================================================

const container = document.getElementById('library3D');
const loadingMessage = document.getElementById('loadingMessage');

function hideLoading() {
    if (loadingMessage) {
        loadingMessage.style.display = 'none';
    }
}

function showLoading(msg = 'Loading...') {
    if (loadingMessage) {
        loadingMessage.textContent = msg;
        loadingMessage.style.display = 'flex';
    }
}

const ROOM_W = 17.75;
const ROOM_D = 14.1;
const HALF_W = ROOM_W / 2;
const HALF_D = ROOM_D / 2;
const WALL_H = 2.8;
const WALL_T = 0.2;
const DOOR_H = 2.1;
const NORTH_EXT = 1.2; // tambahan ruang ke utara (Aras G & 1) untuk susunan rak baru

// ---------- Asas Scene & Render ----------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f0f8);

// Group khas untuk dinding & perabot Aras G (disembunyikan di Aras 1 & 2)
const groundGroup = new THREE.Group();
scene.add(groundGroup);
let targetGroup = groundGroup; // semua objek statik Aras G masuk sini

const camera = new THREE.PerspectiveCamera(
    45,
    (container ? container.clientWidth : 800) / (container ? container.clientHeight : 500),
    0.1,
    1000
);

const DEFAULT_CAM = new THREE.Vector3(0, 17, 16);
const DEFAULT_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.copy(DEFAULT_CAM);

const renderer = new THREE.WebGLRenderer({ antialias: true });
if (container) {
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
}

// Kawalan Putar & Zum
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.copy(DEFAULT_TARGET);
controls.maxPolarAngle = Math.PI / 2.05;
controls.minDistance = 5;
controls.maxDistance = 90;

// Pencahayaan
scene.add(new THREE.HemisphereLight(0xffffff, 0xb5a9c9, 2));

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(8, 18, 10);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
light.shadow.camera.left = -40;
light.shadow.camera.right = 40;
light.shadow.camera.top = 40;
light.shadow.camera.bottom = -40;
light.shadow.camera.far = 120;
scene.add(light);

// ---------- Fungsi Pembantu ----------
function addBox(w, h, d, x, y, z, color, options = {}) {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        new THREE.MeshStandardMaterial({
            color,
            roughness: 0.85,
            transparent: options.opacity !== undefined,
            opacity: options.opacity ?? 1,
            depthWrite: options.opacity === undefined
        })
    );
    mesh.position.set(x, y, z);
    mesh.rotation.y = options.rotY || 0;
    mesh.castShadow = !options.noShadow;
    mesh.receiveShadow = true;
    targetGroup.add(mesh);
    return mesh;
}

function addCylinder(radius, height, x, y, z, color) {
    const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius, height, 24),
        new THREE.MeshStandardMaterial({ color, roughness: 0.8 })
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    targetGroup.add(mesh);
    return mesh;
}

function createLabelSprite(text, scaleX = 1.2, scaleY = 0.45, bg = '#24594f', fontSize = 54) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) })
    );
    sprite.scale.set(scaleX, scaleY, 1);
    targetGroup.add(sprite);
    return sprite;
}

// ---------- Lantai & Dinding Utama ----------
const floorMesh = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_W, 0.2, ROOM_D),
    new THREE.MeshStandardMaterial({ color: 0xcdb292, roughness: 0.9 })
);
floorMesh.position.y = -0.1;
floorMesh.receiveShadow = true;
scene.add(floorMesh);

const WALL_COLOR = 0xd8d0e8;
const DOOR_COLOR = 0x8b5a3c;

function buildWall(axis, fixed, start, end, gaps = []) {
    const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
    const segments = [];
    let cursor = start;

    sorted.forEach(([g0, g1]) => {
        if (g0 > cursor) segments.push([cursor, g0]);
        cursor = g1;
    });
    if (cursor < end) segments.push([cursor, end]);

    segments.forEach(([a, b]) => {
        const len = b - a;
        const mid = (a + b) / 2;
        if (axis === 'x') {
            addBox(len, WALL_H, WALL_T, mid, WALL_H / 2, fixed, WALL_COLOR, { opacity: 0.35, noShadow: true });
        } else {
            addBox(WALL_T, WALL_H, len, fixed, WALL_H / 2, mid, WALL_COLOR, { opacity: 0.35, noShadow: true });
        }
    });

    sorted.forEach(([g0, g1]) => {
        const len = g1 - g0;
        const mid = (g0 + g1) / 2;
        const top = WALL_H - DOOR_H;

        if (axis === 'x') {
            addBox(len, top, WALL_T, mid, DOOR_H + top / 2, fixed, DOOR_COLOR);
            createLabelSprite('DOOR', 1.0, 0.375, '#8b5a3c').position.set(mid, 3.2, fixed);
        } else {
            addBox(WALL_T, top, len, fixed, DOOR_H + top / 2, mid, DOOR_COLOR);
            createLabelSprite('DOOR', 1.0, 0.375, '#8b5a3c').position.set(fixed, 3.2, mid);
        }
    });
}

buildWall('x', -(HALF_D + WALL_T / 2) - NORTH_EXT, -(HALF_W + WALL_T), HALF_W + WALL_T);
buildWall('z', HALF_W + WALL_T / 2, -HALF_D - NORTH_EXT, HALF_D);
buildWall('z', -(HALF_W + WALL_T / 2), -HALF_D - NORTH_EXT, HALF_D, [[-0.67, 0.30], [3.87, 4.84]]);
buildWall('x', HALF_D + WALL_T / 2, -(HALF_W + WALL_T), HALF_W + WALL_T, [[-2.60, -0.73]]);

// ---------- Perabot Utama (Kekal di Aras G) ----------
function createSofa(cx, cz, length, angle, depth = 1.0) {
    const sofa = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xb9b2ad, roughness: 0.9 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(length, 0.45, depth - 0.25), mat);
    seat.position.set(0, 0.225, 0.125);

    const back = new THREE.Mesh(new THREE.BoxGeometry(length, 0.9, 0.25), mat);
    back.position.set(0, 0.45, -depth / 2 + 0.125);

    [seat, back].forEach(part => {
        part.castShadow = true;
        part.receiveShadow = true;
        sofa.add(part);
    });

    sofa.position.set(cx, 0, cz);
    sofa.rotation.y = angle;
    targetGroup.add(sofa);
}

createSofa(-2.35, -1.08, 6.39, 0, 1.02);
createSofa(-6.07, 1.46, 4.29, Math.PI / 2, 1.0);
createSofa(0.6, 0.65, 2.19, -Math.PI / 2, 0.8); // dianjak supaya ada lorong ke book drop

function createRoundTable(x, z) {
    addCylinder(0.5, 0.06, x, 0.72, z, 0xc98a3d);
    addCylinder(0.06, 0.7, x, 0.35, z, 0x6b4a2b);
    for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        addCylinder(0.2, 0.45, x + Math.cos(a) * 0.72, 0.225, z + Math.sin(a) * 0.72, 0x3b3b3b);
    }
}

createRoundTable(-3.77, -4.83);
createRoundTable(-1.66, -5.07);
createRoundTable(-1.08, -3.66);
createRoundTable(-2.98, -2.50);

addBox(0.7, 0.95, 3.6, -8.15, 0.475, -4.40, 0xf2ead8);
[-5.59, -4.42, -3.17].forEach(z => {
    addCylinder(0.22, 0.45, -7.56, 0.225, z, 0xe8dcd0);
    addBox(0.28, 0.02, 0.2, -8.15, 0.96, z, 0x2b2b35);
});

addBox(0.73, 0.8, 1.58, 2.37, 0.4, 2.53, 0xf1dfa8);
[[-0.15, -0.45, 3], [0.10, 0.0, 4], [-0.10, 0.45, 2]].forEach(([dx, dz, count]) => {
    for (let i = 0; i < count; i++) {
        const color = [0x8055a5, 0xf0a080, 0x779e91, 0xe5c66b, 0x7189b8][(i + count) % 5];
        addBox(0.3, 0.05, 0.22, 2.37 + dx, 0.825 + i * 0.05, 2.53 + dz, color);
    }
});
createLabelSprite('BOOK DROP', 1.5, 0.5625, '#2a9d8f', 38).position.set(2.37, 2.1, 2.53);

addBox(1.55, 1.0, 0.96, 1.33, 0.5, 4.85, 0xe9e7e4);
addBox(0.79, 1.0, 1.08, 0.95, 0.5, 5.87, 0xe9e7e4);
addCylinder(0.25, 0.5, 1.78, 0.25, 6.03, 0x1a1a1a);
addBox(1.3, 0.75, 0.75, 3.15, 0.375, 6.67, 0x2a1c1c);

targetGroup = scene; // selepas ini objek lain tak masuk groundGroup

// ---------- Data Multi-Floor ----------
const categoryNames = {
    '000': 'General Knowledge',
    '100': 'Philosophy',
    '200': 'Religion',
    '300': 'Social Sciences',
    '400': 'Language',
    '500': 'Science',
    '600': 'Technology',
    '700': 'Arts & Recreation',
    '800': 'Literature',
    '900': 'Geography & History'
};

// Tukar pixel imej 2D -> meter (27.7 px = 1 m, pusat bangunan = 0,0)
const P = (px, py) => [(px - 970) / 27.7, (py - 90) / 27.7 - 18];

const rakKiri = (num, py) => {
    const [x, z] = P(613, py);
    return { number: num, x, z, length: 4.9, rotation: 0 };
};
const rakTengah = (px, py, rot) => {
    const [x, z] = P(px, py);
    return { number: null, decor: true, x, z, length: 2.3, rotation: rot };
};
const rakBawah = px => {
    const [x, z] = P(px, 950);
    return { number: null, decor: true, x, z, length: 7.9, rotation: Math.PI / 2 };
};


// Meja + 4 kerusi (2 di setiap sisi panjang meja)
function createTableWithChairs(x, z, tableColor = 0xd9a15f, chairColor = 0x3b3b3b, rotY = 0) {
    const g = new THREE.Group();
    const tableMat = new THREE.MeshStandardMaterial({ color: tableColor, roughness: 0.8 });
    const chairMat = new THREE.MeshStandardMaterial({ color: chairColor, roughness: 0.85 });

    const add = (w, h, d, px, py, pz, mat) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(px, py, pz);
        m.castShadow = true;
        m.receiveShadow = true;
        g.add(m);
    };

    // Meja
    add(1.1, 0.06, 0.7, 0, 0.72, 0, tableMat);
    [[-0.5, -0.3], [0.5, -0.3], [-0.5, 0.3], [0.5, 0.3]].forEach(([lx, lz]) => {
        add(0.06, 0.7, 0.06, lx, 0.35, lz, tableMat);
    });

    // 4 kerusi: 2 di sisi depan (+z), 2 di sisi belakang (-z)
    [[-0.28, 1], [0.28, 1], [-0.28, -1], [0.28, -1]].forEach(([cx, side]) => {
        const cz = side * 0.6;
        add(0.4, 0.05, 0.4, cx, 0.45, cz, chairMat);                 // tempat duduk
        add(0.4, 0.4, 0.05, cx, 0.68, cz + side * 0.19, chairMat);   // penyandar (jauh dari meja)
        add(0.08, 0.43, 0.08, cx, 0.215, cz, chairMat);              // kaki
    });

    g.position.set(x, 0, z);
    g.rotation.y = rotY;
    targetGroup.add(g);
    return g;
}


// ---------- Aras 1: tukar pixel imej 2D -> meter (14.4 px = 1 m, pusat bangunan = 0,0) ----------
const X1 = px => (px - 430) / 14.4;
const Z1 = py => (py - 254) / 14.4;
const shelfV = (num, px, py, len, label) => ({ number: num, label, x: X1(px), z: Z1(py), length: len, rotation: Math.PI / 2 });
const decorV = (px, py, len) => ({ number: null, decor: true, x: X1(px), z: Z1(py), length: len, rotation: Math.PI / 2 });
const decorH = (px, py, len) => ({ number: null, decor: true, x: X1(px), z: Z1(py), length: len, rotation: 0 });

// Kod permulaan (3 huruf pengarang) bagi buku PERTAMA setiap rak Novel, dari sebelah 900 ke sebelah sofa.
// !!! GANTI dengan kod sebenar di perpustakaan awak !!!
const HALL_H = 0.4;   // dewan kiri lebih tinggi 0.4 m daripada kawasan utama (ada anak tangga & lereng)
const NOVEL_STARTS = ['AAA', 'DAN', 'HRF', 'MAR', 'SIT'];

const floorsData = {
    'G': {
        name: 'Aras G - Perpustakaan Kanak-Kanak',
        floorColor: 0xcdb292,
        shelves: [
            // Selatan (dekat pintu) -> utara. Rak dua muka: depan = menghadap selatan, belakang = menghadap utara
            { number: '000', back: '100', doubleSided: true, x: 5.79, z: 1.30,  length: 6.17, rotation: 0 },
            { number: '200', x: 5.79, z: 0.00,  length: 6.17, rotation: 0 },
            { number: '300', x: 5.79, z: -1.10, length: 6.17, rotation: 0 },
            { number: '400', x: 5.79, z: -2.20, length: 6.17, rotation: 0 },
            { number: '500', x: 5.79, z: -3.30, length: 6.17, rotation: 0 },
            { number: '600', x: 5.79, z: -4.40, length: 6.17, rotation: 0 },
            { number: '700', back: '800', doubleSided: true, x: 5.79, z: -5.70, length: 6.17, rotation: 0 },
            { number: '800', back: '900', doubleSided: true, x: 5.79, z: -7.20, length: 6.17, rotation: 0 },
            // 3 rak 800 menegak (dipendekkan 0.6 m di hujung utara untuk beri ruang kepada rak 000)
            { number: '800', x: 4.89, z: 4.70, length: 4.11, rotation: Math.PI / 2 },
            { number: '800', x: 6.25, z: 4.70, length: 4.11, rotation: Math.PI / 2 },
            { number: '800', x: 7.64, z: 4.70, length: 4.11, rotation: Math.PI / 2 }
        ]
    },
    '1': {
        name: 'Aras 1 - Perpustakaan Dewasa',
        floorColor: 0xe3dfd6,
        room: { w: 48.6, d: 33.8, z: 0 },
        view: { cam: new THREE.Vector3(0, 62, 46), target: new THREE.Vector3(0, 0, 3) },
        nav: {
            door: { x: 1.95, z: Z1(497) },
            entry: { x: 1.95, z: Z1(497) - 0.9 },
            bounds: { x0: -24.2, x1: 24.2, z0: -16.8, z1: 16.8 }
        },
        reminder: true,                       // papar peringatan susun ikut call number
        novel: { starts: NOVEL_STARTS },      // carian Novel ikut kod 3 huruf
        shelves: [
            // Blok kiri atas (menegak): 800, 800, 700, 900
            shelfV('800', 113, 371, 5.6), shelfV('800', 135, 371, 5.6),
            shelfV('700', 153, 371, 5.6), shelfV('900', 173, 371, 5.6),

            // Novel 1 (sebelah 900) -> Novel 5 (sebelah sofa)
            ...[190, 208, 226, 244, 262].map((px, i) => shelfV('NOVEL' + (i + 1), px, 360, 4.4, 'N' + (i + 1))),

            // Blok kiri bawah: 600, 600, 500  |  400, 300, 200, 100, 000
            shelfV('600', 115, 457, 4.1), shelfV('600', 132, 457, 4.1), shelfV('500', 148, 457, 4.1),
            shelfV('400', 224, 457, 4.1), shelfV('300', 242, 457, 4.1),
            shelfV('200', 260, 457, 4.1), shelfV('100', 278, 457, 4.1), shelfV('000', 296, 457, 4.1),

            // Rak "bookshelves" atas (hiasan, kategori belum diketahui)
            decorV(510, 52, 4.6), decorV(533, 52, 4.6), decorV(557, 52, 4.6),

            // Rak "bookshelves" kanan (hiasan)
            ...[82, 96, 110, 124, 138, 152, 166, 180, 194, 208].map(py => decorH(735, py, 4.6))
        ].map(sh => (sh.x < X1(360) ? { ...sh, y: HALL_H } : sh)), // rak di dewan kiri berdiri atas lantai tinggi
        build() {
            // ---- Dinding luar ----
            buildWall('x', Z1(10), X1(78), X1(782));
            buildWall('x', Z1(497), X1(78), X1(782), [[0.98, 2.92]]); // pintu utama (bawah, sebelah kiri kaunter) - lebar 1.94 m
            buildWall('z', X1(80), Z1(10), Z1(497));
            buildWall('z', X1(780), Z1(10), Z1(497));

            // ---- Bilik perbincangan (kiri atas) ----
            buildWall('z', X1(163), Z1(10), Z1(232));
            buildWall('z', X1(253), Z1(10), Z1(225));
            buildWall('z', X1(328), Z1(10), Z1(255));
            buildWall('z', X1(420), Z1(10), Z1(255), [[Z1(92), Z1(118)]]);
            buildWall('x', Z1(232), X1(80), X1(163), [[X1(100), X1(140)]]);
            buildWall('x', Z1(160), X1(163), X1(253), [[X1(190), X1(225)]]);
            buildWall('x', Z1(225), X1(253), X1(328), [[X1(275), X1(305)]]);
            buildWall('x', Z1(255), X1(328), X1(420));

            // ---- Dinding sebelah anak tangga (sambungan ke dinding bawah) ----
            buildWall('z', X1(371), Z1(418), Z1(497));

            // ---- Bilik bacaan (kanan bawah) ----
            buildWall('z', X1(583), Z1(290), Z1(497), [[12.03, 13.53]]); // pintu bilik bacaan - lebar 1.5 m
            buildWall('x', Z1(290), X1(583), X1(780));

            // ---- Lantai khas ----

            // ---- Lantai dewan kiri dinaikkan (kerana ada anak tangga) ----
            const hx0 = X1(82), hx1 = X1(360), hz0 = Z1(232), hz1 = Z1(497);
            const slab = addBox(hx1 - hx0, HALL_H, hz1 - hz0, (hx0 + hx1) / 2, HALL_H / 2, (hz0 + hz1) / 2, 0xe9e5dc, { noShadow: true });
            slab.userData.noNav = true;
            const hallGroup = new THREE.Group();   // perabot dewan kiri duduk atas lantai tinggi
            hallGroup.position.y = HALL_H;
            activeFloorGroup.add(hallGroup);

            // ---- Anak tangga: 3 anak tangga panjang, makin tinggi ke barat (ke dewan) ----
            const stairEast = X1(383), stairW = X1(383) - X1(360);
            const stairZ0 = Z1(279), stairZ1 = Z1(406);
            const stepW = stairW / 3;
            for (let k = 0; k < 3; k++) {
                const h = (HALL_H / 4) * (k + 1);
                const step = addBox(stepW, h, stairZ1 - stairZ0, stairEast - stepW * (k + 0.5), h / 2,
                                    (stairZ0 + stairZ1) / 2, 0xa8a8a8, { noShadow: true });
                step.userData.noNav = true;
            }
            createLabelSprite('ANAK TANGGA', 2.2, 0.82, '#555555', 28).position.set(X1(371.5), 1.6, Z1(345));

            // ---- Lereng: baji condong naik ke barat, bersambung dengan lantai dewan ----
            const rampLen = X1(403) - X1(357);
            const ramp = addBox(rampLen, 0.08, Z1(279) - Z1(246), X1(380), HALL_H / 2 - 0.04, Z1(262.5), 0xb8b8b8, { noShadow: true });
            ramp.rotation.z = -Math.atan(HALL_H / rampLen);
            ramp.userData.noNav = true;
            createLabelSprite('LERENG', 1.6, 0.6, '#555555', 34).position.set(X1(380), 1.4, Z1(262.5));
            addBox(13.7, 0.02, 14.4, X1(681.5), 0.011, Z1(393.5), 0xf4f1ea, { noShadow: true });   // bilik bacaan

            // ---- Label bilik ----
            [['BILIK PERBINCANGAN', 208, 85], ['BILIK PERBINCANGAN', 290, 115], ['BILIK PERBINCANGAN', 375, 130]]
                .forEach(([t, px, py]) => {
                    createLabelSprite(t, 3.2, 1.2, '#5b4b8a', 20).position.set(X1(px), 3.4, Z1(py));
                });
            createLabelSprite('BILIK BACAAN', 2.6, 0.98, '#5b4b8a', 28).position.set(X1(693), 3.0, Z1(320));

            // ---- Kaunter ----
            addBox(3.62, 0.9, 0.8, X1(526.3), 0.45, Z1(475.6), 0xd9cdb8);      // bahagian batu
            addBox(1.43, 0.9, 0.8, X1(562.6), 0.45, Z1(475.6), 0x6b4a2b);      // bahagian kayu (hujung kanan)
            [518.7, 536.5, 554].forEach(px => addCylinder(0.22, 0.55, X1(px), 0.275, Z1(482), 0x6b4a2b)); // bangku
            createLabelSprite('COUNTER', 1.8, 0.65, '#24594f', 40).position.set(X1(536.5), 2.0, Z1(475.6));

            // ---- Set sofa + meja kopi ----
            const sofaRing = (px, py, dx, dy, o = {}) => {
                const len = o.len || 2.4, depth = o.depth || 0.9, tw = o.tw || 1.4, td = o.td || 1.0;
                addBox(tw, 0.45, td, X1(px), 0.225, Z1(py), 0x2a1c1c);
                createSofa(X1(px), Z1(py - dy), len, 0, depth);
                createSofa(X1(px), Z1(py + dy), len, Math.PI, depth);
                createSofa(X1(px - dx), Z1(py), len, Math.PI / 2, depth);
                createSofa(X1(px + dx), Z1(py), len, -Math.PI / 2, depth);
            };
            targetGroup = hallGroup;
            sofaRing(312, 362, 24, 18);   // sebelah rak Novel (atas lantai dewan)
            targetGroup = activeFloorGroup;
            sofaRing(459.5, 419, 24.5, 25.4, { len: 2.15, depth: 0.8, tw: 0.8, td: 1.3 });   // tengah (ikut peta 2D)
            sofaRing(693, 398, 28, 30);   // bilik bacaan
            // 2 sofa + meja hitam rapat ke dinding kiri-bawah (ikut peta 2D)
            const nx = X1(371) + 0.1 + 0.02 + 1.07;                // tepi sofa rapat ke dinding
            const nzBottom = Z1(497) - 0.1 - 0.21 - 0.415;         // 0.21 m dari dinding bawah
            createSofa(nx, nzBottom - 2.28, 2.14, 0, 0.83);        // sofa atas (belakang ke utara)
            createSofa(nx, nzBottom, 2.14, Math.PI, 0.83);         // sofa bawah (belakang ke selatan)
            addBox(1.3, 0.45, 0.8, nx, 0.225, nzBottom - 1.14, 0x2a1c1c); // meja hitam di tengah

            // ---- Meja + 4 kerusi ----
            targetGroup = hallGroup;
            [[240, 268], [274, 268], [312, 268]].forEach(([px, py]) => {
                createTableWithChairs(X1(px), Z1(py), 0xd9a15f, 0x3b3b3b);
            });
            targetGroup = activeFloorGroup;
            [460, 515].forEach(px => {
                [125, 165, 205, 260, 293, 327, 360].forEach(py => {
                    createTableWithChairs(X1(px), Z1(py), 0xd9a15f, 0x3b3b3b);
                });
            });
            [588, 648].forEach(px => {
                [125, 165, 205].forEach(py => {
                    createTableWithChairs(X1(px), Z1(py), 0xd9a15f, 0x3b3b3b);
                });
            });
            createTableWithChairs(X1(648), Z1(240), 0xd9a15f, 0x3b3b3b);
        }
    },
    '2': {
        name: 'Aras 2 - Koleksi Rujukan',
        floorColor: 0xcee5d0,
        room: { w: 33.9, d: 36 },
        customFloor: true,
        nav: {
            door: { x: 7.85, z: -18.1 },
            entry: { x: 7.85, z: -17.0 },
            bounds: { x0: -17.05, x1: 17.05, z0: -18.0, z1: 18.0 }
        },
        view: { cam: new THREE.Vector3(0, 46, 36), target: new THREE.Vector3(0, 0, 2) },
        shelves: [
            rakKiri('000', 270), rakKiri('000', 311), rakKiri('100', 352),
            rakKiri('200', 393), rakKiri('300', 434), rakKiri('400', 475),
            rakKiri('500', 522), rakKiri('600', 641), rakKiri('700', 676),
            rakKiri('800', 708), rakKiri('900', 739),

            // 4 rak serong di tengah (hiasan)
            rakTengah(1020, 455, 0.6), rakTengah(1145, 450, -0.6),
            rakTengah(1010, 590, -0.6), rakTengah(1150, 590, 0.6),

            // 8 rak panjang bahagian bawah (hiasan)
            ...[630, 724, 819, 913, 1007, 1101, 1196, 1290].map(rakBawah)
        ],
        build() {
            // Dinding + pintu (ikut kedudukan pintu dalam lakaran)
            // Lantai bentuk L (kawasan kanan bawah dibuang)
            // px 1362 -> x = 14.15 ; py 205 -> z = -13.85
            addBox(34.04, 0.2, 4.15, -0.05, -0.1, -15.925, 0xcee5d0, { noShadow: true });
            addBox(31.22, 0.2, 31.85, -1.46, -0.1, 2.075, 0xcee5d0, { noShadow: true });

            // Dinding + pintu (ikut kedudukan pintu dalam lakaran)
            buildWall('x', -18.1, -17.05, 17.05, [[-5.3, -4.0], [6.5, 9.2]]); // atas
            buildWall('x', 18.1, -17.05, 14.15);                              // bawah (dipendekkan)
            buildWall('z', 17.05, -18, -13.85);                               // kanan (bahagian atas sahaja)
            buildWall('x', -13.85, 14.15, 17.05);                             // potongan mendatar
            buildWall('z', 14.15, -13.85, 18);                                // potongan menegak
            buildWall('z', -17.05, -18, 18, [[-15.2, -13.7]]);                // kiri

            // Sofa (tepi kanan, belakang menghala ke dinding)
            const sofaX = 13.5;
            createSofa(sofaX, P(1340, 262)[1], 2.7, -Math.PI / 2, 1.0);
            createSofa(sofaX, P(1340, 375)[1], 2.2, -Math.PI / 2, 1.0);
            addBox(0.9, 0.8, 1.3, sofaX, 0.4, P(1340, 326)[1], 0x3a2420);

            // Meja + 4 kerusi (putih)
            [[1285, 481], [1285, 517], [1285, 553], [1285, 590], [1285, 626],
             [1160, 642], [1160, 707]].forEach(([px, py]) => {
                const [x, z] = P(px, py);
                createTableWithChairs(x, z, 0xeceff1, 0xb8bec4);
            });

            // Kaunter + PC
            const [cx, cz] = P(1040, 172);
            addBox(4.3, 0.9, 0.7, cx, 0.45, cz, 0xf1dfa8);
            createLabelSprite('COUNTER', 1.8, 0.65, '#24594f', 40).position.set(cx, 2.0, cz);

            // Book drop
            const [bx, bz] = P(762, 523);
            addBox(0.7, 0.8, 1.0, bx, 0.4, bz, 0xf1dfa8);
            createLabelSprite('BOOK DROP', 1.5, 0.56, '#2a9d8f', 38).position.set(bx, 1.8, bz);

            // Meja + 4 kerusi (oren)
            [[563, 152], [630, 152], [563, 220], [630, 220], [841, 275], [841, 357], [841, 432],
             [841, 595], [841, 658], [942, 523], [928, 245], [933, 314], [937, 381],
             [1063, 245], [1063, 314], [1063, 381], [1021, 525], [1077, 527], [1133, 527],
             [1310, 160], [1366, 160]].forEach(([px, py]) => {
                const [x, z] = P(px, py);
                createTableWithChairs(x, z, 0xd9a15f, 0x3b3b3b);
            });

            // Kerusi hitam (kanan atas)
            [272, 325, 382].forEach(py => {
                const [x, z] = P(1239, py);
                addBox(0.9, 0.5, 0.9, x, 0.25, z, 0x1a1a1a);
            });
        }
    }
};

let currentFloor = '1';   // aras pertama dipaparkan (mesti sama dengan butang .active dalam index.html)
const activeFloorGroup = new THREE.Group();
scene.add(activeFloorGroup);

let shelfObjects = {};
let navGridCache = {};
const bookGeometry = new THREE.BoxGeometry(1, 1, 1);
const bookMaterials = [0x8055a5, 0xf0a080, 0x779e91, 0xe5c66b, 0x7189b8]
    .map(color => new THREE.MeshStandardMaterial({ color }));

const bookColors = [0x8055a5, 0xf0a080, 0x779e91, 0xe5c66b, 0x7189b8].map(c => new THREE.Color(c));
const bookInstMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

const SHELF_DEPTH = 0.5;
const SHELF_H = 1.9;
const BOARD_Y = [0.12, 0.6, 1.08, 1.56];
const ARROW_Y = 2.8;

function addShelf(item) {
    const group = new THREE.Group();
    const L = item.length;
    const double = !!item.doubleSided;           // rak dua muka: depan (+z) & belakang (-z)
    const D = double ? 0.9 : SHELF_DEPTH;
    const faceZ = double ? [0.225, -0.225] : [0];

    const woodMat = new THREE.MeshStandardMaterial({ color: 0xb98b68, roughness: 0.8 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0xd9b99b });

    const addPart = (w, h, d, x, y, z, mat) => {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
    };

    const postCount = Math.max(2, Math.round(L / 1.5) + 1);
    for (let i = 0; i < postCount; i++) {
        addPart(0.08, SHELF_H, D, -L / 2 + (i * L) / (postCount - 1), SHELF_H / 2, 0, woodMat);
    }

    // Buku: satu InstancedMesh setiap rak (jauh lebih ringan daripada ribuan mesh berasingan)
    const bookData = [];
    BOARD_Y.forEach(y => {
        addPart(L, 0.06, D, 0, y, 0, boardMat);
        faceZ.forEach(fz => {
            let cx = -L / 2 + 0.08;
            while (cx < L / 2 - 0.15) {
                const w = 0.07 + Math.random() * 0.08;
                const h = 0.26 + Math.random() * 0.14;
                bookData.push({
                    w, h,
                    x: cx + w / 2,
                    y: y + 0.03 + h / 2,
                    z: fz,
                    color: bookColors[Math.floor(Math.random() * bookColors.length)]
                });
                cx += w + 0.01;
            }
        });
    });
    const books = new THREE.InstancedMesh(bookGeometry, bookInstMaterial, bookData.length);
    const tmp = new THREE.Object3D();
    bookData.forEach((b, i) => {
        tmp.position.set(b.x, b.y, b.z);
        tmp.scale.set(b.w, b.h, 0.3);
        tmp.updateMatrix();
        books.setMatrixAt(i, tmp.matrix);
        books.setColorAt(i, b.color);
    });
    books.instanceMatrix.needsUpdate = true;
    if (books.instanceColor) books.instanceColor.needsUpdate = true;
    group.add(books);
    addPart(L, 0.06, D, 0, SHELF_H, 0, boardMat);

    const baseY = item.y || 0;   // ketinggian lantai tempat rak berdiri
    group.position.set(item.x, baseY, item.z);
    group.rotation.y = item.rotation || 0;
    activeFloorGroup.add(group);

    if (item.decor) return; // rak tiada nombor: tiada label/anak panah

    // Satu anak panah + label untuk setiap muka (rak dua muka ada 2 nombor)
    const faces = double
        ? [[item.number, 0.5, 1], [item.back, -0.5, -1]]
        : [[item.number, 0, 0]];

    faces.forEach(([num, dz, side]) => {
        const arrow = new THREE.Group();
        const arrowMat = new THREE.MeshStandardMaterial({ color: 0xe63946, roughness: 0.5 });
        const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 24), arrowMat);
        arrowHead.rotation.x = Math.PI;
        arrowHead.position.y = 0.25;

        const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.5, 16), arrowMat);
        arrowShaft.position.y = 0.75;

        arrow.add(arrowHead, arrowShaft);
        arrow.position.set(item.x, ARROW_Y + baseY, item.z + dz);
        arrow.visible = false;
        activeFloorGroup.add(arrow);

        const label = createLabelSprite(item.label || num);
        label.position.set(item.x, 2.45 + baseY, item.z + dz);
        activeFloorGroup.add(label);

        // Rak dua muka: hanya muka yang dicari akan bersinar
        let glow = null;
        if (side) {
            glow = new THREE.Mesh(
                new THREE.BoxGeometry(L + 0.1, SHELF_H + 0.1, 0.3),
                new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.4, depthWrite: false })
            );
            glow.position.set(item.x, SHELF_H / 2 + baseY, item.z + side * 0.45);
            glow.visible = false;
            glow.userData.noNav = true;
            activeFloorGroup.add(glow);
        } else {
            // Rak satu muka: seluruh rak bersinar (glow jadi anak group, ikut bergerak bersama rak)
            glow = new THREE.Mesh(
                new THREE.BoxGeometry(L + 0.1, SHELF_H + 0.1, D + 0.1),
                new THREE.MeshBasicMaterial({ color: 0xffd54a, transparent: true, opacity: 0.4, depthWrite: false })
            );
            glow.position.set(0, SHELF_H / 2, 0);
            glow.visible = false;
            glow.userData.noNav = true;
            group.add(glow);
        }

        if (!shelfObjects[num]) shelfObjects[num] = [];
        shelfObjects[num].push({ group, arrow, glow, glowChild: !side, double: !!side, side, baseY });
    });
}

function buildFloor(floorKey) {
    try {
        while (activeFloorGroup.children.length > 0) {
            activeFloorGroup.remove(activeFloorGroup.children[0]);
        }
        shelfObjects = {};
        navGridCache = {};

        const data = floorsData[floorKey];
        if (!data) return;

        groundGroup.visible = floorKey === 'G';
        floorMesh.material.color.setHex(data.floorColor);
        floorMesh.visible = !data.customFloor;
        const room = data.room || { w: ROOM_W, d: ROOM_D + NORTH_EXT, z: -NORTH_EXT / 2 };
        floorMesh.scale.set(room.w / ROOM_W, 1, room.d / ROOM_D);
        floorMesh.position.z = room.z || 0;

        data.shelves.forEach(addShelf);

        if (data.build) {
            targetGroup = activeFloorGroup;
            data.build();
            targetGroup = scene;
        }

        const floorTitle = document.getElementById('currentFloorTitle');
        if (floorTitle) floorTitle.textContent = `3D Layout - ${data.name}`;
    } catch (err) {
        console.error("Floor Build Error:", err);
    } finally {
        hideLoading();
    }
}

// Bermula dengan aras lalai (sama dengan butang yang aktif dalam halaman)
buildFloor(currentFloor);
{
    const startView = floorsData[currentFloor].view || { cam: DEFAULT_CAM, target: DEFAULT_TARGET };
    camera.position.copy(startView.cam);
    controls.target.copy(startView.target);
    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.floor === currentFloor);
    });
}

// ---------- Pergerakan Kamera ----------
let camGoal = null;
let targetGoal = null;

function flyTo(position, target) {
    camGoal = position.clone();
    targetGoal = target.clone();
}

controls.addEventListener('start', () => {
    camGoal = null;
    targetGoal = null;
});

function focusOnCategory(entries) {
    const box = new THREE.Box3();
    entries.forEach(entry => box.expandByObject(entry.group));

    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const span = Math.max(size.x, size.z);
    const dist = THREE.MathUtils.clamp(span * 0.9 + 7, 9, 30);

    flyTo(
        new THREE.Vector3(center.x, dist * 0.65, center.z + dist * 0.75),
        new THREE.Vector3(center.x, 0.8, center.z)
    );
}

let activeEntries = [];

function setHighlight(category) {
    if (!category) { clearRoute(); setReminder(null); }
    Object.values(shelfObjects).flat().forEach(entry => {
        entry.group.position.y = entry.baseY || 0;
        entry.arrow.visible = false;
        entry.arrow.position.y = ARROW_Y + (entry.baseY || 0);
        if (entry.glow) {
            entry.glow.visible = false;
            if (!entry.glowChild) entry.glow.position.y = SHELF_H / 2 + (entry.baseY || 0);
        }
    });

    activeEntries = category && shelfObjects[category] ? shelfObjects[category] : [];
    activeEntries.forEach(entry => {
        entry.arrow.visible = true;
        if (entry.glow) entry.glow.visible = true;
    });
}

// ---------- Navigasi: Laluan dari Pintu Utama ----------
const routeGroup = new THREE.Group();
scene.add(routeGroup);

// Kedudukan pintu utama (door), titik masuk di dalam bilik (entry) dan sempadan kawasan boleh dilalui
const NAV_DEFAULT = {
    door: { x: -1.665, z: HALF_D + WALL_T / 2 },
    entry: { x: -1.665, z: HALF_D - 0.8 },
    bounds: { x0: -HALF_W, x1: HALF_W, z0: -HALF_D - NORTH_EXT, z1: HALF_D }
};
function getNav(floorKey) { return floorsData[floorKey].nav || NAV_DEFAULT; }

const NAV_CELL = 0.25;     // saiz grid (meter)
const NAV_RADIUS = 0.1;    // jarak selamat dari perabot/dinding
const NAV_SPACING = 0.9;   // jarak antara anak panah laluan
const WALK_SPEED = 2.2;    // meter/saat dalam mod POV

let route = null;          // { pts, cum, total, chevrons, targetCenter, overview }
let povBtn = null;
const walk = { active: false, dist: 0, look: new THREE.Vector3() };

class MinHeap {
    constructor() { this.a = []; }
    get size() { return this.a.length; }
    push(c, i) {
        const a = this.a;
        a.push([c, i]);
        let k = a.length - 1;
        while (k > 0) {
            const p = (k - 1) >> 1;
            if (a[p][0] <= a[k][0]) break;
            [a[p], a[k]] = [a[k], a[p]];
            k = p;
        }
    }
    pop() {
        const a = this.a;
        const top = a[0];
        const last = a.pop();
        if (a.length) {
            a[0] = last;
            let k = 0;
            for (;;) {
                const l = 2 * k + 1, r = l + 1;
                let m = k;
                if (l < a.length && a[l][0] < a[m][0]) m = l;
                if (r < a.length && a[r][0] < a[m][0]) m = r;
                if (m === k) break;
                [a[m], a[k]] = [a[k], a[m]];
                k = m;
            }
        }
        return top;
    }
}

function buildNavGrid(nav, radius = NAV_RADIUS) {
    const cacheKey = currentFloor + '_' + radius;
    if (navGridCache[cacheKey]) return navGridCache[cacheKey];
    scene.updateMatrixWorld(true);
    const { x0, x1, z0, z1 } = nav.bounds;
    const cols = Math.ceil((x1 - x0) / NAV_CELL);
    const rows = Math.ceil((z1 - z0) / NAV_CELL);
    const blocked = new Uint8Array(cols * rows);
    const box = new THREE.Box3();
    const roots = [activeFloorGroup];
    if (groundGroup.visible) roots.push(groundGroup);

    roots.forEach(root => root.traverse(obj => {
        if (!obj.isMesh || obj.userData.noNav) return;
        box.setFromObject(obj);
        if (box.max.y < 0.15 || box.min.y > 1.8) return; // lantai & objek atas (pintu, anak panah)
        const i0 = Math.max(0, Math.floor((box.min.x - radius - x0) / NAV_CELL));
        const i1 = Math.min(cols - 1, Math.floor((box.max.x + radius - x0) / NAV_CELL));
        const j0 = Math.max(0, Math.floor((box.min.z - radius - z0) / NAV_CELL));
        const j1 = Math.min(rows - 1, Math.floor((box.max.z + radius - z0) / NAV_CELL));
        for (let j = j0; j <= j1; j++) {
            for (let i = i0; i <= i1; i++) blocked[j * cols + i] = 1;
        }
    }));
    navGridCache[cacheKey] = { x0, z0, cols, rows, blocked };
    return navGridCache[cacheKey];
}

function gridFree(g, i, j) {
    return i >= 0 && j >= 0 && i < g.cols && j < g.rows && !g.blocked[j * g.cols + i];
}
function gridCenter(g, i, j) {
    return { x: g.x0 + (i + 0.5) * NAV_CELL, z: g.z0 + (j + 0.5) * NAV_CELL };
}
function gridCell(g, x, z) {
    return [Math.floor((x - g.x0) / NAV_CELL), Math.floor((z - g.z0) / NAV_CELL)];
}

function lineClear(g, a, b) {
    const dist = Math.hypot(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.ceil(dist / 0.15));
    for (let s = 0; s <= steps; s++) {
        const f = s / steps;
        const [i, j] = gridCell(g, a.x + (b.x - a.x) * f, a.z + (b.z - a.z) * f);
        if (!gridFree(g, i, j)) return false;
    }
    return true;
}

function findRouteCells(g, entry, shelfBoxes) {
    let [si, sj] = gridCell(g, entry.x, entry.z);
    if (!gridFree(g, si, sj)) {
        let found = false;
        for (let r = 1; r <= 4 && !found; r++) {
            for (let dj = -r; dj <= r && !found; dj++) {
                for (let di = -r; di <= r && !found; di++) {
                    if (gridFree(g, si + di, sj + dj)) { si += di; sj += dj; found = true; }
                }
            }
        }
        if (!found) return null;
    }

    // Sel sasaran: sel kosong dekat dengan rak
    const goal = new Uint8Array(g.cols * g.rows);
    const gb = new THREE.Box3();
    shelfBoxes.forEach(b => gb.union(b));
    const gi0 = Math.max(0, Math.floor((gb.min.x - 1.2 - g.x0) / NAV_CELL));
    const gi1 = Math.min(g.cols - 1, Math.floor((gb.max.x + 1.2 - g.x0) / NAV_CELL));
    const gj0 = Math.max(0, Math.floor((gb.min.z - 1.2 - g.z0) / NAV_CELL));
    const gj1 = Math.min(g.rows - 1, Math.floor((gb.max.z + 1.2 - g.z0) / NAV_CELL));
    for (let j = gj0; j <= gj1; j++) {
        for (let i = gi0; i <= gi1; i++) {
            if (!gridFree(g, i, j)) continue;
            const c = gridCenter(g, i, j);
            for (const b of shelfBoxes) {
                if (b.strict && (c.x < b.min.x || c.x > b.max.x)) continue;
                const dx = Math.max(b.min.x - c.x, 0, c.x - b.max.x);
                const dz = Math.max(b.min.z - c.z, 0, c.z - b.max.z);
                const d = Math.hypot(dx, dz);
                if (d >= 0.3 && d <= 1.0) { goal[j * g.cols + i] = 1; break; }
            }
        }
    }

    const N = g.cols * g.rows;
    const dist = new Float64Array(N).fill(Infinity);
    const prev = new Int32Array(N).fill(-1);
    const heap = new MinHeap();
    const start = sj * g.cols + si;
    dist[start] = 0;
    heap.push(0, start);

    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    let end = -1;
    while (heap.size) {
        const [cost, idx] = heap.pop();
        if (cost > dist[idx]) continue;
        if (goal[idx]) { end = idx; break; }
        const ci = idx % g.cols, cj = (idx / g.cols) | 0;
        for (const [di, dj] of dirs) {
            const ni = ci + di, nj = cj + dj;
            if (!gridFree(g, ni, nj)) continue;
            if (di !== 0 && dj !== 0 && (!gridFree(g, ci + di, cj) || !gridFree(g, ci, cj + dj))) continue;
            const step = di !== 0 && dj !== 0 ? 1.414 : 1;
            const nIdx = nj * g.cols + ni;
            const nc = cost + step;
            if (nc < dist[nIdx]) {
                dist[nIdx] = nc;
                prev[nIdx] = idx;
                heap.push(nc, nIdx);
            }
        }
    }
    if (end < 0) return null;

    const cells = [];
    for (let k = end; k !== -1; k = prev[k]) cells.push(gridCenter(g, k % g.cols, (k / g.cols) | 0));
    cells.reverse();
    return cells;
}

function smoothPath(g, pts) {
    if (pts.length <= 2) return pts;
    const out = [pts[0]];
    let i = 0;
    while (i < pts.length - 1) {
        let best = i + 1;
        for (let j = i + 2; j < pts.length; j++) {
            if (lineClear(g, pts[i], pts[j])) best = j;
            else if (j - best > 12) break; // berhenti awal
        }
        out.push(pts[best]);
        i = best;
    }
    return out;
}

function sampleRoute(d) {
    const r = route;
    d = Math.max(0, Math.min(r.total, d));
    let s = 1;
    while (s < r.cum.length - 1 && r.cum[s] < d) s++;
    const a = r.pts[s - 1], b = r.pts[s];
    const segLen = (r.cum[s] - r.cum[s - 1]) || 1;
    const f = (d - r.cum[s - 1]) / segLen;
    return {
        x: a.x + (b.x - a.x) * f,
        z: a.z + (b.z - a.z) * f,
        dx: (b.x - a.x) / segLen,
        dz: (b.z - a.z) / segLen
    };
}

const chevronShape = new THREE.Shape();
[[0.3, 0], [-0.1, 0.32], [-0.3, 0.32], [0.1, 0], [-0.3, -0.32], [-0.1, -0.32]]
    .forEach(([x, y], i) => (i === 0 ? chevronShape.moveTo(x, y) : chevronShape.lineTo(x, y)));
chevronShape.closePath();
const chevronGeo = new THREE.ShapeGeometry(chevronShape);
chevronGeo.rotateX(-Math.PI / 2);

function stopWalk(fly = true) {
    if (!walk.active) return;
    walk.active = false;
    controls.enabled = true;
    camera.fov = 45;
    camera.updateProjectionMatrix();
    if (fly && route) {
        controls.target.copy(walk.look);
        flyTo(route.overview.cam, route.overview.target);
    }
    if (povBtn) povBtn.textContent = '🚶 Mod POV';
}

function startWalk() {
    if (!route) return;
    walk.active = true;
    walk.dist = 0;
    camGoal = null;
    targetGoal = null;
    controls.enabled = false;
    camera.fov = 70;
    camera.updateProjectionMatrix();
    const a = sampleRoute(2.5);
    walk.look.set(a.x, 1.4, a.z);
    if (povBtn) povBtn.textContent = '⏹ Keluar POV';
}

function clearRoute() {
    stopWalk(false);
    while (routeGroup.children.length) {
        const o = routeGroup.children[0];
        routeGroup.remove(o);
        if (o.material && o.material.dispose) o.material.dispose();
    }
    route = null;
    if (povBtn) { povBtn.disabled = true; povBtn.style.opacity = '0.5'; }
}

function showRoute(entries) {
    clearRoute();
    try {
        const nav = getNav(currentFloor);
        let grid = buildNavGrid(nav);
        const shelfBoxes = entries.map(e => {
            const b = new THREE.Box3().setFromObject(e.group);
            if (e.side) {
                // Rak dua muka: sasaran ialah muka yang dicari sahaja
                const fz = e.side > 0 ? b.max.z : b.min.z;
                b.min.z = fz;
                b.max.z = fz;
                b.strict = true;
            }
            return b;
        });

        let cells = findRouteCells(grid, nav.entry, shelfBoxes);
        if (!cells) {
            // Cuba lagi dengan jarak selamat paling kecil sebelum guna garis lurus
            grid = buildNavGrid(nav, 0.03);
            cells = findRouteCells(grid, nav.entry, shelfBoxes);
        }
        const raw = [{ x: nav.door.x, z: nav.door.z }, { x: nav.entry.x, z: nav.entry.z }];
        if (cells) {
            raw.push(...smoothPath(grid, cells).slice(1));
        } else {
            // Tiada laluan dijumpai: garis lurus anggaran ke rak terdekat
            const c = shelfBoxes[0].getCenter(new THREE.Vector3());
            raw.push({ x: c.x, z: c.z });
        }

        const pts = [];
        raw.forEach(p => {
            const last = pts[pts.length - 1];
            if (!last || Math.hypot(p.x - last.x, p.z - last.z) > 0.05) pts.push(p);
        });
        if (pts.length < 2) return false;

        const cum = [0];
        for (let i = 1; i < pts.length; i++) {
            cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z));
        }
        const total = cum[cum.length - 1];

        // Anak panah laluan di lantai
        const chevrons = [];
        const count = Math.floor(total / NAV_SPACING) + 1;
        for (let i = 0; i < count; i++) {
            const m = new THREE.Mesh(
                chevronGeo,
                new THREE.MeshBasicMaterial({ color: 0x1d7cf2, transparent: true, side: THREE.DoubleSide, depthWrite: false })
            );
            m.position.y = 0.05;
            routeGroup.add(m);
            chevrons.push(m);
        }

        // Penanda pintu utama
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.5, 0.7, 32).rotateX(-Math.PI / 2),
            new THREE.MeshBasicMaterial({ color: 0x2a9d8f, side: THREE.DoubleSide })
        );
        ring.position.set(nav.entry.x, 0.06, nav.entry.z);
        routeGroup.add(ring);

        const startLabel = createLabelSprite('PINTU UTAMA', 2.0, 0.75, '#2a9d8f', 30);
        startLabel.position.set(nav.entry.x, 1.7, nav.entry.z);
        routeGroup.add(startLabel);

        // Pandangan keseluruhan laluan
        const bbox = new THREE.Box3();
        pts.forEach(p => bbox.expandByPoint(new THREE.Vector3(p.x, 0, p.z)));
        shelfBoxes.forEach(b => bbox.union(b));
        const center = bbox.getCenter(new THREE.Vector3());
        const size = bbox.getSize(new THREE.Vector3());
        const dist = THREE.MathUtils.clamp(Math.max(size.x, size.z) * 1.1 + 6, 12, 70);
        const overview = {
            cam: new THREE.Vector3(center.x, dist * 0.75, center.z + dist * 0.7),
            target: new THREE.Vector3(center.x, 0, center.z)
        };

        route = {
            pts, cum, total, chevrons, overview,
            targetCenter: shelfBoxes[0].getCenter(new THREE.Vector3())
        };

        flyTo(overview.cam, overview.target);
        if (povBtn) { povBtn.disabled = false; povBtn.style.opacity = '1'; }
        return true;
    } catch (err) {
        console.error('Route Error:', err);
        clearRoute();
        return false;
    }
}

function updateRoute(t, dt) {
    if (!route) return;

    const offset = (t * 1.1) % NAV_SPACING;
    route.chevrons.forEach((c, i) => {
        const d = i * NAV_SPACING + offset;
        if (d >= route.total) { c.visible = false; return; }
        const p = sampleRoute(d);
        c.visible = true;
        c.position.x = p.x;
        c.position.z = p.z;
        c.rotation.y = Math.atan2(-p.dz, p.dx);
        c.material.opacity = Math.min(1, d / 1.0, (route.total - d) / 0.8);
    });

    if (walk.active) {
        walk.dist = Math.min(route.total, walk.dist + WALK_SPEED * dt);
        const p = sampleRoute(walk.dist);
        const ahead = sampleRoute(walk.dist + 2.5);
        const desired = walk.dist >= route.total - 0.01
            ? new THREE.Vector3(route.targetCenter.x, 1.1, route.targetCenter.z)
            : new THREE.Vector3(ahead.x, 1.4, ahead.z);
        walk.look.lerp(desired, 1 - Math.exp(-4 * dt));
        camera.position.set(p.x, 1.6, p.z);
        camera.lookAt(walk.look);
    }
}

// ---------- Carian Mengikut Aras Semasa (Single-Floor Scope) ----------
function detectCategoryOnly(rawCallNumber) {
    const clean = rawCallNumber.toUpperCase().trim();

    const match = clean.match(/(\d{3})(?:\.\d+)?/) || clean.match(/\d{1,3}/);
    if (!match) return null;

    const number = parseInt(match[1] || match[0], 10);
    if (number < 0 || number >= 1000) return null;

    return String(Math.floor(number / 100) * 100).padStart(3, '0');
}

function getView(floorKey) {
    return floorsData[floorKey].view || { cam: DEFAULT_CAM, target: DEFAULT_TARGET };
}

function switchFloor(floorKey) {
    currentFloor = floorKey;
    buildFloor(floorKey);
    const v = getView(floorKey);
    flyTo(v.cam, v.target);

    document.querySelectorAll('.floor-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.floor === floorKey);
    });
}

// Selesaikan input kepada kunci rak: nombor Dewey (ratusan) atau kod Novel 3 huruf
function resolveCallNumber(raw) {
    const floor = floorsData[currentFloor];
    const clean = raw.toUpperCase().trim();

    if (floor.novel && clean && !/\d/.test(clean)) {
        const m = clean.match(/^(?:N\s*)?([A-Z]{3})\b/);
        if (m) {
            const code = m[1];
            let idx = 0;
            floor.novel.starts.forEach((start, i) => { if (code >= start) idx = i; });
            return { key: 'NOVEL' + (idx + 1), label: 'Novel ' + (idx + 1), name: 'Novel (kod pengarang ' + code + ')', kind: 'novel' };
        }
    }

    const cat = detectCategoryOnly(raw);
    if (!cat) return null;
    return { key: cat, label: cat, name: categoryNames[cat] || 'Koleksi Khas', kind: 'dewey' };
}

// Banner peringatan di bawah kad keputusan
function setReminder(text) {
    let box = document.getElementById('orderReminder');
    if (!box) {
        const card = document.getElementById('resultCard');
        if (!card) return;
        box = document.createElement('div');
        box.id = 'orderReminder';
        box.style.cssText = 'display:none;margin:12px 0;padding:12px 16px;border-left:4px solid #e9a100;' +
            'background:#fff4d6;color:#5a4300;border-radius:10px;font-size:0.95rem;line-height:1.4;';
        card.insertAdjacentElement('afterend', box);
    }
    box.textContent = text || '';
    box.style.display = text ? 'block' : 'none';
}

function searchCallNumber() {
    const input = document.getElementById('callNumber');
    const resultCard = document.getElementById('resultCard');
    const resultTitle = document.getElementById('resultTitle');
    const resultDescription = document.getElementById('resultDescription');
    const resultNumber = document.getElementById('resultNumber');
    const resultFloorTag = document.getElementById('resultFloorTag');

    const callNumber = input ? input.value.trim() : '';
    const found = resolveCallNumber(callNumber);
    const category = found ? found.key : null;

    if (resultCard) resultCard.style.display = 'block';

    const floorName = floorsData[currentFloor].name;
    if (resultFloorTag) resultFloorTag.textContent = `ARAS AKTIF: ${floorName.toUpperCase()}`;

    // 1. Jika nombor tidak sah
    if (!callNumber || !found) {
        setHighlight(null);
        if (resultTitle) resultTitle.textContent = 'Call number tidak dikenali';
        if (resultDescription) resultDescription.textContent = 'Sila masukkan nombor call number yang sah.';
        if (resultNumber) resultNumber.textContent = '';
        return;
    }

    const name = found.name;

    // 2. Jika rak tidak wujud pada ARAS SEMASA (Kekal di aras ini, jangan lompat aras lain)
    if (!shelfObjects[category]) {
        setHighlight(null);
        if (resultTitle) resultTitle.textContent = `Rak ${found.label} - ${name} (Tiada di ${floorName})`;
        if (resultDescription) resultDescription.textContent =
            `Buku dengan call number ${callNumber} (${name}) tiada pada susun atur ${floorName}. Sila tekan butang aras lain jika buku berada di aras berkenaan.`;
        if (resultNumber) resultNumber.textContent = found.label;
        return;
    }

    // 3. Jika rak wujud pada ARAS SEMASA -> Hancurkan carian & fokus kamera
    const entries = shelfObjects[category];
    if (resultTitle) resultTitle.textContent = `Rak ${found.label} - ${name}`;
    if (resultDescription) resultDescription.textContent = `Buku ${callNumber} dijumpai pada rak ${found.label} di ${floorName}.`;
    if (resultNumber) resultNumber.textContent = found.label;

    setHighlight(category);

    // Peringatan susun buku (Aras 1)
    if (floorsData[currentFloor].reminder) {
        setReminder(found.kind === 'novel'
            ? `Peringatan: Sila susun buku mengikut susunan abjad kod pengarang dalam rak ${found.label}.`
            : `Peringatan: Sila susun buku mengikut susunan call number dalam rak ${found.label}.`);
    }

    // Result dipaparkan dahulu; laluan dikira selepas paparan dikemas kini
    requestAnimationFrame(() => setTimeout(() => {
        if (showRoute(entries)) {
            if (resultDescription) resultDescription.textContent += ' Ikut anak panah biru dari pintu utama.';
        } else {
            focusOnCategory(entries);
        }
    }, 0));
}

// Butang Pilihan Aras
document.querySelectorAll('.floor-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        switchFloor(e.target.dataset.floor);
        setHighlight(null);
    });
});

const searchBtn = document.getElementById('searchButton');
if (searchBtn) searchBtn.addEventListener('click', searchCallNumber);

const callInput = document.getElementById('callNumber');
if (callInput) {
    callInput.addEventListener('keydown', event => {
        if (event.key === 'Enter') searchCallNumber();
    });
}

const resetBtn = document.getElementById('resetView');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        setHighlight(null);
        const v = getView(currentFloor);
        flyTo(v.cam, v.target);
        const resultCard = document.getElementById('resultCard');
        if (resultCard) resultCard.style.display = 'none';
        if (callInput) callInput.value = '';
    });
}

if (resetBtn) {
    povBtn = document.createElement('button');
    povBtn.type = 'button';
    povBtn.id = 'povButton';
    povBtn.className = resetBtn.className;
    povBtn.textContent = '🚶 Mod POV';
    povBtn.disabled = true;
    povBtn.style.opacity = '0.5';
    povBtn.style.marginRight = '8px';
    povBtn.addEventListener('click', () => { walk.active ? stopWalk(true) : startWalk(); });
    resetBtn.insertAdjacentElement('beforebegin', povBtn);
}

window.addEventListener('resize', () => {
    if (container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});

// ---------- Loop Animasi ----------
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);

    if (camGoal && targetGoal) {
        camera.position.lerp(camGoal, 0.08);
        controls.target.lerp(targetGoal, 0.08);

        if (camera.position.distanceTo(camGoal) < 0.05 && controls.target.distanceTo(targetGoal) < 0.05) {
            camGoal = null;
            targetGoal = null;
        }
    }

    if (activeEntries.length) {
        const t = performance.now() / 1000;
        const wave = (Math.sin(t * 3) + 1) / 2;
        activeEntries.forEach(entry => {
            // Seluruh rak bergerak; rak dua muka hanya muka yang dicari bersinar
            const by = entry.baseY || 0;
            entry.group.position.y = by + wave * 0.15;
            entry.arrow.position.y = ARROW_Y + by + wave * 0.3;
            if (entry.glow) {
                if (!entry.glowChild) entry.glow.position.y = SHELF_H / 2 + by + wave * 0.15; // ikut gerakan rak
                entry.glow.material.opacity = 0.2 + wave * 0.35;
            }
        });
    }

    updateRoute(performance.now() / 1000, dt);
    if (!walk.active) controls.update();
    renderer.render(scene, camera);
}
animate();

// =====================================================================
//  SCAN LABEL (OCR)
// =====================================================================
(function setupScanner() {
    const searchButton = document.getElementById('searchButton');
    if (!searchButton || !callInput) return;

    const style = document.createElement('style');
    style.textContent = `
        .ss-scan-btn { margin-left: 8px; }
        .ss-scan-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(20,10,40,0.88);
            display: none; align-items: center; justify-content: center; padding: 16px; }
        .ss-scan-overlay.open { display: flex; }
        .ss-scan-box { background: #fff; border-radius: 16px; padding: 16px; width: min(100%, 560px);
            max-height: 100%; overflow: auto; text-align: center; }
        .ss-scan-title { font-weight: 700; font-size: 1.1rem; margin-bottom: 10px; }
        .ss-scan-view { position: relative; margin: 0 auto; background: #000; border-radius: 10px;
            overflow: hidden; width: 100%; aspect-ratio: 4 / 3; }
        .ss-scan-view video { width: 100%; height: 100%; object-fit: contain; display: block; }
        .ss-scan-guide { position: absolute; left: 10%; top: 20%; width: 80%; height: 60%;
            border: 3px dashed #fff; border-radius: 8px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);
            pointer-events: none; }
        .ss-scan-status { margin: 12px 0; min-height: 1.4em; color: #444; font-size: 0.95rem; }
        .ss-scan-actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    `;
    document.head.appendChild(style);

    const scanButton = document.createElement('button');
    scanButton.type = 'button';
    scanButton.id = 'scanButton';
    scanButton.className = `${searchButton.className} ss-scan-btn`.trim();
    scanButton.textContent = '📷 Scan';
    searchButton.insertAdjacentElement('afterend', scanButton);

    const overlay = document.createElement('div');
    overlay.className = 'ss-scan-overlay';
    overlay.innerHTML = `
        <div class="ss-scan-box">
            <div class="ss-scan-title">Scan call number label</div>
            <div class="ss-choice">
                <button type="button" class="ss-choice-btn" data-act="take">
                    <span class="ss-choice-icon">📸</span>
                    <span><strong>Take a photo</strong><small>Use camera to capture label</small></span>
                </button>
                <button type="button" class="ss-choice-btn" data-act="upload">
                    <span class="ss-choice-icon">🖼️</span>
                    <span><strong>Upload a photo</strong><small>Choose picture from device</small></span>
                </button>
            </div>
            <div class="ss-camera" hidden>
                <div class="ss-scan-view">
                    <video playsinline muted autoplay></video>
                    <div class="ss-scan-guide"></div>
                </div>
            </div>
            <p class="ss-scan-status"></p>
            <div class="ss-scan-actions">
                <button type="button" data-act="capture" hidden>Capture</button>
                <button type="button" data-act="back" hidden>Back</button>
                <button type="button" data-act="close">Close</button>
            </div>
            <input type="file" accept="image/*" data-input="upload" hidden>
            <input type="file" accept="image/*" capture="environment" data-input="camera" hidden>
        </div>
    `;
    document.body.appendChild(overlay);

    const choiceStyle = document.createElement('style');
    choiceStyle.textContent = `
        .ss-choice { display: flex; flex-direction: column; gap: 10px; margin: 6px 0 4px; }
        .ss-choice-btn { display: flex; align-items: center; gap: 14px; text-align: left; width: 100%;
            padding: 14px 16px; border: 2px solid #d9cdea; border-radius: 12px; background: #faf7ff;
            cursor: pointer; font: inherit; color: inherit; }
        .ss-choice-btn:hover { border-color: #24594f; background: #f3f7f4; }
        .ss-choice-btn strong { display: block; font-size: 1rem; }
        .ss-choice-btn small { display: block; color: #666; margin-top: 2px; }
        .ss-choice-icon { font-size: 1.8rem; line-height: 1; }
        .ss-scan-box [hidden] { display: none !important; }
    `;
    document.head.appendChild(choiceStyle);

    const video = overlay.querySelector('video');
    const choiceBox = overlay.querySelector('.ss-choice');
    const cameraBox = overlay.querySelector('.ss-camera');
    const status = overlay.querySelector('.ss-scan-status');
    const takeBtn = overlay.querySelector('[data-act="take"]');
    const uploadBtn = overlay.querySelector('[data-act="upload"]');
    const captureBtn = overlay.querySelector('[data-act="capture"]');
    const backBtn = overlay.querySelector('[data-act="back"]');
    const closeBtn = overlay.querySelector('[data-act="close"]');
    const uploadInput = overlay.querySelector('[data-input="upload"]');
    const cameraInput = overlay.querySelector('[data-input="camera"]');
    const view = overlay.querySelector('.ss-scan-view');

    let stream = null;
    let busy = false;

    function setStatus(text) { status.textContent = text; }

    function showScreen(name) {
        const isCamera = name === 'camera';
        choiceBox.hidden = isCamera;
        cameraBox.hidden = !isCamera;
        captureBtn.hidden = !isCamera;
        backBtn.hidden = !isCamera;
    }

    video.addEventListener('loadedmetadata', () => {
        const ar = video.videoWidth / video.videoHeight;
        view.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        view.style.width = `min(100%, ${(60 * ar).toFixed(2)}vh)`;
    });

    function stopCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        video.srcObject = null;
    }

    async function takePhoto() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            cameraInput.click();
            return;
        }

        try {
            setStatus('Opening camera…');
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } },
                audio: false
            });
            video.srcObject = stream;
            await video.play();
            showScreen('camera');
            setStatus('Place the label inside the frame, then press Capture.');
        } catch (err) {
            stopCamera();
            showScreen('choice');
            setStatus('Could not open camera. Please allow access.');
        }
    }

    function openScanner() {
        overlay.classList.add('open');
        stopCamera();
        showScreen('choice');
        setStatus('');
    }

    function closeScanner() {
        overlay.classList.remove('open');
        stopCamera();
        showScreen('choice');
    }

    let tesseractPromise = null;
    function loadTesseract() {
        if (window.Tesseract) return Promise.resolve(window.Tesseract);
        if (!tesseractPromise) {
            tesseractPromise = new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                script.onload = () => resolve(window.Tesseract);
                script.onerror = () => {
                    tesseractPromise = null;
                    reject(new Error('Failed to load OCR'));
                };
                document.head.appendChild(script);
            });
        }
        return tesseractPromise;
    }

    let workerPromise = null;
    function getWorker() {
        if (!workerPromise) {
            workerPromise = (async () => {
                const Tesseract = await loadTesseract();
                const worker = await Tesseract.createWorker('eng');
                await worker.setParameters({ tessedit_pageseg_mode: '11' });
                return worker;
            })().catch(err => {
                workerPromise = null;
                throw err;
            });
        }
        return workerPromise;
    }

    function prepareCanvas(source, sx, sy, sw, sh, targetWidth) {
        const scale = Math.min(3, Math.max(1, targetWidth / sw));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        return canvas;
    }

    function rotateCanvas(canvas, angle) {
        if (angle === 0) return canvas;
        const swap = angle === 90 || angle === 270;
        const rotated = document.createElement('canvas');
        rotated.width = swap ? canvas.height : canvas.width;
        rotated.height = swap ? canvas.width : canvas.height;

        const ctx = rotated.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, rotated.width, rotated.height);
        ctx.translate(rotated.width / 2, rotated.height / 2);
        ctx.rotate((angle * Math.PI) / 180);
        ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
        return rotated;
    }

    function parseLabel(rawText) {
        if (!rawText) return null;
        let cleaned = rawText.toUpperCase().replace(/\r?\n|\r/g, ' ');

        const ddcMatch = cleaned.match(/(?:J|R|REF)?\s?\b\d{3}(?:\.\d+)?\b/);
        if (ddcMatch) return ddcMatch[0];

        return null;
    }

    async function readLabel(canvas) {
        const worker = await getWorker();
        for (const angle of [0, 90, 270, 180]) {
            setStatus(angle === 0 ? 'Reading label…' : 'Re-scanning with alternate angle…');
            const rotatedCanvas = rotateCanvas(canvas, angle);
            const { data } = await worker.recognize(rotatedCanvas);
            const parsed = parseLabel(data.text || '');
            if (parsed) return parsed;
        }
        return null;
    }

    async function processCanvas(canvas) {
        if (busy) return;
        busy = true;
        captureBtn.disabled = true;
        takeBtn.disabled = true;
        uploadBtn.disabled = true;

        try {
            setStatus('Processing image…');
            const text = await readLabel(canvas);

            if (text) {
                callInput.value = text;
                closeScanner();
                setTimeout(() => { searchCallNumber(); }, 100);
            } else {
                setStatus('Could not detect a valid call number. Try again.');
            }
        } catch (err) {
            console.error(err);
            setStatus('Text reader error.');
        } finally {
            busy = false;
            captureBtn.disabled = false;
            takeBtn.disabled = false;
            uploadBtn.disabled = false;
        }
    }

    scanButton.addEventListener('click', openScanner);
    closeBtn.addEventListener('click', closeScanner);
    overlay.addEventListener('click', event => { if (event.target === overlay) closeScanner(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.classList.contains('open')) closeScanner(); });

    captureBtn.addEventListener('click', () => {
        if (!video.videoWidth) return;
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        processCanvas(prepareCanvas(video, vw * 0.1, vh * 0.2, vw * 0.8, vh * 0.6, 1600));
    });

    takeBtn.addEventListener('click', takePhoto);
    backBtn.addEventListener('click', () => { stopCamera(); showScreen('choice'); setStatus(''); });
    uploadBtn.addEventListener('click', () => uploadInput.click());

    function handleFile(input) {
        const file = input.files[0];
        if (!file) return;

        const img = new Image();
        img.onload = () => {
            const canvas = prepareCanvas(img, 0, 0, img.naturalWidth, img.naturalHeight, 2000);
            URL.revokeObjectURL(img.src);
            input.value = '';
            processCanvas(canvas);
        };
        img.onerror = () => setStatus('Could not open image.');
        img.src = URL.createObjectURL(file);
    }

    uploadInput.addEventListener('change', () => handleFile(uploadInput));
    cameraInput.addEventListener('change', () => handleFile(cameraInput));
})();