import ThreeModule from "./ThreeModule.js";

var Three = new ThreeModule();

RegisterEventListeners();

Three.Init();

Three.LoadLevelModel();

Three.Animate();

function RegisterEventListeners() {
    var go_button = document.getElementById("go_button");
    go_button.onclick = Three.GoButton;

    var levelInput = document.getElementById("level");
    levelInput.onclick = () => {
        levelInput.value = "";
    }

    var mainTab = document.getElementById("main_tab");
    var otherTab = document.getElementById("other_tab");

    var mainTabButton = document.getElementById("main_tab_button");
    mainTabButton.onclick = () => {
        mainTab.hidden = false;
        otherTab.hidden = true;
    }

    var otherTabButton = document.getElementById("other_tab_button");
    otherTabButton.onclick = () => {
        mainTab.hidden = true;
        otherTab.hidden = false;
    }

    var startColor = document.getElementById("ui_startColor");
    startColor.onchange = () => {
        Three.ChangeStartColor(startColor.value);
    }

    var endColor = document.getElementById("ui_endColor");
    endColor.onchange = () => {
        Three.ChangeEndColor(endColor.value);
    }

    var lineToggle = document.getElementById("ui_lineToggle");
    lineToggle.onclick = () => {
        if (lineToggle.checked) {
            Three.ChangeLineVisibility(true);
            return;
        }
        Three.ChangeLineVisibility(false);
    }

    var updateInterval = document.getElementById("ui_updateInterval");
    updateInterval.oninput = () => {
        Three.ChangeUpdateInterval(updateInterval.value);
    }

    var maxDistance = document.getElementById("ui_cameraMaxDistance");
    maxDistance.oninput = () => {
        Three.FollowMarble.camera_distance = maxDistance.value;
        Three.ChangeMaxCameraDistance(maxDistance.value);
    }

    var followMarble = document.getElementById("ui_followMarbleToggle");
    followMarble.onclick = () => {
        if (followMarble.checked) {
            Three.FollowMarble.enabled = true;
            return;
        }
        Three.FollowMarble.enabled = false;
    }

    var cameraFOV = document.getElementById("ui_cameraFOV");
    cameraFOV.oninput = () => {
        Three.ChangeFOV(cameraFOV.value);

        var FOV_Label = document.getElementById("currentFOV_label");
        FOV_Label.innerText = "Current FOV: "+cameraFOV.value;
    }

    var texture = document.getElementById("ui_marbleTexture");
    texture.onchange = () => {
        var Image = URL.createObjectURL(texture.files[0])
        //check if the file is an video
        if (texture.files[0].type.includes("video")) {
            Three.GetMarbleTexture(Image, true);
            return;
        }
        Three.GetMarbleTexture(Image);
    }

    Three.AllMarbleTransparency(true); //set the default value to true
    var marbleTransparencyOptions = document.getElementById("ui_marbleTransparencyTarget");
    marbleTransparencyOptions.onchange = () => {
        if (marbleTransparencyOptions.value == "All Marbles") {
            Three.AllMarbleTransparency(true);
            Three.AllButFollowTransparency(false);
        }
        else if (marbleTransparencyOptions.value == "No Marbles") {
            Three.AllMarbleTransparency(false);
            Three.AllButFollowTransparency(false);
        }
        else if (marbleTransparencyOptions.value == "All Except The Following Marble") {
            Three.AllMarbleTransparency(false)
            Three.AllButFollowTransparency(true);
        }
    }
    
    var marbleTransparency = document.getElementById("ui_marbleTransparency");
    marbleTransparency.oninput = () => {
        Three.ChangeMarbleTransparency(marbleTransparency.value);
    }

    var showFPS = document.getElementById("ui_enableFPS");
    showFPS.onclick = () => {
        if (Three.ShowStats) {
            Three.ShowStats = false;
            Three.ToggleStats(false);
            showFPS.innerText = "Off";
            return;
        }
        else {
            Three.ShowStats = true;
            Three.ToggleStats(true);
            showFPS.innerText = "On";
            return;
        }
    }

    var enableDebug = document.getElementById("ui_enableDebug");
    enableDebug.onclick = () => {
        if (Three.GetDebug()) {
            Three.ChangeDebug(false);
            enableDebug.innerText = "Off";
        }
        else {
            Three.ChangeDebug(true);
            enableDebug.innerText = "On";
        }
    }

    var resetColor = document.getElementById("ui_reset_color");
    resetColor.onclick = () => {
        var defaultStartColor = "#ff00f2";
        var defaultEndColor = "#50FF00";
        Three.ChangeStartColor(defaultStartColor);
        Three.ChangeEndColor(defaultEndColor);
        startColor.value = defaultStartColor;
        endColor.value = defaultEndColor;
    }

    var resetupdateInterval = document.getElementById("ui_reset_updateInterval");
    resetupdateInterval.onclick = () => {
        var defaultUpdateInterval = 10;
        Three.ChangeUpdateInterval(defaultUpdateInterval);
        updateInterval.value = defaultUpdateInterval;
    }

    var resetcameraDistance = document.getElementById("ui_reset_cameraMaxDistance");
    resetcameraDistance.onclick = () => {
        var defaultCameraDistance = 40;
        Three.FollowMarble.camera_distance = defaultCameraDistance;
        maxDistance.value = defaultCameraDistance;
    }

    var resetmarbleTexture = document.getElementById("ui_reset_marbleTexture");
    resetmarbleTexture.onclick = () => {
        Three.GetMarbleTexture(Three.serverAdress + `data/other/?dataName=MarbleTexture&file_extension=png`);
        texture.value = "";
    }

    var timeline = document.getElementById("timeline_slider");
    timeline.oninput = () => {
        Three.timeline_slider(timeline.value);
    }

    var timeline_playStop = document.getElementById("timeline_playStop");
    timeline_playStop.onclick = () => {
        if (timeline_playStop.innerText == "Play") {
            Three.timeline_play();
            timeline_playStop.innerText = "Stop";
            return;
        }
        else {
            Three.timeline_pause();
            timeline_playStop.innerText = "Play";
            return;
        }
    }

    var timeline_playbackSpeed = document.getElementById("timeline_speed");
    timeline_playbackSpeed.oninput = () => {
        Three.timeline_playbackSpeed(Math.pow(Three.playbackSpeedBase, timeline_playbackSpeed.value));
    }

    var ui_playback_reset = document.getElementById("ui_playback_reset");
    ui_playback_reset.onclick = () => {
        Three.timeline_playbackSpeed(1);
        timeline_playbackSpeed.value = 0;
    }
}

