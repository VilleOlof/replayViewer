const http = require('http');
const express = require('express');
var cors = require('cors')
const fs = require('fs');

//options for the port and the host
const config = require('./server.config.json');
const app = express()
var totalRequests = 0; var totalActualRequests = 0;

app.use(cors())

var corsOptions = {
    origin: config.CORS,
    optionsSuccessStatus: 200
}

async function GetFileAsync(path = "") {
    totalActualRequests++;
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                console.log(err);
                reject(err);
            }
            resolve(data);
        })
    })
}

/*Main Content*/
app.get('/', cors(corsOptions), (req, res) => {
    console.log(`[${totalRequests}|${totalActualRequests}] MainPage Request From: ${req.socket.remoteAddress}`);
    totalRequests++;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    GetFileAsync('./src/index.html').then((data) => {
        res.end(data);
    });
})

app.get('/src/main.css', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    GetFileAsync('./src/main.css').then((data) => {
        res.end(data);
    });
})

app.get('/main.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./src/main.js').then((data) => {
        res.end(data);
    });
})

app.get('/ThreeModule.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./src/ThreeModule.js').then((data) => {
        res.end(data);
    });
})
//---------------------

/*Resources*/
app.get('/resources/resest.png', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    GetFileAsync('./resources/resest.png').then((data) => {
        res.end(data);
    });
})

app.get('/resources/logo.png', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    GetFileAsync('./resources/logo.png').then((data) => {
        res.end(data);
    });
})

app.get('/resources/favicon.png', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'image/png' });
    GetFileAsync('./resources/favicon.png').then((data) => {
        res.end(data);
    });
})

app.get('/resources/maxwell.glb', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'model/gltf-binary' });
    GetFileAsync('./resources/maxwell.glb').then((data) => {
        res.end(data);
    });
})

app.get('/resources/maxwell.mp3', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
    GetFileAsync('./resources/maxwell.mp3').then((data) => {
        res.end(data);
    });
})
//---------------------

/*Node Modules*/
app.get('/node_modules/three/examples/jsm/controls/OrbitControls.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./node_modules/three/examples/jsm/controls/OrbitControls.js').then((data) => {
        res.end(data);
    });
})

app.get('/node_modules/three/examples/jsm/loaders/GLTFLoader.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./node_modules/three/examples/jsm/loaders/GLTFLoader.js').then((data) => {
        res.end(data);
    });
})

app.get('/node_modules/three/examples/jsm/libs/stats.module.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./node_modules/three/examples/jsm/libs/stats.module.js').then((data) => {
        res.end(data);
    });
})

app.get('/node_modules/three/build/three.module.js', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    GetFileAsync('./node_modules/three/build/three.module.js').then((data) => {
        res.end(data);
    });
})
//---------------------

/*Other*/
app.get('/app.config.json', cors(corsOptions), (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    GetFileAsync('./app.config.json').then((data) => {      
        res.end(data);
    });
})

app.get('*', cors(corsOptions), function(req, res) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    GetFileAsync('./src/404.html').then((data) => {
        res.end(data);
    });
});
//---------------------

app.listen(config.port, config.hostname, () => {
    console.log(`Server running at http://${config.hostname}:${config.port}/`);
})