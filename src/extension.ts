"use strict";

import * as vscode from "vscode";
import { RethinkRunner } from "./rethinkRunner";
import { TableResultViewer } from "./tableResultViewer";
import {
  PreviousQueryProvider,
  PreviousQueryHeader
} from "./previousQueryProvider";
import { HistoryRecorder } from "./historyRecorder";
import { JsonResultViewer } from "./jsonResultViewer";
import { RethinkCompletionProvider } from "./rethinkCompletionProvider";
import { TableIndexProvider } from "./tableIndexProvider";
import { RethinkConnectionBuilder } from "./rethinkConnectionBuilder";
import { RethinkDBError } from "rethinkdb-ts/lib/error/error";

let executeQueryStatusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let executeQueryButtonText: string = `$(play) Execute Query`;
let running: boolean;
let connectionBuilder = new RethinkConnectionBuilder();
let runner = new RethinkRunner(connectionBuilder);
let tableResultViewer = new TableResultViewer();
let jsonResultsViewer = new JsonResultViewer();

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      "rethinkdb",
      new RethinkCompletionProvider(),
      "."
    )
  );

  let historyRecorder = new HistoryRecorder(context.globalStoragePath);
  let previousQueryProvider = new PreviousQueryProvider(historyRecorder);
  let tableIndexProvider = new TableIndexProvider(context, connectionBuilder);
  outputChannel = vscode.window.createOutputChannel("RethinkDB Explorer");
  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.runQuery", async () => {
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
          try {
            let dateStarted = new Date();
            let results = await runner.executeQuery(query);
            if (results instanceof Error) {
              displayError(results);
            } else {
              let dateExecuted = new Date();
              let executionTime =
                dateExecuted.getTime() - dateStarted.getTime();
              outputChannel.appendLine(
                `${query} took ${executionTime}ms${
                  Array.isArray(results)
                    ? " and returned " + results.length + " objects"
                    : ""
                }`
              );
              outputChannel.show(true);
              historyRecorder.SaveHistory({
                query,
                dateExecuted,
                dataReturned: results,
                executionTime,
                rowCount: Array.isArray(results) ? results.length : undefined
              });
              let tableView = tableResultViewer.RenderResults(
                currentTextEditor.document.fileName,
                results,
                dateExecuted,
                vscode.ViewColumn.Beside
              );
              await jsonResultsViewer.RenderResults(
                currentTextEditor.document.fileName,
                results,
                tableView.viewColumn || vscode.ViewColumn.Beside
              );

              previousQueryProvider.refresh();
            }
          } catch (e) {
            displayError(e);
          } finally {
            executeQueryStatusBarItem.text = executeQueryButtonText;
            running = false;
          }
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
      async (item: PreviousQueryHeader) => {
        let queryDate = new Date(item.historyItem.dateExecuted);
        outputChannel.appendLine(
          `${item.historyItem.query} took ${
            item.historyItem.executionTime
          }ms on ${queryDate.toLocaleDateString()} ${queryDate.toLocaleTimeString()}${
            Array.isArray(item.historyItem.dataReturned)
              ? " and returned " +
                item.historyItem.dataReturned.length +
                " objects"
              : ""
          }`
        );
        outputChannel.show(true);
        let document = await vscode.workspace.openTextDocument({
          language: "rethinkdb",
          content: item.historyItem.query
        });
        let editor = await vscode.window.showTextDocument(document, {
          viewColumn: vscode.ViewColumn.One,
          preserveFocus: false
        });
        let tableView = tableResultViewer.RenderResults(
          editor.document.fileName,
          item.historyItem.dataReturned,
          new Date(item.historyItem.dateExecuted),
          vscode.ViewColumn.Beside
        );
        await jsonResultsViewer.RenderResults(
          editor.document.fileName,
          item.historyItem.dataReturned,
          tableView.viewColumn || vscode.ViewColumn.Beside
        );
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "rethinkdbExplorer.deleteHistory",
      async () => {
        let response = await vscode.window.showWarningMessage(
          "Are you sure you wish to delete your saved queries?",
          "Yes",
          "No"
        );
        if (response === "Yes") {
          historyRecorder.RemoveHistory();
          previousQueryProvider.refresh();
        }
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
      } else if (
        !(
          (e && e.languageId === "Log") ||
          (e.isUntitled && e.languageId === "json")
        )
      ) {
        executeQueryStatusBarItem.hide();
      }
    })
  );

  vscode.window.registerTreeDataProvider(
    "rethinkdbexplorerhistory",
    previousQueryProvider
  );
  vscode.window.registerTreeDataProvider(
    "rethinkdbexplorerdbviewer",
    tableIndexProvider
  );
}

function displayError(error: any) {
  if (outputChannel && error) {
    outputChannel.appendLine(error.message);
    if (error.cause && error.cause.message) {
      outputChannel.appendLine(`Cause: ${error.cause.message}`);
    }
    if (error.stack) {
      outputChannel.appendLine(error.stack);
    }
    outputChannel.show(true);
  }
}

export function deactivate() {}
