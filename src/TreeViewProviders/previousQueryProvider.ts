import * as vscode from "vscode";
import { HistoryRecorder, HistoryItem } from "../historyRecorder";
export class PreviousQueryProvider
  implements vscode.TreeDataProvider<vscode.TreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    vscode.TreeItem | undefined
  > = new vscode.EventEmitter<vscode.TreeItem | undefined>();
  readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined> = this
    ._onDidChangeTreeData.event;

  constructor(private _historyRecorder: HistoryRecorder) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
    let history = this._historyRecorder.LoadHistory();
    if (!element) {
      return Promise.resolve(
        history.map((h, i) => {
          let historyItem = history[history.length - 1 - i];
          let dateExecuted = new Date(historyItem.dateExecuted);
          return new PreviousQueryHeader(
            `${dateExecuted.toLocaleDateString()} ${dateExecuted
              .toLocaleTimeString()
              .replace(" ", "")} - ${historyItem.query.replace(
              /(\r\n|\n|\r)/gm,
              ""
            )}`,
            historyItem
          );
        })
      );
    } else if (element instanceof PreviousQueryHeader) {
      return Promise.resolve(
        element.historyItem.query
          .split(/(\r\n|\n|\r)/gm)
          .filter(queryLine => !!queryLine.trim())
          .map(queryLine => new PreviousQuery(queryLine))
      );
    } else {
      return Promise.resolve([]);
    }
  }
}

export class PreviousQueryHeader extends vscode.TreeItem {
  constructor(private _name: string, private _historyItem: HistoryItem) {
    super(_name, vscode.TreeItemCollapsibleState.Collapsed);
  }

  get historyItem(): HistoryItem {
    return this._historyItem;
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return `Count: ${this._historyItem.rowCount || 0}`;
  }

  contextValue = "previousQueryHeader";
}

export class PreviousQuery extends vscode.TreeItem {
  constructor(private _name: string) {
    super(_name, vscode.TreeItemCollapsibleState.None);
  }

  get tooltip(): string {
    return this._name;
  }

  get description(): string {
    return "";
  }

  contextValue = "previousQuery";
}
