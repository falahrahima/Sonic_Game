"use strict";


let scene, camera, renderer, cube, orbitControl, animationFrame;
let worlds = [], laneWidth = 0.5, glow;
let sonic, sonicAction = "run", sonicHasCrashed = false, currentLane = 0, maxHeight = 0.5, dRot = 45, strafeDuration = 0.5, actionClock = {startTime: undefined, duration: 667}, animations = {run: undefined, roll: undefined, jump: undefined, fall: undefined, dead: undefined};
let obstacles = [], coins = [], coinSize = 0.025, rows = 9, gap = 4;
let score = 0, scoreLabel, level = 1, levelLabel;
let jumpSound, crashSound, deadSound, levelUpSound;
let clock = new THREE.Clock(), delta = 0, speed = 3, animationMixer, strafingMixer, rotationMixer;
let stats;

//inisialisasi
const init = () => {
    stats = new Stats();
    stats.showPanel(0);
    //document.body.appendChild(stats.dom);
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog( 0xa9f5f2, 0.001, 72);
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.001, 1000);
    camera.position.set(0, 0.67, 6.1);
    loadSounds();
    renderer = new THREE.WebGLRenderer({ alpha: false, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0xa9f5f2, 1);
    document.body.appendChild(renderer.domElement);
    //populasi
    addLight();
    for (let i = 0; i < 4; ++i){
        worlds.push(new World());
        worlds[i].position.z = -12 * i;
        scene.add(worlds[i]);
    }
    addSea();
    for (let i = 0; i > -rows; --i) addToPath(gap*i);
    spawnSonic({x: 0, y: 0, z: 4.8}, 0.021);
    addScore();
    addLevel();
    render()
}

//kelas
//game
class World{
    constructor(){
        this.obj = new THREE.Group();
        this.clouds = [];
        this.cloudGeometries = [];
        this.poleGeometries = [];
        //tanah
let groundGeometry = new THREE.BoxGeometry(2, 2, 12, 8, 1, 1);
groundGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -groundGeometry.parameters.height/2, 0));
groundGeometry.faces.forEach(face => {
    // Ubah warna tanah menjadi merah muda
    face.color.setHex(0xffcccc);
});
// Ubah warna tanah pada wajah tertentu menjadi kuning dan biru muda
// warna kuning
for (let i = 6; i <= 9; ++i) groundGeometry.faces[i].color.setHex(0xffff99);
// warna biru muda
for (let i = 14; i <= 17; ++i) groundGeometry.faces[i].color.setHex(0x99ccff);

let groundMaterial = new THREE.MeshBasicMaterial({ vertexColors: THREE.FaceColors });
let ground = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(groundGeometry), groundMaterial);
this.obj.add(ground);

        //menambah batas disamping
        for(let xPos = -1; xPos <= 1; xPos+=2){
            //vertikal
            for (let yPos = 0.2; yPos > 0; yPos -= 0.1){
                let geometry = new THREE.CylinderBufferGeometry(0.01, 0.01, 12, 8, 1);
                geometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
                geometry.applyMatrix(new THREE.Matrix4().makeTranslation(xPos, yPos, 0));
                rotateAbout(geometry, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1).normalize(), new THREE.Vector3(xPos, 0, 0), xPos*THREE.Math.degToRad(-15));
                this.poleGeometries.push(geometry);
            }
            //horizontal
            for (let zPos = -groundGeometry.parameters.depth/2; zPos < groundGeometry.parameters.depth/2; zPos+=groundGeometry.parameters.depth/4){
                let geometry = new THREE.CylinderBufferGeometry(0.01, 0.01, 0.4, 8, 1);
                geometry.applyMatrix(new THREE.Matrix4().makeRotationZ(xPos*THREE.Math.degToRad(-15)));
                geometry.applyMatrix(new THREE.Matrix4().makeTranslation(xPos, 0, zPos));
                this.poleGeometries.push(geometry);
            }
        }
        this.obj.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(this.poleGeometries), new THREE.MeshBasicMaterial({ color: 0x4d2600 })));
        //batu bata di samping
        for(let zPos = -4; zPos < 6; zPos+=3){
            let geometry = new THREE.BoxGeometry(0.4, 0.6, 0.4, 4, 12, 4);
            //menambah tekstur bata
            let lightBrown = 0xc68c53;
            for (let i = 0; i < geometry.faces.length; i++) {
                geometry.faces[i].color.setHex(lightBrown);
            }
            for (let i = 0; i < geometry.faces.length; i++) {
                geometry.faces[i].color.setHex(lightBrown);
            }

            let material = new THREE.MeshBasicMaterial({ vertexColors: THREE.FaceColors });
            let bricks = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(geometry), material);
            bricks.position.set(!((zPos + 4)%6)? -1: 1, -0.08, zPos);
            this.obj.add(bricks);
            // Menambah pohon jenis OakTree dalam game
let tree = new Lolipop(1.1);
tree.position.set(!((zPos + 4) % 6) ? -1 : 1, 0.22, zPos);
this.obj.add(tree);
        }
        //batu
        for(let zPos = -3; zPos <= 6; zPos+=3){
            let geometry = new THREE.DodecahedronGeometry(0.15, 1);
            geometry.applyMatrix(new THREE.Matrix4().makeScale(1, 2.4, 1));
            jitter(geometry, 0.015);
            let material = new THREE.MeshBasicMaterial({ color: 0x999999 });
            let rock = new THREE.Mesh(new THREE.BufferGeometry().fromGeometry(geometry), material);
            rock.position.set(((zPos + 3)%6)? -1: 1, 0, zPos);
            this.obj.add(rock);
        }
        //awan
        this.createCloud({x: -0.2, y: 1.2, z: 5.5, size: 0.21});
        this.createCloud({x: 0.5, y: 1, z: 4.5, size: 0.15});
        this.createCloud({x: -0.6, y: 1, z: 4.5, size: 0.2});
        this.createCloud({x: 0.5, y: 1, z: 4.5, size: 0.15});
        this.createCloud({x: 0.2, y: 1.2, z: 4, size: 0.2});
        this.createCloud({x: -0.4, y: 1.25, z: 3, size: 0.24});
        this.createCloud({x: 0.2, y: 1.6, z: 2, size: 0.24});
        this.createCloud({x: -0.3, y: 1.8, z: 1.5, size: 0.2});
        this.createCloud({x: 0, y: 1, z: 0.5, size: 0.21});
        this.createCloud({x: 0, y: 1.5, z: -0.5, size: 0.21});
        this.createCloud({x: -0.5, y: 1.4, z: -1, size: 0.24});
        this.createCloud({x: 0.67, y: 1.6, z: -2, size: 0.24});
        this.createCloud({x: 0.33, y: 1.2, z: -2.5, size: 0.2});
        this.createCloud({x: -0.33, y: 1, z: -4, size: 0.15});
        this.createCloud({x: -0.6, y: 1, z: -5, size: 0.2});
        this.createCloud({x: 0.5, y: 1, z: -5, size: 0.15});
        this.addClouds();
        return this.obj;
    }
    //awan
    createCloud(attributes){
        const {x, y, z, size} = attributes;
        let cloud = new Cloud(size);
        cloud.position.set(x, y + 0.5, z);
        this.clouds.push(cloud);
    }
    //menambah awan dalam game
    addClouds(){
        this.clouds.forEach(cloud => {
            cloud.geometry.applyMatrix(new THREE.Matrix4().makeScale(cloud.scale.x, cloud.scale.y, cloud.scale.z));
            cloud.geometry.applyMatrix(new THREE.Matrix4().makeTranslation(cloud.position.x, cloud.position.y, cloud.position.z));
            this.cloudGeometries.push(cloud.geometry);
        });
        this.obj.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries(this.cloudGeometries), this.clouds[1].material));
    }
};

//lolipop
class Lolipop {
    constructor(size = 1) {
        this.obj = new THREE.Group();
        
        // Membuat batang lolipop
        let stickGeometry = new THREE.CylinderBufferGeometry(0.03, 0.03, 0.5, 8);
        let stickMaterial = new THREE.MeshBasicMaterial({ color: 0xFF69B4 }); // Warna batang lolipop pink
        let stick = new THREE.Mesh(stickGeometry, stickMaterial);
        stick.position.set(0, stickGeometry.parameters.height / 2, 0);
        this.obj.add(stick);
        
        // Membuat badan permen lolipop
        let bodyGeometry = new THREE.SphereBufferGeometry(0.2, 8, 8);
        let bodyMaterial = new THREE.MeshBasicMaterial({ color: 0xE6E6FA }); // Warna badan permen lolipop orange
        let body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, stickGeometry.parameters.height + bodyGeometry.parameters.radius, 0);
        this.obj.add(body);
        
        // Menskalakan permen lolipop
        this.obj.scale.set(size, size, size);
        return this.obj;
    }
};


//awan
class Cloud{
    constructor(size = 0.2, cols = 12, rows = 12){
        let material = new THREE.MeshBasicMaterial({ color: 0xd9dfe2 });
        let sphere1Geometry = new THREE.SphereBufferGeometry(0.18, rows, cols);
        sphere1Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.1));
        let sphere2Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere2Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.275));
        let sphere3Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere3Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-0.18, 0, -0.4));
        let sphere4Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere4Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0.18, 0, -0.4));
        let sphere5Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere5Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-0.18, 0, -0.76));
        let sphere6Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere6Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0.18, 0, -0.76));
        let sphere7Geometry = new THREE.SphereBufferGeometry(0.28, rows, cols);
        sphere7Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(-0.05, 0.15, -0.5));
        let sphere8Geometry = new THREE.SphereBufferGeometry(0.35, rows, cols);
        sphere8Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0.05, 0.15, -0.63));
        let sphere9Geometry = new THREE.SphereBufferGeometry(0.25, rows, cols);
        sphere9Geometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0, -0.985));
        this.obj = new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([sphere1Geometry, sphere2Geometry, sphere3Geometry, sphere4Geometry, sphere5Geometry, sphere6Geometry, sphere7Geometry, sphere8Geometry, sphere9Geometry]), material);
        this.obj.scale.set(size, size, size);
        return this.obj;
    }
};

//  hambatan jalan
class Mushroom {
    constructor() {
        this.obj = new THREE.Group();

        // Membuat batang jamur lebih tinggi
        let stemGeometry = new THREE.CylinderBufferGeometry(0.05, 0.05, 0.6, 32);
        let stemMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Warna putih untuk batang
        let stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.set(0, 0.3, 0); // Pindahkan batang agar bagian bawah berada di y = 0
        this.obj.add(stem);

        // Membuat kepala jamur
let capGeometry = new THREE.SphereBufferGeometry(0.15, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2);
let capMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFF00 }); // Mengubah warna menjadi kuning
let cap = new THREE.Mesh(capGeometry, capMaterial);
cap.position.set(0, 0.6, 0); // Pindahkan kepala agar berada di atas batang yang lebih tinggi
this.obj.add(cap);


        // Menambahkan bintik-bintik putih pada kepala jamur (opsional)
        let dotGeometry = new THREE.SphereBufferGeometry(0.02, 32, 32);
        let dotMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF }); // Warna putih untuk bintik
        let dotPositions = [
            [0.1, 0.62, 0.05],
            [-0.1, 0.62, -0.05],
            [0.05, 0.65, -0.1],
            [-0.05, 0.65, 0.1]
        ];

        dotPositions.forEach(pos => {
            let dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.position.set(pos[0], pos[1], pos[2]);
            this.obj.add(dot);
        });

        this.obj.userData = { type: "Mushroom" };
        return this.obj;
    }
}


//hambatan jalan (lbh kecil)
class SmallRoadBlock{
    constructor(){
        this.obj = new THREE.Group();
        
        // Box geometries
        let geo1 = new THREE.BoxBufferGeometry(0.05, 0.6, 0.025);
        geo1.applyMatrix(new THREE.Matrix4().makeTranslation(0.2, geo1.parameters.height/2, 0));
        
        let geo2 = new THREE.BoxBufferGeometry(0.05, 0.6, 0.025);
        geo2.applyMatrix(new THREE.Matrix4().makeTranslation(-0.2, geo2.parameters.height/2, 0));
        
        // Combine geometries and add mesh
        this.obj.add(new THREE.Mesh(THREE.BufferGeometryUtils.mergeBufferGeometries([geo1, geo2]), new THREE.MeshBasicMaterial({ color: 0x777777 })));
        
       // Rainbow colors
let rainbowColors = [0xffcccc, 0xffff99, 0x99ccff];

        
        // Main road block geometry
        let geo3 = new THREE.BoxGeometry(0.5, 0.1, 0.025, 5, 1, 1);
        geo3.applyMatrix(new THREE.Matrix4().makeTranslation(0, 0.5, geo1.parameters.depth));
        
        geo3.faces.forEach((face, index) => {
            face.color.setHex(rainbowColors[index % rainbowColors.length]);
        });
        
        // Add white color to specific faces
for (let i = 25; i <= 43; i+=4){
    geo3.faces[i].color.setHex(0xffffff);
    geo3.faces[i+1].color.setHex(0xffffff);
}

        
        // Cloned geometry for lower part
        let geo4 = geo3.clone();
        geo4.applyMatrix(new THREE.Matrix4().makeTranslation(0, -0.2, 0));
        
        // Add meshes with rainbow colors
        this.obj.add(new THREE.Mesh(geo3, new THREE.MeshBasicMaterial({ vertexColors: THREE.FaceColors })));
        this.obj.add(new THREE.Mesh(geo4, new THREE.MeshBasicMaterial({ vertexColors: THREE.FaceColors })));
        
        // Add coins
        for (let i = -7; i <= 7; i+=2){
            let zPos = i/4, rot = 90*i/7, index = (i+7)/2;
            let coin = new Coin(rot);
            coin.position.set(0, coinSize, zPos);
            this.obj.add(coin);
        }
        
        this.obj.userData = {type: "SmallRoadBlock"};
        return this.obj;
    }
}

class WitchHat {
    constructor(){
        this.obj = new THREE.Group();

        let black = 0x99ccff, purple = 0xb145c3;

        // Fungsi untuk membuat topi penyihir sedang
        const createHat = (xPosition) => {
            // Basis topi
let baseGeometry = new THREE.CylinderBufferGeometry(0.06, 0.12, 0.06, 32);
let baseMaterial = new THREE.MeshLambertMaterial({ color: 0xb145c3 }); // Mengubah warna menjadi ungu
let base = new THREE.Mesh(baseGeometry, baseMaterial);
base.position.set(xPosition, 0.03, 0);
this.obj.add(base);

// Kerucut topi
let coneGeometry = new THREE.ConeBufferGeometry(0.12, 0.24, 32);
let coneMaterial = new THREE.MeshLambertMaterial({ color: 0xb145c3 }); // Mengubah warna menjadi ungu
let cone = new THREE.Mesh(coneGeometry, coneMaterial);
cone.position.set(xPosition, 0.15, 0);
this.obj.add(cone);



            // Pita di sekitar topi
            let bandGeometry = new THREE.CylinderBufferGeometry(0.125, 0.125, 0.015, 32);
            let bandMaterial = new THREE.MeshLambertMaterial({ color: 0xffcccc });
            let band = new THREE.Mesh(bandGeometry, bandMaterial);
            band.position.set(xPosition, 0.08, 0);
            this.obj.add(band);
        };

        // Buat dua topi penyihir sedang
        createHat(-0.2);
        createHat(0.2);

        // Tambahkan koin
        let heights = [coinSize, coinSize, 0.3, 0.5, 0.5, 0.3, coinSize, coinSize];
        for (let i = -7; i <= 7; i += 2) {
            let zPos = i / 4, rot = 90 * i / 7, index = (i + 7) / 2;
            let coin = new Coin(rot);
            coin.position.set(0, heights[index], zPos);
            this.obj.add(coin);
        }

        this.obj.userData = { type: "WitchHat" };
        return this.obj;
    }
};
0


class Ladybug {
    constructor() {
        this.obj = new THREE.Group();

        // Membuat badan kepik lebih kecil
        let bodyGeometry = new THREE.SphereBufferGeometry(0.1, 32, 32);
        let bodyMaterial = new THREE.MeshLambertMaterial({ color: 0xff0000 }); // Warna merah untuk badan
        let body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0.1, 0);
        this.obj.add(body);

        // Membuat kepala kepik lebih kecil
        let headGeometry = new THREE.SphereBufferGeometry(0.05, 32, 32);
        let headMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Warna hitam untuk kepala
        let head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(0, 0.125, 0.075);
        this.obj.add(head);

        // Membuat kaki kepik lebih kecil
        let legGeometry = new THREE.CylinderBufferGeometry(0.005, 0.005, 0.1, 32);
        let legMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Warna hitam untuk kaki
        let legPositions = [
            [-0.075, 0.05, 0.05],
            [0.075, 0.05, 0.05],
            [-0.075, 0.05, 0],
            [0.075, 0.05, 0],
            [-0.075, 0.05, -0.05],
            [0.075, 0.05, -0.05]
        ];

        legPositions.forEach(pos => {
            let leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.rotation.z = Math.PI / 4; // Memutar kaki agar menyamping
            leg.position.set(pos[0], pos[1], pos[2]);
            this.obj.add(leg);
        });

        // Membuat antena kepik lebih kecil
        let antennaGeometry = new THREE.CylinderBufferGeometry(0.0025, 0.0025, 0.05, 32);
        let antennaMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Warna hitam untuk antena
        let antennaPositions = [
            [-0.025, 0.175, 0.1],
            [0.025, 0.175, 0.1]
        ];

        antennaPositions.forEach(pos => {
            let antenna = new THREE.Mesh(antennaGeometry, antennaMaterial);
            antenna.rotation.x = Math.PI / 4; // Memutar antena ke depan
            antenna.position.set(pos[0], pos[1], pos[2]);
            this.obj.add(antenna);
        });

        // Menambahkan bintik-bintik hitam pada badan kepik lebih kecil
        let dotGeometry = new THREE.SphereBufferGeometry(0.01, 32, 32);
        let dotMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 }); // Warna hitam untuk bintik
        let dotPositions = [
            [0.05, 0.125, 0.025],
            [-0.05, 0.125, -0.025],
            [0.025, 0.15, -0.05],
            [-0.025, 0.15, 0.05],
            [0.05, 0.125, -0.05],
            [-0.05, 0.125, 0.05]
        ];

        dotPositions.forEach(pos => {
            let dot = new THREE.Mesh(dotGeometry, dotMaterial);
            dot.position.set(pos[0], pos[1], pos[2]);
            this.obj.add(dot);
        });

        // Tambahkan beberapa koin di sekitar kepik (opsional)
        let heights = [coinSize, coinSize, 0.3, 0.5, 0.5, 0.3, coinSize, coinSize];
        for (let i = -7; i <= 7; i += 2) {
            let zPos = i / 4, rot = 90 * i / 7, index = (i + 7) / 2;
            let coin = new Coin(rot);
            coin.position.set(0, heights[index], zPos);
            this.obj.add(coin);
        }

        this.obj.userData = { type: "Ladybug" };
        return this.obj;
    }
}




//membuat koin
class Coin{
    constructor(rotation = 0){
        let geo = new THREE.TorusBufferGeometry(coinSize, coinSize*0.4, 10, 20);
        geo.applyMatrix(new THREE.Matrix4().makeRotationY(THREE.Math.degToRad(rotation)));
        let mat = new THREE.MeshLambertMaterial({color: 0x90ee90});
        return new THREE.Mesh(geo, mat);
    }
}

//fungsi
//memulai game
const startGame = () => {
    swal({
        title: "Sonic",
        text: (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ? 'Geser ke atas untuk melompat, ke bawah untuk berguling, dan ke kiri/kanan untuk berpindah jalur.' : 'Gunakan tombol panah untuk bergerak.\nTekan atas untuk melompat, bawah untuk berguling, dan kiri atau kanan untuk berpindah jalur.',
        button: "mulai",
        closeOnClickOutside: false,
        closeOnEsc: false,
    }).then(() => {
        clock.start();
        update();
    });
}

//mengulang game
const restartGame = () => {
    swal({
        title: "YAH!",
        text: "sonic pusing.",
        buttons: {
            confirm: "main lagi?",
            cancel: "keluar!"
        },
        closeOnClickOutside: false,
        closeOnEsc: false
    }).then(val => {
        if (val) {
            document.location.reload(false);
        } else{
            swal(`Coins: ${score}`, {
                closeOnClickOutside: false,
                closeOnEsc: false,
                button: false
            });
        }
    });
}

const loadSounds = () => {
    let listener = new THREE.AudioListener();
    camera.add(listener);
    let audioLoader = new THREE.AudioLoader();
    
    jumpSound = new THREE.Audio(listener);
    audioLoader.load('jump.mp3', buffer => {
        jumpSound.setBuffer(buffer);
        jumpSound.setLoop(false);
        jumpSound.setVolume(1);
    });

    crashSound = new THREE.Audio(listener);
    audioLoader.load('crash.mp3', buffer => {
        crashSound.setBuffer(buffer);
        crashSound.setLoop(false);
        crashSound.setVolume(1);
    });

    levelUpSound = new THREE.Audio(listener);
    audioLoader.load('levelUp.mp3', buffer => {
        levelUpSound.setBuffer(buffer);
        levelUpSound.setLoop(false);
        levelUpSound.setVolume(1);
    });

    deadSound = new THREE.Audio(listener);
    audioLoader.load('dead.mp3', buffer => {
        deadSound.setBuffer(buffer);
        deadSound.setLoop(false);
        deadSound.setVolume(0.5);
    });
}


//penerang
const addLight = () => {
    //cahaya
    let light = new THREE.HemisphereLight(0xffffff, 0x000000, 2);
    scene.add(light);
    //matahari
    let sunGeometry = new THREE.SphereBufferGeometry(0.25, 12, 12);
    let sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff99, transparent: true, opacity: 0.8 });
    let sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(-2, 4, -3);
    scene.add(sun);
    let glowGeometry = new THREE.SphereBufferGeometry(0.54, 12, 12);
    let glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            viewVector: {type: "v3", value: camera.position}
        },
        vertexShader: document.getElementById('vertexShader').textContent,
        fragmentShader: document.getElementById('fragmentShader').textContent,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
    glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.set(sun.position.x, sun.position.y, sun.position.z);
    scene.add(glow);

    // Fungsi untuk menambahkan pelangi
const addRainbow = () => {
    const colors = [0xff0000, 0xff7f00, 0xffff00, 0x00ff00, 0x0000ff, 0x4b0082, 0x9400d3]; // Warna pelangi
    const radius = 0.5; // Radius pelangi
    const tubeRadius = 0.05; // Tebal torus

    for (let i = 0; i < colors.length; i++) {
        let rainbowGeometry = new THREE.TorusBufferGeometry(radius + i * tubeRadius, tubeRadius, 16, 100);
        let rainbowMaterial = new THREE.MeshBasicMaterial({ color: colors[i], transparent: true, opacity: 0.8 });
        let rainbow = new THREE.Mesh(rainbowGeometry, rainbowMaterial);

        rainbow.rotation.x = Math.PI / 2; // Rotasi torus untuk membentuk cincin horizontal
        rainbow.position.set(-2, 4, -3); // Posisi pelangi sama dengan posisi matahari sebelumnya
        scene.add(rainbow);
    }
}

// Panggil fungsi untuk menambahkan pelangi
addRainbow();

}

//laut
const addSea = () => {
    let seaGeometry = new THREE.PlaneBufferGeometry(1000, 1000);
    seaGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(THREE.Math.degToRad(90)));
    seaGeometry.applyMatrix(new THREE.Matrix4().makeTranslation(0, -2, -seaGeometry.parameters.height/2+10));
    let seaMaterial = new THREE.MeshBasicMaterial({ color: 0x2eccfa, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    let sea = new THREE.Mesh(seaGeometry, seaMaterial);
    scene.add(sea);
}
//nambah sonic
const spawnSonic = (pos, scale) => {
    let loader = new THREE.GLTFLoader();
    loader.load("sonic.glb", gltf => {
        sonic = gltf.scene.children[0];
        sonic.applyMatrix(new THREE.Matrix4().makeRotationY(THREE.Math.degToRad(180)));
        sonic.applyMatrix(new THREE.Matrix4().makeScale(scale, scale, scale));
        sonic.position.set(pos.x, pos.y, pos.z);
        //sonic.add(new THREE.AxesHelper(20));  //show axes
        scene.add(sonic);
        //bikin sonic lari
        animationMixer = new THREE.AnimationMixer(sonic);
        animations.run = animationMixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Walk"));
        animations.roll = animationMixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Spin"));
        animations.jump = animationMixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Up"));
        animations.fall = animationMixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Fall"));
        animations.dead = animationMixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, "Dead"));      
        animations.run.play();
        //mulai game
        startGame();
    });
}


//membuat lompatan sonik, lari, berguling
const monitorActions = (delta) => {
    if (sonicAction === "jump"){
        if ((1000 * clock.getElapsedTime()) - actionClock.startTime < actionClock.duration/2){
            sonic.position.y += delta*(1000*maxHeight/(actionClock.duration/2));    //enables framerate independence
            animations.run.stop();
            animations.jump.play();
        } else {
            if (sonic.position.y >= 0) sonic.position.y -= delta*(1000*maxHeight/(actionClock.duration/2));  //makes sure sonic doesn't fall beyond 0
            animations.jump.stop();
            animations.fall.play();
        }
    }
}

//lompat
const jump = () => {
    if (sonicAction === "run"){
        sonicAction = "jump";
        jumpSound.play();
        setTimeout(() => {
            sonicAction = "run";
            animations.fall.stop();
            animations.run.play();
        }, actionClock.duration);
        actionClock.startTime = 1000*clock.getElapsedTime();
    }
}

//mengguling
const roll = () => {
    if (sonicAction === "run"){
        sonicAction = "roll";
        jumpSound.play();
        animations.run.stop();
        animations.roll.play();
        setTimeout(() => {
            sonicAction = "run";
            animations.roll.stop();
            animations.run.play();
        }, actionClock.duration);
    }
}

//geser
const strafe = strafeLeft => {
    if ((currentLane == -1 && strafeLeft == true) || (currentLane == 1 && strafeLeft == false) || sonicAction !== "run" ) return;   //makes sure sonic stays in one of the lanes
    let dX = strafeLeft ? -laneWidth : laneWidth;
    let dTheta = strafeLeft ? THREE.Math.degToRad(dRot) : -THREE.Math.degToRad(dRot);
    let movement = new THREE.VectorKeyframeTrack('.position', [0, (strafeDuration)], [sonic.position.x, sonic.position.y, sonic.position.z, sonic.position.x + dX, sonic.position.y, sonic.position.z]);
    let yAxis = new THREE.Vector3(0, 0, 1).normalize();
    let qInitial = new THREE.Quaternion().setFromAxisAngle(yAxis, 0);
    let qFinal = new THREE.Quaternion().setFromAxisAngle(yAxis, dTheta);
    let rotation = new THREE.QuaternionKeyframeTrack('.quaternion', [0, (strafeDuration) / 2, (strafeDuration)], [qInitial.x, qInitial.y, qInitial.z, qInitial.w, qFinal.x, qFinal.y, qFinal.z, qFinal.w, qInitial.x, qInitial.y, qInitial.z, qInitial.w]);
    let movementClip = new THREE.AnimationClip('strafe', (strafeDuration), [movement]);
    let rotationClip = new THREE.AnimationClip('rotate', (strafeDuration), [rotation]);
    strafingMixer = new THREE.AnimationMixer(sonic);
    rotationMixer = new THREE.AnimationMixer(sonic.children[0]);
    strafingMixer.addEventListener('finished', e => {
        sonicAction = "run";
    });
    let movementAnimation = strafingMixer.clipAction(movementClip);
    movementAnimation.setLoop(THREE.LoopOnce);
    movementAnimation.clampWhenFinished = true;
    movementAnimation.play();
    let rotationAnimation = rotationMixer.clipAction(rotationClip);
    rotationAnimation.setLoop(THREE.LoopOnce);
    rotationAnimation.clampWhenFinished = true;
    rotationAnimation.play();
    sonicAction = "strafe";
    currentLane += strafeLeft ? -1 : 1;
}

//menambah rintangan
const addToPath = zPos => {
    let options = [new Mushroom(), new SmallRoadBlock(), new WitchHat(), new Ladybug()];
    let lanes = [-0.5, 0, 0.5];
    let obstacle = options.splice(Math.floor(Math.random() * options.length), 1)[0]; //picks at random
    obstacle.position.set(lanes.splice(Math.floor(Math.random() * lanes.length), 1)[0], 0, zPos);
    obstacles.push(obstacle);
    scene.add(obstacle);
    //memutuskan apakah akan menambahkan satu kendala lagi selain yang sebelumnya
    if (Math.random() >= 0.5) {
        let obstacle2 = options.splice(Math.floor(Math.random() * options.length), 1)[0];
        obstacle2.position.set(lanes.splice(Math.floor(Math.random() * lanes.length), 1)[0], 0, zPos);
        obstacles.push(obstacle2);
        scene.add(obstacle2);
    }
}

//memposisikan ulang rintangan yang berada di luar jangkauan pandangan Sonic
const readdToPath = () => {
    obstacles.forEach(obstacle => {
        if (obstacle.position.z > sonic.position.z+gap) {    //gone beyond field of view
            obstacle.position.z -= rows*gap;
            obstacle.children.forEach(mesh => mesh.visible = true);
            obstacle.position.x = obstacle.position.x==0.5? -0.5 : obstacle.position.x+0.5;
        } else {
            //tabrakan
            let crashed;
            switch(obstacle.userData.type){
                case "Mushroom":
                    crashed = sonic.position.x > obstacle.position.x - laneWidth/2 && sonic.position.x < obstacle.position.x + laneWidth/2 && obstacle.position.z + 0.5*Math.tan(THREE.Math.degToRad(21)) > sonic.position.z-0.1 && obstacle.position.z - 0.5*Math.tan(THREE.Math.degToRad(21)) < sonic.position.z+0.1;

                case "SmallRoadBlock":
                    crashed = sonic.position.x > obstacle.position.x - laneWidth/2 && sonic.position.x < obstacle.position.x + laneWidth/2 && obstacle.position.z + 0.0375 > sonic.position.z-0.1 && obstacle.position.z - 0.0125 < sonic.position.z+0.1 && sonicAction != "roll";
                    break;
                case "WitchHat":
                    crashed = sonic.position.x > obstacle.position.x - laneWidth/2 && sonic.position.x < obstacle.position.x + laneWidth/2 && obstacle.position.z + 0.125 > sonic.position.z-0.1 && obstacle.position.z - 0.125 < sonic.position.z+0.1 && sonicAction != "jump";
                    break;
                case "Ladybug":
                    crashed = sonic.position.x > obstacle.position.x - laneWidth/2 && sonic.position.x < obstacle.position.x + laneWidth/2 && obstacle.position.z + 0.05 > sonic.position.z-0.1 && obstacle.position.z - 0.05 < sonic.position.z+0.1 && sonicAction != "jump";
                    break;
            }
            if (crashed){
                animations.run.stop();
                animations.jump.stop();
                animations.roll.stop();
                sonic.position.y = 0;
                animations.dead.play();
                sonicHasCrashed = true;
                crashSound.play();
                setTimeout(() => {
                    deadSound.play();
                    let interval = setInterval(() => {
                        sonic.rotation.z-=THREE.Math.degToRad(6);
                    }, 20);
                    setTimeout(() => {
                        clearInterval(interval);
                        restartGame();
                    }, 1800);
                }, 800);
            }
        }
    });
}

//menambahkan skor ke html
const addScore = () => {
    scoreLabel = document.createElement('div');
    scoreLabel.style.position = 'absolute';
    scoreLabel.style.top = '0px';
    scoreLabel.style.left = '0px';
    scoreLabel.style.width = '100%';
    scoreLabel.style.height = '30px';
    scoreLabel.style.fontSize = '25px';
    scoreLabel.style.fontWeight = 'bold';
    scoreLabel.style.color = 'black';
    scoreLabel.style.textShadow = '0px 0px 10px #000000';
    scoreLabel.style.textAlign = 'left';
    scoreLabel.style.verticalAlign = 'middle';
    scoreLabel.style.lineHeight = '30px';
    scoreLabel.innerHTML = `Koin: ${score}`;
    document.body.appendChild(scoreLabel);
}

//nambah level
const addLevel = () => {
    levelLabel = document.createElement('div');
    levelLabel.style.position = 'absolute';
    levelLabel.style.top = '0px';
    levelLabel.style.left = '0px';
    levelLabel.style.width = '100%';
    levelLabel.style.height = '30px';
    levelLabel.style.fontSize = '25px';
    levelLabel.style.fontWeight = 'bold';
    levelLabel.style.color = 'black';
    levelLabel.style.textShadow = '0px 0px 10px #000000';
    levelLabel.style.textAlign = 'right';
    levelLabel.style.verticalAlign = 'middle';
    levelLabel.style.lineHeight = '30px';
    levelLabel.innerHTML = `Level: ${level}`;
    document.body.appendChild(levelLabel);
}

//memindahkan simpul geometri jaring agar kurang simetris
const jitter = (geometry, delta) => geometry.vertices.forEach(v => {
    v.x += map(Math.random(), 0, 1, -delta, delta);
    v.y += map(Math.random(), 0, 1, -delta, delta);
    v.z += map(Math.random(), 0, 1, -delta, delta);
});

//memetakan kembali nilai yang diberikan dari kisaran [smin,smax], eg [0,1], to [emin,emax], eg [0,0.5]
const map = (val, smin, smax, emin, emax) => (emax-emin)*(val-smin)/(smax-smin) + emin;

//memutar geometri pada sumbu dan poros tertentu
const rotateAbout = (geometry, meshPosition, axis, axisPosition, angle) => {
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(meshPosition.x-axisPosition.x, meshPosition.y-axisPosition.y, meshPosition.z-axisPosition.z));  //translate geometry to axis location
    geometry.applyMatrix(new THREE.Matrix4().makeRotationAxis(axis, angle));    //rotate geometry about axis
    geometry.applyMatrix(new THREE.Matrix4().makeTranslation(axisPosition.x-meshPosition.x, axisPosition.y-meshPosition.y, axisPosition.z-meshPosition.z));  //translate geometry back to original location
}

//lingkaran game
const update = () => {
    stats.begin();
    if (!sonicHasCrashed) {delta = clock.getDelta();
    worlds.forEach((item, index) => {
        let prevIndex = index == 0 ? worlds.length - 1 : index - 1;
        if (item.position.z >= 12) item.position.z = worlds[prevIndex].position.z - 12;
        item.position.z += speed*delta;    //membuat kecepatan game konsisten terlepas dari framerate
    });
    speed += 0,1*delta; //secara bertahap meningkatkan kecepatan
    obstacles.forEach(obstacle => {
        obstacle.position.z += speed*delta;
        obstacle.children.forEach(coin => {
            if (coin.geometry.type != "TorusBufferGeometry") return; //lewati iterasi ini (elemen bukan koin)
            if (sonic){
                if (sonic.position.x > obstacle.position.x - laneWidth/2 && sonic.position.x < obstacle.position.x + laneWidth/2 && obstacle.position.z+coin.position.z >= sonic.position.z){
                    //mendapat koin (tambah skor)
                    if (coin.visible){
                        score++;
                        scoreLabel.innerHTML = `Koin: ${score}`;
                        if (score % 100 == 0 && score != 0){
                            levelUpSound.play();
                            level++;
                            levelLabel.innerHTML = `Level: ${level}`;
                            scoreLabel.style.color = '#ff0000';
                            let index = 1, colors = ['#ff0000', '#ffa500', '#ffff00', '#00ff00', '#0000ff', '#ee82ee'], interval = setInterval(() => {
                                scoreLabel.style.color = colors[index];
                                levelLabel.style.visibility = index % 2 ? "hidden" : "visible";
                                index++;
                            }, 500);
                            setTimeout(() => {
                                clearInterval(interval);
                                scoreLabel.style.color = '#ffffff';
                                levelLabel.style.visibility = "visible";
                            }, 2999);
                        }
                    };
                    coin.visible = false;
                }
            }
        })
    });
    if (sonic) readdToPath();
    monitorActions(delta);
    if (animationMixer) animationMixer.update(delta);
    if (strafingMixer) strafingMixer.update(delta);
    if (rotationMixer) rotationMixer.update(delta);}
    glow.material.uniforms.viewVector.value = new THREE.Vector3().subVectors(camera.position, glow.position);
    render();
    stats.end();
    animationFrame = requestAnimationFrame(update);
}

//render
const render = () => {
    renderer.render(scene, camera);
}

//event handler(s)
//resize
const onPageResize = () => {
    if (camera){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }
    if (renderer) renderer.setSize(window.innerWidth, window.innerHeight);
}
//tombol panah laptop
const onKeyDown = event => {
    switch (event.keyCode) {
        case 37:
            //kiri
            strafe(true);
            break;
        case 38:
            //loncat
            space();
            break;
        case 39:
            //kanan
            strafe(false);
            break;
        case 40:
            //guling
            roll();
            break;
    }
}
//geser 
let xDown = null;
let yDown = null;
const getTouches = event => {
    return event.touches || event.originalEvent.touches;
}
const onTouchStart = event => {
    const firstTouch = getTouches(event)[0];
    xDown = firstTouch.clientX;
    yDown = firstTouch.clientY;
};
const onTouchMove = event => {
    if (!xDown || !yDown) {
        return;
    }
    let xUp = event.touches[0].clientX;
    let yUp = event.touches[0].clientY;
    let xDiff = xDown - xUp;
    let yDiff = yDown - yUp;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 0) {
            //kiri
            strafe(true);
        } else {
            //kanan
            strafe(false);
        }
    } else {
        if (yDiff > 0) {
            //lompat
            space();
        } else {
            //guling
            roll();
        }
    }
    xDown = null;
    yDown = null;
};

//event listener(s)
window.addEventListener('resize', onPageResize, false);
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {  // Ganti dari 'ArrowUp' ke 'Space'
        jump();
    }
});
document.addEventListener('keydown', onKeyDown, false);
document.addEventListener('touchstart', onTouchStart, false);
document.addEventListener('touchmove', onTouchMove, false);

//********************