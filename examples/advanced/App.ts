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
            heightPx: 50,
        },
        {
            name: 'Valis Genes',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'annotation',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vgenes-dir',
            heightPx: 60,
            compact: true,
            inputParameters: [2, 0.7, -1.0, 30],
            expandable: true,
        {
            name: 'bigBed',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'annotation',
            path: 'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
            heightPx: 50,
            inputParameters: [2, 0.7, -1.0, 30],
            expandable: true,
        },
        {
            name: 'bigWig',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
            heightPx: 50,
        },
        {
            name: 'bigWig',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF985ZQU/@@download/ENCFF985ZQU.bigWig',
            heightPx: 50,
        }
    ],
};

console.log(config);

let hpgv = new GV.GenomeVisualizer(config);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));

document.getElementById('button-to-click').addEventListener('click', () => {
    console.log('clicked!');
    hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 24895622 });
});

// document.getElementById('collapse-all').addEventListener('click', () => {
//     console.log('clicked!');
//     hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
// });
