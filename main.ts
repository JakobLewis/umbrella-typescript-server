import fs from 'fs';
import { execSync } from "child_process";
import readline from 'readline';
import { CleanServer, endpoint, http } from './server';

const Server = new CleanServer([{
    'url': '/loadables',
    'method': 'GET',
    'handler': function(request: http.IncomingMessage, response: http.ServerResponse) {
        response.writeHead(200);
        response.end(JSON.stringify(loadables, undefined, 2));
    },
    'hits': 0
},{
    'url': '/endpoints',
    'method': 'GET',
    'handler': function(request: http.IncomingMessage, response: http.ServerResponse) {
        response.writeHead(200);
        response.end(JSON.stringify(Server.endpoints, undefined, 2));
    },
    'hits': 0
}]);

const loadables: {[file_path: string]: {
    endpoints: Array<endpoint>;
    namespace: string;
}} = {};

console.log('Starting server on port 8080');
Server.start(8080);

function custom_log(msg: string): void {
    readline.clearLine(process.stdout, 0);
    console.log(msg);
    readline.moveCursor(process.stdout, 0, -1);
}

if (Object.keys(loadables).length==0) console.log('[WARNING] No loadables have been defined :(');

{
    let on_source_change = (filepath: string)=>{
        console.log(`[INFO] Changes detected to file '${filepath}'`)
        let _dirpath = filepath.split('/'); _dirpath.pop(); let dirpath = _dirpath.join('/');
        let _js_file = filepath.split('.'); _js_file.pop(); let js_file = _js_file.join('.')+'.js';

        custom_log(`   Compiling '${dirpath}'`);
        try { execSync(`cd ${dirpath} && tsc`); }
        catch (error) { custom_log(`    [Warning] Error when compiling '${dirpath}' to JS\n`); }
       
        custom_log('   Clearing endpoints...            ');
        if (loadables[filepath].endpoints.length != 0) loadables[filepath].endpoints.forEach(ep=>{
            if (Server.remove_endpoint('/'+loadables[filepath].namespace+'/'+ep.url, ep.method)) custom_log(`     => ${ep.method+' @ /'+loadables[filepath].namespace+'/'+ep.url}`);
            else custom_log(`[ERROR] Failed to remove endpoint ${ep.method+' @ /'+loadables[filepath].namespace+'/'+ep.url}\n`);
        });

        custom_log(`   Importing '${js_file}'`);
        delete require.cache[require.resolve(js_file)];
        loadables[filepath].endpoints = require(js_file);

        custom_log('   Adding endpoints...');
        loadables[filepath].endpoints.forEach(ep=>{
            if (!ep.url || !ep.method || !ep.handler) {
                custom_log('[ERROR] Malformed endpoint import\n');
                return;
            }
            if (Server.add_endpoint('/'+loadables[filepath].namespace+'/'+ep.url, ep.method, ep.handler)) custom_log(`     => ${ep.method+' @ /'+loadables[filepath].namespace+'/'+ep.url}`);
            else custom_log(`[ERROR] Failed to add endpoint ${ep.method+' @ /'+loadables[filepath].namespace+'/'+ep.url}\n`);
        });
        custom_log(`    Finished pushing changes from '${filepath}'\n`);
    };

    Object.keys(loadables).forEach((path)=>{
        fs.watchFile(path, ()=>{on_source_change(path)});
        on_source_change(path);
    });
}

