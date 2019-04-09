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
      let linesWeCareAbout = [];
      for (let i = 0; i <= position.line; i++) {
        let line = document.lineAt(i).text;
        if (line.includes(";")) {
          line = line.substr(line.lastIndexOf(";") + 1);
          linesWeCareAbout = [];
        }
        if (i === position.line) {
          line = line
            .substr(0, position.character)
            .substr(0, line.lastIndexOf("."));
        }
        if (line) {
          linesWeCareAbout.push(line);
        }
      }
      if (linesWeCareAbout.length) {
        let parsedQuery = new Function(
          "r",
          `return ${linesWeCareAbout.join("")}`
        ).call(this, r);
        let completionItems: vscode.CompletionItem[] = [];
        completionItems = this.getAllFunctions(parsedQuery, completionItems);
        return new vscode.CompletionList(this.unique(completionItems));
      }
      return new vscode.CompletionList();
    } catch {
      return new vscode.CompletionList();
    }
  }

  private getAllFunctions(
    obj: any,
    items: vscode.CompletionItem[]
  ): vscode.CompletionItem[] {
    for (var property in obj) {
      let newCompletionItem = new vscode.CompletionItem(property);
      if (typeof obj[property] === "function") {
        newCompletionItem.kind = vscode.CompletionItemKind.Method;
      } else {
        newCompletionItem.kind = vscode.CompletionItemKind.Property;
      }
      items.push(newCompletionItem);
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
