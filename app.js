const fs = require('fs');
const path = require('path');

if (!fs.existsSync("./config/default.json")) {
    process.env["NODE_CONFIG_DIR"] = __dirname + "/config/";
}

const config = require('config');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const del = require('del');

var puppeteer;
var viewerPort = 4001;
var browser = null;
var customServer = null;
var sczDirectory = null;
var customViewerDirectory = null;
var headless = true;
var pageCache = [];

var viewerServer = null;


exports.startServer = async function () {

    const app = express();
    const router = express.Router();
    const cors = require('cors');
    const bodyParser = require('body-parser');
    const multer = require('multer');

    app.use(cors());
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ limit: '25mb', extended: false }));

    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());

    const fileStorage = multer.diskStorage({
      destination: (req, file, cb) => {
       cb(null, path.join(__dirname, "/public/models"));
      },
      filename: (req, file, cb) => {
            var uv4 = uuidv4();
            cb(null, uv4);
        }
    });

    app.use(multer({ storage: fileStorage }).single('file'));


    this.start(config.get("hc-imageservice"));

    let _this = this;
    router.post('/generateImage', async function (req, res, next) {
        let args;
        if (req.get("IS-API-Arg"))
            args = JSON.parse(req.get("IS-API-Arg"));
        else
            args = {};

        let scsdata = fs.readFileSync(path.join(__dirname, "/public/models",req.file.filename));
        del(path.join(__dirname, "/public/models",req.file.filename), { force: true });
        args.scsData = scsdata;
        let blob = await _this.generateImage(null, args);
        if (args.evaluate) {
            return res.json(blob);
        }
        return res.send(Buffer.from(blob));
    });

    router.get('/generateImage', async function (req, res, next) {
        let args;
        if (req.get("IS-API-Arg"))
            args = JSON.parse(req.get("IS-API-Arg"));
        else
            args = {};

        let blob = await _this.generateImage(args.scsPath, args);
        if (args.evaluate) {
            return res.json(blob);
        }
        return res.send(Buffer.from(blob));
    });


    router.put('/removeFromCache/:cacheID', async function (req, res, next) {
        await _this.removeFromCache(req.params.cacheID);
        res.sendStatus(200);
        
    });

    app.use("/api", router);
    app.listen(config.get("hc-imageservice.apiPort"));

    console.log("API Server Started");

};


exports.start = async function (params) {    

    if (params && params.viewerPort) {
        viewerPort = params.viewerPort;
    }
    else {
        viewerPort = 4001;
    }

    if (params && params.headless != undefined) {
        headless = params.headless;
    }    
    else {
        headless = true;
    }

    if (params && params.customServer) {
        customServer = params.customServer;
        sczDirectory = params.sczDirectory;
    }
   

    if (params && params.customViewerDirectory) {
        customViewerDirectory = params.customViewerDirectory;
    }

    const app = express();
    
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ limit: '25mb', extended: false }));


    if (!customServer) {
        if (customViewerDirectory) {
            app.use(express.static(customViewerDirectory));
        }
        else {
            app.use(express.static(path.join(__dirname, 'public')));
        }

        viewerServer = app.listen(viewerPort);
    }

    puppeteer = require('puppeteer');
    browser = await puppeteer.launch({
      headless: headless,     
    });

    console.log("Image Service Started");
};


async function waitUntilFullyDrawn(page, params)
{
    let evaluated = true;
    if (params && (params.callback || params.code)) {
        evaluated = false;
    }
    await page.evaluate(() => {
        fullyDrawn = false;
    });

    return new Promise((resolve, reject) => {
        let evalResult = null;
        let done = false;
        let modelStructureReadyCalled = false;
        let interval = setInterval(async () => {            

            let fullyDrawn = await page.evaluate(() => {
                return fullyDrawn;
            });
            if (params && (params.callback || params.code) && modelStructureReadyCalled == false) {
                modelStructureReadyCalled = await page.evaluate(() => {
                    return modelStructureReady;
                });
                if (modelStructureReadyCalled) {
                    if (params.code) {
                        evalResult = await page.evaluate("(async () => {" + params.code + "})()", params.callbackParam);
                    }
                    else {
                        evalResult = await page.evaluate(params.callback,params.callbackParam);   
                    }
                    page.evaluate(() => {
                        waitForIdle();
                    });
                    evaluated = true;
                }
            }
            if (fullyDrawn && evaluated) {           
                if (!done) {
                    clearInterval(interval);
                    done = true;
                    resolve(evalResult);
                }    
            }
        }, 100);
    });
}


exports.generateImage = async function (scspath,params) {  


    var uv4 = null;
    
    if (scspath || (params && params.scsData)) {
        let data;
        if (params && params.scsData) {
            data = params.scsData;
        }
        else {
            data = fs.readFileSync(scspath);
        }

        uv4 = uuidv4();
        if (sczDirectory) {
            fs.writeFileSync(sczDirectory + "/" + uv4 + ".scz", data);
        }
        else {
            if (customViewerDirectory) {
                fs.writeFileSync(customViewerDirectory + "/models/" + uv4, data);
            }
            else {
                fs.writeFileSync(path.join(__dirname, "./public/models/" + uv4), data);
            }
        }
    }
    

    let page = null;
    if (params && params.cacheID)
    {
        page = pageCache[params.cacheID];
    }        
    
    let newPage = false;
    if (!page) {
        newPage = true;
        page = await browser.newPage();
        if (params && params.cacheID) {
            pageCache[params.cacheID] = page;
        }
    }

    if (params && params.size) {
        await page.setViewport(params.size);
    }

    if (uv4) {
        if (customServer) {
            await page.goto(customServer + 'model=' + uv4);
        }
        else {
            await page.goto('http://localhost:' + viewerPort + '/imageservice.html?scs=models/' + uv4);
        }
    }
    else if (newPage)
    {
        if (customServer) {
            await page.goto(customServer + 'model=' + "_empty");
        }
        else {
            await page.goto('http://localhost:' + viewerPort + '/imageservice.html');
        }

    }

    let evalResult = await waitUntilFullyDrawn(page, params);

    let evalOnly = params && params.evaluate;
    let imagedata;

    if (!evalOnly) {
        await page.screenshot({ omitBackground: true, path: path.join(__dirname, './screenshots/' + uv4 + '.png') });
        imagedata = fs.readFileSync(path.join(__dirname, './screenshots/' + uv4 + '.png'));
        if (params && params.outputPath) {

            fs.writeFileSync(params.outputPath, imagedata);
        }
        del(path.join(__dirname, './screenshots/' + uv4 + '.png'), { force: true });

    }
    if (!params || !params.cacheID) {
        await page.close();
    }

    if (sczDirectory) {
        del(sczDirectory + "/" + uv4 + ".scz", { force: true });
    }
    else {
        if (customViewerDirectory) {
            del(customViewerDirectory + "/models/" + uv4, { force: true });
        }
        else {
            del(path.join(__dirname, "./public/models/" + uv4), { force: true });
        }
    }

    if (!evalOnly) {
        return imagedata;
    }
    else {
        return evalResult;
    }
};


exports.generateOneImage = async function (scspath,outputpath) {
    await this.start();
    await this.generateImage(scspath,{outputPath:outputpath});
    await this.shutdown();
    process.exit(0);
}

exports.shutdown = async function () {
    await browser.close();
    if (viewerServer) {
        await viewerServer.close();
        viewerServer = null;
    }

};


exports.removeFromCache = async function (cacheID) {  
    if (pageCache[cacheID]) {
        await pageCache[cacheID].close();
        delete pageCache[cacheID];
    }
};


if (require.main === module) {
    this.startServer();
 } 