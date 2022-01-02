import http from 'http';

export {http};

export type endpoint = {
    method: string;
    url: string;
    handler: http.RequestListener;
    hits: number;
};

export class CleanServer {

    server: http.Server;
    endpoints: Array<endpoint>;
    endpoint_array_length: number;

    constructor(endpoints: Array<endpoint> | void) {
        if (endpoints) this.endpoints = endpoints;
        else this.endpoints = [];
        this.endpoint_array_length = this.endpoints.length;

        let self = this;
        setInterval(self.order_endpoints_by_hits, 600000);
        this.server = http.createServer(function(request: http.IncomingMessage, response: http.ServerResponse) {
            let url = request.url?.split(/\?|#/)[0];
            let method = request.method; 
            for (let i = 0; i < self.endpoint_array_length; i++) {
                let _endpoint = self.endpoints[i];
                if (method===_endpoint.method && url===_endpoint.url) {
                    _endpoint.handler(request, response);
                    _endpoint.hits+=1;
                    return;
                }
            }
            response.writeHead(404, 'NOT FOUND');
            response.end('404 Page not found :(');
        });
    }

    start(port: number) { this.server.listen(port); }
    stop() { this.server.close(); }

    add_endpoint(url: string, method: string, handler: http.RequestListener): boolean {
        for (let i = 0; i < this.endpoint_array_length; i++) {
            let _endpoint = this.endpoints[i];
            if (_endpoint.url===url && _endpoint.method===method) return false;
        }
        let new_endpoint = {
            'method': method,
            'url': url,
            'handler': handler,
            'hits': 0,
        };
        this.endpoints.push(new_endpoint);
        this.endpoint_array_length+=1;
        return true;
    }

    remove_endpoint(url: string, method: string): boolean {
        for (let i = 0; i < this.endpoint_array_length; i++) {
            let _endpoint = this.endpoints[i];
            if (_endpoint.url===url && _endpoint.method===method) {
                this.endpoints.splice(i, 1);
                this.endpoint_array_length-=1;
                return true;
            }
        }
        return false;
    }

    static resolve_body(request: http.IncomingMessage, response: http.ServerResponse, callback: (body: string)=>any) {
        let body = ''; request.on('data', function (data) { body += data;});
        request.on('end', ()=>{callback(body)});
    }

    order_endpoints_by_hits() {
        this.endpoints.sort((a,b)=>b.hits-a.hits);
    }

    get endpoints_by_hits(): Array<endpoint> {
        return [...this.endpoints].sort((a,b)=>b.hits-a.hits);
    }
}