import test from 'node:test';
import assert from 'node:assert/strict';
import {WORKSPACES,DEFAULT_WORKSPACE,validWorkspace,workspaceFromHash} from '../workspace.js';
test('workspace IDs are unique and dashboard is default',()=>{assert.equal(DEFAULT_WORKSPACE,'dashboard');assert.equal(new Set(WORKSPACES.map(item=>item.id)).size,WORKSPACES.length);assert.equal(WORKSPACES.length,11);});
test('existing SQUAWK features have active workspaces',()=>{for(const id of ['radios','repeaters','sdr','settings','operations','tools','frequencies','academy'])assert.equal(WORKSPACES.find(item=>item.id===id)?.ready,true);});
test('academy workspace is now available',()=>{assert.equal(WORKSPACES.find(item=>item.id==='academy')?.ready,true);});
test('hash navigation accepts known routes and safely falls back',()=>{assert.equal(workspaceFromHash('#channels'),'radios');assert.equal(workspaceFromHash('#/repeaters'),'repeaters');assert.equal(workspaceFromHash('#sdr/anything'),'sdr');assert.equal(workspaceFromHash('#unknown'),'dashboard');assert.equal(validWorkspace('settings'),'settings');assert.equal(validWorkspace('invalid'),'dashboard');});
test('AfricanDXNet and RSN follow Frequencies in Discover',()=>{const discover=WORKSPACES.filter(item=>item.group==='Discover').map(item=>item.id);assert.deepEqual(discover,['repeaters','sdr','frequencies','africandxnet','rsn']);for(const id of ['africandxnet','rsn']){assert.equal(WORKSPACES.find(item=>item.id===id)?.ready,true);assert.equal(workspaceFromHash('#'+id),id);}});
