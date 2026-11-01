import {registerHooks} from 'node:module';
import {existsSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
registerHooks({resolve(specifier,context,next){
 if(specifier==='cloudflare:workers')return {url:'data:text/javascript,export const env = globalThis.__BOOKLY_TEST_ENV;',shortCircuit:true};
 if(specifier.startsWith('@/'))specifier=pathToFileURL(root+specifier.slice(2)).href;
 if((specifier.startsWith('.')||specifier.startsWith('file:'))&&!/\.[a-z]+$/.test(specifier)){const u=new URL(specifier,context.parentURL);if(existsSync(fileURLToPath(u)+'.ts'))return next(u.href+'.ts',context)}
 return next(specifier,context);
}});
