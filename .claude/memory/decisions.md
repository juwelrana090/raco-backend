# Architecture Decisions

> ⚠️ PROJECT SCOPED: This file lives in .claude/memory/ only.

[Decisions will be logged here as they are made]

## Template

#### [date] — [Title]

- **Problem**:
- **Options Considered**:
- **Decision**:
- **Reason**:
- **Tradeoffs**:
- **Revisit If**:

---

#### 2026-07-10 — Initial Setup

- **Problem**: Need a structured AI-assisted development system
- **Decision**: Claude Code with .claude/ memory system
- **Reason**: Project-scoped, team-shared, native Claude Code support
- **Tradeoffs**: Requires Claude Code installation
- **Revisit If**: Team grows beyond 10 developers

---

#### 2026-07-10 — Products & Categories Module Implementation

- **Problem**: Need product catalog management with category-based recommendations
- **Decision**: Implemented DFS traversal with Redis caching for category hierarchy
- **Reason**: DFS required by assessment §2.2.5, caching improves performance
- **Tradeoffs**: Cache invalidation complexity vs. query performance
- **Revisit If**: Category tree depth exceeds 100 levels

#### 2026-07-10 — Cache Strategy for Category Trees

- **Problem**: Efficient category hierarchy queries for product recommendations
- **Decision**: Cache descendant category IDs, not full product sets
- **Reason**: More flexible, allows product filtering after cache retrieval
- **Tradeoffs**: Additional query needed to get products
- **Revisit If**: Product catalog exceeds 1M items

#### 2026-07-10 — Category Tree Representation

- **Problem**: Store hierarchical category structure in relational database
- **Decision**: Self-relation via `parentId` FK (not closure table)
- **Reason**: Simpler schema, sufficient for current requirements
- **Tradeoffs**: Less efficient for deep queries vs. closure table
- **Revisit If**: Query performance degrades with 50+ categories

#### 2026-07-10 — Authorization Model for Catalog

- **Problem**: Balance between public access and admin control
- **Decision**: Public read operations, admin-only write operations
- **Reason**: Product catalog is public data, only admins should modify
- **Tradeoffs**: No user-generated content in catalog
- **Revisit If**: Multi-vendor marketplace feature added

#### 2026-07-10 — Stock Management Scope

- **Problem**: Which module handles stock reduction on orders
- **Decision**: Products module NOT responsible for stock reduction
- **Reason**: Stock reduction is order-agent's responsibility per scope
- **Tradeoffs**: Separate modules must coordinate
- **Revisit If**: Stock management becomes complex (reservations, etc.)
