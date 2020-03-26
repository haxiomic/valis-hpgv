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
import { AnnotationTileLoader } from "./track/annotation/AnnotationTileLoader";
import { AnnotationTrack } from "./track/annotation/AnnotationTrack";
import { SequenceTileLoader } from "./track/sequence/SequenceTileLoader";
import { SequenceTrack } from "./track/sequence/SequenceTrack";
import { VariantTileLoader } from "./track/variant/VariantTileLoader";
import { VariantTrack } from "./track/variant/VariantTrack";
import { TrackObject } from "./track/TrackObject";
import { SignalTileLoader } from "./track/signal/SignalTileLoader";
import { SignalTrack } from "./track/signal/SignalTrack";
import { BigWigReader, AxiosDataLoader } from "bigwig-reader";
import { SignalTrackModel, AnnotationTrackModel, SequenceTrackModel, VariantTrackModel } from "./track";
import { GenomicLocation, Contig } from "./model";
import { Panel } from "./ui";
import Axios from "axios";
import { Formats, GenomicFileFormat } from "./formats/Formats";

import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd';

const _ = require('underscore');

interface Item {
    id: string;
    content: string;
}

const getItems = (count: number): Item[] => {
  return Array
    .from({length: count}, (v, k) => k)
    .map(k => ({
      content: `item ${k}`,
      id: `item-${k}`
    }));
};

const reorder = (list: any[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const getItemStyle = (isDragging: any, draggableStyle: any):{} => ({
  userSelect: 'none',
  background: isDragging ? 'lightgreen' : 'grey',
  ...draggableStyle
});

const getListStyle = (isDraggingOver: boolean, width: number):{} => ({
  background: isDraggingOver ? 'lightblue' : 'lightgrey',
  width: width,
});

export interface GenomeVisualizerRenderProps {
    width: number,
    height: number,
    configuration: object,
    dataSource: IDataSource | string,

    pixelRatio?: number,
    style?: React.CSSProperties,
    highlightLocation?: string,
}

export interface DraggableRenderProps {
    width: number,
    height: number,
    configuration: object,
    dataSource: IDataSource | string,
}

interface AppState {
  items: Item[];
  splitConfigurations: Array<object>;
  browserLocation: any;
}

interface CustomTileLoader<ModelType> {
    new(dataSource: IDataSource, model: ModelType, contig: string, ...args: Array<any>): TileLoader<any, any>;

    // produce a key differentiates models that require a separate tile loader / data cache instance
    cacheKey (model: ModelType): string | null;
    getAvailableContigs(model: ModelType): Promise<Array<Contig>>;
}

interface CustomTrackObject {
    new(model: TrackModel): TrackObject<TrackModel, any>;

    getDefaultHeightPx?: (model: TrackModel) => number; // optionally override the default track height
    getExpandable?: (model: TrackModel) => boolean; // disable expandability by setting this to false

    styleNodes?: React.ReactNode; // occasionally it might be useful to have sub nodes within a track's style proxy node
}

export class GenomeVisualizerDraggableTracks extends React.Component<DraggableRenderProps, AppState> {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;

    public id2List:{ [id: string]: string } = {
        droppable: 'items',
        droppable2: 'selected',
    };

    constructor(props?: any){
        super(props);
        const numTracks = props.configuration.tracks.length;
        const items = getItems(numTracks);

        const splitConfigurations: Array<object> = [];
        let tempConfig: any = {};
        props.configuration.tracks.forEach((track: object, trackIndex: number) => {
            tempConfig = Object.assign({}, props.configuration);
            tempConfig.tracks = [];
            tempConfig.tracks[0] = props.configuration.tracks[trackIndex];
            splitConfigurations.push(tempConfig);
        });

        this.state = {
            items,
            splitConfigurations,
            browserLocation: `${props.configuration.panels[0].location.contig}:${props.configuration.panels[0].location.x0}-${props.configuration.panels[0].location.x1}`,
        };
        this.onDragEnd = this.onDragEnd.bind(this);
        this.handleLocation = _.debounce(this.handleLocation, 20).bind(this);
    }

    onDragEnd(result: DropResult) {
      if (!result.destination) {
        return;
      }

      const items = reorder(
          this.state.items,
          result.source.index,
          result.destination.index
      );

      this.setState({items});
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
        if (this.appCanvasRef == null) return;

        this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

        // appCanvas should react to user input before animation are stepped
        // this enables any animations spawned by the interaction events to be progressed before rendering
        this.appCanvasRef.handleUserInteraction();

        Animator.frame();

        this.appCanvasRef.renderCanvas();
    }

    clearCaches() {
        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
        }
    }

    handleLocation(newLocation: any) {
        if (newLocation !== this.state.browserLocation) {
            if (newLocation.split(':')[0]) {
                this.setState({ browserLocation: newLocation });
            }
        }
    }

    render() {
        return (
            <React.Fragment>
                <h3>This is the component</h3>
                <h5>We have drag-and-drop working now</h5>
                <div className="react-object-container">
                    <div className="hpgv_ui-block hpgv_panel-header">
                        <button>
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                        </button>
                        <span>
                            <b>{this.state.browserLocation}</b>
                        </span>
                        <button>
                            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                        </button>
                    </div>
                </div>
                <DragDropContext onDragEnd={this.onDragEnd}>
                  <Droppable droppableId="droppable">
                    {(provided, snapshot) => (
                        <div
                            ref={provided.innerRef}
                            style={getListStyle(snapshot.isDraggingOver, this.props.width)}
                        >
                        {this.state.items.map((item, itemIndex) => (
                              <Draggable key={item.id} draggableId={item.id} index={itemIndex}>
                                {// tslint:disable-next-line:no-shadowed-variable
                                (provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        style={getItemStyle(
                                            snapshot.isDragging,
                                            provided.draggableProps.style
                                        )}
                                      >
                                        <GenomeTrack
                                            width={this.props.width}
                                            height={this.props.height}
                                            configuration={this.state.splitConfigurations[itemIndex]}
                                            dataSource={this.props.dataSource}
                                            onLocationChange={this.handleLocation}
                                            scrollLocation={this.state.browserLocation}
                                        />
                                    </div>
                                )}
                              </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                    )}
                  </Droppable>
                </DragDropContext>
            </React.Fragment>
        );
    }

}

export interface GenomeTrack {
    width: number,
    height: number,

    pixelRatio?: number,
    style?: React.CSSProperties,
    highlightLocation?: string,

    onLocationChange?: Function,

    scrollLocation?: object,
}

export interface GenomeTrackProps {
    width: number,
    height: number,
    configuration: object,
    dataSource: IDataSource | string,

    pixelRatio?: number,
    style?: React.CSSProperties,
    highlightLocation?: string,

    onLocationChange?: Function,

    scrollLocation?: object,
}

export class GenomeTrack extends React.Component<GenomeTrackProps, {}> {
    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;

    constructor(props?: any, configuration?: GenomeVisualizerConfiguration, dataSource?: IDataSource | string){
        super(props);

        this.trackViewer = new TrackViewer();
        this.trackViewer.setLocation = this.props.onLocationChange;
        this.setDataSource(props.dataSource);

        const config = props.configuration;
        if (Array.isArray(config)) {
            if (config.length > 0) {
                // add tracks from path list
                for (let path of config) {
                    this.addTrackFromFilePath(path, undefined, false);
                }
            }
        } else {
            if (config != null) {
                this.setConfiguration(config);
            }
        }
    }

    componentWillReceiveProps(nextProps: any) {
        const contig = nextProps.scrollLocation.split(':')[0];
        const range = nextProps.scrollLocation.split(':')[1];
        const splitRange = range.split('-');
        this.setContig(contig);
        this.setRange(splitRange[0], splitRange[1]);
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

    /**
     * Sets the current displayed genomic location (contig, region) of the first open panel
     * @param genomicLocation `{contig: string, x0: number, x1: number}`
     */
    setLocation(genomicLocation: GenomicLocation) {
        this.props.onLocationChange(genomicLocation);
        this.setContig(genomicLocation.contig);
        this.setRange(genomicLocation.x0, genomicLocation.x1);
    }

    /**
     * Sets the current displayed contig of the first open panel
     * Use with `setRange()` to specify a complete location
     * @param contig id of contig within available data
     */
    setContig(contig: string) {
        if (this.getPanels().length > 0) {
            this.getPanels()[0].setContig(contig);
        }
    }

    /**
     * Sets the current displayed region of the first open panel
     * Spanned length = x1 - x0
     * @param x0 left base index (starting at 0)
     * @param x1 right base index
     */
    setRange(x0: number, x1: number) {
        if (this.getPanels().length > 0) {
            this.getPanels()[0].setRange(x0, x1);
        }
    }

    addTrack(model: TrackModel, animateIn: boolean = true, highlightLocation: string) {
        return this.trackViewer.addTrack(model, animateIn, highlightLocation);
    }

    addTrackFromFilePath(path: string, name?: string, animateIn?: boolean, highlightLocation?: string) {
        // we don't know what contigs are available so we must read the first file for this
        let basename = path.split('/').pop().split('\\').pop();
        let parts = basename.split('.');
        parts.pop();
        let filename = parts.join('.');

        let trackName = (name != null ? name : filename);

        let format = Formats.determineFormat(path);

        switch (format) {
            case GenomicFileFormat.BigWig: {
                let model: SignalTrackModel = {
                    type: 'signal',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisGenes:
            case GenomicFileFormat.BigBed:
            {
                let model: AnnotationTrackModel = {
                    type: 'annotation',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisDna: {
                let model: SequenceTrackModel = {
                    type: 'sequence',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            case GenomicFileFormat.ValisVariants: {
                let model: VariantTrackModel = {
                    type: 'variant',
                    name: trackName,
                    path: path,
                };
                return this.addTrack(model, animateIn, highlightLocation);
            }
            /*
            case 'bam': { break; }
            case 'vcf': { break; }
            case 'fasta': { break; }
            case 'gff3': { break; }
            */
            default: {
                console.error(`Error adding track: Unsupported file "${path}"`);
                break;
            }
        }

        return null;
    }

    addPanel(location: GenomicLocation, animateIn: boolean) {
        return this.trackViewer.addPanel(location, animateIn);
        // Previously had --> but I think it's not necessary
        // return this.trackViewer.addPanel(location, animateIn, 'chr1:12345');
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
        return Array.from(this.trackViewer.getPanels());
    }

    clearCaches() {
        if (this.internalDataSource != null) {
            this.internalDataSource.clearTileCaches();
        }
    }

    addEventListener(event: string, listener: (...args: any[]) => void) {
        this.trackViewer.addEventListener(event, listener);
    }

    removeEventListener(event: string, listener: (...args: any[]) => void) {
        this.trackViewer.removeEventListener(event, listener);
    }

    getContentHeight() {
        return this.trackViewer.getContentHeight();
    }

    render() {
        // FIX:
        // DELETED TWO LINES WE MIGHT NEED
        // pixelRatio={props.pixelRatio || window.devicePixelRatio || 1}
        // ...props.style
        return (<>
            <AppCanvas
                ref={(v) => {
                    this.appCanvasRef = v;
                    this.startFrameLoop();
                }}
                width={this.props.width}
                height={this.props.height}
                className={'hpgv'}
                content={this.trackViewer}
                pixelRatio={1}
                style={{
                    // default style
                    fontFamily: 'sans-serif',
                }}
                onWillUnmount={() => {
                    this.stopFrameLoop();
                    this.clearCaches();
                }}
                onAppLocationChange={this.props.onLocationChange}
            >
                <div className="hpgv_style-proxies" style={{ display: 'none' }}>
                    {this.trackViewer.getStyleNodes()}
                </div>
            </AppCanvas>
        </>);
    }

    refreshStyle() {
        this.trackViewer.refreshStyle();
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
        if (this.appCanvasRef == null) return;

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
        let trackClass = this.trackTypes[type];
        if (trackClass == null) {
            console.warn(`No track type "${type}", available types are: ${Object.keys(this.trackTypes).join(', ')}`);
        }
        return trackClass;
    }

    static getTrackTypes(): Array<string> {
        return Object.keys(this.trackTypes);
    }

    static setTheme(theme: 'dark' | 'light' | null) {
        let defaultTheme = 'light';
        this.setBaseStyle(require('./styles/' + (theme || defaultTheme) + '.css'));
    }

    private static setBaseStyle(cssString: string) {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');

        // if null, remove any existing base css
        if (cssString == null) {
            if (hpgvStyleEl != null) {
                hpgvStyleEl.remove();
            }
            return;
        }

        if (hpgvStyleEl == null) {
            // add hpgv style
            hpgvStyleEl = document.createElement('style');
            hpgvStyleEl.id = 'hpgv-base';
            (document.head as any).prepend(hpgvStyleEl);
        }
        hpgvStyleEl.innerHTML = cssString;
    }

    private static removeBaseStyle() {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');
        if (hpgvStyleEl != null) {
            hpgvStyleEl.remove();
        }
    }

    private static trackTypes: {
        [ type: string ]: {
            tileLoaderClass: CustomTileLoader<TrackModel>
            trackObjectClass: CustomTrackObject
        }
    } = {};
}

export class GenomeVisualizer {

    protected trackViewer: TrackViewer;
    protected appCanvasRef: AppCanvas;
    protected internalDataSource: InternalDataSource;
    protected configuration: object;
    protected dataSource: IDataSource | string;

    constructor(configuration?: GenomeVisualizerConfiguration, dataSource?: IDataSource | string){
        this.trackViewer = new TrackViewer();

        this.configuration = configuration;
        this.dataSource = dataSource;
    }

    render(props: GenomeVisualizerRenderProps, container: HTMLElement) {
        ReactDOM.render(this.reactRender(props), document.getElementById("root"));
    }

    reactRender(props: GenomeVisualizerRenderProps = {
        width: null,
        height: null,
        configuration: null,
        dataSource: null,
    }) {
        let width = props.width == null ? 800 : props.width;
        let height = props.height == null ? 600 : props.height;

        return (<>
            <GenomeVisualizerDraggableTracks
                width={width}
                height={height}
                configuration={this.configuration}
                dataSource={this.dataSource}
            />
        </>);
    }

    /**
     * This method will update non-dom elements relying on CSS.
     * Useful to call after the CSS changes, however, if the inline style on style proxy node changes then the update will happen automatically.
     */
    refreshStyle() {
        this.trackViewer.refreshStyle();
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
        if (this.appCanvasRef == null) return;

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
        let trackClass = this.trackTypes[type];
        if (trackClass == null) {
            console.warn(`No track type "${type}", available types are: ${Object.keys(this.trackTypes).join(', ')}`);
        }
        return trackClass;
    }

    static getTrackTypes(): Array<string> {
        return Object.keys(this.trackTypes);
    }

    static setTheme(theme: 'dark' | 'light' | null) {
        let defaultTheme = 'light';
        this.setBaseStyle(require('./styles/' + (theme || defaultTheme) + '.css'));
    }

    private static setBaseStyle(cssString: string) {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');

        // if null, remove any existing base css
        if (cssString == null) {
            if (hpgvStyleEl != null) {
                hpgvStyleEl.remove();
            }
            return;
        }

        if (hpgvStyleEl == null) {
            // add hpgv style
            hpgvStyleEl = document.createElement('style');
            hpgvStyleEl.id = 'hpgv-base';
            (document.head as any).prepend(hpgvStyleEl);
        }
        hpgvStyleEl.innerHTML = cssString;
    }

    private static removeBaseStyle() {
        let hpgvStyleEl = document.head.querySelector('style#hpgv-base');
        if (hpgvStyleEl != null) {
            hpgvStyleEl.remove();
        }
    }

    private static trackTypes: {
        [ type: string ]: {
            tileLoaderClass: CustomTileLoader<TrackModel>
            trackObjectClass: CustomTrackObject
        }
    } = {};
}

GenomeVisualizer.setTheme('light');

// register track types
GenomeTrack.registerTrackType('annotation', AnnotationTileLoader, AnnotationTrack);
GenomeTrack.registerTrackType('interval', IntervalTileLoader, IntervalTrack);
GenomeTrack.registerTrackType('sequence', SequenceTileLoader, SequenceTrack);
GenomeTrack.registerTrackType('variant', VariantTileLoader, VariantTrack);
GenomeTrack.registerTrackType('signal', SignalTileLoader, SignalTrack);

GenomeTrack.setTheme('light');

export default GenomeTrack;
