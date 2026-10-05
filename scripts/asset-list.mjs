import { readdir, writeFile, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const root='dist';
async function walk(dir){const result=[];for(const item of await readdir(dir,{withFileTypes:true})){const path=join(dir,item.name);if(item.isDirectory())result.push(...await walk(path));else if(item.name!=='asset-list.json')result.push('./'+relative(root,path).replaceAll('\\','/'));}return result;}
const files=await walk(root);
const hash=createHash('sha256');
for(const file of files)hash.update(await readFile(join(root,file.slice(2))));
const version='ruins-arcade-'+hash.digest('hex').slice(0,12);
await writeFile(join(root,'asset-list.json'),JSON.stringify(['./',...files]));
const swPath=join(root,'sw.js');
await writeFile(swPath,(await readFile(swPath,'utf8')).replace('__CACHE__',version));
