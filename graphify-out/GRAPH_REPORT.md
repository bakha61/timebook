# Graph Report - timebook  (2026-10-26)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 89 nodes · 214 edges · 8 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- test_api.py
- service.py
- get_db
- routes.py
- attachEvents
- app.js
- t
- renderTimer

## God Nodes (most connected - your core abstractions)
1. `get_db()` - 13 edges
2. `attachEvents()` - 13 edges
3. `t()` - 10 edges
4. `DomainError` - 9 edges
5. `add_employee()` - 9 edges
6. `entries_report()` - 9 edges
7. `stop_timer()` - 9 edges
8. `renderReport()` - 9 edges
9. `start_timer()` - 8 edges
10. `init()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `app()` --calls--> `create_app()`  [EXTRACTED]
  tests/test_api.py → app/__init__.py
- `test_data_survives_new_app_instance()` --calls--> `create_app()`  [EXTRACTED]
  tests/test_api.py → app/__init__.py
- `test_parallel_start_keeps_single_active_entry()` --calls--> `get_db()`  [EXTRACTED]
  tests/test_api.py → app/db.py
- `test_report_intersection_and_active_timer()` --calls--> `get_db()`  [EXTRACTED]
  tests/test_api.py → app/db.py
- `create_employee()` --calls--> `create_employee()`  [EXTRACTED]
  app/routes.py → app/service.py

## Import Cycles
- None detected.

## Communities (8 total, 0 thin omitted)

### Community 0 - "test_api.py"
Cohesion: 0.18
Nodes (11): add_employee(), app(), client(), test_array_payload_returns_validation_error(), test_data_survives_new_app_instance(), test_employee_creation_and_validation(), test_immediate_stop_still_appears_in_report(), test_parallel_start_keeps_single_active_entry() (+3 more)

### Community 1 - "service.py"
Cohesion: 0.29
Nodes (12): create_employee(), DomainError, employee_exists(), entries_report(), entry_dict(), list_employees(), parse_utc(), require_employee() (+4 more)

### Community 2 - "get_db"
Cohesion: 0.20
Nodes (4): close_db(), get_db(), init_db(), create_app()

### Community 3 - "routes.py"
Cohesion: 0.23
Nodes (7): create_employee(), domain_error(), entries(), index(), list_employees(), start_timer(), stop_timer()

### Community 4 - "attachEvents"
Cohesion: 0.33
Nodes (11): api(), attachEvents(), dateRange(), errorText(), fieldError(), init(), loadReport(), localDate() (+3 more)

### Community 5 - "app.js"
Cohesion: 0.60
Nodes (3): dateInputValue(), formatDuration(), pad()

### Community 6 - "t"
Cohesion: 0.70
Nodes (5): formatDateTime(), renderEmployees(), renderReport(), setLanguage(), t()

### Community 7 - "renderTimer"
Cohesion: 0.60
Nodes (5): initials(), loadEmployees(), renderTimer(), selectedEmployee(), updateClock()

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_db()` connect `get_db` to `test_api.py`, `service.py`?**
  _High betweenness centrality (0.062) - this node is a cross-community bridge._
- **Why does `create_app()` connect `get_db` to `test_api.py`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._