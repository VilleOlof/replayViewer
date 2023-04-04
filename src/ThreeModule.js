var Debug = false;

var config = await new Promise((resolve, reject) => {
    fetch("../app.config.json").then(response => response.json()).then(data => {
        if (Debug) console.log(data);
        resolve(data);
    });
});

import * as THREE from '../node_modules/three/build/three.module.js'
import Stats from '../node_modules/three/examples/jsm/libs/stats.module.js'
import { OrbitControls } from '../node_modules/three/examples/jsm/controls/OrbitControls.js'
import { GLTFLoader } from '../node_modules/three/examples/jsm/loaders/GLTFLoader.js'

// Exported Variables
// "Global" Local Variables
// Local Functions
// Exported Functions

var ThreeModule = function() {

    var ManualLimitPerRequest = config.ManualLimitPerRequest;

    var scene, camera, renderer, controls;

    const serverAdress = config.serverAdress;
    //so i can access it on my local network.
    if (location.host == "192.168.88.133:82") serverAdress = "http://192.168.88.133:6969/resources/";

    var old_lines = []; var old_skybox = undefined; 
    var old_spheres = []; var old_level = undefined;
    var diposeArray = []; var timer = undefined;

    const GLTF_Loader = new GLTFLoader(); 
    const Cube_Loader = new THREE.CubeTextureLoader();
    const Texture_Loader =  new THREE.TextureLoader();

    const Standard_Sphere_Geometry = new THREE.SphereGeometry( 0.3, 16, 8 );

    var renderLines = document.getElementById("ui_lineToggle").checked;
    const playbackSpeedBase = 3;

    var Line_Start_Color = new THREE.Color(0xff00f2);
    var Line_End_Color = new THREE.Color(0x50FF00);

    var UpdateInterval = document.getElementById("ui_updateInterval").value;

    var Marble_Texture = undefined;

    var classic_Level_To_ID = {};
    var classicLevels = [];
    var customLevels = [];

    var AllSkyboxes = [];

    var AllReplays = [];
    var AllScores = [];

    var FollowMarble = {
        enabled: true,
        marble_index: 0,
        camera_distance: 40,

        Update: function(LastPoint = new THREE.Vector3(0,0,0), currentMarbleIndex = 0) {
            if (FollowMarble.enabled && FollowMarble.marble_index == currentMarbleIndex) {
                controls.target = LastPoint.clone();
            }
        }
    }

    //transparency things
    var marble_transparency = 1;
    var all_marble_transparent = false;
    var all_but_follow_transparent = false;

    var Inputs = {
        platform: "Global",
        level: "Learning to Roll",
        genericPlatform: "Classic",
        limit: 10,
        skip: 0,
        amount: 0,

        GetInputs: function() {
            Inputs.platform = document.getElementById("platform").value;

            //always global until steam & switch are added
            if (Inputs.platform != "Global") {
                Inputs.platform = "Global";
                document.getElementById("platform").value = "Global";
            }

            Inputs.level = document.getElementById("level").value;

            Inputs.skip = (document.getElementById("skip").value);
            if (Inputs.skip == undefined || Inputs.skip == "") Inputs.skip = 0;
            else Inputs.skip = parseInt(Inputs.skip);

            document.getElementById("skip").value = Inputs.skip;

            Inputs.limit = parseInt(document.getElementById("limit").value) + Inputs.skip

            Inputs.amount = Inputs.limit - Inputs.skip;

            if (Inputs.platform == "Custom") {
                Inputs.genericPlatform = "Workshop";

                if (!customLevels.includes(Inputs.level)) {
                    alert("Level not found in custom levels list")
                    Inputs.level = undefined;
                }
            } else {
                Inputs.genericPlatform = "classic";

                if (!classicLevels.includes(Inputs.level)) {
                    alert("Level not found in classic levels list")
                    Inputs.level = undefined;
                }
            }

            if (Inputs.amount > ManualLimitPerRequest) {
                Inputs.amount = ManualLimitPerRequest;
            }

            if (Debug) console.log("Inputs: " + Inputs.platform + " " + Inputs.level + " " + Inputs.limit + " " + Inputs.skip)
        }
    }

    var ReplayStateData = DefaultStateData();
    var stats = new Stats();

    var ShowStats = false;

    function AddControls() {
        if (Debug) console.log("Adding Controls")

        controls = new OrbitControls(camera, renderer.domElement);
        controls.update();
        controls.enableDamping = true;
        controls.zoomSpeed = 3;
        controls.target = new THREE.Vector3(-49.85,-1.41,2.99);
    }

    function DefaultStateData() {
        if (Debug) console.log("Resetting State Data")

        return {
            replay: [],
            replay_Omega: [],
            replay_timeIndex: [],
            saved_geometry: [],
            spheres: [],
            time: 0,
            timeArray: [],
            deltaTime: 0,
            maxTime: 0,
            hasInit: false,
        }
    }

    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize( window.innerWidth*0.8, window.innerHeight*0.85 );
    }

    function ResetScene() {
        if (Debug) console.log("Resetting Scene")

        //Disposes of all the old objects inside the diposeArray
        for (var i = 0; i < diposeArray.length; i++) {
            diposeArray[i].dispose();
        }
        diposeArray = [];

        //Removes all the old lines
        for (var i = 0; i < old_lines.length; i++) {
            scene.remove(old_lines[i]);
        }
        old_lines = [];

        //Removes all the old spheres
        for (var i = 0; i < old_spheres.length; i++) {
            scene.remove(old_spheres[i]);
        }
        old_spheres = [];

        //Reset the interval loop
        if (timer != undefined) {
            clearInterval(timer);
            timer = undefined;
        }

        AllReplays = [];
        AllScores = [];
    }

    function GetReplayDataFile(genericPlatform = "Classic", level = "SP_rollTutorial", platform = "Global", fileIndex = 0) {
        var dataPath = serverAdress + `data/replays/?genericPlatform=${genericPlatform}&level=${level}&platform=${platform}&fileIndex=${fileIndex}`
        return new Promise((resolve, reject) => {
            fetch(dataPath)
            .then(response => response.text())
            .then(data => {
                if (Debug) console.log("Loaded Replay JSON file: " + dataPath)
                resolve(data);
            })
            .catch(error => {
                console.log(error);
                resolve("{}");
            });
        });
    }

    function Get50Pairs(limit = 0, AmountPerFile = 0, serverSideMax) {
        var total50s = 1;
        for (var i = 1; i <= limit; i++){
            //if (i % 50 == 0){
            if (i % AmountPerFile == 0){
                total50s++;
                if (total50s > serverSideMax) return serverSideMax;
                if (Debug) console.log(`New (${AmountPerFile}) Pair`);
            }
        }
        return total50s;
    }

    function PrepareReplayLoop(limit = 0) {
        var currentColors = [];

        for (var i = 0; i < limit; i++) {
            var color = Line_Start_Color.clone();
            color.lerp(Line_End_Color, i / limit);
            currentColors.push(color);

            //line stuff
            const LineGradientMaterial = new THREE.LineBasicMaterial({ color: currentColors[i] });
            LineGradientMaterial.format = THREE.RGBAFormat;
            LineGradientMaterial.encoding = THREE.sRGBEncoding;

            const LineGeometry = new THREE.BufferGeometry();
            const Line = new THREE.Line(LineGeometry, LineGradientMaterial);
            Line.frustumCulled = false;
            scene.add(Line);
            old_lines.push(Line);
            ReplayStateData.saved_geometry.push(LineGeometry);

            diposeArray.push(LineGeometry);
            diposeArray.push(LineGradientMaterial);

            //sphere stuff
            const SphereMaterial = new THREE.MeshBasicMaterial({ map: Marble_Texture });
            const Sphere = new THREE.Mesh(Standard_Sphere_Geometry, SphereMaterial);

            Sphere.material.transparent = true;
            Sphere.frustumCulled = false;
            scene.add(Sphere);
            ReplayStateData.spheres.push(Sphere);
            old_spheres.push(Sphere);

            diposeArray.push(SphereMaterial);
        }

        return {currentColors};
    }

    function FormatTime(seconds) {
        var minus = seconds < 0;
        if (minus) seconds = -seconds;

        var a = new Date(seconds * 1000).toISOString().substring(14, 19)
        var milli = (seconds - Math.floor(seconds)).toFixed(3)

        return `${minus ? "-" : ""}${a}${milli.toString().substring(1)}`;
    }

    function UpdateLeaderboard(scores) {
        if (Debug) console.log("Updating Leaderboard")

        var leaderboard = document.getElementById("leaderboard");

        while (leaderboard.firstChild) {
            leaderboard.removeChild(leaderboard.firstChild);
        }

        var tr = leaderboard.insertRow();

        var td_rank = tr.insertCell();
        var td_username = tr.insertCell();
        var td_time = tr.insertCell();

        td_rank.innerText = "Rank";
        td_username.innerText = "Username";
        td_time.innerText = "Time";

        leaderboard.appendChild(tr);

        for (var i = 0; i < scores.length; i++) {
            var tr = leaderboard.insertRow();

            var td_rank = tr.insertCell();
            var td_username = tr.insertCell();
            var td_time = tr.insertCell();

            var button = document.createElement("button");
            button.className = "leaderboardButton";

            var formatedTime = FormatTime(scores[i].time);

            td_rank.innerText = scores[i].rank;
            button.innerText = scores[i].username;
            td_time.innerText = formatedTime;

            let hoverData = document.createElement("div");

            var formattedTimestamp_exludingTime = new Date(scores[i].timestamp).toLocaleDateString("sv-SE", {year: 'numeric', month: 'numeric', day: 'numeric'});
            hoverData.innerHTML = `Platform: ${scores[i].platform}<br>Skin: ${scores[i].skin}<br>Date: ${formattedTimestamp_exludingTime}`
            hoverData.className = "hoverData";


            let hoverData_timeOut = undefined;
            button.onmouseover = function() {
                hoverData.style.opacity = 0;
                hoverData_timeOut = setTimeout(() => {
                    hoverData.style.opacity = 1;
                }, 0.5*1000);
            }

            button.onmouseout = function() {
                hoverData.style.opacity = 0;
                if (hoverData_timeOut != undefined) {
                    clearTimeout(hoverData_timeOut);
                    hoverData_timeOut = undefined;
                }
            }

            button.appendChild(hoverData);

            ((currentScore) => {
                button.onclick = () => {
                    if (Debug) console.log("Following: " + currentScore.username);
                    FollowMarble.marble_index = currentScore.rank - 1;

                    if (ReplayStateData?.spheres[FollowMarble.marble_index]?.position == undefined) {
                        if (Debug) console.log("Error: Marble position is undefined at following marble LB button");
                        FollowMarble.marble_index = 0;
                        return;
                    }
                    var point = ReplayStateData.spheres[FollowMarble.marble_index].position;

                    FollowMarble.Update(point, FollowMarble.marble_index);
                }
            })(scores[i]);

            td_username.appendChild(button)
            leaderboard.appendChild(tr);
        }
    }

    function AdvanceAllMarbles(ReplayStateData) {
        for (var i = 0; i < Inputs.amount; i++) {
            AdvanceReplayLoop(ReplayStateData, i)
        }
    }

    function AdvanceReplayLoop(ReplayStateData, i) {

        while (ReplayStateData.time > ReplayStateData.replay_timeIndex[i][ReplayStateData.timeArray[i]+1]) ReplayStateData.timeArray[i]++;
        var arrIndex = ReplayStateData.timeArray[i];

        if (ReplayStateData.replay?.[i] == undefined || ReplayStateData.replay?.[i].length <= 0) { if (Debug) console.log("undefined:" + arrIndex); return; } //skip replay states that are too long

        if (ReplayStateData.replay?.[i] == undefined || arrIndex+1 >= ReplayStateData.replay[i].length) {

            if (renderLines) ReplayStateData.saved_geometry[i].setFromPoints(ReplayStateData.replay[i].slice(0, arrIndex+1));

            ReplayStateData.spheres[i].position.set(ReplayStateData.replay[i][arrIndex].x, ReplayStateData.replay[i][arrIndex].y, ReplayStateData.replay[i][arrIndex].z);

            return;
        }

        //interpolation
        var nextPos = ReplayStateData.replay[i][arrIndex+1];
        var currentPos = ReplayStateData.replay[i][arrIndex];

        var aa = ReplayStateData.time - ReplayStateData.replay_timeIndex[i][arrIndex];
        var bb = ReplayStateData.replay_timeIndex[i][arrIndex+1] - ReplayStateData.replay_timeIndex[i][arrIndex];

        var LastPoint = new THREE.Vector3();
        LastPoint.lerpVectors(currentPos, nextPos, aa / bb );

        if (renderLines) {
            var AfterPolation = [...ReplayStateData.replay[i].slice(0, arrIndex+1), LastPoint];
            ReplayStateData.saved_geometry[i].setFromPoints(AfterPolation);
        }

        if (FollowMarble.enabled) {
            FollowMarble.Update(LastPoint, i)
            controls.maxDistance = FollowMarble.camera_distance;
        }

        var quat2 = new THREE.Quaternion().setFromEuler(ReplayStateData.spheres[i].rotation);
        var quat3 = new THREE.Quaternion();

        var quat = new THREE.Quaternion().setFromEuler(new THREE.Euler().setFromVector3(ReplayStateData.replay_Omega[i][arrIndex].clone().multiplyScalar(ReplayStateData.deltaTime)));
        ReplayStateData.spheres[i].rotation.setFromQuaternion(quat3.multiplyQuaternions(quat2,quat));
        ReplayStateData.spheres[i].position.set(LastPoint.x, LastPoint.y, LastPoint.z);

        //transparency
        if (all_marble_transparent) {
            ReplayStateData.spheres[i].material.opacity = marble_transparency;
        }
        else if (all_but_follow_transparent) {
            if (i != FollowMarble.marble_index) {
                ReplayStateData.spheres[i].material.opacity = marble_transparency;
                ReplayStateData.spheres[i].material.transparent = true;
            }
            else {
                ReplayStateData.spheres[i].material.opacity = 1;
                ReplayStateData.spheres[i].material.transparent = false;
            }
        }
        else {
            ReplayStateData.spheres[i].material.opacity = 1;
        }
    }

    var ChangeMaxCameraDistance = (distance) => {
        controls.maxDistance = distance;
    }

    function GetJsonData(dataName) {
        var dataPath = serverAdress + `data/other/?dataName=${dataName}&file_extension=json`
        return new Promise((resolve, reject) => {
            fetch(dataPath)
            .then(response => response.json())
            .then(data => {
                if (Debug) console.log("Loaded JSON file: " + dataPath)
                resolve(data);
            })
            .catch(error => {
                console.log(error);
                reject();
            });
        });

    }

    function GetMarbleTexture(path, video = false) {
        if (video) {
            if (document.getElementById("video") != null) {
                document.getElementById("video").remove();
            }

            const video = document.createElement('video');
            video.setAttribute('crossorigin', 'anonymous');
            video.setAttribute('src', path);
            video.setAttribute('autoplay', 'true');
            video.setAttribute('loop', 'true');
            video.setAttribute('playsinline', 'true');
            video.setAttribute('preload', 'true');
            video.setAttribute('id', 'video');

            //somehow the muted attribute doesnt work when
            //a video is dynamically added, this just fixes it
            //https://stackoverflow.com/questions/14111917/html5-video-muted-but-still-playing
            video.oncanplay = () => {
                video.muted = true;
            }

            //create a video texture from the video element
            const videoTexture = new THREE.VideoTexture(video);
            Marble_Texture = videoTexture;
        }
        else {
            Marble_Texture = Texture_Loader.load(path);

            Marble_Texture.format = THREE.RGBAFormat;
            Marble_Texture.encoding = THREE.sRGBEncoding;
        }

        //flips the texture right side up
        const radian = 0.0174532925;
        Marble_Texture.center = new THREE.Vector2(0.5, 0.5);
        Marble_Texture.rotation = 180*radian;
    }

    function GetReplayFileAmount(genericPlatform = "Classic", level = "Learning To Roll") {
        level = classic_Level_To_ID[level];
        return new Promise((resolve, reject) => {
            fetch(serverAdress + `data/replays/?returnFileAmount=true&genericPlatform=${genericPlatform}&level=${level}`)
            .then(response => response.json())
            .then(data => {
                if (Debug) console.log("Loaded Replay File Amount")
                resolve(data);
            })
            .catch(error => {
                console.log(error);
                reject();
            });
        });
    }

    var ToggleStats = function(on) {
        if (!on) {
            if (Debug) console.log("Hiding Stats");
            ShowStats = false;
            if (document.body.contains(stats.dom)) {
                document.body.removeChild(stats.dom);
            }
            return;
        }
        if (Debug) console.log("Showing Stats");
        ShowStats = true;
        stats.showPanel(0); // 0: fps, 1: ms, 2: mb
        document.body.appendChild(stats.dom);
    }

    //stuff because i cant seem to edit those in the main.js file for some reason, probably how it all works?!
    var ChangeFOV = function(fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    var ChangeStartColor = function(color) { Line_Start_Color = new THREE.Color(color); }
    var ChangeEndColor = function(color) { Line_End_Color = new THREE.Color(color); }
    var ChangeDebug = function(bool) { Debug = bool; }

    var GetDebug = function() { return Debug; }

    var ChangeUpdateInterval = function(interval) {
        var shouldRestart = timer != undefined;
        StopReplayInterval();
        UpdateInterval = interval;
        var timeline_playbackSpeed = document.getElementById("timeline_speed");
        ReplayStateData.deltaTime = (UpdateInterval/1000) * Math.pow(playbackSpeedBase, timeline_playbackSpeed.value);
        if (shouldRestart) StartReplayInterval();
    }
    var ChangeLineVisibility = function(bool) { renderLines = bool; }

    var ChangeMarbleTransparency = function(transparency = 1) { marble_transparency = transparency; }
    var AllMarbleTransparency = function(bool) { all_marble_transparent = bool; }
    var AllButFollowTransparency = function(bool) { all_but_follow_transparent = bool; }


    var transparentMaterials = ["IceCrystalGemMat"];
    var LoadLevelModel = function(genericPlatform = "classic", level = "Learning to Roll") {

        if (old_level == level) return; //No need to load the same level

        return new Promise((resolve, reject) => {
            GLTF_Loader.setPath(serverAdress+"models/?platform="+genericPlatform+"&level=")
            .load(
                `${level}`,
                function(gltf) {
                    if (Debug) console.log("Finished Loading Level: " + level)
                    scene.remove(old_level);

                    if (Debug) console.log(gltf.scene);
                    //loop over all meshes and set the material to transparent if it is in the transparentMaterials array
                    gltf.scene.traverse(function(child) {

                        if (child.isMesh) {
                            var material = child.material.name;
                            material = material.substring(0, material.indexOf("."));

                            if (transparentMaterials.includes(material)) child.material.transparent = true;
                        }
                    });

                    gltf.format = THREE.RGBAFormat;
                    gltf.encoding = THREE.sRGBEncoding;
                    scene.add(gltf.scene);
                    old_level = gltf.scene;
                    resolve();
                },
                function(xhr) {
                    if (Debug) console.log(Math.round((xhr.loaded / xhr.total * 100)) + `% Loading (${level})`);
                },
                function(error) {
                    console.log('An error happened: ' + error);
                    reject();
                }
            );
        });
    }

    var LoadSkybox = function(skybox = "sky001") {

        if (old_skybox == skybox) return; //No need to load the same skybox

        if (Debug) console.log("Loading Skybox: " + skybox)

        const texture = Cube_Loader
        .setPath(serverAdress+"skybox/?skybox="+skybox+"&orientation=")
        .load([ "lf", "rt", "up", "dn", "ft", "bk" ]);

        texture.format = THREE.RGBAFormat;
        texture.encoding = THREE.sRGBEncoding;

        scene.background = texture;

        old_skybox = skybox;
    }

    var GetReplayData = function(replays, limit) {
        if (Debug) console.log("Getting Replay Data")
        let positions = [];
        let omega = [];
        let timeIndex = [];

        for (var i = 0; i < limit; i++) {
            if (replays[i]?.States == undefined) { continue; }
            var replay_state = replays[i].States.sort((a, b) => a.timeIndex - b.timeIndex);
            positions.push(replay_state.map((e, i) => new THREE.Vector3(e.position[0], e.position [1], e.position[2] * -1)));

            omega.push(replay_state.map((e, i) => {
                return new THREE.Vector3(-e.omega[0], e.omega[1], e.omega[2]);
            }));

            if (replay_state[0].timeIndex != undefined) timeIndex.push(replay_state.map((e, i) => e.timeIndex));
            else Inputs.amount = Inputs.amount-1;

        }

        return {positions, omega, timeIndex};
    }

    var GoButton = async function() {
        ReplayStateData = DefaultStateData();
        if (Debug) console.log("Go Button Pressed")
        ResetScene();

        Inputs.GetInputs();
        FollowMarble.marble_index = 0; //Reset Follow Marble
        var timeline_slider = document.getElementById("timeline_slider");
        timeline_slider.value = 0; //Reset Timeline Slider

        //i have problems deserializing the replay file
        if (Inputs.level == "Centripetal Force") {
            if (Debug) console.log("Centripetal Force is not supported yet");
            return;
        }

        var serverSideMax = await GetReplayFileAmount(Inputs.genericPlatform, Inputs.level);

        const AmountPerFile = 50;
        var total50s = Get50Pairs(Inputs.limit, AmountPerFile, serverSideMax);

        Inputs.limit = (Inputs.limit > serverSideMax*AmountPerFile ? serverSideMax*AmountPerFile : Inputs.limit)

        var limitField = document.getElementById("limit");
        limitField.value = Inputs.amount;

        var TargetPoint = new THREE.Vector3(0, 0, 0);
        for (var i = 0; i < total50s; i++) {

            var replayDataFile = await GetReplayDataFile(Inputs.genericPlatform, classic_Level_To_ID[Inputs.level], Inputs.platform, i);

            if (replayDataFile.length == 0) continue;
            replayDataFile = JSON.parse(replayDataFile);

            var replays = JSON.parse(replayDataFile.replays);
            var scores = JSON.parse(replayDataFile.scores);
            var scores = scores.slice(0, Inputs.limit - (i * AmountPerFile));

            AllReplays = AllReplays.concat(replays);
            AllScores = AllScores.concat(scores);
        }
        controls.target = TargetPoint;

        AllReplays = AllReplays.slice(Inputs.skip, AllReplays.length);
        AllScores = AllScores.slice(Inputs.skip, AllScores.length);

        var currentSkybox = (Inputs.genericPlatform != "Custom" ? AllSkyboxes[classic_Level_To_ID[Inputs.level]] : "sky001");
        LoadSkybox(currentSkybox);

        LoadLevelModel(Inputs.genericPlatform, Inputs.level)

        var replayData = GetReplayData(AllReplays, Inputs.amount);
        ReplayStateData.replay = replayData.positions;
        ReplayStateData.replay_Omega = replayData.omega;
        ReplayStateData.replay_timeIndex = replayData.timeIndex;

        Inputs.amount = ReplayStateData.replay_timeIndex.length; //---------------------

        var replayLength = 0;
        for (var i = 0;i<ReplayStateData.replay.length;i++) {
            if (ReplayStateData.replay[i].length > replayLength){
                replayLength = ReplayStateData.replay[i].length;
            }
        }

        var originPoint = ReplayStateData.replay[0][0];
        for (var i = 0; i < Inputs.amount; i++) {
            //checking invalid spheres, if the current sphere is not within 3 units of the origin, it is invalid and should be removed
            if (ReplayStateData.replay[i][0].distanceTo(originPoint) > 3) {
                RemoveDataAtIndex(i);
                i--;
            }
        }

        if (controls.target.distanceTo(originPoint) > 2) {
            controls.target = originPoint.clone();
        }

        PrepareReplayLoop(Inputs.amount);
        UpdateLeaderboard(AllScores);

        ReplayStateData.time = 0;
        for (var i = 0;i<Inputs.amount;i++){
            ReplayStateData.timeArray.push(0);
        }

        timeline_playbackSpeed();

        //ReplayStateData.maxTime = ReplayStateData.replay_timeIndex[ReplayStateData.replay_timeIndex.length-1][ReplayStateData.replay_timeIndex[ReplayStateData.replay_timeIndex.length-1].length - 1];

        for (var i = 0; i < Inputs.amount; i++) {
            var currentTimeIndex = ReplayStateData.replay_timeIndex[i][ReplayStateData.replay_timeIndex[i].length - 1];
            if (currentTimeIndex > ReplayStateData.maxTime) ReplayStateData.maxTime = currentTimeIndex;
        }

        ReplayStateData.hasInit = true;
        if (Debug) console.log("Starting Replay Loop");
        StartReplayInterval();
    }

    function RemoveDataAtIndex(index) {
        ReplayStateData.replay.splice(index, 1);
        ReplayStateData.replay_Omega.splice(index, 1);
        ReplayStateData.replay_timeIndex.splice(index, 1);
        ReplayStateData.timeArray.splice(index, 1);

        AllScores[index].username = "INVALID: " + AllScores[index].username;
        AllReplays.splice(index, 1);

        scene.remove(ReplayStateData.spheres[index]);

        Inputs.amount = Inputs.amount - 1;

        if (Debug) console.log("Invalid Sphere Removed: " + index + ", Username: " + AllScores[index].username + ", Rank: " + AllScores[index].rank);
    }

    function StartReplayInterval() {
        if (timer != undefined) return;
        var timeline_slider = document.getElementById("timeline_slider");
        var ui_timer = document.getElementById("ui_time");
        timer = setInterval(function() {
            ReplayStateData.time += ReplayStateData.deltaTime;

            AdvanceAllMarbles(ReplayStateData);
            timeline_slider.value = ReplayStateData.time/ReplayStateData.maxTime;

            if (ReplayStateData.time >= ReplayStateData.maxTime) {
                StopReplayInterval();
                //ReplayStateData.time = ReplayStateData.maxTime;
                if (Debug) console.log(`Finished|${Inputs.level}|${Inputs.limit}|${Inputs.skip}|${Inputs.platform}`);
            }
            //ui_timer.innerText = FormatTime(Math.min(ReplayStateData.time-2.986, AllScores[AllScores.length-1].time));
            ui_timer.innerText = FormatTime(ReplayStateData.time - 2.986);

        }, UpdateInterval);
        var timeline_playStop = document.getElementById("timeline_playStop");
        timeline_playStop.innerHTML = "Stop";
    }

    function StopReplayInterval() {
        if (timer != undefined) {
            clearInterval(timer);
            timer = undefined;
        }
        var timeline_playStop = document.getElementById("timeline_playStop");
        timeline_playStop.innerHTML = "Play";

        var ui_time = document.getElementById("ui_time");
        //ui_time.innerText = FormatTime(Math.min(ReplayStateData.time-2.984, AllScores[AllScores.length-1].time));
        ui_time.innerText = FormatTime(ReplayStateData.time - 2.984);
    }

    function timeline_slider(value) {
        if (ReplayStateData.hasInit == false) return;

        StopReplayInterval();

        ReplayStateData.time = ReplayStateData.maxTime*value;
        ReplayStateData.timeArray = ReplayStateData.timeArray.map((e, i) => 0);

        AdvanceAllMarbles(ReplayStateData);
    }

    function timeline_pause() {
        if (ReplayStateData.hasInit == false) return;

        StopReplayInterval();
    }

    function timeline_play() {
        if (ReplayStateData.hasInit == false) return;

        var timeline_slider = document.getElementById("timeline_slider");
        if (timeline_slider.value == 1) {
            ReplayStateData.time = 0;
            ReplayStateData.timeArray = ReplayStateData.timeArray.map((e, i) => 0);
        }

        StartReplayInterval();
    }

    function timeline_playbackSpeed(multiplier = 1) {
        ReplayStateData.deltaTime = (UpdateInterval / 1000)*multiplier;
        var timeline_playbackSpeed = document.getElementById("timeline_speed");
        timeline_playbackSpeed.value = getBaseLog(playbackSpeedBase, multiplier);
    }

    function getBaseLog(x, y) {
        return Math.log(y) / Math.log(x);
    }

    var Init = async function() {
        //Init Three.js related stuff
        if (Debug) console.log("Initiating Three.js")

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 10000);

        //default camera rotation and position, just looks good
        camera.position.set(12.72, 8.69, -15.37);
        camera.rotation.set(3.09, 1.30, -3.09);

        var canvas = document.getElementById("canvas");
        renderer = new THREE.WebGLRenderer({antialias: true, canvas: canvas});
        renderer.setSize(window.innerWidth*0.8, window.innerHeight*0.85);

        //document.body.appendChild(renderer.domElement);

        AddControls();

        const light = new THREE.HemisphereLight( 0xffffff, 0x080820, 1 );
        scene.add( light );

        renderer.outputEncoding = THREE.sRGBEncoding;

        //scene.add( new THREE.AmbientLight( 0x393f4a, 2 ) );

        window.addEventListener( 'resize', onWindowResize, false );

        LoadSkybox();

        classic_Level_To_ID = await GetJsonData("classicLevels");
        classicLevels = await GetJsonData("classicLevelOrder");

        customLevels = await GetJsonData("customLevels");
        GetMarbleTexture(serverAdress + `data/other/?dataName=MarbleTexture&file_extension=png`);

        AllSkyboxes = await GetJsonData("levelSkyboxes");
        //  ^?

        //Add all the levels to the datalist
        var levelList = document.getElementById("level_list");
        for (var i = 0; i < classicLevels.length; i++) {
            var option = document.createElement("option");
            option.value = classicLevels[i];
            if (option.value == "Centripetal Force") option.value = "Centripetal Force™";
            levelList.appendChild(option);
        }
    }

    var Animate = function() {
        //Main render loop

        requestAnimationFrame(Animate)

        controls.update();

        if (ShowStats) {
            stats.update();
        }

        renderer.render(scene, camera);
    }

    return {
        controls: controls,

        ShowStats: ShowStats,
        Debug: Debug,
        playbackSpeedBase: playbackSpeedBase,

        serverAdress: serverAdress,

        UpdateInterval: UpdateInterval,

        Line_Start_Color: Line_Start_Color,
        Line_End_Color: Line_End_Color,

        Marble_Texture: Marble_Texture,

        FollowMarble: FollowMarble,
        Inputs: Inputs,
        GoButton: GoButton,

        ChangeMaxCameraDistance: ChangeMaxCameraDistance,

        ChangeStartColor: ChangeStartColor,
        ChangeEndColor: ChangeEndColor,
        ChangeDebug: ChangeDebug,
        ChangeUpdateInterval: ChangeUpdateInterval,
        GetDebug: GetDebug,
        ChangeLineVisibility: ChangeLineVisibility,

        ChangeMarbleTransparency: ChangeMarbleTransparency,
        AllMarbleTransparency: AllMarbleTransparency,
        AllButFollowTransparency: AllButFollowTransparency,

        ToggleStats: ToggleStats,
        ChangeFOV: ChangeFOV,
        LoadSkybox: LoadSkybox,
        LoadLevelModel: LoadLevelModel,
        ResetScene: ResetScene,
        GetReplayData: GetReplayData,
        GetMarbleTexture: GetMarbleTexture,

        timeline_slider: timeline_slider,
        timeline_pause: timeline_pause,
        timeline_play: timeline_play,
        timeline_playbackSpeed: timeline_playbackSpeed,

        Init: Init,
        Animate: Animate,
    }
}

export default ThreeModule;