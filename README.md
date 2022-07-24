# HC-ImageService

## Install

npm install ts3d-hc-imageservice

## Initialization

```
const imageservice = require('ts3d-hc-imageservice');
await imageservice.start({viewerPort:3011}); //provide optional port on which viewer is served, defaults to 3010
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



## Generate image data from scs file and write png to disk
```
let data = await imageservice.generateImage("E:/mymodels/microengine.scs",{outputPath:"E:/mymimages/microengine.png"});
```


## Generate image data from scs file and execute custom JS
```
function myCallback()
{
    hwv.view.setBackgroundColor(new Communicator.Color(0,0,0));
    hwv.view.isolateNodes([8,6]);
}


let data = await imageservice.generateImage("E:/mymodels/microengine.scs",{callback:mycallback});
```
The callback will be executed after the modelStructureReady callback in the HOOPS Web Viewer has triggered.



## Generate image data from scs data blob
```
let data = await imageservice.generateImage(null,{scsData:myscsdata});
```


## Using your Own Communicator Service for SCZ Streaming
The default implementation of the Image Service uses is own express http server to serve scs models only. However, if you want to generate images from scz models you can run your own Communicator server for image generation. To do this the following steps are required:

1.  Install and run the HOOPS Communicator service on the machine that the image service is running on. From the package this can be accomplished by simply running **start_server.bat** from the quick_start directory.
2.  Copy imageservice.html into the source webviewer folder ("web_viewer/src" if you use the HOOPS Communicator installation). This file is a slightly modifed version of hoops_web_viewer_sample.html and can be found in the public folder of this package.
3. Provide the server url as well as the directory to place the scz files when starting the image service (see example below when running the HOOPS Communicator server directly from the installation.)

```
await imageservice.start({customServer: "http://localhost:11180/imageservice.html?viewer=csr&", 
    sczDirectory:"E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/sc_models"});
```

## Using the image service with your own application logic and/or upgrading the version of HOOPS Communicator manually
While you have a lot of control over the image generation via the callback mechanism, it might sometimes be necessary to use your own custom logic within the viewer itself. To do this you can provide the folder to the webviewer source during startup.

```
await imageservice.start({customViewerDirectory:"E:/myviewer"});
```

The image service expects a file called imageservice.html to be accesible in the top level viewer folder which is a slightly modified version of "hoops_web_viewer_sample.html" with the UI removed and a few callbacks added. See below for the relevant code changes. If you just want to upgrade the version of HOOPS Communicator, all you need to do is copy the imageservice.html file from the public folder of this module into your viewer folder. It will likely work with later versions of HOOPS Communicator. If not, simply include the code below in "hoops_web_viewer_sample.html"

```

var currentFrameDrawn = new Date();
var modelStructureReady = false;

function frameDrawn() {
    currentFrameDrawn = new Date();
}

function msready() {
    hwv.view.setDisplayIncompleteFrames(false);
    modelStructureReady = true;
}

window.onload = function () {
    ...
   //   ui = new Communicator.Ui.Desktop.DesktopUi(hwv, uiConfig);

                  
        hwv.setCallbacks({
            frameDrawn: frameDrawn,
            modelStructureReady: msready,
        });

```


## Advanced Topic: Caching
By default the image service generates a new internal HOOPS Communicator context every time a new image is requested. Creating this new context can take a bit of time. In addition the image server has to load the requested scs file into the viewer. If you know you want to render multiple images from the same model you can provide a cacheID to the image service. If the cacheID is provided the image service will reuse the same HOOPS Communicator viewer context if it finds it in the cache. It will still reload the model though unless you omit the model reference from the call. See below for an example:

```
await imageservice.generateImage(outputPath:"c:/temp/micro1.png","E:/mymodels/microengine.scs",{cacheID:"micro"});          //make a screenshot of microengine with the default camera
await this.generateImage(null,{outputPath:"c:/temp/micro2.png",callback:function() {hwv.view.setViewOrientation(Communicator.ViewOrientation.Top);},cacheID:"micro"});  //make another screenshot of microengine from the top without reloading the model
```

You can also use this mechanism to start the viewer without loading a model and then do the loading in your callback. See below for an example. This approach of course requires access to the models from the HOOPS Web Viewer context so you most likely want to use this in combination with setting a custom viewer directory. (see above)


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


## HOOPS Communicator Version
This version of the HC Image Service is using **HOOPS Communicator 2022 SP1 U2**. It will likely not work with scs files generated with newer versions of HOOPS Communicator unless you provide a custom viewer directory (see above).

