---
name: review-stack-exception
description: Decide whether a concrete product or scale requirement justifies departing from React, Fastify, Prisma, PostgreSQL, or Expo and define the required operational compatibility.
---

# Review a stack exception

1. State the measurable requirement the preferred recipe cannot meet.
2. Test the simplest preferred-stack design against that requirement and document evidence of the gap.
3. Compare the exceptional stack's operational and maintenance cost to the demonstrated benefit.
4. Choose autonomously based on evidence; record the decision and rejected simpler option.
5. Require the exception to implement registered environment, health, container, test, backup, deploy, and rollback interfaces.

Complete when the decision is evidence-backed and the connected-change plan covers the exceptional stack's lifecycle.
