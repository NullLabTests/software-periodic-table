# Design Notes

## Why a Periodic Table?

Chemistry succeeded by discovering that a large variety of substances could be explained by combinations of a modest number of elements with regular properties. Software, especially application software, shows a similar regularity once you look past framework and language differences.

The table is deliberately *application-oriented*. It is not a table of programming-language constructs or of infrastructure primitives. It targets the recurring nouns, attributes, operations, views, cognitive operations, and governance mechanisms that appear in SaaS products, internal tools, and workflow systems.

## Composition over Generation

LLMs are excellent at generating plausible code. They are less excellent at consistently regenerating the same reliable patterns without drift or omission. By making the common patterns first-class and retrievable, we turn the generation problem into a selection + configuration + wiring problem. That is a smaller and more reliable search space.

## Stability vs. Growth

The table should grow slowly. New elements should be added only when there is clear evidence that a concept is both:

- widely recurring across independent systems, and
- not adequately expressible by composition of existing elements.

Domain-specific concepts (e.g. "Claim" in insurance, "Sku" in retail) belong in optional domain packs rather than the core table.

## Relationship to Existing Work

This project sits at the intersection of:

- Component-based software engineering and software product lines
- Library learning / program abstraction systems
- Modern coding-agent scaffolding and retrieval
- Atomic design (UI) generalized to full application structure

It does not claim to invent the idea of reusable building blocks. It claims that a concrete, curated, agent-oriented realization of that idea is still under-served and valuable.
