import * as http from "http";

export function hoge(str: string): number {
  return str.length;
}

type ReqRes = {
  readonly req: http.IncomingMessage,
  readonly res: http.ServerResponse
};

class Server {
  private pathToConnection: {[path: string]: {peer1: ReqRes, peer2?: ReqRes}} = {};

  handler = (req: http.IncomingMessage, res: http.ServerResponse) => {
    // Get path
    const path = req.url === undefined ? "/" : req.url;
    console.log("path: ", path);
    switch (req.method) {
      case "POST":
      case "PUT":
        if (path in this.pathToConnection) {
          const conn = this.pathToConnection[path];
          if (conn.peer2 === undefined) {
            // Add peer2
            conn.peer2 = {req: req, res: res};

            // Start transfer
            console.log(`start transfer on ${path}`);
            conn.peer1.req.pipe(conn.peer2.res);
            conn.peer2.req.pipe(conn.peer1.res);
            // TODO: should add end/close/error

            // TODO: should delete this.pathToConnection[path] in proper timing after transfer
            let unpiped: boolean = false;
            const unpipeHandler = () => {
              console.log(`on unpipe on ${path}`);
              if(unpiped) {
                delete this.pathToConnection[path];
                console.log(`deleted on ${path}`);
              }
              unpiped = true;
            };
            conn.peer1.res.on("unpipe", unpipeHandler);
            conn.peer2.res.on("unpipe", unpipeHandler);
          } else {
            // Reject
            res.writeHead(400);
            res.end(`Error: ${path} is already established.`);
          }
        } else {
          // Add peer1
          this.pathToConnection[path] = {peer1: {req: req, res: res}};
        }
        break;
      default:
        // Reject
        res.writeHead(400);
        res.end(`Error: Unexpected method: ${req.method}`);
    }
  };
}


const webidir = new Server();
const server = http.createServer(webidir.handler);

// TODO: Hard code
server.listen(3000);
