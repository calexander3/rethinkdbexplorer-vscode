"use strict";

import * as vscode from "vscode";
import { RethinkRunner } from "./rethinkRunner";
import { ResultViewer } from "./resultViewer";
import {
  PreviousQueryProvider,
  PreviousQueryHeader,
  PreviousQuery
} from "./previousQueryProvider";
import { HistoryRecorder } from "./historyRecorder";

let executeQueryStatusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let executeQueryButtonText: string = `$(play) Execute Query`;
let running: boolean;
let runner = new RethinkRunner();
let resultsViewer = new ResultViewer();

export function activate(context: vscode.ExtensionContext) {
  let historyRecorder = new HistoryRecorder(context.globalStoragePath);
  let previousQueryProvider = new PreviousQueryProvider(historyRecorder);
  outputChannel = vscode.window.createOutputChannel("RethinkDB Explorer");
  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.runQuery", () => {
      if (!running) {
        if (vscode.window.activeTextEditor) {
          let currentTextEditor = vscode.window.activeTextEditor;
          let query = currentTextEditor.document.getText(
            !currentTextEditor.selection.isEmpty
              ? currentTextEditor.selection
              : undefined
          );
          running = true;
          executeQueryStatusBarItem.text = `$(flame) Executing...`;
          runner.executeQuery(query).then(results => {
            try {
              if (results instanceof Error) {
                displayError(results);
              } else {
                outputChannel.appendLine(query);
                outputChannel.appendLine(JSON.stringify(results, null, 4));
                outputChannel.show(true);
                let dateExecuted = new Date();
                historyRecorder.SaveHistory({
                  query,
                  dateExecuted,
                  dataReturned: results,
                  rowCount: Array.isArray(results) ? results.length : undefined
                });
                resultsViewer.RenderResults(
                  currentTextEditor.document.fileName,
                  results,
                  dateExecuted
                );
                previousQueryProvider.refresh();
              }
            } catch (e) {
              displayError(e);
            } finally {
              executeQueryStatusBarItem.text = executeQueryButtonText;
              running = false;
            }
          });
        }
      }
    })
  );

  executeQueryStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  executeQueryStatusBarItem.command = "rethinkdbExplorer.runQuery";
  executeQueryStatusBarItem.text = executeQueryButtonText;
  if (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document.languageId === "rethinkdb"
  ) {
    executeQueryStatusBarItem.show();
  }
  context.subscriptions.push(executeQueryStatusBarItem);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rethinkdbExplorer.restoreHistoryItem",
      (item: PreviousQueryHeader) => {
        outputChannel.appendLine(item.historyItem.query);
        outputChannel.appendLine(
          JSON.stringify(item.historyItem.dataReturned, null, 4)
        );
        outputChannel.show(true);
        vscode.workspace
          .openTextDocument({
            language: "rethinkdb",
            content: item.historyItem.query
          })
          .then(document => {
            vscode.window
              .showTextDocument(document, vscode.ViewColumn.One)
              .then(editor => {
                resultsViewer.RenderResults(
                  editor.document.fileName,
                  item.historyItem.dataReturned,
                  new Date(item.historyItem.dateExecuted)
                );
              });
          });
      }
    )
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => {
      if (e && e.document.languageId === "rethinkdb") {
        executeQueryStatusBarItem.show();
      } else {
        executeQueryStatusBarItem.hide();
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(e => {
      if (e && e.languageId === "rethinkdb") {
        executeQueryStatusBarItem.show();
      } else if (!e || e.languageId !== "Log") {
        executeQueryStatusBarItem.hide();
      }
    })
  );

  vscode.window.registerTreeDataProvider(
    "rethinkdbexplorerhistory",
    previousQueryProvider
  );
}

function displayError(error: Error) {
  if (outputChannel && error) {
    outputChannel.appendLine(error.message);
    if (error.stack) {
      outputChannel.appendLine(error.stack);
    }
    outputChannel.show(true);
  }
}

export function deactivate() {
  executeQueryStatusBarItem.hide();
}
