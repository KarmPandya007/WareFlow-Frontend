declare module 'jspdf' {
  export class jsPDF {
    constructor(opts?: any);
    text(text: string, x: number, y: number, options?: any): any;
    addPage(): any;
    save(filename?: string): any;
    setFontSize(size: number): any;
    setLineWidth(width: number): any;
    line(x1: number, y1: number, x2: number, y2: number): any;
  }

  const _default: { jsPDF: typeof jsPDF } & any;
  export default _default;
}
