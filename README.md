# DOHMANE

A flux-based model store backed by nuclear.js, with a web-worker harness.

This is an exploratory project, not intended for production use at this time.

The API currently supports:

- change / delete tracking
- primary key update cascades along foreign keys
- delete cascades along inverse foreign keys
- observables proxied through a web-worker

## Hacking

```bash
npm install
webpack-dev-server --inline --watch-poll
```


## Docs

```bash
npm install -g esdoc
esdoc -c esdoc.json
open ./dist/docs/cache/index.html
```
