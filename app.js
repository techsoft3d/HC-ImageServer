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
var browser;
var customServer = null;
var sczDirectory = null;
var customViewerDirectory = null;

var pageCache = [];


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
        return res.send(Buffer.from(blob));
    });

    router.get('/generateImage', async function (req, res, next) {
        let args;
        if (req.get("IS-API-Arg"))
            args = JSON.parse(req.get("IS-API-Arg"));
        else
            args = {};

        let blob = await _this.generateImage(args.scsPath, args);
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

        app.listen(viewerPort);
    }

    puppeteer = require('puppeteer');
    browser = await puppeteer.launch();

    console.log("Image Service Started");
};


async function waitUntilFullyDrawn(page, params)
{
    return new Promise((resolve, reject) => {
        let done = false;
        let modelStructureReadyCalled = false;
        let interval = setInterval(async () => {
            const lastframetime = await page.evaluate(() => {
                return new Date() - currentFrameDrawn;
            });
            if (params && (params.callback || params.code) && modelStructureReadyCalled == false) {
                modelStructureReadyCalled = await page.evaluate(() => {
                    currentFrameDrawn = new Date();
                    return modelStructureReady;
                });
                if (modelStructureReadyCalled) {
                    if (params.code) {
                        await page.evaluate(params.code);

                    }
                    else {
                        await page.evaluate(params.callback);   
                    }
                }
    
            }
            if (lastframetime > 1000) {           
                if (!done) {
                    clearInterval(interval);
                    done = true;
                    resolve();
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

    await waitUntilFullyDrawn(page, params);

    await page.screenshot({ path: path.join(__dirname, './screenshots/' + uv4 + '.png') });
    if (!params || !params.cacheID) {
        await page.close();
    }
    let imagedata = fs.readFileSync(path.join(__dirname, './screenshots/' + uv4 + '.png'));
    if (params && params.outputPath) {
        fs.writeFileSync(params.outputPath, imagedata);
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
    del(path.join(__dirname, './screenshots/' + uv4 + '.png'), { force: true });              
    return imagedata;
         
};

exports.shutdown = async function () {
    await browser.close();
};


exports.removeFromCache = async function (cacheID) {  
    if (pageCache[cacheID]) {
        await pageCache[cacheID].close();
        delete pageCache[cacheID];
    }
};


// function myCallback()
// {
//     hwv.view.setBackgroundColor(new Communicator.Color(0,0,0));
// }



// function myCallback2()
// {
//     hwv.view.isolateNodes([446]);
// }

// async function loadModel()
// {
//     await hwv.model.loadSubtreeFromScsFile(hwv.model.getRootNode(), "models/arboleda.scs");
// }

// async function loadModel2()
// {
//     let node =  hwv.model.createNode(hwv.model.getRootNode());
//     await hwv.model.loadSubtreeFromScsFile(node, "models/arboleda.scs");
//     var matrix = new Communicator.Matrix();
//     matrix.setTranslationComponent(1000,1000,1000);
//     await hwv.model.setNodeMatrix(node,matrix);
//     hwv.view.fitWorld();
// }


// (async () => {
//     await this.startServer();
//     await this.start({viewerPort:3010});
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/DamagedHelmet.scs", {outputPath:"./damagedhelmet.png",callback:myCallback,size:{width:1280,height:800}});
// // await this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/wooden 3d printer (1).scs",{outputPath:"./printer1.png",callback:function() {hwv.view.setViewOrientation(Communicator.ViewOrientation.Left);},cacheID:"printer"});
// // await this.generateImage(null,{outputPath:"./printer2.png",callback:function() {hwv.view.setViewOrientation(Communicator.ViewOrientation.Top);},cacheID:"printer"});
// // await this.generateImage(null,{outputPath:"./printer3.png",callback:function() {hwv.view.setViewOrientation(Communicator.ViewOrientation.Front);},cacheID:"printer"});
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/railroadcar.scs");
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/aw_Dives in Misericordia_2D.scs");

//  await this.generateImage(null,{outputPath:"./printer1.png",callback:loadModel,cacheID:"printer"});
//  await this.generateImage(null,{outputPath:"./printer2.png",callback:loadModel2,cacheID:"printer"});



// })();


// (async () => {
//     await this.start({customServer: "http://localhost:11180/imageservice.html?viewer=csr&", sczDirectory:"E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/sc_models"});
//     await this.generateImage("E:/temp/DamagedHelmet2.scz", {outputPath:"./damagedhelmet.png",callback:myCallback});
//     await this.generateImage("E:/temp/wooden 3d printer2.scz",{outputPath:"./printer.png",callback:myCallback2});
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/railroadcar.scs");
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/aw_Dives in Misericordia_2D.scs");

// })();


if (require.main === module) {
    this.startServer();
  } 