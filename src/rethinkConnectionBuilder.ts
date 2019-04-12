import * as vscode from "vscode";
import { r, Connection } from "rethinkdb-ts";

export class RethinkConnectionBuilder {
  Connect(): Promise<Connection> {
    let config = vscode.workspace.getConfiguration();
    let host: string | undefined = config.get("rethinkdbExplorer.host");
    let portNumber: number | undefined = config.get("rethinkdbExplorer.port");
    let database: string | undefined = config.get("rethinkdbExplorer.database");
    let tlsConnection: boolean | undefined = config.get("rethinkdbExplorer.tls");
    let username: string | undefined = config.get("rethinkdbExplorer.username");
    let password: string | undefined = config.get("rethinkdbExplorer.password");
    return r.connect({
      host: host || "localhost",
      port: portNumber || 28015,
      db: !!database ? database : undefined,
      tls: tlsConnection || false,
      user: !!username ? username : undefined,
      password: !!password ? password : undefined
    });
  }
}
