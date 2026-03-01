<script lang="ts">
	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';
	import ExerciseSearch from '$lib/components/ExerciseSearch.svelte';
	
	let { data } = $props();
	
	const today = new Date().toISOString().split('T')[0];
	const weightUnit = $derived(() => (data as any).unitSystem === 'imperial' ? 'lbs' : 'kg');
	
	// Modal states
	let showStartModal = $state(false);
	let showTemplateModal = $state(false);
	let showExerciseModal = $state(false);
	let showFinishModal = $state(false);
	let showPRModal = $state(false);
	let showWorkoutDetailModal = $state(false);
	let showCreateExercise = $state(false);
	let createExName = $state('');
	let createExCategory = $state('other');
	let createExEquipment = $state('other');
	let createRestWarmup = $state(60);
	let createRestWorking = $state(120);
	let createRestDropset = $state(30);
	let createRestFailure = $state(180);
	let selectedWorkout = $state<typeof data.recentWorkouts[0] | null>(null);
	
	// Workout state
	let selectedTemplateId = $state<number | null>(null);
	let selectedExerciseId = $state<number | null>(null);
	let currentExercise = $state<typeof data.allExercises[0] | null>(null);
	let templateExercises = $state<Array<{
		id: number;
		name: string;
		category: string | null;
		equipment: string | null;
		targetSets: number | null;
		targetRepsMin: number | null;
		targetRepsMax: number | null;
		sortOrder: number | null;
	}>>([]);
	let newPRs = $state<Array<{
		exerciseId: number;
		exerciseName: string;
		recordType: string;
		value: number;
		weight?: number;
		reps?: number;
	}>>([]);
	
	// Set entry state
	let newWeight = $state<number | null>(null);
	let newReps = $state<number | null>(null);
	// rpe removed
	let newSetType = $state<string>('working');
	
	// Rest timer
	let editingSetId: number | null = $state(null);

	// Workout summary stats (for finish modal)
	const workoutTotalVolume = $derived(
		data.activeWorkout?.sets
			.filter((s) => s.isCompleted)
			.reduce((sum, set) => sum + (set.weight ?? 0) * (set.reps ?? 0), 0) ?? 0
	);
	const workoutUniqueExercises = $derived(
		data.activeWorkout ? new Set(data.activeWorkout.sets.filter((s) => s.isCompleted).map((s) => s.exerciseId)).size : 0
	);
	const workoutElapsedMin = $derived(
		data.activeWorkout?.startedAt
			? Math.round((Date.now() - new Date(data.activeWorkout.startedAt).getTime()) / 60000)
			: null
	);

	// Elapsed workout timer
	let elapsedSeconds = $state(0);
	let elapsedInterval: ReturnType<typeof setInterval> | null = null;
	const elapsedTime = $derived(() => {
		const h = Math.floor(elapsedSeconds / 3600);
		const m = Math.floor((elapsedSeconds % 3600) / 60);
		const s = elapsedSeconds % 60;
		return h > 0
			? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
			: `${m}:${String(s).padStart(2, '0')}`;
	});

	$effect(() => {
		if (data.activeWorkout?.startedAt) {
			const update = () => {
				elapsedSeconds = Math.floor((Date.now() - new Date(data.activeWorkout!.startedAt).getTime()) / 1000);
			};
			update();
			elapsedInterval = setInterval(update, 1000);
			return () => { if (elapsedInterval) clearInterval(elapsedInterval); };
		} else {
			elapsedSeconds = 0;
			if (elapsedInterval) { clearInterval(elapsedInterval); elapsedInterval = null; }
		}
	});

	let restSeconds = $state(0);
	let restTarget = $state(120);
	let restTimerActive = $state(false);
	let restInterval: ReturnType<typeof setInterval> | null = null;
	
	function prefillCreateExerciseFromCatalog(entry: any) {
		showCreateExercise = true;
		createExName = entry.name;
		createExCategory = entry.category ?? 'other';
		createExEquipment = entry.equipment ?? 'other';
	}
	
	// Group COMPLETED sets by exercise for the active workout
	const exercisesInWorkout = $derived(() => {
		if (!data.activeWorkout) return [];

		const grouped = new Map<
			number,
			{
				exercise: typeof data.allExercises[0];
				sets: typeof data.activeWorkout.sets;
			}
		>();

		for (const set of data.activeWorkout.sets.filter((s) => s.isCompleted)) {
			if (!grouped.has(set.exerciseId)) {
				grouped.set(set.exerciseId, {
					exercise: set.exercise,
					sets: []
				});
			}
			grouped.get(set.exerciseId)!.sets.push(set);
		}

		return Array.from(grouped.values());
	});
	
	// Weekly view data
	const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
	const weekWorkoutMap = $derived(() => {
		const map = new Map<number, typeof data.thisWeekWorkouts[0]>();
		for (const w of data.thisWeekWorkouts) {
			const d = new Date(w.date);
			const dayOfWeek = (d.getDay() + 6) % 7; // Monday = 0
			map.set(dayOfWeek, w);
		}
		return map;
	});
	
	// Rest timer functions
	function startRestTimer(seconds: number) {
		restTarget = seconds;
		restSeconds = 0;
		restTimerActive = true;
		
		if (restInterval) clearInterval(restInterval);
		restInterval = setInterval(() => {
			restSeconds++;
			if (restSeconds >= restTarget) {
				// Could add vibration/sound here
			}
		}, 1000);
	}
	
	function stopRestTimer() {
		restTimerActive = false;
		if (restInterval) {
			clearInterval(restInterval);
			restInterval = null;
		}
	}
	
	function formatTime(seconds: number): string {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}:${secs.toString().padStart(2, '0')}`;
	}
	
	function formatDuration(seconds: number): string {
		const hours = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		if (hours > 0) return `${hours}h ${mins}m`;
		return `${mins}m`;
	}
	
	function getRestTime(exercise: typeof data.allExercises[0] | null, setType: string): number {
		if (!exercise) return 120;
		switch (setType) {
			case 'warmup': return exercise.restWarmup ?? 60;
			case 'working': return exercise.restWorking ?? 120;
			case 'dropset': return exercise.restDropset ?? 30;
			case 'failure': return exercise.restFailure ?? 180;
			default: return 120;
		}
	}
	
	function selectExercise(exercise: typeof data.allExercises[0]) {
		currentExercise = exercise;
		selectedExerciseId = exercise.id;
		showExerciseModal = false;
		// Reset set entry
		newWeight = null;
		newReps = null;
		// rpe removed
		newSetType = 'working';
	}
	
	// Cleanup on destroy
	onDestroy(() => {
		if (restInterval) clearInterval(restInterval);
	});
</script>

<div class="space-y-6 pb-4">
	<header class="flex items-center justify-between">
		<h1 class="text-2xl font-bold">💪 Training</h1>
		<div class="flex items-center gap-3">
			<div class="flex items-center gap-3">
				<a href="/training/history" class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">📋 History</a>
				<a href="/training/trends" class="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">📈 Trends</a>
			</div>
			<time class="text-[var(--color-text-muted)] text-sm">{today}</time>
		</div>
	</header>

	{#if data.activeWorkout}
		<!-- ACTIVE WORKOUT VIEW -->
		<div class="card bg-gradient-to-r from-[var(--color-primary)]/20 to-transparent border border-[var(--color-primary)]/30">
			<div class="flex items-center justify-between mb-2">
				<h2 class="text-lg font-bold">{data.activeWorkout.name}</h2>
				<div class="text-right">
					<div class="text-lg font-mono font-bold text-[var(--color-primary)]">{elapsedTime()}</div>
					<span class="text-xs text-[var(--color-text-muted)]">
						from {new Date(data.activeWorkout.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
					</span>
				</div>
			</div>
			<div class="flex gap-4">
				<button 
					onclick={() => showFinishModal = true}
					class="btn btn-primary text-sm"
				>
					Finish Workout
				</button>
				<form method="POST" action="?/cancelWorkout" use:enhance>
					<input type="hidden" name="workoutId" value={data.activeWorkout.id} />
					<button 
						type="submit" 
						class="btn btn-secondary text-sm"
						onclick={(e) => {
							if (!confirm('Cancel this workout? All logged sets will be deleted.')) {
								e.preventDefault();
							}
						}}
					>
						Cancel
					</button>
				</form>
			</div>
		</div>
		
		<!-- Rest Timer (if active) -->
		{#if restTimerActive}
			<div class="card text-center {restSeconds >= restTarget ? 'bg-green-500/20 border border-green-500/50' : ''}">
				<div class="text-4xl font-mono font-bold mb-2">
					{formatTime(restSeconds)}
				</div>
				<div class="text-sm text-[var(--color-text-muted)] mb-3">
					{restSeconds >= restTarget ? '✅ Rest complete!' : `Target: ${formatTime(restTarget)}`}
				</div>
				<button onclick={stopRestTimer} class="btn btn-secondary text-sm">
					{restSeconds >= restTarget ? 'Dismiss' : 'Skip'}
				</button>
			</div>
		{/if}
		
		<!-- Logged Exercises -->
		<section class="space-y-4">
			{#each exercisesInWorkout() as { exercise, sets }}
				<div class="card">
					<h3 class="font-semibold mb-3">{exercise.name}</h3>
					<div class="space-y-2">
						{#each sets as set, i}
							{@const isEditing = editingSetId === set.id}
							<div class="flex items-center gap-3 text-sm py-2 border-b border-[var(--color-surface-hover)] last:border-0">
								<span class="w-8 text-[var(--color-text-muted)]">#{i + 1}</span>
								<span class="px-2 py-0.5 rounded text-xs bg-[var(--color-bg)]">
									{set.setType}
								</span>
								{#if isEditing}
									<form method="POST" action="?/updateSet" use:enhance={() => { return async ({ update }) => { editingSetId = null; await update(); }; }} class="flex-1 flex items-center gap-2">
										<input type="hidden" name="setId" value={set.id} />
										<input type="number" name="weight" value={set.weight ?? ''} step="0.5" placeholder={weightUnit()} class="w-16 px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-surface-hover)] text-sm" />
										<span>×</span>
										<input type="number" name="reps" value={set.reps ?? ''} placeholder="reps" class="w-14 px-2 py-1 rounded bg-[var(--color-bg)] border border-[var(--color-surface-hover)] text-sm" />
										<!-- RPE removed -->
										<button type="submit" class="text-green-400 hover:text-green-300 text-lg">✓</button>
										<button type="button" onclick={() => editingSetId = null} class="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">✕</button>
									</form>
								{:else}
									<button type="button" onclick={() => editingSetId = set.id} class="flex-1 text-left hover:text-[var(--color-primary)] transition-colors" title="Tap to edit">
										{set.weight ?? '—'} {weightUnit()} × {set.reps ?? '—'}
										<!-- RPE removed -->
									</button>
								{/if}
								<form method="POST" action="?/deleteSet" use:enhance>
									<input type="hidden" name="setId" value={set.id} />
									<button type="submit" class="text-red-400 hover:text-red-300">×</button>
								</form>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</section>
		
		<!-- Template Exercise Checklist (if started from template) -->
		{#if templateExercises.length > 0}
			<div class="card">
				<h3 class="font-semibold mb-3">Template Guide</h3>
				<div class="space-y-2">
					{#each templateExercises as te}
						{@const completed = exercisesInWorkout().some(e => e.exercise.id === te.id)}
						<button
							onclick={() => {
								const ex = data.allExercises.find(e => e.id === te.id);
								if (ex) selectExercise(ex);
							}}
							class="w-full text-left p-2 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors {completed ? 'opacity-60' : ''}"
						>
							<div class="flex items-center gap-2">
								<span class="text-lg">{completed ? '✅' : '⭕'}</span>
								<div class="flex-1">
									<div class="font-medium text-sm">{te.name}</div>
									<div class="text-xs text-[var(--color-text-muted)]">
										{te.targetSets} × {te.targetRepsMin}-{te.targetRepsMax}
									</div>
								</div>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Add Set Section -->
		<div class="card">
			<h3 class="font-semibold mb-3">Log Set</h3>
			
			{#if currentExercise}
				<div class="mb-4">
					<div class="flex items-center justify-between p-2 bg-[var(--color-bg)] rounded-lg">
						<span class="font-medium">{currentExercise.name}</span>
						<button 
							onclick={() => showExerciseModal = true}
							class="text-[var(--color-primary)] text-sm"
						>
							Change
						</button>
					</div>
					
					<!-- Show previous performance if available -->
					{#if data.previousPerformance && data.previousPerformance[currentExercise.id]}
						{@const prev = data.previousPerformance[currentExercise.id]}
						<div class="mt-2 p-2 bg-[var(--color-bg)]/50 rounded-lg text-sm">
							<div class="text-[var(--color-text-muted)] mb-1">Last time:</div>
							<div class="flex flex-wrap gap-2">
								{#each prev as set}
									<span class="text-xs px-2 py-1 bg-[var(--color-surface)] rounded">
										{set.weight ?? '—'}{weightUnit()} × {set.reps ?? '—'}
									</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{:else}
				<button 
					onclick={() => showExerciseModal = true}
					class="w-full p-3 border-2 border-dashed border-[var(--color-surface-hover)] rounded-lg text-[var(--color-text-muted)] hover:border-[var(--color-primary)] transition-colors mb-4"
				>
					Select Exercise
				</button>
			{/if}
			
			{#if currentExercise}
				<form 
					method="POST" 
					action="?/addSet"
					use:enhance={() => {
						return async ({ update }) => {
							await update();
							// Start rest timer after logging set
							const restTime = getRestTime(currentExercise, newSetType);
							startRestTimer(restTime);
						};
					}}
					class="space-y-4"
				>
					<input type="hidden" name="workoutId" value={data.activeWorkout.id} />
					<input type="hidden" name="exerciseId" value={currentExercise.id} />
					
					<!-- Set type selector -->
					<div class="flex gap-2">
						{#each ['warmup', 'working', 'dropset', 'failure'] as type}
							<button
								type="button"
								onclick={() => newSetType = type}
								class="px-3 py-1 rounded-full text-sm transition-colors {newSetType === type 
									? 'bg-[var(--color-primary)] text-white' 
									: 'bg-[var(--color-bg)] text-[var(--color-text-muted)]'}"
							>
								{type}
							</button>
						{/each}
					</div>
					<input type="hidden" name="setType" value={newSetType} />
					
					<!-- Weight/Reps inputs -->
					<div class="grid grid-cols-2 gap-3">
						<div>
							<label for="set-weight" class="block text-xs text-[var(--color-text-muted)] mb-1">Weight ({weightUnit()})</label>
							<input 
								id="set-weight"
								type="number" 
								name="weight"
								bind:value={newWeight}
								step="0.5"
								min="0"
								class="input text-center"
								placeholder="—"
							/>
						</div>
						<div>
							<label for="set-reps" class="block text-xs text-[var(--color-text-muted)] mb-1">Reps</label>
							<input 
								id="set-reps"
								type="number" 
								name="reps"
								bind:value={newReps}
								min="0"
								class="input text-center"
								placeholder="—"
							/>
						</div>
						<!-- RPE input removed -->
					</div>
					
					<!-- Set number (auto-increment; completed sets only) -->
					<input
						type="hidden"
						name="setNumber"
						value={(data.activeWorkout?.sets.filter((s) => s.exerciseId === currentExercise?.id && s.isCompleted).length ?? 0) + 1}
					/>
					
					<button type="submit" class="btn btn-primary w-full">
						Log Set #{(data.activeWorkout?.sets.filter((s) => s.exerciseId === currentExercise?.id && s.isCompleted).length ?? 0) + 1}
					</button>
				</form>
			{/if}
		</div>

	{:else}
		<!-- NO ACTIVE WORKOUT VIEW -->
		
		<!-- Quick actions -->
		<div class="grid grid-cols-2 gap-4">
			<button 
				onclick={() => showStartModal = true}
				class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left"
			>
				<div class="text-2xl mb-2">▶️</div>
				<div class="font-semibold">Start Workout</div>
				<div class="text-sm text-[var(--color-text-muted)]">Begin a new session</div>
			</button>

			<button 
				onclick={() => showTemplateModal = true}
				class="card hover:bg-[var(--color-surface-hover)] transition-colors text-left"
			>
				<div class="text-2xl mb-2">📋</div>
				<div class="font-semibold">Templates</div>
				<div class="text-sm text-[var(--color-text-muted)]">{data.templates.length} splits</div>
			</button>
		</div>

		<!-- This Week -->
		<section class="card">
			<h2 class="text-lg font-semibold mb-3">This Week</h2>
			<div class="grid grid-cols-7 gap-1 text-center">
				{#each weekDays as day, i}
					{@const workout = weekWorkoutMap().get(i)}
					<div class="space-y-1">
						<div class="text-xs text-[var(--color-text-muted)]">{day}</div>
						<div class="w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs
							{workout ? 'bg-[var(--color-primary)] text-white' : 'bg-[var(--color-bg)]'}">
							{workout ? '✓' : '—'}
						</div>
					</div>
				{/each}
			</div>
		</section>

		<!-- Weekly Volume by Category -->
		{#if Object.keys(data.weeklyVolumeByCategory).length > 0}
			{@const cats = Object.entries(data.weeklyVolumeByCategory).sort((a, b) => b[1] - a[1])}
			{@const maxSets = Math.max(...cats.map(c => c[1]))}
			<section class="card">
				<h2 class="text-lg font-semibold mb-3">📊 Weekly Sets by Category</h2>
				<div class="space-y-2">
					{#each cats as [cat, sets]}
						<div class="flex items-center gap-3">
							<span class="w-20 text-sm capitalize">{cat}</span>
							<div class="flex-1 h-4 bg-[var(--color-bg)] rounded-full overflow-hidden">
								<div class="h-full bg-[var(--color-primary)] rounded-full transition-all" style="width: {(sets / maxSets) * 100}%"></div>
							</div>
							<span class="text-sm font-medium w-8 text-right">{sets}</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Personal Records -->
		{#if data.personalRecords.length > 0}
			<section class="card">
				<h2 class="text-lg font-semibold mb-3">🏆 Personal Records</h2>
				<div class="space-y-2 max-h-40 overflow-y-auto">
					{#each data.personalRecords.slice(0, 8) as pr}
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">{pr.exercise.name}</span>
							<span class="text-[var(--color-primary)] font-bold">
								{pr.recordType === '1rm' ? `${pr.value.toFixed(1)} ${weightUnit()} (est. 1RM)` : `${pr.value}`}
							</span>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Recent workouts -->
		<section class="space-y-4">
			<h2 class="text-lg font-semibold">Recent Workouts</h2>

			{#if data.recentWorkouts.length > 0}
				<div class="space-y-2">
					{#each data.recentWorkouts as workout}
						<button type="button" onclick={() => { selectedWorkout = workout; showWorkoutDetailModal = true; }} class="card w-full text-left hover:bg-[var(--color-surface-hover)] transition-colors cursor-pointer">
							<div class="flex items-center justify-between">
								<div>
									<div class="font-semibold">{workout.name}</div>
									<div class="text-sm text-[var(--color-text-muted)]">
										{new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
										{#if workout.durationSeconds}
											• {formatDuration(workout.durationSeconds)}
										{/if}
									</div>
								</div>
								{#if workout.rating}
									<div class="text-lg">
										{'⭐'.repeat(workout.rating)}
									</div>
								{/if}
							</div>
							{#if workout.sets.length > 0}
								<div class="mt-2 text-sm text-[var(--color-text-muted)]">
									{workout.sets.length} sets • 
									{[...new Set(workout.sets.map(s => s.exercise.name))].slice(0, 3).join(', ')}
									{[...new Set(workout.sets.map(s => s.exercise.name))].length > 3 ? '...' : ''}
								</div>
							{/if}
						</button>
					{/each}
				</div>
			{:else}
				<div class="card text-center text-[var(--color-text-muted)] py-8">
					<p class="text-4xl mb-2">🏋️</p>
					<p>No workouts yet</p>
					<p class="text-sm mt-1">Start your first workout to track progress</p>
				</div>
			{/if}
		</section>
	{/if}
</div>

<!-- Start Workout Modal -->
{#if showStartModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Start Workout</h3>
				<button onclick={() => showStartModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 space-y-4 overflow-y-auto">
				{#if data.templates.length > 0}
					<div>
						<h4 class="text-sm font-medium text-[var(--color-text-muted)] mb-2">From Template</h4>
						<div class="space-y-2">
							{#each data.templates as template}
								<form method="POST" action="?/startWorkout" use:enhance={() => {
									return async ({ result, update }) => {
										await update();
										showStartModal = false;
										
										// If template exercises were returned, auto-load them
										if (result.type === 'success' && (result.data as any)?.templateExercises) {
											templateExercises = (result.data as any).templateExercises;
											// Auto-select first exercise
											if (templateExercises.length > 0) {
												const firstEx = data.allExercises.find(e => e.id === templateExercises[0].id);
												if (firstEx) {
													selectExercise(firstEx);
												}
											}
										}
									};
								}}>
									<input type="hidden" name="templateId" value={template.id} />
									<button 
										type="submit"
										class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors"
									>
										<div class="font-medium">{template.name}</div>
										{#if template.exercises.length > 0}
											<div class="text-sm text-[var(--color-text-muted)]">
												{template.exercises.length} exercises
											</div>
										{/if}
									</button>
								</form>
							{/each}
						</div>
					</div>
				{/if}
				
				<div>
					<h4 class="text-sm font-medium text-[var(--color-text-muted)] mb-2">Empty Workout</h4>
					<form method="POST" action="?/startWorkout" use:enhance={() => {
						return async ({ update }) => {
							await update();
							showStartModal = false;
						};
					}}>
						<input type="hidden" name="name" value="Workout" />
						<button 
							type="submit"
							class="w-full text-left p-3 rounded-lg bg-[var(--color-bg)] hover:bg-[var(--color-surface-hover)] transition-colors"
						>
							<div class="font-medium">Start Empty</div>
							<div class="text-sm text-[var(--color-text-muted)]">Add exercises as you go</div>
						</button>
					</form>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Exercise Picker Modal -->
{#if showExerciseModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Select Exercise</h3>
				<button onclick={() => showExerciseModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="flex-1 overflow-y-auto p-4">
				<ExerciseSearch
					exercises={data.allExercises}
					catalogEntries={((data as any).exerciseCatalogEntries ?? [])}
					historyHrefForExerciseId={(id: number) => `/training/exercise/${id}`}
					on:selectExercise={(e) => selectExercise(e.detail as any)}
					on:prefillFromCatalog={(e) => prefillCreateExerciseFromCatalog(e.detail)}
					on:createCustomRequested={() => (showCreateExercise = true)}
				/>

				<!-- Create custom exercise -->
				{#if showCreateExercise}
					<form
						method="POST"
						action="?/createExercise"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
								showCreateExercise = false;
								createExName = '';
								createExCategory = 'other';
								createExEquipment = 'other';
								createRestWarmup = 60;
								createRestWorking = 120;
								createRestDropset = 30;
								createRestFailure = 180;
							};
						}}
						class="mt-3 p-3 rounded-lg bg-[var(--color-bg)] space-y-2"
					>
						<div>
							<input type="text" name="name" bind:value={createExName} class="input text-sm" placeholder="Exercise name" required />
						</div>
						<div class="grid grid-cols-2 gap-2">
							<select name="category" bind:value={createExCategory} class="input text-sm">
								<option value="chest">Chest</option>
								<option value="back">Back</option>
								<option value="shoulders">Shoulders</option>
								<option value="arms">Arms</option>
								<option value="legs">Legs</option>
								<option value="core">Core</option>
								<option value="cardio">Cardio</option>
								<option value="other">Other</option>
							</select>
							<select name="equipment" bind:value={createExEquipment} class="input text-sm">
								<option value="barbell">Barbell</option>
								<option value="dumbbell">Dumbbell</option>
								<option value="cable">Cable</option>
								<option value="machine">Machine</option>
								<option value="bodyweight">Bodyweight</option>
								<option value="other">Other</option>
							</select>
						</div>
						<div>
							<div class="text-xs text-[var(--color-text-muted)] mb-2">⏱️ Rest timers (seconds)</div>
							<div class="grid grid-cols-2 gap-2">
								<label class="text-xs text-[var(--color-text-muted)]">
									Warmup
									<input type="number" name="restWarmup" bind:value={createRestWarmup} min="0" step="5" class="input text-sm mt-1" />
								</label>
								<label class="text-xs text-[var(--color-text-muted)]">
									Working
									<input type="number" name="restWorking" bind:value={createRestWorking} min="0" step="5" class="input text-sm mt-1" />
								</label>
								<label class="text-xs text-[var(--color-text-muted)]">
									Dropset
									<input type="number" name="restDropset" bind:value={createRestDropset} min="0" step="5" class="input text-sm mt-1" />
								</label>
								<label class="text-xs text-[var(--color-text-muted)]">
									Failure
									<input type="number" name="restFailure" bind:value={createRestFailure} min="0" step="5" class="input text-sm mt-1" />
								</label>
							</div>
						</div>
						<div class="flex gap-2">
							<button type="submit" class="btn btn-primary flex-1 text-sm">Add</button>
							<button type="button" onclick={() => showCreateExercise = false} class="btn btn-secondary flex-1 text-sm">Cancel</button>
						</div>
					</form>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- Finish Workout Modal -->
{#if showFinishModal && data.activeWorkout}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Finish Workout</h3>
				<button onclick={() => showFinishModal = false} class="text-2xl">×</button>
			</div>
			
			<form 
				method="POST" 
				action="?/finishWorkout"
				use:enhance={() => {
					return async ({ result, update }) => {
						await update();
						showFinishModal = false;
						stopRestTimer();
						
						// Check for new PRs
						if (result.type === 'success' && result.data && 'newPRs' in result.data) {
							const prs = result.data.newPRs as typeof newPRs;
							if (prs && Array.isArray(prs) && prs.length > 0) {
								newPRs = prs;
								showPRModal = true;
							}
						}
					};
				}}
				class="p-4 space-y-4"
			>
				<input type="hidden" name="workoutId" value={data.activeWorkout.id} />
				
				<div class="text-center py-4">
					<div class="text-4xl mb-2">💪</div>
					<div class="text-lg font-semibold">Great workout!</div>
					<div class="grid grid-cols-3 gap-3 mt-3">
						<div>
							<div class="text-xl font-bold">{data.activeWorkout?.sets.length ?? 0}</div>
							<div class="text-xs text-[var(--color-text-muted)]">Sets</div>
						</div>
						<div>
							<div class="text-xl font-bold">{workoutUniqueExercises}</div>
							<div class="text-xs text-[var(--color-text-muted)]">Exercises</div>
						</div>
						<div>
								<div class="text-xl font-bold">{workoutElapsedMin ? `${workoutElapsedMin}m` : '—'}</div>
							<div class="text-xs text-[var(--color-text-muted)]">Duration</div>
						</div>
					</div>
					{#if workoutTotalVolume > 0}
						<div class="mt-2 text-sm text-[var(--color-text-muted)]">
							Total volume: {workoutTotalVolume.toLocaleString()} {weightUnit()}
						</div>
					{/if}
				</div>
				
				<div>
					<div class="block text-sm mb-2">How was it? (optional)</div>
					<div class="flex justify-center gap-2" role="group" aria-label="Workout rating">
						{#each [1, 2, 3, 4, 5] as star}
							<button
								type="button"
								class="text-2xl opacity-30 hover:opacity-100 transition-opacity"
								onclick={(e) => {
									const form = e.currentTarget.closest('form');
									const input = form?.querySelector('input[name="rating"]') as HTMLInputElement;
									if (input) input.value = String(star);
									// Update visual
									const buttons = form?.querySelectorAll('button[type="button"]');
									buttons?.forEach((btn, i) => {
										(btn as HTMLElement).style.opacity = i < star ? '1' : '0.3';
									});
								}}
							>
								⭐
							</button>
						{/each}
					</div>
					<input type="hidden" name="rating" value="" />
				</div>
				
				<div>
					<label for="finish-notes" class="block text-sm mb-2">Notes (optional)</label>
					<textarea id="finish-notes" name="notes" class="input h-20 resize-none" placeholder="How did it feel?"></textarea>
				</div>
				
				<button type="submit" class="btn btn-primary w-full">
					Complete Workout
				</button>
			</form>
		</div>
	</div>
{/if}

<!-- Template Manager Modal -->
{#if showTemplateModal}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">Workout Templates</h3>
				<button onclick={() => showTemplateModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="flex-1 overflow-y-auto p-4 space-y-4">
				{#each data.templates as template}
					<div class="card">
						<div class="flex items-center justify-between mb-2">
							<h4 class="font-semibold">{template.name}</h4>
							<form method="POST" action="?/deleteTemplate" use:enhance>
								<input type="hidden" name="templateId" value={template.id} />
								<button 
									type="submit" 
									class="text-red-400 hover:text-red-300 text-sm"
									onclick={(e) => {
										if (!confirm('Delete this template?')) e.preventDefault();
									}}
								>
									Delete
								</button>
							</form>
						</div>
						{#if template.exercises.length > 0}
							<ul class="text-sm text-[var(--color-text-muted)] space-y-1">
								{#each template.exercises as te}
									<li>• {te.exercise.name} ({te.targetSets} × {te.targetRepsMin}-{te.targetRepsMax})</li>
								{/each}
							</ul>
						{:else}
							<p class="text-sm text-[var(--color-text-muted)]">No exercises added</p>
						{/if}
					</div>
				{/each}
				
				<form 
					method="POST" 
					action="?/createTemplate"
					use:enhance
					class="card space-y-3"
				>
					<h4 class="font-semibold">New Template</h4>
					<input type="text" name="name" placeholder="Template name" required class="input" />
					<button type="submit" class="btn btn-primary w-full">Create</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- PR Celebration Modal -->
{#if showPRModal && newPRs.length > 0}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<h3 class="text-lg font-semibold">🏆 New Personal Records!</h3>
				<button onclick={() => showPRModal = false} class="text-2xl">×</button>
			</div>
			
			<div class="p-4 space-y-3">
				<div class="text-center py-4">
					<div class="text-6xl mb-3">🏆</div>
					<div class="text-lg font-semibold">Congratulations!</div>
					<div class="text-[var(--color-text-muted)]">You set {newPRs.length} new PR{newPRs.length > 1 ? 's' : ''}!</div>
				</div>
				
				<div class="space-y-2">
					{#each newPRs as pr}
						<div class="p-3 bg-gradient-to-r from-yellow-500/20 to-transparent rounded-lg border border-yellow-500/30">
							<div class="font-semibold">{pr.exerciseName}</div>
							<div class="text-sm text-[var(--color-text-muted)] mt-1">
								{#if pr.recordType === '1rm'}
									<span class="font-medium text-yellow-400">Estimated 1RM:</span>
									{pr.value}{weightUnit()}
									{#if pr.weight && pr.reps}
										<span class="text-xs opacity-75">(from {pr.weight}{weightUnit()} × {pr.reps})</span>
									{/if}
								{:else if pr.recordType === 'volume'}
									<span class="font-medium text-yellow-400">Volume PR:</span>
									{pr.value}{weightUnit()} total
								{/if}
							</div>
						</div>
					{/each}
				</div>
				
				<button onclick={() => showPRModal = false} class="btn btn-primary w-full">
					Awesome! 💪
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- Workout Detail Modal -->
{#if showWorkoutDetailModal && selectedWorkout}
	{@const exerciseGroups = (() => {
		const groups: Map<number, { exercise: { name: string; category: string | null }; sets: typeof selectedWorkout.sets }> = new Map();
		for (const s of selectedWorkout.sets) {
			if (!groups.has(s.exerciseId)) {
				groups.set(s.exerciseId, { exercise: s.exercise, sets: [] });
			}
			groups.get(s.exerciseId)!.sets.push(s);
		}
		return [...groups.values()];
	})()}
	<div class="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
		<div class="bg-[var(--color-surface)] w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col">
			<div class="p-4 border-b border-[var(--color-surface-hover)] flex items-center justify-between">
				<div>
					<h3 class="text-lg font-semibold">{selectedWorkout.name}</h3>
					<div class="text-sm text-[var(--color-text-muted)]">
						{new Date(selectedWorkout.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
						{#if selectedWorkout.durationSeconds}
							• {formatDuration(selectedWorkout.durationSeconds)}
						{/if}
					</div>
				</div>
				<button onclick={() => showWorkoutDetailModal = false} class="text-2xl">×</button>
			</div>
			<div class="p-4 space-y-4 overflow-y-auto">
				{#if selectedWorkout.notes}
					<div class="text-sm text-[var(--color-text-muted)] italic">{selectedWorkout.notes}</div>
				{/if}
				
				{#each exerciseGroups as group}
					<div>
						<div class="font-semibold mb-2">{group.exercise.name}
							{#if group.exercise.category}
								<span class="text-xs text-[var(--color-text-muted)] font-normal ml-1">{group.exercise.category}</span>
							{/if}
						</div>
						<div class="space-y-1">
							{#each group.sets as set, i}
								<div class="flex items-center gap-3 text-sm px-2 py-1 rounded bg-[var(--color-bg)]">
									<span class="text-[var(--color-text-muted)] w-6 text-right">{i + 1}</span>
									<span class="flex-1">
										{#if set.weight != null}{set.weight} {weightUnit()}{/if}
										{#if set.weight != null && set.reps != null} × {/if}
										{#if set.reps != null}{set.reps} reps{/if}
									</span>
									<!-- RPE removed -->
									{#if set.setType && set.setType !== 'working'}
										<span class="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-hover)]">{set.setType}</span>
									{/if}
								</div>
							{/each}
						</div>
					</div>
				{/each}
				
				{#if exerciseGroups.length === 0}
					<div class="text-center text-[var(--color-text-muted)] py-4">No sets logged</div>
				{/if}

				{#if selectedWorkout.rating}
					<div class="text-center text-sm text-[var(--color-text-muted)]">
						Rating: {'⭐'.repeat(selectedWorkout.rating)}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
