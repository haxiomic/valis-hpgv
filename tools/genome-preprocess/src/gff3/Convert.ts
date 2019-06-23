/**
 * http://www.sequenceontology.org/browser/current_svn
 * 
 * - On genes vs transcripts https://www.biostars.org/p/244850/
 * - On strands http://www.sci.sdsu.edu/~smaloy/MicrobialGenetics/topics/chroms-genes-prots/temp-strand.html
 * 
 * - Gene
 *  `A gene is a locus that produces a set of similar and functionally-related transcripts`
 *  `Includes all of the sequence elements necessary to encode a functional transcript. A gene may include regulatory regions, transcribed regions and/or other functional sequence regions.`
 * 
 *     - Transcript
 *       `a given possible RNA transcript associated with a GeneRegion`
 * 
 * Assumptions
 *  - A 'gene' by default is a protein-coding gene
 */

import * as fs from 'fs';
import * as path from 'path';
import { AnnotationTileset, AnnotationTile } from './AnnotationTileset';
import { Gff3Parser, Gff3 } from 'genomics-formats/lib/gff3/Gff3Parser';
import { Feature } from 'genomics-formats/lib/gff3/Feature';
import { Terminal } from '../Terminal';
import { deleteDirectory } from '../FileSystemUtils';
import Contig from '../Contig';

// settings

export function gff3Convert(inputFilePath: string, outputDirectory: string): Promise<string> {
	return new Promise((resolve, reject) => {
		let parsedPath = path.parse(inputFilePath);
		const filename = parsedPath.name;
		const vgenesDirectory = `${outputDirectory}/${filename}.vgenes-dir`;

		deleteDirectory(vgenesDirectory);
		fs.mkdirSync(vgenesDirectory);

		const featureTypeBlacklist = ['biological_region', 'chromosome'];

		// initialize
		let unknownFeatureTypes: { [key: string]: number } = {};
		let skippedFeatureTypes: { [key: string]: number } = {};

		let onUnknownFeature = (f: Feature) => { unknownFeatureTypes[f.type] = (unknownFeatureTypes[f.type] || 0) + 1 }

		let lodLevel0TileSize = 1 << 20;

		let tileset = new AnnotationTileset(
			lodLevel0TileSize, // ~1 million,
			false,
			onUnknownFeature,
			Terminal.error,
		);

		let macroLodLevel = 5;
		let macroTileset = new AnnotationTileset(
			lodLevel0TileSize * (1 << macroLodLevel),
			true,
			onUnknownFeature,
			Terminal.error,
		);

		// track contigs as they're created to use as an estimate where explicit sequence ranges are not provided 
		let implicitContigs = new Array<Contig>();

		let completedSequences = new Set<string>();

		let inputFileStat = fs.statSync(inputFilePath);

		let stream = fs.createReadStream(inputFilePath, {
			encoding: 'utf8',
			autoClose: true,
		});

		let _lastSequenceId: string | undefined = undefined;
		let _lastProgressTime_ms = -Infinity;
		const storeFeatures = false;
		let parser = new Gff3Parser(
			{
				onFeatureComplete: (feature) => {
					if (feature.sequenceId === undefined) {
						Terminal.warn(`Undefined sequenceId for feature (skipping)`, feature);
						return;
					}

					let _lastSequenceIdCopy = _lastSequenceId;
					_lastSequenceId = feature.sequenceId;

					if (feature.sequenceId !== _lastSequenceIdCopy) {
						if (_lastSequenceIdCopy !== undefined) {
							// sequence complete
							onSequenceComplete(_lastSequenceIdCopy);
						}

						// sequence started
						// Terminal.log(`Started sequence <b>${feature.sequenceId}</b>`);

						if (completedSequences.has(feature.sequenceId)) {
							Terminal.error(`Started sequence twice! Results will be unreliable`);
						}
					}

					if (featureTypeBlacklist.indexOf(feature.type) === -1) {
						tileset.addTopLevelFeature(feature);
						macroTileset.addTopLevelFeature(feature);
					} else {
						skippedFeatureTypes[feature.type] = (skippedFeatureTypes[feature.type] || 0) + 1;
					}

					// log progress
					let hrtime = process.hrtime();
					let t_ms = hrtime[0] * 1000 + hrtime[1] / 1000000;
					const progressUpdatePeriod_ms = 1000 / 60;

					if ((t_ms - _lastProgressTime_ms) > progressUpdatePeriod_ms) {
						Terminal.rewriteLineFormatted('progress-update', `<b>></b> Parsing features of sequence <b>${feature.sequenceId}</b> <b>${Math.round(100 * stream.bytesRead / inputFileStat.size)}%</b>`);
						_lastProgressTime_ms = t_ms;
					}
				},

				// print errors and comments
				onError: (e) => Terminal.error(e),
				onComment: (c) => Terminal.log(`<dim><i>${c}<//>`),

				onComplete: (gff3) => {
					if (_lastSequenceId !== undefined) {
						onSequenceComplete(_lastSequenceId);
					}

					saveManifest(gff3, vgenesDirectory);

					// post-convert info
					if (Object.keys(unknownFeatureTypes).length > 0) {
						Terminal.warn('Unknown features:', unknownFeatureTypes);
					}
					if (Object.keys(skippedFeatureTypes).length > 0) {
						Terminal.log('Skipped features:<b>', skippedFeatureTypes);
					}

					resolve(vgenesDirectory);
				}

			},
			storeFeatures
		);

		stream.on('data', parser.parseChunk);
		stream.on('close', parser.end);

		Terminal.log(`Reading <b>${inputFilePath}</b>`);

		function onSequenceComplete(sequenceId: string) {
			Terminal.success(`Completed sequence <b>${sequenceId}</b>`);

			completedSequences.add(sequenceId);

			// save tiles to disk
			// assume all sequences represent chromosome and prefix with chr
			let sequenceName = sequenceId.substr(0, 3) == 'chr' ? sequenceId : `chr${sequenceId}`;

			saveTiles(tileset.sequences[sequenceId], `${vgenesDirectory}/${sequenceName}`);
			saveTiles(macroTileset.sequences[sequenceId], `${vgenesDirectory}/${sequenceName}-macro`);

			// add to contigs list for manifest.json
			let tiles = tileset.sequences[sequenceId];
			let lastTile = tiles[tiles.length - 1];
			let totalSpan = lastTile.startIndex + lastTile.span;
			implicitContigs.push({
				id: sequenceId,
				name: sequenceName,
				startIndex: 0,
				span: totalSpan,
			});


			// release sequence tile data to GC since we no longer need it
			delete tileset.sequences[sequenceId];
			delete macroTileset.sequences[sequenceId];
		}

		function saveTiles(tiles: Array<AnnotationTile>, directory: string) {
			try {
				// delete and create output directory
				deleteDirectory(directory);

				let totalFeatures = tiles.reduce((accumulator, current) => {
					return accumulator + current.content.length;
				}, 0);

				if (totalFeatures === 0) {
					return;
				}

				fs.mkdirSync(directory);

				// write tile files to output directory
				let nSavedFiles = 0;

				for (let tile of tiles) {
					let filename = `${tile.startIndex.toFixed(0)},${tile.span.toFixed(0)}`;
					let filePath = `${directory}/${filename}.json`;
					fs.writeFileSync(filePath, JSON.stringify(tile.content));
					nSavedFiles++;
				}

				Terminal.success(`Saved <b>${nSavedFiles}</b> files into <b>${directory}</b>`);
			} catch (e) {
				Terminal.error(e);
				reject(e);
			}
		}

		function saveManifest(gff3: Gff3, directory: string) {
			try {
				let contigs = new Array<Contig>();

				for (let implicitContig of implicitContigs) {
					let explicitSeq = gff3.sequences[implicitContig.id];
					let explicitSpan: number | null = null;
					if ((explicitSeq != null) && (explicitSeq.start != null) && (explicitSeq.end != null)) {
						explicitSpan = explicitSeq.end - explicitSeq.start;
					}
					
					contigs.push({
						id: implicitContig.id,
						name: implicitContig.name,
						startIndex: explicitSeq != null ? ((explicitSeq.start || 0) - 1) : implicitContig.startIndex,
						span: explicitSpan != null ? explicitSpan : implicitContig.span
					});
				}

				let manifest = JSON.stringify({
					contigs: implicitContigs
				});

				let path = `${directory}/manifest.json`;

				fs.writeFileSync(path, manifest);
				Terminal.success(`Saved <b>${path}</b>`);
			} catch (e) {
				Terminal.error(e);
				reject(e);
			}
		}
	});
}