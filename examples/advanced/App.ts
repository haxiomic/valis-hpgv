const GV = require('../../dist/valis-hpgv.js');

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let config = {
    allowNewPanels: true,
    highlightLocation: 'chr1:54877700',
    tracks: [
        {
            name: 'bigBed',
            type: 'annotation',
            path: 'https://test.encodedcc.org/files/TSTFF026516/@@download/TSTFF026516.bigBed',
        },
    ],
};

let hpgv = new GV.GenomeVisualizer(config);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));

document.getElementById('button-to-click').addEventListener('click', () => {
    console.log('clicked!');
    hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
});
