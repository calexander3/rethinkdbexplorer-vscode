import * as vscode from "vscode";
import * as path from "path";
import { RethinkConnectionBuilder } from "../rethinkConnectionBuilder";
import { r, Connection } from "rethinkdb-ts";

export class TableIndexTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined> = new vscode.EventEmitter<
    vscode.TreeItem | undefined
  >();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this._onDidChangeTreeData.event;

  private _dbInfo: DbInfo[] | undefined | null;
  private _tableInfo: { [id: string]: TableInfo | null } = {};

  constructor(private _context: vscode.ExtensionContext, private _rethinkConnectionBuilder: RethinkConnectionBuilder) {}

  private async loadDbInfo(): Promise<DbInfo[]> {
    let connection: Connection | undefined;
    let dbInfo = [];
    try {
      connection = await this._rethinkConnectionBuilder.Connect();
      let databases: string[] = await r.dbList().run(connection);
      for (let i = 0; i < databases.length; i++) {
        let tableList: string[] = await r
          .db(databases[i])
          .tableList()
          .run(connection);
        dbInfo.push({ name: databases[i], tables: tableList });
      }
    } catch {
      return [];
    } finally {
      if (connection) {
        await connection.close();
      }
    }
    return dbInfo;
  }

  private async loadTableInfo(tableName: string, dbName: string): Promise<TableInfo> {
    let connection: Connection | undefined;
    try {
      connection = await this._rethinkConnectionBuilder.Connect();
      return await r
        .db(dbName)
        .table(tableName)
        .info()
        .run(connection);
    } catch {
      return { name: tableName, db: { name: dbName }, indexes: [] };
    } finally {
      if (connection) {
        await connection.close();
      }
    }
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  reloadSchema(): void {
    this._dbInfo = null;
    this._tableInfo = {};
    this.refresh();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!this._dbInfo) {
      this._dbInfo = await this.loadDbInfo();
    }
    if (!element) {
      return this._dbInfo.map(db => new Database(this._context, db.name));
    }
    if (element && element instanceof Database) {
      let dbInfo = this._dbInfo.filter(db => db.name === element.label)[0];
      return dbInfo.tables.map(t => new Table(this._context, t, dbInfo.name));
    }
    if (element && element instanceof Table) {
      if (!this._tableInfo[`${element.dbName}.${element.label}`]) {
        this._tableInfo[`${element.dbName}.${element.label}`] = await this.loadTableInfo(
          element.label || "",
          element.dbName
        );
      }
      let tableInfo = this._tableInfo[`${element.dbName}.${element.label}`] || {};
      return [
        new Index(this._context, tableInfo.primary_key || "id", true),
        ...(tableInfo.indexes || []).map(index => new Index(this._context, index, false))
      ];
    }
    return [];
  }
}

class Database extends vscode.TreeItem {
  constructor(private _context: vscode.ExtensionContext, private _name: string) {
    super(_name, vscode.TreeItemCollapsibleState.Expanded);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return "Database";
  }

  iconPath = {
    light: this._context.asAbsolutePath(path.join("media", "light", "database.svg")),
    dark: this._context.asAbsolutePath(path.join("media", "dark", "database.svg"))
  };

  contextValue = "database";
}

export class Table extends vscode.TreeItem {
  constructor(private _context: vscode.ExtensionContext, private _name: string, private _dbName: string) {
    super(_name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return "Table";
  }

  get dbName(): string {
    return this._dbName;
  }

  iconPath = {
    light: this._context.asAbsolutePath(path.join("media", "light", "table.svg")),
    dark: this._context.asAbsolutePath(path.join("media", "dark", "table.svg"))
  };

  contextValue = "table";
}

class Index extends vscode.TreeItem {
  constructor(private _context: vscode.ExtensionContext, private _name: string, private _primaryKey: boolean) {
    super(_name, vscode.TreeItemCollapsibleState.None);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return this._primaryKey ? "Primary Key" : "Index";
  }

  iconPath = {
    light: this._context.asAbsolutePath(path.join("media", "light", this._primaryKey ? "key.svg" : "string.svg")),
    dark: this._context.asAbsolutePath(path.join("media", "dark", this._primaryKey ? "key.svg" : "string.svg"))
  };

  contextValue = "index";
}

interface DbInfo {
  tables: string[];
  name: string;
}

interface TableInfo {
  name?: string;
  db?: {
    id?: string;
    name?: string;
    type?: string;
  };
  id?: string;
  indexes?: string[];
  primary_key?: string;
  type?: string;
  doc_count_estimates?: number[];
}
