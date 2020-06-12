const GV = require('../../dist/valis-hpgv.js');

// pass a list of files to visualize in an array, the viewer will determine the best visualization to use
let config = {
    allowNewPanels: true,
    highlightLocation: 'chr1:54877700',
    tracks: [
        {
            name: 'GRCh37',
            type: 'sequence',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vdna-dir',
            expandable: true,
            expanded: false,
            expandedTrackHeightPx: 80,
            heightPx: 50,
        },
        {
            name: 'Valis Genes',
            type: 'annotation',
            path: 'https://encoded-build.s3.amazonaws.com/browser/GRCh38/GRCh38.vgenes-dir',
            displayLabels: false,
            expandable: true,
            expanded: false,
            expandedTrackHeightPx: 80,
            heightPx: 50,
        },
        {
            name: 'bigBed',
            type: 'annotation',
            path: 'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
            expandable: true,
            expanded: false,
            expandedTrackHeightPx: 80,
            heightPx: 50,
        },
        {
            name: 'bigWig',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF833POA/@@download/ENCFF833POA.bigWig',
            expandable: true,
            expanded: true,
            expandedTrackHeightPx: 80,
            heightPx: 50,
        },
        {
            name: 'bigWig',
            type: 'signal',
            path: 'https://www.encodeproject.org/files/ENCFF985ZQU/@@download/ENCFF985ZQU.bigWig',
            expandable: true,
            expanded: true,
            expandedTrackHeightPx: 80,
            heightPx: 50,
        }
    ],
};

let hpgv = new GV.GenomeVisualizer(config);

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));

document.getElementById('button-to-click').addEventListener('click', () => {
    console.log('clicked!');
    hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
});
