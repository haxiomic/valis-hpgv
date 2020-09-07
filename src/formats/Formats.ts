export enum GenomicFileFormat {
    BigWig,
    BigBed,
    BigBedNarrowPeak,
    BigBedBroadPeak,
    ValisGenes,
    ValisDna,
    ValisVariants,
}

export class Formats {

    static extensionMap: { [key: string]: GenomicFileFormat } = {
        // BigWig
        'bigwig': GenomicFileFormat.BigWig,
        'bwig': GenomicFileFormat.BigWig,
        'bw': GenomicFileFormat.BigWig,

        // BigBEd
        'bigbed': GenomicFileFormat.BigBed,
        'bbed': GenomicFileFormat.BigBed,
        'bb': GenomicFileFormat.BigBed,

        'vgenes-dir': GenomicFileFormat.ValisGenes,
        'vdna-dir': GenomicFileFormat.ValisDna,
        'vvariants-dir': GenomicFileFormat.ValisVariants,
        
    }

    static determineFormat(path: string, fileVariantType: string = null): GenomicFileFormat | undefined {
        let fileExtension = path.substr(path.lastIndexOf('.') + 1).toLowerCase();
        const extension = this.extensionMap[fileExtension];
    
        if (extension === GenomicFileFormat.BigBed && fileVariantType === 'narrowPeak') {
            return GenomicFileFormat.BigBedNarrowPeak;
        }

        return extension;
    }

}