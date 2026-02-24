<script lang="ts">
import { db, numberOfFieldsSettingId, playersContextId } from "@/shared/db";
import {
  gameIsFinished,
  getActiveContext,
  scenarioWorker,
} from "@/shared/scenarios";
import { liveQuery } from "dexie";
import { Subscription, from, map } from "rxjs";
import { ref } from "vue";

export default {
  setup() {
    return {
      activeContext: ref<undefined | string>(undefined),
      resultsRegistered: ref<boolean>(false),
      resultsSubscription: ref<Subscription | undefined>(undefined),
      buttonText: ref<string>("Start"),
      computingNext: <boolean>false,
      fields: ref<"One" | "Two">("Two"),
      alternativesTotal: ref<number>(0),
      alternativesIndex: ref<number>(0),
    };
  },

  async mounted() {
    const { activeContext, storedContext, numberOfFields } = await db.transaction(
      "r",
      [db.players, db.context, db.settings],
      async () => {
        const [players, numberOfFields, storedContext] = await Promise.all([
          db.players.toArray(),
          db.settings.get(numberOfFieldsSettingId),
          db.context.get(playersContextId),
        ]);
        const activeContext = getActiveContext(
          players.map((p) => p.name),
          numberOfFields?.value ?? 2
        );

        return {
          players,
          storedContext: storedContext?.value,
          activeContext,
          numberOfFields: numberOfFields?.value,
        };
      }
    );

    if (activeContext) {
      this.activeContext = activeContext;
    }

    this.fields = numberOfFields === 1 ? "One" : "Two";

    if (storedContext) {
      if (storedContext !== this.activeContext) {
        // players has changed, clear playing
        await db.transaction("rw", [db.playing, db.context], async () => {
          await db.playing.clear();
          await db.context.delete(playersContextId);
        });
      } else {
        // resume playing
        const { total, index } = await scenarioWorker.status();
        this.alternativesTotal = total;
        this.alternativesIndex = index + 1;
        await this.subscribeToResults();
      }
    }
  },

  unmounted() {
    this.unsubscribeResults();
  },

  computed: {
    disabled() {
      return this.resultsSubscription !== undefined
        ? !this.resultsRegistered
        : !this.activeContext;
    },
    canCycleAlternatives() {
      return this.alternativesTotal > 1;
    },
  },

  methods: {
    async nextScenario() {
      if (this.activeContext && !this.computingNext) {
        try {
          this.computingNext = true; // "debounce"
          this.unsubscribeResults();
          const { total } = await scenarioWorker.compute();
          this.alternativesTotal = total;
          this.alternativesIndex = 1;
          await this.subscribeToResults();
        } catch (err) {
          console.error(err);
        } finally {
          this.computingNext = false;
        }
      }
    },
    async cycleAlternative() {
      if (this.canCycleAlternatives && !this.computingNext) {
        await scenarioWorker.next();
        this.alternativesIndex =
          (this.alternativesIndex % this.alternativesTotal) + 1;
        await this.subscribeToResults();
      }
    },
    async subscribeToResults() {
      this.buttonText = "Continue";
      this.resultsRegistered = false;

      const gamesToWatch: number[] = [];
      for (const game of await db.playing.toArray()) {
        if (game.type === "single" || game.type === "double") {
          gamesToWatch.push(game.id!);
        }
      }

      const observer = from(
        liveQuery(() => db.results.where("id").anyOf(gamesToWatch).toArray())
      ).pipe(
        map((results) => {
          if (results.length >= gamesToWatch.length) {
            for (const result of results) {
              if (!gameIsFinished(result)) {
                return false;
              }
            }
            return true;
          }
          return false;
        })
      );
      this.resultsSubscription?.unsubscribe();
      this.resultsSubscription = observer.subscribe((registered) => {
        this.resultsRegistered = registered;
      });
    },
    unsubscribeResults() {
      this.resultsSubscription?.unsubscribe();
      this.resultsSubscription = undefined;
    },
  },

  watch: {
    async fields(newValue: "One" | "Two") {
      const { activeContext } = await db.transaction(
        "rw",
        [db.settings, db.playing, db.context, db.players],
        async () => {
          await db.settings.put({
            id: numberOfFieldsSettingId,
            value: newValue === "One" ? 1 : 2,
          });
          await db.playing.clear();
          await db.context.delete(playersContextId);

          const players = await db.players.toArray();
          const activeContext = getActiveContext(
            players.map((p) => p.name),
            newValue === "One" ? 1 : 2
          );
          return { activeContext };
        }
      );

      this.activeContext = activeContext;
      this.unsubscribeResults();
      this.buttonText = "Start";
      this.alternativesTotal = 0;
      this.alternativesIndex = 0;
    },
  },
};
</script>

<template>
  <div class="d-flex align-center">
    <v-switch class="mt-5 ml-2" v-model="fields" :label="fields === 'Two' ? 'Two fields' : 'One field'" true-value="Two"
      false-value="One"></v-switch>
    <v-chip v-if="canCycleAlternatives" rounded="xl" label class="ml-2" color="blue"
      title="Scenario number in the set of equally optimal scenarios" @click="cycleAlternative">{{ alternativesIndex }}
      /
      {{ alternativesTotal }}</v-chip>
    <v-btn class="ml-auto mr-2" variant="elevated" :disabled="disabled" @click="nextScenario">{{ buttonText }}</v-btn>
  </div>
</template>

<style scoped>
.v-switch :deep(.v-label) {
  white-space: nowrap;
}

@media (max-width: 400px) {
  .v-switch :deep(.v-label) {
    font-size: 0.75rem;
  }
}
</style>
