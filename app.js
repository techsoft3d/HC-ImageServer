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

    let data;
    if (params && params.imageData) {
        data = params.imageData;
    }
    else {
        data = fs.readFileSync(scspath);
    }
    
    var uv4 = uuidv4();
    fs.writeFileSync(path.join(__dirname,"./public/models/" + uv4 + '.scs'), data);
    
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
            await page.screenshot({ path: path.join(__dirname,'./screenshots/' + uv4 + '.png') });
            let data = fs.readFileSync(path.join(__dirname,'./screenshots/' + uv4 + '.png'));  
            if (params && params.outputPath) {
                fs.writeFileSync(params.outputPath, data);
            }
            del(path.join(__dirname,"./public/models/" + uv4 + '.scs'),{force: true});
            del(path.join(__dirname,'./screenshots/' + uv4 + '.png'),{force: true});
            return data;
        }
    }, 100);
};

exports.shutdown = async function () {
    await browser.close();
};
