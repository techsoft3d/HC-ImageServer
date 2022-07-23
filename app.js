const fs = require('fs');
const path = require('path');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const del = require('del');

var puppeteer;
var port;
var browser;
var customServer = null;
var sczDirectory = null;
var customViewerDirectory = null;


exports.start = async function (params) {    
    if (params && params.port) {
        port = params.port;
    }
    else {
        port = 3010;
    }

    if (params && params.customServer) {
        customServer = params.customServer;
        sczDirectory = params.sczDirectory;
    }
    else {
        port = 3010;
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

        app.listen(port);
    }

    puppeteer = require('puppeteer');
    browser = await puppeteer.launch();
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
            if (params && params.callback && modelStructureReadyCalled == false) {
                modelStructureReadyCalled = await page.evaluate(() => {
                    return modelStructureReady;
                });
                if (modelStructureReadyCalled) {
                    await page.evaluate(params.callback);
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

    let data;
    if (params && params.imageData) {
        data = params.imageData;
    }
    else {
        data = fs.readFileSync(scspath);
    }
    
    var uv4 = uuidv4();
    if (sczDirectory) {
        fs.writeFileSync(sczDirectory + "/" + uv4 + ".scz", data);
    }
    else {
        if (customViewerDirectory) {
            fs.writeFileSync(customViewerDirectory + "/models/" + uv4, data);
        }
        else {        
            fs.writeFileSync(path.join(__dirname,"./public/models/" + uv4), data);
        }
    }
    
    let page = await browser.newPage();
    if (customServer) {
        await page.goto(customServer + 'model=' + uv4);
    }
    else {
        await page.goto('http://localhost:' + port + '/imageserver.html?scs=models/' + uv4);
    }

    await waitUntilFullyDrawn(page, params);

    await page.screenshot({ path: path.join(__dirname, './screenshots/' + uv4 + '.png') });
    await page.close();
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

// function myCallback()
// {
//     hwv.view.setBackgroundColor(new Communicator.Color(0,0,0));
// }



// function myCallback2()
// {
//     hwv.view.isolateNodes([446]);
// }


// (async () => {
//     await this.start({port:3011,customViewerDirectory:"E:/temp/public"});
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/DamagedHelmet.scs", {outputPath:"./damagedhelmet.png",callback:myCallback});
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/wooden 3d printer (1).scs",{outputPath:"./printer.png",callback:myCallback2});
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/railroadcar.scs");
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/aw_Dives in Misericordia_2D.scs");

// })();


// (async () => {
//     await this.start({customServer: "http://localhost:11180/imageserver.html?viewer=csr&", sczDirectory:"E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/sc_models"});
//     await this.generateImage("E:/temp/DamagedHelmet2.scz", {outputPath:"./damagedhelmet.png",callback:myCallback});
//     await this.generateImage("E:/temp/wooden 3d printer2.scz",{outputPath:"./printer.png",callback:myCallback2});
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/railroadcar.scs");
// //    this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/aw_Dives in Misericordia_2D.scs");

// })();

