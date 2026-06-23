<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from './lib/supabase/client.js';
  import type { Route, Project, UserRecipeNote } from './lib/types/index.js';
  import { getFavorites, toggleFavorite, getNotes, saveNote, getProjects, getProjectRecipes, addRecipeToProject, isAdmin } from './lib/utils/db.js';
  import { toast } from './lib/utils/toast.svelte.js';
  import Nav from './lib/components/Nav.svelte';
  import Toast from './lib/components/Toast.svelte';
  import Home from './lib/components/Home.svelte';
  // RecipeList/RecipeCard deleted by the UX jury — the standalone library is gone.
  // RecipeDetail survives, reached from a verdict (Path A) or a cold need-question (Path B).
  import RecipeDetail from './lib/components/RecipeDetail.svelte';
  import AudioAnalyzer from './lib/components/AudioAnalyzer.svelte';
  import Projects from './lib/components/Projects.svelte';
  import ProjectDetail from './lib/components/ProjectDetail.svelte';
  import Admin from './lib/components/Admin.svelte';

  let route = $state<Route>('home');
  let routeParam = $state<string | null>(null);
  // Recipe-detail is now reached from several places (verdict, cold question, projects);
  // remember where we came from so "← Back" returns there instead of a deleted library.
  let previousRoute = $state<Route>('analyzer');
  // Home and the analyzer are conceptually one screen: a drop on Home hands the file here,
  // we route to the analyzer, and it picks the file up on mount.
  let pendingFile = $state<File | null>(null);

  function startAnalysis(f: File) {
    pendingFile = f;
    navigate('analyzer');
  }
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
    // Track the origin of a recipe-detail open so Back can return to it.
    if (next === 'recipe-detail' && route !== 'recipe-detail') previousRoute = route;
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
    <div style="display:grid; place-items:center; min-height:100dvh;">
      <div class="spinner"></div>
    </div>
  {:else}
    <Nav {route} {user} isAdmin={userIsAdmin} onNavigate={navigate} onSignOut={signOut} />

    <main class="flex-1" style="padding-top: 64px;">
      {#if route === 'home'}
        <Home {user} {projects} onNavigate={navigate} onFile={startAnalysis} />
      {:else if route === 'recipe-detail' && routeParam}
        <RecipeDetail
          recipeId={routeParam}
          isFav={favorites.includes(routeParam)}
          note={getNoteContent(routeParam)}
          {projects}
          {projectRecipeMap}
          {user}
          onBack={() => navigate(previousRoute)}
          onNavigate={navigate}
          onToggleFav={() => handleToggleFav(routeParam!)}
          onSaveNote={(content) => handleSaveNote(routeParam!, content)}
          onAddToProject={(projectId) => handleAddToProject(projectId, routeParam!)}
        />
      {:else if route === 'analyzer'}
        <!-- pendingFile: a file dropped on Home is analyzed immediately on mount. -->
        <AudioAnalyzer onOpenRecipe={(id) => navigate('recipe-detail', id)} onNavigate={navigate} {user} {projects} {pendingFile} onConsumedFile={() => pendingFile = null} />
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

    <footer class="page-container" style="padding: 28px 0 20px; position:relative; z-index:2; color: var(--color-text-muted); font: 400 11px/1 var(--font-mono); letter-spacing: .12em;">
      <span>cuepoint</span>
    </footer>
  {/if}
</div>
