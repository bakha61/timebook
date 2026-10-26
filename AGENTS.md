# Project instructions

- Read `README.md` for project scope and setup.
- For codebase questions, check `graphify-out/graph.json` first. If present, use `graphify query`, then `graphify path` or `graphify explain` as needed to find relevant nodes and source locations. Read only the source files needed to confirm or change behavior.
- If source files changed since the graph was built, run `graphify update .` before relying on the graph. Build the initial graph after the first source files exist. Update it after each meaningful implementation stage and before commits.
- Keep `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` tracked; keep local caches and interpreter paths out of Git. On a fresh clone without a graph, build it from the repository.
- Run relevant tests, inspect `git diff` and `git status`, then make a meaningful commit after each completed stage. Do not commit the SQLite database or `.venv`.
- Use fictional employee names and tasks in tests and screenshots. Document actual AI assistance and concrete corrections in the README.
