import fs from 'fs';
import pdfParse from './pdfWrapper.cjs';

// Minimal valid PDF structure with text content
const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Length 150 >>
stream
BT
/F1 12 Tf
72 712 Td
(John Doe - Senior Software Engineer) Tj
0 -18 Td
(Skills: React, Node.js, TypeScript, Docker, Kubernetes, AWS, GraphQL) Tj
0 -18 Td
(Experience: Built high-performance microservices, REST APIs, and SPAs.) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000242 00000 n 
0000000319 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
519
%%EOF`;

async function test() {
  const buffer = Buffer.from(pdfContent, 'utf-8');
  try {
    console.log('pdfParse type:', typeof pdfParse);
    console.log('pdfParse keys:', Object.keys(pdfParse || {}));
    const parseFn = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
    console.log('parseFn type:', typeof parseFn);
    const data = await parseFn(buffer);
    console.log('--- Extracted Text ---');
    console.log(data.text);
    console.log('----------------------');
  } catch (err) {
    console.error('Failed to parse pdf:', err);
  }
}

test();
