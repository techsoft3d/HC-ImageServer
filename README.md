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


## Communicator Version
This version of the HC Image Server is using **HOOPS Communicator 2022 SP1 U2**. It will not work with scs files generated with newer versions of HOOPS Communicator.

