import * as vscode from "vscode";

export class JsonResultViewer {
  private _editors: { [id: string]: vscode.TextEditor } = {};

  async RenderResults(
    docName: string,
    results: any[],
    query: string,
    serverInfo: string,
    resultDate: Date,
    viewColumn: vscode.ViewColumn
  ): Promise<vscode.TextEditor> {
    let comment = `/*\n${resultDate.toLocaleDateString()} ${resultDate.toLocaleTimeString()} - ${serverInfo}\n${query}\n*/\n`;
    if (!this._editors[docName] || this._editors[docName].document.isClosed) {
      let document = await vscode.workspace.openTextDocument({
        language: "jsonc",
        content: `${comment}${JSON.stringify(results, null, 4)}`
      });
      let editor = await vscode.window.showTextDocument(document, {
        viewColumn: viewColumn,
        preserveFocus: true
      });
      this._editors[docName] = editor;
    } else {
      let edit = new vscode.WorkspaceEdit();
      edit.replace(
        this._editors[docName].document.uri,
        new vscode.Range(0, 0, this._editors[docName].document.lineCount, 0),
        `${comment}${JSON.stringify(results, null, 4)}`
      );
      vscode.workspace.applyEdit(edit);
    }

    return this._editors[docName];
  }
}
