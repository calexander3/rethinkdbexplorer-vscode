# RethinkDB Explorer

An extension to allow you to query your RethinkDB server from right inside your favorite editor. Simply switch your document type to RethinkDB and start writing your query.

## Features

- Query against your RethinkDB server and retreive results in a JSON and tabular format
- Restore a previous query and its data from a history of your most recent queries

![RethinkDB Explorer](extension.gif)

## Extension Settings

This extension is configured through the following settings:

- `rethinkdbExplorer.host`: Address of the RethinkDB server to connect to. Defaults to `localhost`.
- `rethinkdbExplorer.port`: Specifies the port the RethinkDB server is listening on. Defaults to `28015`.
- `rethinkdbExplorer.database`: Default database to connect to.
- `rethinkdbExplorer.username`: Username to use when connecting to the RethinkDB server.
- `rethinkdbExplorer.password`: Password to use when connecting to the RethinkDB server.
- `rethinkdbExplorer.tls`: Connect to RethinkDB over a tls connection. Defaults to `false`.
- `rethinkdbExplorer.maxHistory`: How many previous queries to save. Defaults to `50`.

## Release Notes

### 1.0.0

Initial release
