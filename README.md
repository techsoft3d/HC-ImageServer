# HC-ImageServer

## Install

npm install ts3d.hc.imageserver

## Initialization

```
const imageserver = require('ts3d.hc.imageserver');
await imageserver.start(3011); //provide optional port for image server, defaults to 3010
```


## Shutdown

```
await imageserver.shutdown();
```
For performance reasons the image server should be kept running between image requests.
## Generate image data from scs file
```
 let data = await imageserver.generateImage("E:/mymodels/microengine.scs");
```
Data contains binary image data blob that can be serialized to disk, send to s3, etc.



## Generate image data from scs file and write png to disk
```
let data = await imageserver.generateImage("E:/mymodels/microengine.scs",{outputPath:"E:/mymimages/microengine.png"});
```


## Generate image data from scs file and execute custom JS
```
function myCallback()
{
    hwv.view.setBackgroundColor(new Communicator.Color(0,0,0));
    hwv.view.isolateNodes([8,6]);
}


let data = await imageserver.generateImage("E:/mymodels/microengine.scs",{callback:mycallback});
```
The callback will be executed after the modelStructureReady callback in the HOOPS Web Viewer has triggered.



## Generate image data from scs data blob
```
let data = await imageserver.generateImage(null,{imageData:myscsdata});
```


## Using your Own Communicator Server for SCZ Streaming
The default implementation of the Image Server uses is own express http server to serve scs models only. However, if you want to generate images from scz models you can run your own Communicator server for image generation. To do this the following steps are required:

1.  Install and run the HOOPS Communicator server on the machine that the image server is running on. From the package this can be accomplished by simply running **start_server.bat** from the quick_start directory.
2.  Copy imageserver.html into the source webviewer folder ("web_viewer/src" if you use the HOOPS Communicator installation). This file is a slightly modifed version of hoops_web_viewer_sample.html and can be found in the public folder of this package.
3. Provide the server url and directory to place the scz files when starting the image server (see example below when running the HOOPS Communicator server directly from the installation.)

```
await imageserver.start({customServer: "http://localhost:11180/imageserver.html?viewer=csr&", 
    sczDirectory:"E:/communicator/HOOPS_Communicator_2022_SP1_U2/quick_start/converted_models/user/sc_models"});
```

## Using the image server with your own application logic and/or upgrading the version of HOOPS Communicator manually
While you have a lot of control over the image generation via the callback mechanism, it might sometimes be necessary to use your own custom logic within the viewer itself. To do this you can provide the folder to the webviewer source during startup.

```
await imageserver.start({customViewerDirectory:"E:/myviewer"});
```

The image server expects a file called imageserver.html to be accesible in the top level viewer folder which is a slightly modified version of "hoops_web_viewer_sample.html" with the UI removed and a few callbacks added. See below for the relevant code changes. If you just want to upgrade the version of HOOPS Communicator, all you need to do is copy the imageserver.html file from the public folder of this module into your viewer folder. It will likely work with later versions of HOOPS Communicator. If not simply include the code below to "hoops_web_viewer_sample.html"

```

var currentFrameDrawn = new Date();
var modelStructureReady = false;

function frameDrawn() {
    currentFrameDrawn = new Date();
}

function msready() {
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



## Communicator Version
This version of the HC Image Server is using **HOOPS Communicator 2022 SP1 U2**. It will not work with scs files generated with newer versions of HOOPS Communicator.

