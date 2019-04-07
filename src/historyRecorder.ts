"use strict";

import * as fs from "fs";
import * as path from "path";

export class HistoryRecorder {
  readonly fileName: string = "history.json";
  private _history: HistoryItem[] | undefined;
  constructor(private _settingPath: string) {}

  LoadHistory(): HistoryItem[] {
    if (!this._history) {
      let filePath = path.join(this._settingPath, this.fileName);
      if (fs.existsSync(filePath)) {
        let rawData = fs.readFileSync(filePath).toString();
        this._history = JSON.parse(rawData);
      } else {
        this._history = [];
      }
    }
    return this._history || [];
  }

  SaveHistory(historyItem: HistoryItem) {
    if (!this._history) {
      this._history = [];
    }
    this._history.push(historyItem);

    if (!fs.existsSync(this._settingPath)) {
      fs.mkdirSync(this._settingPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(this._settingPath, this.fileName),
      JSON.stringify(this._history)
    );
  }
}

export interface HistoryItem {
  query: string;
  dateExecuted: Date;
  dataReturned: any;
  rowCount?: number;
}
