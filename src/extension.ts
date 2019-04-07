"use strict";

import * as vscode from "vscode";
import { RethinkRunner } from "./rethinkRunner";
import { ResultViewer } from "./resultViewer";
import { PreviousQueryProvider } from "./previousQueryProvider";
import { HistoryRecorder } from "./historyRecorder";

let myStatusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let menuButtonText: string = `$(play) Execute Query`;
let running: boolean;
let runner = new RethinkRunner();
let resultsViewer = new ResultViewer();

export function activate(context: vscode.ExtensionContext) {
  let historyRecorder = new HistoryRecorder(context.globalStoragePath);
  let previousQueryProvider = new PreviousQueryProvider(historyRecorder);
  outputChannel = vscode.window.createOutputChannel("RethinkDB Explorer");
  const myCommandId = "rethinkdbExplorer.runQuery";
  context.subscriptions.push(
    vscode.commands.registerCommand(myCommandId, () => {
      if (!running) {
        if (vscode.window.activeTextEditor) {
          let currentTextEditor = vscode.window.activeTextEditor;
          let query = currentTextEditor.document.getText(
            !currentTextEditor.selection.isEmpty
              ? currentTextEditor.selection
              : undefined
          );
          running = true;
          myStatusBarItem.text = `$(flame) Executing...`;
          runner.executeQuery(query).then(results => {
            try {
              if (results instanceof Error) {
                displayError(results);
              } else {
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
              myStatusBarItem.text = menuButtonText;
              running = false;
            }
          });
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(e => {
      if (e && e.document.languageId === "rethinkdb") {
        myStatusBarItem.show();
      } else {
        myStatusBarItem.hide();
      }
    })
  );

  myStatusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  myStatusBarItem.command = myCommandId;
  myStatusBarItem.text = menuButtonText;
  if (
    vscode.window.activeTextEditor &&
    vscode.window.activeTextEditor.document.languageId === "rethinkdb"
  ) {
    myStatusBarItem.show();
  }
  context.subscriptions.push(myStatusBarItem);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(e => {
      if (e && e.languageId === "rethinkdb") {
        myStatusBarItem.show();
      } else if (!e || e.languageId !== "Log") {
        myStatusBarItem.hide();
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
  myStatusBarItem.hide();
}
