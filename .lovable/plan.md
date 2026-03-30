

## Plan: Forbedring af sidebar

### Problemer identificeret
1. **Logoet er for småt** — `h-8` er for lille, skal være markant større
2. **Teksten er ikke hvid** — nav-links bruger `text-sidebar-foreground/55` (grålig), skal være hvid
3. **Profilbillede mangler** — Bunden viser kun et initial-bogstav, ikke brugerens `avatar_url`

### Ændringer

**Fil: `src/components/AppSidebar.tsx`**

1. **Logo-sektion**: Gør logoet større (`h-12` eller `h-14`) og giv det mere padding/margin. Fjern den lille "KLS" tekst eller gør den pænere.

2. **Nav-link farver**: Ændr inaktive links fra `text-sidebar-foreground/55` til `text-white/70` og aktive links til `text-white`. Sektionslabels fra `text-sidebar-foreground/25` til `text-white/30`.

3. **Profilbillede i bunden**: Tilføj `avatar_url` til `AppSidebarProps`-profilen. Vis brugerens profilbillede (fra `avatar_url`) som et rundt billede i stedet for det nuværende initial-bogstav-fallback. Behold fallback med initial hvis intet billede findes.

**Fil: `src/components/AppLayout.tsx`**

4. Udvid `profile`-data til at inkludere `avatar_url` fra `useAuth` (eller fetch det separat).

**Fil: `src/hooks/useAuth.tsx`**

5. Tilføj `avatar_url` til profil-fetchet så det er tilgængeligt i hele systemet.

### Resultat
- Større, mere synligt logo
- Hvid tekst i hele sidebaren
- Profilbillede synligt i bunden af sidebaren

