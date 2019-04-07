"use strict";

import { r, Connection } from "rethinkdb-ts";

export class RethinkRunner {
  async executeQuery(query: string) {
    let results;
    let connection: Connection | undefined;
    if (query) {
      try {
        connection = await r.connect({
          host: "localhost",
          port: 28015,
          db: "test"
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
