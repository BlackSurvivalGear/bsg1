import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('working connection controls stay in original action container',()=>{
 assert.ok(!source.includes('connectionActions.replaceChildren('));
 assert.ok(!source.includes('usbColumn.append('));
 assert.ok(!source.includes('radioColumn.append('));
});
test('radio selector and connection buttons remain in original markup',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 for(const id of ['radio-model','connect','simulate','disconnect','radio-settings-open'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(source.includes('selectionRow.append('));
 assert.ok(source.includes('selectionRow.after(indicatorRow)'));
});