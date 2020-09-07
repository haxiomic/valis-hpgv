export declare enum GenomicFileFormat {
    BigWig = 0,
    BigBed = 1,
    BigBedNarrowPeak = 2,
    BigBedBroadPeak = 3,
    ValisGenes = 4,
    ValisDna = 5,
    ValisVariants = 6
}
export declare class Formats {
    static extensionMap: {
        [key: string]: GenomicFileFormat;
    };
    static determineFormat(path: string, fileVariantType?: string): GenomicFileFormat | undefined;
}
