# Backend and data design

Read when creating or changing APIs, business logic, persistence, or database queries.

## Modules and seams

Organize business capabilities as deep modules with small interfaces that include invariants, error modes, ordering, and performance expectations. Keep Fastify handlers as transport adapters and Prisma repositories as persistence adapters; business rules do not depend on HTTP or ORM objects. Inject external dependencies. Introduce a formal adapter seam when behavior genuinely varies or a test adapter is required; avoid pass-through interfaces that merely rename one implementation.

Each module owns its rules and persistence access. Cross-module work calls the owning module's interface rather than reaching into its tables or internal functions. Define transaction ownership for workflows spanning modules and keep dependency direction explicit and acyclic.

## Relational model

Model requested concepts with normalized tables, explicit keys, constraints, relation ownership, deletion behavior, and indexes supporting confirmed access paths. Default to third normal form. Denormalize only after a measured query or scale requirement demonstrates the need, and document how derived values remain consistent.

## Query behavior

Every collection interface defines pagination, ordering, filtering limits, and a query budget. Test representative cardinality while counting Prisma queries so list endpoints cannot regress into N+1 behavior. Use set-based queries, joins/includes/selects, batching, and appropriate indexes; inspect the query plan for slow or high-volume paths. Never fix N+1 by returning unbounded relation graphs.

## Completion

Verify business rules through module interfaces, transport behavior through the running API, and persistence through the real selected database. Complete only when module ownership is clear, query counts stay within the recorded budget as row count grows, and the schema preserves every confirmed invariant.
