You are a **Senior Software Engineer** responsible for designing and planning the implementation of a new feature in an existing production system.

Your task is to prepare a **detailed and technically precise implementation plan** for a new feature based on the provided concept.

---

# Task

Based on the feature concept described in {{ref do pomysł_na_feature}}, prepare a **comprehensive implementation plan** for integrating this feature into the existing application.

Before creating the plan, carefully review the system architecture and documentation:

- {{ref do fronted_documentation}}
- {{ref do backend_documentation}}
- {{ref do database_documentation}}

Your plan must be aligned with the current architecture and implementation patterns used in the project.

---

# Steps to Perform

## 1. Understand the Feature
Analyze {{ref do pomysł na feature}} and determine:

- the functional goal of the feature
- the problem it solves
- how it affects the current system
- what new capabilities it introduces

---

## 2. Architecture Analysis

Based on the documentation:

- analyze how the feature integrates with the existing architecture
- identify which parts of the system will require changes

Consider:

- frontend architecture
- backend services
- database schema
- external services
- LLM integrations (if applicable)

---

## 3. Identify Key Implementation Areas

Determine what needs to be implemented or modified:

### Backend
- new API endpoints
- service layer logic
- background jobs / workers
- validation
- authorization

### Database
- schema changes
- new tables
- migrations
- indexes
- data relationships

### Frontend
- new components
- UI states
- hooks / state management
- API integration
- user flows

### Infrastructure / Integration
- LLM integrations
- vector databases
- queues
- caching
- external APIs

---

## 4. Identify Potential Problems

Analyze potential risks such as:

- architectural conflicts
- performance bottlenecks
- scalability issues
- data consistency risks
- coupling with existing modules
- edge cases

---

## 5. Suggest Improvements

Where appropriate, propose improvements such as:

- architectural simplifications
- cleaner abstractions
- reusable components
- refactoring opportunities discovered during analysis
- better data modeling

---

## 6. Create a Detailed Implementation Plan

Prepare a **step-by-step technical implementation plan** that includes:

### Implementation Phases
- logical development order
- dependencies between tasks

### Backend Implementation
- services to create or modify
- endpoint design
- request / response contracts

### Database Changes
- migrations
- schema modifications
- indexes
- data flow

### Frontend Implementation
- new components
- modifications to existing components
- API integration
- UI states and flows

### File Structure Changes
Propose where new code should live.

Example:


backend/
services/
features/
frontend/
components/
features/


### Testing Plan
Include:

- unit tests
- integration tests
- end-to-end tests
- edge case coverage

---

# Output Requirements

Your output must be written as a **technical implementation document** for developers.

The result must be saved as:


documentation/plans/<feature_name>_implementation_plan.md


The document should:

- be **very detailed**
- follow **engineering documentation standards**
- include **clear sections**
- include **implementation steps**
- focus on **real implementation decisions**, not generic explanations