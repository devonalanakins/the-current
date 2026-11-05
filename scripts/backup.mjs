// SPDX-License-Identifier: AGPL-3.0-only
import { DatabaseSync } from 'node:sqlite';
import { existsSync, chmodSync, realpathSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
const [source,destination]=process.argv.slice(2);
if(!source||!destination||existsSync(destination))throw new Error('Usage: npm run backup -- SOURCE.sqlite NEW_DESTINATION.sqlite (never overwrites)');
if(realpathSync(source)===resolve(destination)||!existsSync(dirname(resolve(destination))))throw new Error('Use an existing private backup directory and a new file.');
const db=new DatabaseSync(source);db.prepare('VACUUM INTO ?').run(resolve(destination));db.close();chmodSync(destination,0o600);
const restored=new DatabaseSync(destination,{readOnly:true});const integrity=restored.prepare('PRAGMA integrity_check').get();const foreign=restored.prepare('PRAGMA foreign_key_check').all();restored.close();
if(Object.values(integrity)[0]!=='ok'||foreign.length)throw new Error('Backup integrity check failed. Do not restore it.');
console.log('Consistent SQLite snapshot created and integrity checked. Treat this file as a secret; it contains credential hashes and private content.');
