const GV = require('../../dist/valis-hpgv.js');

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let hpgv = new GV.GenomeVisualizer([
    'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vdna-dir',
    'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vgenes-dir',
    'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
    'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
]);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));