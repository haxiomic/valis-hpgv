export class CSSUtil {

    static parseColor(color: string) {
        // use canvas 2d api to write a pixel given a CSS color, then read the written pixel RGBA
        let ctx = this.get1pxCtx();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 1, 1);
        let rgbaUInt8 = ctx.getImageData(0, 0, 1, 1).data;
        return [
            rgbaUInt8[0] / 0xff,
            rgbaUInt8[1] / 0xff,
            rgbaUInt8[2] / 0xff,
            rgbaUInt8[3] / 0xff
        ];
    }

    static getBedFileRGBA(color: string, score: number) {
        const alpha : number = (score || 1000) / 1000;
        let rgba0 : number = 107;
        let rgba1 : number = 109;
        let rgba2 : number = 136;

        if (color && color.includes('rgb')) {
            const rgba = color
                .replace('rgba', '')
                .replace('rgb', '')
                .replace('(', '')
                .replace(')', '')
                .split(',').map(Number);

            rgba0 = isNaN(rgba[0]) ? rgba0 : rgba[0];
            rgba1 = isNaN(rgba[1]) ? rgba1 : rgba[1];
            rgba2 = isNaN(rgba[2]) ? rgba2 : rgba[2];
        }

        return [rgba0 / 0xff, rgba1 / 0xff, rgba2 / 0xff, alpha];  
    }

    static getColorFromPValue(pValue: number, score: number) {
        const alpha : number = (score || 1000) / 1000;

        if (pValue === -1) {
            return [128 / 0xff, 128 / 0xff, 128 / 0xff, alpha]; //grey
        }
        
        const pValueLog = Math.log10(pValue);

        if (pValueLog <= 0.05) {
            return [255 / 0xff, 0 / 0xff, 0 / 0xff, alpha]; // red
        } else if (pValueLog > 0.05 && pValueLog <= 0.25) {
            return [255 / 0xff, 165 / 0xff, 0 / 0xff, alpha]; // orange
        } else if (pValueLog > 0.25 && pValueLog <= 0.45) {
            return [255 / 0xff, 255 / 0xff, 0 / 0xff, alpha]; //yellow
        } else if (pValueLog > 0.45 && pValueLog <= 0.65) {
            return [0 / 0xff, 255 / 0xff, 0 / 0xff, alpha]; //green
        } else if (pValueLog > 0.65 && pValueLog <= 0.85) {
            return [75 / 0xff, 0 / 0xff, 130 / 0xff, alpha]; //indigo
        } else {
            return [143 / 0xff, 0 / 0xff, 255 / 0xff, alpha]; //violet
        }
    }

    private static _1pxCtx: CanvasRenderingContext2D;
    private static get1pxCtx() {
        if (this._1pxCtx == null) {
            let canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            this._1pxCtx = canvas.getContext('2d');
            this._1pxCtx.globalCompositeOperation = 'copy';
        }
        return this._1pxCtx;
    }

}