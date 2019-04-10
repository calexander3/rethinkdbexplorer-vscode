import * as vscode from "vscode";

export class JsonResultViewer {
  private _editors: { [id: string]: vscode.TextEditor } = {};

  async RenderResults(
    docName: string,
    results: any[],
    viewColumn: vscode.ViewColumn
  ): Promise<vscode.TextEditor> {
    if (!this._editors[docName] || this._editors[docName].document.isClosed) {
      let document = await vscode.workspace.openTextDocument({
        language: "json",
        content: JSON.stringify(results, null, 4)
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
        JSON.stringify(results, null, 4)
      );
      vscode.workspace.applyEdit(edit);
    }

    return this._editors[docName];
  }
}
