import \* as pdf from 'pdf-parse';
console.log('pdf type:', typeof pdf);
console.log('Keys:', Object.keys(pdf));
if (pdf.default) {
    console.log('default type:', typeof pdf.default);
}
