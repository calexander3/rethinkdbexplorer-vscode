import * as vscode from "vscode";

export class TableResultViewer {
  private _panels: { [id: string]: vscode.WebviewPanel } = {};

  RenderResults(
    docName: string,
    results: any[],
    resultDate: Date,
    viewColumn: vscode.ViewColumn
  ): vscode.WebviewPanel {
    if (!this._panels[docName]) {
      let webView = vscode.window.createWebviewPanel(
        "results",
        `${docName} Table`,
        { viewColumn: viewColumn, preserveFocus: true },
        {
          enableFindWidget: true,
          retainContextWhenHidden: true,
          localResourceRoots: []
        }
      );
      let internalDocName = docName;
      webView.onDidDispose(() => {
        delete this._panels[internalDocName];
      });
      this._panels[docName] = webView;
    }

    let resultsTable: string[] = ["<tr>"];
    if (results && Array.isArray(results) && results.length) {
      for (let prop in results[0]) {
        resultsTable.push(`<th>${prop}</th>`);
      }
      resultsTable.push("</tr>");
      for (let result of results) {
        resultsTable.push("<tr>");
        for (let value of Object.values(result)) {
          if (typeof value === "object") {
            value = JSON.stringify(value);
          }
          resultsTable.push(`<td>${value}</td>`);
        }
        resultsTable.push("</tr>");
      }
    } else {
      resultsTable = ["<tr><th>No Results</th></tr>"];
    }

    this._panels[docName].webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Table</title>
        <style>
        th {
            text-align: left;
            border: 1px solid #adadad;
            padding: 10px 15px;
        }
        table {
            border-collapse: collapse;
        }
        td {
            border: 1px solid #adadad;
            padding: 10px 15px;
        }
        </style>
    </head>
    <body>
        <div>
        Results from ${resultDate.toLocaleDateString()} ${resultDate.toLocaleTimeString()}
        </div>
        <table>
        ${resultsTable.join("")}
        </table>
    </body>
    </html>`;
    return this._panels[docName];
  }
}
