# Preset sources

Every shipped preset cites its research corpus here. PRs introducing new presets must add a row.

| Preset | Sources |
|---|---|
| anthropic | `anthropics/anthropic-sdk-typescript` src/ (error hierarchy, client, pagination, streaming, internal utils); SDK examples/ (tools.ts, streaming.ts, agents.ts); tsconfig.json |
| carmack | `id-Software/Quake` — WinQuake/gl_mesh.c, r_alias.c, r_local.h, sv_phys.c; `id-Software/DOOM` — linuxdoom-1.10/r_draw.c, p_enemy.c, m_misc.c |
| linus | `torvalds/linux` Documentation/process/coding-style.rst (read in full); kernel source: kernel/fork.c, fs/open.c, init/main.c, mm/page_alloc.c, kernel/sched/core.c |
| dhh | `rails/rails` — activerecord/lib/ (base.rb, scoping/named.rb, validations.rb, associations.rb), railties/lib/rails/application.rb, action_controller/metal/strong_parameters.rb, activesupport/lib/active_support/concern.rb, callbacks.rb, core_ext/string/inflections.rb; Rails Doctrine and DHH blog content |
| fowler | `martinfowler.com/bliki` — TellDontAsk, AnemicDomainModel, FunctionLength, IntentionRevealingNames, CommandQuerySeparation, FluentInterface, BeckDesignRules; *Refactoring* (1st/2nd ed.), refactoring.com/catalog; *Patterns of EAA* — Repository, Service Layer, Domain Model |
| dan-abramov | `reduxjs/redux` — createStore, combineReducers, compose, applyMiddleware, bindActionCreators, types/; `reactjs/rfcs#68` (Hooks RFC); `facebook/react` — ReactHooks.js, ReactFiberHooks.js; `reduxjs/react-redux` useSelector |
| 37signals | `dev.37signals.com` — Jorge Manrubia on "Good concerns" and "Vanilla Rails is plenty", Jeffrey Hardy "Delegated Type Pattern", Donal McBreen "The radiating programmer"; `signalvnoise.com` — Jason Fried "Copywriting is interface design"; `basecamp/kamal`, `basecamp/trix`, `basecamp/console1984`, `basecamp/geared_pagination`, `basecamp/house-style`; `world.hey.com/jason` |
| google-go | `go.dev/doc/effective_go` (primary); Google Go Style Guide + best-practices; `github.com/golang/go/wiki/CodeReviewComments`; Go stdlib — net/http/server.go, io/io.go, bytes/buffer.go, strings/strings.go, os/file.go |
