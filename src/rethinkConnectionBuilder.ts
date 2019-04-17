import * as vscode from "vscode";
import { r, Connection, RConnectionOptions } from "rethinkdb-ts";

export class RethinkConnectionBuilder {
  constructor(private _context: vscode.ExtensionContext) {}
  private _selectedConnection: string | undefined;
  get SelectedConnection(): string {
    if (!this._selectedConnection) {
      this._selectedConnection = this._context.workspaceState.get("rethinkdbExplorer.selectedConnection", undefined);
    }
    if (!this._selectedConnection) {
      let firstConnection = this.GetConnectionSettings()[0];
      this._selectedConnection = `${firstConnection.host}:${firstConnection.port}`;
    }
    return this._selectedConnection;
  }
  set SelectedConnection(connection: string) {
    this._selectedConnection = connection;
    this._context.workspaceState.update("rethinkdbExplorer.selectedConnection", connection);
  }

  GetConnectionSettings(): RConnectionOptions[] {
    let config = vscode.workspace.getConfiguration();
    let host: string = config.get("rethinkdbExplorer.host", "localhost");
    let port: number = config.get("rethinkdbExplorer.port", 28015);
    let database: string | undefined = config.get("rethinkdbExplorer.database");
    let tls: boolean = config.get("rethinkdbExplorer.tls", false);
    let username: string | undefined = config.get("rethinkdbExplorer.username");
    let password: string | undefined = config.get("rethinkdbExplorer.password");
    let connectionNickname: string | undefined = config.get("rethinkdbExplorer.connectionNickname");
    let supplementalConnections = config.get("rethinkdbExplorer.supplementalConnections", []);
    return [
      {
        host,
        port,
        db: !!database ? database : undefined,
        tls,
        user: !!username ? username : undefined,
        password: !!password ? password : undefined,
        nickname: !!connectionNickname ? connectionNickname : undefined
      },
      ...supplementalConnections.map(s => {
        return {
          host: s["rethinkdbExplorer.host"] || "localhost",
          port: s["rethinkdbExplorer.port"] || 28015,
          db: !!s["rethinkdbExplorer.database"] ? s["rethinkdbExplorer.database"] : undefined,
          tls: s["rethinkdbExplorer.tls"] || false,
          user: !!s["rethinkdbExplorer.username"] ? s["rethinkdbExplorer.username"] : undefined,
          password: !!s["rethinkdbExplorer.password"] ? s["rethinkdbExplorer.password"] : undefined,
          nickname: !!s["rethinkdbExplorer.connectionNickname"] ? s["rethinkdbExplorer.connectionNickname"] : undefined
        };
      })
    ];
  }

  Connect(): Promise<Connection> {
    let filteredConnections = this.GetConnectionSettings().filter(
      c => this.SelectedConnection === `${c.host}:${c.port}`
    );
    if (!filteredConnections.length) {
      this.SelectedConnection = "";
      filteredConnections = this.GetConnectionSettings().filter(c => this.SelectedConnection === `${c.host}:${c.port}`);
    }
    if (!filteredConnections.length) {
      throw new Error(`Connection ${this.SelectedConnection} could not be found`);
    }
    return r.connect(filteredConnections[0]);
  }
}
