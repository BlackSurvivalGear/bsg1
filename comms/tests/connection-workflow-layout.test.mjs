import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('capture action parent before moving buttons',()=>{
 const capture=source.indexOf("const connectionActions=$('connect').parentElement;");
 const move=source.indexOf("usbColumn.append(usbIndicator,$('connect'))");
 const replace=source.indexOf('connectionActions.replaceChildren(controlGrid,readRow,secondaryRow)');
 assert.ok(capture>=0 && move>capture && replace>move);
});
test('all connection controls remain in workflow',()=>{
 for(const phrase of ["usbColumn.append(usbIndicator,$('connect'))","radioColumn.append(radioIndicator,$('simulate'))",'readRow.append(simulatorRead)',"secondaryRow.append($('radio-settings-open'),$('disconnect'))",'connectionActions.after(usbDiagnosticsPanel)'])assert.ok(source.includes(phrase),phrase);
});