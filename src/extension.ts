import * as vscode from "vscode";
import { RethinkRunner } from "./rethinkRunner";
import { TableResultViewer } from "./ResultViewers/tableResultViewer";
import { PreviousQueryTreeProvider, PreviousQueryHeader } from "./TreeViewProviders/previousQueryTreeProvider";
import { HistoryRecorder } from "./historyRecorder";
import { JsonResultViewer } from "./ResultViewers/jsonResultViewer";
import { RethinkCompletionProvider } from "./rethinkCompletionProvider";
import { TableIndexTreeProvider, Table } from "./TreeViewProviders/tableIndexTreeProvider";
import { RethinkConnectionBuilder } from "./rethinkConnectionBuilder";
import { ConnectionTreeProvider, Server } from "./TreeViewProviders/connectionTreeProvider";

let executeQueryStatusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let executeQueryButtonText: string = `$(play) Execute Query`;
let running: boolean;
let connectionBuilder: RethinkConnectionBuilder;
let runner: RethinkRunner;
let tableResultViewer = new TableResultViewer();
let jsonResultsViewer = new JsonResultViewer();

const exampleConnectionSettings = `,
    "rethinkdbExplorer.supplementalConnections": [
      //{
        //"rethinkdbExplorer.host": "localhost",
        //"rethinkdbExplorer.port": 28015,
        //"rethinkdbExplorer.database": "",
        //"rethinkdbExplorer.username": "",
        //"rethinkdbExplorer.password": "",
        //"rethinkdbExplorer.tls": false
      //}
    ]`;

export function activate(context: vscode.ExtensionContext) {
  connectionBuilder = new RethinkConnectionBuilder(context);
  runner = new RethinkRunner(connectionBuilder);
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider("rethinkdb", new RethinkCompletionProvider(), ".")
  );

  executeQueryStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  executeQueryStatusBarItem.command = "rethinkdbExplorer.runQuery";
  executeQueryStatusBarItem.text = executeQueryButtonText;
  if (vscode.window.activeTextEditor && vscode.window.activeTextEditor.document.languageId === "rethinkdb") {
    executeQueryStatusBarItem.show();
  }
  context.subscriptions.push(executeQueryStatusBarItem);

  let historyRecorder = new HistoryRecorder(context.globalStoragePath);
  let previousQueryTreeProvider = new PreviousQueryTreeProvider(historyRecorder);
  let tableIndexTreeProvider = new TableIndexTreeProvider(context, connectionBuilder);
  let connectionTreeProvider = new ConnectionTreeProvider(context, connectionBuilder);

  outputChannel = vscode.window.createOutputChannel("RethinkDB Explorer");
  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.runQuery", async () => {
      if (!running) {
        if (vscode.window.activeTextEditor) {
          let currentTextEditor = vscode.window.activeTextEditor;
          let query = currentTextEditor.document.getText(
            !currentTextEditor.selection.isEmpty ? currentTextEditor.selection : undefined
          );
          running = true;
          executeQueryStatusBarItem.text = `$(flame) Executing...`;
          try {
            let dateStarted = new Date();
            let execution = await runner.executeQuery(query);
            if (execution instanceof Error) {
              displayError(execution);
            } else {
              let { results, serverInfo } = execution;
              let dateExecuted = new Date();
              let executionTime = dateExecuted.getTime() - dateStarted.getTime();
              outputChannel.appendLine(
                `${query.trim()} took ${executionTime}ms${
                  Array.isArray(results) ? " and returned " + results.length + " objects" : ""
                }`
              );
              outputChannel.show(true);
              historyRecorder.SaveHistory({
                query,
                dateExecuted,
                dataReturned: results,
                executionTime,
                rowCount: Array.isArray(results) ? results.length : undefined,
                serverInfo
              });
              let tableView = tableResultViewer.RenderResults(
                currentTextEditor.document.fileName,
                results,
                serverInfo,
                dateExecuted,
                vscode.ViewColumn.Beside
              );
              await jsonResultsViewer.RenderResults(
                currentTextEditor.document.fileName,
                results,
                query,
                serverInfo,
                dateExecuted,
                tableView.viewColumn || vscode.ViewColumn.Beside
              );

              previousQueryTreeProvider.refresh();
            }
          } catch (e) {
            displayError(e);
          } finally {
            executeQueryStatusBarItem.text = executeQueryButtonText;
            running = false;
          }
        }
      } else {
        await runner.killConnection();
        executeQueryStatusBarItem.text = executeQueryButtonText;
        running = false;
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.selectTop100", async (item: Table) => {
      let document = await vscode.workspace.openTextDocument({
        language: "rethinkdb",
        content: `r.db("${item.dbName}").table("${item.label}").limit(100);`
      });
      await vscode.window.showTextDocument(document, {
        viewColumn: vscode.ViewColumn.Active,
        preserveFocus: false
      });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.refreshSchema", () => {
      tableIndexTreeProvider.reloadSchema();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.changeConnection", (item: Server) => {
      if (item.label) {
        connectionBuilder.SelectedConnection = item.label;
        connectionTreeProvider.reloadConnections();
        tableIndexTreeProvider.reloadSchema();
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.editConnections", async () => {
      await vscode.commands.executeCommand("workbench.action.openSettingsJson");
      setTimeout(async () => {
        if (vscode.window.visibleTextEditors && vscode.window.visibleTextEditors.length) {
          let settingsEditors = vscode.window.visibleTextEditors.filter(d =>
            d.document.fileName.toLocaleLowerCase().endsWith("settings.json")
          );
          if (settingsEditors.length) {
            let currentTextEditor = settingsEditors[0];
            let currentJson = currentTextEditor.document.getText();
            if (!currentJson.includes("rethinkdbExplorer.supplementalConnections")) {
              let position = new vscode.Position(
                currentJson.substring(0, currentJson.lastIndexOf("}")).split("\n").length - 2,
                Number.MAX_SAFE_INTEGER
              );
              await currentTextEditor.edit(edit => {
                edit.insert(position, exampleConnectionSettings);
              });
              currentTextEditor.revealRange(new vscode.Range(position, position));
            }
          }
        }
      }, 100);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.restoreHistoryItem", async (item: PreviousQueryHeader) => {
      let queryDate = new Date(item.historyItem.dateExecuted);
      outputChannel.appendLine(
        `${item.historyItem.query.trim()} took ${
          item.historyItem.executionTime
        }ms on ${queryDate.toLocaleDateString()} ${queryDate.toLocaleTimeString()}${
          Array.isArray(item.historyItem.dataReturned)
            ? " and returned " + item.historyItem.dataReturned.length + " objects"
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
      let resultDate = new Date(item.historyItem.dateExecuted);
      let tableView = tableResultViewer.RenderResults(
        editor.document.fileName,
        item.historyItem.dataReturned,
        item.historyItem.serverInfo,
        resultDate,
        vscode.ViewColumn.Beside
      );
      await jsonResultsViewer.RenderResults(
        editor.document.fileName,
        item.historyItem.dataReturned,
        item.historyItem.query,
        item.historyItem.serverInfo,
        resultDate,
        tableView.viewColumn || vscode.ViewColumn.Beside
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("rethinkdbExplorer.deleteHistory", async () => {
      let response = await vscode.window.showWarningMessage(
        "Are you sure you wish to delete your saved queries?",
        "Yes",
        "No"
      );
      if (response === "Yes") {
        historyRecorder.RemoveHistory();
        previousQueryTreeProvider.refresh();
      }
    })
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
      } else if (!((e && e.languageId === "Log") || (e.isUntitled && e.languageId === "jsonc"))) {
        executeQueryStatusBarItem.hide();
      }
    })
  );

  vscode.window.registerTreeDataProvider("rethinkdbexplorerhistory", previousQueryTreeProvider);
  vscode.window.registerTreeDataProvider("rethinkdbexplorerdbviewer", tableIndexTreeProvider);
  vscode.window.registerTreeDataProvider("rethinkdbexplorerconnections", connectionTreeProvider);
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration("rethinkdbExplorer")) {
        connectionTreeProvider.reloadConnections();
        tableIndexTreeProvider.reloadSchema();
      }
    })
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
