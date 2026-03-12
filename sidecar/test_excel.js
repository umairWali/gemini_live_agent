import ExcelJS from 'exceljs';
import fs from 'fs';

async function test() {
    try {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Test');
        sheet.addRow({ id: 1, name: 'Test' });
        await workbook.xlsx.writeFile('/tmp/test.xlsx');
        console.log('Success');
    } catch (e) {
        console.error(e);
    }
}
test();
