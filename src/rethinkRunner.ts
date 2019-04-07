"use strict";

import * as vscode from "vscode";
import { r, Connection } from "rethinkdb-ts";

export class RethinkRunner {
  async executeQuery(query: string) {
    let results;
    let connection: Connection | undefined;
    if (query) {
      if (query.includes(".run(")) {
        throw new Error("Query cannot contain the run() command");
      }
      try {
        let config = vscode.workspace.getConfiguration();
        let host: string | undefined = config.get("rethinkdbExplorer.host");
        let portNumber: number | undefined = config.get(
          "rethinkdbExplorer.port"
        );
        let database: string | undefined = config.get(
          "rethinkdbExplorer.database"
        );
        let tlsConnection: boolean | undefined = config.get(
          "rethinkdbExplorer.tls"
        );
        let username: string | undefined = config.get(
          "rethinkdbExplorer.username"
        );
        let password: string | undefined = config.get(
          "rethinkdbExplorer.password"
        );
        connection = await r.connect({
          host: host || "localhost",
          port: portNumber || 28015,
          db: !!database ? database : undefined,
          tls: tlsConnection || false,
          user: !!username ? username : undefined,
          password: !!password ? password : undefined
        });

        let parsedQuery = new Function("r", `return ${query}`).call(this, r);
        results = await parsedQuery.run(connection);
      } catch (e) {
        return e;
      } finally {
        if (connection) {
          await connection.close();
        }
      }
    }
    return results;
  }
}
