import * as vscode from "vscode";
import * as r from "rethinkdb";

export class RethinkCompletionProvider
  implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    try {
      let line = document.lineAt(position).text.substr(0, position.character);
      line = line.substr(0, line.lastIndexOf("."));
      let parsedQuery = new Function("r", `return ${line}`).call(this, r);
      let completionItems: vscode.CompletionItem[] = [];
      completionItems = this.getAllFunctions(parsedQuery, completionItems);
      return new vscode.CompletionList(this.unique(completionItems));
    } catch {
      return new vscode.CompletionList();
    }
  }

  private getAllFunctions(
    obj: any,
    items: vscode.CompletionItem[]
  ): vscode.CompletionItem[] {
    for (var property in obj) {
      items.push(new vscode.CompletionItem(property));
    }
    if (obj.__proto__) {
      items = this.getAllFunctions(obj.__proto__, items);
    }
    return items;
  }

  private unique(a: Array<vscode.CompletionItem>) {
    var seen: { [id: string]: boolean } = {};
    return a.filter(item => {
      return item.label.startsWith("_") || seen.hasOwnProperty(item.label)
        ? false
        : (seen[item.label] = true);
    });
  }
}
