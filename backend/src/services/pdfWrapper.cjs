// Mock module.parent so pdf-parse doesn't enter debug mode and crash looking for test files
module.parent = module;
const pdfParse = require('pdf-parse');
module.exports = pdfParse;
