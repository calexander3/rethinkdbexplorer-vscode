import * as vscode from "vscode";
import * as path from "path";
import { RethinkConnectionBuilder } from "../rethinkConnectionBuilder";
import { RConnectionOptions } from "rethinkdb-ts";
export class ConnectionTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  private _connectionInfo: RConnectionOptions[] | undefined | null;

  constructor(private _context: vscode.ExtensionContext, private _rethinkConnectionBuilder: RethinkConnectionBuilder) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  reloadConnections(): void {
    this._connectionInfo = null;
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (element) {
      return [];
    }
    if (!this._connectionInfo) {
      this._connectionInfo = this._rethinkConnectionBuilder.GetConnectionSettings();
    }
    let selectedConnection = this._rethinkConnectionBuilder.SelectedConnection;
    return this._connectionInfo.map(c => {
      let connectionName = `${c.host}:${c.port}`;
      return new Server(connectionName, c.nickname, selectedConnection === connectionName, this._context);
    });
  }
}

export class Server extends vscode.TreeItem {
  constructor(
    private _name: string,
    private _nickname: string,
    private _connected: boolean,
    private _context: vscode.ExtensionContext
  ) {
    super(_name, vscode.TreeItemCollapsibleState.None);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return this._connected ? `${this._nickname ? `${this._nickname} - ` : ""}Connected` : this._nickname;
  }

  iconPath = {
    light: this._context.asAbsolutePath(path.join("media", "light", "server.svg")),
    dark: this._context.asAbsolutePath(path.join("media", "dark", "server.svg"))
  };

  contextValue = "server";
}
