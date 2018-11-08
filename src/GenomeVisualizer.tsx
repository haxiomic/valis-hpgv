import * as React from "react";
import * as ReactDOM from "react-dom";

import { Animator } from "./Animator";
import { IDataSource } from "./data-source/IDataSource";
import { InternalDataSource } from "./data-source/InternalDataSource";
import { ManifestDataSource, Manifest } from "./data-source/ManifestDataSource";
import { GenomeVisualizerConfiguration } from "./GenomeVisualizerConfiguration";
import { TrackModel } from "./track/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import { TrackViewer, Track } from "./ui/TrackViewer";
import { IntervalTileLoader, IntervalTrack } from "./track/interval";
import { TileLoader } from "./track/TileLoader";
import { AnnotationTileLoader, MacroAnnotationTileLoader } from "./track/annotation/AnnotationTileLoader";
import { AnnotationTrack } from "./track/annotation/AnnotationTrack";
import { SequenceTileLoader } from "./track/sequence/SequenceTileLoader";
import { SequenceTrack } from "./track/sequence/SequenceTrack";
import { VariantTileLoader } from "./track/variant/VariantTileLoader";
import { VariantTrack } from "./track/variant/VariantTrack";
import { TrackObject } from "./track/TrackObject";
import { SignalTileLoader } from "./track/signal/SignalTileLoader";
import { SignalTrack } from "./track/signal/SignalTrack";
import { BigWigReader, AxiosDataLoader } from "bigwig-reader";
import { SignalTrackModel } from "./track";
import { GenomicLocation } from "./model";
import { Panel } from "./ui";

export interface GenomeVisualizerRenderProps {
    width: number,
    height: number,

    pixelRatio?: number,
    style?: React.CSSProperties,
}

interface CustomTileLoader<ModelType> {
    new(dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;

    // produce a key differentiates models that require a separate tile loader / data cache instance
    cacheKey (model: ModelType): string | null;
}

interface CustomTrackObject {
    new(model: TrackModel): TrackObject<TrackModel, any>;
}
export class GenomeVisualizer {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;

    constructor(configuration?: GenomeVisualizerConfiguration | Array<string>, dataSource?: IDataSource | string){
        this.trackViewer = new TrackViewer();

        this.setDataSource(dataSource);

        if (Array.isArray(configuration)) {
            if (configuration.length > 0) {

                // add tracks from path list
                for (let path of configuration) {
                    this.addTrackFromFilePath(path, false);
                }

                // we determine a GenomeVisualizerConfiguration by inspecting the files in the list
                let firstFilePath = configuration[0];

                // we don't know what contigs are available so we must read the first file for this
                let fileType = firstFilePath.substr(firstFilePath.lastIndexOf('.') + 1).toLowerCase();

                switch (fileType) {
                    case 'bigwig': {
                        let bigwigReader = new BigWigReader(new AxiosDataLoader(firstFilePath));
                        bigwigReader.getHeader().then((header) => {
                            // create a manifest that lists the available contigs
                            let manifest: Manifest = {
                                contigs: []
                            }

                            let availableChromosomes = header.chromTree.idToChrom;
                            availableChromosomes.sort((a, b) => {
                                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                            });

                            for (let contigId of availableChromosomes) {
                                let id = header.chromTree.chromToId[contigId];
                                manifest.contigs.push({
                                    id: contigId,
                                    startIndex: 0,
                                    span: header.chromTree.chromSize[id] || header.chromTree.chromSize[contigId]
                                });
                            }

                            if (this.getPanels().size === 0) {
                                this.addPanel({ contig: manifest.contigs[0].id, x0: 0, x1: manifest.contigs[0].span - 1 }, false);
                                this.setDataSource(new ManifestDataSource(manifest));
                            }
                        });
                        break;
                    }
                    // case 'bam': { break; }
                    // case 'vcf': { break; }
                    // case 'fasta': { break; }
                    // case 'gff3': { break; }
                    default: {
                        console.error(`Unsupported fileType "${fileType}"`);
                        // add a human chromosome 1 panel and _hope_ that matches the available data
                        this.addPanel({ contig: 'chr1', x0: 0, x1: 249e9 }, false);
                        break;
                    }
                }
            }
        } else {
            if (configuration != null) {
                // default panel if none is set
                if (configuration.panels == null) {
                    configuration.panels = [{
                        location: { contig: 'chr1', x0: 0, x1: 249e6 }
                    }];
                }

                this.setConfiguration(configuration);
            }
        }
    }

    setDataSource(dataSourceArg: IDataSource | string | undefined) {
        let dataSource: IDataSource;
        if ((typeof dataSourceArg === 'string') || (dataSourceArg == null)) {
            // if first argument is string, use a manifest data source
            // if a manifest data source is created with a null path then it acts as an empty manifest
            dataSource = new ManifestDataSource(dataSourceArg as any);
        } else {
            dataSource = dataSourceArg;
        }

        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
            this.internalDataSource = null;
        }

        this.internalDataSource = new InternalDataSource(dataSource);

        this.trackViewer.setDataSource(this.internalDataSource);
    }

    setConfiguration(configuration: GenomeVisualizerConfiguration) {
        this.trackViewer.setConfiguration(configuration);
    }

    getConfiguration() {
        return this.trackViewer.getConfiguration();
    }

    addTrack(model: TrackModel, animateIn: boolean = true) {
        return this.trackViewer.addTrack(model, animateIn);
    }

    addTrackFromFilePath(path: string, animateIn: boolean) {
        // we don't know what contigs are available so we must read the first file for this
        let fileType = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
        let fileName = path.split('/').pop().split('\\').pop();

        switch (fileType) {
            case 'bigwig': {
                let model: SignalTrackModel = {
                    type: 'signal',
                    name: fileName,
                    path: path,
                };
                return this.addTrack(model, animateIn);
            }
            /*
            case 'bam': { break; }
            case 'vcf': { break; }
            case 'fasta': { break; }
            case 'gff3': { break; }
            */
            default: {
                console.error(`Error adding track: Unsupported fileType "${fileType}"`);
                break;
            }
        }

        return null;
    }

    addPanel(location: GenomicLocation, animateIn: boolean) {
        return this.trackViewer.addPanel(location, animateIn);
    }

    closeTrack(track: Track, animateOut: boolean = true, onComplete?: () => void) {
        return this.trackViewer.closeTrack(track, animateOut, onComplete);
    }

    closePanel(panel: Panel, animateOut: boolean, onComplete?: () => void) {
        return this.trackViewer.closePanel(panel, animateOut, onComplete);
    }

    getTracks() {
        return this.trackViewer.getTracks();
    }

    getPanels() {
        return this.trackViewer.getPanels();
    }

    clearCaches() {
        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
        }
    }

    render(props: GenomeVisualizerRenderProps, container: HTMLElement) {
        ReactDOM.render(this.reactRender(props), container);
    }

    reactRender(props: GenomeVisualizerRenderProps = {
        width: null,
        height: null,
    }) {
        if (props == null) {
            ;
        }
        let width = props.width == null ? 800 : props.width;
        let height = props.height == null ? 600 : props.height;
        return (
            <AppCanvas
                ref={(v) => {
                    this.appCanvasRef = v;
                    this.startFrameLoop();
                }}
                width={width}
                height={height}
                content={this.trackViewer}
                pixelRatio={props.pixelRatio || window.devicePixelRatio || 1}
                style={{
                    // default style
                    fontFamily: 'sans-serif',
                    ...props.style
                }}
                onWillUnmount={() => {
                    this.stopFrameLoop();
                }}
            />
        );
    }

    private _frameLoopHandle: number = 0;
    protected startFrameLoop() {
        if (this._frameLoopHandle === 0) {
            this.frameLoop();
        }
    }

    protected stopFrameLoop() {
        if (this._frameLoopHandle !== 0) {
            window.cancelAnimationFrame(this._frameLoopHandle);
            this._frameLoopHandle = 0;
        }
    }

    protected frameLoop = () => {
        this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

        // appCanvas should react to user input before animation are stepped
        // this enables any animations spawned by the interaction events to be progressed before rendering
        this.appCanvasRef.handleUserInteraction();

        Animator.frame();

        this.appCanvasRef.renderCanvas();
    }

    static registerTrackType<ModelType extends TrackModel>(
        type: ModelType['type'],
        tileLoaderClass: CustomTileLoader<ModelType>,
        trackObjectClass: CustomTrackObject,
    ) {
        this.trackTypes[type] = {
            tileLoaderClass: tileLoaderClass,
            trackObjectClass: trackObjectClass,
        }
    }

    static getTrackType(type: string) {
        return this.trackTypes[type];
    }

    private static trackTypes: {
        [ type: string ]: {
            tileLoaderClass: CustomTileLoader<TrackModel>
            trackObjectClass: CustomTrackObject
        }
    } = {};

}

// register track types
GenomeVisualizer.registerTrackType('annotation', AnnotationTileLoader, AnnotationTrack);
GenomeVisualizer.registerTrackType('macro-annotation', MacroAnnotationTileLoader, AnnotationTrack);
GenomeVisualizer.registerTrackType('interval', IntervalTileLoader, IntervalTrack);
GenomeVisualizer.registerTrackType('sequence', SequenceTileLoader, SequenceTrack);
GenomeVisualizer.registerTrackType('variant', VariantTileLoader, VariantTrack);
GenomeVisualizer.registerTrackType('signal', SignalTileLoader, SignalTrack);

export default GenomeVisualizer;