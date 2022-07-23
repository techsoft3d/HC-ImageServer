
var currentFrameDrawn = new Date();
var modelStructureReady = false;

async function frameDrawn() {    
    currentFrameDrawn = new Date();  
}

async function msready() {    
    modelStructureReady = true;
}
