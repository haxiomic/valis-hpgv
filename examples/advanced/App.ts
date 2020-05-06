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
            collapsedHeightPx: 40,
            // compact: true,
            inputParameters: [2, 0.7, -1.0, 0, 0.43, 15],
            expandable: true,
        {
            name: 'bigBed',
            longname: 'Long name',
            shortname: 'Short name',
            type: 'annotation',
            path: 'https://www.encodeproject.org/files/ENCFF609BMS/@@download/ENCFF609BMS.bigBed',
            heightPx: 60,
            inputParameters: [2, 0.7, -1.0, 0, 0.43, 15],
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

// Input parameters for annotation type tracks in "inputParameters"
// Parameter 0: "yDivisor"
//              how closely spaced should double tracks be? This sets value for y based on annotation Y
//              when it is 2, tracks are spaced tightly, with 1, tracks have more space between them
// Parameter 1: "relativeY" for "updateMicroAnnotations"
//              how offset from the top should the tracks be?
//              with value of 0.7, there is some space from the top
//              with 0.3, they are cropped by the top of the track
//              note that there is a separate parameter for the zoomed-in and zoomed-out annotation drawings
// Parameter 2: "originY"
//              how do we want the labels to line up with the annotation blocks?
//              larger negative numbers (-1.3) will have them centered
//              less large negative numbers (-1) will have them directly on top of the drawings
//              a value of 0 will allow some good space between the label and the drawing
// Parameter 3: "yOffset"
//              this may not be useful actually, possibly to be deleted
// Parameter 4: "relativeY" for "updateMacroAnnotations"
//              how offset from the top should the tracks be?
//              note that this parameter should make the zoomed-in and zoomed-out annotations line up
//              however, bewilderingly, to get the annotations to line up we do not want matching offsets in (most?) cases
// Parameter 5: "TRANSCRIPT_HEIGHT"
// Note: "heightPx" is also closely tied to these other parameters

console.log(config);

let hpgv = new GV.GenomeVisualizer(config);
hpgv.setLocation({
    contig: 'chr1',
    x0: 105916766,
    x1: 106074164,
});

hpgv.render({ width: 800, height: 600 }, document.getElementById('container'));

document.getElementById('button-to-click').addEventListener('click', () => {
    console.log('clicked!');
    hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 24895622 });
});

// document.getElementById('collapse-all').addEventListener('click', () => {
//     console.log('clicked!');
//     hpgv.setLocation({ contig: 'ch1', x0: 10000, x1: 248956422 });
// });
