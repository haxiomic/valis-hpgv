// import React = require("react");
const GV = require('../../dist/valis-hpgv.js');

// const TrackLabel = () => {
//     return (
//         <div>This is a test</div>;
//     );
// }

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let config = {
    allowNewPanels: true,
    highlightLocation: 'chr1:54877700',
    tracks: [
        {
            name: 'GRCh37',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'sequence',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vdna-dir',
        },
        {
            name: 'Valis Genes',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'annotation',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vgenes-dir',
        },
        {
            name: 'bigBed',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'annotation',
            path: 'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
        },
        {
            name: 'bigWig',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
        },
        {
            name: 'bigWig',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF985ZQU/@@download/ENCFF985ZQU.bigWig',
        }
    ],
};

console.log(config);

let hpgv = new GV.GenomeVisualizer(config);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));

document.getElementById('button-to-click').addEventListener('click', () => {
    console.log('clicked!');
    hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
});

// document.getElementById('collapse-all').addEventListener('click', () => {
//     console.log('clicked!');
//     hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
// });
