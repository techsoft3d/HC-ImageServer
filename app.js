const fs = require('fs');
const path = require('path');

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const del = require('del');

var puppeteer;
var port;
var browser;


exports.start = async function (inport) {    
    if (inport) {
        port = inport;
    }
    else {
        port = 3010;
    }

    const app = express();
    
    app.use(express.json({ limit: '25mb' }));
    app.use(express.urlencoded({ limit: '25mb', extended: false }));


    app.use(express.static(path.join(__dirname, 'public')));
    app.listen(port);

    puppeteer = require('puppeteer');
    browser = await puppeteer.launch();
};


exports.generateImage = async function (scspath,params) {  

    let data = fs.readFileSync(scspath);
    var uv4 = uuidv4();
    fs.writeFileSync("./public/models/" + uv4 + '.scs', data);
    
    const page = await browser.newPage();
    let modelStructureReadyCalled = false;
    await page.goto('http://localhost:' + port + '/viewer.html?scs=models/' + uv4 + '.scs');
    let myInterval = setInterval(async () => {
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
            clearInterval(myInterval);
            await page.screenshot({ path: './screenshots/' + uv4 + '.png' });
            let data = fs.readFileSync('./screenshots/' + uv4 + '.png');  
            if (params && params.outputPath) {
                fs.writeFileSync(params.outputPath, data);
            }
            del("./public/models/" + uv4 + '.scs',{force: true});
            del('./screenshots/' + uv4 + '.png',{force: true});
            return data;
        }
    }, 100);
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
//     await this.start();
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/DamagedHelmet.scs", {outputPath:"./damagedhelmet.png",callback:myCallback});
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/wooden 3d printer (1).scs",{outputPath:"./printer.png",callback:myCallback2});
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/railroadcar.scs");
//     this.generateImage("E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/scs_models/aw_Dives in Misericordia_2D.scs");


// })();
