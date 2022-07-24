#!/usr/bin/env node
var app = require('../app.js');

if (require.main === module) {
    for (let i=0;i<process.argv.length;i++) {
        console.log(i + ":" + process.argv[i]);
    }

    app.startServer();
}