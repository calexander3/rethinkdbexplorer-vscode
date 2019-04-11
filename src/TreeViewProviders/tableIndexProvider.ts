import * as vscode from "vscode";
import * as path from "path";
import { RethinkConnectionBuilder } from "../rethinkConnectionBuilder";
import { r, Connection } from "rethinkdb-ts";
export class TableIndexProvider
  implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this
    ._onDidChangeTreeData.event;

  private _dbInfo: DbTableInfo[] | undefined;

  constructor(
    private _context: vscode.ExtensionContext,
    private _rethinkConnectionBuilder: RethinkConnectionBuilder
  ) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: vscode.TreeItem): Promise<vscode.TreeItem[]> {
    if (!this._dbInfo) {
      let connection: Connection | undefined;
      try {
        connection = await this._rethinkConnectionBuilder.Connect();
        this._dbInfo = await r
          .db("rethinkdb")
          .table("table_config")
          .run(connection);
      } catch {
        this._dbInfo = [];
      } finally {
        if (connection) {
          await connection.close();
        }
      }
    }

    if (element) {
      if (element instanceof Database && element.label) {
        return this._dbInfo
          .filter(dbtableInfo => dbtableInfo.db === element.label)
          .sort((a, b) => {
            if (a.name < b.name) {
              return -1;
            }
            if (a.name > b.name) {
              return 1;
            }
            return 0;
          })
          .map(
            dbTableInfo =>
              new Table(this._context, dbTableInfo.name, dbTableInfo.db, [
                new Index(this._context, dbTableInfo.primary_key, true),
                ...dbTableInfo.indexes
                  .sort()
                  .map(index => new Index(this._context, index, false))
              ])
          );
      } else if (element instanceof Table && element.label) {
        return element.indexes;
      }
    } else {
      return this.unique(this._dbInfo.map(dbtableInfo => dbtableInfo.db)).map(
        db => new Database(this._context, db)
      );
    }
    return [];
  }

  private unique(a: Array<string>) {
    var seen: { [id: string]: boolean } = {};
    return a.filter(item => {
      return seen.hasOwnProperty(item) ? false : (seen[item] = true);
    });
  }
}

class Database extends vscode.TreeItem {
  constructor(
    private _context: vscode.ExtensionContext,
    private _name: string
  ) {
    super(_name, vscode.TreeItemCollapsibleState.Expanded);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return "Database";
  }

  iconPath = {
    light: this._context.asAbsolutePath(
      path.join("media", "light", "database.svg")
    ),
    dark: this._context.asAbsolutePath(
      path.join("media", "dark", "database.svg")
    )
  };

  contextValue = "database";
}

export class Table extends vscode.TreeItem {
  constructor(
    private _context: vscode.ExtensionContext,
    private _name: string,
    private _dbName: string,
    private _indexes: Index[]
  ) {
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

  get indexes(): Index[] {
    return this._indexes;
  }

  iconPath = {
    light: this._context.asAbsolutePath(
      path.join("media", "light", "table.svg")
    ),
    dark: this._context.asAbsolutePath(path.join("media", "dark", "table.svg"))
  };

  contextValue = "table";
}

class Index extends vscode.TreeItem {
  constructor(
    private _context: vscode.ExtensionContext,
    private _name: string,
    private _primaryKey: boolean
  ) {
    super(_name, vscode.TreeItemCollapsibleState.None);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return this._primaryKey ? "Primary Key" : "Index";
  }

  iconPath = {
    light: this._context.asAbsolutePath(
      path.join("media", "light", this._primaryKey ? "key.svg" : "string.svg")
    ),
    dark: this._context.asAbsolutePath(
      path.join("media", "dark", this._primaryKey ? "key.svg" : "string.svg")
    )
  };

  contextValue = "index";
}

interface DbTableInfo {
  db: string;
  durability: string;
  id: string;
  indexes: string[];
  name: string;
  primary_key: string;
  write_acks: string;
}
