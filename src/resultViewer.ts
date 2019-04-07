"use strict";

import * as vscode from "vscode";

export class ResultViewer {
  panels: { [id: string]: vscode.WebviewPanel } = {};

  RenderResults(
    docName: string,
    results: any[],
    resultDate: Date
  ): vscode.WebviewPanel {
    if (!this.panels[docName]) {
      this.panels[docName] = vscode.window.createWebviewPanel(
        "results",
        `${docName} Results`,
        vscode.ViewColumn.Active,
        {
          enableFindWidget: true,
          retainContextWhenHidden: true,
          localResourceRoots: []
        }
      );
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

    this.panels[docName].webview.html = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cat Coding</title>
        <style>
        th {
            text-align: left;
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
    this.panels[docName].reveal();
    return this.panels[docName];
  }
}
