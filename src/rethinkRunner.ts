import { r, Connection } from "rethinkdb-ts";
import { RethinkConnectionBuilder } from "./rethinkConnectionBuilder";

export class RethinkRunner {
  constructor(private _rethinkConnectionBuilder: RethinkConnectionBuilder) {}

  async executeQuery(query: string) {
    let results;
    let connection: Connection | undefined;
    if (query) {
      if (query.includes(".run(")) {
        throw new Error("Query cannot contain the run() command");
      }
      try {
        connection = await this._rethinkConnectionBuilder.Connect();

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
