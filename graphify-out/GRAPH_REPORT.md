# Graph Report - portfolio  (2026-11-06)

## Corpus Check
- 1 files · ~8,280 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 19 nodes · 28 edges · 3 communities
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- main.js
- draw
- frame

## God Nodes (most connected - your core abstractions)
1. `draw()` - 7 edges
2. `update()` - 4 edges
3. `frame()` - 4 edges
4. `consumerFor()` - 3 edges
5. `bezier()` - 2 edges
6. `spawn()` - 2 edges
7. `roundRect()` - 2 edges
8. `wire()` - 2 edges
9. `ease()` - 2 edges
10. `start()` - 2 edges

## Surprising Connections (you probably didn't know these)
- `draw()` --calls--> `consumerFor()`  [EXTRACTED]
  main.js → main.js  _Bridges community 2 → community 1_

## Import Cycles
- None detected.

## Communities (3 total, 0 thin omitted)

### Community 0 - "main.js"
Cohesion: 0.22
Nodes (4): links, nav, revealer, sections

### Community 1 - "draw"
Cohesion: 0.40
Nodes (5): bezier(), draw(), ease(), roundRect(), wire()

### Community 2 - "frame"
Cohesion: 0.40
Nodes (5): consumerFor(), frame(), spawn(), start(), update()

## Knowledge Gaps
- **4 isolated node(s):** `revealer`, `nav`, `links`, `sections`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 8 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `draw()` connect `draw` to `main.js`, `frame`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Why does `update()` connect `frame` to `main.js`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `frame()` connect `frame` to `main.js`, `draw`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `revealer`, `nav`, `links` to the rest of the system?**
  _4 weakly-connected nodes found - possible documentation gaps or missing edges._