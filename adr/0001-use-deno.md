# Use Deno

- 2026-02-20

# Context

Rewriting Vue3 + VueForm to a proper react-hook-form + React setup.
"Proper", because the form for collecting movement information is actually quite
complex, so getting by with even a library like VueForm wasn't possible—I got
stuck in it trying to accommodate some changes.

# Decision

Using it mostly for fun because:

1. It doesn't get in the way and can be fully removed relatively quickly
2. No need to fuss with prettier, eslint—everything is built-in and
   promising (I don't really enjoy configuring prettier and eslint)

# Consequences

Essentially none. The only bummer is that packages still have to be fetched
the usual way, so node is needed anyway, and it feels like Deno is here just
for a couple of tools. Oh well...
