function runGame() {
    $('#help').show();
    $('#help-close').click(function() {
        $('#help').fadeOut(200);
    });
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x91e3f4);
    var camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 10000);
    var renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMapSoft = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute("id", "mainCanvas");
    //renderer.domElement.style.display = "none";
    document.body.appendChild(renderer.domElement);

    var rendererStats = new THREEx.RendererStats();
    rendererStats.domElement.style.position = 'absolute';
    rendererStats.domElement.style.left = '0px';
    rendererStats.domElement.style.bottom = '0px';
    rendererStats.domElement.style.zIndex = '2';
    document.body.appendChild(rendererStats.domElement);

    var stats = new Stats();
    stats.showPanel(0);
    document.body.appendChild(stats.dom);

    var spriteCanvas = document.createElement('canvas');
    spriteCanvas.id = 'spriteCanvas';
    spriteCanvas.style.position = 'absolute';
    spriteCanvas.style.left = '0px';
    spriteCanvas.style.bottom = '0px';
    spriteCanvas.style.zIndex = '1';
    //spriteCanvas.style.display = "none";
    spriteCanvas.width = window.innerWidth;
    spriteCanvas.height = window.innerHeight;
    var spriteCtx = spriteCanvas.getContext("2d");
    document.body.appendChild(spriteCanvas);

    camera.position.x = 50;
    camera.position.z = 50;
    camera.position.y = 80;
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    scene.fog = new THREE.Fog(0x6bbeee, 0, 200);

    var players = {};
    var playerMeshes = {};
    var meshes = {};
    var ground;
    var grassGroup = new THREE.Object3D();
    var grassShader;
    var grassTiles = [];
    var grassMesh;
    var clock = new THREE.Clock();
    var cameraRotation = {
        x: 0,
        y: 0
    };
    var attackPos = [0,0];
    var attackMoveCoef = 0.8;
    var treeMesh;
    var treeScale = 7;
    var trees = [
        [54,49],
        [112,75],
        [134,43],
        [144,101],
        [178,62],
        [83,145],
        [48,113],
        [67,184],
        [115,198],
        [180,207],
        [213,165],
        [175,141],
        [221,152],
        [214,86]
    ];
    var chatTrigger = false;
    var requestedElement = document.getElementById("spriteCanvas");

    var manager = new THREE.LoadingManager();
    var jsonLoader = new THREE.JSONLoader(manager);
    var objectLoader = new THREE.ObjectLoader(manager);

    objectLoader.load("models/tree.json", function (mesh) {
        var twigMaterial = mesh.children[0].material[1];
        var barkMaterial = mesh.children[0].material[0];
        twigMaterial.alphaTest = 0.5;
        twigMaterial.transparent = true;
        twigMaterial.doubleSided = true;
        twigMaterial.side = THREE.DoubleSide;
        mesh.castShadow = false;
        mesh.receiveShadow = true;
        mesh.children[0].receiveShadow = true;
        mesh.children[0].castShadow = false;
        mesh.scale.set(treeScale,treeScale,treeScale);
        treeMesh = mesh;
        for ( var i = 0; i<trees.length; i++ ) {
            var mesh = treeMesh.clone();
            var pos = {
                x: trees[i][0] * 2,
                z: trees[i][1] * 2
            };
            mesh.position.set(pos.x, getHeightByCoords(pos.x, pos.z), pos.z);
            mesh.rotation.y = toRad(randomFloat(0,360));
            scene.add(mesh);
        }
    });

    var geometry = new THREE.BoxGeometry( 1, 1, 1 );
    var material = new THREE.MeshPhongMaterial({color: 0x7777ff});
    meshes.player = new THREE.Mesh( geometry, material );
    meshes.player.castShadow = true;
    meshes.player.receiveShadow = true;

    var heightMap = new Image();
    heightMap.src = "textures/heightmap.jpg";

    var texMap = new Image();
    texMap.src = "textures/texmap.png";

    (heightMap && texMap).onload = function () {
        manager.onProgress = function (item, loaded, total) {
            if (loaded == total) {
                console.log('loaded ' + total);
                var data = getHeightData(heightMap);
                var geometry = new THREE.PlaneGeometry(512,512,255,255);
                for ( var i = 0; i<geometry.vertices.length; i++ ) {
                    geometry.vertices[i].z = data[i];
                }
                geometry.computeFaceNormals();
                geometry.computeVertexNormals();
                var heightmap = THREE.ImageUtils.loadTexture( 'textures/heightmap.jpg' );
                var texmap = THREE.ImageUtils.loadTexture( 'textures/texmap.png' );
                var map = new THREE.ImageUtils.loadTexture( 'textures/grass5.jpg' );
                var map2 = new THREE.ImageUtils.loadTexture( 'textures/rock.jpg' );
                var map3 = new THREE.ImageUtils.loadTexture( 'textures/ground.jpg' );
                var specular = new THREE.ImageUtils.loadTexture( 'textures/specular.jpg' );
                var normal = new THREE.ImageUtils.loadTexture( 'textures/normalGrass.png' );
                var normal2 = new THREE.ImageUtils.loadTexture( 'textures/normal2.png' );
                var normal3 = new THREE.ImageUtils.loadTexture( 'textures/normalDirt.png' );
                map.wrapS = map.wrapT = THREE.RepeatWrapping;
                map2.wrapS = map2.wrapT = THREE.RepeatWrapping;
                map3.wrapS = map3.wrapT = THREE.RepeatWrapping;
                //specular.wrapS = specular.wrapT = THREE.RepeatWrapping;
                normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
                normal2.wrapS = normal2.wrapT = THREE.RepeatWrapping;
                normal3.wrapS = normal3.wrapT = THREE.RepeatWrapping;
                //specular.repeat.x = specular.repeat.y = 32;
                var material = new THREE.MeshPhongMaterial( {
                    map: map,
                    normalMap: normal,
                    shininess: 10
                } );
                material.onBeforeCompile = function ( shader ) {
                    shader.uniforms.time = { value: 0 };
                    shader.uniforms.texture1 = { value: map };
                    shader.uniforms.texture2 = { value: map2 };
                    shader.uniforms.texture3 = { value: map3 };
                    shader.uniforms.normalMap2 = { value: normal2 };
                    shader.uniforms.normalMap3 = { value: normal3 };
                    shader.uniforms.heightmap = { value: heightmap };
                    shader.uniforms.texmap = { value: texmap };
                    shader.fragmentShader = 'uniform sampler2D texture1;\nuniform sampler2D texture2;\nuniform sampler2D texture3;\nuniform sampler2D heightmap;\nuniform sampler2D texmap;\n' + shader.fragmentShader;
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        [
                            '#ifdef USE_MAP',
                            'vec4 heightColor = texture2D( heightmap, vUv );',
                            'vec4 texColor = texture2D( texmap, vUv );',
                            'vec4 color1 = texture2D( texture1, vUv * 32.0 );',
                            'vec4 color2 = texture2D( texture2, vUv * 64.0 );',
                            'vec4 color3 = texture2D( texture3, vUv * 64.0 );',
                            'vec4 mapColor = color1 * abs(texColor.g - 1.0) * abs(texColor.r - 1.0) + color2 * texColor.r + color3 * texColor.g;',
                            'vec4 texelColor = mapTexelToLinear( mapColor );',
                            'diffuseColor *= texelColor;',
                            '#endif'
                        ].join( '\n' )
                    );

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <normalmap_pars_fragment>',
                        [
                            '#ifdef USE_NORMALMAP',
                            'uniform sampler2D normalMap;',
                            'uniform sampler2D normalMap2;',
                            'uniform sampler2D normalMap3;',
                            'uniform vec2 normalScale;',
                            'vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm ) {',
                            'vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );',
                            'vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );',
                            'vec2 st0 = dFdx( vUv.st );',
                            'vec2 st1 = dFdy( vUv.st );',
                            'float scale = sign( st1.t * st0.s - st0.t * st1.s ); // we do not care about the magnitude',
                            'vec3 S = normalize( ( q0 * st1.t - q1 * st0.t ) * scale );',
                            'vec3 T = normalize( ( - q0 * st1.s + q1 * st0.s ) * scale );',
                            'vec3 N = normalize( surf_norm );',
                            'vec4 texColor = texture2D( texmap, vUv );',
                            'vec3 simpleNormal = vec3(0.5, 0.5, 1.0);',
                            //texture2D( normalMap3, vUv * 64.0 ).xyz
                            'vec3 mapN = ( simpleNormal * texColor.g + simpleNormal * texColor.r + simpleNormal * abs(texColor.g - 1.0) * abs(texColor.r - 1.0) ) * 2.0 - 1.0;',
                            'mapN.xy = normalScale * mapN.xy;',
                            'mat3 tsn = mat3( S, T, N );',
                            'return normalize( tsn * mapN );',
                            '}',
                            '#endif'
                        ].join( '\n' )
                    );
                };

                ground = new THREE.Mesh( geometry, material );
                ground.rotation.x = toRad(-90);
                ground.position.set(256, 0, 256);
                ground.receiveShadow = true;
                ground.castShadow = true;
                scene.add(ground);

                var geometry = new THREE.PlaneGeometry( 2, 2 );

                var spriteMap = [
                    new THREE.TextureLoader().load( "textures/sprites/grass1.png" ),
                    new THREE.TextureLoader().load( "textures/sprites/grass2.png" ),
                    new THREE.TextureLoader().load( "textures/sprites/grass3.png" ),
                    new THREE.TextureLoader().load( "textures/sprites/grass4.png" )
                ];

                var grassTypeMap = new THREE.ImageUtils.loadTexture( 'textures/grassTypeMap.png' );

                var spriteMaterial = new THREE.MeshPhongMaterial({
                    map: spriteMap[0],
                    transparent: true
                });

                spriteMaterial.onBeforeCompile = function ( shader ) {
                    shader.uniforms.time = { value: 0 };
                    shader.uniforms.playerPos = { value: new THREE.Vector2(200,200) };
                    shader.uniforms.grassTypeMap = { value: grassTypeMap };
                    shader.uniforms.grassMap1 = { value: spriteMap[0] };
                    shader.uniforms.grassMap2 = { value: spriteMap[1] };
                    shader.uniforms.grassMap3 = { value: spriteMap[2] };
                    shader.uniforms.grassMap4 = { value: spriteMap[3] };
                    shader.vertexShader = 'uniform float time;\nuniform vec2 playerPos;\n' + shader.vertexShader;
                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <project_vertex>',
                        [
                            'vec4 mvPosition = modelViewMatrix * vec4( transformed, 1.0 );',
                            'float distToCamera = -mvPosition.z;',

                            'float newScale = 1.0;',
                            'if(distToCamera > 90.0 && distToCamera < 100.0) { float distanceDelta = abs((distToCamera - 90.0) / 10.0 - 1.0); newScale = distanceDelta; }',
                            'if(distToCamera > 100.0) { newScale = 0.0; }',
                            'vec3 scale = vec3(newScale,newScale,newScale);',
                            'float rotation = 0.0;',
                            'vec3 alignedPosition = vec3(position.x * scale.x, position.y * scale.y, position.z * scale.z);',
                            'vec2 pos = alignedPosition.xy;',
                            'vec2 rotatedPosition;',
                            'rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;',
                            'rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;',
                            'vec4 finalPosition;',
                            'finalPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );',
                            'finalPosition.xy += rotatedPosition;',
                            'finalPosition = projectionMatrix * finalPosition;',
                            'gl_Position = finalPosition;'
                        ].join( '\n' )
                    );
                    shader.fragmentShader = 'uniform float time;\nuniform sampler2D grassTypeMap;\nuniform sampler2D grassMap1;\nuniform sampler2D grassMap2;\nuniform sampler2D grassMap3;\nuniform sampler2D grassMap4;\n' + shader.fragmentShader;
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <map_fragment>',
                        [
                            '#ifdef USE_MAP',
                            'vec4 texelColor = texture2D( grassMap2, vUv );',
                            'texelColor = mapTexelToLinear( texelColor );',
                            'diffuseColor *= texelColor;',
                            '#endif'
                        ].join( '\n' )
                    );

                    grassShader = shader;
                };

                grassMesh = new THREE.Mesh( geometry, spriteMaterial );
                grassMesh.receiveShadow = true;

                animate();

                var havePointerLock = 'pointerLockElement' in document ||
                    'mozPointerLockElement' in document ||
                    'webkitPointerLockElement' in document;

                requestedElement.requestPointerLock = requestedElement.requestPointerLock ||
                    requestedElement.mozRequestPointerLock ||
                    requestedElement.webkitRequestPointerLock;

                document.exitPointerLock =  document.exitPointerLock ||
                    document.mozExitPointerLock ||
                    document.webkitExitPointerLock;

                var isLocked = function(){
                    return requestedElement === document.pointerLockElement ||
                        requestedElement === document.mozPointerLockElement ||
                        requestedElement === document.webkitPointerLockElement;
                }

                requestedElement.addEventListener('click', function(e){
                    if(e.which == 1) {
                        if(!isLocked()){
                            if(!chatTrigger) {
                                requestedElement.requestPointerLock();
                            }
                        } else {
                            //document.exitPointerLock();
                        }
                    }

                }, false);

                var changeCallback = function() {
                    if(!havePointerLock){
                        alert('Your browser does not support pointer-lock.');
                        return;
                    }
                    if (isLocked()) {
                        document.addEventListener("mousemove", moveCallback, false);
                        document.body.classList.add('locked');
                    } else {
                        document.removeEventListener("mousemove", moveCallback, false);
                        document.body.classList.remove('locked');
                    }
                }

                document.addEventListener('pointerlockchange', changeCallback, false);
                document.addEventListener('mozpointerlockchange', changeCallback, false);
                document.addEventListener('webkitpointerlockchange', changeCallback, false);

                var moveCallback = function(e) {
                    var x = e.movementX ||
                        e.mozMovementX ||
                        e.webkitMovementX ||
                        0;

                    var y = e.movementY ||
                        e.mozMovementY ||
                        e.webkitMovementY ||
                        0;

                    cameraRotation.x -= x / 3;
                    cameraRotation.y += y / 3;
                    var maxRotation = 89.99;
                    if(cameraRotation.y > maxRotation) cameraRotation.y = maxRotation;
                    if(cameraRotation.y < -10) cameraRotation.y = -10;
                };

                socket.on('state', function (serverPlayers) {
                    players = serverPlayers;
                    for (var socketId in players) {
                        if (typeof playerMeshes[socketId] === 'object') {
                            if(playerMeshes[socketId].hp > 0 && players[socketId].hp == 0) {
                                if(socketId == clientId) {
                                    document.exitPointerLock();
                                    $('#deathScreen').fadeIn(200);
                                }
                                playerMeshes[socketId].position.y -= 0.5;
                            }
                            playerMeshes[socketId].hp = players[socketId].hp;
                        } else {
                            playerMeshes[socketId] = meshes.player.clone();
                            playerMeshes[socketId].material = meshes.player.material.clone();
                            playerMeshes[socketId].material.color.setHex( players[socketId].color );
                            playerMeshes[socketId].position.x = players[socketId].x;
                            playerMeshes[socketId].position.z = players[socketId].z;
                            playerMeshes[socketId].position.y = getHeightByCoords(players[socketId].x,players[socketId].z) + 0.5;
                            players[socketId].y = playerMeshes[socketId].position.y;
                            playerMeshes[socketId].name = socketId;
                            playerMeshes[socketId].hp = players[socketId].hp;
                            scene.add(playerMeshes[socketId]);
                        }
                    }
                    for (var socketId in playerMeshes) {
                        if (typeof players[socketId] === 'undefined') {
                            scene.remove(playerMeshes[socketId]);
                            delete playerMeshes[socketId];
                        }
                    }
                });
                socket.on('attackReaction', function (pos) {
                    if(typeof playerMeshes[clientId] === "object") {
                        var vector = new THREE.Vector2(pos[0] - playerMeshes[clientId].position.x, pos[1] - playerMeshes[clientId].position.z);
                        vector = vector.normalize();
                        attackPos[0] = vector.x;
                        attackPos[1] = vector.y;
                    }
                });

                socket.on('attackDamage', function (socketId) {
                    if(typeof playerMeshes[socketId] === "object") {
                        playerMeshes[socketId].material.emissive.setHex( 0xff0000 );
                        setTimeout(function (){
                            playerMeshes[socketId].material.emissive.setHex( playerMeshes[socketId].currentHex );
                        }, 1000);
                    }
                });

                socket.on('killerName', function (socketId) {
                    $('#killer').text(socketId);
                });

                socket.on('chatGet', function (msgObj) {
                    var msg = msgObj.text;
                    var sender = msgObj.sender;
                    $('.chat-main').prepend('<div class="chat-msg"><span class="chat-msg-nickname">' + sender + '</span>:<span class="chat-msg-text">' + msg + '</span></div>');
                    var numberOfChildren = $('.chat-main').children().length;
                    if (numberOfChildren >= 50) {
                        $('.chat-msg').last().remove();
                    }
                    if ($('.chat-main').scrollTop == ($('.chat-main').scrollHeight - $('.chat-main').offsetHeight)) {
                        var sHeight = $('.chat-main')[0].scrollHeight;
                        $('.chat-main').scrollTop(sHeight);
                    }
                });

                setInterval(function () {
                    var obj = {
                        x: playerMeshes[clientId].position.x,
                        z: playerMeshes[clientId].position.z,
                        y: playerMeshes[clientId].position.y,
                        rotation: playerMeshes[clientId].rotation.y
                    };
                    socket.emit('playerState', obj);
                }, 1000 / 15);

                $('#respawn').click(function() {
                    socket.emit('respawn');
                    location.reload();
                });

                $('.chat-form').submit(function () {
                    socket.emit('chatSend', $('.chat-input').val());
                    $('.chat-input').val('');
                    return false;
                });
            }
        }
    };


    var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 4096;
    dirLight.shadow.mapSize.height = 4096;
    dirLight.color.setHSL( 0.1, 1, 0.95 );
    var d = 150;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    dirLight.shadow.camera.far = 35000;
    //dirLight.shadow.bias = -0;
    scene.add(dirLight);
    scene.add(dirLight.target);
    var ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    var delta = 0;
    var theta = 0;

    function animate(time) {
        delta = clock.getDelta();
        theta = clock.getElapsedTime();
        ground.geometry.verticesNeedUpdate = true;

        for (var socketId in players) {
            var player = players[socketId];
            var mesh = playerMeshes[socketId];
            if(typeof mesh === 'object') {
                if(socketId == clientId) {
                    if(players[clientId].hp > 0) {
                        if(attackPos[0] != 0 && attackPos[1] != 0) {
                            var deltaX = attackPos[0] * attackMoveCoef;
                            var deltaZ = attackPos[1] * attackMoveCoef;
                            playerMeshes[socketId].position.x -= attackPos[0] - deltaX;
                            playerMeshes[socketId].position.z -= attackPos[1] - deltaZ;
                            attackPos = [deltaX , deltaZ];
                            playerMeshes[socketId].position.y = getHeightByCoords(playerMeshes[socketId].position.x, playerMeshes[socketId].position.z) + 0.5;
                        }
                        if(movement.up || movement.down) {
                            var newX, newZ;

                            if(movement.up) {
                                newX = mesh.position.x - Math.sin(toRad(cameraRotation.x)) * (delta * 10);
                                newZ = mesh.position.z - Math.cos(toRad(cameraRotation.x)) * (delta * 10);
                                var heightX = newX - (Math.sin(toRad(cameraRotation.x)) * 1);
                                var heightZ = newZ - (Math.cos(toRad(cameraRotation.x)) * 1);
                                var newHeight = getHeightByCoords(heightX,heightZ);
                                if(newHeight - (mesh.position.y - 0.5) < 1) {
                                    playerMeshes[socketId].position.y = getHeightByCoords(newX,newZ) + 0.5;
                                    playerMeshes[socketId].position.x = newX;
                                    playerMeshes[socketId].position.z = newZ;
                                    player.x = playerMeshes[socketId].position.x;
                                    player.z = playerMeshes[socketId].position.z;
                                    player.y = playerMeshes[socketId].position.y;
                                }
                            }

                            if(movement.down) {
                                newX = mesh.position.x + Math.sin(toRad(cameraRotation.x)) * (delta * 5);
                                newZ = mesh.position.z + Math.cos(toRad(cameraRotation.x)) * (delta * 5);
                                var heightX = newX + (Math.sin(toRad(cameraRotation.x)) * 1);
                                var heightZ = newZ + (Math.cos(toRad(cameraRotation.x)) * 1);
                                var newHeight = getHeightByCoords(heightX,heightZ);
                                if(newHeight - (mesh.position.y - 0.5) < 1) {
                                    playerMeshes[socketId].position.y = getHeightByCoords(newX,newZ) + 0.5;
                                    playerMeshes[socketId].position.x = newX;
                                    playerMeshes[socketId].position.z = newZ;
                                    player.x = playerMeshes[socketId].position.x;
                                    player.z = playerMeshes[socketId].position.z;
                                    player.y = playerMeshes[socketId].position.y;
                                }
                            }


                        }
                    }
                    camera.position.x = mesh.position.x + (Math.sin(toRad(cameraRotation.x)) * 10) * Math.cos(toRad(-cameraRotation.y));
                    camera.position.z = mesh.position.z + (Math.cos(toRad(cameraRotation.x)) * 10) * Math.cos(toRad(-cameraRotation.y));
                    camera.position.y = mesh.position.y + Math.sin(toRad(cameraRotation.y)) * 10;
                    if(players[clientId].hp > 0) {
                        mesh.rotation.y = toRad(cameraRotation.x % 360);
                    }
                    dirLight.position.set(mesh.position.x + 400, 500, mesh.position.z + 300);
                    dirLight.target.position.set(mesh.position.x, 0, mesh.position.z);

                    var cameraPositionHeight = getHeightByCoords(camera.position.x,camera.position.z);
                    if(camera.position.y < cameraPositionHeight + 0.3) camera.position.y = cameraPositionHeight + 0.3;
                    camera.lookAt( mesh.position );

                    /*if(grassTiles.length == 0) {
                        for (var i = 0; i < 2000; i++) {
                            var grass = grassMesh.clone();
                            grass.position.x = randomFloat(100, 340);
                            grass.position.z = randomFloat(100, 340);
                            var pixel = getMapColorByCoords(grass.position.x, grass.position.z);
                            if(pixel[0] < 64 && pixel[1] < 64) {
                                grass.position.y = getHeightByCoords(grass.position.x, grass.position.z) + 0.7;
                                grassGroup.add(grass);
                            }
                        }
                        scene.add(grassGroup);
                    }*/

                    var tileSize = 16;
                    var currentTile = {
                        x: Math.floor(camera.position.x / tileSize),
                        z: Math.floor(camera.position.z / tileSize)
                    };
                    var minTile = {
                        x: currentTile.x - 15,
                        z: currentTile.z - 15
                    };
                    var maxTile = {
                        x: currentTile.x + 15,
                        z: currentTile.z + 15
                    };

                } else {
                    var meshPos = [mesh.position.x, mesh.position.z, mesh.position.y];
                    var serverPos = [player.x, player.z, player.y];
                    var newPos = lerp(meshPos, serverPos, delta * 15);
                    mesh.position.set(newPos[0], newPos[2], newPos[1]);
                    var currentRotation = mesh.rotation.y;
                    mesh.rotation.y = angleLerp(currentRotation, player.rotation, 0.5);

                }
            }
        }

        if (grassShader) {
            grassShader.uniforms.time.value = performance.now() / 1000;
            if(playerMeshes[clientId]) {
                grassShader.uniforms.playerPos.value = new THREE.Vector2(playerMeshes[clientId].position.x, playerMeshes[clientId].position.z);
            }
        }
        renderer.render(scene, camera);
        spriteCtx.clearRect(0, 0, spriteCanvas.width, spriteCanvas.height);
        for (var socketId in playerMeshes) {
            if(socketId !== clientId) {
                var dist = distancePointPoint(camera.position.x, camera.position.z, playerMeshes[socketId].position.x, playerMeshes[socketId].position.z);
                if(dist < 50) {
                    var normalized = Math.abs(dist / 50 - 1);
                    if(normalized < 0.2) normalized = 0.2;
                    var mesh = playerMeshes[socketId];
                    var p = new THREE.Vector3(mesh.position.x, mesh.position.y + 1, mesh.position.z);
                    var vector = p.project(camera);
                    if(vector.z < 1) {
                        vector.x = (vector.x + 1) / 2 * spriteCanvas.width;
                        vector.y = -(vector.y - 1) / 2 * spriteCanvas.height;
                        spriteCtx.fillStyle = '#ffffff';
                        spriteCtx.textAlign = 'center';
                        spriteCtx.font = '900 ' + 18*1 + 'px "Roboto"';
                        spriteCtx.fillText(players[socketId].name, vector.x, vector.y);
                    }

                }

            }
        }
        requestAnimationFrame( animate );
        stats.begin();
        stats.end();
        rendererStats.update(renderer);
        TWEEN.update(time);
    };

    document.addEventListener('mousedown', onMouseDown, false);
    function onMouseDown(e) {
        var clientAngle = normalizeAngle(toDeg(playerMeshes[clientId].rotation.y));
        var arr = [];
        var nearestEnemy = ["", 999];
        for (var socketId in playerMeshes) {
            if(socketId != clientId) {
                var angleToEnemy = normalizeAngle(toDeg(Math.atan2(players[socketId].x - players[clientId].x, players[socketId].z - players[clientId].z)) + 180);
                var distToEnemy = distancePointPoint(players[socketId].x, players[socketId].z, players[clientId].x, players[clientId].z);
                var angleDifference = 180 - Math.abs(Math.abs(angleToEnemy - clientAngle) - 180);
                if(angleDifference < 30 && distToEnemy < 4) {
                    if(distToEnemy < nearestEnemy[1]) nearestEnemy = [socketId, distToEnemy];
                }
            }
        }
        if(nearestEnemy[0] != "") socket.emit('attack', nearestEnemy[0]);
    }

    window.addEventListener( 'resize', onWindowResize, false );
    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
        spriteCanvas.width = window.innerWidth;
        spriteCanvas.height = window.innerHeight;
    }

    var movement = {
        up: false,
        down: false,
        left: false,
        right: false
    }

    document.addEventListener('keydown', function (event) {
        if (!chatTrigger) {
            switch (event.keyCode) {
                case 65:
                    movement.left = true;
                    break;
                case 87:
                    movement.up = true;
                    break;
                case 68:
                    movement.right = true;
                    break;
                case 83:
                    movement.down = true;
                    break;
            }
        }
    });

    document.addEventListener('keyup', function (event) {
        switch (event.keyCode) {
            case 65:
                movement.left = false;
                break;
            case 87:
                movement.up = false;
                break;
            case 68:
                movement.right = false;
                break;
            case 83:
                movement.down = false;
                break;
            case 84:
                if (!chatTrigger) {
                    $('.chat-input').removeClass("chat-input-hidden");
                    $('.chat-main').removeClass("chat-main-hidden");
                    $('.chat-input').focus();
                    chatTrigger = true;
                    document.exitPointerLock();
                }
                break;
            case 27:
                $('.chat-input').addClass("chat-input-hidden");
                $('.chat-main').addClass("chat-main-hidden");
                chatTrigger = false;
                var sHeight = $('.chat-main')[0].scrollHeight;
                $('.chat-main').scrollTop(sHeight);
                requestedElement.requestPointerLock();
                break;
        }
    });


    var heightContext;
    function getHeightData(img,scale) {
        if (scale == undefined) scale=1;
        var canvas = document.createElement( 'canvas' );
        canvas.width = img.width;
        canvas.height = img.height;
        heightContext = canvas.getContext( '2d' );

        var size = img.width * img.height;
        var data = new Float32Array( size );

        heightContext.drawImage(img,0,0);

        for ( var i = 0; i < size; i ++ ) {
            data[i] = 0
        }

        var imgd = heightContext.getImageData(0, 0, img.width, img.height);
        var pix = imgd.data;

        var j=0;
        for (var i = 0; i<pix.length; i +=4) {
            var all = pix[i]+pix[i+1]+pix[i+2];
            data[j++] = all/(12*scale);
        }
        return data;
    }

    function getHeightByCoords(x, z) {
        var heightMapSize = 255;
        var planeSize = 512;
        var tileSize = planeSize / heightMapSize;
        var main = {
            x: Math.floor(x / planeSize * heightMapSize),
            z: Math.floor(z / planeSize * heightMapSize)
        };
        var height;
        var data = [
            {
                x: main.x,
                z: main.z
            },{
                x: main.x + 1,
                z: main.z
            },{
                x: main.x + 1,
                z: main.z + 1
            },{
                x: main.x,
                z: main.z + 1
            }
        ];
        for (var i = 0; i<data.length; i++) {
            var pixel = heightContext.getImageData(data[i].x, data[i].z, 1, 1);
            var value = pixel.data;
            var all = value[0]+value[1]+value[2];
            data[i].height = all/(12*1);

        }
        var local = {
            x: x - main.x * tileSize,
            z: z - main.z * tileSize
        };
        var localCoef = {
            x: local.x / tileSize,
            z: local.z / tileSize
        };
        if(local.x + local.z < tileSize) {
            var diff = {
                x: data[1].height - data[0].height,
                z: data[3].height - data[0].height
            };
            height = data[0].height + diff.x*localCoef.x + diff.z*localCoef.z;
        };
        if(local.x + local.z > tileSize) {
            var diff = {
                x: data[2].height - data[3].height,
                z: data[2].height - data[1].height
            };
            var origin = {
                x: data[2].height + diff.x,
                z: data[2].height + diff.z
            };
            var originHeight = data[2].height - diff.x - diff.z;
            height = originHeight + diff.x*localCoef.x + diff.z*localCoef.z;
        }
        return height;
    }

    function getMapColorByCoords(x, z) {
        var heightMapSize = 256;
        var planeSize = 512;
        var tileSize = planeSize / heightMapSize;
        x = x / tileSize;
        z = z / tileSize;
        var canvas = document.createElement( 'canvas' );
        canvas.width = texMap.width;
        canvas.height = texMap.height;
        var context = canvas.getContext( '2d' );
        context.drawImage(texMap,0,0);
        var pixel = context.getImageData(x, z, 1, 1).data;
        return pixel;
    }

    function distancePointPoint(x1, z1, x2, z2){
        var deltaX = x2 - x1;
        var deltaY = z2 - z1;
        var dist = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
        return (dist);
    };

    function toRad(degrees) {
        return degrees * Math.PI / 180;
    };

    function toDeg(radians) {
        return radians * 180 / Math.PI;
    };

    function randomFloat(min, max) {
        return Math.random() * (max - min) + min;
    }

    function lerp(a, b, t) { // a, b - массивы, t - часть от расстояния
        var len = a.length;
        if (b.length != len) return;

        var x = [];
        for (var i = 0; i < len; i++)
            x.push(a[i] + t * (b[i] - a[i]));
        return x;
    }

    function randomInteger(min, max) {
        var rand = min - 0.5 + Math.random() * (max - min + 1)
        rand = Math.round(rand);
        return rand;
    }

    function shortAngleDist(a0,a1) {
        var max = Math.PI*2;
        var da = (a1 - a0) % max;
        return 2*da % max - da;
    }

    function angleLerp(a0,a1,t) {
        return a0 + shortAngleDist(a0,a1)*t;
    }

    function normalizeAngle(a) {
        a = a % 360;
        if(a < 0) a += 360;
        return a;
    }
}

