import { strToU8, zipSync } from 'fflate';
import { importInboxDemoAccounts } from './import-inbox-demo.mjs';

// A deterministic XLSX with the same explicitly authorized fictional recipients
// as the CSV demo. Inline strings preserve the leading + in telephone numbers.
export function createContactDemoXlsx() {
  const sheetNamespace = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const relationshipsNamespace = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const officeRelationships = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const rows = [['phone','first','last','email','company','rawConsent'],
    ...importInboxDemoAccounts.recipients.map(row=>[row.phoneNumber,row.firstName,row.lastName,row.email,row.company,'granted'])];
  const escapeXml=value=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const cells = rows.map((row,index)=>`<row r="${index+1}">${row.map((value,column)=>
    `<c r="${String.fromCharCode(65+column)}${index+1}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`).join('')}</row>`).join('');
  const entries = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
    '_rels/.rels': `<Relationships xmlns="${relationshipsNamespace}"><Relationship Id="rId1" Type="${officeRelationships}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<workbook xmlns="${sheetNamespace}" xmlns:r="${officeRelationships}"><sheets><sheet name="Demo contacts" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships xmlns="${relationshipsNamespace}"><Relationship Id="rId1" Type="${officeRelationships}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
    'xl/worksheets/sheet1.xml': `<worksheet xmlns="${sheetNamespace}"><dimension ref="A1:F8"/><sheetData>${cells}</sheetData></worksheet>`,
  };
  return Buffer.from(zipSync(Object.fromEntries(Object.entries(entries).map(([name,xml])=>[name,strToU8(xml)])),
    {level:6,mtime:new Date('2000-01-01T00:00:00.000Z')}));
}
