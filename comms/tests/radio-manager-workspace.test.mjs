import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSPACES,validWorkspace,workspaceFromHash} from '../workspace.js';
test('Radio Manager replaces two separate navigation entries',()=>{
 const radios=WORKSPACES.filter(item=>item.id==='radios');
 assert.equal(radios.length,1);
 assert.equal(radios[0].title,'Radio Manager');
 assert.equal(WORKSPACES.some(item=>item.id==='channels'),false);
});
test('old Channel Editor links open Radio Manager',()=>{
 assert.equal(validWorkspace('channels'),'radios');
 assert.equal(workspaceFromHash('#channels'),'radios');
 assert.equal(workspaceFromHash('#/channels'),'radios');
 assert.equal(workspaceFromHash('#radios'),'radios');
 assert.equal(validWorkspace('settings'),'settings');
});
