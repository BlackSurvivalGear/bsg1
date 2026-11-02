import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../app.js',import.meta.url),'utf8');
test('radio selector populates options and handles model changes',()=>{assert.match(source,/selector\.append\(option\)/);assert.match(source,/selector\.addEventListener\('change'/);assert.match(source,/key=channelKey\(model\)/);assert.match(source,/channels=readChannels\(\)/);});
test('profile actions remain connected',()=>{for(const id of ['save-profile','load-profile','delete-profile'])assert.ok(source.includes("$('"+id+"').onclick"));assert.match(source,/function refreshProfiles\(/);});

test('dashboard uses preparedness messaging and retains its statistics',()=>{const shell=readFileSync(new URL('../shell.js',import.meta.url),'utf8');assert.match(shell,/BSG COMMS · COMMUNICATIONS READINESS/);assert.match(shell,/WHEN NETWORKS FAIL/);assert.match(shell,/STAY INFORMED\. STAY CONNECTED\./);assert.match(shell,/KNOW YOUR EQUIPMENT/);assert.doesNotMatch(shell,/Your radio command centre/);assert.match(shell,/dashboard-stats/);assert.match(shell,/dashboard-shortcuts/);});
