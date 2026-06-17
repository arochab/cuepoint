<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from './lib/supabase/client.js';
  import type { Route, Project, UserRecipeNote } from './lib/types/index.js';
  import { getFavorites, toggleFavorite, getNotes, saveNote, getProjects, getProjectRecipes, addRecipeToProject, isAdmin } from './lib/utils/db.js';
  import { toast } from './lib/utils/toast.svelte.js';
  import Nav from './lib/components/Nav.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Home from './lib/components/Home.svelte';
  import RecipeList from './lib/components/RecipeList.svelte';
  import RecipeDetail from './lib/components/RecipeDetail.svelte';
  import AudioAnalyzer from './lib/components/AudioAnalyzer.svelte';
  import Projects from './lib/components/Projects.svelte';
  import ProjectDetail from './lib/components/ProjectDetail.svelte';
  import Admin from './lib/components/Admin.svelte';

  let route = $state<Route>('home');
  let routeParam = $state<string | null>(null);
  let user = $state<{ id: string; email?: string } | null>(null);
  let userIsAdmin = $state(false);
  let favorites = $state<string[]>([]);
  let notes = $state<UserRecipeNote[]>([]);
  let projects = $state<Project[]>([]);
  let projectRecipeMap = $state<Record<string, string[]>>({});
  let loading = $state(true);

  let mounted = true;
  let loadGeneration = 0;

  function navigate(next: Route, param?: string) {
    route = next;
    routeParam = param ?? null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function clearUserData() {
    user = null;
    userIsAdmin = false;
    favorites = [];
    notes = [];
    projects = [];
    projectRecipeMap = {};
  }

  async function refreshUserData(userId: string, generation: number) {
    const [favs, savedNotes, userProjects, admin] = await Promise.all([
      getFavorites(userId),
      getNotes(userId),
      getProjects(userId),
      isAdmin(userId)
    ]);
    if (!mounted || generation !== loadGeneration) return;
    favorites = favs;
    notes = savedNotes;
    projects = userProjects;
    userIsAdmin = admin;

    const entries = await Promise.all(userProjects.map(async (project) => [project.id, await getProjectRecipes(project.id)] as const));
    if (!mounted || generation !== loadGeneration) return;
    projectRecipeMap = Object.fromEntries(entries);
  }

  async function handleToggleFav(recipeId: string) {
    if (!user) {
      // Explain the auth gate instead of silently teleporting home (which read as a crash).
      toast('Sign in to save favorites - they sync to your account.', 'error', 5000);
      return;
    }
    const isFav = favorites.includes(recipeId);
    try {
      await toggleFavorite(user.id, recipeId, isFav);
      favorites = isFav ? favorites.filter((id) => id !== recipeId) : [...favorites, recipeId];
    } catch (error) {
      console.error('Favorite toggle failed:', error);
      toast('Could not update favorites. Check your connection and try again.');
    }
  }

  async function handleSaveNote(recipeId: string, content: string) {
    if (!user) return;
    try {
      await saveNote(user.id, recipeId, content);
      notes = await getNotes(user.id);
      toast('Note saved.', 'success', 3000);
    } catch (error) {
      console.error('Note save failed:', error);
      toast('Note could not be saved. Check your connection.');
    }
  }

  async function handleAddToProject(projectId: string, recipeId: string) {
    try {
      await addRecipeToProject(projectId, recipeId);
      const existing = projectRecipeMap[projectId] ?? [];
      projectRecipeMap = {
        ...projectRecipeMap,
        [projectId]: existing.includes(recipeId) ? existing : [...existing, recipeId]
      };
      toast('Recipe added to project.', 'success', 3000);
    } catch (error) {
      console.error('Add to project failed:', error);
      toast('Could not add to project. Try again.');
    }
  }

  async function handleProjectsChanged() {
    if (!user) return;
    try {
      const generation = ++loadGeneration;
      const nextProjects = await getProjects(user.id);
      if (!mounted || generation !== loadGeneration) return;
      projects = nextProjects;
      const entries = await Promise.all(nextProjects.map(async (project) => [project.id, await getProjectRecipes(project.id)] as const));
      if (!mounted || generation !== loadGeneration) return;
      projectRecipeMap = Object.fromEntries(entries);
    } catch (error) {
      console.error('Projects refresh failed:', error);
      toast('Could not refresh projects. Check your connection.');
    }
  }

  async function handleProjectRecipesChanged(projectId: string) {
    try {
      projectRecipeMap = { ...projectRecipeMap, [projectId]: await getProjectRecipes(projectId) };
    } catch (error) {
      console.error('Project recipe refresh failed:', error);
      toast('Could not refresh project recipes.');
    }
  }

  async function signOut() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
      toast('Sign out failed. You have been logged out locally.');
    } finally {
      clearUserData();
      navigate('home');
    }
  }

  function getNoteContent(recipeId: string): string {
    return notes.find((note) => note.recipe_id === recipeId)?.content ?? '';
  }

  onMount(() => {
    mounted = true;
    const safetyTimeout = window.setTimeout(() => {
      if (mounted) loading = false;
    }, 3500);

    const boot = async () => {
      const generation = ++loadGeneration;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted || generation !== loadGeneration) return;
        if (session?.user) {
          user = { id: session.user.id, email: session.user.email };
          await refreshUserData(session.user.id, generation);
        } else {
          clearUserData();
        }
      } catch (error) {
        console.error('Initial session fetch failed:', error);
        clearUserData();
      } finally {
        if (mounted) loading = false;
        clearTimeout(safetyTimeout);
      }
    };

    boot();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const generation = ++loadGeneration;
      try {
        if (session?.user) {
          user = { id: session.user.id, email: session.user.email };
          await refreshUserData(session.user.id, generation);
        } else {
          clearUserData();
          if (route !== 'home') navigate('home');
        }
      } catch (error) {
        console.error('Auth state change failed:', error);
      } finally {
        if (mounted) loading = false;
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  });
</script>

<Toast />
<div class="page-shell">
  {#if loading}
    <div class="page-container" style="display:grid; place-items:center; min-height:100dvh;">
      <div class="surface-strong" style="display:inline-flex; align-items:center; gap:.75rem; padding:1rem 1.1rem; border-radius:var(--radius-lg);">
        <div class="spinner"></div>
        <span class="small-note" style="font-size:.86rem; color:var(--color-text-secondary);">Opening workspace…</span>
      </div>
    </div>
  {:else}
    <Nav {route} {user} isAdmin={userIsAdmin} onNavigate={navigate} onSignOut={signOut} />

    <main class="flex-1" style="padding-top: 92px; padding-bottom: 24px;">
      {#if route === 'home'}
        <Home {user} {projects} onNavigate={navigate} />
      {:else if route === 'recipes'}
        <RecipeList {favorites} onOpenRecipe={(id) => navigate('recipe-detail', id)} onToggleFav={handleToggleFav} />
      {:else if route === 'recipe-detail' && routeParam}
        <RecipeDetail
          recipeId={routeParam}
          isFav={favorites.includes(routeParam)}
          note={getNoteContent(routeParam)}
          {projects}
          {projectRecipeMap}
          {user}
          onBack={() => navigate('recipes')}
          onNavigate={navigate}
          onToggleFav={() => handleToggleFav(routeParam!)}
          onSaveNote={(content) => handleSaveNote(routeParam!, content)}
          onAddToProject={(projectId) => handleAddToProject(projectId, routeParam!)}
        />
      {:else if route === 'analyzer'}
        <!-- Pass user + projects so the analyzer can save snapshots; onNavigate lets the empty state route to project creation -->
        <AudioAnalyzer onOpenRecipe={(id) => navigate('recipe-detail', id)} onNavigate={navigate} {user} {projects} />
      {:else if route === 'projects'}
        <Projects {user} {projects} onNavigate={navigate} onProjectsChanged={handleProjectsChanged} />
      {:else if route === 'project-detail' && routeParam}
        <ProjectDetail
          projectId={routeParam}
          {projects}
          {projectRecipeMap}
          onBack={() => navigate('projects')}
          onProjectsChanged={handleProjectsChanged}
          onRecipesChanged={() => handleProjectRecipesChanged(routeParam!)}
          onOpenRecipe={(id) => navigate('recipe-detail', id)}
          user={user}
        />
      {:else if route === 'admin'}
        <!-- Client guard (defense in depth - RLS + RPCs are the real gate). -->
        {#if userIsAdmin}
          <Admin />
        {:else}
          <section class="page-container" style="padding-top:2rem;"><p class="scene-copy">Not authorized.</p></section>
        {/if}
      {/if}
    </main>

    <footer class="page-container" style="padding-bottom: 20px; display:flex; justify-content:space-between; gap:1rem; color: var(--color-text-muted); font: 500 10px/1 var(--font-mono); text-transform: uppercase; letter-spacing: .14em;">
      <span>CuePoint · recipes · analyzer · project memory</span>
      <span>Built for producers, teachers, mix engineers, and review loops.</span>
    </footer>
  {/if}
</div>
