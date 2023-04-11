# HC-ImageService

## Version Update (0.3.7) 
*  Ability to run puppeteer in non-headless mode for faster image generation.  
Example:  
` await imageservice.start({headless:false});`
*  Ability to specify fixed "wait" time in milliseconds before generating image. Can improve image generation performance but model might not be completely rendered yet when image is generated.  
Example:  
`await this.generateImage("e:/temp/arboleda.scs",{callback: setView, cacheID: "test",outputPath: "./images/test.png",fixedDelay:100});`

## Version Update (0.3.5) 
*  Evalulate callback without generating image. See below for example usage.
*  Streamlined Image Generation

## Version Update (0.3.2) 
*  generateOneImage function added to directly convert an scs file via the command line.   
Example:  
`npx run-func app.js generateOneImage "E:/temp/microengine.scs" "E:/temp/microengine.png"`

## Version Update (0.2.8) 
*  Updated to HOOPS Communicator 2023 U1.

## Version Update (0.2.5) 
*  Updated to HOOPS Communicator 2023.


## Version Update (0.2.4) 
*  Updated to HOOPS Communicator 2022 SP2 U1.

## Version Update (0.2.1) 
*  Updated to HOOPS Communicator 2022 SP2.

## Version Update (0.2.0) 
*  Callback parameter added (see callbackParam below).
*  transparent background for generated images.
*  async support for callbacks.
*  bugfixes.

## Overview

A library to generate PNG's from HOOPS Communicator Stream Cache files on the server. It can either be used as a node module that can be included in your application or as a standalone service that can be accessed via a simple REST API. 

## GitHub Project

The public github project can be found here:  
https://github.com/techsoft3d/HC-ImageService

## Disclaimer
**This library is not an officially supported part of HOOPS Communicator and provided as-is.**

## HOOPS Communicator Version

Make sure the version of HOOPS Communicator you are using is compatible with the version used by the image service. If the SCS files used are generated with a newer HOOPS Communicator version than mentioned in the Version Update above, the image generation will likely fail. In that case, please see further below on how to manually upgrade the image service or use a custom viewer directory. Models generated with older versions of HOOPS Communicator should work fine. We will try to keep the image service up to date with the latest HOOPS Communicator version in a timely manner.

## Install

npm install ts3d-hc-imageservice

## Initialization

```
const imageservice = require('ts3d-hc-imageservice');
await imageservice.start(); 
```


## Shutdown

```
await imageservice.shutdown();
```
For performance reasons the image service should be kept running between image requests.
## Generate image data from scs file
```
 let data = await imageservice.generateImage("E:/mymodels/microengine.scs");
```
Data contains binary image data blob that can be serialized to disk, send to s3, etc.


## Specifying image size
The default image size is 800x600. To specify a different size use the size parameter:

```
let data = await imageservice.generateImage("E:/mymodels/microengine.scs", {size:{width:1280,height:800}});
```

## Generate image data from scs file and write png to disk
```
let data = await imageservice.generateImage("E:/mymodels/microengine.scs",{outputPath:"E:/mymimages/microengine.png"});
```


## Generate image data from scs file and execute custom JS
```
function myCallback(color)
{
    hwv.view.setBackgroundColor(new Communicator.Color(color,color,color));
    hwv.view.isolateNodes([8,6]);
}


let data = await imageservice.generateImage("E:/mymodels/microengine.scs",{callback:mycallback, callbackParam:128});
```
The callback will be executed after the modelStructureReady callback in the HOOPS Web Viewer has triggered and receive the parameter defined in callbackParam.


## Evaluating custom JS without generating an image
```
async function myCallback()
{
    let foundfloors = [];
    //write code here that finds all floors in a building and returns the floors as an array of nodeids
    //...
    //...
    return {floors:foundfloors};
}

let res = await this.generateImage(E:/mymodels/arboleda.scs", {evaluate:true,callback:myCallback,callbackParam:null});
console.log(res.floors.length);
```
By setting `evaluate:true` the callback function will be executed but no image will be generated. Instead `generateImage` will return the result of the callback function. This can be used to extract information from the model prior to generating one or more images.

## Generate image data from scs file and execute custom JS from provided string
```
var text = 'let color = 128; hwv.view.setBackgroundColor(new Communicator.Color(color,color,color)); hwv.view.isolateNodes([8,6]);';

let data = await imageservice.generateImage("E:/mymodels/microengine.scs",{code:text});
```
The text passed in via code will be evaluated in the HOOPS Web Viewer. In this case you need to "bake" all potential function parameters into the provided string as no parameters are passed through separately.


## Generate image data from scs data blob
```
let data = await imageservice.generateImage(null,{scsData:myscsdata});
```

## Specifying custom port for internal HOOPS Communicator Viewer used for image generation
```
await imageservice.start({viewerPort:3010}); //provide optional port on which viewer is served, defaults to 4001
```

## Using your Own HOOPS Communicator Server for SCZ Streaming
The default implementation of the Image Service uses an internal http-server to serve scs models only. However, if you want to generate images from scz models you can run your own Communicator Streaming Server for image generation. To do this the following steps are required:

1.  Install and run the HOOPS Communicator Server on the machine that the image service is running on. From the package this can be accomplished by simply running **start_server.bat** from the quick_start directory.
2.  Copy imageservice.html into the source webviewer folder ("web_viewer/src" if you use the HOOPS Communicator installation). This file is a slightly modifed version of hoops_web_viewer_sample.html and can be found in the public folder of this package.
3.  Provide the server url as well as the directory to place the scz files when starting the image service (see example below when running the HOOPS Communicator server directly from the installation.)

```
await imageservice.start({customServer: "http://localhost:11180/imageservice.html?viewer=csr&", 
    sczDirectory:"E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/sc_models"});
```

## Using the image service with your own application logic and/or upgrading the version of HOOPS Communicator manually
While you have a lot of control over the image generation via the callback mechanism, it might sometimes be necessary to use your own custom logic within the viewer itself. To do this you can provide the folder to the webviewer source during startup.

```
await imageservice.start({customViewerDirectory:"E:/myviewer"});
```

The image service expects a file called imageservice.html to be accesible in the top level viewer folder which is a slightly modified version of "hoops_web_viewer_sample.html" with the UI removed and a few callbacks added. See below for the relevant code changes. If you just want to upgrade the version of HOOPS Communicator, all you need to do is copy the imageservice.html file from the public folder of this module into your viewer folder. It will likely work with later versions of HOOPS Communicator. If not, simply include the code below in "hoops_web_viewer_sample.html" and rename the file to imageservice.html.


```

var modelStructureReady = false;
var fullyDrawn = false;

async function waitForIdle() {
    await hwv.waitForIdle();
    fullyDrawn = true;
}

function msready() {
    hwv.view.setDisplayIncompleteFrames(false)
    hwv.view.setBackfacesVisible(true);
    modelStructureReady = true;
    waitForIdle();
}

window.onload = function () {
    ...
   //   ui = new Communicator.Ui.Desktop.DesktopUi(hwv, uiConfig);

                  
        hwv.setCallbacks({
            modelStructureReady: msready
        });

```


## Caching
By default the image service generates a new internal HOOPS Communicator context every time a new image is requested. Creating this new context can take a bit of time. In addition the image service has to load the requested scs file into the viewer, even if the model stays the same. If you know you want to render multiple images from the same model you can provide a cacheID to the image service. If the cacheID is provided the image service will reuse the same HOOPS Communicator viewer context if it finds it in the cache. It will still reload the model though unless you omit the model reference from the call. See below for an example:

```
await imageservice.generateImage("E:/mymodels/microengine.scs",{outputPath:"c:/temp/micro1.png" cacheID:"micro"});          //make a screenshot of microengine with the default camera

await imageservice.generateImage(null,{outputPath:"c:/temp/micro2.png",callback:function() {hwv.view.setViewOrientation(Communicator.ViewOrientation.Top);},cacheID:"micro"});  //make another screenshot of microengine from the top without reloading the model
```

You can also use this mechanism to start the viewer without loading a model and then do the loading in your callback. See below for an example. This approach requires access to the models from the HOOPS Web Viewer context so you most likely want to use this in combination with setting a custom viewer directory. (see above)


```

function loadModel1()
{
    hwv.model.loadSubtreeFromScsFile(hwv.model.getRootNode(), "models/arboleda.scs");
}

function loadModel2()
{
    hwv.model.loadSubtreeFromScsFile(hwv.model.getRootNode(), "models/microengine.scs");
}

 await imageservice.generateImage(null,{outputPath:"./image1.png",callback:loadModel1,cacheID:"micro"});
 await imageservice.generateImage(null,{outputPath:"./image2.png",callback:loadModel2,cacheID:"micro"});
```

To remove an entry from the cache (and free the associated resources) you can call the function below with a previous used cacheID:

```
imageservice.removeFromCache("micro");
```


## Using the REST API
If you are not using NODE as your primary servers-side development environment and/or want to run the image service on a different server from your main application, you can use the built-in REST API to interact with the service. It is important to note that the REST API should not be exposed to the public internet. It is intended to be used only for communication with another server behind your firewall.

To run the image service with the REST API you have two options

*  via NPX: **npx ts3d-hc-imageservice**
*  by checking out the github project and running it via **npm start**

The default port of the REST API is 4000. If you want to change the port or make other startup changes you need to provide a file called default.json in the config directory. The file should contain the following properties:

```
{
  "hc-imageservice": {
    "apiPort": "4000",
    "viewerPort": "4001",
    "customServer": "",
    "customViewerDirectory": ""    
  }
}
```

The REST API is analogous to the API calls documented above and consists of three endpoints:



### **/api/generateImage**  (POST)

#### **Description**
Uploads an SCS or SCZ file via multipart form-data upload and generates an image from it.

#### **Example**
```
var text = 'hwv.view.setBackgroundColor(new Communicator.Color(0,0,0));';

let form = new FormData();
form.append('file', fs.createReadStream("c:/temp/myfile.scs"));
let api_arg  = {code:text,size:{width:1280,height:800}};
        
res = await fetch("http://localhost:4000" + '/api/generateImage', { method: 'POST', body: form, headers: {'IS-API-Arg': JSON.stringify(api_arg)}});
let data = await res.arrayBuffer();
fs.writeFileSync("c:/temp/myfile.png", Buffer.from(data));
```

#### **Parameters**
All parameters are passed in the header via "IS-API-ARG" and are mostly analogous to the parameters of the generateImage function described above. The callback and callbackParam parameters are not available. Use code instead. (see example above)

#### **Returns**
Image Blob


### **/api/generateImage**  (GET)

#### **Description**
Loads an SCS/SCZ file from disk and generates an image from it.

#### **Example**
```
let api_arg  = {scsPath:'E:/temp/myfile.scs'};        
        
res = await fetch("http://localhost:4000" + '/api/generateImage', { headers: {'IS-API-Arg': JSON.stringify(api_arg)}});
let data = await res.arrayBuffer();
fs.writeFileSync("c:/temp/myfile.png", Buffer.from(data));
```

#### **Parameters**
All parameters are passed in the header via "IS-API-ARG" and are mostly analogous to the parameters of the generateImage function described above. The callback and callbackParam parameters are not available. Use code instead. (see example above). The scsPath parameter is the path to the scs (or scz) file.

#### **Returns**
Image Blob


### **/api/removeFromCache** (PUT)

#### **Description**
Removes an entry from the cache.

#### **Example**
```
let res = await fetch("http://localhost:4000" + '/api/removeFromCache/c79dd99e-cbbd-4b6d-ba43-15986b1adc1', { method: 'put')}});
```

#### **Parameters**
*As specified in URL string:*
* CacheID (see above)

#### **Returns**
NONE


