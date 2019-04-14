import { r, Connection } from "rethinkdb-ts";
import { RethinkConnectionBuilder } from "./rethinkConnectionBuilder";

export class RethinkRunner {
  private connection: Connection | null | undefined;
  constructor(private _rethinkConnectionBuilder: RethinkConnectionBuilder) {}

  async executeQuery(query: string) {
    let results;
    let serverInfo: string | undefined;
    if (query) {
      if (query.includes(".run(")) {
        throw new Error("Query cannot contain the run() command");
      }
      try {
        this.connection = await this._rethinkConnectionBuilder.Connect();
        serverInfo = `${this.connection.clientAddress}:${this.connection.clientPort}`;
        let parsedQuery = new Function("r", `return ${query}`).call(this, r);
        results = await parsedQuery.run(this.connection);
      } catch (e) {
        return e;
      } finally {
        if (this.connection) {
          await this.connection.close();
          this.connection = null;
        }
      }
    }
    return { results, serverInfo };
  }

  async killConnection() {
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
}
