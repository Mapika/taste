# carmack — corpus

Research corpus for the `carmack` taste preset. All snippets are real excerpts
from public id Software source. Every rule in `carmack.md` must trace to at least
one of these snippets.

## Sources

- https://raw.githubusercontent.com/id-Software/Quake/master/WinQuake/gl_mesh.c (triangle strip generation, goto, global arrays)
- https://raw.githubusercontent.com/id-Software/Quake/master/WinQuake/r_alias.c (alias model rendering, static globals, #include inside array init)
- https://raw.githubusercontent.com/id-Software/Quake/master/WinQuake/r_local.h (extern declarations, macro constants, struct typedefs)
- https://raw.githubusercontent.com/id-Software/Quake/master/WinQuake/sv_phys.c (physics, cvar globals, block comment describing object taxonomy)
- https://raw.githubusercontent.com/id-Software/DOOM/master/linuxdoom-1.10/r_draw.c (column/span renderers, dc_* globals, lookup tables)
- https://raw.githubusercontent.com/id-Software/DOOM/master/linuxdoom-1.10/p_enemy.c (enemy AI, direction LUTs, P_RecursiveSound, P_Move, P_NewChaseDir)
- https://raw.githubusercontent.com/id-Software/DOOM/master/linuxdoom-1.10/m_misc.c (M_WriteFile/M_ReadFile, I_Error for hard failure, open/close POSIX wraps)

## Snippets — naming & structure

### Snippet 1: WinQuake/gl_mesh.c:31-50
```c
model_t		*aliasmodel;
aliashdr_t	*paliashdr;

qboolean	used[8192];

// the command list holds counts and s/t values that are valid for
// every frame
int		commands[8192];
int		numcommands;

// all frames will have their vertexes rearranged and expanded
// so they are in the order expected by the command list
int		vertexorder[8192];
int		numorder;

int		allverts, alltris;

int		stripverts[128];
int		striptris[128];
int		stripcount;
```
*What this shows:* File-scope globals instead of encapsulated state; one comment per logical group of globals, not per variable; `p` prefix for pointers, no Hungarian elsewhere; two variables on one line when they form a natural pair (`allverts, alltris`).

### Snippet 2: WinQuake/r_alias.c:22-65
```c
#include "quakedef.h"
#include "r_local.h"
#include "d_local.h"	// FIXME: shouldn't be needed (is needed for patch
						// right now, but that should move)

#define LIGHT_MIN	5		// lowest light value we'll allow, to avoid the
							//  need for inner-loop light clamping

mtriangle_t		*ptriangles;
affinetridesc_t	r_affinetridesc;

void *			acolormap;	// FIXME: should go away

trivertx_t		*r_apverts;

// TODO: these probably will go away with optimized rasterization
mdl_t				*pmdl;
vec3_t				r_plightvec;
int					r_ambientlight;
float				r_shadelight;
aliashdr_t			*paliashdr;
finalvert_t			*pfinalverts;
auxvert_t			*pauxverts;
static float		ziscale;
static model_t		*pmodel;

static vec3_t		alias_forward, alias_right, alias_up;

float	aliastransform[3][4];

typedef struct {
	int	index0;
	int	index1;
} aedge_t;

static aedge_t	aedges[12] = {
{0, 1}, {1, 2}, {2, 3}, {3, 0},
{4, 5}, {5, 6}, {6, 7}, {7, 4},
{0, 5}, {1, 4}, {2, 7}, {3, 6}
};
```
*What this shows:* `static` for file-private symbols (zero cost, zero leakage); `FIXME`/`TODO` comments are candid and left in; `#define` constant with inline comment explaining the why; `#include` inside an array initializer is valid Carmack idiom; short identifiers (`i`, `j`, `k`, `s`, `t`) throughout.

### Snippet 3: linuxdoom-1.10/r_draw.c (globals block)
```c
byte*		viewimage; 
int		viewwidth;
int		scaledviewwidth;
int		viewheight;
int		viewwindowx;
int		viewwindowy; 
byte*		ylookup[MAXHEIGHT]; 
int		columnofs[MAXWIDTH]; 

lighttable_t*		dc_colormap; 
int			dc_x; 
int			dc_yl; 
int			dc_yh; 
fixed_t			dc_iscale; 
fixed_t			dc_texturemid;
byte*			dc_source;		

int			ds_y; 
int			ds_x1; 
int			ds_x2;
lighttable_t*		ds_colormap; 
fixed_t			ds_xfrac; 
fixed_t			ds_yfrac; 
fixed_t			ds_xstep; 
fixed_t			ds_ystep;
byte*			ds_source;	
```
*What this shows:* Column-renderer globals use `dc_` prefix; span-renderer globals use `ds_` prefix — a namespace achieved by naming convention, not by wrapping in a struct or class; lookup tables (`ylookup`, `columnofs`) declared at file scope to avoid stack allocation inside the hot path.

### Snippet 4: WinQuake/r_local.h (extern + macro block)
```c
// r_local.h -- private refresh defs

#define ALIAS_BASE_SIZE_RATIO		(1.0 / 11.0)
					// normalizing factor so player model works out to about
					//  1 pixel per triangle

#define BMODEL_FULLY_CLIPPED	0x10 // value returned by R_BmodelCheckBBox ()
									 //  if bbox is trivially rejected

typedef struct {
	int			ambientlight;
	int			shadelight;
	float		*plightvec;
} alight_t;

typedef struct bedge_s
{
	mvertex_t		*v[2];
	struct bedge_s	*pnext;
} bedge_t;

extern cvar_t	r_draworder;
extern cvar_t	r_speeds;
extern cvar_t	r_timegraph;
extern cvar_t	r_graphheight;
extern cvar_t	r_clearcolor;
extern cvar_t	r_waterwarp;
extern cvar_t	r_fullbright;
extern cvar_t	r_drawentities;
```
*What this shows:* `extern` declarations at the top of the header expose only what must be shared — no accessor functions; structs are `typedef`d anonymously; the header comment (`// r_local.h -- private refresh defs`) is a one-liner dash-separated label, not a block; macro constants are preferred over `enum` when the values carry bit-flag or ratio semantics.

### Snippet 5: WinQuake/sv_phys.c:44-50
```c
cvar_t	sv_friction = {"sv_friction","4",false,true};
cvar_t	sv_stopspeed = {"sv_stopspeed","100"};
cvar_t	sv_gravity = {"sv_gravity","800",false,true};
cvar_t	sv_maxvelocity = {"sv_maxvelocity","2000"};
cvar_t	sv_nostep = {"sv_nostep","0"};

#define	MOVE_EPSILON	0.01
```
*What this shows:* Configuration variables are module-level structs initialized inline — no init function, no factory, no builder pattern; `MOVE_EPSILON` is a `#define`, not a `const float`, to guarantee compile-time substitution with no storage.

## Snippets — error handling / control flow

### Snippet 6: WinQuake/gl_mesh.c:58-112 (StripLength with goto)
```c
int	StripLength (int starttri, int startv)
{
	int			m1, m2;
	int			j;
	mtriangle_t	*last, *check;
	int			k;

	used[starttri] = 2;
	last = &triangles[starttri];

	stripverts[0] = last->vertindex[(startv)%3];
	stripverts[1] = last->vertindex[(startv+1)%3];
	stripverts[2] = last->vertindex[(startv+2)%3];

	striptris[0] = starttri;
	stripcount = 1;

	m1 = last->vertindex[(startv+2)%3];
	m2 = last->vertindex[(startv+1)%3];

	// look for a matching triangle
nexttri:
	for (j=starttri+1, check=&triangles[starttri+1] ; j<pheader->numtris ; j++, check++)
	{
		if (check->facesfront != last->facesfront)
			continue;
		for (k=0 ; k<3 ; k++)
		{
			if (check->vertindex[k] != m1)
				continue;
			if (check->vertindex[ (k+1)%3 ] != m2)
				continue;

			// this is the next part of the fan

			// if we can't use this triangle, this tristrip is done
			if (used[j])
				goto done;

			// the new edge
			if (stripcount & 1)
				m2 = check->vertindex[ (k+2)%3 ];
			else
				m1 = check->vertindex[ (k+2)%3 ];

			stripverts[stripcount+2] = check->vertindex[ (k+2)%3 ];
			striptris[stripcount] = j;
			stripcount++;

			used[j] = 2;
			goto nexttri;
		}
	}
done:
	for (j=starttri+1 ; j<pheader->numtris ; j++)
		if (used[j] == 2)
			used[j] = 0;

	return stripcount;
}
```
*What this shows:* `goto` used unashamedly for loop-restart and multi-level break; no error return path — function trusts its inputs; short single-letter loop variables (`j`, `k`); no abstraction wrapping the loop body.

### Snippet 7: linuxdoom-1.10/p_enemy.c (P_Move)
```c
boolean P_Move (mobj_t* actor)
{
    fixed_t	tryx;
    fixed_t	tryy;
    line_t*	ld;
    boolean	try_ok;
    boolean	good;
		
    if (actor->movedir == DI_NODIR)
	return false;
		
    if ((unsigned)actor->movedir >= 8)
	I_Error ("Weird actor->movedir!");
		
    tryx = actor->x + actor->info->speed*xspeed[actor->movedir];
    tryy = actor->y + actor->info->speed*yspeed[actor->movedir];

    try_ok = P_TryMove (actor, tryx, tryy);

    if (!try_ok)
    {
	if (actor->flags & MF_FLOAT && floatok)
	{
	    if (actor->z < tmfloorz)
		actor->z += FLOATSPEED;
	    else
		actor->z -= FLOATSPEED;
	    actor->flags |= MF_INFLOAT;
	    return true;
	}
	if (!numspechit)
	    return false;
	actor->movedir = DI_NODIR;
	good = false;
	while (numspechit--)
	{
	    ld = spechit[numspechit];
	    if (P_UseSpecialLine (actor, ld,0))
		good = true;
	}
	return good;
    }
    else
    {
	actor->flags &= ~MF_INFLOAT;
    }
    if (! (actor->flags & MF_FLOAT) )	
	actor->z = actor->floorz;
    return true; 
}
```
*What this shows:* `I_Error` for invariant violations — call it and crash, no recovery; early return on known-invalid state; boolean return without wrapping in a result type; `&=`, `|=` bit manipulation without helper functions.

### Snippet 8: linuxdoom-1.10/p_enemy.c (P_RecursiveSound)
```c
void P_RecursiveSound (sector_t* sec, int soundblocks)
{
    int		i;
    line_t*	check;
    sector_t*	other;
	
    if (sec->validcount == validcount
	&& sec->soundtraversed <= soundblocks+1)
    {
	return;		// already flooded
    }
    
    sec->validcount = validcount;
    sec->soundtraversed = soundblocks+1;
    sec->soundtarget = soundtarget;
	
    for (i=0 ; i<sec->linecount ; i++)
    {
	check = sec->lines[i];
	if (! (check->flags & ML_TWOSIDED) )
	    continue;
	
	P_LineOpening (check);
	if (openrange <= 0)
	    continue;	// closed door
	
	if ( sides[ check->sidenum[0] ].sector == sec)
	    other = sides[ check->sidenum[1] ] .sector;
	else
	    other = sides[ check->sidenum[0] ].sector;
	
	if (check->flags & ML_SOUNDBLOCK)
	{
	    if (!soundblocks)
		P_RecursiveSound (other, 1);
	}
	else
	    P_RecursiveSound (other, soundblocks);
    }
}
```
*What this shows:* Recursive traversal with a sentinel guard — no visited-set data structure, just a global `validcount` stamp; inline comment `// already flooded` and `// closed door` explain the branch without restating what the condition does; no error return, the function is void and always succeeds.

### Snippet 9: linuxdoom-1.10/m_misc.c (M_ReadFile)
```c
int M_ReadFile (char const* name, byte** buffer)
{
    int	handle, count, length;
    struct stat	fileinfo;
    byte*	buf;
	
    handle = open (name, O_RDONLY | O_BINARY, 0666);
    if (handle == -1)
	I_Error ("Couldn't read file %s", name);
    if (fstat (handle,&fileinfo) == -1)
	I_Error ("Couldn't read file %s", name);
    length = fileinfo.st_size;
    buf = Z_Malloc (length, PU_STATIC, NULL);
    count = read (handle, buf, length);
    close (handle);
	
    if (count < length)
	I_Error ("Couldn't read file %s", name);
		
    *buffer = buf;
    return length;
}
```
*What this shows:* `I_Error` is the error handler — it aborts the process with a message; no try-catch, no error code propagation, no optional return; the function either returns valid data or the process dies; raw POSIX handles, no RAII wrapper.

### Snippet 10: WinQuake/sv_phys.c (SV_CheckVelocity)
```c
void SV_CheckVelocity (edict_t *ent)
{
	int		i;

//
// bound velocity
//
	for (i=0 ; i<3 ; i++)
	{
		if (IS_NAN(ent->v.velocity[i]))
		{
			Con_Printf ("Got a NaN velocity on %s\n", pr_strings + ent->v.classname);
			ent->v.velocity[i] = 0;
		}
		if (IS_NAN(ent->v.origin[i]))
		{
			Con_Printf ("Got a NaN origin on %s\n", pr_strings + ent->v.classname);
			ent->v.origin[i] = 0;
		}
		if (ent->v.velocity[i] > sv_maxvelocity.value)
			ent->v.velocity[i] = sv_maxvelocity.value;
		else if (ent->v.velocity[i] < -sv_maxvelocity.value)
			ent->v.velocity[i] = -sv_maxvelocity.value;
	}
}
```
*What this shows:* NaN check is a `Con_Printf` + fix, not an exception — the game keeps running; clamping logic is a bare `if/else if` chain, not `std::clamp` or a lambda; loop variable `i` used for all three vector components; `//\n// bound velocity\n//` section header is a minimal visual break.

## Snippets — imports / modules / externs

### Snippet 11: linuxdoom-1.10/m_misc.c (includes block)
```c
#include <sys/stat.h>
#include <sys/types.h>
#include <fcntl.h>
#include <stdlib.h>
#include <unistd.h>
#include <ctype.h>

#include "doomdef.h"
#include "z_zone.h"
#include "m_swap.h"
#include "m_argv.h"
#include "w_wad.h"
#include "i_system.h"
#include "i_video.h"
#include "v_video.h"
#include "hu_stuff.h"
#include "doomstat.h"
#include "dstrings.h"
#include "m_misc.h"
```
*What this shows:* System headers first, then project headers — no module system, no namespace imports, no barrels; every `#include` is explicit and purposeful; no re-exporting other modules' symbols; the file's own header comes last, confirming the public API compiles cleanly on its own.

### Snippet 12: WinQuake/r_alias.c:22-26 (include with note)
```c
#include "quakedef.h"
#include "r_local.h"
#include "d_local.h"	// FIXME: shouldn't be needed (is needed for patch
					// right now, but that should move)
```
*What this shows:* A dependency that shouldn't exist is called out inline with `FIXME` rather than silently included; no re-export: each `.c` pulls in exactly what it uses; the public `quakedef.h` umbrella is included once per compilation unit, not transitive-re-exported.

### Snippet 13: WinQuake/r_local.h (extern declarations block)
```c
extern cvar_t	r_draworder;
extern cvar_t	r_speeds;
extern cvar_t	r_timegraph;
extern cvar_t	r_graphheight;
extern cvar_t	r_clearcolor;
extern cvar_t	r_waterwarp;
extern cvar_t	r_fullbright;
extern cvar_t	r_drawentities;
extern cvar_t	r_aliasstats;
extern cvar_t	r_dspeeds;
extern cvar_t	r_drawflat;
extern cvar_t	r_ambient;
extern cvar_t	r_reportsurfout;
extern cvar_t	r_maxsurfs;
extern cvar_t	r_numsurfs;
extern cvar_t	r_reportedgeout;
extern cvar_t	r_maxedges;
extern cvar_t	r_numedges;
```
*What this shows:* Shared state is declared `extern` in headers — no accessor function pattern, no singleton, no dependency injection container; the consuming file includes the header and gets raw access; naming prefix `r_` establishes module membership without a namespace keyword.

### Snippet 14: WinQuake/sv_phys.c:44-50 (module-level cvar definitions)
```c
cvar_t	sv_friction = {"sv_friction","4",false,true};
cvar_t	sv_stopspeed = {"sv_stopspeed","100"};
cvar_t	sv_gravity = {"sv_gravity","800",false,true};
cvar_t	sv_maxvelocity = {"sv_maxvelocity","2000"};
cvar_t	sv_nostep = {"sv_nostep","0"};
```
*What this shows:* Module owns its configuration variables outright — definition is the registration; no `registerCvar()` call at runtime, no config class; `false`/`true` flags inline in the struct literal.

### Snippet 15: WinQuake/r_alias.c:63-72 (forward declarations as module API surface)
```c
void R_AliasTransformAndProjectFinalVerts (finalvert_t *fv, stvert_t *pstverts);
void R_AliasSetUpTransform (int trivial_accept);
void R_AliasTransformVector (vec3_t in, vec3_t out);
void R_AliasTransformFinalVert (finalvert_t *fv, auxvert_t *av,
	trivertx_t *pverts, stvert_t *pstverts);
void R_AliasProjectFinalVert (finalvert_t *fv, auxvert_t *av);
```
*What this shows:* Forward-declare internal functions at the top of the file rather than hoisting function bodies — the list is the module's internal API surface; no `static` here because these cross `.c` files in the same subsystem; parameter names in forward declarations for readability without full definitions.

## Snippets — comments & docs

### Snippet 16: WinQuake/sv_phys.c:24-42 (block comment taxonomy)
```c
/*
pushmove objects do not obey gravity, and do not interact with each other or
trigger fields, but block normal movement and push normal objects when they move.

onground is set for toss objects when they come to a complete rest.  it is set
for steping or walking objects 

doors, plats, etc are SOLID_BSP, and MOVETYPE_PUSH
bonus items are SOLID_TRIGGER touch, and MOVETYPE_TOSS
corpses are SOLID_NOT and MOVETYPE_TOSS
crates are SOLID_BBOX and MOVETYPE_TOSS
walking monsters are SOLID_SLIDEBOX and MOVETYPE_STEP
flying/floating monsters are SOLID_SLIDEBOX and MOVETYPE_FLY

solid_edge items only clip against bsp models.
*/
```
*What this shows:* Module-level comment explains a non-obvious design taxonomy — not "what is a cvar" but "why does gravity skip pushmoves"; the comment reads like a design note, not a manual page; lower-case, no punctuation pedantry, fits on a few lines.

### Snippet 17: WinQuake/r_alias.c:24-27 (macro with inline why-comment)
```c
#define LIGHT_MIN	5		// lowest light value we'll allow, to avoid the
							//  need for inner-loop light clamping
```
*What this shows:* Comment explains the consequence that motivated the constant, not what the constant is; two-space indent continuation; the "why" is a performance reason, not a math fact.

### Snippet 18: linuxdoom-1.10/p_enemy.c:97-100 (terse section label)
```c
//
// ENEMY THINKING
// Enemies are allways spawned
// with targetplayer = -1, threshold = 0
// Most monsters are spawned unaware of all players,
// but some can be made preaware
//
```
*What this shows:* `//\n// SECTION\n//` divider used sparingly for major logical sections only — not for every function; the content is behavioral context that the reader cannot infer from the code below it (spawn state defaults); typo `allways` left in, no ceremony.

### Snippet 19: linuxdoom-1.10/p_enemy.c (inline branch comments)
```c
    if (sec->validcount == validcount
	&& sec->soundtraversed <= soundblocks+1)
    {
	return;		// already flooded
    }
    ...
	if (openrange <= 0)
	    continue;	// closed door
```
*What this shows:* One-word trailing comments on branches that would otherwise require re-reading the condition to understand — `// already flooded`, `// closed door`; no full sentence, no period; the comment captures the domain concept, not the boolean logic.

### Snippet 20: WinQuake/r_alias.c:33 (FIXME/TODO as first-class comments)
```c
void *			acolormap;	// FIXME: should go away

// TODO: these probably will go away with optimized rasterization
mdl_t				*pmdl;
```
*What this shows:* `FIXME` and `TODO` are real comments left in production code — Carmack does not scrub uncertainty; they mark debt with a reason, not just a flag; a single-line `FIXME: <why>` is preferred over a separate issue tracker entry.
